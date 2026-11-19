//! Adhkār for Windows: the same app and the same record as the phone, in a window made for a big screen, a keyboard
//! and a printer. Installed by Adhkar-Setup.exe like any program; no account, and nothing leaves the computer except
//! the recitations you choose to download and an update you ask for.
//!
//! The app is the web app in web/, served to WebView2 from inside this program; windows/shim.js gives the page the same
//! bridge the Android app gives it (bridge.rs answers it). Your record and settings stay where every earlier version
//! kept them, in %LOCALAPPDATA%\Adhkar.
#![windows_subsystem = "windows"]

mod bridge;
mod dialogs;
mod locate;
mod net;
mod pill;
mod store;
mod update;
mod web;

use std::cell::{Cell, RefCell};
use std::collections::HashSet;
use std::path::PathBuf;
use std::rc::Rc;

use serde_json::{json, Value};
use windows::core::PCWSTR;
use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Gdi::*;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Pipes::*;
use windows::Win32::System::Threading::*;
use windows::Win32::Storage::FileSystem::*;
use windows::Win32::UI::Input::KeyboardAndMouse::SetFocus;
use windows::Win32::UI::Shell::*;
use windows::Win32::UI::WindowsAndMessaging::*;

use adhkar_common::{self as ac, h, installer, js, Web};

pub const HOST: &str = "adhkar.example";
pub const ORIGIN: &str = "https://adhkar.example";
pub const VERSION: &str = env!("ADHKAR_VERSION");

const NIGHT: u32 = 0x07080d;
const DAY: u32 = 0xf5f1e9;
const WM_TRAY: u32 = WM_APP + 2;
const ID_OPEN: usize = 1; const ID_MORNING: usize = 2; const ID_EVENING: usize = 3; const ID_PILL: usize = 4; const ID_QUIT: usize = 5;
const TIMER_REMIND: usize = 7;

/* ---------- the one window, and what it knows ---------- */
pub struct App {
    pub hwnd: HWND,
    pub web: RefCell<Option<Rc<Web>>>,
    pub quitting: Cell<bool>,
    pub ready: Cell<bool>,
    pub full: Cell<bool>,
    pub dark: Cell<bool>,
    before_full: Cell<(i32, RECT, bool)>,
    pending_route: RefCell<Option<String>>,
    pending_files: RefCell<Vec<PathBuf>>,
    /* the reminders for the next two days, as the page worked them out */
    pub events: RefCell<Vec<Value>>,
    rung: RefCell<HashSet<String>>,
    last_route: RefCell<Option<String>>,
    tray_shown: Cell<bool>,
    tip: RefCell<String>,
    /* the pill, and what it shows */
    pill: RefCell<Option<pill::Pill>>,
    next_at: Cell<f64>,
    pill_json: RefCell<String>,
    /* closing: the record has been handed over */
    flushing: Cell<bool>,
    flushed: Cell<bool>,
}
thread_local! { static APP: RefCell<Option<Rc<App>>> = const { RefCell::new(None) }; }
pub fn app() -> Option<Rc<App>> { APP.with(|a| a.borrow().clone()) }

impl App {
    pub fn view(&self) -> Option<webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2> { self.web.borrow().as_ref().map(|w| w.view.clone()) }
    pub fn post(&self, script: &str) { if let Some(v) = self.view() { ac::exec(&v, script, None); } }
    pub fn toast(&self, en: &str, ar: &str) { self.post(&format!("A.toast(A.ar&&A.ar()?{}:{})", js(ar), js(en))); }
    pub fn route(&self, r: &str) {
        if !self.ready.get() { *self.pending_route.borrow_mut() = Some(r.to_string()); return; }
        let r = if r.starts_with('#') { r.to_string() } else { format!("#/{}", r) };
        self.post(&format!("location.hash={}", js(&r)));
    }
    /* the page has drawn its first screen: hand it what arrived meanwhile */
    pub fn on_ready(&self) {
        self.ready.set(true);
        let files: Vec<PathBuf> = self.pending_files.borrow_mut().drain(..).collect();
        for f in files { web::open_file(self, &f); }
        if let Some(r) = self.pending_route.borrow_mut().take() { self.route(&r); }
    }
    pub fn queue_file(&self, p: PathBuf) -> bool { if self.ready.get() { false } else { self.pending_files.borrow_mut().push(p); true } }

