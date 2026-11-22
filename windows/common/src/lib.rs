//! What Adhkar-Windows.exe and Adhkar-Setup.exe share: small Windows helpers, starting WebView2, running work on the window's
//! thread from any other thread, and installing Adhkār like any other Windows program (see `installer`).
#![allow(clippy::missing_safety_doc)]

pub mod installer;
pub mod registry;

use std::collections::VecDeque;
use std::sync::atomic::{AtomicIsize, Ordering};
use std::sync::Mutex;

use webview2_com::Microsoft::Web::WebView2::Win32::*;
use webview2_com::*;
use windows::core::{Interface, HSTRING, PCWSTR, PWSTR};
use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Dwm::*;
use windows::Win32::System::Com::*;
use windows::Win32::UI::HiDpi::*;
use windows::Win32::UI::Shell::*;
use windows::Win32::UI::WindowsAndMessaging::*;

pub const APP_NAME: &str = "Adhkār";

/* ---------- text ---------- */
pub fn h(s: &str) -> HSTRING { HSTRING::from(s) }
pub fn wide(s: &str) -> Vec<u16> { s.encode_utf16().chain(std::iter::once(0)).collect() }
pub fn from_wide(p: &[u16]) -> String {
    let n = p.iter().position(|&c| c == 0).unwrap_or(p.len());
    String::from_utf16_lossy(&p[..n])
}
pub unsafe fn take_pwstr(p: PWSTR) -> String {
    if p.is_null() { return String::new(); }
    let s = p.to_string().unwrap_or_default();
    CoTaskMemFree(Some(p.0 as _));
    s
}
/* a JavaScript string literal for any text */
pub fn js(s: &str) -> String { serde_json::to_string(s).unwrap_or_else(|_| "\"\"".into()) }

/* ---------- the process ---------- */
pub fn dpi_aware() { unsafe { let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2); } }
pub fn com_init() { unsafe { let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED); } }
pub fn exe_path() -> String { std::env::current_exe().map(|p| p.to_string_lossy().into_owned()).unwrap_or_default() }
pub fn env(k: &str) -> Option<String> { std::env::var(k).ok().filter(|v| !v.is_empty()) }

pub fn msgbox(hwnd: Option<HWND>, text: &str, style: MESSAGEBOX_STYLE) -> MESSAGEBOX_RESULT {
    unsafe { MessageBoxW(hwnd, &h(text), &h(APP_NAME), style) }
}
/* opens a web address, a folder or a file the way Windows would on a double-click */
pub fn shell_open(what: &str) {
    unsafe { ShellExecuteW(None, &h("open"), &h(what), PCWSTR::null(), PCWSTR::null(), SW_SHOWNORMAL); }
}
/* a folder window with the file chosen */
pub fn reveal(file: &str) {
    unsafe { ShellExecuteW(None, &h("open"), &h("explorer.exe"), &h(&format!("/select,\"{}\"", file)), PCWSTR::null(), SW_SHOWNORMAL); }
}
/* starts a program with a full Unicode command line; nothing is shown for a hidden helper */
pub fn spawn(exe: &str, args: &str, dir: Option<&str>, hidden: bool) -> bool {
    use windows::Win32::System::Threading::*;
    let mut cmd = wide(&format!("\"{}\" {}", exe, args));
    let si = STARTUPINFOW { cb: std::mem::size_of::<STARTUPINFOW>() as u32, dwFlags: if hidden { STARTF_USESHOWWINDOW } else { STARTUPINFOW_FLAGS(0) }, wShowWindow: if hidden { SW_HIDE.0 as u16 } else { 0 }, ..Default::default() };
    let mut pi = PROCESS_INFORMATION::default();
    let d = dir.map(h);
    unsafe {
        let ok = CreateProcessW(&h(exe), Some(PWSTR(cmd.as_mut_ptr())), None, None, false, if hidden { CREATE_NO_WINDOW } else { PROCESS_CREATION_FLAGS(0) }, None,
            d.as_ref().map(|d| PCWSTR(d.as_ptr())).unwrap_or(PCWSTR::null()), &si, &mut pi).is_ok();
        if ok { let _ = CloseHandle(pi.hProcess); let _ = CloseHandle(pi.hThread); }
        ok
    }
}

