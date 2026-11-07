package main

// Reactio Draw as an OLE server: Word and PowerPoint keep Reactio Draw objects in their documents and open them here on double-click.
// The interfaces and their method order follow the Windows SDK headers (oleidl.h, objidl.h, unknwn.h);
// the protocol (Load/DoVerb/SaveObject/SendOnClose) follows the OLE documentation:
// https://learn.microsoft.com/windows/win32/api/oleidl/nn-oleidl-ioleobject

import (
	"encoding/binary"
	"time"
	"unsafe"

	"github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
)

type comObj struct{ vtbl uintptr }

var (
	vtFactory  [5]uintptr
	vtOle      [24]uintptr
	vtData     [12]uintptr
	vtPersist  [10]uintptr
	factoryObj = &comObj{}
	oleObj     = &comObj{}
	dataObj    = &comObj{}
	persistObj = &comObj{}
)

func ptr(o *comObj) uintptr { return uintptr(unsafe.Pointer(o)) }

var srv struct {
	w                     webview2.WebView
	hwnd                  uintptr
	site, stg             uintptr
	oleHolder, dataHolder uintptr
	kd, png, emf          []byte
	pic                   *picture
	wHi, hHi              int32
	dirty, shown, closing bool
	created, pageStarted  bool
	refs                  int
	cookie                uint32
	title                 string
}

func guidAt(p uintptr) windows.GUID { return *(*windows.GUID)(unsafe.Pointer(p)) }
func putPtr(pp, v uintptr) {
	if pp != 0 {
		*(*uintptr)(unsafe.Pointer(pp)) = v
	}
}

