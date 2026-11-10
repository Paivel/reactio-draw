package main

// Error paths of the Linux app's native side: every failure the page, the command line or the local API can meet is fed
// in, and the test checks that it is reported back (a reply to the page, an error to the caller) and that nothing
// half-written is left behind. The GTK/WebKit function pointers are replaced by Go stand-ins, so no window is needed;
// a file dialog answers ePick ("" = the user cancelled it).
//
// A test that shows a real fault asserts the right behaviour and is skipped with the number of the fault in
// rd-tests/BUGS.md, so the suite stays green until it is fixed.

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"
	"unsafe"
)

var (
	eMu    sync.Mutex
	eEvals []string
	ePick  string // the path the next file or folder dialog answers; "" = cancelled
	eCstr  []byte
	eSeq   int
)

/* a fresh app: its own data folder, config folder and home; the window replaced by stand-ins */
func eSetup(t *testing.T) string {
	t.Helper()
	d := t.TempDir()
	app.base = filepath.Join(d, "base")
	os.MkdirAll(app.base, 0755)
	allowList = nil
	t.Setenv("HOME", d)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(d, "cfg"))
	eMu.Lock()
	eEvals = nil
	eMu.Unlock()
	ePick = ""
	webkit_web_view_evaluate_javascript = func(v uintptr, js string, n int64, world, src, cancel, cb, data uintptr) {
		eMu.Lock()
		eEvals = append(eEvals, js)
		eMu.Unlock()
	}
	g_idle_add = func(fn, data uintptr) uint32 { runQueue(0); return 0 }
	gtk_file_chooser_native_new = func(title string, parent uintptr, action int32, accept, cancel string) uintptr { return 1 }
	gtk_file_chooser_set_do_overwrite_confirm = func(d uintptr, on bool) {}
	gtk_file_chooser_set_current_name = func(d uintptr, n string) {}
	gtk_native_dialog_run = func(d uintptr) int32 {
		if ePick == "" {
			return -6 // GTK_RESPONSE_CANCEL
		}
		return -3 // GTK_RESPONSE_ACCEPT
	}
	gtk_file_chooser_get_filename = func(d uintptr) uintptr {
		eCstr = append([]byte(ePick), 0)
		return uintptr(unsafe.Pointer(&eCstr[0]))
	}
	g_free = func(p uintptr) {}
	g_object_unref = func(o uintptr) {}
	gtk_widget_destroy = func(w uintptr) {}
	return d
}

/* the reply the page got for id (waiting up to wait for one sent from another goroutine) */
func eReply(id string, wait time.Duration) (map[string]interface{}, bool) {
	end := time.Now().Add(wait)
	for {
		eMu.Lock()
		for _, js := range eEvals {
			i := strings.Index(js, "apply(null,")
			if i < 0 {
				continue
			}
			var pair []string
			if json.Unmarshal([]byte(strings.TrimSuffix(js[i+len("apply(null,"):], ")")), &pair) == nil && len(pair) == 2 && pair[0] == id {
				var r map[string]interface{}
				json.Unmarshal([]byte(pair[1]), &r)
				eMu.Unlock()
				return r, true
			}
		}
		eMu.Unlock()
		if time.Now().After(end) {
			return nil, false
		}
		time.Sleep(10 * time.Millisecond)
	}
}

/* one bridge message as the page sends it, and its reply */
func eSend(t *testing.T, m map[string]interface{}, wait time.Duration) map[string]interface{} {
	t.Helper()
	eSeq++
	id := fmt.Sprintf("e%d", eSeq)
	m["id"] = id
	b, _ := json.Marshal(m)
	handle(string(b))
	r, ok := eReply(id, wait)
	if !ok {
		t.Fatalf("%v: no reply to the page", m["cmd"])
	}
	return r
}

func eB64(s string) string { return base64.StdEncoding.EncodeToString([]byte(s)) }

func eRead(p string) string { b, _ := os.ReadFile(p); return string(b) }

/* chmod 000 means nothing to root */
func eNeedNonRoot(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("runs as root: permissions are not enforced (go-tests.sh runs these again as an ordinary user when it can)")
	}
}

/* a full disk: files can grow to limit bytes, no further (RLIMIT_FSIZE; writes past it fail with EFBIG) */
func eDiskFull(t *testing.T, limit uint64) func() {
	t.Helper()
	var old syscall.Rlimit
	if err := syscall.Getrlimit(syscall.RLIMIT_FSIZE, &old); err != nil {
		t.Skipf("no RLIMIT_FSIZE: %v", err)
	}
	signal.Ignore(syscall.SIGXFSZ)
	if err := syscall.Setrlimit(syscall.RLIMIT_FSIZE, &syscall.Rlimit{Cur: limit, Max: old.Max}); err != nil {
		t.Skipf("cannot limit the file size: %v", err)
	}
	return func() {
		syscall.Setrlimit(syscall.RLIMIT_FSIZE, &old)
		signal.Reset(syscall.SIGXFSZ)
	}
}

/* no .rdtmp (or other) file left in dir besides want */
func eOnly(t *testing.T, dir string, want ...string) {
	t.Helper()
	es, _ := os.ReadDir(dir)
	ok := map[string]bool{}
	for _, w := range want {
		ok[w] = true
	}
	for _, e := range es {
		if !ok[e.Name()] {
			t.Errorf("left behind in %s: %s", dir, e.Name())
		}
	}
}

// ---------- the bridge: malformed messages ----------

func TestErrBridgeMalformed(t *testing.T) {
	eSetup(t)
	n0 := 0
	for _, s := range []string{"", "{", "not json", "[1,2]", `"just a string"`, `{"id": 5, "cmd": "write"}`} {
		handle(s) // must not panic; without a readable id there is nobody to answer
	}
	eMu.Lock()
	n0 = len(eEvals)
	eMu.Unlock()
	if n0 != 0 {
		t.Errorf("a reply was sent for a message without an id: %v", eEvals)
	}
	/* missing fields: answered, not dropped */
	if r := eSend(t, map[string]interface{}{}, time.Second); r["ok"] != false {
		t.Errorf("no cmd: %v", r)
	}
	if r := eSend(t, map[string]interface{}{"cmd": "nosuch"}, time.Second); r["ok"] != false {
		t.Errorf("unknown cmd: %v", r)
	}
	if r := eSend(t, map[string]interface{}{"cmd": "write"}, time.Second); r["ok"] != false || r["err"] != "no file" {
		t.Errorf("write without a path: %v", r)
	}
	/* not base64: written as nothing rather than refused, but only to a chosen file */
	if r := eSend(t, map[string]interface{}{"cmd": "write", "path": "/tmp/x.reactio", "b64": "%%%"}, time.Second); r["ask"] != true {
		t.Errorf("write of bad base64 to a path never chosen: %v", r)
	}
}

/* a field of the wrong type (path: 5): the id can be read, so the page must get an answer */
func TestErrBridgeWrongTypeGetsReply(t *testing.T) {
	eSetup(t)
	handle(`{"id":"wt1","cmd":"write","path":5,"b64":"eA=="}`)
	handle(`{"id":"wt2","cmd":"texHead","path":["a"]}`)
	for _, id := range []string{"wt1", "wt2"} {
		if _, ok := eReply(id, 200*time.Millisecond); !ok {
			t.Skip("bug 76: a message with a field of the wrong type is dropped with no reply; the page's call waits forever")
		}
	}
}

// ---------- the bridge: Save, Open, Save as ----------

