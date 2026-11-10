package main

// What the page asks the app for (window.rdNative.call on the page side; the same messages as the Mac app).

import (
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

type request struct {
	ID   string `json:"id"`
	Cmd  string `json:"cmd"`
	Name string `json:"name"`
	B64  string `json:"b64"`
	Msg  string `json:"msg"`
	Path string `json:"path"`
	URL  string `json:"url"`
}

func reply(id string, v interface{}) {
	if id == "" || id == "x" {
		return
	}
	// an answer that cannot be written as JSON is still answered, with an error, so the page does not wait for ever
	b, err := json.Marshal(v)
	if err != nil {
		logf("could not write the reply: %v", err)
		b, _ = json.Marshal(map[string]interface{}{"ok": false, "err": "the app could not write its reply"})
	}
	args, _ := json.Marshal([]string{id, string(b)})
	evalJS("window.__rdReply&&window.__rdReply.apply(null," + string(args) + ")")
}

/* replies from other goroutines go through the GTK thread */
func replyLater(id string, v interface{}) { dispatch(func() { reply(id, v) }) }

func handle(s string) {
	var r request
	if err := json.Unmarshal([]byte(s), &r); err != nil {
		logf("bad message: %v", err)
		// a message with a field of the wrong kind still carries its id: answer it, so the page does not wait for ever
		reply(r.ID, map[string]interface{}{"ok": false, "err": "bad message"})
		return
	}
	b64 := func(t string) []byte { b, _ := base64.StdEncoding.DecodeString(t); return b }
	switch r.Cmd {
	case "save":
		name := r.Name
		if name == "" {
			name = appName
		}
		p := fileDialog(true, "Save", name)
		if p == "" {
			reply(r.ID, map[string]interface{}{"ok": false})
			return
		}
		if err := os.WriteFile(p, b64(r.B64), 0644); err != nil {
			reply(r.ID, map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		allowPath(p)
		reply(r.ID, map[string]interface{}{"ok": true, "path": p})
	case "open":
		p := fileDialog(false, "Open", "")
		b, err := os.ReadFile(p)
		if p == "" || err != nil {
			reply(r.ID, map[string]interface{}{"cancel": true})
			return
		}
		allowPath(p)
		reply(r.ID, map[string]interface{}{"name": filepath.Base(p), "path": p, "b64": base64.StdEncoding.EncodeToString(b)})
	case "saveAs":
		name := r.Name
		if name == "" {
			name = appName + ".reactio"
		}
		p := fileDialog(true, "Save as", name)
		allowPath(p)
		reply(r.ID, map[string]interface{}{"path": p})
	case "texHead":
		// whether the .tex or .pdf next to a chosen .reactio exists, and a .tex's first line, which says whether it is that drawing's figure
		line, exists := "", false
		lower := strings.ToLower(r.Path)
		if (strings.HasSuffix(lower, ".tex") || strings.HasSuffix(lower, ".pdf")) && pathAllowed(r.Path) {
			if _, err := os.Stat(r.Path); err == nil {
				exists = true
			}
			if strings.HasSuffix(lower, ".tex") {
				if data, err := os.ReadFile(r.Path); err == nil {
					line = strings.TrimRight(strings.SplitN(string(data), "\n", 2)[0], "\r")
				}
			}
		}
		reply(r.ID, map[string]interface{}{"line": line, "exists": exists})
	case "write":
		if r.Path == "" {
			reply(r.ID, map[string]interface{}{"ok": false, "err": "no file"})
			return
		}
		if !pathAllowed(r.Path) {
			logf("refused to write %s: not chosen by the user", r.Path)
			reply(r.ID, map[string]interface{}{"ok": false, "ask": true})
			return
		}
		tmp, err := writeNew(r.Path, b64(r.B64))
		if err != nil {
			reply(r.ID, map[string]interface{}{"ok": false, "err": err.Error()})
			return
		}
		if err := os.Rename(tmp, r.Path); err != nil {
			os.Remove(tmp)
			reply(r.ID, map[string]interface{}{"ok": false, "err": err.Error()})
			return
		}
		reply(r.ID, map[string]interface{}{"ok": true})
	case "update":
		// Info → Check for updates → Update: download, check and put the new version in place (update.go)
		if upd.busy || cliRequested() {
			reply(r.ID, map[string]interface{}{"ok": false, "err": "an update is already running"})
			return
		}
		upd.busy = true
		go func(id, tag string) {
			got, err := runUpdate(tag)
			dispatch(func() {
				upd.busy = false
				if err != nil {
					logf("update failed: %v", err)
					reply(id, map[string]interface{}{"ok": false, "err": err.Error()})
				} else {
					reply(id, map[string]interface{}{"ok": true, "tag": got, "restart": "quit"})
				}
			})
		}(r.ID, r.Name)
	case "quit":
		reply(r.ID, map[string]interface{}{"ok": true})
		app.quitOK = true
		gtk_widget_destroy(app.win)
	case "apiStart":
		// never from the command line: it runs beside the open app and must not take its api.json
		if cliRequested() {
			reply(r.ID, map[string]interface{}{"ok": false})
			return
		}
		/* the local API only with the AI add-on installed (reactio-mcp beside the program) */
		if !aiKitInstalled() {
			reply(r.ID, map[string]interface{}{"ok": false, "noKit": true})
			return
		}
		p := startLocalAPI()
		reply(r.ID, map[string]interface{}{"ok": p > 0, "port": p})
	case "aiKit":
		reply(r.ID, map[string]interface{}{"installed": aiKitInstalled()})
	case "apiStop":
		if !cliRequested() {
			stopLocalAPI()
		}
		reply(r.ID, map[string]interface{}{"ok": true})
	case "apiResult":
		apiDeliver(r.Name, r.Msg)
		reply(r.ID, map[string]interface{}{"ok": true})
	case "iupac":
		go func(id, smi string) {
			nm, code, msg := namerName(smi)
			if code != "" {
				replyLater(id, map[string]interface{}{"err": code, "msg": msg})
				return
			}
			replyLater(id, map[string]interface{}{"name": nm})
		}(r.ID, r.Name)
	case "opsin":
		go func(id, name string) {
			smi, code, msg := opsinName(name)
			if code != "" {
				replyLater(id, map[string]interface{}{"err": code, "msg": msg})
				return
			}
			replyLater(id, map[string]interface{}{"smiles": smi})
		}(r.ID, r.Name)
	case "aiFolders":
		reply(r.ID, map[string]interface{}{"folders": allowedFolders()})
	case "aiFolderAdd":
		if p := folderDialog("A folder the AI assistants may read and write"); p != "" {
			list := allowedFolders()
			has := false
			for _, q := range list {
				if q == p {
					has = true
				}
			}
			if !has {
				list = append(list, p)
				saveFolders(list)
			}
		}
		reply(r.ID, map[string]interface{}{"folders": allowedFolders()})
	case "aiFolderRemove":
		list := []string{}
		for _, q := range allowedFolders() {
			if q != r.Path {
				list = append(list, q)
			}
		}
		saveFolders(list)
		reply(r.ID, map[string]interface{}{"folders": allowedFolders()})
	case "cliDone":
		reply(r.ID, map[string]interface{}{"ok": true})
		cliDone(r.Msg)
	case "link":
		reply(r.ID, map[string]interface{}{"ok": openLink(r.URL)})
	case "log":
		logf("page: %s", r.Msg)
		reply(r.ID, map[string]interface{}{"ok": true})
	case "clipown":
		/* no Word objects on the Linux clipboard: the page pastes from its own clipboard data */
		reply(r.ID, map[string]interface{}{})
	default:
		reply(r.ID, map[string]interface{}{"ok": false})
	}
}

/* the AI add-on ("Reactio Draw — AI assistants") is installed: reactio-mcp lies beside the program. Without it the
   local API never starts and its settings are not shown */
func aiKitInstalled() bool {
	exe, err := os.Executable()
	if err != nil {
		return false
	}
	st, err := os.Stat(filepath.Join(filepath.Dir(exe), "reactio-mcp"))
	return err == nil && !st.IsDir()
}

// writeNew writes data to a new temporary file beside path (created with O_EXCL and a random name, so a link left
// at a fixed temporary name is never followed) and returns that file's name
func writeNew(path string, data []byte) (string, error) {
	f, err := os.CreateTemp(filepath.Dir(path), "."+filepath.Base(path)+".*.rdtmp")
	if err != nil {
		return "", err
	}
	tmp := f.Name()
	_, err = f.Write(data)
	if err2 := f.Close(); err == nil {
		err = err2
	}
	if err == nil {
		err = os.Chmod(tmp, 0644)
	}
	if err != nil {
		os.Remove(tmp)
		return "", err
	}
	return tmp, nil
}
