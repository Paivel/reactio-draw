package main

// Command line: "ReactioDraw.exe --cli <command> …" (reactio.exe beside the program) runs the page without showing
// a window. The files named on the command line are read here and handed to the page with the arguments; the page
// answers with cliDone {out, err, code, writes}, and only the path given after -o (or files inside that folder) is written.

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
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
	cliConsole()
	args := os.Args[2:]
	files := map[string]map[string]string{}
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
		if st, err := os.Stat(a); err == nil && !st.IsDir() && st.Size() < 64<<20 {
			if b, err := os.ReadFile(a); err == nil {
				files[a] = map[string]string{"name": filepath.Base(a), "b64": base64.StdEncoding.EncodeToString(b)}
			}
		}
	}
	j, _ := json.Marshal(map[string]interface{}{"argv": args, "files": files, "dirs": dirs})
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

func cliExit(code int) {
	namerStop()
	opsinStop()
	os.Exit(code)
}

/* ReactioDraw.exe is a window program: reactio.exe hands it pipes for the answer; started straight from a console
   window, it writes to that console instead */
func cliConsole() {
	if _, err := os.Stdout.Stat(); err == nil {
		return
	}
	if r, _, _ := kernel32.NewProc("AttachConsole").Call(^uintptr(0)); r == 0 { // ATTACH_PARENT_PROCESS
		return
	}
	if f, err := os.OpenFile("CONOUT$", os.O_WRONLY, 0); err == nil {
		os.Stdout, os.Stderr = f, f
	}
}
