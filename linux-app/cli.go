package main

// Command line: "ReactioDraw --cli <command> …" (the reactio script beside the program) runs the page without showing
// a window. The files named on the command line are read here and handed to the page with the arguments; the page
// answers with cliDone {out, err, code, writes}, and only the path given after -o (or files inside that folder) is written.

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var cli struct {
	on  bool
	out string // the -o path, absolute
}

func cliRequested() bool { return len(os.Args) > 1 && os.Args[1] == "--cli" }

/* the script that gives the page its arguments and the files they name */
func cliScript() string {
	cli.on = true
	args := os.Args[2:]
	files := map[string]map[string]string{}
	fileErrs := map[string]string{}
	dirs := []string{}
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "-o" || a == "--output" {
			if i+1 < len(args) {
				cli.out, _ = filepath.Abs(args[i+1])
				if st, err := os.Stat(args[i+1]); err == nil && st.IsDir() {
					dirs = append(dirs, args[i+1])
				}
			}
			i++
			continue
		}
		// an argument that is no file (a SMILES, a name) is left to the page; a file that is there but cannot be
		// opened is reported by the page with its reason (it would say "no such file")
		if st, err := os.Stat(a); (err == nil && !st.IsDir()) || errors.Is(err, fs.ErrPermission) {
			if b, why := argFile(a); why == "" {
				files[a] = map[string]string{"name": filepath.Base(a), "b64": base64.StdEncoding.EncodeToString(b)}
			} else {
				fileErrs[a] = why
			}
		}
	}
	j, _ := json.Marshal(map[string]interface{}{"argv": args, "files": files, "dirs": dirs, "fileErrs": fileErrs})
	go func() {
		time.Sleep(10 * time.Minute)
		fmt.Fprintln(os.Stderr, "reactio: no answer after 10 minutes")
		cliExit(1)
	}()
	return "window.__rdCli=" + string(j) + ";"
}

/* the page's answer: write the files, print the text, quit with its exit code */
func cliDone(msg string) {
	var r struct {
		Out, Err string
		Code     int
		Writes   []struct{ Path, B64 string }
	}
	if err := json.Unmarshal([]byte(msg), &r); err != nil {
		fmt.Fprintln(os.Stderr, "reactio: bad answer from the page")
		cliExit(1)
	}
	for _, w := range r.Writes {
		p, _ := filepath.Abs(w.Path)
		rel, err := filepath.Rel(cli.out, p)
		if cli.out == "" || err != nil || strings.HasPrefix(rel, "..") || filepath.IsAbs(rel) {
			r.Err += "reactio: not written (outside -o): " + w.Path + "\n"
			r.Code = 1
			continue
		}
		b, _ := base64.StdEncoding.DecodeString(w.B64)
		os.MkdirAll(filepath.Dir(p), 0755)
		if err := saveFile(p, b); err != nil {
			r.Err += "reactio: " + err.Error() + "\n"
			r.Code = 1
		}
	}
	os.Stdout.WriteString(r.Out)
	os.Stderr.WriteString(r.Err)
	cliExit(r.Code)
}

// argFile reads a file named on the command line or opened with the app (at most 64 MB); when it cannot, the reason
// for the user ("too large (70 MB, at most 64)", "cannot be read: permission denied")
func argFile(a string) ([]byte, string) {
	st, err := os.Stat(a)
	if err != nil {
		return nil, "cannot be read: " + errReason(err)
	}
	if st.IsDir() {
		return nil, "is a folder, not a file"
	}
	if st.Size() >= 64<<20 {
		return nil, fmt.Sprintf("too large (%d MB, at most 64)", st.Size()>>20)
	}
	b, err := os.ReadFile(a)
	if err != nil {
		return nil, "cannot be read: " + errReason(err)
	}
	return b, ""
}

func cliExit(code int) {
	namerStop()
	opsinStop()
	os.Exit(code)
}
