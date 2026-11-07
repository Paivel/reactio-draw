package main

// The object server's own message loop: started by Word (-Embedding), Reactio Draw answers Word at once (load the
// drawing, give its picture, close) without starting WebView2, which on some computers takes long or does not start at
// all in a process Word starts (Word then waits half a minute for every try and pastes a picture in the end). WebView2
// starts only when the drawing needs a window of its own (opened with no Reactio Draw window to take it in a tab).

import (
	"sync"
	"unsafe"
)

var (
	pGetMessageW        = user32.NewProc("GetMessageW")
	pPeekMessageW       = user32.NewProc("PeekMessageW")
	pTranslateMessage   = user32.NewProc("TranslateMessage")
	pDispatchMessageW   = user32.NewProc("DispatchMessageW")
	pPostThreadMessageW = user32.NewProc("PostThreadMessageW")
	pGetCurrentThreadId = kernel32.NewProc("GetCurrentThreadId")
)

const wmApp = 0x8000

type winMsg struct {
	hwnd     uintptr
	message  uint32
	_        uint32
	wParam   uintptr
	lParam   uintptr
	time     uint32
	pt       [2]int32
	lPrivate uint32
}

var pump struct {
	m          sync.Mutex
	q          []func()
	tid        uintptr
	done       bool
	wantWindow bool
}

// the thread's message queue, made before anything can be posted to it
func pumpInit() {
	var m winMsg
	pPeekMessageW.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0, 0)
	pump.tid, _, _ = pGetCurrentThreadId.Call()
}

func pumpWake() {
	pPostThreadMessageW.Call(pump.tid, wmApp, 0, 0)
}

// run f on the server's thread: through WebView2's queue once there is a window, through this loop before
func srvDispatch(f func()) {
	if srv.w != nil {
		srv.w.Dispatch(f)
		return
	}
	pump.m.Lock()
	pump.q = append(pump.q, f)
	pump.m.Unlock()
	pumpWake()
}

func pumpDrain() {
	pump.m.Lock()
	q := pump.q
	pump.q = nil
	pump.m.Unlock()
	for _, f := range q {
		f()
	}
}

// the server is done: its window closed, or (no window yet) the loop ends
func srvQuit() {
	if srv.w != nil {
		pDestroyWindow.Call(srv.hwnd)
		return
	}
	pump.done = true
	pumpWake()
}

// Word's calls come in through this loop (COM's own window on this thread); it ends when the server is done, or when the
// drawing needs a window of its own
func serverPump() {
	var m winMsg
	for !pump.done && !pump.wantWindow {
		r, _, _ := pGetMessageW.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0)
		if r == 0 || int32(r) == -1 {
			pump.done = true
			break
		}
		if m.hwnd == 0 && m.message == wmApp {
			pumpDrain()
			continue
		}
		pTranslateMessage.Call(uintptr(unsafe.Pointer(&m)))
		pDispatchMessageW.Call(uintptr(unsafe.Pointer(&m)))
	}
}