    pub fn bring(&self) {
        unsafe {
            if !IsWindowVisible(self.hwnd).as_bool() { let _ = ShowWindow(self.hwnd, if store::flag("max") { SW_SHOWMAXIMIZED } else { SW_SHOW }); }
            if IsIconic(self.hwnd).as_bool() { let _ = ShowWindow(self.hwnd, SW_RESTORE); }
            let _ = SetForegroundWindow(self.hwnd);
        }
    }
    pub fn quit(&self) {
        self.quitting.set(true);
        unsafe { let _ = PostMessageW(Some(self.hwnd), WM_CLOSE, WPARAM(0), LPARAM(0)); }
    }

    /* the title bar takes the page's own colours, so the window reads as one surface */
    pub fn title_bar(&self, dark: bool) {
        self.dark.set(dark);
        store::set("dark", json!(dark));
        ac::caption(self.hwnd, dark, if dark { NIGHT } else { DAY }, if dark { 0xf0e9dc } else { 0x282116 });
        if let Some(w) = self.web.borrow().as_ref() { ac::set_background(&w.controller, if dark { NIGHT } else { DAY }); }
        if let Some(p) = self.pill.borrow().as_ref() { p.render(); }
    }
    pub fn full_screen(&self, on: bool) {
        if on == self.full.get() { return; }
        self.full.set(on);
        unsafe {
            if on {
                let style = GetWindowLongW(self.hwnd, GWL_STYLE);
                let mut wp = WINDOWPLACEMENT { length: std::mem::size_of::<WINDOWPLACEMENT>() as u32, ..Default::default() };
                let _ = GetWindowPlacement(self.hwnd, &mut wp);
                self.before_full.set((style, wp.rcNormalPosition, IsZoomed(self.hwnd).as_bool()));
                let mon = MonitorFromWindow(self.hwnd, MONITOR_DEFAULTTONEAREST);
                let mut mi = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
                let _ = GetMonitorInfoW(mon, &mut mi);
                SetWindowLongW(self.hwnd, GWL_STYLE, (WS_POPUP | WS_VISIBLE).0 as i32);
                let r = mi.rcMonitor;
                let _ = SetWindowPos(self.hwnd, Some(HWND_TOP), r.left, r.top, r.right - r.left, r.bottom - r.top, SWP_FRAMECHANGED | SWP_SHOWWINDOW);
            } else {
                let (style, r, max) = self.before_full.get();
                SetWindowLongW(self.hwnd, GWL_STYLE, style);
                let wp = WINDOWPLACEMENT { length: std::mem::size_of::<WINDOWPLACEMENT>() as u32, rcNormalPosition: r, showCmd: if max { SW_MAXIMIZE.0 as u32 } else { SW_SHOWNORMAL.0 as u32 }, ..Default::default() };
                let _ = SetWindowPlacement(self.hwnd, &wp);
                let _ = SetWindowPos(self.hwnd, None, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
                self.title_bar(self.dark.get());
            }
        }
        self.post(&format!("window.Desk&&Desk.onFull&&Desk.onFull({})", on));
    }

    /* ---------- the tray: the reminders' home when the window is closed ---------- */
    fn nid(&self) -> NOTIFYICONDATAW {
        let mut n = NOTIFYICONDATAW { cbSize: std::mem::size_of::<NOTIFYICONDATAW>() as u32, hWnd: self.hwnd, uID: 1, uFlags: NIF_ICON | NIF_MESSAGE | NIF_TIP, uCallbackMessage: WM_TRAY, hIcon: ac::app_icon(16), ..Default::default() };
        let tip: Vec<u16> = self.tip.borrow().encode_utf16().take(127).collect();
        n.szTip[..tip.len()].copy_from_slice(&tip);
        n.Anonymous.uVersion = NOTIFYICON_VERSION_4;
        n
    }
    pub fn tray(&self, on: bool) {
        unsafe {
            let n = self.nid();
            if on && !self.tray_shown.get() { let _ = Shell_NotifyIconW(NIM_ADD, &n); let _ = Shell_NotifyIconW(NIM_SETVERSION, &n); self.tray_shown.set(true); }
            else if !on && self.tray_shown.get() { let _ = Shell_NotifyIconW(NIM_DELETE, &n); self.tray_shown.set(false); }
        }
    }
    pub fn balloon(&self, title: &str, text: &str) {
        let was = self.tray_shown.get();
        self.tray(true);
        let mut n = self.nid();
        n.uFlags = NIF_INFO;
        let t: Vec<u16> = title.encode_utf16().take(63).collect();
        let b: Vec<u16> = (if text.is_empty() { " " } else { text }).encode_utf16().take(255).collect();
        n.szInfoTitle[..t.len()].copy_from_slice(&t);
        n.szInfo[..b.len()].copy_from_slice(&b);
        n.dwInfoFlags = NIIF_USER | NIIF_LARGE_ICON;
        n.hBalloonIcon = ac::app_icon(32);
        unsafe { let _ = Shell_NotifyIconW(NIM_MODIFY, &n); }
        /* a tray shown only for the reminder leaves again */
        if !was {
            std::thread::spawn(|| { std::thread::sleep(std::time::Duration::from_secs(15)); ac::later(|| if let Some(a) = app() { a.tray(store::flag("tray")) }); });
        }
    }
    fn menu(&self) {
        unsafe {
            let m = CreatePopupMenu().unwrap();
            let add = |id: usize, t: &str| { let _ = AppendMenuW(m, MF_STRING, id, &h(t)); };
            add(ID_OPEN, "Open Adhkār");
            add(ID_MORNING, "Morning adhkār");
            add(ID_EVENING, "Evening adhkār");
            let _ = AppendMenuW(m, if self.pill_on() { MF_STRING | MF_CHECKED } else { MF_STRING }, ID_PILL, &h("The pill"));
            let _ = AppendMenuW(m, MF_SEPARATOR, 0, PCWSTR::null());
            add(ID_QUIT, "Quit Adhkār");
            let mut p = POINT::default();
            let _ = GetCursorPos(&mut p);
            let _ = SetForegroundWindow(self.hwnd);
            let _ = TrackPopupMenu(m, TPM_RIGHTBUTTON | TPM_BOTTOMALIGN, p.x, p.y, Some(0), self.hwnd, None);
            let _ = DestroyMenu(m);
        }
    }
    fn command(&self, id: usize) {
        match id {
            ID_OPEN => self.bring(),
            ID_MORNING => { self.bring(); self.route("c/morning"); }
            ID_EVENING => { self.bring(); self.route("c/evening"); }
            ID_PILL => { let on = !self.pill_on(); self.show_pill(on); self.post("window.Desk&&Desk.refresh&&Desk.refresh()"); }
            ID_QUIT => self.quit(),
            _ => {}
        }
    }

    /* ---------- reminders: the page works out the next two days; this clock rings them, window open or not ---------- */
    fn remind(&self) {
        let now = now_ms();
        let due: Vec<Value> = self.events.borrow().iter().filter(|e| {
            let t = e["t"].as_f64().unwrap_or(0.0);
            t <= now && now - t <= 120_000.0
        }).cloned().collect();
        for ev in due {
            let title = ev["title"].as_str().unwrap_or("Adhkār").to_string();
            let key = format!("{}|{}", ev["t"], title);
            if !self.rung.borrow_mut().insert(key) { continue; }
            *self.last_route.borrow_mut() = ev["route"].as_str().map(String::from);
            self.balloon(&title, ev["body"].as_str().unwrap_or(""));
            /* the human adhān's takbīr, played by the page, as on the phone; never a chime */
            if ev["takbir"].as_bool() == Some(true) { self.post("window.Desk&&Desk.takbir&&Desk.takbir()"); }
            /* Friday's hour of response: the pill comes forward, open, on top of whatever you are working in */
            if ev["hour"].as_bool() == Some(true) {
                if !self.pill_on() { self.show_pill(true); }
                if let Some(p) = self.pill.borrow().as_ref() { p.set_top(true); p.alert(); }
            }
        }
        if self.rung.borrow().len() > 200 { self.rung.borrow_mut().clear(); }
    }

    /* ---------- the pill: the next prayer, in a small window of its own ---------- */
    pub fn pill_on(&self) -> bool { self.pill.borrow().is_some() }
    pub fn show_pill(&self, on: bool) {
        store::set("next", json!(on));
        if on && !self.pill_on() {
            if let Some(p) = pill::Pill::new(store::flag("nextTop")) {
                p.set_target(self.next_at.get());
                p.set_info(&self.pill_json.borrow());
                *self.pill.borrow_mut() = Some(p);
            }
        } else if !on {
            if let Some(p) = self.pill.borrow_mut().take() { p.close(); }
        }
    }
    /* the pill closed itself (its own menu) */
    pub fn pill_closed(&self) {
        self.pill.borrow_mut().take();
        store::set("next", json!(false));
        self.post("window.Desk&&Desk.refresh&&Desk.refresh()");
    }
    pub fn pill_top(&self, on: bool) { if let Some(p) = self.pill.borrow().as_ref() { p.set_top(on); } }
    pub fn set_next(&self, label: &str, at: f64, time: &str) {
        self.next_at.set(at);
        if let Some(p) = self.pill.borrow().as_ref() { p.set_target(at); }
        *self.tip.borrow_mut() = format!("Adhkār · {} {}", label, time).chars().take(127).collect();
        if self.tray_shown.get() { unsafe { let _ = Shell_NotifyIconW(NIM_MODIFY, &self.nid()); } }
    }
    pub fn set_pill(&self, json: &str) {
        *self.pill_json.borrow_mut() = json.to_string();
        if let Some(p) = self.pill.borrow().as_ref() { p.set_info(json); }
    }

    /* ---------- the window's place, kept between visits ---------- */
    fn keep_bounds(&self) {
        if self.full.get() { return; }
        unsafe {
            let mut wp = WINDOWPLACEMENT { length: std::mem::size_of::<WINDOWPLACEMENT>() as u32, ..Default::default() };
            if GetWindowPlacement(self.hwnd, &mut wp).is_err() || wp.rcNormalPosition.right == 0 { return; }
            let r = wp.rcNormalPosition;
            store::set("max", json!(IsZoomed(self.hwnd).as_bool()));
            store::set("bounds", json!([r.left, r.top, r.right - r.left, r.bottom - r.top]));
        }
    }
    /* arguments: from the command line, a shortcut, or a second launch */
    pub fn args(&self, args: &[String]) {
        for a in args {
            if a == "--quit" { self.quit(); return; }
            if let Some(r) = a.strip_prefix("--route=") { self.route(r); }
            else if !a.starts_with("--") && std::path::Path::new(a).is_file() { web::open_file(self, std::path::Path::new(a)); }
        }
    }
}
fn now_ms() -> f64 { std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as f64).unwrap_or(0.0) }

