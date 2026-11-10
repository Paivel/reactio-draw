package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCheckFile(t *testing.T) {
	h := t.TempDir()
	t.Setenv("HOME", h)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(h, ".config"))
	for _, d := range []string{"Documents", "Downloads", "Other", "Documents/.git"} {
		os.MkdirAll(filepath.Join(h, d), 0755)
	}
	os.Symlink(filepath.Join(h, ".config"), filepath.Join(h, "Documents", "lnk"))
	ok := func(p string, w bool) bool {
		_, err := checkFile(p, w)
		if err != nil {
			t.Log(err)
		}
		return err == nil
	}
	saveFolders([]string{filepath.Join(h, "Documents"), filepath.Join(h, "Downloads")})
	cases := []struct {
		p       string
		w, want bool
	}{
		{"~/Documents/a.png", false, true},
		{"~/Documents/sub/out.svg", true, true},
		{"~/Downloads/x.cdxml", false, true},
		{"~/Other/a.png", false, false},
		{"~/Documents/.git/a.json", false, false},
		{"~/Documents/a.sh", true, false},
		{"~/.zshrc", true, false},
		{"~/Documents/../.ssh/id_rsa.txt", false, false},
		{"~/Documents/lnk/ReactioDraw/allowed-folders.json", true, false},
	}
	for _, c := range cases {
		if got := ok(c.p, c.w); got != c.want {
			t.Errorf("%s write=%v: got %v want %v", c.p, c.w, got, c.want)
		}
	}
	/* plain data files: new ones only, or again one this server made */
	os.WriteFile(filepath.Join(h, "Documents", "package.json"), []byte("{}"), 0644)
	if ok("~/Documents/package.json", true) || !ok("~/Documents/package.json", false) {
		t.Errorf("an existing .json was writable, or not readable")
	}
	if !ok("~/Documents/answer.json", true) {
		t.Errorf("a new .json was not writable")
	}
	os.WriteFile(filepath.Join(h, "Documents", "answer.json"), []byte("{}"), 0644)
	if !ok("~/Documents/answer.json", true) {
		t.Errorf("a .json made here was not writable again")
	}
	saveFolders([]string{filepath.Join(h, "Other")})
	if !ok("~/Other/a.png", false) || ok("~/Documents/a.png", false) {
		t.Errorf("saved list not used")
	}
}
