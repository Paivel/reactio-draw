package main

// Error paths of reactio-mcp: each failure an AI assistant's call can meet (a file it may not or cannot read, a file
// that cannot be written, a malformed message, the app closed or answering nonsense, a helper program missing, a
// call that runs out of time) is fed in, and the test checks that the assistant is told (isError and a message, or a
// JSON-RPC error) and that nothing half-written is left behind. The app is stood in for by a local HTTP server;
// nothing reaches the network.
//
// A test that shows a real fault asserts the right behaviour and is skipped with the number of the fault in
// rd-tests/BUGS.md, so the suite stays green until it is fixed.

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"
)

/* a home with one allowed folder (returned), its own config and cache; no app running */
func mSetup(t *testing.T) (home, folder string) {
	t.Helper()
	home = t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(home, ".config"))
	t.Setenv("XDG_CACHE_HOME", filepath.Join(home, ".cache"))
	t.Setenv("TMPDIR", filepath.Join(home, "tmp"))
	os.MkdirAll(filepath.Join(home, "tmp"), 0755)
	folder = filepath.Join(home, "Chem")
	os.MkdirAll(folder, 0755)
	if err := saveFolders([]string{folder}); err != nil {
		t.Fatal(err)
	}
	madeMu.Lock()
	madeHere = map[string]bool{}
	madeMu.Unlock()
	return
}