// the server: registered with Windows at once; w is nil until the drawing needs a window of its own (attachServer)
func initServer(w webview2.WebView) {
	if w != nil {
		srv.w = w
		srv.hwnd = webview2.HWND(w)
	}
	pCreateOleAdviseHolder.Call(uintptr(unsafe.Pointer(&srv.oleHolder)))
	pCreateDataAdviseHolder.Call(uintptr(unsafe.Pointer(&srv.dataHolder)))

	qiFn := func(this, riid, ppv uintptr) uintptr {
		if ppv == 0 {
			return E_POINTER
		}
		g := guidAt(riid)
		var out uintptr
		if this == ptr(factoryObj) {
			if g == IID_IUnknown || g == IID_IClassFactory {
				out = this
			}
		} else {
			switch g {
			case IID_IUnknown, IID_IOleObject:
				out = ptr(oleObj)
			case IID_IDataObject:
				out = ptr(dataObj)
			case IID_IPersistStorage, IID_IPersist:
				out = ptr(persistObj)
			}
		}
		putPtr(ppv, out)
		if out == 0 {
			return E_NOINTERFACE
		}
		if out != ptr(factoryObj) {
			srv.refs++
		}
		return S_OK
	}
	qi := windows.NewCallback(qiFn)
	addref := windows.NewCallback(func(this uintptr) uintptr {
		if this == ptr(factoryObj) {
			return 1
		}
		srv.refs++
		return uintptr(srv.refs)
	})
	rel := windows.NewCallback(func(this uintptr) uintptr {
		if this == ptr(factoryObj) {
			return 1
		}
		srv.refs--
		if srv.refs <= 0 {
			srv.refs = 0
			// nobody holds the object and its window is not open: done
			srvDispatch(func() {
				if srv.refs == 0 && !srv.shown && !srv.closing {
					srv.closing = true
					srvQuit()
				}
			})
		}
		return uintptr(srv.refs)
	})
	notimpl1 := windows.NewCallback(func(this, a uintptr) uintptr { return E_NOTIMPL })
	notimpl2 := windows.NewCallback(func(this, a, b uintptr) uintptr { return E_NOTIMPL })
	notimpl3 := windows.NewCallback(func(this, a, b, c uintptr) uintptr { return E_NOTIMPL })
	ok0 := windows.NewCallback(func(this uintptr) uintptr { return S_OK })
	ok2 := windows.NewCallback(func(this, a, b uintptr) uintptr { return S_OK })
	userReg2 := windows.NewCallback(func(this, a, b uintptr) uintptr { return OLE_S_USEREG })
	userReg1 := windows.NewCallback(func(this, a uintptr) uintptr { return OLE_S_USEREG })
	putClsid := windows.NewCallback(func(this, p uintptr) uintptr {
		if p == 0 {
			return E_POINTER
		}
		*(*windows.GUID)(unsafe.Pointer(p)) = CLSID_RD
		return S_OK
	})

	// IClassFactory
	vtFactory = [5]uintptr{qi, addref, rel,
		windows.NewCallback(func(this, outer, riid, ppv uintptr) uintptr { // CreateInstance
			putPtr(ppv, 0)
			if outer != 0 {
				return CLASS_E_NOAGGREGATION
			}
			srv.created = true
			logf("CreateInstance")
			return qiFn(ptr(oleObj), riid, ppv)
		}),
		windows.NewCallback(func(this, lock uintptr) uintptr { return S_OK }), // LockServer
	}

	// IOleObject
	vtOle = [24]uintptr{qi, addref, rel,
		windows.NewCallback(func(this, site uintptr) uintptr { // SetClientSite
			addRef(site)
			release(srv.site)
			srv.site = site
			return S_OK
		}),
		windows.NewCallback(func(this, pp uintptr) uintptr { // GetClientSite
			addRef(srv.site)
			putPtr(pp, srv.site)
			return S_OK
		}),
		windows.NewCallback(func(this, app, obj uintptr) uintptr { // SetHostNames
			a, o := windows.UTF16PtrToString((*uint16)(unsafe.Pointer(app))), windows.UTF16PtrToString((*uint16)(unsafe.Pointer(obj)))
			t := appName
			if o != "" {
				t += " - Drawing in " + o
			} else if a != "" {
				t += " - Drawing in " + a
			}
			srv.title = t
			srvDispatch(func() {
				if srv.w != nil {
					srv.w.SetTitle(t)
				}
			})
			return S_OK
		}),
		windows.NewCallback(func(this, opt uintptr) uintptr { // Close
			logf("Close %d", opt)
			closeFromContainer(uint32(opt) != 1) // OLECLOSE_NOSAVE
			return S_OK
		}),
		ok2,      // SetMoniker
		notimpl3, // GetMoniker
		notimpl3, // InitFromData
		notimpl2, // GetClipboardData
		windows.NewCallback(func(this, verb, msg, site, lindex, parent, rect uintptr) uintptr { // DoVerb
			if int32(uint32(verb)) == -3 { // OLEIVERB_HIDE
				if tab.on || tab.pending {
					return S_OK
				}
				if srv.hwnd != 0 {
					pShowWindow.Call(srv.hwnd, 0)
				}
				srv.shown = false
				return S_OK
			}
			showEditor()
			return S_OK
		}),
		userReg1, // EnumVerbs
		ok0,      // Update
		ok0,      // IsUpToDate
		putClsid, // GetUserClassID
		userReg2, // GetUserType
		ok2,      // SetExtent
		windows.NewCallback(func(this, aspect, psz uintptr) uintptr { // GetExtent
			if psz == 0 {
				return E_POINTER
			}
			w, h := srv.wHi, srv.hHi
			if w <= 0 || h <= 0 {
				w, h = 5000, 3000
			}
			s := (*[2]int32)(unsafe.Pointer(psz))
			s[0], s[1] = w, h
			return S_OK
		}),
		windows.NewCallback(func(this, sink, pdw uintptr) uintptr { return comCall(srv.oleHolder, 3, sink, pdw) }), // Advise
		windows.NewCallback(func(this, dw uintptr) uintptr { return comCall(srv.oleHolder, 4, dw) }),               // Unadvise
		windows.NewCallback(func(this, pp uintptr) uintptr { return comCall(srv.oleHolder, 5, pp) }),               // EnumAdvise
		windows.NewCallback(func(this, aspect, pdw uintptr) uintptr { // GetMiscStatus
			if pdw != 0 {
				*(*uint32)(unsafe.Pointer(pdw)) = 0
			}
			return S_OK
		}),
		notimpl1, // SetColorScheme
	}

	// IDataObject: the picture for the container's cache
	vtData = [12]uintptr{qi, addref, rel,
		windows.NewCallback(func(this, pfe, pmed uintptr) uintptr { return getData(pfe, pmed) }),
		notimpl2, // GetDataHere
		windows.NewCallback(func(this, pfe uintptr) uintptr { // QueryGetData
			cf, tymed := formatOf(pfe)
			if (cf == CF_ENHMETAFILE && tymed&TYMED_ENHMF != 0) || (cf == CF_DIB && tymed&TYMED_HGLOBAL != 0) {
				return S_OK
			}
			return DV_E_FORMATETC
		}),
		notimpl2, // GetCanonicalFormatEtc
		notimpl3, // SetData
		userReg2, // EnumFormatEtc
		windows.NewCallback(func(this, pfe, advf, sink, pdw uintptr) uintptr { // DAdvise
			return comCall(srv.dataHolder, 3, ptr(dataObj), pfe, advf, sink, pdw)
		}),
		windows.NewCallback(func(this, dw uintptr) uintptr { return comCall(srv.dataHolder, 4, dw) }), // DUnadvise
		windows.NewCallback(func(this, pp uintptr) uintptr { return comCall(srv.dataHolder, 5, pp) }), // EnumDAdvise
	}

	// IPersistStorage
	vtPersist = [10]uintptr{qi, addref, rel,
		putClsid, // GetClassID
		windows.NewCallback(func(this uintptr) uintptr { // IsDirty
			if srv.dirty {
				return S_OK
			}
			return S_FALSE
		}),
		windows.NewCallback(func(this, stg uintptr) uintptr { // InitNew
			logf("InitNew")
			addRef(stg)
			release(srv.stg)
			srv.stg = stg
			srv.kd = nil
			/* the page starts only when the object gets a window of its own (showEditor); usually it goes to a tab of the
			   open window instead (embedtab.go) */
			return S_OK
		}),
		windows.NewCallback(func(this, stg uintptr) uintptr { // Load
			addRef(stg)
			release(srv.stg)
			srv.stg = stg
			srv.kd = readStream(stg, "RDData")
			srv.png = readStream(stg, "RDPicture")
			srv.emf = readStream(stg, "RDEmf")
			if sz := readStream(stg, "RDSize"); len(sz) >= 8 {
				srv.wHi, srv.hHi = int32(binary.LittleEndian.Uint32(sz)), int32(binary.LittleEndian.Uint32(sz[4:]))
			}
			if len(srv.png) > 0 || len(srv.emf) > 0 {
				srv.pic = pictureOf(srv.png, srv.wHi, srv.hHi)
				srv.pic.emfData = srv.emf
			}
			logf("Load: drawing %d bytes, picture %d bytes", len(srv.kd), len(srv.png))
			return S_OK
		}),
		windows.NewCallback(func(this, stg, same uintptr) uintptr { // Save
			if stg == 0 {
				return E_POINTER
			}
			if writeNative(stg, false) {
				return S_OK
			}
			return E_FAIL
		}),
		windows.NewCallback(func(this, stg uintptr) uintptr { // SaveCompleted
			if stg != 0 {
				addRef(stg)
				release(srv.stg)
				srv.stg = stg
			}
			srv.dirty = false
			return S_OK
		}),
		windows.NewCallback(func(this uintptr) uintptr { // HandsOffStorage
			release(srv.stg)
			srv.stg = 0
			return S_OK
		}),
	}

	factoryObj.vtbl = uintptr(unsafe.Pointer(&vtFactory[0]))
	oleObj.vtbl = uintptr(unsafe.Pointer(&vtOle[0]))
	dataObj.vtbl = uintptr(unsafe.Pointer(&vtData[0]))
	persistObj.vtbl = uintptr(unsafe.Pointer(&vtPersist[0]))

	// CLSCTX_LOCAL_SERVER, REGCLS_SINGLEUSE: every object gets its own Reactio Draw window
	pCoRegisterClassObject.Call(uintptr(unsafe.Pointer(&CLSID_RD)), ptr(factoryObj), 4, 0, uintptr(unsafe.Pointer(&srv.cookie)))
	logf("server registered, cookie %d", srv.cookie)

	// started by hand with -Embedding, or the container gave up: do not linger
	time.AfterFunc(90*time.Second, func() {
		srvDispatch(func() {
			if !srv.created && !srv.closing {
				srv.closing = true
				srvQuit()
			}
		})
	})
}

