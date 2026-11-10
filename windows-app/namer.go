package main

// Structure → name with openclatura (MIT, https://github.com/lamalab-org/openclatura), run unchanged in the computer's own
// Python through a small helper (tools\reactio_name.py beside the exe): it stays running, one SMILES line in, one JSON line out.

import (
	"bufio"
	"encoding/json"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)


var namerMu sync.Mutex
var namerCmd *exec.Cmd
var namerIn *bufio.Writer
var namerOut *bufio.Reader
var namerErr = &tailBuf{}
var namerPy string

func pythonCandidates() [][]string {
	c := [][]string{}
	if p := os.Getenv("REACTIO_PYTHON"); p != "" {
		c = append(c, []string{p})
	}
	if p, err := exec.LookPath("py.exe"); err == nil {
		c = append(c, []string{p, "-3"})
	}
	if p, err := exec.LookPath("python.exe"); err == nil && !strings.Contains(strings.ToLower(p), "windowsapps") {
		c = append(c, []string{p})
	}
	for _, root := range []string{filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "Python"), os.Getenv("ProgramFiles")} {
		if root == "" {
			continue
		}
		m, _ := filepath.Glob(filepath.Join(root, "Python3*", "python.exe"))
		for i := len(m) - 1; i >= 0; i-- { // newest first
			c = append(c, []string{m[i]})
		}
	}
	home, _ := os.UserHomeDir()
	for _, d := range []string{"miniconda3", "anaconda3", "miniforge3", "mambaforge"} {
		c = append(c, []string{filepath.Join(home, d, "python.exe")})
	}
	return c
}

func namerStart() (string, error) {
	script := toolPath("reactio_name.py")
	if st, err := os.Stat(script); err != nil || st.IsDir() {
		return "tools\\reactio_name.py is missing beside the program: reinstall it from the download", errors.New("nohelper")
	}
	last := "no Python found"
	for _, cand := range pythonCandidates() {
		if st, err := os.Stat(cand[0]); err != nil || st.IsDir() {
			continue
		}
		args := append(append([]string{}, cand[1:]...), "-u", script)
		c := exec.Command(cand[0], args...)
		c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
		c.Env = append(os.Environ(), "PYTHONIOENCODING=utf-8")
		in, _ := c.StdinPipe()
		out, _ := c.StdoutPipe()
		namerErr.take()
		c.Stderr = namerErr
		if err := c.Start(); err != nil {
			continue
		}
		rd := bufio.NewReader(out)
		ch := make(chan string, 1)
		go func() { s, _ := rd.ReadString('\n'); ch <- s }()
		var first string
		select {
		case first = <-ch:
		case <-time.After(90 * time.Second):
			c.Process.Kill()
			continue
		}
		var m map[string]interface{}
		json.Unmarshal([]byte(first), &m)
		if _, ok := m["ready"]; ok {
			namerCmd, namerIn, namerOut, namerPy = c, bufio.NewWriter(in), rd, cand[0]
			logf("namer started with %s (openclatura %v)", cand[0], m["ready"])
			return "", nil
		}
		if s, ok := m["msg"].(string); ok {
			last = cand[0] + ": " + s
		}
		c.Process.Kill()
	}
	logf("namer: %s", last)
	return last, errors.New("nopython")
}

func namerStop() {
	if namerCmd != nil && namerCmd.Process != nil {
		namerCmd.Process.Kill()
	}
	namerCmd = nil
}

// namerName: the name for one SMILES, or an error code ("nopython") and a message
func namerName(smi string) (string, string, string) {
	namerMu.Lock()
	defer namerMu.Unlock()
	smi = strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(smi, "\r", ""), "\n", ""))
	if smi == "" {
		return "", "empty", ""
	}
	stopped := ""
	for try := 0; try < 2; try++ {
		if namerCmd == nil {
			if msg, err := namerStart(); err != nil {
				return "", err.Error(), msg
			}
		}
		namerErr.take()
		namerIn.WriteString(smi + "\n")
		if err := namerIn.Flush(); err != nil {
			stopped = helperStopped(namerCmd, namerErr)
			namerStop()
			continue
		}
		ch := make(chan string, 1)
		go func() { s, _ := namerOut.ReadString('\n'); ch <- s }()
		select {
		case line := <-ch:
			if line == "" {
				stopped = helperStopped(namerCmd, namerErr)
				namerStop()
				continue
			}
			var m map[string]string
			json.Unmarshal([]byte(line), &m)
			if m["name"] != "" {
				return m["name"], "", ""
			}
			return "", "noname", m["msg"]
		case <-time.After(60 * time.Second):
			namerStop()
			return "", "timeout", "naming took too long"
		}
	}
	// Python was found and the helper started, but it stopped on this structure (twice): not "no Python"
	return "", "crashed", "the naming helper (" + namerPy + ") stopped: " + stopped
}