func TestErrBridgeSave(t *testing.T) {
	d := eSetup(t)
	/* the dialog cancelled */
	if r := eSend(t, map[string]interface{}{"cmd": "save", "name": "a.svg", "b64": eB64("<svg/>")}, time.Second); r["ok"] != false || r["error"] != nil {
		t.Errorf("cancelled: %v", r)
	}
	/* a folder that is not there (the dialog checks, but a folder can go meanwhile) */
	ePick = filepath.Join(d, "gone", "a.svg")
	r := eSend(t, map[string]interface{}{"cmd": "save", "b64": eB64("<svg/>")}, time.Second)
	if r["ok"] != false || r["error"] == nil || r["error"] == "" {
		t.Errorf("missing folder: the error is not reported: %v", r)
	}
	if pathAllowed(ePick) {
		t.Errorf("a file that could not be saved became writable for the page")
	}
	/* a folder in place of the file */
	ePick = filepath.Join(d, "isdir.svg")
	os.Mkdir(ePick, 0755)
	if r := eSend(t, map[string]interface{}{"cmd": "save", "b64": eB64("x")}, time.Second); r["ok"] != false || r["error"] == nil {
		t.Errorf("folder as file: %v", r)
	}
	/* a file the user may not write */
	t.Run("permission", func(t *testing.T) {
		eNeedNonRoot(t)
		ro := filepath.Join(d, "ro")
		os.Mkdir(ro, 0555)
		ePick = filepath.Join(ro, "a.svg")
		if r := eSend(t, map[string]interface{}{"cmd": "save", "b64": eB64("x")}, time.Second); r["ok"] != false || r["error"] == nil {
			t.Errorf("read-only folder: %v", r)
		}
	})
	/* a symlink chosen in the dialog: the dialog's choice is the user's, written through (and reported as saved) */
	tgt := filepath.Join(d, "target.svg")
	os.WriteFile(tgt, []byte("old"), 0644)
	ePick = filepath.Join(d, "link.svg")
	os.Symlink(tgt, ePick)
	if r := eSend(t, map[string]interface{}{"cmd": "save", "b64": eB64("new")}, time.Second); r["ok"] != true || eRead(tgt) != "new" {
		t.Errorf("symlink chosen in the dialog: %v, target %q", r, eRead(tgt))
	}
}

/* disk full during Save over an existing file: the error is reported, and the old file must still be whole */
func TestErrBridgeSaveDiskFull(t *testing.T) {
	d := eSetup(t)
	ePick = filepath.Join(d, "doc.reactio")
	old := strings.Repeat("O", 50)
	os.WriteFile(ePick, []byte(old), 0644)
	restore := eDiskFull(t, 1000)
	r := eSend(t, map[string]interface{}{"cmd": "save", "b64": eB64(strings.Repeat("N", 5000))}, time.Second)
	restore()
	if r["ok"] != false || r["error"] == nil {
		t.Fatalf("disk full: the error is not reported: %v", r)
	}
	if got := eRead(ePick); got != old {
		t.Errorf("bug 78: a failed Save leaves a truncated file (%d bytes) in place of the old one", len(got))
	}
	if m, _ := filepath.Glob(filepath.Join(d, "*.rdtmp")); len(m) != 0 {
		t.Errorf("a failed Save left its temporary file behind: %v", m)
	}
}

func TestErrBridgeOpen(t *testing.T) {
	d := eSetup(t)
	/* cancelled: the page is told so */
	if r := eSend(t, map[string]interface{}{"cmd": "open"}, time.Second); r["cancel"] != true {
		t.Errorf("cancelled: %v", r)
	}
	/* a file that went after it was chosen */
	ePick = filepath.Join(d, "gone.mol")
	r := eSend(t, map[string]interface{}{"cmd": "open"}, time.Second)
	if r["b64"] != nil {
		t.Errorf("a missing file was opened: %v", r)
	}
	if pathAllowed(ePick) {
		t.Errorf("a file that could not be opened became writable for the page")
	}
	/* a good file */
	ok := filepath.Join(d, "ok.mol")
	os.WriteFile(ok, []byte("M  END"), 0644)
	ePick = ok
	if r := eSend(t, map[string]interface{}{"cmd": "open"}, time.Second); r["b64"] != eB64("M  END") || r["path"] != ok {
		t.Errorf("good file: %v", r)
	}
}

/* a file chosen in Open that cannot be read must be reported, not answered as if the dialog was cancelled */
func TestErrBridgeOpenUnreadableReported(t *testing.T) {
	d := eSetup(t)
	t.Run("permission", func(t *testing.T) {
		eNeedNonRoot(t)
		ePick = filepath.Join(d, "locked.mol")
		os.WriteFile(ePick, []byte("M  END"), 0000)
		r := eSend(t, map[string]interface{}{"cmd": "open"}, time.Second)
		if r["b64"] != nil {
			t.Fatalf("a file without read permission was read: %v", r)
		}
		if r["cancel"] == true || r["err"] == nil || r["name"] != "locked.mol" {
			t.Errorf("bug 77: an Open of a file without read permission must be reported with its name: %v", r)
		}
	})
	ePick = filepath.Join(d, "folder.mol") // a folder: unreadable as a file even for root
	os.Mkdir(ePick, 0755)
	r := eSend(t, map[string]interface{}{"cmd": "open"}, time.Second)
	if r["b64"] != nil {
		t.Fatalf("a folder was read as a file: %v", r)
	}
	if r["cancel"] == true || r["err"] == nil || r["name"] != "folder.mol" {
		t.Errorf("bug 77: an Open of a file that cannot be read must be reported, not answered as cancelled: %v", r)
	}
	if pathAllowed(ePick) {
		t.Errorf("a file that could not be opened became writable for the page")
	}
}

func TestErrBridgeSaveAsCancelled(t *testing.T) {
	eSetup(t)
	r := eSend(t, map[string]interface{}{"cmd": "saveAs", "name": "x.reactio"}, time.Second)
	if p, _ := r["path"].(string); p != "" {
		t.Errorf("cancelled Save as answered a path: %v", r)
	}
	if len(allowList) != 0 {
		t.Errorf("a cancelled Save as allowed a path: %v", allowList)
	}
}

// ---------- the bridge: write (Copy for LaTeX, Save of a chosen file) ----------

func TestErrBridgeWrite(t *testing.T) {
	d := eSetup(t)
	/* never chosen: refused, the page asks the user */
	other := filepath.Join(d, "other.reactio")
	if r := eSend(t, map[string]interface{}{"cmd": "write", "path": other, "b64": eB64("x")}, time.Second); r["ok"] != false || r["ask"] != true {
		t.Errorf("not chosen: %v", r)
	}
	if _, err := os.Stat(other); err == nil {
		t.Errorf("a path never chosen was written")
	}
	/* chosen, but its folder has gone: the error comes back, nothing is left */
	gone := filepath.Join(d, "gone", "a.reactio")
	allowPath(gone)
	if r := eSend(t, map[string]interface{}{"cmd": "write", "path": gone, "b64": eB64("x")}, time.Second); r["ok"] != false || r["err"] == nil || r["err"] == "" {
		t.Errorf("missing folder: %v", r)
	}
	/* chosen, but a folder (not empty) now stands there: the rename fails, the temporary file goes */
	sub := filepath.Join(d, "sub")
	os.Mkdir(sub, 0755)
	blk := filepath.Join(sub, "blocked.reactio")
	os.MkdirAll(filepath.Join(blk, "inner"), 0755)
	allowPath(blk)
	if r := eSend(t, map[string]interface{}{"cmd": "write", "path": blk, "b64": eB64("x")}, time.Second); r["ok"] != false || r["err"] == nil {
		t.Errorf("rename over a folder: %v", r)
	}
	eOnly(t, sub, "blocked.reactio")
	/* a good write leaves only the file */
	good := filepath.Join(sub, "good.reactio")
	allowPath(good)
	if r := eSend(t, map[string]interface{}{"cmd": "write", "path": good, "b64": eB64("hello")}, time.Second); r["ok"] != true || eRead(good) != "hello" {
		t.Errorf("good write: %v", r)
	}
	eOnly(t, sub, "blocked.reactio", "good.reactio")
	t.Run("permission", func(t *testing.T) {
		eNeedNonRoot(t)
		ro := filepath.Join(d, "ro")
		os.Mkdir(ro, 0755)
		p := filepath.Join(ro, "a.reactio")
		os.WriteFile(p, []byte("old"), 0644)
		os.Chmod(ro, 0555)
		defer os.Chmod(ro, 0755)
		allowPath(p)
		if r := eSend(t, map[string]interface{}{"cmd": "write", "path": p, "b64": eB64("new")}, time.Second); r["ok"] != false || r["err"] == nil || eRead(p) != "old" {
			t.Errorf("read-only folder: %v, file %q", r, eRead(p))
		}
	})
}

