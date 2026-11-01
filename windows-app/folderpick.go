package main

// The folder dialog of Info → API → Folders for AI assistants (SHBrowseForFolder): the only
// way a folder is added to the list the assistants (reactio-mcp) may use.

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	pSHBrowseForFolderW   = windows.NewLazySystemDLL("shell32.dll").NewProc("SHBrowseForFolderW")
	pSHGetPathFromIDListW = windows.NewLazySystemDLL("shell32.dll").NewProc("SHGetPathFromIDListW")
	pCoTaskMemFree        = ole32.NewProc("CoTaskMemFree")
)

type browseInfo struct {
	hwndOwner      uintptr
	pidlRoot       uintptr
	pszDisplayName *uint16
	lpszTitle      *uint16
	ulFlags        uint32
	lpfn           uintptr
	lParam         uintptr
	iImage         int32
}

func folderDialog(title string) string {
	name := make([]uint16, 260)
	bi := browseInfo{hwndOwner: app.hwnd, pszDisplayName: &name[0], lpszTitle: u16(title), ulFlags: 0x0001 | 0x0040} // BIF_RETURNONLYFSDIRS | BIF_NEWDIALOGSTYLE
	pidl, _, _ := pSHBrowseForFolderW.Call(uintptr(unsafe.Pointer(&bi)))
	if pidl == 0 {
		return ""
	}
	defer pCoTaskMemFree.Call(pidl)
	buf := make([]uint16, 32768)
	if r, _, _ := pSHGetPathFromIDListW.Call(pidl, uintptr(unsafe.Pointer(&buf[0]))); r == 0 {
		return ""
	}
	return windows.UTF16ToString(buf)
}