func stopServer() {
	if srv.cookie != 0 {
		pCoRevokeClassObject.Call(uintptr(srv.cookie))
	}
	pCoDisconnectObject.Call(ptr(oleObj), 0)
	release(srv.site)
	release(srv.stg)
	srv.site, srv.stg = 0, 0
}

func formatOf(pfe uintptr) (uint16, uint32) {
	if pfe == 0 {
		return 0, 0
	}
	return *(*uint16)(unsafe.Pointer(pfe)), *(*uint32)(unsafe.Pointer(pfe + 24))
}

func getData(pfe, pmed uintptr) uintptr {
	if pfe == 0 || pmed == 0 {
		return E_POINTER
	}
	cf, tymed := formatOf(pfe)
	aspect := *(*uint32)(unsafe.Pointer(pfe + 16))
	logf("GetData cf %d tymed %d aspect %d, picture ready %v", cf, tymed, aspect, srv.pic != nil)
	if aspect == 4 { // DVASPECT_ICON: the icon comes from the registry
		return DV_E_FORMATETC
	}
	p := srv.pic
	if p == nil {
		p = pictureOf(nil, srv.wHi, srv.hHi)
	}
	var t uint32
	var h uintptr
	switch {
	case cf == CF_METAFILEPICT && tymed&TYMED_MFPICT != 0:
		t, h = TYMED_MFPICT, p.mfpict()
	case cf == CF_ENHMETAFILE && tymed&TYMED_ENHMF != 0:
		t, h = TYMED_ENHMF, p.emf()
	case cf == CF_DIB && tymed&TYMED_HGLOBAL != 0:
		t, h = TYMED_HGLOBAL, globalOf(p.dib)
	default:
		return DV_E_FORMATETC
	}
	if h == 0 {
		return E_OUTOFMEMORY
	}
	*(*uint32)(unsafe.Pointer(pmed)) = t
	*(*uintptr)(unsafe.Pointer(pmed + 8)) = h
	*(*uintptr)(unsafe.Pointer(pmed + 16)) = 0
	return S_OK
}

