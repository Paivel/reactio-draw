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
	"unicode"
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
		if filepath.Ext(q) == ".reactio" && filepath.Dir(q) == dir && (texStem(filepath.Base(q)) == stem || plainStem(filepath.Base(q)) == stem) {
			return true
		}
	}
	return false
}

var texBad = regexp.MustCompile(`[^A-Za-z0-9._-]+`)
var texLead = regexp.MustCompile(`^[._]+`)

// Cyrillic in Latin letters, accents dropped: the same table and rule as texStem in the page and in macapp/main.swift
const texLatinTable = "а a б b в v г g ґ g д d е e ё yo є ye ж zh з z и i і i ї yi й y к k л l м m н n о o п p р r с s т t у u ў u ф f х kh ц ts ч ch ш sh щ shch ъ - ы y ь - э e ю yu я ya à a á a â a ã a ä a å a ā a ă a ą a æ ae ç c ć c č c ď d đ d è e é e ê e ë e ē e ė e ę e ě e ğ g ì i í i î i ï i ī i ı i ł l ñ n ń n ň n ò o ó o ô o õ o ö o ø o ō o ő o œ oe ř r ś s š s ş s ß s ť t ù u ú u û u ü u ū u ů u ű u ý y ÿ y ź z ż z ž z"

var texLatin = func() map[rune]string {
	m := map[rune]string{}
	f := strings.Fields(texLatinTable)
	for i := 0; i+1 < len(f); i += 2 {
		m[[]rune(f[i])[0]] = f[i+1]
	}
	return m
}()

// the two letters of the table a name may hold decomposed, whose base letter alone would read differently
var texComposed = strings.NewReplacer("и\u0306", "й", "И\u0306", "Й", "е\u0308", "ё", "Е\u0308", "Ё", "і\u0308", "ї", "І\u0308", "Ї", "у\u0306", "ў", "У\u0306", "Ў")

func latinName(name string) string {
	var b strings.Builder
	for _, c := range texComposed.Replace(name) {
		if c >= 0x300 && c <= 0x36f {
			continue
		}
		low := unicode.ToLower(c)
		t, ok := texLatin[low]
		switch {
		case !ok:
			b.WriteRune(c)
		case t == "-":
		case c == low:
			b.WriteString(t)
		default:
			b.WriteString(strings.ToUpper(t[:1]) + t[1:])
		}
	}
	return b.String()
}

// a name as figures were called before the rule above: an existing figure keeps its files
func plainStem(name string) string {
	if i := strings.LastIndex(name, "."); i > 0 {
		name = name[:i]
	}
	s := texLead.ReplaceAllString(texBad.ReplaceAllString(name, "_"), "")
	if s == "" {
		return "figure"
	}
	return s
}

func texStem(name string) string { return plainStem(latinName(name)) }