/* ---------- the window procedure ---------- */
extern "system" fn wndproc(hwnd: HWND, msg: u32, wp: WPARAM, lp: LPARAM) -> LRESULT {
    unsafe {
        match msg {
            ac::WM_APP_RUN => { ac::run_jobs(); return LRESULT(0); }
            WM_ERASEBKGND => {
                let mut r = RECT::default(); let _ = GetClientRect(hwnd, &mut r);
                let dark = app().map(|a| a.dark.get()).unwrap_or(true);
                let b = CreateSolidBrush(COLORREF(ac::rgb(if dark { NIGHT } else { DAY })));
                FillRect(HDC(wp.0 as _), &r, b); let _ = DeleteObject(b.into());
                return LRESULT(1);
            }
            WM_SIZE => {
                /* minimised, the page is told it is not seen, so it stops drawing (its animations and clocks rest);
                   the C# control did this by itself, WebView2 under Rust has to be told */
                if let Some(a) = app() { if let Some(w) = a.web.borrow().as_ref() {
                    let _ = w.controller.SetIsVisible(wp.0 != SIZE_MINIMIZED as usize && IsWindowVisible(hwnd).as_bool());
                    let _ = w.controller.SetBounds(ac::client_rect(hwnd));
                } }
                return LRESULT(0);
            }
            WM_SHOWWINDOW => {
                /* hidden in the tray, likewise */
                if let Some(a) = app() { if let Some(w) = a.web.borrow().as_ref() { let _ = w.controller.SetIsVisible(wp.0 != 0 && !IsIconic(hwnd).as_bool()); } }
            }
            WM_MOVE | WM_MOVING => { if let Some(a) = app() { if let Some(w) = a.web.borrow().as_ref() { let _ = w.controller.NotifyParentWindowPositionChanged(); } } }
            WM_EXITSIZEMOVE => { if let Some(a) = app() { a.keep_bounds(); } }
            WM_GETMINMAXINFO => {
                let k = ac::dpi_of(hwnd);
                let mm = &mut *(lp.0 as *mut MINMAXINFO);
                mm.ptMinTrackSize = POINT { x: (480.0 * k) as i32, y: (560.0 * k) as i32 };
                return LRESULT(0);
            }
            WM_DPICHANGED => {
                let r = &*(lp.0 as *const RECT);
                let _ = SetWindowPos(hwnd, None, r.left, r.top, r.right - r.left, r.bottom - r.top, SWP_NOZORDER | SWP_NOACTIVATE);
                return LRESULT(0);
            }
            WM_SETFOCUS => {
                if let Some(a) = app() { if let Some(w) = a.web.borrow().as_ref() { let _ = w.controller.MoveFocus(webview2_com::Microsoft::Web::WebView2::Win32::COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC); } }
                return LRESULT(0);
            }
            WM_ACTIVATE => {
                if (wp.0 & 0xffff) != 0 { if let Some(a) = app() { a.post("window.__native&&__native.onResume&&__native.onResume()"); } }
            }
            WM_TIMER if wp.0 == TIMER_REMIND => { if let Some(a) = app() { a.remind(); } return LRESULT(0); }
            WM_TRAY => {
                let ev = (lp.0 & 0xffff) as u32;
                if let Some(a) = app() {
                    match ev {
                        x if x == WM_LBUTTONDBLCLK || x == WM_LBUTTONUP || x == WM_USER || x == WM_USER + 1 => a.bring(),
                        x if x == WM_CONTEXTMENU || x == WM_RBUTTONUP => a.menu(),
                        /* the reminder was clicked: its page */
                        x if x == WM_USER + 5 => { a.bring(); let r = a.last_route.borrow().clone(); if let Some(r) = r { a.route(&r); } }
                        _ => {}
                    }
                }
                return LRESULT(0);
            }
            WM_COMMAND => { if let Some(a) = app() { a.command(wp.0 & 0xffff); } return LRESULT(0); }
            WM_CLOSE => {
                /* closing for good: the page hands over its record first (it mirrors it only every second and a
                   half), then the window closes; a page that does not answer within a second and a half is not waited for */
                if let Some(a) = app() {
                    let closing = a.quitting.get() || !store::flag("tray");
                    if closing && !a.flushed.get() {
                        if let Some(v) = a.view() {
                            if !a.flushing.replace(true) {
                                let done = || ac::later(|| if let Some(a) = app() { if !a.flushed.replace(true) { a.quitting.set(true); let _ = PostMessageW(Some(a.hwnd), WM_CLOSE, WPARAM(0), LPARAM(0)); } });
                                ac::exec(&v, "window.__adhkarFlush&&__adhkarFlush()", Some(Box::new(move |_| done())));
                                std::thread::spawn(move || { std::thread::sleep(std::time::Duration::from_millis(1500)); done(); });
                            }
                            return LRESULT(0);
                        }
                    }
                }
                if let Some(a) = app() {
                    if !a.quitting.get() && store::flag("tray") {
                        a.keep_bounds();
                        let _ = ShowWindow(hwnd, SW_HIDE);
                        if !store::flag("trayTold") { store::set("trayTold", json!(true)); a.balloon("Adhkār is still here", "It stays in the tray for your reminders. Right-click the icon to quit."); }
                        return LRESULT(0);
                    }
                    a.keep_bounds();
                    if let Some(p) = a.pill.borrow_mut().take() { p.close(); }
                    a.tray(false);
                    if let Some(w) = a.web.borrow_mut().take() { let _ = w.controller.Close(); }
                }
                let _ = DestroyWindow(hwnd);
                return LRESULT(0);
            }
            WM_DESTROY => { PostQuitMessage(0); return LRESULT(0); }
            _ => {}
        }
        DefWindowProcW(hwnd, msg, wp, lp)
    }
}