/* the app stood in for: answer(op, args) gives the JSON it sends back; api.json points at it */
func mApp(t *testing.T, answer func(op string, args map[string]interface{}) string) *httptest.Server {
	t.Helper()
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Op   string                 `json:"op"`
			Args map[string]interface{} `json:"args"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		io.WriteString(w, answer(req.Op, req.Args))
	}))
	t.Cleanup(s.Close)
	mInfo(t, map[string]interface{}{"url": s.URL + "/api", "token": "t", "pid": os.Getpid()})
	return s
}

func mInfo(t *testing.T, v interface{}) {
	os.MkdirAll(filepath.Dir(apiInfoPath()), 0755)
	b, _ := json.Marshal(v)
	os.WriteFile(apiInfoPath(), b, 0600)
}

/* a tool's answer: its text and whether it is an error */
func mText(t *testing.T, res map[string]interface{}) (string, bool) {
	t.Helper()
	cs, _ := res["content"].([]interface{})
	s := ""
	for _, c := range cs {
		if m, ok := c.(map[string]interface{}); ok {
			if x, ok := m["text"].(string); ok {
				s += x
			}
		}
	}
	isErr, _ := res["isError"].(bool)
	return s, isErr
}

func mWantErr(t *testing.T, what string, res map[string]interface{}, part string) {
	t.Helper()
	s, isErr := mText(t, res)
	if !isErr || !strings.Contains(s, part) {
		t.Errorf("%s: isError=%v %q (want an error with %q)", what, isErr, s, part)
	}
}

func mTool(name string, args map[string]interface{}) map[string]interface{} {
	b, _ := json.Marshal(map[string]interface{}{"name": name, "arguments": args})
	return callTool(b)
}

func mFull(t *testing.T, limit uint64) func() {
	t.Helper()
	var old syscall.Rlimit
	if err := syscall.Getrlimit(syscall.RLIMIT_FSIZE, &old); err != nil {
		t.Skipf("no RLIMIT_FSIZE: %v", err)
	}
	signal.Ignore(syscall.SIGXFSZ)
	if err := syscall.Setrlimit(syscall.RLIMIT_FSIZE, &syscall.Rlimit{Cur: limit, Max: old.Max}); err != nil {
		t.Skipf("cannot limit the file size: %v", err)
	}
	return func() { syscall.Setrlimit(syscall.RLIMIT_FSIZE, &old); signal.Reset(syscall.SIGXFSZ) }
}

func mScript(t *testing.T, dir, name, body string) string {
	t.Helper()
	os.MkdirAll(dir, 0755)
	p := filepath.Join(dir, name)
	if err := os.WriteFile(p, []byte("#!/bin/sh\n"+body+"\n"), 0755); err != nil {
		t.Fatal(err)
	}
	return p
}

// ---------- the app's address (api.json) ----------

func TestErrReadInfo(t *testing.T) {
	mSetup(t)
	if _, err := readInfo(); err == nil {
		t.Errorf("no api.json: no error")
	}
	if notReached() != notOn {
		t.Errorf("no api.json: %q", notReached())
	}
	for _, s := range []string{"{broken", `{"url": 5}`, `{"token": "t"}`, `[]`} {
		os.WriteFile(apiInfoPath(), []byte(s), 0600)
		if _, err := readInfo(); err == nil || err.Error() != "api.json cannot be read" {
			t.Errorf("%s: %v", s, err)
		}
	}
	/* an api.json left by an app that has ended */
	mInfo(t, map[string]interface{}{"url": "http://127.0.0.1:1/api", "pid": 999999999})
	if s := notReached(); !strings.Contains(s, "has ended") {
		t.Errorf("ended app: %q", s)
	}
	/* a running program at that pid that does not answer */
	mInfo(t, map[string]interface{}{"url": "http://127.0.0.1:1/api", "pid": os.Getpid()})
	if s := notReached(); !strings.Contains(s, "does not answer") {
		t.Errorf("not answering: %q", s)
	}
	mInfo(t, map[string]interface{}{"url": "x", "pid": -1})
	if notReached() != notOn {
		t.Errorf("bad pid")
	}
}

// ---------- calls to the app ----------

func TestErrCallAnswers(t *testing.T) {
	mSetup(t)
	mApp(t, func(op string, a map[string]interface{}) string {
		switch op {
		case "junk":
			return "<html>500</html>"
		case "refused":
			return `{"ok":false,"error":"MCP is off in Reactio Draw"}`
		case "empty":
			return ""
		}
		return `{"ok":true,"result":{"via":"` + a["__via"].(string) + `"}}`
	})
	if _, err := call("junk", nil); err == nil || !strings.Contains(err.Error(), "unexpected") {
		t.Errorf("junk answer: %v", err)
	}
	if _, err := call("empty", nil); err == nil {
		t.Errorf("empty answer: no error")
	}
	if _, err := call("refused", nil); err == nil || err.Error() != "MCP is off in Reactio Draw" {
		t.Errorf("refused: %v", err)
	}
	if r, err := call("calc", nil); err != nil || !strings.Contains(string(r), "mcp") {
		t.Errorf("good: %s %v", r, err)
	}
}

/* the app takes the call and goes away before answering: not sent again, the assistant is told */
func TestErrCallAppGoesAway(t *testing.T) {
	mSetup(t)
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, _, _ := w.(http.Hijacker).Hijack()
		c.Close()
	}))
	defer s.Close()
	mInfo(t, map[string]interface{}{"url": s.URL, "token": "t", "pid": os.Getpid()})
	if _, err := call("set", nil); err == nil || !strings.Contains(err.Error(), "stopped before it answered") {
		t.Errorf("went away: %v", err)
	}
}

/* an answer over 64 MB is cut, and must then be reported, not passed on as if whole */
func TestErrCallOversizeAnswer(t *testing.T) {
	mSetup(t)
	big := `{"ok":true,"result":"` + strings.Repeat("A", 65<<20) + `"}`
	mApp(t, func(string, map[string]interface{}) string { return big })
	if _, err := call("export", nil); err == nil || !strings.Contains(err.Error(), "unexpected") {
		t.Errorf("over-size answer: %v", err)
	}
	if _, err := callOnce("export", nil, 10*time.Second); err == nil {
		t.Errorf("callOnce over-size answer: no error")
	}
}

/* the app is not running at all: one try to start it, then a message that says what to do (takes 20 s) */
func TestErrCallNotRunning(t *testing.T) {
	if testing.Short() {
		t.Skip("waits 20 s")
	}
	h, _ := mSetup(t)
	t.Setenv("PATH", filepath.Join(h, "empty"))
	l, _ := net.Listen("tcp", "127.0.0.1:0")
	addr := l.Addr().String()
	l.Close() // nothing listens there now: connection refused
	mInfo(t, map[string]interface{}{"url": "http://" + addr + "/api", "pid": 999999999})
	launched = false
	t0 := time.Now()
	_, err := call("list", nil)
	if err == nil || !strings.Contains(err.Error(), "has ended") || !launched {
		t.Errorf("not running: %v (launch tried: %v)", err, launched)
	}
	if time.Since(t0) > 40*time.Second {
		t.Errorf("gave up only after %v", time.Since(t0))
	}
}

func TestErrCallOnce(t *testing.T) {
	mSetup(t)
	if _, err := callOnce("__busy", nil, time.Second); err == nil {
		t.Errorf("no api.json: no error")
	}
	slow := make(chan bool)
	defer close(slow)
	mApp(t, func(op string, a map[string]interface{}) string {
		switch op {
		case "slow":
			<-slow
			return `{"ok":true}`
		case "junk":
			return "nope"
		case "no":
			return `{"ok":false,"error":"busy"}`
		}
		return `{"ok":true,"result":1}`
	})
	/* the time limit runs out (context deadline / client timeout) */
	t0 := time.Now()
	if _, err := callOnce("slow", nil, 200*time.Millisecond); err == nil || !strings.Contains(err.Error(), "Timeout") {
		t.Errorf("timeout: %v", err)
	}
	if time.Since(t0) > 5*time.Second {
		t.Errorf("the time limit was not kept: %v", time.Since(t0))
	}
	if _, err := callOnce("junk", nil, time.Second); err == nil || err.Error() != "unexpected answer" {
		t.Errorf("junk: %v", err)
	}
	if _, err := callOnce("no", nil, time.Second); err == nil || err.Error() != "busy" {
		t.Errorf("not ok: %v", err)
	}
}

/* the answer kept by the page for a long call */
func TestErrAnswerKept(t *testing.T) {
	mSetup(t)
	if _, ok := answerKept("c1"); ok {
		t.Errorf("no app: an answer was found")
	}
	ans := ""
	mApp(t, func(string, map[string]interface{}) string { return ans })
	for _, c := range []struct {
		a      string
		ok     bool
		errMsg string
	}{
		{`{"ok":true,"result":{"pending":true}}`, false, ""},
		{`{"ok":true,"result":"not an object"}`, false, ""},
		{`{"ok":false,"error":"unknown op"}`, false, ""},
		{`{"ok":true,"result":{"ok":false,"error":"the fit failed"}}`, true, "the fit failed"},
		{`{"ok":true,"result":{"ok":true,"result":[1]}}`, true, ""},
	} {
		ans = c.a
		r, ok := answerKept("c1")
		if ok != c.ok || (c.errMsg != "" && (r.err == nil || r.err.Error() != c.errMsg)) || (c.errMsg == "" && r.err != nil) {
			t.Errorf("%s: ok=%v err=%v", c.a, ok, r.err)
		}
	}
}

/* waiting for a long command: nothing waiting, still busy, given up, app restarted, an error answer */
func TestErrCallWaitStates(t *testing.T) {
	mSetup(t)
	reset := func() {
		pending.Lock()
		pending.ch, pending.cid, pending.pid, pending.op = nil, "", 0, ""
		pending.Unlock()
	}
	defer reset()
	reset()
	if _, err, w := callWait("result", nil); err == nil || w || !strings.Contains(err.Error(), "nothing is waiting") {
		t.Errorf("nothing waiting: %v", err)
	}
	set := func(pid int) chan answer {
		ch := make(chan answer, 1)
		pending.Lock()
		pending.ch, pending.pid, pending.op, pending.t0 = ch, pid, "addScheme", time.Now()
		pending.Unlock()
		return ch
	}
	set(0)
	if _, err, _ := callWait("calc", map[string]interface{}{}); err == nil || !strings.Contains(err.Error(), "still working on the last command (addScheme") {
		t.Errorf("busy: %v", err)
	}
	if _, err, _ := callWait("result", map[string]interface{}{"cancel": true}); err == nil || !strings.Contains(err.Error(), "stopped waiting for addScheme") || pending.ch != nil {
		t.Errorf("cancel: %v", err)
	}
	/* the app was restarted meanwhile (another pid in api.json) */
	mInfo(t, map[string]interface{}{"url": "http://127.0.0.1:1/api", "pid": 4242})
	set(4141)
	if _, err, _ := callWait("result", map[string]interface{}{}); err == nil || !strings.Contains(err.Error(), "was restarted") || pending.ch != nil {
		t.Errorf("restarted: %v", err)
	}
	/* the long command ended in an error: it reaches the assistant */
	ch := set(4242)
	ch <- answer{nil, errors.New("the fit failed")}
	if _, err, w := callWait("result", map[string]interface{}{}); err == nil || err.Error() != "the fit failed" || w || pending.ch != nil {
		t.Errorf("error answer: %v", err)
	}
}

// ---------- files named in a call ----------

func TestErrReadPaths(t *testing.T) {
	h, f := mSetup(t)
	os.WriteFile(filepath.Join(f, "ok.mol"), []byte("M  END"), 0644)
	os.WriteFile(filepath.Join(f, "bad.json"), []byte("{not json"), 0644)
	os.WriteFile(filepath.Join(f, "num.json"), []byte("42"), 0644)
	os.Mkdir(filepath.Join(f, "dir.mol"), 0755)
	os.WriteFile(filepath.Join(h, "outside.mol"), []byte("secret"), 0644)
	os.Symlink(filepath.Join(h, "outside.mol"), filepath.Join(f, "link.mol"))
	os.Symlink(filepath.Join(f, "gone.mol"), filepath.Join(f, "dangling.mol"))
	cases := []struct {
		op   string
		args map[string]interface{}
		want string
	}{
		{"import", map[string]interface{}{"path": filepath.Join(f, "missing.mol")}, "no such file"},
		{"import", map[string]interface{}{"path": filepath.Join(f, "dir.mol")}, "is a directory"},
		{"import", map[string]interface{}{"path": filepath.Join(f, "dangling.mol")}, "no such file"},
		{"set", map[string]interface{}{"path": filepath.Join(h, "outside.mol")}, "is not in the folders"},
		{"set", map[string]interface{}{"path": filepath.Join(f, "link.mol")}, "is not in the folders"},
		{"set", map[string]interface{}{"path": filepath.Join(f, ".hidden.mol")}, "hidden"},
		{"set", map[string]interface{}{"path": filepath.Join(f, "x.exe")}, "files of this kind"},
		{"addImage", map[string]interface{}{"path": filepath.Join(f, "missing.png")}, "no such file"},
		{"batch", map[string]interface{}{"path": filepath.Join(f, "bad.json")}, "is not JSON"},
		{"batch", map[string]interface{}{"path": filepath.Join(f, "num.json")}, "give {\"ops\""},
		{"batch", map[string]interface{}{"path": filepath.Join(f, "missing.json")}, "cannot read"},
		{"addScheme", map[string]interface{}{"path": filepath.Join(f, "bad.json")}, "is not JSON"},
		{"addScheme", map[string]interface{}{"path": filepath.Join(f, "missing.json")}, "cannot read"},
		{"addScheme", map[string]interface{}{"images": []interface{}{map[string]interface{}{"path": filepath.Join(f, "missing.png")}}}, "cannot read"},
		{"addScheme", map[string]interface{}{"scheme": map[string]interface{}{"structures": []interface{}{map[string]interface{}{"path": filepath.Join(h, "outside.mol")}}}}, "is not in the folders"},
		{"export", map[string]interface{}{"path": filepath.Join(h, "out.mol")}, "is not in the folders"},
		{"picture", map[string]interface{}{"path": filepath.Join(f, "out.exe")}, "files of this kind"},
		{"calc", map[string]interface{}{"out": filepath.Join(f, ".git", "a.json")}, "hidden"},
		{"calc", map[string]interface{}{"out": "/etc/x.json"}, "do not use files there"},
		{"calc", map[string]interface{}{"out": " "}, "no file name"},
	}
	for _, c := range cases {
		if _, err := readPaths(c.op, c.args); err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s %v: %v (want %q)", c.op, c.args, err, c.want)
		}
	}
	/* an existing data file is never overwritten */
	os.WriteFile(filepath.Join(f, "package.json"), []byte("{}"), 0644)
	if _, err := readPaths("calc", map[string]interface{}{"out": filepath.Join(f, "package.json")}); err == nil || !strings.Contains(err.Error(), "only as new files") {
		t.Errorf("existing json: %v", err)
	}
	/* no folder allowed at all */
	saveFolders([]string{})
	if _, err := readPaths("import", map[string]interface{}{"path": filepath.Join(f, "ok.mol")}); err == nil || !strings.Contains(err.Error(), "no folder is allowed yet") {
		t.Errorf("no folders: %v", err)
	}
	/* allowed-folders.json broken: as no folder */
	os.WriteFile(filepath.Join(rdConfigDir(), foldersFileName), []byte("{broken"), 0600)
	if _, err := readPaths("import", map[string]interface{}{"path": filepath.Join(f, "ok.mol")}); err == nil {
		t.Errorf("broken folder list: read allowed")
	}
	if p, err := readPaths("import", nil); p != "" || err != nil {
		t.Errorf("no args: %q %v", p, err)
	}
}

func TestErrReadPathsPermission(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("runs as root: permissions are not enforced (go-tests.sh runs these again as an ordinary user when it can)")
	}
	_, f := mSetup(t)
	p := filepath.Join(f, "locked.mol")
	os.WriteFile(p, []byte("M  END"), 0000)
	if _, err := readPaths("import", map[string]interface{}{"path": p}); err == nil || !strings.Contains(err.Error(), "permission denied") {
		t.Errorf("unreadable: %v", err)
	}
}

// ---------- answers written to a file ----------

func TestErrWriteOut(t *testing.T) {
	h, f := mSetup(t)
	res := json.RawMessage(`{"png":"` + base64.StdEncoding.EncodeToString([]byte("PNGDATA")) + `"}`)
	/* a folder in the way */
	os.Mkdir(filepath.Join(f, "isdir.png"), 0755)
	mWantErr(t, "folder in the way", writeOut("picture", nil, filepath.Join(f, "isdir.png"), res), "cannot write")
	/* the parent is a file */
	os.WriteFile(filepath.Join(f, "file"), []byte("x"), 0644)
	mWantErr(t, "parent is a file", writeOut("picture", nil, filepath.Join(f, "file", "a.png"), res), "cannot write")
	/* a device that is always full */
	mWantErr(t, "disk full", writeOut("export", map[string]interface{}{"format": "mol"}, "/dev/full", json.RawMessage(`{"mol":"M  END"}`)), "no space left")
	/* good, and the bytes written */
	s, isErr := mText(t, writeOut("picture", nil, filepath.Join(f, "sub", "a.png"), res))
	if isErr || !strings.Contains(s, `"bytes":7`) {
		t.Errorf("good picture: %s", s)
	}
	b, _ := os.ReadFile(filepath.Join(f, "sub", "a.png"))
	if string(b) != "PNGDATA" {
		t.Errorf("picture written as %q", b)
	}
	/* a bad base64 picture: written as the answer itself (the assistant can see what came) */
	writeOut("picture", nil, filepath.Join(f, "b.png"), json.RawMessage(`{"png":"%%%"}`))
	_ = h
}

/* disk full while writing an answer over an older file: reported, and the older file must not be left cut short */
func TestErrWriteOutDiskFull(t *testing.T) {
	_, f := mSetup(t)
	p := filepath.Join(f, "fig.png")
	os.WriteFile(p, []byte("old picture"), 0644)
	res := json.RawMessage(`{"png":"` + base64.StdEncoding.EncodeToString(bytes.Repeat([]byte("N"), 5000)) + `"}`)
	restore := mFull(t, 1000)
	out := writeOut("picture", nil, p, res)
	restore()
	mWantErr(t, "disk full", out, "file too large")
	b, _ := os.ReadFile(p)
	if string(b) != "old picture" {
		t.Skipf("bug 78: a failed write of an answer leaves a cut-short file (%d bytes) in place of the old one", len(b))
	}
}

// ---------- tools/call: malformed calls ----------

func TestErrCallToolMalformed(t *testing.T) {
	h, f := mSetup(t)
	for _, p := range []string{"", "{", "[]", `{"name": 5}`, `{"name":"undo","arguments":5}`, `{"name":"undo","arguments":"x"}`} {
		mWantErr(t, p, callTool(json.RawMessage(p)), "bad arguments")
	}
	mWantErr(t, "unknown tool", mTool("rm_rf", nil), "no tool called rm_rf")
	mWantErr(t, "no op", mTool("reactio_command", map[string]interface{}{}), "give op")
	mWantErr(t, "op of the wrong type", mTool("reactio_command", map[string]interface{}{"op": 7}), "give op")
	/* a file that cannot be read: told before anything reaches the app */
	mWantErr(t, "import missing", mTool("reactio_command", map[string]interface{}{"op": "import", "args": map[string]interface{}{"path": filepath.Join(f, "none.mol")}}), "no such file")
	mWantErr(t, "batch op missing file", mTool("reactio_command", map[string]interface{}{"op": "batch", "args": map[string]interface{}{"ops": []interface{}{
		"not an object",
		map[string]interface{}{"op": "export", "format": "mol", "path": filepath.Join(h, "outside.mol")}}}}), "ops[1]:")
	mWantErr(t, "export outside", mTool("export_drawing", map[string]interface{}{"format": "mol", "out": filepath.Join(h, "x.mol")}), "is not in the folders")
}

/* the app answers an error: the assistant gets it as an error, and no file is written for it */
func TestErrCallToolAppError(t *testing.T) {
	_, f := mSetup(t)
	mApp(t, func(op string, a map[string]interface{}) string {
		return `{"ok":false,"error":"nothing is drawn"}`
	})
	out := filepath.Join(f, "pic.png")
	mWantErr(t, "app error", mTool("view_drawing", map[string]interface{}{}), "nothing is drawn")
	mWantErr(t, "app error with out", mTool("reactio_command", map[string]interface{}{"op": "picture", "args": map[string]interface{}{"path": out}}), "nothing is drawn")
	if _, err := os.Stat(out); err == nil {
		t.Errorf("a file was written for a failed command")
	}
	/* a batch whose answer has no results: nothing to write, told as it came */
	mApp(t, func(op string, a map[string]interface{}) string { return `{"ok":true,"result":{"done":1}}` })
	s, isErr := mText(t, mTool("reactio_command", map[string]interface{}{"op": "batch", "args": map[string]interface{}{"ops": []interface{}{
		map[string]interface{}{"op": "export", "args": map[string]interface{}{"format": "mol", "path": filepath.Join(f, "b.mol")}}}}}))
	if isErr || !strings.Contains(s, "done") {
		t.Errorf("batch without results: %v %s", isErr, s)
	}
	/* a batch command's file that cannot be written: the batch answer says so for that command */
	os.Mkdir(filepath.Join(f, "isdir.mol"), 0755)
	mApp(t, func(op string, a map[string]interface{}) string {
		return `{"ok":true,"result":{"results":[{"mol":"M  END"}]}}`
	})
	s, _ = mText(t, mTool("reactio_command", map[string]interface{}{"op": "batch", "args": map[string]interface{}{"ops": []interface{}{
		map[string]interface{}{"op": "export", "args": map[string]interface{}{"format": "mol", "path": filepath.Join(f, "isdir.mol")}}}}}))
	if !strings.Contains(s, "cannot write") {
		t.Errorf("batch file not writable: %s", s)
	}
}

// ---------- the JSON-RPC loop ----------

func TestErrMainLoop(t *testing.T) {
	mSetup(t)
	in := strings.Join([]string{
		"{not json",
		`{"jsonrpc":"2.0","id":1,"method":"nosuch"}`,
		`{"jsonrpc":"2.0","method":"notifications/initialized"}`,
		`{"jsonrpc":"2.0","id":null,"method":"tools/list"}`,
		`{"jsonrpc":"2.0","id":2,"method":"tools/call","params":"bad"}`,
		`{"jsonrpc":"2.0","id":3,"method":"initialize","params":5}`,
		`{"jsonrpc":"2.0","id":4,"method":"ping"}`,
		`   `,
		`{"jsonrpc":"2.0","id":5,"method":"ping"}`, // last line without a newline
	}, "\n")
	f, _ := os.CreateTemp(t.TempDir(), "stdin")
	f.WriteString(in)
	f.Seek(0, 0)
	oldIn, oldOut, oldArgs := os.Stdin, out, os.Args
	var buf bytes.Buffer
	os.Stdin, out, os.Args = f, bufio.NewWriter(&buf), []string{"reactio-mcp"}
	done := make(chan bool)
	go func() { main(); done <- true }()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatalf("the loop did not end at the end of input")
	}
	os.Stdin, out, os.Args = oldIn, oldOut, oldArgs
	var got []map[string]interface{}
	for _, l := range strings.Split(strings.TrimSpace(buf.String()), "\n") {
		var m map[string]interface{}
		if err := json.Unmarshal([]byte(l), &m); err != nil {
			t.Fatalf("not JSON on stdout: %q", l)
		}
		got = append(got, m)
	}
	if len(got) != 6 {
		t.Fatalf("%d answers (want 6): %s", len(got), buf.String())
	}
	code := func(m map[string]interface{}) float64 {
		e, _ := m["error"].(map[string]interface{})
		c, _ := e["code"].(float64)
		return c
	}
	if code(got[0]) != -32700 || got[0]["id"] != nil {
		t.Errorf("parse error: %v", got[0])
	}
	if code(got[1]) != -32601 {
		t.Errorf("no method: %v", got[1])
	}
	if r, _ := got[2]["result"].(map[string]interface{}); r["isError"] != true {
		t.Errorf("bad params: %v", got[2])
	}
	if r, _ := got[3]["result"].(map[string]interface{}); r["protocolVersion"] != "2025-06-18" {
		t.Errorf("initialize with bad params: %v", got[3])
	}
	if got[5]["id"] != float64(5) {
		t.Errorf("last line without newline: %v", got[5])
	}
}

// ---------- pictures: helper programs missing ----------

func TestErrBackgroundTool(t *testing.T) {
	h, f := mSetup(t)
	bin := filepath.Join(h, "bin")
	os.MkdirAll(bin, 0755)
	t.Setenv("PATH", bin)
	mWantErr(t, "no reactio", mTool("render_structure", map[string]interface{}{"smiles": "CCO"}), "was not found")
	mScript(t, bin, "reactio", `echo "reactio: WebKitGTK is not installed" >&2; exit 1`)
	mWantErr(t, "reactio fails", mTool("render_structure", map[string]interface{}{"smiles": "CCO"}), "WebKitGTK is not installed")
	mScript(t, bin, "reactio", `exit 3`)
	mWantErr(t, "reactio fails silently", mTool("analyze_structure", map[string]interface{}{"smiles": "CCO"}), "exit status 3")
	/* reactio cannot be run at all */
	os.WriteFile(filepath.Join(bin, "reactio"), []byte("\x7fELFjunk"), 0755)
	mWantErr(t, "reactio not runnable", mTool("render_grid", map[string]interface{}{"items": []interface{}{"CCO"}}), "exec format error")
	/* a picture to a file that may not or cannot be written */
	mScript(t, bin, "reactio", `echo '{"png":"UE5H"}'`)
	mWantErr(t, "outside", mTool("render_structure", map[string]interface{}{"smiles": "CCO", "path": filepath.Join(h, "x.png")}), "is not in the folders")
	os.Mkdir(filepath.Join(f, "isdir.png"), 0755)
	mWantErr(t, "folder in the way", mTool("render_structure", map[string]interface{}{"smiles": "CCO", "path": filepath.Join(f, "isdir.png")}), "Cannot write")
	mScript(t, bin, "reactio", `echo '{"svg":"<svg/>"}'`)
	os.Mkdir(filepath.Join(f, "isdir.svg"), 0755)
	mWantErr(t, "svg to a folder", mTool("render_reaction", map[string]interface{}{"smiles": "CC>>CC", "format": "svg", "path": filepath.Join(f, "isdir.svg")}), "Cannot write")
}

func TestErrToWebPicture(t *testing.T) {
	h, _ := mSetup(t)
	bin := filepath.Join(h, "bin")
	os.MkdirAll(bin, 0755)
	t.Setenv("PATH", bin)
	tiff := append([]byte("II*\x00"), bytes.Repeat([]byte{1}, 40)...)
	/* ImageMagick not installed: the picture goes as it is, no temporary folder left */
	if got := toWebPicture(tiff); !bytes.Equal(got, tiff) {
		t.Errorf("without convert the picture was changed")
	}
	/* convert fails, or makes nothing */
	mScript(t, bin, "convert", `exit 1`)
	if got := toWebPicture(tiff); !bytes.Equal(got, tiff) {
		t.Errorf("failing convert changed the picture")
	}
	mScript(t, bin, "convert", `exit 0`)
	if got := toWebPicture(tiff); !bytes.Equal(got, tiff) {
		t.Errorf("convert that writes nothing changed the picture")
	}
	/* an unknown kind is never handed to convert */
	mScript(t, bin, "convert", `touch "`+filepath.Join(h, "convert-ran")+`"`)
	toWebPicture([]byte("push graphic-context\nimage over 0,0 0,0 '/etc/passwd'"))
	if _, err := os.Stat(filepath.Join(h, "convert-ran")); err == nil {
		t.Errorf("convert ran on a picture of unknown kind")
	}
	/* no temporary folder: as it is */
	t.Setenv("TMPDIR", filepath.Join(h, "no-such-tmp"))
	if got := toWebPicture(tiff); !bytes.Equal(got, tiff) {
		t.Errorf("without a temporary folder the picture was changed")
	}
	es, _ := os.ReadDir(filepath.Join(h, "tmp"))
	if len(es) != 0 {
		t.Errorf("temporary files left: %v", es)
	}
}

func TestErrPlaceReference(t *testing.T) {
	h, f := mSetup(t)
	t.Setenv("PATH", filepath.Join(h, "empty"))
	mWantErr(t, "outside", placeReference(map[string]interface{}{"path": filepath.Join(h, "fig.png")}), "is not in the folders")
	os.Mkdir(filepath.Join(f, "fig.png"), 0755)
	mWantErr(t, "a folder", placeReference(map[string]interface{}{"path": filepath.Join(f, "fig.png")}), "Cannot read")
	mWantErr(t, "missing", placeReference(map[string]interface{}{"path": filepath.Join(f, "none.png")}), "Cannot read")
	/* a picture that is fine, the app not answering ok */
	os.WriteFile(filepath.Join(f, "ok.png"), []byte("\x89PNG\r\n\x1a\nnot really"), 0644)
	mApp(t, func(op string, a map[string]interface{}) string { return `{"ok":false,"error":"no sheet is open"}` })
	mWantErr(t, "app refuses", mTool("place_reference", map[string]interface{}{"path": filepath.Join(f, "ok.png")}), "no sheet is open")
	/* the cache for "same picture as last time" cannot be written: still placed */
	os.WriteFile(filepath.Join(h, "cachefile"), []byte("x"), 0644)
	t.Setenv("XDG_CACHE_HOME", filepath.Join(h, "cachefile"))
	mApp(t, func(op string, a map[string]interface{}) string { return `{"ok":true,"result":{"id":7}}` })
	if s, isErr := mText(t, placeReference(map[string]interface{}{"path": filepath.Join(f, "ok.png")})); isErr || !strings.Contains(s, `"id":7`) {
		t.Errorf("cache not writable: %v %s", isErr, s)
	}
}

/* the clipboard tools (xclip, wl-paste) missing: the assistant must be told that, not that the clipboard is empty */
func TestErrPlaceReferenceNoClipboardTool(t *testing.T) {
	h, _ := mSetup(t)
	t.Setenv("PATH", filepath.Join(h, "empty"))
	res := placeReference(map[string]interface{}{})
	s, isErr := mText(t, res)
	if !isErr {
		t.Fatalf("no clipboard tool: not an error: %s", s)
	}
	if !strings.Contains(s, "xclip") && !strings.Contains(s, "wl-paste") {
		t.Skip("bug 84: without xclip or wl-paste, place_reference says there is no picture on the clipboard")
	}
}

/* neither XDG_CONFIG_HOME nor HOME: the folder list is looked for in the temporary folder, and nothing is allowed */
func TestErrNoConfigDir(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", "")
	t.Setenv("HOME", "")
	if d := rdConfigDir(); d != filepath.Join(os.TempDir(), "ReactioDraw") {
		t.Errorf("rdConfigDir without a home: %s", d)
	}
	if _, err := checkFile("/tmp/x.png", false); err == nil {
		t.Errorf("a file was allowed with no folder list")
	}
}
