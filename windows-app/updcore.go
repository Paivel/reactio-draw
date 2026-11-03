package main

// Update (Info → Check for updates, then Update): only when the person asks. The newest release is looked up on
// GitHub, its archive downloaded, checked against the SHA-256 GitHub gives for it, unpacked into a folder of its own,
// and only then put over this installation, file by file, so that a failure part way puts the old files back.
// The same file is in windows-app and linux-app.

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	relAPI    = "https://api.github.com/repos/Paivel/reactio-draw/releases/latest"
	relPrefix = "https://github.com/Paivel/reactio-draw/releases/download/"
	oldSuffix = ".rd-old"
)

type relAsset struct {
	Name   string `json:"name"`
	Size   int64  `json:"size"`
	Digest string `json:"digest"`
	URL    string `json:"browser_download_url"`
}

type relInfo struct {
	Tag    string     `json:"tag_name"`
	Assets []relAsset `json:"assets"`
}

var upd struct {
	busy    bool
	restart bool // the new files are in place: the program starts again when its window closes
}

func latestRelease() (*relInfo, error) {
	c := &http.Client{Timeout: 30 * time.Second}
	req, _ := http.NewRequest("GET", relAPI, nil)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "ReactioDraw")
	res, err := c.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub answered %d", res.StatusCode)
	}
	var r relInfo
	if err := json.NewDecoder(io.LimitReader(res.Body, 4<<20)).Decode(&r); err != nil {
		return nil, err
	}
	return &r, nil
}

func (r *relInfo) asset(name string) *relAsset {
	for i := range r.Assets {
		if r.Assets[i].Name == name {
			return &r.Assets[i]
		}
	}
	return nil
}

// download saves an asset to dst and checks its SHA-256; progress gets the part done (0…1)
func download(a *relAsset, dst string, progress func(float64)) error {
	if !strings.HasPrefix(a.URL, relPrefix) {
		return errors.New("unexpected download address")
	}
	want := strings.TrimPrefix(strings.ToLower(a.Digest), "sha256:")
	if len(want) != 64 {
		return errors.New("GitHub gives no SHA-256 for " + a.Name + ": not installed")
	}
	if a.Size <= 0 || a.Size > 400<<20 {
		return errors.New("unexpected size of " + a.Name)
	}
	c := &http.Client{Timeout: 20 * time.Minute}
	req, _ := http.NewRequest("GET", a.URL, nil)
	req.Header.Set("User-Agent", "ReactioDraw")
	res, err := c.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return fmt.Errorf("download answered %d", res.StatusCode)
	}
	f, err := os.Create(dst)
	if err != nil {
		return err
	}
	h := sha256.New()
	var done int64
	last := time.Now()
	buf := make([]byte, 256<<10)
	body := io.LimitReader(res.Body, a.Size+1)
	for {
		n, rerr := body.Read(buf)
		if n > 0 {
			if _, werr := f.Write(buf[:n]); werr != nil {
				f.Close()
				return werr
			}
			h.Write(buf[:n])
			done += int64(n)
			if progress != nil && time.Since(last) > 300*time.Millisecond {
				last = time.Now()
				progress(float64(done) / float64(a.Size))
			}
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			f.Close()
			return rerr
		}
	}
	if err := f.Close(); err != nil {
		return err
	}
	if done != a.Size {
		return errors.New("the download of " + a.Name + " is incomplete")
	}
	if hex.EncodeToString(h.Sum(nil)) != want {
		return errors.New("the download of " + a.Name + " does not match its SHA-256: not installed")
	}
	return nil
}

// a path inside an archive, without its top folder; "" for anything that would leave the folder
func cleanRel(name, top string) string {
	name = strings.ReplaceAll(name, `\`, "/")
	if !strings.HasPrefix(name, top+"/") {
		return ""
	}
	rel := strings.TrimPrefix(name, top+"/")
	if rel == "" || strings.HasPrefix(rel, "/") || strings.Contains(rel, ":") {
		return ""
	}
	for _, p := range strings.Split(rel, "/") {
		if p == ".." || p == "." || p == "" {
			return ""
		}
	}
	return rel
}

type placed struct{ target, old string }

// putFiles puts the unpacked files (staged path → target) in place: an existing file is first renamed to .rd-old
// (Windows lets a running program be renamed, not overwritten); any failure puts the old files back
func putFiles(files map[string]string, mode func(string) os.FileMode) error {
	var done []placed
	undo := func() {
		for i := len(done) - 1; i >= 0; i-- {
			os.Remove(done[i].target)
			if done[i].old != "" {
				os.Rename(done[i].old, done[i].target)
			}
		}
	}
	for src, dst := range files {
		os.MkdirAll(filepath.Dir(dst), 0755)
		p := placed{target: dst}
		if _, err := os.Stat(dst); err == nil {
			p.old = dst + oldSuffix
			os.Remove(p.old)
			if err := os.Rename(dst, p.old); err != nil {
				undo()
				return fmt.Errorf("%s is in use: %v", filepath.Base(dst), err)
			}
		}
		done = append(done, p)
		if err := copyFile(src, dst, mode(dst)); err != nil {
			undo()
			return fmt.Errorf("could not write %s: %v", filepath.Base(dst), err)
		}
	}
	return nil
}

func copyFile(src, dst string, m os.FileMode) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, m)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

// the .rd-old files of an earlier update, removed on the next start (a file still in use stays for the next time)
func cleanOld(root string) {
	if root == "" {
		return
	}
	filepath.WalkDir(root, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() && p != root && strings.Count(strings.TrimPrefix(p, root), string(os.PathSeparator)) > 3 {
			return filepath.SkipDir
		}
		if !d.IsDir() && strings.HasSuffix(p, oldSuffix) {
			os.Remove(p)
		}
		return nil
	})
}

// the page shows how far the download is
func updProgress(part float64) {
	js := fmt.Sprintf("window.__rdUpdProgress&&window.__rdUpdProgress(%.3f)", part)
	dispatch(func() { evalJS(js) })
}