/* disk full: writeNew fails, the old file stays whole and no temporary file is left */
func TestErrBridgeWriteDiskFull(t *testing.T) {
	d := eSetup(t)
	p := filepath.Join(d, "fig.tex")
	os.WriteFile(p, []byte("old figure"), 0644)
	allowPath(p)
	restore := eDiskFull(t, 1000)
	r := eSend(t, map[string]interface{}{"cmd": "write", "path": p, "b64": eB64(strings.Repeat("x", 5000))}, time.Second)
	restore()
	if r["ok"] != false || r["err"] == nil {
		t.Errorf("disk full: not reported: %v", r)
	}
	if eRead(p) != "old figure" {
		t.Errorf("disk full: the old file was changed: %q", eRead(p))
	}
	eOnly(t, d, "fig.tex", "base")
}

func TestErrWriteNew(t *testing.T) {
	d := t.TempDir()
	if _, err := writeNew(filepath.Join(d, "nope", "x.svg"), []byte("x")); err == nil {
		t.Errorf("writeNew into a missing folder gave no error")
	}
	restore := eDiskFull(t, 100)
	_, err := writeNew(filepath.Join(d, "big.svg"), make([]byte, 1000))
	restore()
	if err == nil {
		t.Errorf("writeNew on a full disk gave no error")
	}
	eOnly(t, d)
}

func TestErrBridgeTexHead(t *testing.T) {
	d := eSetup(t)
	doc := filepath.Join(d, "My doc.reactio")
	allowPath(doc)
	/* not .tex/.pdf, not allowed, missing, a folder: all answered, none read */
	for _, p := range []string{filepath.Join(d, "x.txt"), filepath.Join(d, "other.tex"), filepath.Join(d, "My_doc.tex")} {
		if r := eSend(t, map[string]interface{}{"cmd": "texHead", "path": p}, time.Second); r["exists"] != false || r["line"] != "" {
			t.Errorf("%s: %v", p, r)
		}
	}
	dir := filepath.Join(d, "My_doc.tex")
	os.Mkdir(dir, 0755)
	if r := eSend(t, map[string]interface{}{"cmd": "texHead", "path": dir}, time.Second); r["line"] != "" {
		t.Errorf("a folder read as the .tex: %v", r)
	}
}

// ---------- the bridge: folders for the AI assistants ----------

func TestErrBridgeFolders(t *testing.T) {
	d := eSetup(t)
	/* cancelled: nothing added */
	if r := eSend(t, map[string]interface{}{"cmd": "aiFolderAdd"}, time.Second); len(r["folders"].([]interface{})) != 0 {
		t.Errorf("cancelled folder dialog added: %v", r)
	}
	/* a broken allowed-folders.json reads as no folder at all */
	os.MkdirAll(rdConfigDir(), 0700)
	os.WriteFile(filepath.Join(rdConfigDir(), foldersFileName), []byte("{broken"), 0600)
	if r := eSend(t, map[string]interface{}{"cmd": "aiFolders"}, time.Second); len(r["folders"].([]interface{})) != 0 {
		t.Errorf("broken file: %v", r)
	}
	if f := allowedFolders(); len(f) != 0 {
		t.Errorf("broken file gave folders %v", f)
	}
	/* wrong type inside */
	os.WriteFile(filepath.Join(rdConfigDir(), foldersFileName), []byte(`{"folders": "/home"}`), 0600)
	if f := allowedFolders(); len(f) != 0 {
		t.Errorf("folders as a string gave %v", f)
	}
	_ = d
}

/* allowed-folders.json cannot be written: the user must be told the folder was not added */
func TestErrBridgeFolderAddNotSaved(t *testing.T) {
	d := eSetup(t)
	/* the config folder is a file: nothing can be written in it */
	os.WriteFile(filepath.Join(d, "cfg"), []byte("x"), 0644)
	if err := saveFolders([]string{d}); err == nil {
		t.Fatalf("saveFolders gave no error where it cannot write")
	}
	ePick = filepath.Join(d, "Chem")
	os.Mkdir(ePick, 0755)
	r := eSend(t, map[string]interface{}{"cmd": "aiFolderAdd"}, time.Second)
	if r["err"] == nil || !strings.Contains(fmt.Sprint(r["err"]), "could not be saved") {
		t.Errorf("bug 80: aiFolderAdd must report that allowed-folders.json could not be written: %v", r)
	}
	if r := eSend(t, map[string]interface{}{"cmd": "aiFolderRemove", "path": d}, time.Second); r["err"] == nil {
		t.Errorf("bug 80: aiFolderRemove must report that allowed-folders.json could not be written: %v", r)
	}
}

// ---------- the bridge: helpers that are not there (Python, Java), links ----------

