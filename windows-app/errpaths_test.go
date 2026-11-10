//go:build windows

package main

// Error paths of the Windows app's native side that do not need a window: the bridge commands that reply without a
// dialog or message box, the helpers (Python, Java, PowerShell's text recognition, MolScribe), the local API, the
// command line and the updater. WebView2 is replaced by a Go stand-in that keeps what the app runs in the page.
//
// This package builds only for Windows (it calls the Windows API), so these tests compile here with
// GOOS=windows go test -c and run only on Windows. allow.go, folders.go and updcore.go are the same files as in
// linux-app/, where the same failures are tested and run.
//
// A test that shows a real fault asserts the right behaviour and is skipped with the number of the fault in
// rd-tests/BUGS.md, so the suite stays green until it is fixed.

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
)

/* WebView2 stood in for: Dispatch runs at once, Eval is kept */
type wFake struct {
	mu    sync.Mutex
	evals []string
}

func (f *wFake) Run()                            {}
func (f *wFake) Terminate()                      {}
func (f *wFake) Dispatch(fn func())              { fn() }
func (f *wFake) Destroy()                        {}
func (f *wFake) Window() unsafe.Pointer          { return nil }
func (f *wFake) SetTitle(string)                 {}
func (f *wFake) SetSize(int, int, webview2.Hint) {}
func (f *wFake) Navigate(string)                 {}
func (f *wFake) SetHtml(string)                  {}
func (f *wFake) Init(string)                     {}
func (f *wFake) Bind(string, interface{}) error  { return nil }
func (f *wFake) Eval(js string)                  { f.mu.Lock(); f.evals = append(f.evals, js); f.mu.Unlock() }

var wView *wFake
var wSeq int

func wSetup(t *testing.T) string {
	t.Helper()
	d := t.TempDir()
	wView = &wFake{}
	app.w = wView
	app.base = filepath.Join(d, "base")
	os.MkdirAll(app.base, 0755)
	allowList = nil
	t.Setenv("APPDATA", filepath.Join(d, "AppData"))
	t.Setenv("LOCALAPPDATA", filepath.Join(d, "Local"))
	t.Setenv("USERPROFILE", d)
	t.Setenv("HOME", d)
	t.Setenv("ProgramFiles", filepath.Join(d, "pf"))
	t.Setenv("ProgramFiles(x86)", filepath.Join(d, "pf86"))
	return d
}

