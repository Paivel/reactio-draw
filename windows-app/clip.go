package main

// The clipboard: Reactio Draw objects for Word and PowerPoint, and reading them back.

import (
	"archive/zip"
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"
	"time"
	"unicode/utf16"
	"unsafe"

	"golang.org/x/sys/windows"
)

var pGetHGlobalFromILockBytes = ole32.NewProc("GetHGlobalFromILockBytes")

func openClipboard(hwnd uintptr) bool {
	for i := 0; i < 20; i++ {
		if r, _, _ := pOpenClipboard.Call(hwnd); r != 0 {
			return true
		}
		time.Sleep(50 * time.Millisecond)
	}
	return false
}

// a compound file in an HGLOBAL with a Reactio Draw object (what the clipboard calls "Embed Source")
func storageGlobal() (uintptr, error) {
	var lb, stg uintptr
	if hr, _, _ := pCreateILockBytesOnHGlobal.Call(0, 0, uintptr(unsafe.Pointer(&lb))); failed(hr) {
		return 0, errors.New("no memory for the object")
	}
	defer release(lb)
	if hr, _, _ := pStgCreateDocfileOnILockBytes.Call(lb, 0x1012, 0, uintptr(unsafe.Pointer(&stg))); failed(hr) {
		return 0, errors.New("could not create the object")
	}
	ok := writeNative(stg, true)
	comCall(stg, 9, 0) // Commit
	release(stg)
	if !ok {
		return 0, errors.New("could not write the object")
	}
	var hg uintptr
	pGetHGlobalFromILockBytes.Call(lb, uintptr(unsafe.Pointer(&hg)))
	return hg, nil
}

// OBJECTDESCRIPTOR (oleidl.h) with the user type and the source
func objectDescriptor(wHi, hHi int32) []byte {
	name := append(utf16.Encode([]rune(userType)), 0)
	src := append(utf16.Encode([]rune(appName)), 0)
	b := make([]byte, 52+2*len(name)+2*len(src))
	le := binary.LittleEndian
	le.PutUint32(b[0:], uint32(len(b)))
	copy(b[4:20], (*[16]byte)(unsafe.Pointer(&CLSID_RD))[:])
	le.PutUint32(b[20:], 1) // DVASPECT_CONTENT
	le.PutUint32(b[24:], uint32(wHi))
	le.PutUint32(b[28:], uint32(hHi))
	le.PutUint32(b[40:], 0)  // status
	le.PutUint32(b[44:], 52) // full user type name
	le.PutUint32(b[48:], uint32(52+2*len(name)))
	for i, c := range name {
		le.PutUint16(b[52+2*i:], c)
	}
	for i, c := range src {
		le.PutUint16(b[52+2*len(name)+2*i:], c)
	}
	return b
}