/* tools/ beside the test program, as beside the app; removed afterwards */
func eTools(t *testing.T, files map[string]string) {
	t.Helper()
	dir := filepath.Dir(toolPath("x"))
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Skipf("cannot make %s: %v", dir, err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	for n, s := range files {
		os.WriteFile(filepath.Join(dir, n), []byte(s), 0755)
	}
}

/* an executable shell script standing in for a helper program */
func eScript(t *testing.T, dir, name, body string) string {
	t.Helper()
	p := filepath.Join(dir, name)
	if err := os.WriteFile(p, []byte("#!/bin/sh\n"+body+"\n"), 0755); err != nil {
		t.Fatal(err)
	}
	return p
}

func TestErrNamerMissingHelpers(t *testing.T) {
	d := eSetup(t)
	namerStop()
	defer namerStop()
	t.Setenv("PATH", filepath.Join(d, "empty"))
	t.Setenv("REACTIO_PYTHON", "")
	/* no tools/reactio_name.py */
	if r := eSend(t, map[string]interface{}{"cmd": "iupac", "name": "CCO"}, 5*time.Second); r["err"] != "nohelper" || !strings.Contains(fmt.Sprint(r["msg"]), "reactio_name.py") {
		t.Errorf("helper script missing: %v", r)
	}
	eTools(t, map[string]string{"reactio_name.py": "# stand-in\n"})
	/* the script is there, no Python anywhere */
	if r := eSend(t, map[string]interface{}{"cmd": "iupac", "name": "CCO"}, 5*time.Second); r["err"] != "nopython" || r["msg"] == "" {
		t.Errorf("no Python: %v", r)
	}
	/* REACTIO_PYTHON names something that is not there */
	t.Setenv("REACTIO_PYTHON", filepath.Join(d, "no-such-python"))
	if r := eSend(t, map[string]interface{}{"cmd": "iupac", "name": "CCO"}, 5*time.Second); r["err"] != "nopython" {
		t.Errorf("REACTIO_PYTHON missing: %v", r)
	}
	/* a Python without openclatura: its own message comes back */
	py := eScript(t, d, "python", `echo '{"msg":"openclatura is not installed"}'`)
	t.Setenv("REACTIO_PYTHON", py)
	if r := eSend(t, map[string]interface{}{"cmd": "iupac", "name": "CCO"}, 5*time.Second); r["err"] != "nopython" || !strings.Contains(fmt.Sprint(r["msg"]), "openclatura is not installed") {
		t.Errorf("Python without openclatura: %v", r)
	}
	/* a Python that cannot start (not executable) */
	bad := filepath.Join(d, "python-noexec")
	os.WriteFile(bad, []byte("x"), 0644)
	t.Setenv("REACTIO_PYTHON", bad)
	if r := eSend(t, map[string]interface{}{"cmd": "iupac", "name": "CCO"}, 5*time.Second); r["err"] != "nopython" {
		t.Errorf("Python not executable: %v", r)
	}
	/* empty input */
	if r := eSend(t, map[string]interface{}{"cmd": "iupac", "name": " \n "}, 5*time.Second); r["err"] != "empty" {
		t.Errorf("empty SMILES: %v", r)
	}
	/* the helper answers without a name: its message comes back */
	py2 := eScript(t, d, "python2", `echo '{"ready":"1.0"}'; read l; echo '{"msg":"cannot name it"}'; read l`)
	t.Setenv("REACTIO_PYTHON", py2)
	namerStop()
	if r := eSend(t, map[string]interface{}{"cmd": "iupac", "name": "C"}, 5*time.Second); r["err"] != "noname" || r["msg"] != "cannot name it" {
		t.Errorf("no name: %v", r)
	}
	namerStop()
}

/* a helper that starts and then dies on every request must not be reported as "no Python" / "no Java" */
func TestErrHelperCrashReportedAsMissing(t *testing.T) {
	d := eSetup(t)
	namerStop()
	defer namerStop()
	eTools(t, map[string]string{"reactio_name.py": "# stand-in\n"})
	t.Setenv("PATH", filepath.Join(d, "empty"))
	t.Setenv("REACTIO_PYTHON", eScript(t, d, "python", `echo '{"ready":"1.0"}'; read l; exit 1`))
	r := eSend(t, map[string]interface{}{"cmd": "iupac", "name": "CCO"}, 10*time.Second)
	if r["err"] == "" || r["err"] == nil {
		t.Fatalf("a crashing helper gave no error: %v", r)
	}
	if r["err"] == "nopython" {
		t.Skip("bug 83: the naming helper crashed twice and the page is told \"nopython\" (Python not found)")
	}
}

func TestErrOpsinMissingAndBroken(t *testing.T) {
	d := eSetup(t)
	opsinStop()
	defer opsinStop()
	t.Setenv("PATH", filepath.Join(d, "empty"))
	/* Java missing: only testable where no JDK sits in /usr/lib/jvm */
	t.Run("nojava", func(t *testing.T) {
		if m, _ := filepath.Glob("/usr/lib/jvm/*/bin/java"); len(m) > 0 {
			t.Skip("a JDK is installed in /usr/lib/jvm: Java cannot be made missing here")
		}
		t.Setenv("JAVA_HOME", filepath.Join(d, "nojdk"))
		if r := eSend(t, map[string]interface{}{"cmd": "opsin", "name": "ethanol"}, 5*time.Second); r["err"] != "nojava" {
			t.Errorf("no Java: %v", r)
		}
	})
	/* Java there, the OPSIN jar not */
	jh := filepath.Join(d, "jdk")
	os.MkdirAll(filepath.Join(jh, "bin"), 0755)
	t.Setenv("JAVA_HOME", jh)
	eScript(t, filepath.Join(jh, "bin"), "java", `while read l; do echo "C"; done`)
	if r := eSend(t, map[string]interface{}{"cmd": "opsin", "name": "methane"}, 5*time.Second); r["err"] != "noopsin" {
		t.Errorf("no jar: %v", r)
	}
	eTools(t, map[string]string{"opsin-2.9.0.jar": "stand-in"})
	/* empty name */
	if r := eSend(t, map[string]interface{}{"cmd": "opsin", "name": "  "}, 5*time.Second); r["err"] != "empty" {
		t.Errorf("empty name: %v", r)
	}
	/* a name OPSIN does not understand: its message comes back */
	eScript(t, filepath.Join(jh, "bin"), "java", `while read l; do echo "uninterpretable: $l The following was not parseable" >&2; echo ""; done`)
	opsinStop()
	r := eSend(t, map[string]interface{}{"cmd": "opsin", "name": "blorb"}, 5*time.Second)
	if r["err"] != "unparsable" || !strings.Contains(fmt.Sprint(r["msg"]), "not understood: blorb") {
		t.Errorf("not understood: %v", r)
	}
	/* Java that cannot start */
	os.WriteFile(filepath.Join(jh, "bin", "java"), []byte("not a program"), 0644)
	os.Chmod(filepath.Join(jh, "bin", "java"), 0755)
	opsinStop()
	if r := eSend(t, map[string]interface{}{"cmd": "opsin", "name": "methane"}, 5*time.Second); r["err"] == nil || r["smiles"] != nil {
		t.Errorf("Java cannot start: %v", r)
	}
	/* Java that dies on every name */
	eScript(t, filepath.Join(jh, "bin"), "java", `exit 1`)
	opsinStop()
	r = eSend(t, map[string]interface{}{"cmd": "opsin", "name": "methane"}, 5*time.Second)
	if r["err"] == nil || r["smiles"] != nil {
		t.Fatalf("a dying OPSIN gave no error: %v", r)
	}
	if r["err"] == "nojava" {
		t.Skip("bug 83: OPSIN died on each try and the page is told \"nojava\" (Java not installed)")
	}
}

func TestErrBridgeLink(t *testing.T) {
	d := eSetup(t)
	for _, u := range []string{"", "file:///etc/passwd", "javascript:alert(1)", "ftp://x"} {
		if r := eSend(t, map[string]interface{}{"cmd": "link", "url": u}, time.Second); r["ok"] != false {
			t.Errorf("%q: %v", u, r)
		}
	}
	/* xdg-open is not installed */
	t.Setenv("PATH", filepath.Join(d, "empty"))
	if r := eSend(t, map[string]interface{}{"cmd": "link", "url": "https://example.org/"}, time.Second); r["ok"] != false {
		t.Errorf("without xdg-open: %v", r)
	}
}

func TestErrOwnPage(t *testing.T) {
	for _, u := range []string{"%zz", "http://x/index.html", "file://host/idx", ""} {
		if ownPage(u, "/idx", true) {
			t.Errorf("%q taken for the app's page", u)
		}
	}
}

// ---------- files given on the command line ----------

/* a file opened with the app that cannot be opened (too big, unreadable) must not vanish without a word */
func TestErrFileArgsOversize(t *testing.T) {
	d := eSetup(t)
	big := filepath.Join(d, "big.mol")
	f, _ := os.Create(big)
	f.Truncate(64 << 20) // sparse: 64 MB on paper, nothing on disk
	f.Close()
	dir := filepath.Join(d, "afolder.mol")
	os.Mkdir(dir, 0755)
	old := os.Args
	os.Args = []string{"ReactioDraw", big, dir, filepath.Join(d, "missing.mol"), "-flag"}
	files, errs := fileArgs()
	os.Args = old
	if len(files) != 0 {
		t.Fatalf("an over-size, folder or missing file was opened: %v", len(files))
	}
	if pathAllowed(big) {
		t.Errorf("an over-size file not opened became writable")
	}
	/* each one is named, with its reason, for the page's message line (window.__rdFileErrors) */
	want := []string{"big.mol: too large (64 MB, at most 64)", "afolder.mol: is a folder", "missing.mol: cannot be read: no such file"}
	if len(errs) != len(want) {
		t.Fatalf("bug 82: the files that could not be opened are not all reported: %q", errs)
	}
	for i, w := range want {
		if !strings.HasPrefix(errs[i], w) {
			t.Errorf("bug 82: %q, want %q", errs[i], w)
		}
	}
}

/* the command line: a file that is there but cannot be opened is reported with its reason, not as "no such file" */
func TestErrCliScriptFileErrors(t *testing.T) {
	d := eSetup(t)
	big := filepath.Join(d, "big.mol")
	f, _ := os.Create(big)
	f.Truncate(70 << 20)
	f.Close()
	ok := filepath.Join(d, "ok.mol")
	os.WriteFile(ok, []byte("M  END"), 0644)
	old, oldCli := os.Args, cli
	os.Args = []string{"ReactioDraw", "--cli", "image", big, ok, "CCO", "C/C=C/C"}
	js := cliScript() // (it also starts the command line's 10-minute limit: far longer than these tests run)
	os.Args, cli = old, oldCli
	var v struct {
		Files    map[string]map[string]string
		FileErrs map[string]string
	}
	if err := json.Unmarshal([]byte(strings.TrimSuffix(strings.TrimPrefix(js, "window.__rdCli="), ";")), &v); err != nil {
		t.Fatalf("%v: %s", err, js)
	}
	if v.FileErrs[big] != "too large (70 MB, at most 64)" || v.Files[big] != nil {
		t.Errorf("bug 82: an over-size file on the command line: %q", v.FileErrs)
	}
	if v.Files[ok]["b64"] != eB64("M  END") || len(v.FileErrs) != 1 {
		t.Errorf("a good file or a SMILES taken for a bad file: %v %q", v.Files, v.FileErrs)
	}
}

// ---------- the local API ----------

func TestErrLocalAPIRequests(t *testing.T) {
	eSetup(t)
	webkit_web_view_evaluate_javascript = func(v uintptr, js string, n int64, world, src, cancel, cb, data uintptr) {
		if strings.HasPrefix(js, "window.__rdApiCall&&window.__rdApiCall(") {
			rest := strings.TrimPrefix(js, "window.__rdApiCall&&window.__rdApiCall(")
			var id string
			json.Unmarshal([]byte(rest[:strings.Index(rest, ",")]), &id)
			go apiDeliver(id, `{"ok":true,"result":1}`)
		}
	}
	p, _ := startLocalAPI()
	if p == 0 {
		t.Skip("no free port for the local API here")
	}
	defer stopLocalAPI()
	url := fmt.Sprintf("http://127.0.0.1:%d/api", p)
	do := func(body string, hdr map[string]string) (int, string) {
		req, _ := http.NewRequest("POST", url, strings.NewReader(body))
		req.Header.Set("X-Reactio-Token", apiToken)
		for k, v := range hdr {
			req.Header.Set(k, v)
		}
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		b, _ := io.ReadAll(res.Body)
		return res.StatusCode, string(b)
	}
	for _, body := range []string{"", "{", "[]", `{"op": 5}`, `{"args": {}}`, `{"op": ""}`} {
		if c, b := do(body, nil); c != 400 || !strings.Contains(b, `"ok":false`) {
			t.Errorf("body %q: %d %s", body, c, b)
		}
	}
	if c, _ := do(`{"op":"calc"}`, map[string]string{"X-Reactio-Token": "wrong"}); c != 403 {
		t.Errorf("wrong token: %d", c)
	}
	if c, _ := do(`{"op":"calc"}`, map[string]string{"Origin": "https://evil.example"}); c != 403 {
		t.Errorf("browser request: %d", c)
	}
	if c, b := do(`{"op":"calc"}`, nil); c != 200 || b != `{"ok":true,"result":1}` {
		t.Errorf("good call: %d %s", c, b)
	}
	/* an answer for a call nobody waits for is dropped quietly */
	apiDeliver("api-none", "{}")
}

/* every port the API may use is taken: apiStart says not ok */
func TestErrLocalAPINoPort(t *testing.T) {
	d := eSetup(t)
	stopLocalAPI()
	var ls []net.Listener
	for p := 47615; p < 47630; p++ {
		if l, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", p)); err == nil {
			ls = append(ls, l)
		}
	}
	defer func() {
		for _, l := range ls {
			l.Close()
		}
	}()
	if len(ls) != 15 {
		t.Skip("some of the API's ports are used by another program here")
	}
	if p, _ := startLocalAPI(); p != 0 {
		t.Errorf("no free port, yet the API says %d", p)
	}
	exe, _ := os.Executable()
	kit := filepath.Join(filepath.Dir(exe), "reactio-mcp")
	if os.WriteFile(kit, []byte("x"), 0755) == nil {
		defer os.Remove(kit)
		if r := eSend(t, map[string]interface{}{"cmd": "apiStart"}, time.Second); r["ok"] != false {
			t.Errorf("apiStart without a port: %v", r)
		}
	}
	if _, err := os.Stat(apiInfoPath()); err == nil {
		t.Errorf("api.json written though nothing listens")
	}
	_ = d
}