/* ---------- a second launch hands its request to the window already open ---------- */
fn listen() {
    std::thread::Builder::new().name("single-instance".into()).spawn(|| loop {
        unsafe {
            let p = CreateNamedPipeW(&h(&installer::pipe()), PIPE_ACCESS_INBOUND, PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT, 1, 0, 65536, 0, None);
            if p.is_invalid() { std::thread::sleep(std::time::Duration::from_millis(200)); continue; }
            let connected = ConnectNamedPipe(p, None).is_ok() || GetLastError() == ERROR_PIPE_CONNECTED;
            let mut all = vec![];
            if connected {
                let mut buf = [0u8; 4096];
                loop {
                    let mut n = 0u32;
                    if ReadFile(p, Some(&mut buf), Some(&mut n), None).is_err() || n == 0 { break; }
                    all.extend_from_slice(&buf[..n as usize]);
                }
            }
            let _ = DisconnectNamedPipe(p);
            let _ = CloseHandle(p);
            let args: Vec<String> = String::from_utf8_lossy(&all).split('\n').map(String::from).filter(|s| !s.is_empty()).collect();
            if args.is_empty() { continue; }
            /* the installer and the uninstaller ask the open window to close */
            ac::later(move || if let Some(a) = app() { if !args.iter().any(|x| x == "--quit") { a.bring(); } a.args(&args); });
        }
    }).ok();
}

