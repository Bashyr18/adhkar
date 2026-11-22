//! Adhkar-Setup.exe: installs Adhkār the way Windows programs are installed, for the person signed in and without
//! administrator rights. One window, four moments (what will happen, the copy, done, or what went wrong), drawn by
//! page.html in the app's own fonts and colours, light or dark and English or Arabic as Windows is set.
//!   Adhkar-Setup.exe                          the window
//!   Adhkar-Setup.exe /S [--no-desktop] [--open] installs with the usual choices and no window (scripts and testing)
//! ADHKAR_SETUP_LANG, ADHKAR_SETUP_THEME and ADHKAR_SETUP_STAGE choose a look for the guide's pictures; ADHKAR_INSTALL_ROOT
//! installs into a test folder instead of the real one.
#![windows_subsystem = "windows"]

use std::cell::{Cell, RefCell};
use std::rc::Rc;

use base64::Engine;
use serde_json::{json, Value};
use webview2_com::Microsoft::Web::WebView2::Win32::*;
use webview2_com::*;
use windows::core::{Interface, PCWSTR, PWSTR};
use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Gdi::*;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Threading::CreateMutexW;
use windows::Win32::UI::HiDpi::*;
use windows::Win32::UI::WindowsAndMessaging::*;

use adhkar_common::{self as ac, h, installer, js, take_pwstr, Web};

const VERSION: &str = env!("ADHKAR_VERSION");
static PAYLOAD: &[u8] = include_bytes!(env!("ADHKAR_PAYLOAD"));
static PAGE: &str = include_str!("page.html");
/* the app's own faces: Quicksand for the words, Amiri for its Arabic name, IBM Plex Arabic for Arabic words */
static FONTS: [(&str, &str, &str, &[u8]); 4] = [
    ("Quicksand", "400 700", "U+0000-00FF, U+2000-206F", include_bytes!("../../../web/fonts/Quicksand-400-700-latin.woff2")),
    ("Quicksand", "400 700", "U+0100-02BA, U+02BD-02C5, U+02C7-02FF, U+1E00-1EFF", include_bytes!("../../../web/fonts/Quicksand-400-700-latin-ext.woff2")),
    ("Amiri", "700", "U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF", include_bytes!("../../../web/fonts/Amiri-700-arabic.woff2")),
    ("Plex", "400 700", "U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF, U+0020-007E", include_bytes!("../../../web/fonts/PlexArabic-600.woff2")),
];

struct St { web: RefCell<Option<Web>>, copying: Cell<bool>, dark: bool }
thread_local! { static ST: RefCell<Option<Rc<St>>> = const { RefCell::new(None) }; }
fn st() -> Option<Rc<St>> { ST.with(|s| s.borrow().clone()) }
fn say(script: String) { ac::post(move || if let Some(s) = st() { if let Some(w) = s.web.borrow().as_ref() { ac::exec(&w.view, &script, None); } }); }
const BG_DARK: u32 = 0x090a10;
const BG_LIGHT: u32 = 0xfaf7f1;

extern "system" fn wndproc(hwnd: HWND, msg: u32, wp: WPARAM, lp: LPARAM) -> LRESULT {
    unsafe {
        match msg {
            ac::WM_APP_RUN => { ac::run_jobs(); LRESULT(0) }
            WM_ERASEBKGND => {
                let mut r = RECT::default(); let _ = GetClientRect(hwnd, &mut r);
                let b = CreateSolidBrush(COLORREF(ac::rgb(if st().map(|s| s.dark).unwrap_or(true) { BG_DARK } else { BG_LIGHT })));
                FillRect(HDC(wp.0 as _), &r, b); let _ = DeleteObject(b.into());
                LRESULT(1)
            }
            WM_SIZE => { if let Some(s) = st() { if let Some(w) = s.web.borrow().as_ref() { let _ = w.controller.SetBounds(ac::client_rect(hwnd)); } } LRESULT(0) }
            WM_SETFOCUS => { if let Some(s) = st() { if let Some(w) = s.web.borrow().as_ref() { let _ = w.controller.MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC); } } LRESULT(0) }
            WM_DPICHANGED => {
                let r = &*(lp.0 as *const RECT);
                let _ = SetWindowPos(hwnd, None, r.left, r.top, r.right - r.left, r.bottom - r.top, SWP_NOZORDER | SWP_NOACTIVATE);
                LRESULT(0)
            }
            WM_CLOSE => {
                if st().map(|s| s.copying.get()).unwrap_or(false) { return LRESULT(0); }   /* never half an install */
                if let Some(s) = st() { if let Some(w) = s.web.borrow_mut().take() { let _ = w.controller.Close(); } }
                let _ = DestroyWindow(hwnd);
                LRESULT(0)
            }
            WM_DESTROY => { PostQuitMessage(0); LRESULT(0) }
            _ => DefWindowProcW(hwnd, msg, wp, lp),
        }
    }
}

