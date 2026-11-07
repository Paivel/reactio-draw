package main

// A drawing opened from Word or PowerPoint (double-click on the object) is edited in a tab of the Reactio Draw window
// that is open already (or that is started for it), not in a window of its own. The process Word started (with
// -Embedding) stays hidden: it is the object Word talks to. The two processes talk through files:
//   the window's inbox (%LOCALAPPDATA%\ReactioDraw\inbox): {"embed":{id,kd}}, {"embedGone":id}, {"embedFocus":id}
//   embed\<id>\ : {"cmd":"save",kd,png,emf,w,h,final} and {"cmd":"close"}, from the window's tab to the Word side.
// When no window can be reached, the drawing opens in a window of its own, as before.

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"sync/atomic"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	pOpenMutexW               = kernel32.NewProc("OpenMutexW")
	pAllowSetForegroundWindow = user32.NewProc("AllowSetForegroundWindow")
	pIsWindow                 = user32.NewProc("IsWindow")
	pGetWindowThreadProcessId = user32.NewProc("GetWindowThreadProcessId")
	embedIDok                 = regexp.MustCompile(`^[0-9a-z-]{1,40}$`)
	msgSeq                    int64
)

var tab struct {
	id          string
	on, pending bool
	mainPid     uint32 // the window that took the drawing
}

// the main window of Reactio Draw is running (its mutex exists); nothing is created here
func mainRunning() bool {
	h, _, _ := pOpenMutexW.Call(0x00100000, 0, uintptr(unsafe.Pointer(u16("Local\\ReactioDrawMainWindow")))) // SYNCHRONIZE
	if h == 0 {
		return false
	}
	windows.CloseHandle(windows.Handle(h))
	return true
}

func embedDir(id string) string { return filepath.Join(app.base, "embed", id) }

// the main window's handle, for the Word side to bring it to the front: Word has just given the Word side the right to
// come forward (the double-click), and it passes that on to the window it hands the drawing to
func saveMainWindow() {
	os.WriteFile(filepath.Join(app.base, "mainwindow"), []byte(fmt.Sprintf("%d %d", app.hwnd, os.Getpid())), 0644)
}

// the main window, when the handle written down is still that process's window (handles are used again)
func mainWindow() (uintptr, uint32) {
	b, err := os.ReadFile(filepath.Join(app.base, "mainwindow"))
	if err != nil {
		return 0, 0
	}
	var h uint64
	var pid uint32
	if n, _ := fmt.Sscanf(string(b), "%d %d", &h, &pid); n != 2 || h == 0 {
		return 0, 0
	}
	if r, _, _ := pIsWindow.Call(uintptr(h)); r == 0 {
		return 0, 0
	}
	var owner uint32
	pGetWindowThreadProcessId.Call(uintptr(h), uintptr(unsafe.Pointer(&owner)))
	if owner != pid {
		return 0, 0
	}
	return uintptr(h), pid
}

func focusMain() {
	h, _ := mainWindow()
	if h == 0 {
		return
	}
	if r, _, _ := pIsIconic.Call(uintptr(h)); r != 0 {
		pShowWindow.Call(uintptr(h), 9) // SW_RESTORE
	}
	pSetForegroundWindow.Call(uintptr(h))
}

// one message file, written whole before it is seen (.part, then renamed); names sort in the order they were written
func dropMessage(dir string, v interface{}) bool {
	if dir == inboxDir() {
		os.MkdirAll(dir, 0755)
	}
	j, _ := json.Marshal(v)
	n := atomic.AddInt64(&msgSeq, 1)
	tmp := filepath.Join(dir, fmt.Sprintf("e%020d-%d-%06d", time.Now().UnixNano(), os.Getpid(), n))
	if os.WriteFile(tmp+".part", j, 0644) != nil {
		return false
	}
	return os.Rename(tmp+".part", tmp+".json") == nil
}

