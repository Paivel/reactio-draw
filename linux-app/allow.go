package main

// The page may write only to files the user chose: in a Save or Open dialog, or by opening the file with the app
// (double-click, Open with, a file handed over by a second window). A path the page makes up is refused, so a
// document cannot make the app overwrite other files. The list is kept in allowed-paths.json beside the app's data,
// so a document restored after a restart can still be saved to its own file.

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
)

var allowMu sync.Mutex
var allowList []string

func allowFile() string { return filepath.Join(app.base, "allowed-paths.json") }

func normPath(p string) string {
	if a, err := filepath.Abs(p); err == nil {
		p = a
	}
	p = filepath.Clean(p)
	if runtime.GOOS == "windows" || runtime.GOOS == "darwin" {
		p = strings.ToLower(p)
	}
	return p
}

func loadAllowed() {
	if allowList != nil {
		return
	}
	allowList = []string{}
	if b, err := os.ReadFile(allowFile()); err == nil {
		json.Unmarshal(b, &allowList)
	}
}

func allowPath(p string) {
	if p == "" {
		return
	}
	allowMu.Lock()
	defer allowMu.Unlock()
	loadAllowed()
	n := normPath(p)
	out := []string{n}
	for _, q := range allowList {
		if q != n {
			out = append(out, q)
		}
	}
	if len(out) > 500 {
		out = out[:500]
	}
	allowList = out
	if b, err := json.Marshal(allowList); err == nil {
		os.MkdirAll(filepath.Dir(allowFile()), 0755)
		os.WriteFile(allowFile(), b, 0600)
	}
}

// the page may add .reactio (or .json) to a name chosen in Save as when the extension is not one it saves
func pathAllowed(p string) bool {
	allowMu.Lock()
	defer allowMu.Unlock()
	loadAllowed()
	n := normPath(p)
	for _, q := range allowList {
		if q == n || q+".json" == n || q+".reactio" == n {
			return true
		}
	}
	// Copy for LaTeX: the figure's .pdf and .tex beside a .reactio file the user chose, named after it (texStem in the page)
	ext := filepath.Ext(n)
	if ext != ".pdf" && ext != ".tex" {
		return false
	}
	dir, stem := filepath.Dir(n), strings.TrimSuffix(filepath.Base(n), ext)
	for _, q := range allowList {
		if filepath.Ext(q) == ".reactio" && filepath.Dir(q) == dir && texStem(filepath.Base(q)) == stem {
			return true
		}
	}
	return false
}

var texBad = regexp.MustCompile(`[^A-Za-z0-9._-]+`)
var texLead = regexp.MustCompile(`^[._]+`)

// a file name as LaTeX takes it: no extension, characters other than letters, digits . _ - as _, no leading . or _
func texStem(name string) string {
	if i := strings.LastIndex(name, "."); i > 0 {
		name = name[:i]
	}
	s := texLead.ReplaceAllString(texBad.ReplaceAllString(name, "_"), "")
	if s == "" {
		return "figure"
	}
	return s
}
