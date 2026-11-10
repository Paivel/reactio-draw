package main

// Reactio Draw for Linux: its own window around the page (index.html, the whole program) with WebKitGTK,
// native Open and Save dialogs, OPSIN and the naming helper (tools/), and the local API (off until turned on).

import (
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/ebitengine/purego"
)

//go:embed index.html
var pageHTML []byte

const appName = "Reactio Draw"

var app struct {
	base       string
	win, view  uintptr
	quitOK     bool
}

var logFile *os.File

// ownPage: uri is the app's page, the file idx (frames: also about:blank and the page's own blob: addresses)
func ownPage(uri, idx string, frames bool) bool {
	u, err := url.Parse(uri)
	if err != nil {
		return false
	}
	switch u.Scheme {
	case "file":
		return u.Host == "" && u.Path == idx
	case "about", "blob":
		return frames
	}
	return false
}

func logf(f string, a ...interface{}) {
	if logFile == nil {
		return
	}
	fmt.Fprintf(logFile, time.Now().Format("15:04:05 ")+f+"\n", a...)
}

func init() { runtime.LockOSThread() } // GTK runs on the main thread

/* the developer tools (Inspect) are for finding faults, not for everyday use: they are on only when the app is started
   with --devtools or with REACTIO_DEVTOOLS=1 in the environment */
func devtoolsOn() bool {
	for _, a := range os.Args[1:] {
		if a == "--devtools" {
			return true
		}
	}
	return os.Getenv("REACTIO_DEVTOOLS") == "1"
}

/* files given on the command line (Open with, a double-click in the file manager) */
// fileArgs: the files opened with the app, and a message for each one that could not be opened ("a.mol: too large
// (70 MB, at most 64)")
func fileArgs() ([][3]string, []string) {
	var files [][3]string
	var errs []string
	for _, a := range os.Args[1:] {
		if strings.HasPrefix(a, "-") {
			continue
		}
		if u, err := url.Parse(a); err == nil && u.Scheme == "file" {
			a = u.Path
		}
		b, why := argFile(a)
		if why != "" {
			logf("cannot open %s: %s", a, why)
			errs = append(errs, filepath.Base(a)+": "+why)
			continue
		}
		abs, _ := filepath.Abs(a)
		allowPath(abs)
		files = append(files, [3]string{filepath.Base(a), base64.StdEncoding.EncodeToString(b), abs})
	}
	return files, errs
}