// ---------- storage ----------

func writeStream(stg uintptr, name string, data []byte) bool {
	var stm uintptr
	hr := comCall(stg, 3, uintptr(unsafe.Pointer(u16(name))), 0x1012, 0, 0, uintptr(unsafe.Pointer(&stm))) // CreateStream: CREATE|READWRITE|SHARE_EXCLUSIVE
	if failed(hr) || stm == 0 {
		logf("CreateStream %s failed %x", name, hr)
		return false
	}
	defer release(stm)
	if len(data) == 0 {
		return true
	}
	var n uint32
	hr = comCall(stm, 4, uintptr(unsafe.Pointer(&data[0])), uintptr(len(data)), uintptr(unsafe.Pointer(&n))) // Write
	return !failed(hr)
}

func readStream(stg uintptr, name string) []byte {
	var stm uintptr
	hr := comCall(stg, 4, uintptr(unsafe.Pointer(u16(name))), 0, 0x10, 0, uintptr(unsafe.Pointer(&stm))) // OpenStream: READ|SHARE_EXCLUSIVE
	if failed(hr) || stm == 0 {
		return nil
	}
	defer release(stm)
	var out []byte
	buf := make([]byte, 65536)
	for {
		var n uint32
		hr = comCall(stm, 3, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)), uintptr(unsafe.Pointer(&n))) // Read
		out = append(out, buf[:n]...)
		if failed(hr) || n == 0 {
			break
		}
	}
	return out
}

var oleStream = []byte{1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0} // the 20-byte \1Ole stream of an embedded object (MS-OLEDS 2.3.3)