func TestErrApiStartNoKit(t *testing.T) {
	eSetup(t)
	if r := eSend(t, map[string]interface{}{"cmd": "apiStart"}, time.Second); r["ok"] != false || r["noKit"] != true {
		t.Errorf("without the AI add-on: %v", r)
	}
}

/* api.json cannot be written: apiStart must not answer ok (reactio-mcp would then say the app is not open) */
func TestErrLocalAPIInfoNotWritten(t *testing.T) {
	d := eSetup(t)
	stopLocalAPI()
	os.WriteFile(filepath.Join(d, "cfg"), []byte("a file where the config folder goes"), 0644)
	p, err := startLocalAPI()
	defer stopLocalAPI()
	if p == 0 && err == nil {
		t.Skip("no free port here")
	}
	if _, err := os.Stat(apiInfoPath()); err == nil {
		t.Fatalf("api.json was written after all")
	}
	if p != 0 || err == nil || !strings.Contains(err.Error(), "api.json") {
		t.Errorf("bug 81: api.json could not be written, yet the local API answers port %d, error %v", p, err)
	}
	if apiLn != nil {
		t.Errorf("bug 81: the API is left listening though no script can find it")
	}
	/* the page is told why (Settings shows "Could not start: …") */
	exe, _ := os.Executable()
	kit := filepath.Join(filepath.Dir(exe), "reactio-mcp")
	if os.WriteFile(kit, []byte("x"), 0755) == nil {
		defer os.Remove(kit)
		if r := eSend(t, map[string]interface{}{"cmd": "apiStart"}, time.Second); r["ok"] != false || !strings.Contains(fmt.Sprint(r["err"]), "api.json") {
			t.Errorf("bug 81: apiStart where api.json cannot be written: %v", r)
		}
	}
}

func TestErrStopLocalAPIKeepsOthers(t *testing.T) {
	eSetup(t)
	os.MkdirAll(filepath.Dir(apiInfoPath()), 0755)
	os.WriteFile(apiInfoPath(), []byte(`{"pid": 1}`), 0600)
	stopLocalAPI()
	if _, err := os.Stat(apiInfoPath()); err != nil {
		t.Errorf("another app's api.json was removed")
	}
	os.WriteFile(apiInfoPath(), []byte(`{broken`), 0600)
	stopLocalAPI()
	if _, err := os.Stat(apiInfoPath()); err == nil {
		t.Errorf("a broken api.json was kept")
	}
}

// ---------- the command line (cliDone ends the program: run in a child) ----------

func TestErrCliDone(t *testing.T) {
	if m := os.Getenv("RD_ETEST_CLIDONE"); m != "" {
		cli.out = os.Getenv("RD_ETEST_OUT")
		cliDone(m)
		return
	}
	d := t.TempDir()
	out := filepath.Join(d, "out")
	os.Mkdir(out, 0755)
	os.MkdirAll(filepath.Join(out, "isdir.png"), 0755)
	run := func(msg string) (int, string) {
		c := exec.Command(os.Args[0], "-test.run=^TestErrCliDone$")
		c.Env = append(os.Environ(), "RD_ETEST_CLIDONE="+msg, "RD_ETEST_OUT="+out)
		var se bytes.Buffer
		c.Stderr = &se
		err := c.Run()
		var ee *exec.ExitError
		if errors.As(err, &ee) {
			return ee.ExitCode(), se.String()
		}
		return 0, se.String()
	}
	if c, e := run("{bad json"); c != 1 || !strings.Contains(e, "bad answer from the page") {
		t.Errorf("bad answer: %d %q", c, e)
	}
	w := func(p string) string {
		b, _ := json.Marshal(map[string]interface{}{"Code": 0, "Writes": []map[string]string{{"Path": p, "B64": eB64("x")}}})
		return string(b)
	}
	if c, e := run(w(filepath.Join(d, "outside.png"))); c != 1 || !strings.Contains(e, "outside -o") {
		t.Errorf("outside -o: %d %q", c, e)
	}
	if _, err := os.Stat(filepath.Join(d, "outside.png")); err == nil {
		t.Errorf("written outside -o")
	}
	if c, e := run(w(filepath.Join(out, "isdir.png"))); c != 1 || !strings.Contains(e, "reactio: ") {
		t.Errorf("write failure: %d %q", c, e)
	}
	if c, e := run(w(filepath.Join(out, "sub", "ok.png"))); c != 0 || eRead(filepath.Join(out, "sub", "ok.png")) != "x" {
		t.Errorf("good write: %d %q", c, e)
	}
}