fn install(desk: bool, boot: bool) {
    std::thread::spawn(move || {
        ac::com_init();
        say("Setup.progress(0.02)".into());
        installer::close_running(8000);
        let r = installer::install(installer::From::Bytes(PAYLOAD), desk, VERSION, &|p| say(format!("Setup.progress({})", 0.05 + p * 0.95)));
        match r {
            Ok(()) => {
                installer::start_with_windows(boot, &installer::exe());
                ac::post(|| if let Some(s) = st() { s.copying.set(false) });
                say("Setup.done()".into());
            }
            Err(e) => {
                ac::post(|| if let Some(s) = st() { s.copying.set(false) });
                say(format!("Setup.error({})", js(&format!("Copying the app: {}", e))));
            }
        }
    });
}
fn open_app() {
    let dir = installer::dir().to_string_lossy().into_owned();
    ac::spawn(&installer::exe().to_string_lossy(), "", Some(&dir), false);
}
fn message(hwnd: HWND, text: String) {
    let v: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
    match v["do"].as_str() {
        Some("install") => {
            if let Some(s) = st() { s.copying.set(true); }
            install(v["desk"].as_bool().unwrap_or(true), v["boot"].as_bool().unwrap_or(false));
        }
        Some("open") => { open_app(); unsafe { let _ = PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0)); } }
        Some("close") => unsafe { let _ = PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0)); },
        _ => {}
    }
}

/* without WebView2 the window cannot be drawn: Windows' own question instead, and the same install */
fn plain() {
    if ac::msgbox(None, &format!("Install Adhkār {} on this computer?\n\nIt installs for you, in {}, with a shortcut in Start and on the desktop.", VERSION, installer::dir().display()), MB_OKCANCEL | MB_ICONQUESTION) != IDOK { return; }
    installer::close_running(8000);
    match installer::install(installer::From::Bytes(PAYLOAD), true, VERSION, &|_| {}) {
        Ok(()) => {
            if ac::msgbox(None, "Adhkār is installed.\n\nIt also needs Microsoft Edge WebView2, a free part of Windows that is missing here. Open Microsoft's page to install it?", MB_YESNO | MB_ICONINFORMATION) == IDYES {
                ac::shell_open("https://developer.microsoft.com/microsoft-edge/webview2/#download");
            }
        }
        Err(e) => { ac::msgbox(None, &format!("Adhkār could not be installed. Nothing was changed.\n\n{}", e), MB_OK | MB_ICONERROR); }
    }
}

fn fonts_css() -> String {
    FONTS.iter().map(|(f, w, r, b)| format!("@font-face {{ font-family: '{}'; font-weight: {}; font-display: block; unicode-range: {}; src: url(data:font/woff2;base64,{}) format('woff2'); }}\n", f, w, r, base64::engine::general_purpose::STANDARD.encode(b))).collect()
}