/* the app is unpacked once per version, beside your record; named by a hash of its contents, never its size (two builds
   came out the same size once, and the second was never unpacked) */
static APP_ZIP: &[u8] = include_bytes!(env!("ADHKAR_APP_ZIP"));
fn unpack() -> Result<(), String> {
    use sha2::{Digest, Sha256};
    let sum: String = Sha256::digest(APP_ZIP).iter().take(6).map(|b| format!("{:02x}", b)).collect();
    let tag = format!("app-{}-{}", VERSION, sum);
    let dir = store::root().join(&tag);
    if !dir.join(".done").exists() {
        let _ = std::fs::remove_dir_all(&dir);
        let mut z = zip::ZipArchive::new(std::io::Cursor::new(APP_ZIP)).map_err(|e| e.to_string())?;
        z.extract(&dir).map_err(|e| e.to_string())?;
        std::fs::write(dir.join(".done"), "ok").map_err(|e| e.to_string())?;
        if let Ok(r) = std::fs::read_dir(store::root()) {
            for e in r.flatten() {
                let n = e.file_name().to_string_lossy().into_owned();
                if n.starts_with("app-") && n != tag { let _ = std::fs::remove_dir_all(e.path()); }
            }
        }
        /* the earlier app's WebView2 loader is no longer needed */
        let _ = std::fs::remove_dir_all(store::root().join("bin"));
    }
    store::set_app_dir(dir);
    Ok(())
}

