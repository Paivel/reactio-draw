package main

// The window: GTK 3 and WebKitGTK, the system's own libraries, loaded at start (purego, no C compiler needed to build).
// WebKitGTK API 4.1 (WebKitGTK 2.40 and newer) or 4.0.

import (
	"errors"
	"sync"
	"unsafe"

	"github.com/ebitengine/purego"
)

var (
	gtk_init                                    func(argc, argv uintptr)
	gtk_window_new                              func(kind int32) uintptr
	gtk_offscreen_window_new                    func() uintptr
	gtk_window_set_title                        func(w uintptr, t string)
	gtk_window_set_default_size                 func(w uintptr, x, y int32)
	gtk_window_maximize                         func(w uintptr)
	gtk_window_set_icon_from_file               func(w uintptr, path string, err uintptr) bool
	gtk_container_add                           func(w, c uintptr)
	gtk_widget_show_all                         func(w uintptr)
	gtk_widget_destroy                          func(w uintptr)
	gtk_main                                    func()
	gtk_main_quit                               func()
	gtk_file_chooser_native_new                 func(title string, parent uintptr, action int32, accept, cancel string) uintptr
	gtk_native_dialog_run                       func(d uintptr) int32
	gtk_file_chooser_get_filename               func(d uintptr) uintptr
	gtk_file_chooser_set_current_name           func(d uintptr, n string)
	gtk_file_chooser_set_do_overwrite_confirm   func(d uintptr, on bool)
	g_object_unref                              func(o uintptr)
	g_signal_connect_data                       func(inst uintptr, sig string, h, data, destroy uintptr, flags int32) uint64
	g_idle_add                                  func(fn, data uintptr) uint32
	g_free                                      func(p uintptr)
	g_set_prgname                               func(n string)
	webkit_user_content_manager_new             func() uintptr
	webkit_user_content_manager_register_script func(ucm uintptr, name string, world uintptr) bool
	webkit_user_content_manager_add_script      func(ucm, script uintptr)
	webkit_user_script_new                      func(src string, frames, when int32, allow, block uintptr) uintptr
	webkit_web_view_new_with_ucm                func(ucm uintptr) uintptr
	webkit_web_view_load_uri                    func(v uintptr, uri string)
	webkit_web_view_get_uri                     func(v uintptr) uintptr
	webkit_nav_decision_get_action              func(d uintptr) uintptr
	webkit_navigation_action_get_request        func(a uintptr) uintptr
	webkit_navigation_action_get_type           func(a uintptr) int32
	webkit_uri_request_get_uri                  func(r uintptr) uintptr
	webkit_policy_decision_ignore               func(d uintptr)
	webkit_web_view_get_settings                func(v uintptr) uintptr
	webkit_settings_set_dev_extras              func(s uintptr, on bool)
	webkit_settings_set_js_clipboard            func(s uintptr, on bool)
	webkit_web_view_evaluate_javascript         func(v uintptr, js string, n int64, world, src, cancel, cb, data uintptr)
	webkit_web_view_run_javascript              func(v uintptr, js string, cancel, cb, data uintptr)
	webkit_javascript_result_get_js_value       func(r uintptr) uintptr
	jsc_value_to_string                         func(v uintptr) uintptr
)

func open(names ...string) (uintptr, error) {
	var last error
	for _, n := range names {
		h, err := purego.Dlopen(n, purego.RTLD_NOW|purego.RTLD_GLOBAL)
		if err == nil {
			return h, nil
		}
		last = err
	}
	return 0, last
}

func sym(lib uintptr, name string) bool { _, err := purego.Dlsym(lib, name); return err == nil }