// Reactio Draw's own data in a storage; clipboard copies also get the class and the \1Ole stream
func writeNative(stg uintptr, full bool) bool {
	pWriteClassStg.Call(stg, uintptr(unsafe.Pointer(&CLSID_RD)))
	pWriteFmtUserTypeStg.Call(stg, uintptr(clipFormat(userType)), uintptr(unsafe.Pointer(u16(userType))))
	if full {
		writeStream(stg, "\x01Ole", oleStream)
	}
	sz := make([]byte, 8)
	binary.LittleEndian.PutUint32(sz, uint32(srv.wHi))
	binary.LittleEndian.PutUint32(sz[4:], uint32(srv.hHi))
	ok := writeStream(stg, "RDData", srv.kd) && writeStream(stg, "RDSize", sz)
	if len(srv.png) > 0 {
		writeStream(stg, "RDPicture", srv.png) // the picture too, so Word gets it before the page has drawn anything
	}
	if len(srv.emf) > 0 {
		writeStream(stg, "RDEmf", srv.emf)
	}
	if full {
		/* the picture as OLE's own presentation cache: Word shows a pasted object from it at once, without starting
		   Reactio Draw to ask for its picture (which it did three times for every paste) */
		if pres := presStream(srv.emf, srv.png, srv.wHi, srv.hHi); pres != nil {
			writeStream(stg, "\x02OlePres000", pres)
		}
	}
	return ok
}

var (
	pGetWinMetaFileBits = gdi32.NewProc("GetWinMetaFileBits")
	pDeleteEnhMetaFile  = gdi32.NewProc("DeleteEnhMetaFile")
)

// an OLE presentation stream (MS-OLEDS 2.3.4: clipboard format, no target device, content aspect, extents in HIMETRIC,
// the data): the EMF kept as OLE keeps one, as the Windows metafile GetWinMetaFileBits makes (the EMF rides inside it);
// without an EMF the picture as a DIB
func presStream(emf, png []byte, wHi, hHi int32) []byte {
	var cf uint32
	var data []byte
	if len(emf) > 0 {
		h, _, _ := pSetEnhMetaFileBits.Call(uintptr(len(emf)), uintptr(unsafe.Pointer(&emf[0])))
		if h != 0 {
			dc, _, _ := pGetDC.Call(0)
			n, _, _ := pGetWinMetaFileBits.Call(h, 0, 0, 8, dc) // MM_ANISOTROPIC
			if n > 0 {
				buf := make([]byte, n)
				if m, _, _ := pGetWinMetaFileBits.Call(h, n, uintptr(unsafe.Pointer(&buf[0])), 8, dc); m > 0 {
					cf, data = CF_ENHMETAFILE, buf[:m]
				}
			}
			pReleaseDC.Call(0, dc)
			pDeleteEnhMetaFile.Call(h)
		}
	}
	if data == nil && len(png) > 0 {
		if p := pictureOf(png, wHi, hHi); p != nil && len(p.dib) > 40 {
			cf, data = CF_DIB, p.dib
		}
	}
	if data == nil {
		return nil
	}
	b := make([]byte, 40, 40+len(data))
	le := binary.LittleEndian
	le.PutUint32(b[0:], 0xFFFFFFFF) // a standard clipboard format follows
	le.PutUint32(b[4:], cf)
	le.PutUint32(b[8:], 4) // target device: none
	le.PutUint32(b[12:], 1) // DVASPECT_CONTENT
	le.PutUint32(b[16:], 0xFFFFFFFF) // lindex
	le.PutUint32(b[20:], 0)          // advf
	le.PutUint32(b[24:], 0)          // reserved
	le.PutUint32(b[28:], uint32(wHi))
	le.PutUint32(b[32:], uint32(hHi))
	le.PutUint32(b[36:], uint32(len(data)))
	return append(b, data...)
}

// ---------- editor window ----------