fn uninstall(quiet: bool) {
    if !quiet && ac::msgbox(None, &format!("Remove Adhkār from this computer?\n\nYour record stays in\n{}\nso nothing is lost if you install it again.", store::root().display()), MB_OKCANCEL | MB_ICONQUESTION) != IDOK { return; }
    installer::close_running(8000);
    if !quiet { ac::msgbox(None, &format!("Adhkār has been removed. Your record is still in {}.", store::root().display()), MB_OK | MB_ICONINFORMATION); }
    /* last, because the folder is emptied a moment after this program closes */
    installer::remove();
}

fn bounds(hwnd: HWND) {
    unsafe {
        let mut wa = RECT::default();
        let _ = SystemParametersInfoW(SPI_GETWORKAREA, 0, Some(&mut wa as *mut RECT as _), SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0));
        let k = ac::dpi_of(hwnd);
        let (aw, ah) = (wa.right - wa.left, wa.bottom - wa.top);
        let w = ((1360.0 * k) as i32).min(aw - (80.0 * k) as i32);
        let hh = ((880.0 * k) as i32).min(ah - (60.0 * k) as i32);
        let mut r = RECT { left: wa.left + (aw - w) / 2, top: wa.top + (ah - hh) / 2, right: 0, bottom: 0 };
        r.right = r.left + w; r.bottom = r.top + hh;
        if let Some(b) = store::get("bounds").and_then(|v| v.as_array().cloned()) {
            if b.len() == 4 {
                let v: Vec<i32> = b.iter().map(|x| x.as_f64().unwrap_or(0.0) as i32).collect();
                let s = RECT { left: v[0], top: v[1], right: v[0] + v[2], bottom: v[1] + v[3] };
                if v[2] >= 480 && v[3] >= 480 && !MonitorFromRect(&s, MONITOR_DEFAULTTONULL).is_invalid() { r = s; }
            }
        }
        let wp = WINDOWPLACEMENT { length: std::mem::size_of::<WINDOWPLACEMENT>() as u32, rcNormalPosition: r, showCmd: SW_HIDE.0 as u32, ..Default::default() };
        let _ = SetWindowPlacement(hwnd, &wp);
    }
}

