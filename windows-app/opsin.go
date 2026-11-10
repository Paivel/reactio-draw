package main

// Name → structure with OPSIN (MIT, https://github.com/dan2097/opsin), shipped unchanged in the tools folder beside the program and run
// as a separate Java program: it stays running and answers one SMILES line per name line.

import (
	"bufio"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)


var opsinMu sync.Mutex
var opsinCmd *exec.Cmd
var opsinIn *bufio.Writer
var opsinOut *bufio.Reader
var opsinErr = &tailBuf{}

type tailBuf struct {
	mu sync.Mutex
	b  []byte
}

func (t *tailBuf) Write(p []byte) (int, error) {
	t.mu.Lock()
	t.b = append(t.b, p...)
	if len(t.b) > 4000 {
		t.b = t.b[len(t.b)-4000:]
	}
	t.mu.Unlock()
	return len(p), nil
}
func (t *tailBuf) take() string {
	t.mu.Lock()
	s := string(t.b)
	t.b = nil
	t.mu.Unlock()
	return s
}

func findJava() string {
	cands := []string{}
	if h := os.Getenv("JAVA_HOME"); h != "" {
		cands = append(cands, filepath.Join(h, "bin", "java.exe"))
	}
	if p, err := exec.LookPath("java.exe"); err == nil {
		cands = append(cands, p)
	}
	for _, root := range []string{os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)")} {
		if root == "" {
			continue
		}
		for _, pat := range []string{"Eclipse Adoptium\\*\\bin\\java.exe", "Java\\*\\bin\\java.exe", "Microsoft\\jdk*\\bin\\java.exe", "Zulu\\*\\bin\\java.exe", "Amazon Corretto\\*\\bin\\java.exe", "BellSoft\\*\\bin\\java.exe"} {
			m, _ := filepath.Glob(filepath.Join(root, pat))
			cands = append(cands, m...)
		}
	}
	for _, c := range cands {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c
		}
	}
	return ""
}

func opsinStart() error {
	java := findJava()
	if java == "" {
		return errors.New("nojava")
	}
	jar := toolPath("opsin-2.9.0.jar")
	if st, err := os.Stat(jar); err != nil || st.IsDir() {
		return errors.New("noopsin")
	}
	c := exec.Command(java, "-jar", jar, "-osmi")
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000} // no console window
	in, err := c.StdinPipe()
	if err != nil {
		return err
	}
	out, err := c.StdoutPipe()
	if err != nil {
		return err
	}
	c.Stderr = opsinErr
	if err := c.Start(); err != nil {
		logf("opsin: %v", err)
		return errors.New("nojava")
	}
	opsinCmd, opsinIn, opsinOut = c, bufio.NewWriter(in), bufio.NewReader(out)
	logf("opsin started with %s", java)
	return nil
}

func opsinStop() {
	if opsinCmd != nil && opsinCmd.Process != nil {
		opsinCmd.Process.Kill()
	}
	opsinCmd = nil
}

// opsinName: SMILES for a name, or an error code ("nojava", "noopsin") / OPSIN's message
func opsinName(name string) (string, string, string) {
	opsinMu.Lock()
	defer opsinMu.Unlock()
	name = strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(name, "\r", " "), "\n", " "))
	if name == "" {
		return "", "empty", ""
	}
	stopped := ""
	for try := 0; try < 2; try++ {
		if opsinCmd == nil {
			if err := opsinStart(); err != nil {
				return "", err.Error(), ""
			}
		}
		opsinErr.take()
		if _, err := opsinIn.WriteString(name + "\n"); err == nil {
			err = opsinIn.Flush()
		}
		type res struct {
			s   string
			err error
		}
		ch := make(chan res, 1)
		go func() { s, err := opsinOut.ReadString('\n'); ch <- res{s, err} }()
		select {
		case r := <-ch:
			if r.err != nil {
				stopped = helperStopped(opsinCmd, opsinErr)
				opsinStop()
				continue
			}
			s := strings.TrimSpace(r.s)
			if s == "" {
				time.Sleep(30 * time.Millisecond)
				msg := strings.TrimSpace(opsinErr.take())
				if i := strings.Index(msg, "uninterpretable: "); i >= 0 {
					msg = msg[i+len("uninterpretable: "):]
					if j := strings.Index(msg, " The following"); j >= 0 {
						msg = msg[:j]
					}
					msg = "not understood: " + strings.TrimSpace(msg)
				}
				return "", "unparsable", msg
			}
			return s, "", ""
		case <-time.After(30 * time.Second):
			opsinStop()
			return "", "timeout", ""
		}
	}
	// Java was found and started, but OPSIN stopped on this name (twice): not "no Java"
	return "", "crashed", "OPSIN (Java) stopped: " + stopped
}

// helperStopped: a helper program (Python, Java) has stopped answering: it is ended, and the first line of what it
// wrote to its error output says why ("without a message" when it wrote nothing)
func helperStopped(c *exec.Cmd, errOut *tailBuf) string {
	if c != nil && c.Process != nil {
		c.Process.Kill()
		done := make(chan struct{})
		go func() { c.Wait(); close(done) }() // the rest of its error output comes in
		select {
		case <-done:
		case <-time.After(2 * time.Second):
		}
	}
	var lines []string
	for _, l := range strings.Split(errOut.take(), "\n") {
		if l = strings.TrimSpace(l); l != "" {
			lines = append(lines, l)
		}
	}
	if len(lines) == 0 {
		return "without a message"
	}
	l := lines[0]
	if strings.HasPrefix(l, "Traceback ") {
		l = lines[len(lines)-1] // a Python traceback: its last line is the error itself
	}
	if len(l) > 300 {
		l = l[:300] + "…"
	}
	return l
}

// toolPath: helper files shipped beside the program, in its tools folder (nothing is unpacked at run time)
func toolPath(name string) string {
	exe, err := os.Executable()
	if err != nil {
		return name
	}
	return filepath.Join(filepath.Dir(exe), "tools", name)
}