func showEditor() {
	logf("DoVerb: show")
	/* in a tab of the open Reactio Draw window (embedtab.go); a window of its own only when that cannot be. Word's
	   call returns at once: finding (or starting) the window is done in the background */
	if tab.on {
		showInTab()
		return
	}
	if !srv.pageStarted {
		if tab.pending {
			return
		}
		tab.pending = true
		srv.shown = true
		if srv.site != 0 {
			comCall(srv.site, 6)    // ShowObject
			comCall(srv.site, 7, 1) // OnShowWindow(TRUE)
		}
		go func() {
			ok := reachMain()
			srvDispatch(func() {
				tab.pending = false
				if srv.closing {
					return
				}
				if !ok || !showInTab() {
					logf("no Reactio Draw window: the object gets a window of its own")
					showOwnWindow()
				}
			})
		}()
		return
	}
	showOwnWindow()
}

// the server's window: made when first needed (the loop in serverPump ends, main makes the window and calls attachServer)
func attachServer(w webview2.WebView) {
	srv.w = w
	srv.hwnd = webview2.HWND(w)
	pumpDrain()
}

func showOwnWindow() {
	if srv.w == nil {
		pump.wantWindow = true
		pumpWake()
		return
	}
	startPage()
	pShowWindow.Call(srv.hwnd, 3) // SW_MAXIMIZE
	if ch := webview2.ChromiumOf(srv.w); ch != nil {
		ch.Show()
		ch.Resize()
	}
	pSetForegroundWindow.Call(srv.hwnd)
	srv.shown = true
	if srv.site != 0 {
		comCall(srv.site, 6)    // ShowObject
		comCall(srv.site, 7, 1) // OnShowWindow(TRUE)
	}
}

func startPage() {
	if srv.pageStarted {
		return
	}
	srv.pageStarted = true
	kd := string(srv.kd)
	srv.w.Dispatch(func() {
		srv.w.Init(embedScript(kd))
		srv.w.Navigate(embedURL)
	})
}

// the page sent a new version of the drawing
func embedUpdate(kd, png, emf []byte, wHi, hHi int32, final bool) {
	srv.kd = kd
	if len(png) > 0 {
		srv.png = png
	}
	srv.wHi, srv.hHi = wHi, hHi
	srv.pic = pictureOf(png, wHi, hHi)
	srv.emf = emf
	srv.pic.emfData = emf
	srv.wHi, srv.hHi = srv.pic.wHi, srv.pic.hHi
	srv.dirty = true
	comCall(srv.dataHolder, 6, ptr(dataObj), 0, 0) // SendOnDataChange: the container's picture follows
	if final {
		saveToContainer()
	}
}

func saveToContainer() {
	if srv.site != 0 && srv.dirty {
		hr := comCall(srv.site, 3) // SaveObject
		logf("SaveObject %x", hr)
		comCall(srv.oleHolder, 7) // SendOnSave
	}
}

// the window is closing (the page has sent its last version)
func finishClose() {
	if srv.closing {
		return
	}
	srv.closing = true
	saveToContainer()
	if srv.site != 0 {
		comCall(srv.site, 7, 0) // OnShowWindow(FALSE)
	}
	comCall(srv.oleHolder, 8) // SendOnClose
	srv.shown = false
	srvQuit()
}

// Word closes the object (the document closes, or it wants the object back)
func closeFromContainer(save bool) {
	if srv.closing {
		return
	}
	tabGone()
	srv.closing = true
	if save {
		saveToContainer()
	}
	if srv.site != 0 && srv.shown {
		comCall(srv.site, 7, 0)
	}
	comCall(srv.oleHolder, 8)
	srv.shown = false
	if srv.hwnd != 0 {
		pShowWindow.Call(srv.hwnd, 0)
	}
	srvDispatch(srvQuit)
}

// close button of an embedded window: let the page send its last version first
func embedCloseRequested() bool {
	if srv.closing {
		return true
	}
	if !srv.pageStarted {
		finishClose()
		return false
	}
	srv.w.Eval("window.__rdFlush?window.__rdFlush():window.__rdPost(JSON.stringify({id:'x',cmd:'embedClose'}))")
	time.AfterFunc(5*time.Second, func() { srvDispatch(finishClose) })
	return false
}

