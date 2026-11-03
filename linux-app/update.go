package main

// Update on Linux: the archive for this processor (x64 or ARM), and the AI-assistants add-on when it is installed,
// put over the folder the program runs from; the program then starts again when its window closes.

import (
	"archive/tar"
	"compress/gzip"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

func updArch() string {
	if runtime.GOARCH == "arm64" {
		return "ARM"
	}
	return "x64"
}

func updAssetName() string { return "ReactioDraw-Linux-" + updArch() + ".tar.gz" }

func updRoot() string {
	exe, err := os.Executable()
	if err != nil {
		return ""
	}
	if e2, err := filepath.EvalSymlinks(exe); err == nil {
		exe = e2
	}
	return filepath.Dir(exe)
}

// untar puts each file of the archive's top folder into stage and says where it goes (and with which mode)
func untarStaged(tgz, topName, stage string, place func(rel string) string, files map[string]string, modes map[string]os.FileMode) error {
	f, err := os.Open(tgz)
	if err != nil {
		return err
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return err
	}
	tr := tar.NewReader(gz)
	n := 0
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if h.Typeflag != tar.TypeReg {
			continue
		}
		rel := cleanRel(h.Name, topName)
		if rel == "" {
			continue
		}
		dst := place(rel)
		if dst == "" {
			continue
		}
		src := filepath.Join(stage, filepath.FromSlash(rel))
		os.MkdirAll(filepath.Dir(src), 0755)
		out, err := os.Create(src)
		if err != nil {
			return err
		}
		_, err = io.Copy(out, io.LimitReader(tr, 500<<20))
		if e2 := out.Close(); err == nil {
			err = e2
		}
		if err != nil {
			return err
		}
		files[src] = dst
		m := os.FileMode(0644)
		if h.FileInfo().Mode()&0111 != 0 {
			m = 0755
		}
		modes[dst] = m
		n++
	}
	if n == 0 {
		return errors.New("the archive has none of the program's files")
	}
	return nil
}

func runUpdate(tag string) (string, error) {
	root := updRoot()
	if root == "" {
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
		kit = rel.asset("ReactioDraw-Linux-" + updArch() + "-AI-assistants.tar.gz")
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
	tMain := filepath.Join(work, main.Name)
	if err := download(main, tMain, func(p float64) { updProgress(p * float64(main.Size) / total) }); err != nil {
		return "", err
	}
	files, modes := map[string]string{}, map[string]os.FileMode{}
	err = untarStaged(tMain, "Reactio Draw", filepath.Join(work, "main"), func(r string) string {
		dst := filepath.Join(root, filepath.FromSlash(r))
		if strings.HasSuffix(strings.ToLower(r), ".reactio") {
			if _, err := os.Stat(dst); err == nil {
				return "" // a drawing that came with the program may have been changed: kept
			}
		}
		return dst
	}, files, modes)
	if err != nil {
		return "", err
	}
	if kit != nil {
		tKit := filepath.Join(work, kit.Name)
		if err := download(kit, tKit, func(p float64) { updProgress((float64(main.Size) + p*float64(kit.Size)) / total) }); err != nil {
			return "", err
		}
		m := "reactio-mcp-x64"
		if updArch() == "ARM" {
			m = "reactio-mcp-arm64"
		}
		err = untarStaged(tKit, "Reactio Draw - AI assistants", filepath.Join(work, "kit"), func(r string) string {
			if r == "Files/"+m {
				return filepath.Join(root, "reactio-mcp")
			}
			return ""
		}, files, modes)
		if err != nil {
			return "", err
		}
		modes[filepath.Join(root, "reactio-mcp")] = 0755
	}
	updProgress(1)
	if err := putFiles(files, func(d string) os.FileMode {
		if m, ok := modes[d]; ok {
			return m
		}
		return 0644
	}); err != nil {
		return "", err
	}
	os.RemoveAll(work)
	logf("update: %s put in place (%d files)", rel.Tag, len(files))
	upd.restart = true
	return rel.Tag, nil
}

// after the window closes: the new program starts (it waits until this one has gone)
func restartAfterUpdate() {
	if !upd.restart {
		return
	}
	exe, err := os.Executable()
	if err != nil {
		return
	}
	cmd := exec.Command(exe, "--after-update="+strconv.Itoa(os.Getpid()))
	if err := cmd.Start(); err != nil {
		logf("update: could not start again: %v", err)
	}
}

func waitAfterUpdate() {
	for i, a := range os.Args {
		if !strings.HasPrefix(a, "--after-update=") {
			continue
		}
		os.Args = append(os.Args[:i:i], os.Args[i+1:]...)
		if pid, err := strconv.Atoi(a[len("--after-update="):]); err == nil && pid > 0 {
			for k := 0; k < 300; k++ {
				if _, err := os.Stat("/proc/" + strconv.Itoa(pid)); err != nil {
					break
				}
				time.Sleep(100 * time.Millisecond)
			}
		}
		break
	}
	cleanOld(updRoot())
}