/* the computer's own light or dark setting, and whether it speaks Arabic */
pub fn system_dark() -> bool {
    registry::get_dword(registry::HKCU, r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize", "AppsUseLightTheme").map(|v| v == 0).unwrap_or(false)
}
pub fn system_arabic() -> bool {
    use windows::Win32::Globalization::GetUserDefaultUILanguage;
    unsafe { (GetUserDefaultUILanguage() & 0x3ff) == 0x01 }
}

/* ---------- the window ---------- */
pub fn rgb(c: u32) -> u32 { ((c >> 16) & 255) | (c & 0xff00) | ((c & 255) << 16) }   /* 0xRRGGBB to COLORREF */
/* the title bar takes the page's own colours, so the window reads as one surface */
pub fn caption(hwnd: HWND, dark: bool, bg: u32, fg: u32) {
    unsafe {
        let set = |attr: DWMWINDOWATTRIBUTE, v: u32| { let _ = DwmSetWindowAttribute(hwnd, attr, &v as *const u32 as _, 4); };
        set(DWMWA_USE_IMMERSIVE_DARK_MODE, dark as u32);
        set(DWMWA_CAPTION_COLOR, rgb(bg));
        set(DWMWA_TEXT_COLOR, rgb(fg));
        set(DWMWA_BORDER_COLOR, rgb(bg));
        set(DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND.0 as u32);
    }
}
pub fn dpi_of(hwnd: HWND) -> f64 { unsafe { let d = GetDpiForWindow(hwnd); if d == 0 { 1.0 } else { d as f64 / 96.0 } } }
pub fn client_rect(hwnd: HWND) -> RECT { let mut r = RECT::default(); unsafe { let _ = GetClientRect(hwnd, &mut r); } r }
pub fn app_icon(size: i32) -> HICON {
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    unsafe {
        let m = GetModuleHandleW(None).unwrap_or_default();
        LoadImageW(Some(m.into()), PCWSTR(1 as _), IMAGE_ICON, size, size, LR_DEFAULTCOLOR | LR_SHARED).map(|h| HICON(h.0)).unwrap_or_default()
    }
}

/* ---------- work handed to the window's thread ----------
   WebView2 and every window live on one thread. Another thread (a download, the reminders, the single-instance pipe)
   queues a closure here and the window runs it when it reads WM_APP_RUN. */
pub const WM_APP_RUN: u32 = WM_APP + 1;
type Job = Box<dyn FnOnce() + Send>;
static JOBS: Mutex<VecDeque<Job>> = Mutex::new(VecDeque::new());
static UI: AtomicIsize = AtomicIsize::new(0);
pub fn set_ui(hwnd: HWND) { UI.store(hwnd.0 as isize, Ordering::SeqCst); }
pub fn ui() -> HWND { HWND(UI.load(Ordering::SeqCst) as _) }
pub fn post(f: impl FnOnce() + Send + 'static) {
    JOBS.lock().unwrap().push_back(Box::new(f));
    unsafe { let _ = PostMessageW(Some(ui()), WM_APP_RUN, WPARAM(0), LPARAM(0)); }
}
/* the window's own thread, later: for work that must not run inside a WebView2 callback (a dialog, say) */
pub fn later(f: impl FnOnce() + 'static) {
    let b: Box<dyn FnOnce()> = Box::new(f);
    let s = Ui(b);
    post(move || { let s = s; (s.0)() });
}
pub fn run_jobs() {
    loop {
        let j = JOBS.lock().unwrap().pop_front();
        match j { Some(j) => j(), None => break }
    }
}
/* COM objects and closures that only ever run on the window's thread, carried through the queue */
pub struct Ui<T>(pub T);
unsafe impl<T> Send for Ui<T> {}

/* ---------- WebView2 ---------- */
pub fn webview_version() -> Option<String> {
    unsafe {
        let mut p = PWSTR::null();
        if GetAvailableCoreWebView2BrowserVersionString(PCWSTR::null(), &mut p).is_err() { return None; }
        let s = take_pwstr(p);
        if s.is_empty() { None } else { Some(s) }
    }
}
pub struct Web {
    pub env: ICoreWebView2Environment,
    pub controller: ICoreWebView2Controller,
    pub view: ICoreWebView2,
}
/* the environment (the browser profile Adhkār keeps beside your record, in `data`) and a view filling `hwnd` */
pub fn create_web(hwnd: HWND, data: &str, args: &str) -> std::result::Result<Web, String> {
    let options = CoreWebView2EnvironmentOptions::default();
    unsafe { options.set_additional_browser_arguments(args.to_string()); }
    let options: ICoreWebView2EnvironmentOptions = options.into();
    let data = h(data);
    let (tx, rx) = std::sync::mpsc::channel();
    CreateCoreWebView2EnvironmentCompletedHandler::wait_for_async_operation(
        Box::new(move |handler| unsafe {
            CreateCoreWebView2EnvironmentWithOptions(PCWSTR::null(), &data, &options, &handler).map_err(webview2_com::Error::WindowsError)
        }),
        Box::new(move |err, env| { err?; tx.send(env).ok(); Ok(()) }),
    ).map_err(|e| format!("{:?}", e))?;
    let env = rx.recv().ok().flatten().ok_or("no WebView2 environment")?;
    let (tx, rx) = std::sync::mpsc::channel();
    let e2 = env.clone();
    CreateCoreWebView2ControllerCompletedHandler::wait_for_async_operation(
        Box::new(move |handler| unsafe { e2.CreateCoreWebView2Controller(hwnd, &handler).map_err(webview2_com::Error::WindowsError) }),
        Box::new(move |err, c| { err?; tx.send(c).ok(); Ok(()) }),
    ).map_err(|e| format!("{:?}", e))?;
    let controller = rx.recv().ok().flatten().ok_or("no WebView2 controller")?;
    let view = unsafe { controller.CoreWebView2() }.map_err(|e| e.to_string())?;
    unsafe {
        let _ = controller.SetBounds(client_rect(hwnd));
        let _ = controller.SetIsVisible(true);
    }
    Ok(Web { env, controller, view })
}
pub fn set_background(c: &ICoreWebView2Controller, color: u32) {
    if let Ok(c2) = c.cast::<ICoreWebView2Controller2>() {
        let col = COREWEBVIEW2_COLOR { A: 255, R: (color >> 16) as u8, G: (color >> 8) as u8, B: color as u8 };
        unsafe { let _ = c2.SetDefaultBackgroundColor(col); }
    }
}
/* runs a script in the page; the answer, if wanted, arrives as JSON text */
pub fn exec(view: &ICoreWebView2, script: &str, done: Option<Box<dyn FnOnce(String)>>) {
    let handler = ExecuteScriptCompletedHandler::create(Box::new(move |_e, r| { if let Some(d) = done { d(r) } Ok(()) }));
    unsafe { let _ = view.ExecuteScript(&h(script), &handler); }
}
pub fn add_script(view: &ICoreWebView2, script: &str) {
    let handler = AddScriptToExecuteOnDocumentCreatedCompletedHandler::create(Box::new(|_, _| Ok(())));
    unsafe { let _ = view.AddScriptToExecuteOnDocumentCreated(&h(script), &handler); }
}
pub fn pump() -> i32 {
    unsafe {
        let mut m = MSG::default();
        while GetMessageW(&mut m, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&m);
            DispatchMessageW(&m);
        }
        m.wParam.0 as i32
    }
}
