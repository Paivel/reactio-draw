package main

// Local API: scripts on this computer send commands to Reactio Draw over HTTP on 127.0.0.1 only.
// POST http://127.0.0.1:<port>/api with header X-Reactio-Token and a JSON body {"op":"calc","args":{"smiles":"CCO"}}.
// The port and token are written to %APPDATA%\ReactioDraw\api.json while the app runs; a web page cannot call it
// (it would need the token and a custom header, and no CORS headers are sent).

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

var apiMu sync.Mutex
var apiWait = map[string]chan string{}
var apiSeq int
var apiToken string
var apiLn net.Listener
var apiPort int

// the API runs only while the page asks for it (Settings: Local API), so by default nothing listens

func apiInfoPath() string {
	d, err := os.UserConfigDir()
	if err != nil {
		d = os.TempDir()
	}
	return filepath.Join(d, "ReactioDraw", "api.json")
}

func startLocalAPI() int {
	apiMu.Lock()
	if apiLn != nil {
		// already listening: write api.json again (another program may have replaced or removed it)
		p := apiPort
		writeAPIInfo(p)
		apiMu.Unlock()
		return p
	}
	apiMu.Unlock()
	b := make([]byte, 16)
	rand.Read(b)
	apiToken = hex.EncodeToString(b)
	var ln net.Listener
	var port int
	for p := 47615; p < 47630; p++ {
		l, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", p))
		if err == nil {
			ln, port = l, p
			break
		}
	}
	if ln == nil {
		logf("local API: no free port")
		return 0
	}
	writeAPIInfo(port)
	mux := http.NewServeMux()
	mux.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// only scripts on this computer: a request a browser sends for a web page carries an Origin header, and the
		// Host must be this address (so a site that points its own name at 127.0.0.1 is turned away too)
		if r.Header.Get("Origin") != "" || (r.Host != fmt.Sprintf("127.0.0.1:%d", port) && r.Host != fmt.Sprintf("localhost:%d", port)) {
			w.WriteHeader(403)
			w.Write([]byte(`{"ok":false,"error":"the local API answers scripts on this computer only (no browser requests)"}`))
			return
		}
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Reactio-Token")), []byte(apiToken)) != 1 {
			w.WriteHeader(403)
			w.Write([]byte(`{"ok":false,"error":"wrong or missing X-Reactio-Token (see api.json)"}`))
			return
		}
		var req struct {
			Op   string          `json:"op"`
			Args json.RawMessage `json:"args"`
		}
		if r.Method != "POST" {
			req.Op = "help"
		} else {
			body, _ := io.ReadAll(io.LimitReader(r.Body, 8<<20))
			if err := json.Unmarshal(body, &req); err != nil || req.Op == "" {
				w.WriteHeader(400)
				w.Write([]byte(`{"ok":false,"error":"send JSON like {\"op\":\"calc\",\"args\":{\"smiles\":\"CCO\"}}"}`))
				return
			}
		}
		if len(req.Args) == 0 {
			req.Args = json.RawMessage("{}")
		}
		apiMu.Lock()
		apiSeq++
		id := fmt.Sprintf("api%d", apiSeq)
		ch := make(chan string, 1)
		apiWait[id] = ch
		apiMu.Unlock()
		opj, _ := json.Marshal(req.Op)
		idj, _ := json.Marshal(id)
		js := "window.__rdApiCall&&window.__rdApiCall(" + string(idj) + "," + string(opj) + "," + string(req.Args) + ")"
		app.w.Dispatch(func() { app.w.Eval(js) })
		select {
		case out := <-ch:
			w.Write([]byte(out))
		case <-time.After(1800 * time.Second):
			w.WriteHeader(504)
			w.Write([]byte(`{"ok":false,"error":"timed out"}`))
		}
		apiMu.Lock()
		delete(apiWait, id)
		apiMu.Unlock()
	})
	apiMu.Lock()
	apiLn, apiPort = ln, port
	apiMu.Unlock()
	go http.Serve(ln, mux)
	logf("local API on 127.0.0.1:%d", port)
	return port
}

func apiDeliver(id, out string) {
	apiMu.Lock()
	ch := apiWait[id]
	apiMu.Unlock()
	if ch != nil {
		select {
		case ch <- out:
		default:
		}
	}
}

func stopLocalAPI() {
	apiMu.Lock()
	if apiLn != nil {
		apiLn.Close()
		apiLn = nil
	}
	apiMu.Unlock()
	// api.json goes only if it is this app's own
	var m struct {
		PID int `json:"pid"`
	}
	if b, err := os.ReadFile(apiInfoPath()); err == nil && json.Unmarshal(b, &m) == nil && m.PID != os.Getpid() {
		return
	}
	os.Remove(apiInfoPath())
}

func writeAPIInfo(port int) {
	info, _ := json.Marshal(map[string]interface{}{"port": port, "token": apiToken, "url": fmt.Sprintf("http://127.0.0.1:%d/api", port), "pid": os.Getpid()})
	os.MkdirAll(filepath.Dir(apiInfoPath()), 0755)
	os.WriteFile(apiInfoPath(), info, 0600)
}
