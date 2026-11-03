package main

// Update on Windows: the archive for this processor (x64 or ARM), and the AI-assistants add-on when it is installed,
// put over the folder the program runs from; the program then starts again when its window closes.

import (
	"archive/zip"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"golang.org/x/sys/windows"
)

func dispatch(f func()) { app.w.Dispatch(f) }
func evalJS(s string)    { app.w.Eval(s) }

func updArch() string {
	if runtime.GOARCH == "arm64" {
		return "ARM"
	}
	return "x64"
}

func updAssetName() string { return "ReactioDraw-Windows-" + updArch() + ".zip" }

// the folders of this installation: the program's own (Files) and the one above it, when it is the unpacked download
func updRoots() (files, top string) {
	exe, err := os.Executable()
	if err != nil {
		return "", ""
	}
	if e2, err := filepath.EvalSymlinks(exe); err == nil {
		exe = e2
	}
	files = filepath.Dir(exe)
	if strings.EqualFold(filepath.Base(files), "Files") {
		up := filepath.Dir(files)
		if _, err := os.Stat(filepath.Join(up, "Install Reactio Draw.cmd")); err == nil {
			top = up
		}
	}
	return files, top
}

// unzip puts each file of the archive's top folder into stage and says where it goes
func unzipStaged(zipPath, topName, stage string, place func(rel string) string, files map[string]string) error {
	z, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer z.Close()
	n := 0
	for _, f := range z.File {
		if f.FileInfo().IsDir() {
			continue
		}
		rel := cleanRel(f.Name, topName)
		if rel == "" {
			continue
		}
		dst := place(rel)
		if dst == "" {
			continue
		}
		src := filepath.Join(stage, filepath.FromSlash(rel))
		os.MkdirAll(filepath.Dir(src), 0755)
		r, err := f.Open()
		if err != nil {
			return err
		}
		out, err := os.Create(src)
		if err != nil {
			r.Close()
			return err
		}
		_, err = io.Copy(out, io.LimitReader(r, 500<<20))
		r.Close()
		if e2 := out.Close(); err == nil {
			err = e2
		}
		if err != nil {
			return err
		}
		files[src] = dst
		n++
	}
	if n == 0 {
		return errors.New("the archive has none of the program's files")
	}
	return nil
}

func runUpdate(tag string) (string, error) {
	filesDir, top := updRoots()
	if filesDir == "" {
		return "", errors.New("the program's folder is unknown")
	}
	rel, err := latestRelease()
	if err != nil {
		return "", err
	}
	if tag != "" && rel.Tag != tag {
		return "", errors.New("the newest version changed meanwhile (" + rel.Tag + "): check again")
	}
	main := rel.asset(updAssetName())
	if main == nil {
		return "", errors.New(updAssetName() + " is not in release " + rel.Tag)
	}
	var kit *relAsset
	if aiKitInstalled() {
		kit = rel.asset("ReactioDraw-Windows-" + updArch() + "-AI-assistants.zip")
	}
	work := filepath.Join(app.base, "update")
	os.RemoveAll(work)
	if err := os.MkdirAll(work, 0755); err != nil {
		return "", err
	}
	total := float64(main.Size)
	if kit != nil {
		total += float64(kit.Size)
	}
	zMain := filepath.Join(work, main.Name)
	if err := download(main, zMain, func(p float64) { updProgress(p * float64(main.Size) / total) }); err != nil {
		return "", err
	}
	files := map[string]string{}
	err = unzipStaged(zMain, "Reactio Draw", filepath.Join(work, "main"), func(r string) string {
		if strings.HasPrefix(r, "Files/") {
			return filepath.Join(filesDir, filepath.FromSlash(strings.TrimPrefix(r, "Files/")))
		}
		if top == "" {
			return "" // only the program's own folder is known: the documentation beside it stays as it is
		}
		dst := filepath.Join(top, filepath.FromSlash(r))
		if strings.HasSuffix(strings.ToLower(r), ".reactio") {
			if _, err := os.Stat(dst); err == nil {
				return "" // a drawing that came with the program may have been changed: kept
			}
		}
		return dst
	}, files)
	if err != nil {
		return "", err
	}
	if kit != nil {
		zKit := filepath.Join(work, kit.Name)
		if err := download(kit, zKit, func(p float64) { updProgress((float64(main.Size) + p*float64(kit.Size)) / total) }); err != nil {
			return "", err
		}
		// the add-on: only its files that are installed beside the program
		err = unzipStaged(zKit, "Reactio Draw - AI assistants", filepath.Join(work, "kit"), func(r string) string {
			if !strings.HasPrefix(r, "Files/") || strings.Contains(strings.TrimPrefix(r, "Files/"), "/") {
				return ""
			}
			dst := filepath.Join(filesDir, strings.TrimPrefix(r, "Files/"))
			if _, err := os.Stat(dst); err != nil {
				return ""
			}
			return dst
		}, files)
		if err != nil {
			return "", err
		}
	}
	updProgress(1)
	if err := putFiles(files, func(string) os.FileMode { return 0644 }); err != nil {
		return "", err
	}
	os.RemoveAll(work)
	logf("update: %s put in place (%d files)", rel.Tag, len(files))
	upd.restart = true
	return rel.Tag, nil
}

// after the window closes: the new program starts and waits until this one has gone
func restartAfterUpdate() {
	if !upd.restart {
		return
	}
	exe, err := os.Executable()
	if err != nil {
		return
	}
	if err := exec.Command(exe, "/after-update="+strconv.Itoa(os.Getpid())).Start(); err != nil {
		logf("update: could not start again: %v", err)
	}
}

// started by restartAfterUpdate: waits (at most half a minute) for the old program to end, then removes its old files
func waitAfterUpdate() {
	for i, a := range os.Args {
		if !strings.HasPrefix(strings.ToLower(a), "/after-update=") {
			continue
		}
		os.Args = append(os.Args[:i:i], os.Args[i+1:]...)
		if pid, err := strconv.Atoi(a[len("/after-update="):]); err == nil && pid > 0 {
			if h, err := windows.OpenProcess(windows.SYNCHRONIZE, false, uint32(pid)); err == nil {
				windows.WaitForSingleObject(h, 30000)
				windows.CloseHandle(h)
			}
		}
		break
	}
	files, top := updRoots()
	if top != "" {
		cleanOld(top)
	} else {
		cleanOld(files)
	}
}