fn main() {
    ac::dpi_aware();
    ac::com_init();
    let args: Vec<String> = std::env::args().skip(1).collect();
    let has = |f: &str| args.iter().any(|a| a == f);
    let _m = unsafe { CreateMutexW(None, true, &h("Local\\Adhkar.Setup")) };
    if unsafe { GetLastError() } == ERROR_ALREADY_EXISTS { return; }
    if has("/S") || has("--silent") {
        installer::close_running(8000);
        let r = installer::install(installer::From::Bytes(PAYLOAD), !has("--no-desktop"), VERSION, &|_| {});
        if r.is_ok() && has("--open") { open_app(); }
        std::process::exit(if r.is_ok() { 0 } else { 1 });
    }
    if ac::webview_version().is_none() { plain(); return; }

    let ar = ac::env("ADHKAR_SETUP_LANG").map(|l| l == "ar").unwrap_or_else(ac::system_arabic);
    let dark = ac::env("ADHKAR_SETUP_THEME").map(|t| t == "dark").unwrap_or_else(ac::system_dark);
    let stage = ac::env("ADHKAR_SETUP_STAGE");
    let have = if stage.is_none() && installer::installed() { installer::installed_version() } else { None };
    let s = Rc::new(St { web: RefCell::new(None), copying: Cell::new(false), dark });
    ST.with(|x| *x.borrow_mut() = Some(s.clone()));

    let (cw, chh) = (720.0, 470.0);
    let hwnd = unsafe {
        let inst = GetModuleHandleW(None).unwrap();
        let class = h("AdhkarSetup");
        let wc = WNDCLASSEXW { cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32, lpfnWndProc: Some(wndproc), hInstance: inst.into(), hIcon: ac::app_icon(32), hIconSm: ac::app_icon(16),
            hCursor: LoadCursorW(None, IDC_ARROW).unwrap_or_default(), lpszClassName: PCWSTR(class.as_ptr()), ..Default::default() };
        RegisterClassExW(&wc);
        let style = WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX;
        let hwnd = CreateWindowExW(WINDOW_EX_STYLE(0), &class, &h(if ar { "تثبيت أذكار" } else { "Adhkār Setup" }), style, CW_USEDEFAULT, CW_USEDEFAULT, 800, 520, None, None, Some(inst.into()), None).unwrap();
        /* 720 × 470 of the page, at this screen's scale, in the middle of the screen */
        let dpi = GetDpiForWindow(hwnd);
        let k = dpi as f64 / 96.0;
        let mut r = RECT { left: 0, top: 0, right: (cw * k) as i32, bottom: (chh * k) as i32 };
        let _ = AdjustWindowRectExForDpi(&mut r, style, false, WINDOW_EX_STYLE(0), dpi);
        let (w, hh) = (r.right - r.left, r.bottom - r.top);
        let mut wa = RECT::default();
        let _ = SystemParametersInfoW(SPI_GETWORKAREA, 0, Some(&mut wa as *mut RECT as _), SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0));
        let _ = SetWindowPos(hwnd, None, wa.left + ((wa.right - wa.left) - w) / 2, wa.top + ((wa.bottom - wa.top) - hh) / 2, w, hh, SWP_NOZORDER);
        hwnd
    };
    ac::set_ui(hwnd);
    let bg = if dark { BG_DARK } else { BG_LIGHT };
    ac::caption(hwnd, dark, bg, if dark { 0xf5f0e7 } else { 0x1c1812 });

    let data = std::env::temp_dir().join("Adhkar-Setup-webview");
    #[cfg(debug_assertions)]
    let dbg = ac::env("ADHKAR_DEBUG_PORT").and_then(|p| p.parse::<u16>().ok()).map(|p| format!(" --remote-debugging-port={}", p)).unwrap_or_default();
    #[cfg(not(debug_assertions))]
    let dbg = String::new();
    let web = match ac::create_web(hwnd, &data.to_string_lossy(), &format!("--disable-features=msSmartScreenProtection{}", dbg)) {
        Ok(w) => w,
        Err(_) => { unsafe { let _ = DestroyWindow(hwnd); } plain(); return; }
    };
    ac::set_background(&web.controller, bg);
    unsafe {
        if let Ok(st) = web.view.Settings() {
            let _ = st.SetAreDevToolsEnabled(!dbg.is_empty());
            let _ = st.SetAreDefaultContextMenusEnabled(false);
            let _ = st.SetIsStatusBarEnabled(false);
            let _ = st.SetIsZoomControlEnabled(false);
            if let Ok(s3) = st.cast::<ICoreWebView2Settings3>() { let _ = s3.SetAreBrowserAcceleratorKeysEnabled(false); }
        }
        let mut t = Default::default();
        let _ = web.view.add_WebMessageReceived(&WebMessageReceivedEventHandler::create(Box::new(move |_, a| {
            if let Some(a) = a { let mut p = PWSTR::null(); if a.TryGetWebMessageAsString(&mut p).is_ok() { let m = take_pwstr(p); ac::later(move || message(hwnd, m)); } }
            Ok(())
        })), &mut t);
        let _ = web.view.add_NavigationStarting(&NavigationStartingEventHandler::create(Box::new(|_, a| {
            if let Some(a) = a { let mut p = PWSTR::null(); let _ = a.Uri(&mut p); let u = take_pwstr(p); if !u.starts_with("data:") && !u.starts_with("about:") { let _ = a.SetCancel(true); } }
            Ok(())
        })), &mut t);
        /* the keyboard starts on the page, on its main button: Enter installs */
        let _ = web.view.add_NavigationCompleted(&NavigationCompletedEventHandler::create(Box::new(|_, _| {
            ac::later(|| if let Some(s) = st() { if let Some(w) = s.web.borrow().as_ref() {
                let _ = w.controller.MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);
                ac::exec(&w.view, "var g=document.getElementById('go');g&&!document.getElementById('start').hidden&&g.focus()", None);
            } });
            Ok(())
        })), &mut t);
    }
    let path = installer::dir().to_string_lossy().into_owned();
    let home = ac::env("USERPROFILE").unwrap_or_default();
    let path = if !home.is_empty() && path.starts_with(&home) { format!("%USERPROFILE%{}", &path[home.len()..]) } else { path };
    let info = json!({
        "ar": ar, "dark": dark, "version": VERSION, "have": have, "boot": installer::starts_with_windows(),
        "desktop": have.is_none() || installer::desktop_link().exists(), "path": path, "stage": stage,
    });
    ac::add_script(&web.view, &format!("window.SETUP={};", info));
    let page = PAGE.replacen("/*FONTS*/", &fonts_css(), 1);
    unsafe { let _ = web.view.NavigateToString(&h(&page)); }
    *s.web.borrow_mut() = Some(web);
    unsafe { let _ = ShowWindow(hwnd, SW_SHOWNORMAL); let _ = UpdateWindow(hwnd); }
    let code = ac::pump();
    if let Some(w) = s.web.borrow_mut().take() { unsafe { let _ = w.controller.Close(); } }
    let _ = std::fs::remove_dir_all(&data);
    let _ = DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2;
    std::process::exit(code);
}