func main() {
	waitAfterUpdate()
	d, err := os.UserHomeDir()
	if err != nil {
		d = os.TempDir()
	}
	if x := os.Getenv("XDG_DATA_HOME"); x != "" {
		app.base = filepath.Join(x, "ReactioDraw")
	} else {
		app.base = filepath.Join(d, ".local", "share", "ReactioDraw")
	}
	appDir := filepath.Join(app.base, "app")
	os.MkdirAll(appDir, 0755)
	logFile, _ = os.OpenFile(filepath.Join(app.base, "ReactioDraw.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	logf("start %v", os.Args)
	idx := filepath.Join(appDir, "index.html")
	if old, err := os.ReadFile(idx); err != nil || string(old) != string(pageHTML) {
		os.WriteFile(idx, pageHTML, 0644)
	}
	pageURL := (&url.URL{Scheme: "file", Path: idx}).String()

	if cliRequested() {
		pageURL += "?embed&cli"
	}
	if err := loadGTK(); err != nil {
		if cliRequested() {
			fmt.Fprintln(os.Stderr, "reactio: "+err.Error()+" (the command line needs WebKitGTK too)")
			os.Exit(1)
		}
		/* no WebKitGTK: the same program opens in the web browser, and the terminal says what to install */
		fmt.Fprintln(os.Stderr, appName+": "+err.Error()+". Opening it in the web browser instead.")
		logf("no window: %v", err)
		exec.Command("xdg-open", pageURL).Start()
		return
	}
	g_set_prgname("reactiodraw")
	gtk_init(0, 0)
	idleCB = purego.NewCallback(runQueue)

	/* the command line works in a window that is never shown (it still needs a desktop session or xvfb-run) */
	if cliRequested() {
		app.win = gtk_offscreen_window_new()
	} else {
		app.win = gtk_window_new(0)
	}
	gtk_window_set_title(app.win, appName)
	gtk_window_set_default_size(app.win, 1440, 920)
	if exe, err := os.Executable(); err == nil {
		gtk_window_set_icon_from_file(app.win, filepath.Join(filepath.Dir(exe), "reactiodraw.png"), 0)
	}
	ucm := webkit_user_content_manager_new()
	webkit_user_content_manager_register_script(ucm, "rd", 0)
	g_signal_connect_data(ucm, "script-message-received::rd", purego.NewCallback(func(m, res, data uintptr) uintptr {
		/* only the app's own page may use the bridge */
		if !ownPage(goString(webkit_web_view_get_uri(app.view), false), idx, false) {
			logf("bridge message from another page refused")
			return 0
		}
		v := res
		if webkit_javascript_result_get_js_value != nil {
			v = webkit_javascript_result_get_js_value(res)
		}
		handle(goString(jsc_value_to_string(v), true))
		return 0
	}), 0, 0, 0)
	/* before the page starts: files to open, page errors to the log */
	pre := `(function(){const L=m=>{try{window.webkit.messageHandlers.rd.postMessage(JSON.stringify({id:'x',cmd:'log',msg:String(m)}));}catch(e){}};
  window.addEventListener('error',e=>L('error: '+e.message+' at '+e.filename+':'+e.lineno));
  window.addEventListener('unhandledrejection',e=>L('rejection: '+(e.reason&&e.reason.message||e.reason)));})();`
	if cliRequested() {
		pre += cliScript()
	} else {
		files, errs := fileArgs()
		if len(files) > 0 {
			j, _ := json.Marshal(files)
			pre += "window.__rdPending=" + string(j) + ";"
		}
		if len(errs) > 0 {
			j, _ := json.Marshal(errs)
			pre += "window.__rdFileErrors=" + string(j) + ";"
		}
	}
	if !cliRequested() {
		pre += `window.__rdUpdate={asset:"` + updAssetName() + `"};`
	}
	webkit_user_content_manager_add_script(ucm, webkit_user_script_new(pre, 1, 0, 0, 0)) // top frame, at document start

	app.view = webkit_web_view_new_with_ucm(ucm)
	st := webkit_web_view_get_settings(app.view)
	webkit_settings_set_dev_extras(st, devtoolsOn())
	/* the system's own right-click menu only in a text field (Cut, Copy, Paste); elsewhere it held only Reload, Back and
	   Forward, and Reload started the whole app again. With the developer tools on, it stays as it is */
	if !devtoolsOn() {
		g_signal_connect_data(app.view, "context-menu", purego.NewCallback(func(v, menu, ev, hit, data uintptr) uintptr {
			if hit != 0 && webkit_hit_test_result_context_is_editable(hit) {
				return 0
			}
			return 1
		}), 0, 0, 0)
	}
	webkit_settings_set_js_clipboard(st, true)
	gtk_container_add(app.win, app.view)

	/* the window shows only the app's own page: any other address (a link, a redirect, a script of a document) is not
	   loaded in it, and a link the user clicked opens in the default browser, as the page's own links do */
	g_signal_connect_data(app.view, "decide-policy", purego.NewCallback(func(v, d, kind, data uintptr) uintptr {
		if int32(kind) == 2 { // a response: the navigation itself was already let through
			return 0
		}
		a := webkit_nav_decision_get_action(d)
		uri := goString(webkit_uri_request_get_uri(webkit_navigation_action_get_request(a)), false)
		if ownPage(uri, idx, true) {
			return 0
		}
		logf("navigation refused: %s", uri)
		if webkit_navigation_action_get_type(a) == 0 { // a link clicked
			openLink(uri)
		}
		webkit_policy_decision_ignore(d)
		return 1
	}), 0, 0, 0)

	/* closing the window asks the page first (unsaved documents); the page answers with quit */
	g_signal_connect_data(app.win, "delete-event", purego.NewCallback(func(w, ev, data uintptr) uintptr {
		if app.quitOK {
			return 0
		}
		evalJS("window.__rdBeforeQuit?window.__rdBeforeQuit():window.webkit.messageHandlers.rd.postMessage(JSON.stringify({id:'x',cmd:'quit'}))")
		return 1
	}), 0, 0, 0)
	g_signal_connect_data(app.win, "destroy", purego.NewCallback(func(w, data uintptr) uintptr { gtk_main_quit(); return 0 }), 0, 0, 0)

	webkit_web_view_load_uri(app.view, pageURL)
	if !cli.on {
		gtk_window_maximize(app.win)
	}
	gtk_widget_show_all(app.win)
	gtk_main()
	stopLocalAPI()
	namerStop()
	opsinStop()
	logf("window closed")
	restartAfterUpdate()
}
