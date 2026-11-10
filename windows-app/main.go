package main

// Reactio Draw for Windows: the Reactio Draw page in its own window (WebView2), plus an OLE server,
// so drawings pasted into Word and PowerPoint open in Reactio Draw on double-click.
// WebView2 binding: github.com/jchv/go-webview2 (MIT), https://github.com/jchv/go-webview2

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"unsafe"

	"github.com/jchv/go-webview2"
	"github.com/jchv/go-webview2/pkg/edge"
)

//go:embed index.html
var pageHTML []byte

const (
	appHost   = "app.reactiodraw.example"
	embedHost = "embed.reactiodraw.example"
	appURL    = "https://" + appHost + "/index.html"
	embedURL  = "https://" + embedHost + "/index.html"
)

var app struct {
	w         webview2.WebView
	hwnd      uintptr
	embedding bool
	base      string
	quitOK    bool
	owner     bool
}

var logFile *os.File

func logf(f string, a ...interface{}) {
	if logFile == nil {
		return
	}
	fmt.Fprintf(logFile, time.Now().Format("15:04:05 ")+f+"\n", a...)
}

/* the developer tools (F12, Inspect) are for finding faults, not for everyday use: they are on only when the app is
   started with --devtools or with REACTIO_DEVTOOLS=1 in the environment */
func devtoolsOn() bool { return hasArg("--devtools") || os.Getenv("REACTIO_DEVTOOLS") == "1" }

func hasArg(names ...string) bool {
	for _, a := range os.Args[1:] {
		for _, n := range names {
			if strings.EqualFold(a, n) {
				return true
			}
		}
	}
	return false
}

// the embedded drawing goes into the page's storage before the page starts (only on the first load of this window)
func embedScript(kd string) string {
	j, _ := json.Marshal(kd)
	return `(function(){try{if(sessionStorage.getItem('rd-embed'))return;sessionStorage.setItem('rd-embed','1');
  for(const k of Object.keys(localStorage))if(k==='rd-tabs'||k==='rd-en-4'||k.indexOf('rd-doc-')===0)localStorage.removeItem(k);
  let d=null;try{d=JSON.parse(` + string(j) + `||'null');}catch(e){}
  const st=d&&d.state&&d.state.mol?d.state:{mol:{atoms:[],bonds:[],arrows:[],texts:[],fills:[],next:1},manual:[],memo:{},base:null,limiting:null,mNext:1};
  delete st.zoom;localStorage.setItem('rd-en-4',JSON.stringify(st));
  localStorage.setItem('rd-tabs',JSON.stringify({cur:'main',list:[{id:'main',name:'Word object'}]}));
  if(d&&d.clip)window.__rdEmbedClip=d.clip;}catch(e){}})();`
}

// ownPage: uri is the app's page (served from appHost or embedHost, or the file idx itself)
func ownPage(uri, idx string) bool {
	u, err := url.Parse(uri)
	if err != nil {
		return false
	}
	switch strings.ToLower(u.Scheme) {
	case "https":
		h := strings.ToLower(u.Host)
		return h == appHost || h == embedHost
	case "file":
		return strings.EqualFold(strings.TrimPrefix(u.Path, "/"), filepath.ToSlash(idx))
	case "about":
		return uri == "about:blank"
	}
	return false
}

