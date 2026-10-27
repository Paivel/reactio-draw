package main

// What the page asks the app for (window.rdNative.call on the page side).

import (
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf16"
	"unsafe"
)

type request struct {
	ID     string `json:"id"`
	Cmd    string `json:"cmd"`
	Name   string `json:"name"`
	B64    string `json:"b64"`
	Accept string `json:"accept"`
	KD     string `json:"kd"`
	PNG    string `json:"png"`
	EMF    string `json:"emf"`
	CDX    string `json:"cdx"`
	W      int32  `json:"w"`
	H      int32  `json:"h"`
	Final  bool   `json:"final"`
	Msg    string `json:"msg"`
	Path   string `json:"path"`
	URL    string `json:"url"`
}

func reply(id string, v interface{}) {
	if id == "" || id == "x" {
		return
	}
	b, _ := json.Marshal(v)
	js, _ := json.Marshal(string(b))
	idj, _ := json.Marshal(id)
	app.w.Eval("window.__rdReply&&window.__rdReply(" + string(idj) + "," + string(js) + ")")
}

func handle(s string) {
	var r request
	if err := json.Unmarshal([]byte(s), &r); err != nil {
		logf("bad message: %v", err)
		return
	}
	b64 := func(t string) []byte { b, _ := base64.StdEncoding.DecodeString(t); return b }
	switch r.Cmd {
	case "save":
		path := fileDialog(true, r.Name, "")
		if path == "" {
			reply(r.ID, map[string]interface{}{"ok": false})
			return
		}
		if err := os.WriteFile(path, b64(r.B64), 0644); err != nil {
			messageBox("Could not save "+path+":\n"+err.Error(), appName)
			reply(r.ID, map[string]interface{}{"ok": false})
			return
		}
		allowPath(path)
		reply(r.ID, map[string]interface{}{"ok": true, "path": path})
	case "open":
		path := fileDialog(false, "", r.Accept)
		if path == "" {
			reply(r.ID, map[string]interface{}{})
			return
		}
		b, err := os.ReadFile(path)
		if err != nil {
			messageBox("Could not open "+path+":\n"+err.Error(), appName)
			reply(r.ID, map[string]interface{}{})
			return
		}
		allowPath(path)
		reply(r.ID, map[string]interface{}{"name": filepath.Base(path), "path": path, "b64": base64.StdEncoding.EncodeToString(b)})
	case "saveAs":
		// Save as: the dialog only; the page then writes the file in the format the name asks for
		path := fileDialog(true, r.Name, "drawings")
		allowPath(path)
		reply(r.ID, map[string]interface{}{"path": path})
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
		// write next to the file first, then replace it, so a failed write never leaves half a file
		tmp := r.Path + ".reactio-tmp"
		if err := os.WriteFile(tmp, b64(r.B64), 0644); err != nil {
			reply(r.ID, map[string]interface{}{"ok": false, "err": err.Error()})
			return
		}
		if err := os.Rename(tmp, r.Path); err != nil {
			// another program may hold the file (an editor, OneDrive syncing it): try writing over it in place
			os.Remove(tmp)
			if err2 := os.WriteFile(r.Path, b64(r.B64), 0644); err2 != nil {
				logf("could not save %s: %v; %v", r.Path, err, err2)
				reply(r.ID, map[string]interface{}{"ok": false, "err": err2.Error(), "locked": true})
				return
			}
		}
		logf("saved %s", r.Path)
		reply(r.ID, map[string]interface{}{"ok": true})
	case "quit":
		reply(r.ID, map[string]interface{}{"ok": true})
		app.quitOK = true
		pPostMessageW.Call(app.hwnd, 0x0010, 0, 0) // WM_CLOSE
	case "clipole":
		if err := clipOle(app.hwnd, []byte(r.KD), b64(r.PNG), b64(r.EMF), b64(r.CDX), r.W, r.H); err != nil {
			reply(r.ID, map[string]interface{}{"ok": false, "err": err.Error()})
			return
		}
		reply(r.ID, map[string]interface{}{"ok": true})
	case "clipown":
		if b := clipOwn(app.hwnd); b != nil {
			reply(r.ID, map[string]interface{}{"b64": base64.StdEncoding.EncodeToString(b)})
			return
		}
		if c := clipCdx(app.hwnd); c != nil {
			reply(r.ID, map[string]interface{}{"cdx": base64.StdEncoding.EncodeToString(c)})
			return
		}
		if t := clipOwnTag(app.hwnd); t != "" {
			reply(r.ID, map[string]interface{}{"tag": t})
			return
		}
		reply(r.ID, map[string]interface{}{})
	case "embedSave":
		if app.embedding {
			embedUpdate([]byte(r.KD), b64(r.PNG), b64(r.EMF), r.W, r.H, r.Final)
		}
		reply(r.ID, map[string]interface{}{"ok": true})
	case "apiStart":
		p := startLocalAPI()
		reply(r.ID, map[string]interface{}{"ok": p > 0, "port": p})
	case "apiStop":
		stopLocalAPI()
		reply(r.ID, map[string]interface{}{"ok": true})
	case "apiResult":
		apiDeliver(r.Name, r.Msg)
		reply(r.ID, map[string]interface{}{"ok": true})
	case "iupac":
		go func(id, smi string) {
			nm, code, msg := namerName(smi)
			app.w.Dispatch(func() {
				if nm != "" {
					reply(id, map[string]interface{}{"name": nm})
				} else {
					reply(id, map[string]interface{}{"err": code, "msg": msg})
				}
			})
		}(r.ID, r.Name)
	case "opsin":
		// OPSIN may take a second to start: answer from a goroutine, back on the window thread
		go func(id, name string) {
			smi, code, msg := opsinName(name)
			app.w.Dispatch(func() {
				if smi != "" {
					reply(id, map[string]interface{}{"smiles": smi})
				} else {
					reply(id, map[string]interface{}{"err": code, "msg": msg})
				}
			})
		}(r.ID, r.Name)
	case "cliDone":
		cliDone(r.Msg)
	case "link":
		reply(r.ID, map[string]interface{}{"ok": openLink(r.URL)})
	case "log":
		logf("page: %s", r.Msg)
	case "embedClose":
		reply(r.ID, map[string]interface{}{"ok": true})
		if app.embedding {
			finishClose()
		}
	default:
		reply(r.ID, map[string]interface{}{"ok": false, "err": "unknown command " + r.Cmd})
	}
}