fn main() {
    ac::dpi_aware();
    ac::com_init();
    store::init();
    let args: Vec<String> = std::env::args().skip(1).collect();
    let has = |f: &str| args.iter().any(|a| a == f);
    if has("--uninstall") { uninstall(has("--quiet")); return; }
    /* handed over from another copy (after installing or updating): wait for that one to close */
    update::after(&args);

    let mutex = unsafe { CreateMutexW(None, true, &h(&installer::mutex())).ok() };
    if unsafe { GetLastError() } == ERROR_ALREADY_EXISTS {
        unsafe { let _ = AllowSetForegroundWindow(ASFW_ANY); }
        installer::pipe_send(&if args.is_empty() { vec!["--show".to_string()] } else { args.clone() }, 2500);
        return;
    }
    update::tidy();
    /* an installed copy keeps its line in Settings > Apps true after an in-app update */
    if bridge::running_installed() { installer::register(VERSION); }
    if let Err(e) = unpack() { ac::msgbox(None, &format!("Adhkār could not start.\n\n{}", e), MB_OK | MB_ICONERROR); return; }
    if ac::webview_version().is_none() {
        if ac::msgbox(None, "Adhkār needs Microsoft Edge WebView2, a free part of Windows that is missing on this computer.\n\nOpen Microsoft's page to install it?", MB_YESNO | MB_ICONINFORMATION) == IDYES {
            ac::shell_open("https://developer.microsoft.com/microsoft-edge/webview2/#download");
        }
        return;
    }

    let dark = store::get("dark").and_then(|v| v.as_bool()).unwrap_or_else(ac::system_dark);
    let hwnd = unsafe {
        let inst = GetModuleHandleW(None).unwrap();
        let class = h("AdhkarWindow");
        let wc = WNDCLASSEXW {
            cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32, style: CS_HREDRAW | CS_VREDRAW, lpfnWndProc: Some(wndproc), hInstance: inst.into(),
            hIcon: ac::app_icon(32), hIconSm: ac::app_icon(16), hCursor: LoadCursorW(None, IDC_ARROW).unwrap_or_default(),
            hbrBackground: CreateSolidBrush(COLORREF(ac::rgb(if dark { NIGHT } else { DAY }))), lpszClassName: PCWSTR(class.as_ptr()), ..Default::default()
        };
        RegisterClassExW(&wc);
        CreateWindowExW(WINDOW_EX_STYLE(0), &class, &h(ac::APP_NAME), WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT, 1200, 800, None, None, Some(inst.into()), None).unwrap()
    };
    ac::set_ui(hwnd);
    bounds(hwnd);
    let a = Rc::new(App {
        hwnd, web: RefCell::new(None), quitting: Cell::new(false), ready: Cell::new(false), full: Cell::new(false), dark: Cell::new(dark),
        before_full: Cell::new((0, RECT::default(), false)), pending_route: RefCell::new(None), pending_files: RefCell::new(vec![]),
        events: RefCell::new(vec![]), rung: RefCell::new(HashSet::new()), last_route: RefCell::new(None), tray_shown: Cell::new(false),
        tip: RefCell::new(ac::APP_NAME.to_string()), pill: RefCell::new(None), next_at: Cell::new(0.0), pill_json: RefCell::new("{}".into()),
        flushing: Cell::new(false), flushed: Cell::new(false),
    });
    APP.with(|s| *s.borrow_mut() = Some(a.clone()));
    a.title_bar(dark);
    if !has("--tray") { unsafe { let _ = ShowWindow(hwnd, if store::flag("max") { SW_SHOWMAXIMIZED } else { SW_SHOWNORMAL }); let _ = UpdateWindow(hwnd); let _ = SetFocus(Some(hwnd)); } }
    a.tray(store::flag("tray"));
    listen();
    unsafe { SetTimer(Some(hwnd), TIMER_REMIND, 15000, None); }
    a.args(&args);
    if let Err(e) = web::init(&a) {
        ac::msgbox(Some(hwnd), &format!("Adhkār could not open its window.\n\n{}", e), MB_OK | MB_ICONERROR);
        return;
    }
    /* the pill is on unless you closed it: it stays on screen when Adhkār is minimised or in the tray */
    if store::get("next").and_then(|v| v.as_bool()).unwrap_or(true) { a.show_pill(true); }
    let code = ac::pump();
    let _ = mutex;
    std::process::exit(code);
}