func main() {
	runtime.LockOSThread()
	waitAfterUpdate()
	app.embedding = hasArg("-Embedding", "/Embedding")
	cliOn := cliRequested()
	if hasArg("/unregister", "-unregister") {
		unregister()
		messageBox(appName+" is no longer registered for Word and PowerPoint.", appName)
		return
	}
	// the data folder: %LOCALAPPDATA%\ReactioDraw
	app.base = filepath.Join(os.Getenv("LOCALAPPDATA"), "ReactioDraw")
	appDir := filepath.Join(app.base, "app")
	os.MkdirAll(appDir, 0755)
	logFile, _ = os.OpenFile(filepath.Join(app.base, "ReactioDraw.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	logf("start %v", os.Args)

	pOleInitialize.Call(0)
	exe, _ := os.Executable()
	if e2, err := filepath.EvalSymlinks(exe); err == nil {
		exe = e2
	}
	// registry entries for Word and PowerPoint: written once, again only when the program has moved or on /register
	if !cliOn && (hasArg("/register", "-register") || !registeredAs(exe) || !hasReactioExt()) {
		register(exe)
	}
	if !cliOn && !app.embedding {
		installWordTab(exe)
	}
	// Reactio Draw is open already: its window takes the files
	if !app.embedding && !cliOn && !hasArg("/register", "-register") {
		if otherInstance() {
			files, errs := fileArgs()
			if len(errs) > 0 {
				// this process only hands files over: it says itself what could not be opened
				messageBox("Could not open "+strings.Join(errs, "\n"), appName)
			}
			if len(files) > 0 || len(errs) > 0 {
				handOver(files)
				return
			}
		} else {
			app.owner = true // the first window: it takes files and drawings from Word handed over by other processes
		}
	}
	if hasArg("/register", "-register") {
		messageBox(appName+" is registered: Word and PowerPoint will open its drawings in "+appName+".", appName)
		return
	}
	// the page is UTF-8 (subscripts, arrows, Greek letters): say so, or WebView2 reads it as Windows-1252
	if !bytes.Contains(pageHTML[:min(len(pageHTML), 2048)], []byte("charset")) {
		pageHTML = append([]byte("<!doctype html><meta charset=\"utf-8\">\n"), pageHTML...)
	}
	idx := filepath.Join(appDir, "index.html")
	if old, err := os.ReadFile(idx); err != nil || !bytes.Equal(old, pageHTML) {
		os.WriteFile(idx, pageHTML, 0644)
	}

	// WebView2Loader.dll (Microsoft-signed) is a file beside the program; nothing is unpacked from the exe

	/* started by Word for an object: Word is answered at once (serverpump.go); WebView2 only for a window of its own */
	if app.embedding {
		pumpInit()
		initServer(nil)
		serverPump()
		if !pump.wantWindow {
			logf("server done")
			stopServer()
			opsinStop()
			namerStop()
			pOleUninitialize.Call()
			os.Exit(0)
		}
		logf("the drawing gets a window of its own")
	}

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     devtoolsOn(), // F12 and Inspect only when asked for (--devtools or REACTIO_DEVTOOLS=1)
		AutoFocus: true,
		DataPath:  filepath.Join(app.base, "WebView2"),
		WindowOptions: webview2.WindowOptions{
			Title: appName, Width: 1440, Height: 920, Center: true, Hidden: app.embedding || cliOn, IconId: 2, // icon group 2 (rsrc: manifest 1, icon 2)
		},
	})
	if w == nil {
		if cliOn {
			cliScript()
			os.Stderr.WriteString("reactio: Reactio Draw needs the Microsoft Edge WebView2 Runtime\n")
			os.Exit(1)
		}
		messageBox(appName+" needs the Microsoft Edge WebView2 Runtime.\nIt comes with Windows 11; for Windows 10 get it from Microsoft (search: WebView2 Runtime).", appName)
		return
	}
	app.w = w
	app.hwnd = webview2.HWND(w)
	if app.owner {
		saveMainWindow() // embedtab.go: a drawing opened from Word brings this window to the front
		cleanEmbedDirs()
	}
	ch := webview2.ChromiumOf(w)
	if s, err := ch.GetSettings(); err == nil {
		s.PutIsZoomControlEnabled(false)
		s.PutIsStatusBarEnabled(false)
	}
	fileURL := "file:///" + strings.ReplaceAll(idx, `\`, "/")
	pageURL := appURL
	if cliOn {
		fileURL += "?embed&cli"
		pageURL += "?embed&cli"
	}
	mapped := false
	if v3 := ch.GetICoreWebView2_3(); v3 != nil {
		e1 := v3.SetVirtualHostNameToFolderMapping(appHost, appDir, edge.COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW)
		e2 := v3.SetVirtualHostNameToFolderMapping(embedHost, appDir, edge.COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW)
		logf("folder mapping: %v %v", e1, e2)
		mapped = e1 == nil
	} else {
		logf("no ICoreWebView2_3: old WebView2 runtime")
	}
	// a page that does not load is logged, and the app falls back to the file itself
	triedFile := false
	ch.NavigationCompletedCallback = func(_ *edge.ICoreWebView2, args *edge.ICoreWebView2NavigationCompletedEventArgs) {
		var ok int32
		var status uint32
		a := uintptr(unsafe.Pointer(args))
		comCall(a, 3, uintptr(unsafe.Pointer(&ok)))     // get_IsSuccess
		comCall(a, 4, uintptr(unsafe.Pointer(&status))) // get_WebErrorStatus
		logf("navigation: success %d, error status %d", ok, status)
		if ok == 0 && !triedFile && !app.embedding {
			triedFile = true
			logf("trying %s", fileURL)
			w.Navigate(fileURL)
		}
	}
	if !mapped && !app.embedding {
		triedFile = true
	}
	// the window shows only the app's own page: any other address (a link, a redirect, a script of a document) is not
	// loaded in it, and one the user clicked opens in the default browser, as the page's own links do; the bridge
	// answers only the app's own page
	ch.NavigationStartingCallback = func(uri string, user bool) bool {
		if ownPage(uri, idx) {
			return true
		}
		logf("navigation refused: %s", uri)
		if user {
			openLink(uri)
		}
		return false
	}
	ch.MessageSourceCallback = func(src string) bool { return ownPage(src, idx) }
	w.Bind("__rdPost", func(s string) { w.Dispatch(func() { handle(s) }) })
	// files given on the command line (double-click in Explorer, Open with): handed to the page before it starts
	if cliOn {
		w.Init(cliScript())
	} else if !app.embedding {
		files, errs := fileArgs()
		if len(files) > 0 {
			j, _ := json.Marshal(files)
			w.Init("window.__rdPending=" + string(j) + ";")
		}
		if len(errs) > 0 {
			j, _ := json.Marshal(errs)
			w.Init("window.__rdFileErrors=" + string(j) + ";")
		}
		if app.owner {
			go watchInbox()
		}
	}
	w.Init(fmt.Sprintf("window.__rdWin={embed:%v};", app.embedding))
	if !app.embedding && !cliOn {
		w.Init(`window.__rdUpdate={asset:"` + updAssetName() + `"};`)
	}
	// page errors and the moment the page is ready go to ReactioDraw.log
	w.Init(`(function(){const L=m=>{try{window.__rdPost(JSON.stringify({id:'x',cmd:'log',msg:String(m)}));}catch(e){}};
  window.addEventListener('error',e=>L('error: '+e.message+' at '+e.filename+':'+e.lineno));
  window.addEventListener('unhandledrejection',e=>L('rejection: '+(e.reason&&e.reason.message||e.reason)));
  document.addEventListener('DOMContentLoaded',()=>L('page ready: '+location.href+', '+document.body.children.length+' elements'));})();`)

	if app.embedding {
		attachServer(w)
		webview2.SetCloseHandler(w, embedCloseRequested)
		showOwnWindow()
	} else {
		if mapped {
			w.Navigate(pageURL)
		} else {
			w.Navigate(fileURL)
		}
		// closing the window asks the page first: documents with unsaved changes ask to be saved
		webview2.SetCloseHandler(w, func() bool {
			if app.quitOK {
				return true
			}
			w.Eval("window.__rdBeforeQuit?window.__rdBeforeQuit():window.__rdPost(JSON.stringify({id:'x',cmd:'quit'}))")
			return false
		})
		if !cliOn {
			pShowWindow.Call(app.hwnd, 3) // maximized
		}
	}
	w.Run()
	logf("window closed")
	if app.embedding {
		stopServer()
	}
	opsinStop()
	if !app.embedding {
		stopLocalAPI()
	}
	namerStop()
	pOleUninitialize.Call()
	restartAfterUpdate()
	os.Exit(0)
}

func dirExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && st.IsDir()
}