// ---------- folders.go (the same file in mcp/ and windows-app/) ----------

func TestErrCheckFile(t *testing.T) {
	d := eSetup(t)
	if _, err := checkFile("  ", false); err == nil {
		t.Errorf("empty name accepted")
	}
	/* no folder allowed yet: the message says how to add one */
	if _, err := checkFile(filepath.Join(d, "a.png"), false); err == nil || !strings.Contains(err.Error(), "no folder is allowed yet") {
		t.Errorf("no folder: %v", err)
	}
	ok := filepath.Join(d, "ok")
	os.Mkdir(ok, 0755)
	if err := saveFolders([]string{ok}); err != nil {
		t.Fatal(err)
	}
	os.Symlink("/etc", filepath.Join(ok, "etc"))
	os.Symlink(filepath.Join(d, "nowhere", "x.png"), filepath.Join(ok, "dangling.png"))
	for _, c := range []struct {
		p    string
		w    bool
		want string
	}{
		{filepath.Join(d, "a.png"), false, "is not in the folders"},
		{filepath.Join(ok, "a.exe"), false, "files of this kind"},
		{filepath.Join(ok, "a.pdf"), false, "files of this kind"}, // written, never read
		{filepath.Join(ok, ".hidden", "a.png"), false, "hidden"},
		{filepath.Join(ok, "etc", "hosts.txt"), false, "do not use files there"},
		{filepath.Join(ok, "dangling.png"), true, "is not in the folders"},
		{filepath.Join(rdConfigDir(), "x.json"), true, "do not use files there"},
	} {
		if _, err := checkFile(c.p, c.w); err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s: %v (want %q)", c.p, err, c.want)
		}
	}
	/* a link loop: realPath gives up without hanging */
	os.Symlink(filepath.Join(ok, "loopb"), filepath.Join(ok, "loopa"))
	os.Symlink(filepath.Join(ok, "loopa"), filepath.Join(ok, "loopb"))
	done := make(chan bool)
	go func() { checkFile(filepath.Join(ok, "loopa", "x.png"), false); done <- true }()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Errorf("a symlink loop hangs checkFile")
	}
}

// ---------- allow.go (the same file in windows-app/) ----------

func TestErrAllowListFile(t *testing.T) {
	d := eSetup(t)
	/* a broken allowed-paths.json: nothing allowed, no panic */
	os.WriteFile(allowFile(), []byte("[broken"), 0600)
	allowList = nil
	if pathAllowed(filepath.Join(d, "a.reactio")) {
		t.Errorf("broken list allowed a path")
	}
	allowList = nil
	os.WriteFile(allowFile(), []byte(`{"not":"a list"}`), 0600)
	if pathAllowed(filepath.Join(d, "a.reactio")) {
		t.Errorf("list of the wrong type allowed a path")
	}
	/* the list cannot be saved: the path is allowed for this session all the same */
	allowList = nil
	app.base = filepath.Join(d, "afile")
	os.WriteFile(app.base, []byte("x"), 0644)
	allowPath(filepath.Join(d, "b.reactio"))
	if !pathAllowed(filepath.Join(d, "b.reactio")) {
		t.Errorf("a chosen file is not writable when the list cannot be saved")
	}
	allowPath("")
	if len(allowList) != 1 {
		t.Errorf("an empty path was added: %v", allowList)
	}
}

// ---------- the updater (updcore.go is the same file in windows-app/) ----------

type eRT func(*http.Request) (*http.Response, error)

func (f eRT) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

/* GitHub replaced by fn for the test (no network) */
func eFakeNet(t *testing.T, fn eRT) {
	old := http.DefaultTransport
	http.DefaultTransport = fn
	t.Cleanup(func() { http.DefaultTransport = old })
}

func eResp(code int, body string) *http.Response {
	return &http.Response{StatusCode: code, Body: io.NopCloser(strings.NewReader(body)), Header: http.Header{}}
}

func TestErrLatestRelease(t *testing.T) {
	eFakeNet(t, func(r *http.Request) (*http.Response, error) { return nil, errors.New("network is unreachable") })
	if _, err := latestRelease(); err == nil {
		t.Errorf("no network: no error")
	}
	eFakeNet(t, func(r *http.Request) (*http.Response, error) { return eResp(403, "rate limited"), nil })
	if _, err := latestRelease(); err == nil || !strings.Contains(err.Error(), "403") {
		t.Errorf("403: %v", err)
	}
	eFakeNet(t, func(r *http.Request) (*http.Response, error) { return eResp(200, "{not json"), nil })
	if _, err := latestRelease(); err == nil {
		t.Errorf("bad JSON: no error")
	}
	eFakeNet(t, func(r *http.Request) (*http.Response, error) { return eResp(200, `{"tag_name": 5}`), nil })
	if _, err := latestRelease(); err == nil {
		t.Errorf("wrong type: no error")
	}
}

func TestErrDownload(t *testing.T) {
	d := t.TempDir()
	body := "archive bytes"
	sum := sha256.Sum256([]byte(body))
	good := relAsset{Name: "a.tar.gz", Size: int64(len(body)), Digest: "sha256:" + hex.EncodeToString(sum[:]), URL: relPrefix + "v1/a.tar.gz"}
	serve := func(code int, b string) {
		eFakeNet(t, func(r *http.Request) (*http.Response, error) { return eResp(code, b), nil })
	}
	serve(200, body)
	cases := []struct {
		name string
		a    relAsset
		dst  string
		want string
	}{
		{"elsewhere", relAsset{Name: "a", Size: 1, Digest: good.Digest, URL: "https://evil.example/a"}, "x", "unexpected download address"},
		{"no digest", relAsset{Name: "a", Size: 1, URL: good.URL}, "x", "no SHA-256"},
		{"md5 digest", relAsset{Name: "a", Size: 1, Digest: "md5:abc", URL: good.URL}, "x", "no SHA-256"},
		{"size 0", relAsset{Name: "a", Size: 0, Digest: good.Digest, URL: good.URL}, "x", "unexpected size"},
		{"over-size", relAsset{Name: "a", Size: 401 << 20, Digest: good.Digest, URL: good.URL}, "x", "unexpected size"},
		{"missing folder", good, filepath.Join(d, "gone", "a.tar.gz"), "no such file"},
	}
	for _, c := range cases {
		if err := download(&c.a, c.dst, nil); err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s: %v", c.name, err)
		}
	}
	dst := filepath.Join(d, "a.tar.gz")
	serve(404, "")
	if err := download(&good, dst, nil); err == nil || !strings.Contains(err.Error(), "404") {
		t.Errorf("404: %v", err)
	}
	serve(200, body[:5])
	if err := download(&good, dst, nil); err == nil || !strings.Contains(err.Error(), "incomplete") {
		t.Errorf("short: %v", err)
	}
	serve(200, body+"more")
	if err := download(&good, dst, nil); err == nil || !strings.Contains(err.Error(), "incomplete") {
		t.Errorf("long: %v", err)
	}
	serve(200, strings.ToUpper(body))
	if err := download(&good, dst, nil); err == nil || !strings.Contains(err.Error(), "SHA-256") {
		t.Errorf("wrong sum: %v", err)
	}
	/* the connection drops part way */
	eFakeNet(t, func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Body: io.NopCloser(io.MultiReader(strings.NewReader("arch"), eErrReader{})), Header: http.Header{}}, nil
	})
	if err := download(&good, dst, nil); err == nil || !strings.Contains(err.Error(), "connection reset") {
		t.Errorf("dropped: %v", err)
	}
	/* disk full */
	serve(200, body)
	restore := eDiskFull(t, 4)
	err := download(&good, dst, nil)
	restore()
	if err == nil {
		t.Errorf("disk full: no error")
	}
	serve(200, body)
	if err := download(&good, dst, func(float64) {}); err != nil || eRead(dst) != body {
		t.Errorf("good download: %v", err)
	}
}