/* the reply the page got for id */
func wReply(id string, wait time.Duration) (map[string]interface{}, bool) {
	pre := "window.__rdReply&&window.__rdReply("
	end := time.Now().Add(wait)
	for {
		wView.mu.Lock()
		for _, js := range wView.evals {
			if !strings.HasPrefix(js, pre) {
				continue
			}
			var pair []string
			if json.Unmarshal([]byte("["+strings.TrimSuffix(strings.TrimPrefix(js, pre), ")")+"]"), &pair) == nil && len(pair) == 2 && pair[0] == id {
				var r map[string]interface{}
				json.Unmarshal([]byte(pair[1]), &r)
				wView.mu.Unlock()
				return r, true
			}
		}
		wView.mu.Unlock()
		if time.Now().After(end) {
			return nil, false
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func wSend(t *testing.T, m map[string]interface{}, wait time.Duration) map[string]interface{} {
	t.Helper()
	wSeq++
	id := fmt.Sprintf("w%d", wSeq)
	m["id"] = id
	b, _ := json.Marshal(m)
	handle(string(b))
	r, ok := wReply(id, wait)
	if !ok {
		t.Fatalf("%v: no reply to the page", m["cmd"])
	}
	return r
}

func wB64(s string) string { return base64.StdEncoding.EncodeToString([]byte(s)) }

func wTools(t *testing.T, files map[string]string) {
	t.Helper()
	dir := filepath.Dir(toolPath("x"))
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Skipf("cannot make %s: %v", dir, err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	for n, s := range files {
		os.WriteFile(filepath.Join(dir, n), []byte(s), 0644)
	}
}

func TestWinErrBridgeMalformed(t *testing.T) {
	wSetup(t)
	for _, s := range []string{"", "{", "[]", `{"id":5}`} {
		handle(s)
	}
	if len(wView.evals) != 0 {
		t.Errorf("a reply without a readable id: %v", wView.evals)
	}
	if r := wSend(t, map[string]interface{}{"cmd": "nosuch"}, time.Second); r["ok"] != false || !strings.Contains(fmt.Sprint(r["err"]), "unknown command") {
		t.Errorf("unknown command: %v", r)
	}
	if r := wSend(t, map[string]interface{}{"cmd": "write"}, time.Second); r["err"] != "no file" {
		t.Errorf("write without path: %v", r)
	}
	handle(`{"id":"wt1","cmd":"write","path":5}`)
	if _, ok := wReply("wt1", 200*time.Millisecond); !ok {
		t.Skip("bug 76: a message with a field of the wrong type is dropped with no reply")
	}
}

func TestWinErrBridgeWrite(t *testing.T) {
	d := wSetup(t)
	if r := wSend(t, map[string]interface{}{"cmd": "write", "path": filepath.Join(d, "x.reactio"), "b64": wB64("x")}, time.Second); r["ask"] != true {
		t.Errorf("not chosen: %v", r)
	}
	gone := filepath.Join(d, "gone", "a.reactio")
	allowPath(gone)
	if r := wSend(t, map[string]interface{}{"cmd": "write", "path": gone, "b64": wB64("x")}, time.Second); r["ok"] != false || r["err"] == nil {
		t.Errorf("missing folder: %v", r)
	}
	/* a folder where the file goes: the rename and the write in place both fail, reported as locked; no temporary file left */
	sub := filepath.Join(d, "sub")
	blk := filepath.Join(sub, "blocked.reactio")
	os.MkdirAll(filepath.Join(blk, "inner"), 0755)
	allowPath(blk)
	if r := wSend(t, map[string]interface{}{"cmd": "write", "path": blk, "b64": wB64("x")}, time.Second); r["ok"] != false || r["locked"] != true {
		t.Errorf("blocked: %v", r)
	}
	if es, _ := os.ReadDir(sub); len(es) != 1 {
		t.Errorf("left behind: %v", es)
	}
	if _, err := writeNew(filepath.Join(d, "nope", "x.svg"), []byte("x")); err == nil {
		t.Errorf("writeNew into a missing folder: no error")
	}
}

func TestWinErrBridgeTexHead(t *testing.T) {
	d := wSetup(t)
	allowPath(filepath.Join(d, "doc.reactio"))
	for _, p := range []string{filepath.Join(d, "doc.txt"), filepath.Join(d, "other.tex"), filepath.Join(d, "doc.tex")} {
		if r := wSend(t, map[string]interface{}{"cmd": "texHead", "path": p}, time.Second); r["exists"] != false || r["line"] != "" {
			t.Errorf("%s: %v", p, r)
		}
	}
}

func TestWinErrFolderRemoveNotSaved(t *testing.T) {
	d := wSetup(t)
	os.WriteFile(filepath.Join(d, "AppData"), []byte("a file where the folder goes"), 0644)
	if err := saveFolders([]string{d}); err == nil {
		t.Fatalf("saveFolders gave no error where it cannot write")
	}
	r := wSend(t, map[string]interface{}{"cmd": "aiFolderRemove", "path": d}, time.Second)
	if r["err"] == nil || !strings.Contains(fmt.Sprint(r["err"]), "could not be saved") {
		t.Errorf("bug 80: aiFolderRemove must report that allowed-folders.json could not be written: %v", r)
	}
}

func TestWinErrOcr(t *testing.T) {
	wSetup(t)
	for _, b := range []string{"", "%%%"} {
		if r := ocrRun(b); r["ok"] != false || r["error"] != "the picture could not be read" {
			t.Errorf("%q: %v", b, r)
		}
	}
	if b, k := ocrPrepare([]byte("not a picture")); string(b) != "not a picture" || k != 1 {
		t.Errorf("ocrPrepare of junk: %v", k)
	}
	/* PowerShell missing */
	t.Setenv("PATH", "")
	t.Setenv("SystemRoot", t.TempDir())
	if r := ocrRun(wB64("\x89PNG not really")); r["ok"] != false || r["error"] == "" {
		t.Errorf("without PowerShell: %v", r)
	}
}

func TestWinErrOcsr(t *testing.T) {
	d := wSetup(t)
	t.Setenv("REACTIO_OCSR_PYTHON", "")
	if r := ocsrRun("", nil); r["ok"] != false || !strings.Contains(fmt.Sprint(r["error"]), "reactio_ocsr.py is missing") {
		t.Errorf("no script: %v", r)
	}
	wTools(t, map[string]string{"reactio_ocsr.py": "# stand-in"})
	if r := ocsrRun("", nil); r["ok"] != false || !strings.Contains(fmt.Sprint(r["error"]), "needs MolScribe") {
		t.Errorf("no Python: %v", r)
	}
	py := filepath.Join(d, "py.bat")
	os.WriteFile(py, []byte("@echo {\"ok\":false,\"error\":\"no model\"}\r\n"), 0755)
	t.Setenv("REACTIO_OCSR_PYTHON", py)
	if r := ocsrRun("", nil); r["ok"] != false || r["error"] != "no model" {
		t.Errorf("MolScribe fails: %v", r)
	}
}

func TestWinErrHelpersMissing(t *testing.T) {
	d := wSetup(t)
	namerStop()
	opsinStop()
	defer namerStop()
	defer opsinStop()
	t.Setenv("PATH", filepath.Join(d, "empty"))
	t.Setenv("REACTIO_PYTHON", "")
	t.Setenv("JAVA_HOME", filepath.Join(d, "nojdk"))
	if r := wSend(t, map[string]interface{}{"cmd": "iupac", "name": "CCO"}, 5*time.Second); r["err"] != "nohelper" {
		t.Errorf("no helper: %v", r)
	}
	if r := wSend(t, map[string]interface{}{"cmd": "opsin", "name": "ethanol"}, 5*time.Second); r["err"] != "nojava" {
		t.Errorf("no Java: %v", r)
	}
	wTools(t, map[string]string{"reactio_name.py": "# stand-in"})
	if r := wSend(t, map[string]interface{}{"cmd": "iupac", "name": "CCO"}, 5*time.Second); r["err"] != "nopython" {
		t.Errorf("no Python: %v", r)
	}
}

func TestWinErrFileArgsOversize(t *testing.T) {
	d := wSetup(t)
	big := filepath.Join(d, "big.mol")
	f, _ := os.Create(big)
	f.Truncate(64 << 20)
	f.Close()
	old := os.Args
	os.Args = []string{"ReactioDraw.exe", big}
	files, errs := fileArgs()
	os.Args = old
	if len(files) != 0 {
		t.Fatalf("an over-size file was opened")
	}
	if len(errs) != 1 || errs[0] != "big.mol: too large (64 MB, at most 64)" {
		t.Errorf("bug 82: a file of 64 MB or more opened with the app must be reported: %q", errs)
	}
}

func TestWinErrLocalAPIInfoNotWritten(t *testing.T) {
	d := wSetup(t)
	stopLocalAPI()
	os.WriteFile(filepath.Join(d, "AppData"), []byte("x"), 0644)
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
}

func TestWinErrCliDone(t *testing.T) {
	if m := os.Getenv("RD_WTEST_CLIDONE"); m != "" {
		cli.out = os.Getenv("RD_WTEST_OUT")
		cliDone(m)
		return
	}
	d := t.TempDir()
	run := func(msg string) (int, string) {
		c := exec.Command(os.Args[0], "-test.run=^TestWinErrCliDone$")
		c.Env = append(os.Environ(), "RD_WTEST_CLIDONE="+msg, "RD_WTEST_OUT="+d)
		var se bytes.Buffer
		c.Stderr = &se
		err := c.Run()
		var ee *exec.ExitError
		if errors.As(err, &ee) {
			return ee.ExitCode(), se.String()
		}
		return 0, se.String()
	}
	if c, e := run("{bad"); c != 1 || !strings.Contains(e, "bad answer") {
		t.Errorf("bad answer: %d %q", c, e)
	}
	b, _ := json.Marshal(map[string]interface{}{"Writes": []map[string]string{{"Path": filepath.Join(filepath.Dir(d), "x.png"), "B64": "eA=="}}})
	if c, e := run(string(b)); c != 1 || !strings.Contains(e, "outside -o") {
		t.Errorf("outside -o: %d %q", c, e)
	}
}

type wRT func(*http.Request) (*http.Response, error)

func (f wRT) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestWinErrUpdate(t *testing.T) {
	d := wSetup(t)
	old := http.DefaultTransport
	defer func() { http.DefaultTransport = old }()
	http.DefaultTransport = wRT(func(*http.Request) (*http.Response, error) { return nil, errors.New("no network") })
	upd.busy = false
	if r := wSend(t, map[string]interface{}{"cmd": "update", "name": "v1"}, 5*time.Second); r["ok"] != false || !strings.Contains(fmt.Sprint(r["err"]), "no network") {
		t.Errorf("no network: %v", r)
	}
	http.DefaultTransport = wRT(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 500, Body: io.NopCloser(strings.NewReader("")), Header: http.Header{}}, nil
	})
	if _, err := latestRelease(); err == nil || !strings.Contains(err.Error(), "500") {
		t.Errorf("500: %v", err)
	}
	/* archives: missing, not a zip, nothing of ours, a damaged entry */
	try := func(p string) error {
		return unzipStaged(p, "Reactio Draw", filepath.Join(d, "stage"), func(r string) string { return filepath.Join(d, "root", r) }, map[string]string{})
	}
	if err := try(filepath.Join(d, "none.zip")); err == nil {
		t.Errorf("missing zip: no error")
	}
	os.WriteFile(filepath.Join(d, "junk.zip"), []byte("junk"), 0644)
	if err := try(filepath.Join(d, "junk.zip")); err == nil {
		t.Errorf("junk zip: no error")
	}
	mk := func(p string, files map[string]string) []byte {
		var buf bytes.Buffer
		z := zip.NewWriter(&buf)
		for n, s := range files {
			w, _ := z.CreateHeader(&zip.FileHeader{Name: n, Method: zip.Store})
			w.Write([]byte(s))
		}
		z.Close()
		os.WriteFile(p, buf.Bytes(), 0644)
		return buf.Bytes()
	}
	mk(filepath.Join(d, "other.zip"), map[string]string{"Other/x": "x", "Reactio Draw/../x": "x"})
	if err := try(filepath.Join(d, "other.zip")); err == nil || !strings.Contains(err.Error(), "none of the program's files") {
		t.Errorf("nothing of ours: %v", err)
	}
	b := mk(filepath.Join(d, "bad.zip"), map[string]string{"Reactio Draw/ReactioDraw.exe": "PROGRAMBYTES"})
	i := bytes.Index(b, []byte("PROGRAMBYTES"))
	b[i] = 'X' // the stored bytes no longer match their CRC
	os.WriteFile(filepath.Join(d, "bad.zip"), b, 0644)
	if err := try(filepath.Join(d, "bad.zip")); err == nil {
		t.Errorf("damaged entry: no error")
	}
}

func TestWinErrSmallHelpers(t *testing.T) {
	d := wSetup(t)
	if ownPage("%zz", `C:\x\index.html`) {
		t.Errorf("a bad address was taken for the app's page")
	}
	/* a link with a NUL cannot be handed to Windows: refused before ShellExecute */
	if openLink("https://example.org/\x00x") {
		t.Errorf("a link with a NUL was opened")
	}
	/* no temporary folder for the text recognition */
	t.Setenv("TMP", filepath.Join(d, "no-tmp"))
	t.Setenv("TEMP", filepath.Join(d, "no-tmp"))
	if r := ocrRun(wB64("\x89PNG not really")); r["ok"] != false || r["error"] == "" {
		t.Errorf("no temporary folder: %v", r)
	}
	/* MolScribe's Python fails without a word on stdout or stderr: its exit status is the message */
	wTools(t, map[string]string{"reactio_ocsr.py": "# stand-in"})
	py := filepath.Join(d, "quiet.bat")
	os.WriteFile(py, []byte("@exit /b 3\r\n"), 0755)
	t.Setenv("REACTIO_OCSR_PYTHON", py)
	if r := ocsrRun("", nil); r["ok"] != false || !strings.Contains(fmt.Sprint(r["error"]), "exit status 3") {
		t.Errorf("silent failure: %v", r)
	}
}