// Word side, in the background: the main window is running, or is started and waited for; false when it cannot be
func reachMain() bool {
	pAllowSetForegroundWindow.Call(^uintptr(0)) // ASFW_ANY: the window may come to the front
	if mainRunning() {
		/* its window is written down a moment after it starts: wait for it if it has only just started */
		for i := 0; i < 60; i++ {
			if h, _ := mainWindow(); h != 0 {
				return true
			}
			time.Sleep(100 * time.Millisecond)
		}
		return false
	}
	exe, err := os.Executable()
	if err != nil {
		return false
	}
	cmd := exec.Command(exe)
	if cmd.Start() != nil {
		return false
	}
	pid := uint32(cmd.Process.Pid)
	cmd.Process.Release()
	for i := 0; i < 100 && !mainRunning(); i++ {
		time.Sleep(150 * time.Millisecond)
	}
	if !mainRunning() {
		return false
	}
	/* its window: written down a moment after it starts */
	for i := 0; i < 60; i++ {
		if _, p := mainWindow(); p == pid {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}
	return true
}

// Word side (UI thread): the drawing goes to a tab of the running window (reachMain first); false when it is not running
func showInTab() bool {
	if tab.on {
		dropMessage(inboxDir(), map[string]interface{}{"embedFocus": tab.id})
		focusMain()
		return true
	}
	if !mainRunning() {
		return false
	}
	h, pid := mainWindow()
	if h == 0 {
		return false
	}
	tab.id = fmt.Sprintf("%d-%d", os.Getpid(), time.Now().UnixNano()%1000000000)
	os.RemoveAll(embedDir(tab.id))
	os.MkdirAll(embedDir(tab.id), 0755)
	tab.on = true
	tab.mainPid = pid
	logf("drawing sent to the open window (process %d), tab %s", tab.mainPid, tab.id)
	dropMessage(inboxDir(), map[string]interface{}{"embed": map[string]string{"id": tab.id, "kd": string(srv.kd)}})
	focusMain()
	go watchTab(tab.id)
	return true
}

// Word side: what the window's tab sends back
func watchTab(id string) {
	gone := 0
	for range time.Tick(300 * time.Millisecond) {
		if srv.closing {
			return
		}
		names, _ := filepath.Glob(filepath.Join(embedDir(id), "*.json"))
		sort.Strings(names)
		for _, n := range names {
			b, err := os.ReadFile(n)
			os.Remove(n)
			if err != nil {
				continue
			}
			var m struct {
				Cmd, KD, PNG, EMF string
				W, H              int32
				Final             bool
			}
			if json.Unmarshal(b, &m) != nil {
				continue
			}
			switch m.Cmd {
			case "save":
				png, _ := base64.StdEncoding.DecodeString(m.PNG)
				emf, _ := base64.StdEncoding.DecodeString(m.EMF)
				done := make(chan bool)
				srvDispatch(func() { embedUpdate([]byte(m.KD), png, emf, m.W, m.H, m.Final); close(done) })
				<-done
			case "close":
				srvDispatch(tabClosed)
				return
			}
		}
		// the window went away (closed or crashed, or another one runs now) without a word: Word keeps what it got last
		_, p := mainWindow()
		alive := mainRunning() && p == tab.mainPid
		if alive {
			gone = 0
		} else if gone++; gone > 10 {
			srvDispatch(tabClosed)
			return
		}
	}
}

// Word side: the tab was closed; Word gets the object back and this process ends
func tabClosed() {
	if !tab.on {
		return
	}
	tab.on = false
	os.RemoveAll(embedDir(tab.id))
	finishClose()
}

// Word side: Word closes the object by itself (its document closes): the window's tab lets go of it
func tabGone() {
	if !tab.on {
		return
	}
	tab.on = false
	dropMessage(inboxDir(), map[string]interface{}{"embedGone": tab.id})
	os.RemoveAll(embedDir(tab.id))
}

// window side: the tab's messages for the Word side (the page's embedSave and embedClose with an eid)
func toWordSide(eid string, v interface{}) bool {
	if !embedIDok.MatchString(eid) {
		return false
	}
	return dropMessage(embedDir(eid), v)
}

// window side: a message from a Word side in the inbox; false when it is not one
func embedInbox(b []byte) bool {
	var m map[string]json.RawMessage
	if json.Unmarshal(b, &m) != nil {
		return false
	}
	js := ""
	if v, ok := m["embed"]; ok {
		js = "(function(m){window.__rdOpenEmbed?window.__rdOpenEmbed(m):(window.__rdEmbedQ=window.__rdEmbedQ||[]).push(m)})(" + string(v) + ")"
	} else if v, ok := m["embedGone"]; ok {
		js = "window.__rdEmbedGone&&window.__rdEmbedGone(" + string(v) + ")"
	} else if v, ok := m["embedFocus"]; ok {
		js = "window.__rdEmbedFocus&&window.__rdEmbedFocus(" + string(v) + ")"
	} else {
		return false
	}
	app.w.Dispatch(func() {
		if !embedPage.ready {
			embedPage.held = append(embedPage.held, js)
		} else {
			app.w.Eval(js)
		}
		if r, _, _ := pIsIconic.Call(app.hwnd); r != 0 {
			pShowWindow.Call(app.hwnd, 9)
		}
		pSetForegroundWindow.Call(app.hwnd)
	})
	return true
}

// window side (UI thread): the page says it can take drawings from Word (bridge cmd embedReady); what came before goes now
var embedPage struct {
	ready bool
	held  []string
}

func embedPageReady() {
	embedPage.ready = true
	for _, js := range embedPage.held {
		app.w.Eval(js)
	}
	embedPage.held = nil
}

// window side, at start: folders left by Word sides that ended without cleaning up (older than a day)
func cleanEmbedDirs() {
	ds, _ := os.ReadDir(filepath.Join(app.base, "embed"))
	for _, d := range ds {
		if i, err := d.Info(); err == nil && time.Since(i.ModTime()) > 24*time.Hour {
			os.RemoveAll(filepath.Join(app.base, "embed", d.Name()))
		}
	}
}
