package main

// Which files the AI assistants (reactio-mcp) may read and write: only inside the folders set in Reactio Draw (Info →
// API → Folders for AI assistants). The list is kept in allowed-folders.json beside api.json; the app writes it when the
// user adds a folder in its own folder dialog or takes one off. Nothing that comes in through the API or MCP can change
// it. Without the file the list is empty: nothing can be read or written until the user adds a folder. The command
// line (reactio) is the user's own and is not limited by it.
//
// Never, even inside those folders: hidden files and folders (.ssh, .zshrc, .git…), Reactio Draw's own settings, the
// Library of the Mac and the AppData of Windows; and only the file kinds a chemical drawing uses.
// (This file is the same in mcp/, windows-app/ and linux-app/.)

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

const foldersFileName = "allowed-folders.json"

func rdConfigDir() string {
	d, err := os.UserConfigDir()
	if err != nil {
		d = os.TempDir()
	}
	return filepath.Join(d, "ReactioDraw")
}

// no folder until the user adds one
func defaultFolders() []string { return []string{} }

// allowedFolders: the list the user set (empty: nothing allowed)
func allowedFolders() []string {
	var v struct {
		Folders []string `json:"folders"`
	}
	b, err := os.ReadFile(filepath.Join(rdConfigDir(), foldersFileName))
	if err != nil || json.Unmarshal(b, &v) != nil || v.Folders == nil {
		return defaultFolders()
	}
	return v.Folders
}

// saveFolders: only the app calls it, after its own folder dialog (or when the user takes a folder off)
func saveFolders(list []string) error {
	os.MkdirAll(rdConfigDir(), 0700)
	b, _ := json.MarshalIndent(map[string]interface{}{"folders": list}, "", " ")
	return os.WriteFile(filepath.Join(rdConfigDir(), foldersFileName), b, 0600)
}

var readKinds = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".gif": true, ".heic": true, ".heif": true, ".tif": true,
	".tiff": true, ".bmp": true, ".svg": true, ".mol": true, ".sdf": true, ".sd": true, ".rxn": true, ".cdxml": true,
	".cdx": true, ".smi": true, ".smiles": true, ".json": true, ".reactio": true, ".txt": true, ".csv": true, ".tsv": true,
	".xyz": true, ".cif": true, ".mrv": true, ".pdb": true, ".inchi": true, ".docx": true,
}

var writeKinds = map[string]bool{
	".png": true, ".svg": true, ".pdf": true, ".emf": true, ".mol": true, ".sdf": true, ".rxn": true, ".cdxml": true,
	".cdx": true, ".smi": true, ".smiles": true, ".json": true, ".reactio": true, ".txt": true, ".csv": true, ".tsv": true,
	".xyz": true, ".cif": true, ".inchi": true, ".docx": true,
}

func samePathCase(p string) string {
	if runtime.GOOS == "windows" || runtime.GOOS == "darwin" {
		return strings.ToLower(p)
	}
	return p
}

// realPath: absolute, cleaned, with links followed (for a file not made yet: its nearest existing folder's)
func realPath(p string) string { return realPathN(p, 0) }

func realPathN(p string, depth int) string {
	if strings.HasPrefix(p, "~/") || strings.HasPrefix(p, `~\`) {
		h, _ := os.UserHomeDir()
		p = filepath.Join(h, p[2:])
	}
	if a, err := filepath.Abs(p); err == nil {
		p = a
	}
	p = filepath.Clean(p)
	rest := ""
	q := p
	for i := 0; i < 64; i++ {
		if r, err := filepath.EvalSymlinks(q); err == nil {
			if rest != "" {
				return filepath.Join(r, rest)
			}
			return r
		}
		/* a link to a place that does not exist yet: followed all the same */
		if st, err := os.Lstat(q); err == nil && st.Mode()&os.ModeSymlink != 0 {
			if t, err := os.Readlink(q); err == nil {
				if !filepath.IsAbs(t) {
					t = filepath.Join(filepath.Dir(q), t)
				}
				if depth < 16 {
					return realPathN(filepath.Join(t, rest), depth+1)
				}
				return p
			}
		}
		d := filepath.Dir(q)
		if d == q {
			break
		}
		if rest == "" {
			rest = filepath.Base(q)
		} else {
			rest = filepath.Join(filepath.Base(q), rest)
		}
		q = d
	}
	return p
}

func inside(p, dir string) (string, bool) {
	rel, err := filepath.Rel(samePathCase(dir), samePathCase(p))
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return "", false
	}
	return rel, true
}

// checkFile answers the real path of a file the assistant may use, or why not
func checkFile(p string, write bool) (string, error) {
	if strings.TrimSpace(p) == "" {
		return "", fmt.Errorf("no file name")
	}
	r := realPath(p)
	kind := strings.ToLower(filepath.Ext(r))
	verb := "read"
	kinds := readKinds
	if write {
		verb, kinds = "written", writeKinds
	}
	if !kinds[kind] {
		return "", fmt.Errorf("%s: files of this kind (%q) are not %s by Reactio Draw's AI assistants", p, kind, verb)
	}
	h, _ := os.UserHomeDir()
	never := []string{rdConfigDir()}
	switch runtime.GOOS {
	case "darwin":
		never = append(never, filepath.Join(h, "Library"))
	case "windows":
		for _, e := range []string{"APPDATA", "LOCALAPPDATA", "ProgramData", "ProgramFiles", "ProgramFiles(x86)", "SystemRoot"} {
			if v := os.Getenv(e); v != "" {
				never = append(never, v)
			}
		}
	default:
		never = append(never, "/etc", "/usr", "/bin", "/sbin", "/var", "/proc", "/sys")
	}
	for _, n := range never {
		if _, ok := inside(r, realPath(n)); ok {
			return "", fmt.Errorf("%s: Reactio Draw's AI assistants do not use files there", p)
		}
	}
	folders := allowedFolders()
	for _, f := range folders {
		rel, ok := inside(r, realPath(f))
		if !ok {
			continue
		}
		for _, part := range strings.Split(rel, string(filepath.Separator)) {
			if strings.HasPrefix(part, ".") && part != "." {
				return "", fmt.Errorf("%s: hidden files and folders are not used", p)
			}
		}
		return r, nil
	}
	if len(folders) == 0 {
		return "", fmt.Errorf("%s: no folder is allowed yet; the user adds one in Reactio Draw: Info → API → Folders for AI assistants (only the user can)", p)
	}
	return "", fmt.Errorf("%s is not in the folders Reactio Draw lets AI assistants use (%s); the user can add a folder in Reactio Draw: Info → API → Folders for AI assistants", p, strings.Join(folders, ", "))
}