/* loadGTK: false (with the reason) when GTK 3 or WebKitGTK is not installed */
func loadGTK() error {
	gtk, err := open("libgtk-3.so.0")
	if err != nil {
		return errors.New("GTK 3 is not installed")
	}
	wk, err := open("libwebkit2gtk-4.1.so.0", "libwebkit2gtk-4.0.so.37")
	if err != nil {
		return errors.New("WebKitGTK is not installed (Debian, Ubuntu: sudo apt install libwebkit2gtk-4.1-0; Fedora: sudo dnf install webkit2gtk4.1)")
	}
	jsc, err := open("libjavascriptcoregtk-4.1.so.0", "libjavascriptcoregtk-4.0.so.18")
	if err != nil {
		return errors.New("JavaScriptCoreGTK is not installed")
	}
	gobj, _ := open("libgobject-2.0.so.0")
	glib, _ := open("libglib-2.0.so.0")
	r := purego.RegisterLibFunc
	r(&gtk_init, gtk, "gtk_init")
	r(&gtk_window_new, gtk, "gtk_window_new")
	r(&gtk_offscreen_window_new, gtk, "gtk_offscreen_window_new")
	r(&gtk_window_set_title, gtk, "gtk_window_set_title")
	r(&gtk_window_set_default_size, gtk, "gtk_window_set_default_size")
	r(&gtk_window_maximize, gtk, "gtk_window_maximize")
	r(&gtk_window_set_icon_from_file, gtk, "gtk_window_set_icon_from_file")
	r(&gtk_container_add, gtk, "gtk_container_add")
	r(&gtk_widget_show_all, gtk, "gtk_widget_show_all")
	r(&gtk_widget_destroy, gtk, "gtk_widget_destroy")
	r(&gtk_main, gtk, "gtk_main")
	r(&gtk_main_quit, gtk, "gtk_main_quit")
	r(&gtk_file_chooser_native_new, gtk, "gtk_file_chooser_native_new")
	r(&gtk_native_dialog_run, gtk, "gtk_native_dialog_run")
	r(&gtk_file_chooser_get_filename, gtk, "gtk_file_chooser_get_filename")
	r(&gtk_file_chooser_set_current_name, gtk, "gtk_file_chooser_set_current_name")
	r(&gtk_file_chooser_set_do_overwrite_confirm, gtk, "gtk_file_chooser_set_do_overwrite_confirmation")
	r(&g_object_unref, gobj, "g_object_unref")
	r(&g_signal_connect_data, gobj, "g_signal_connect_data")
	r(&g_idle_add, glib, "g_idle_add")
	r(&g_free, glib, "g_free")
	r(&g_set_prgname, glib, "g_set_prgname")
	r(&webkit_user_content_manager_new, wk, "webkit_user_content_manager_new")
	r(&webkit_user_content_manager_register_script, wk, "webkit_user_content_manager_register_script_message_handler")
	r(&webkit_user_content_manager_add_script, wk, "webkit_user_content_manager_add_script")
	r(&webkit_user_script_new, wk, "webkit_user_script_new")
	r(&webkit_web_view_new_with_ucm, wk, "webkit_web_view_new_with_user_content_manager")
	r(&webkit_web_view_load_uri, wk, "webkit_web_view_load_uri")
	r(&webkit_web_view_get_uri, wk, "webkit_web_view_get_uri")
	r(&webkit_nav_decision_get_action, wk, "webkit_navigation_policy_decision_get_navigation_action")
	r(&webkit_navigation_action_get_request, wk, "webkit_navigation_action_get_request")
	r(&webkit_navigation_action_get_type, wk, "webkit_navigation_action_get_navigation_type")
	r(&webkit_uri_request_get_uri, wk, "webkit_uri_request_get_uri")
	r(&webkit_policy_decision_ignore, wk, "webkit_policy_decision_ignore")
	r(&webkit_web_view_get_settings, wk, "webkit_web_view_get_settings")
	r(&webkit_settings_set_dev_extras, wk, "webkit_settings_set_enable_developer_extras")
	r(&webkit_settings_set_js_clipboard, wk, "webkit_settings_set_javascript_can_access_clipboard")
	if sym(wk, "webkit_web_view_evaluate_javascript") {
		r(&webkit_web_view_evaluate_javascript, wk, "webkit_web_view_evaluate_javascript")
	} else {
		r(&webkit_web_view_run_javascript, wk, "webkit_web_view_run_javascript")
	}
	if sym(wk, "webkit_javascript_result_get_js_value") {
		r(&webkit_javascript_result_get_js_value, wk, "webkit_javascript_result_get_js_value")
	}
	r(&jsc_value_to_string, jsc, "jsc_value_to_string")
	return nil
}

/* a C string the library gave us, as a Go string (the library's copy is freed) */
func goString(p uintptr, free bool) string {
	if p == 0 {
		return ""
	}
	var b []byte
	for i := uintptr(0); ; i++ {
		c := *(*byte)(unsafe.Pointer(p + i))
		if c == 0 {
			break
		}
		b = append(b, c)
	}
	if free {
		g_free(p)
	}
	return string(b)
}

/* work for the GTK thread: queued from any goroutine, run from the main loop */
var (
	qMu   sync.Mutex
	queue []func()
	idleCB uintptr
)

func dispatch(f func()) {
	qMu.Lock()
	queue = append(queue, f)
	qMu.Unlock()
	g_idle_add(idleCB, 0)
}

func runQueue(uintptr) uintptr {
	qMu.Lock()
	q := queue
	queue = nil
	qMu.Unlock()
	for _, f := range q {
		f()
	}
	return 0 // G_SOURCE_REMOVE
}

func evalJS(js string) {
	if webkit_web_view_evaluate_javascript != nil {
		webkit_web_view_evaluate_javascript(app.view, js, -1, 0, 0, 0, 0, 0)
	} else {
		webkit_web_view_run_javascript(app.view, js, 0, 0, 0)
	}
}

/* a folder dialog (Settings → Folders for AI assistants); "" when cancelled */
func folderDialog(title string) string {
	d := gtk_file_chooser_native_new(title, app.win, 2, "_Select", "_Cancel") // GTK_FILE_CHOOSER_ACTION_SELECT_FOLDER
	path := ""
	if gtk_native_dialog_run(d) == -3 {
		path = goString(gtk_file_chooser_get_filename(d), true)
	}
	g_object_unref(d)
	return path
}

/* a file dialog (GtkFileChooserNative: the desktop's own dialog where there is one); "" when cancelled */
func fileDialog(save bool, title, name string) string {
	action, accept := int32(0), "_Open"
	if save {
		action, accept = 1, "_Save"
	}
	d := gtk_file_chooser_native_new(title, app.win, action, accept, "_Cancel")
	if save {
		gtk_file_chooser_set_do_overwrite_confirm(d, true)
		if name != "" {
			gtk_file_chooser_set_current_name(d, name)
		}
	}
	path := ""
	if gtk_native_dialog_run(d) == -3 { // GTK_RESPONSE_ACCEPT
		path = goString(gtk_file_chooser_get_filename(d), true)
	}
	g_object_unref(d)
	return path
}
