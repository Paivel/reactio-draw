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
		if err := saveFile(chosenTarget(p), b64(r.B64)); err != nil {
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
		if err := saveFile(r.Path, b64(r.B64)); err != nil {
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

// chosenTarget: a link chosen in the Save dialog is the user's choice: the file it points to is replaced (the link
// stays). Paths not chosen in a dialog are never resolved: saveFile replaces a link there, it does not write through it.
func chosenTarget(p string) string {
	if fi, err := os.Lstat(p); err == nil && fi.Mode()&os.ModeSymlink != 0 {
		if t, err := filepath.EvalSymlinks(p); err == nil {
			return t
		}
	}
	return p
}

// saveFile puts data in place of path in one step: written in full to a new temporary file beside it (writeNew) and
// flushed to the disk, then renamed over path. A write that fails (a full disk) leaves the old file whole and no
// temporary file behind; a link at path is replaced, never followed. A device or a pipe (/dev/stdout) is written in
// place.
func saveFile(path string, data []byte) error {
	if notAFile(path) {
		return writeInPlace(path, data)
	}
	tmp, err := writeNew(path, data)
	if err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp)
		return err
	}
	// the rename itself reaches the disk (best effort: not every file system lets a folder be synced)
	if d, err := os.Open(filepath.Dir(path)); err == nil {
		d.Sync()
		d.Close()
	}
	return nil
}

// notAFile: path is a device or a pipe, or a link to one (/dev/stdout): there is no file to replace, so it is written
// in place. A folder is not one (saving over a folder fails).
func notAFile(path string) bool {
	fi, err := os.Lstat(path)
	if err != nil || fi.Mode().IsRegular() {
		return false
	}
	if fi.Mode()&os.ModeSymlink != 0 {
		st, err := os.Stat(path)
		return err == nil && !st.Mode().IsRegular() && !st.IsDir()
	}
	return !fi.IsDir()
}

// writeInPlace writes over a device or a pipe (notAFile)
func writeInPlace(path string, data []byte) error {
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_TRUNC, 0)
	if err != nil {
		return err
	}
	_, err = f.Write(data)
	if err2 := f.Close(); err == nil {
		err = err2
	}
	return err
}

// writeNew writes data to a new temporary file beside path (created with O_EXCL and a random name, so a link left
// at a fixed temporary name is never followed), flushes it to the disk and returns that file's name. It gets the
// permissions of the file it is to replace (0644 for a new file)
func writeNew(path string, data []byte) (string, error) {
	mode := os.FileMode(0644)
	if fi, err := os.Lstat(path); err == nil && fi.Mode().IsRegular() {
		mode = fi.Mode().Perm()
	}
	f, err := os.CreateTemp(filepath.Dir(path), "."+filepath.Base(path)+".*.rdtmp")
	if err != nil {
		return "", err
	}
	tmp := f.Name()
	_, err = f.Write(data)
	if err == nil {
		err = f.Sync()
	}
	if err2 := f.Close(); err == nil {
		err = err2
	}
	if err == nil {
		err = os.Chmod(tmp, mode)
	}
	if err != nil {
		os.Remove(tmp)
		return "", err
	}
	return tmp, nil
}