// ---------- Open / Save dialogs (comdlg32) ----------

type openfilename struct {
	lStructSize       uint32
	hwndOwner         uintptr
	hInstance         uintptr
	lpstrFilter       *uint16
	lpstrCustomFilter *uint16
	nMaxCustFilter    uint32
	nFilterIndex      uint32
	lpstrFile         *uint16
	nMaxFile          uint32
	lpstrFileTitle    *uint16
	nMaxFileTitle     uint32
	lpstrInitialDir   *uint16
	lpstrTitle        *uint16
	Flags             uint32
	nFileOffset       uint16
	nFileExtension    uint16
	lpstrDefExt       *uint16
	lCustData         uintptr
	lpfnHook          uintptr
	lpTemplateName    *uint16
	pvReserved        uintptr
	dwReserved        uint32
	FlagsEx           uint32
}

func multi(parts ...string) *uint16 {
	u := utf16.Encode([]rune(strings.Join(parts, "\x00") + "\x00\x00"))
	return &u[0]
}

func fileDialog(save bool, name, accept string) string {
	buf := make([]uint16, 4096)
	copy(buf, utf16.Encode([]rune(name)))
	var filter *uint16
	var defExt *uint16
	filterIndex := uint32(1)
	if save && accept == "drawings" {
		ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(name), "."))
		kinds := [][3]string{{"reactio", "Reactio Draw document", "*.reactio"}, {"json", "Reactio Draw document, older name", "*.json"}, {"cdxml", "CDXML drawing", "*.cdxml"}, {"cdx", "CDX drawing", "*.cdx"},
			{"mol", "Molfile (structures only)", "*.mol"}, {"sdf", "SDF (structures only)", "*.sdf"}, {"rxn", "Reaction (RXN)", "*.rxn"}, {"smi", "SMILES", "*.smi"}, {"xyz", "XYZ (3D, structures only)", "*.xyz"}}
		var parts []string
		idx := 1
		for i, k := range kinds {
			parts = append(parts, k[1]+" ("+k[2]+")", k[2])
			if k[0] == ext {
				idx = i + 1
			}
		}
		filter = multi(parts...)
		if ext == "" {
			ext = "reactio"
		}
		defExt = u16(ext)
		buf2 := make([]uint16, 4096)
		copy(buf2, utf16.Encode([]rune(name)))
		buf = buf2
		_ = idx
		filterIndex = uint32(idx)
	} else if save {
		ext := strings.TrimPrefix(filepath.Ext(name), ".")
		if ext != "" {
			filter = multi(strings.ToUpper(ext)+" file", "*."+ext, "All files", "*.*")
			defExt = u16(ext)
		} else {
			filter = multi("All files", "*.*")
		}
	} else if strings.HasPrefix(accept, "image/") {
		filter = multi("Pictures", "*.png;*.jpg;*.jpeg;*.gif;*.bmp;*.webp;*.svg;*.tif;*.tiff", "All files", "*.*")
	} else if accept != "" {
		var pats []string
		for _, e := range strings.Split(accept, ",") {
			e = strings.TrimSpace(e)
			if strings.HasPrefix(e, ".") {
				pats = append(pats, "*"+e)
			}
		}
		filter = multi("Drawings", strings.Join(pats, ";"), "All files", "*.*")
	} else {
		filter = multi("All files", "*.*")
	}
	ofn := openfilename{
		hwndOwner:    app.hwnd,
		lpstrFilter:  filter,
		nFilterIndex: filterIndex,
		lpstrFile:    &buf[0],
		nMaxFile:     uint32(len(buf)),
		lpstrDefExt:  defExt,
	}
	ofn.lStructSize = uint32(unsafe.Sizeof(ofn))
	var r uintptr
	if save {
		ofn.Flags = 0x2 | 0x800 | 0x8 // OVERWRITEPROMPT | PATHMUSTEXIST | NOCHANGEDIR
		r, _, _ = pGetSaveFileNameW.Call(uintptr(unsafe.Pointer(&ofn)))
	} else {
		ofn.Flags = 0x1000 | 0x800 | 0x8 // FILEMUSTEXIST | PATHMUSTEXIST | NOCHANGEDIR
		r, _, _ = pGetOpenFileNameW.Call(uintptr(unsafe.Pointer(&ofn)))
	}
	if r == 0 {
		return ""
	}
	n := 0
	for n < len(buf) && buf[n] != 0 {
		n++
	}
	return string(utf16.Decode(buf[:n]))
}