type eErrReader struct{}

func (eErrReader) Read([]byte) (int, error) { return 0, errors.New("connection reset by peer") }

/* a .tar.gz with these files (name → content) */
func eTgz(t *testing.T, p string, files map[string]string) {
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	for n, s := range files {
		tw.WriteHeader(&tar.Header{Name: n, Mode: 0755, Size: int64(len(s)), Typeflag: tar.TypeReg})
		tw.Write([]byte(s))
	}
	tw.Close()
	gz.Close()
	os.WriteFile(p, buf.Bytes(), 0644)
}

func TestErrUntarStaged(t *testing.T) {
	d := t.TempDir()
	place := func(r string) string { return filepath.Join(d, "root", r) }
	try := func(tgz string) error {
		return untarStaged(tgz, "Reactio Draw", filepath.Join(d, "stage"), place, map[string]string{}, map[string]os.FileMode{})
	}
	if err := try(filepath.Join(d, "missing.tar.gz")); err == nil {
		t.Errorf("missing archive: no error")
	}
	junk := filepath.Join(d, "junk.tar.gz")
	os.WriteFile(junk, []byte("not gzip at all"), 0644)
	if err := try(junk); err == nil {
		t.Errorf("not gzip: no error")
	}
	/* cut short */
	full := filepath.Join(d, "full.tar.gz")
	eTgz(t, full, map[string]string{"Reactio Draw/ReactioDraw": strings.Repeat("p", 20000)})
	b, _ := os.ReadFile(full)
	cut := filepath.Join(d, "cut.tar.gz")
	os.WriteFile(cut, b[:len(b)/2], 0644)
	if err := try(cut); err == nil {
		t.Errorf("truncated archive: no error")
	}
	/* only files outside the top folder (or leaving it) */
	other := filepath.Join(d, "other.tar.gz")
	eTgz(t, other, map[string]string{"Other/x": "x", "Reactio Draw/../evil": "x", "Reactio Draw/": ""})
	if err := try(other); err == nil || !strings.Contains(err.Error(), "none of the program's files") {
		t.Errorf("nothing of ours: %v", err)
	}
	if _, err := os.Stat(filepath.Join(d, "evil")); err == nil {
		t.Errorf("a path leaving the folder was written")
	}
	/* the stage cannot be written (a file where the folder goes) */
	os.WriteFile(filepath.Join(d, "stagefile"), []byte("x"), 0644)
	if err := untarStaged(full, "Reactio Draw", filepath.Join(d, "stagefile"), place, map[string]string{}, map[string]os.FileMode{}); err == nil {
		t.Errorf("stage not writable: no error")
	}
	/* disk full while unpacking */
	restore := eDiskFull(t, 1000)
	err := untarStaged(full, "Reactio Draw", filepath.Join(d, "stage2"), place, map[string]string{}, map[string]os.FileMode{})
	restore()
	if err == nil {
		t.Errorf("disk full: no error")
	}
}

/* a failure part way puts every old file back */
func TestErrPutFilesRollback(t *testing.T) {
	d := t.TempDir()
	root := filepath.Join(d, "root")
	os.MkdirAll(root, 0755)
	os.WriteFile(filepath.Join(root, "a"), []byte("old a"), 0644)
	os.WriteFile(filepath.Join(root, "b"), []byte("old b"), 0644)
	os.WriteFile(filepath.Join(root, "blocker"), []byte("a file where a folder must go"), 0644)
	st := filepath.Join(d, "stage")
	os.MkdirAll(st, 0755)
	os.WriteFile(filepath.Join(st, "a"), []byte("new a"), 0644)
	os.WriteFile(filepath.Join(st, "b"), []byte("new b"), 0644)
	os.WriteFile(filepath.Join(st, "c"), []byte("new c"), 0644)
	for i := 0; i < 5; i++ { // map order differs between runs: try a few
		err := putFiles(map[string]string{
			filepath.Join(st, "a"):       filepath.Join(root, "a"),
			filepath.Join(st, "b"):       filepath.Join(root, "b"),
			filepath.Join(st, "c"):       filepath.Join(root, "blocker", "c"),
			filepath.Join(st, "missing"): filepath.Join(root, "m"),
		}, func(string) os.FileMode { return 0644 })
		if err == nil {
			t.Fatalf("no error")
		}
		if eRead(filepath.Join(root, "a")) != "old a" || eRead(filepath.Join(root, "b")) != "old b" {
			t.Fatalf("not rolled back: a=%q b=%q (%v)", eRead(filepath.Join(root, "a")), eRead(filepath.Join(root, "b")), err)
		}
		eOnly(t, root, "a", "b", "blocker")
	}
	if err := copyFile(filepath.Join(st, "nope"), filepath.Join(d, "x"), 0644); err == nil {
		t.Errorf("copyFile from a missing file: no error")
	}
	if err := copyFile(filepath.Join(st, "a"), filepath.Join(d, "gone", "x"), 0644); err == nil {
		t.Errorf("copyFile into a missing folder: no error")
	}
	cleanOld("")
	cleanOld(filepath.Join(d, "nope"))
}

/* Update from the page: every failure before anything is put in place comes back to the page */
func TestErrBridgeUpdate(t *testing.T) {
	eSetup(t)
	upd.busy = false
	eFakeNet(t, func(r *http.Request) (*http.Response, error) { return nil, errors.New("network is unreachable") })
	r := eSend(t, map[string]interface{}{"cmd": "update", "name": "v9"}, 5*time.Second)
	if r["ok"] != false || !strings.Contains(fmt.Sprint(r["err"]), "unreachable") || upd.busy {
		t.Errorf("no network: %v (busy %v)", r, upd.busy)
	}
	eFakeNet(t, func(r *http.Request) (*http.Response, error) {
		return eResp(200, `{"tag_name":"v10","assets":[]}`), nil
	})
	if r := eSend(t, map[string]interface{}{"cmd": "update", "name": "v9"}, 5*time.Second); !strings.Contains(fmt.Sprint(r["err"]), "changed meanwhile") {
		t.Errorf("tag changed: %v", r)
	}
	if r := eSend(t, map[string]interface{}{"cmd": "update", "name": "v10"}, 5*time.Second); !strings.Contains(fmt.Sprint(r["err"]), "is not in release") {
		t.Errorf("asset missing: %v", r)
	}
	/* the archive fails its check: nothing put in place */
	body := "x"
	eFakeNet(t, func(r *http.Request) (*http.Response, error) {
		if strings.Contains(r.URL.Host, "api.github.com") {
			return eResp(200, `{"tag_name":"v10","assets":[{"name":"`+updAssetName()+`","size":1,"digest":"sha256:`+strings.Repeat("0", 64)+`","browser_download_url":"`+relPrefix+`v10/x"}]}`), nil
		}
		return eResp(200, body), nil
	})
	if r := eSend(t, map[string]interface{}{"cmd": "update", "name": ""}, 5*time.Second); !strings.Contains(fmt.Sprint(r["err"]), "SHA-256") || upd.restart {
		t.Errorf("bad sum: %v", r)
	}
	/* one already running */
	upd.busy = true
	if r := eSend(t, map[string]interface{}{"cmd": "update"}, time.Second); r["ok"] != false {
		t.Errorf("second update: %v", r)
	}
	upd.busy = false
}