// copy a drawing: the object (Word, PowerPoint), its picture (anything else) and binary CDX (chemistry editors).
// It goes through the OLE clipboard (OleSetClipboard + OleFlushClipboard): only then does Windows record that
// "Embed Source" is a storage, which is what Word needs to paste an object rather than a picture.
// https://learn.microsoft.com/windows/win32/api/ole2/nf-ole2-olesetclipboard
func clipOle(hwnd uintptr, kd, png, emf, cdx []byte, wHi, hHi int32) error {
	pic := pictureOf(png, wHi, hHi)
	pic.emfData = emf
	cb := &clipData{kd: kd, pic: pic, png: png, emf: emf, cdx: cdx}
	cb.fmts = []fmtEntry{
		{clipFormat("Embed Source"), TYMED_ISTORAGE},
		{clipFormat("Object Descriptor"), TYMED_HGLOBAL},
		{CF_ENHMETAFILE, TYMED_ENHMF}, // vector; Windows makes the old metafile format from it when asked
	}
	/* no PNG or DIB here: Word's Ctrl+V prefers those to the object */
	if len(cdx) > 0 {
		cb.fmts = append(cb.fmts, fmtEntry{clipFormat("ChemDraw Interchange Format"), TYMED_HGLOBAL})
	}
	clipInit()
	clipCur = cb
	var hr uintptr
	for i := 0; i < 20; i++ {
		hr, _, _ = pOleSetClipboard.Call(ptr(clipObj))
		if !failed(hr) {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	if failed(hr) {
		return fmt.Errorf("the clipboard is busy (%x)", hr)
	}
	hr, _, _ = pOleFlushClipboard.Call() // everything rendered now: the copy stays when Reactio Draw closes
	logf("clipboard: object %d bytes, picture %dx%d, flush %x", len(kd), pic.pw, pic.ph, hr)
	return nil
}

type fmtEntry struct {
	cf    uint32
	tymed uint32
}

type clipData struct {
	kd, png, emf, cdx []byte
	pic               *picture
	fmts              []fmtEntry
}

var (
	pOleSetClipboard       = ole32.NewProc("OleSetClipboard")
	pOleFlushClipboard     = ole32.NewProc("OleFlushClipboard")
	pSHCreateStdEnumFmtEtc = windows.NewLazySystemDLL("shell32.dll").NewProc("SHCreateStdEnumFmtEtc")
	clipObj                = &comObj{}
	vtClip                 [12]uintptr
	clipCur                *clipData
	clipRefs               int
	clipReady              bool
)

// the drawing's storage (Reactio Draw class, \1Ole, RDData, RDSize) written into stg
func (c *clipData) writeTo(stg uintptr) bool {
	saved := struct {
		kd       []byte
		wHi, hHi int32
	}{srv.kd, srv.wHi, srv.hHi}
	savedPng, savedEmf := srv.png, srv.emf
	srv.kd, srv.png, srv.emf, srv.wHi, srv.hHi = c.kd, c.png, c.emf, c.pic.wHi, c.pic.hHi
	ok := writeNative(stg, true)
	srv.kd, srv.png, srv.emf, srv.wHi, srv.hHi = saved.kd, savedPng, savedEmf, saved.wHi, saved.hHi
	comCall(stg, 9, 0) // Commit
	return ok
}

func (c *clipData) find(pfe uintptr) (fmtEntry, bool) {
	cf, tymed := formatOf(pfe)
	for _, f := range c.fmts {
		if uint32(cf) == f.cf && tymed&f.tymed != 0 {
			return f, true
		}
	}
	return fmtEntry{}, false
}

func clipInit() {
	if clipReady {
		return
	}
	clipReady = true
	vtClip = [12]uintptr{
		windows.NewCallback(func(this, riid, ppv uintptr) uintptr { // QueryInterface
			if ppv == 0 {
				return E_POINTER
			}
			g := guidAt(riid)
			if g == IID_IUnknown || g == IID_IDataObject {
				putPtr(ppv, this)
				clipRefs++
				return S_OK
			}
			putPtr(ppv, 0)
			return E_NOINTERFACE
		}),
		windows.NewCallback(func(this uintptr) uintptr { clipRefs++; return uintptr(clipRefs) }),
		windows.NewCallback(func(this uintptr) uintptr {
			if clipRefs > 0 {
				clipRefs--
			}
			return uintptr(clipRefs)
		}),
		windows.NewCallback(func(this, pfe, pmed uintptr) uintptr { // GetData
			c := clipCur
			if c == nil || pfe == 0 || pmed == 0 {
				return DV_E_FORMATETC
			}
			f, ok := c.find(pfe)
			if !ok {
				return DV_E_FORMATETC
			}
			var h uintptr
			switch {
			case f.tymed == TYMED_ISTORAGE:
				var lb, stg uintptr
				pCreateILockBytesOnHGlobal.Call(0, 1, uintptr(unsafe.Pointer(&lb)))
				if hr, _, _ := pStgCreateDocfileOnILockBytes.Call(lb, 0x1012, 0, uintptr(unsafe.Pointer(&stg))); failed(hr) {
					release(lb)
					return E_OUTOFMEMORY
				}
				release(lb)
				c.writeTo(stg)
				h = stg
			case f.cf == CF_METAFILEPICT:
				h = c.pic.mfpict()
			case f.cf == CF_ENHMETAFILE:
				h = c.pic.emf()
			case f.cf == CF_DIB:
				h = globalOf(c.pic.dib)
			case f.cf == clipFormat("Object Descriptor"):
				h = globalOf(objectDescriptor(c.pic.wHi, c.pic.hHi))
			case f.cf == clipFormat("PNG"):
				h = globalOf(c.png)
			default:
				h = globalOf(c.cdx)
			}
			if h == 0 {
				return E_OUTOFMEMORY
			}
			*(*uint32)(unsafe.Pointer(pmed)) = f.tymed
			*(*uintptr)(unsafe.Pointer(pmed + 8)) = h
			*(*uintptr)(unsafe.Pointer(pmed + 16)) = 0
			return S_OK
		}),
		windows.NewCallback(func(this, pfe, pmed uintptr) uintptr { // GetDataHere: the storage, into the caller's
			c := clipCur
			if c == nil || pfe == 0 || pmed == 0 {
				return DV_E_FORMATETC
			}
			f, ok := c.find(pfe)
			if !ok || f.tymed != TYMED_ISTORAGE || *(*uint32)(unsafe.Pointer(pmed)) != TYMED_ISTORAGE {
				return DV_E_FORMATETC
			}
			stg := *(*uintptr)(unsafe.Pointer(pmed + 8))
			if stg == 0 || !c.writeTo(stg) {
				return E_FAIL
			}
			return S_OK
		}),
		windows.NewCallback(func(this, pfe uintptr) uintptr { // QueryGetData
			if c := clipCur; c != nil {
				if _, ok := c.find(pfe); ok {
					return S_OK
				}
			}
			return DV_E_FORMATETC
		}),
		windows.NewCallback(func(this, pin, pout uintptr) uintptr { // GetCanonicalFormatEtc
			if pout != 0 {
				*(*uintptr)(unsafe.Pointer(pout + 8)) = 0
			}
			return 0x00040130 // DATA_S_SAMEFORMATETC
		}),
		windows.NewCallback(func(this, pfe, pmed, rel uintptr) uintptr { return E_NOTIMPL }), // SetData
		windows.NewCallback(func(this, dir, pp uintptr) uintptr { // EnumFormatEtc
			c := clipCur
			if dir != 1 || c == nil { // DATADIR_GET only
				putPtr(pp, 0)
				return E_NOTIMPL
			}
			fe := make([]byte, 32*len(c.fmts))
			for i, f := range c.fmts {
				o := i * 32
				binary.LittleEndian.PutUint16(fe[o:], uint16(f.cf))
				binary.LittleEndian.PutUint32(fe[o+16:], 1)          // DVASPECT_CONTENT
				binary.LittleEndian.PutUint32(fe[o+20:], 0xFFFFFFFF) // lindex -1
				binary.LittleEndian.PutUint32(fe[o+24:], f.tymed)
			}
			hr, _, _ := pSHCreateStdEnumFmtEtc.Call(uintptr(len(c.fmts)), uintptr(unsafe.Pointer(&fe[0])), pp)
			return hr
		}),
		windows.NewCallback(func(this, pfe, advf, sink, pdw uintptr) uintptr { return 0x80040003 }), // DAdvise: OLE_E_ADVISENOTSUPPORTED
		windows.NewCallback(func(this, dw uintptr) uintptr { return 0x80040003 }),
		windows.NewCallback(func(this, pp uintptr) uintptr { return 0x80040003 }),
	}
	clipObj.vtbl = uintptr(unsafe.Pointer(&vtClip[0]))
}

// a picture made by Reactio Draw on a Mac, copied in Word: Office's picture format (GVML, a zip) keeps its alt text,
// which carries the drawing (RDRAW1:...)
func clipOwnTag(hwnd uintptr) string {
	if !openClipboard(hwnd) {
		return ""
	}
	cf := clipFormat("Art::GVML ClipFormat")
	var b []byte
	if r, _, _ := pIsClipboardFormatAvailable.Call(uintptr(cf)); r != 0 {
		if h, _, _ := pGetClipboardData.Call(uintptr(cf)); h != 0 {
			b = globalBytes(h)
		}
	}
	var pngB []byte
	if pf := clipFormat("PNG"); true {
		if r, _, _ := pIsClipboardFormatAvailable.Call(uintptr(pf)); r != 0 {
			if h, _, _ := pGetClipboardData.Call(uintptr(pf)); h != 0 {
				pngB = globalBytes(h)
			}
		}
	}
	pCloseClipboard.Call()
	if len(b) == 0 {
		if m := tagRe.Find(pngB); m != nil {
			return string(m)
		}
		return ""
	}
	z, err := zip.NewReader(bytes.NewReader(b), int64(len(b)))
	if err != nil {
		logf("GVML: %v", err)
		return ""
	}
	// the alt text in the drawing XML (Word), or the picture file's own text chunk (PowerPoint drops alt text)
	for _, f := range z.File {
		if !strings.HasSuffix(f.Name, ".xml") && !strings.Contains(f.Name, "/media/") {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			continue
		}
		x, _ := io.ReadAll(rc)
		rc.Close()
		if m := tagRe.Find(x); m != nil {
			return string(m)
		}
	}
	if m := tagRe.Find(pngB); m != nil {
		return string(m)
	}
	return ""
}

var tagRe = regexp.MustCompile(`RDRAW1:[A-Za-z0-9+/=]+`)

// a Reactio Draw object copied from Word (or from Reactio Draw): the compound file bytes
func clipOwn(hwnd uintptr) []byte {
	if !openClipboard(hwnd) {
		return nil
	}
	defer pCloseClipboard.Call()
	for _, name := range []string{"Embedded Object", "Embed Source"} {
		cf := clipFormat(name)
		if r, _, _ := pIsClipboardFormatAvailable.Call(uintptr(cf)); r == 0 {
			continue
		}
		h, _, _ := pGetClipboardData.Call(uintptr(cf))
		if h == 0 {
			continue
		}
		b := globalBytes(h)
		if len(b) > 512 && b[0] == 0xD0 && b[1] == 0xCF && b[2] == 0x11 && b[3] == 0xE0 {
			return b
		}
	}
	return nil
}

// a picture on the clipboard with no drawing (a screenshot: Win+Shift+S, Print Screen, the Snipping Tool): its PNG when
// there is one, otherwise the bitmap (CF_DIB) made into a .bmp file, for the page to place as a picture
func clipPicture(hwnd uintptr) ([]byte, string) {
	if !openClipboard(hwnd) {
		return nil, ""
	}
	defer pCloseClipboard.Call()
	if pf := clipFormat("PNG"); pf != 0 {
		if r, _, _ := pIsClipboardFormatAvailable.Call(uintptr(pf)); r != 0 {
			if h, _, _ := pGetClipboardData.Call(uintptr(pf)); h != 0 {
				if b := globalBytes(h); len(b) > 8 && string(b[1:4]) == "PNG" {
					return b, "image/png"
				}
			}
		}
	}
	if r, _, _ := pIsClipboardFormatAvailable.Call(CF_DIB); r == 0 {
		return nil, ""
	}
	h, _, _ := pGetClipboardData.Call(CF_DIB)
	if h == 0 {
		return nil, ""
	}
	dib := globalBytes(h)
	if len(dib) < 40 {
		return nil, ""
	}
	le32 := func(o int) uint32 {
		return uint32(dib[o]) | uint32(dib[o+1])<<8 | uint32(dib[o+2])<<16 | uint32(dib[o+3])<<24
	}
	hdr := le32(0)
	bits := uint32(dib[14]) | uint32(dib[15])<<8
	comp := le32(16)
	used := le32(32)
	pal := uint32(0)
	if bits <= 8 {
		pal = used
		if pal == 0 {
			pal = 1 << bits
		}
	}
	off := 14 + hdr + pal*4
	if comp == 3 && hdr == 40 {
		off += 12 // BI_BITFIELDS: the three colour masks after the header
	}
	size := uint32(14 + len(dib))
	f := make([]byte, 14, size)
	f[0], f[1] = 'B', 'M'
	for i, v := range []uint32{size, 0, off} {
		f[2+i*4], f[3+i*4], f[4+i*4], f[5+i*4] = byte(v), byte(v>>8), byte(v>>16), byte(v>>24)
	}
	return append(f, dib...), "image/bmp"
}

// the binary CDX clipboard format, put there by chemistry editors on Ctrl+C (its registered name is the format's own)
func clipCdx(hwnd uintptr) []byte {
	if !openClipboard(hwnd) {
		return nil
	}
	defer pCloseClipboard.Call()
	cf := clipFormat("ChemDraw Interchange Format")
	if r, _, _ := pIsClipboardFormatAvailable.Call(uintptr(cf)); r == 0 {
		return nil
	}
	h, _, _ := pGetClipboardData.Call(uintptr(cf))
	if h == 0 {
		return nil
	}
	b := globalBytes(h)
	if len(b) > 30 && string(b[:8]) == "VjCD0100" {
		return b
	}
	return nil
}
