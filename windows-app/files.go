package main

// Files opened from Explorer (double-click, Open with) while Reactio Draw is already open go to that window:
// the new process drops them into an inbox folder and quits; the open window picks them up.

import (
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

var pCreateMutexW = kernel32.NewProc("CreateMutexW")

func fileArgs() [][3]string {
	var files [][3]string
	for _, a := range os.Args[1:] {
		if strings.HasPrefix(a, "-") || strings.HasPrefix(a, "/") {
			continue
		}
		if st, err := os.Stat(a); err == nil && !st.IsDir() && st.Size() < 64<<20 {
			if b, err := os.ReadFile(a); err == nil {
				abs, _ := filepath.Abs(a)
				allowPath(abs)
				files = append(files, [3]string{filepath.Base(a), base64.StdEncoding.EncodeToString(b), abs})
				logf("open file %s", a)
			}
		}
	}
	return files
}

// true when another main window of Reactio Draw is already running (this one then hands its files over)
func otherInstance() bool {
	h, _, err := pCreateMutexW.Call(0, 0, uintptr(unsafe.Pointer(u16("Local\\ReactioDrawMainWindow"))))
	if h != 0 && err == windows.ERROR_ALREADY_EXISTS {
		/* only the first window holds it: when that one closes, the next one started becomes the first */
		windows.CloseHandle(windows.Handle(h))
		return true
	}
	return false
}

func inboxDir() string { return filepath.Join(app.base, "inbox") }

func handOver(files [][3]string) {
	os.MkdirAll(inboxDir(), 0755)
	for i, f := range files {
		j, _ := json.Marshal(f)
		tmp := filepath.Join(inboxDir(), "f"+time.Now().Format("150405.000000")+string(rune('a'+i%26)))
		os.WriteFile(tmp+".part", j, 0644)
		os.Rename(tmp+".part", tmp+".json")
	}
}

func watchInbox() {
	os.MkdirAll(inboxDir(), 0755)
	for range time.Tick(700 * time.Millisecond) {
		names, _ := filepath.Glob(filepath.Join(inboxDir(), "*.json"))
		for _, n := range names {
			b, err := os.ReadFile(n)
			os.Remove(n)
			if err != nil || embedInbox(b) {
				continue
			}
			var f [3]string
			if json.Unmarshal(b, &f) != nil {
				continue
			}
			allowPath(f[2])
			nj, _ := json.Marshal(f[0])
			bj, _ := json.Marshal(f[1])
			pj, _ := json.Marshal(f[2])
			app.w.Dispatch(func() {
				app.w.Eval("window.__rdOpenFile&&window.__rdOpenFile(" + string(nj) + "," + string(bj) + "," + string(pj) + ")")
				// only a minimized window is restored: SW_RESTORE on a maximized one would shrink it
				if r, _, _ := pIsIconic.Call(app.hwnd); r != 0 {
					pShowWindow.Call(app.hwnd, 9)
				}
				pSetForegroundWindow.Call(app.hwnd)
			})
		}
	}
}