// ---------- the rest: no config folder, no WebKitGTK, a crashed helper's pipe, the updater's later steps ----------

/* neither XDG_CONFIG_HOME nor HOME: the settings go to the temporary folder rather than nowhere */
func TestErrNoConfigDir(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", "")
	t.Setenv("HOME", "")
	if d := rdConfigDir(); d != filepath.Join(os.TempDir(), "ReactioDraw") {
		t.Errorf("rdConfigDir without a home: %s", d)
	}
	if p := apiInfoPath(); p != filepath.Join(os.TempDir(), "ReactioDraw", "api.json") {
		t.Errorf("apiInfoPath without a home: %s", p)
	}
}

/* GTK there, WebKitGTK not: loadGTK says what to install (main then opens the page in the browser) */
func TestErrLoadGTKMissing(t *testing.T) {
	if _, err := open("libgtk-3.so.0"); err != nil {
		if err := loadGTK(); err == nil || !strings.Contains(err.Error(), "GTK 3 is not installed") {
			t.Errorf("no GTK: %v", err)
		}
		return
	}
	if _, err := open("libwebkit2gtk-4.1.so.0", "libwebkit2gtk-4.0.so.37"); err == nil {
		t.Skip("WebKitGTK is installed here: loadGTK would succeed")
	}
	if err := loadGTK(); err == nil || !strings.Contains(err.Error(), "WebKitGTK is not installed") || !strings.Contains(err.Error(), "apt install") {
		t.Errorf("no WebKitGTK: %v", err)
	}
}

/* the helper closed its input: the request cannot be sent (Flush fails), the page still gets an answer */
func TestErrNamerInputClosed(t *testing.T) {
	d := eSetup(t)
	namerStop()
	defer namerStop()
	eTools(t, map[string]string{"reactio_name.py": "# stand-in\n"})
	t.Setenv("PATH", filepath.Join(d, "empty"))
	t.Setenv("REACTIO_PYTHON", eScript(t, d, "python", `exec 0<&-; echo '{"ready":"1.0"}'; sleep 2`))
	r := eSend(t, map[string]interface{}{"cmd": "iupac", "name": "CCO"}, 10*time.Second)
	if r["name"] != nil || r["err"] == nil {
		t.Errorf("helper with closed input: %v", r)
	}
}

/* an update started after another: the earlier program is waited for, its flag taken off the arguments */
func TestErrWaitAfterUpdate(t *testing.T) {
	old := os.Args
	defer func() { os.Args = old }()
	os.Args = []string{"ReactioDraw", "--after-update=999999999", "doc.reactio"}
	t0 := time.Now()
	waitAfterUpdate()
	if len(os.Args) != 2 || os.Args[1] != "doc.reactio" {
		t.Errorf("arguments after: %v", os.Args)
	}
	if time.Since(t0) > 5*time.Second {
		t.Errorf("waited %v for a program that is not there", time.Since(t0))
	}
	os.Args = []string{"ReactioDraw", "--after-update=x"}
	waitAfterUpdate()
}

/* a download whose request fails at once */
func TestErrDownloadNoNetwork(t *testing.T) {
	eFakeNet(t, func(r *http.Request) (*http.Response, error) { return nil, errors.New("no route to host") })
	a := relAsset{Name: "a", Size: 1, Digest: "sha256:" + strings.Repeat("0", 64), URL: relPrefix + "v1/a"}
	if err := download(&a, filepath.Join(t.TempDir(), "a"), nil); err == nil || !strings.Contains(err.Error(), "no route") {
		t.Errorf("no network: %v", err)
	}
}

/* an older file cannot be moved aside (its .rd-old name is taken by a folder): nothing is changed */
func TestErrPutFilesCannotMoveAside(t *testing.T) {
	d := t.TempDir()
	root := filepath.Join(d, "root")
	os.MkdirAll(filepath.Join(root, "a"+oldSuffix, "inner"), 0755)
	os.WriteFile(filepath.Join(root, "a"), []byte("old a"), 0644)
	src := filepath.Join(d, "new-a")
	os.WriteFile(src, []byte("new a"), 0644)
	err := putFiles(map[string]string{src: filepath.Join(root, "a")}, func(string) os.FileMode { return 0644 })
	if err == nil || !strings.Contains(err.Error(), "is in use") {
		t.Errorf("cannot move aside: %v", err)
	}
	if eRead(filepath.Join(root, "a")) != "old a" {
		t.Errorf("the old file was changed")
	}
}

/* runUpdate's later steps fail: the error reaches the page and the installation is as it was */
func TestErrRunUpdateSteps(t *testing.T) {
	d := eSetup(t)
	upd.busy, upd.restart = false, false
	tgz := func(files map[string]string) []byte {
		p := filepath.Join(d, "x.tgz")
		eTgz(t, p, files)
		b, _ := os.ReadFile(p)
		return b
	}
	var mainBody, kitBody []byte
	kitName := "ReactioDraw-Linux-" + updArch() + "-AI-assistants.tar.gz"
	asset := func(name string, b []byte) string {
		s := sha256.Sum256(b)
		return `{"name":"` + name + `","size":` + fmt.Sprint(len(b)) + `,"digest":"sha256:` + hex.EncodeToString(s[:]) + `","browser_download_url":"` + relPrefix + `v2/` + name + `"}`
	}
	withKit, kitWrong := false, false
	eFakeNet(t, func(r *http.Request) (*http.Response, error) {
		if strings.Contains(r.URL.Host, "api.github.com") {
			as := asset(updAssetName(), mainBody)
			if withKit {
				as += "," + asset(kitName, kitBody)
			}
			return eResp(200, `{"tag_name":"v2","assets":[`+as+`]}`), nil
		}
		if strings.HasSuffix(r.URL.Path, kitName) {
			if kitWrong {
				return eResp(200, "x"+string(kitBody)), nil
			}
			return eResp(200, string(kitBody)), nil
		}
		return eResp(200, string(mainBody)), nil
	})
	step := func(what, want string) {
		t.Helper()
		r := eSend(t, map[string]interface{}{"cmd": "update"}, 5*time.Second)
		if r["ok"] != false || !strings.Contains(fmt.Sprint(r["err"]), want) || upd.restart {
			t.Errorf("%s: %v (restart %v)", what, r, upd.restart)
		}
	}
	/* the archive passes its check but is not a .tar.gz */
	mainBody = []byte("not an archive")
	step("junk archive", "gzip")
	/* the work folder cannot be made */
	base := app.base
	app.base = filepath.Join(d, "basefile")
	os.WriteFile(app.base, []byte("x"), 0644)
	step("no work folder", "not a directory")
	app.base = base
	/* with the AI add-on: its archive fails its check, or is junk */
	root := updRoot()
	kit := filepath.Join(root, "reactio-mcp")
	if err := os.WriteFile(kit, []byte("old kit"), 0755); err != nil {
		t.Skipf("cannot write beside the test program: %v", err)
	}
	defer os.Remove(kit)
	mainBody = tgz(map[string]string{"Reactio Draw/README.txt": "new"})
	withKit = true
	kitBody = []byte("junk kit")
	kitWrong = true
	step("kit download fails its check", "incomplete")
	kitWrong = false
	step("junk kit", "unexpected EOF")
	/* a file that cannot be put in place (its folder is a file): rolled back, nothing changed */
	withKit = false
	mainBody = tgz(map[string]string{"Reactio Draw/reactio-mcp/inside": "new"})
	step("cannot put in place", "could not write")
	if eRead(kit) != "old kit" {
		t.Errorf("the installation was changed: %q", eRead(kit))
	}
	if _, err := os.Stat(filepath.Join(root, "README.txt")); err == nil {
		t.Errorf("a new file was left in the installation")
	}
}
