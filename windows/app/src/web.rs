//! The page: WebView2 set up for a quiet app (no browser menus, no downloads, no way out to the web except a link opened
//! in your own browser), the app served from inside this program, your downloaded recitations under /rec/, the bridge
//! under /__bridge/, and a backup file dropped on the window.
use std::path::Path;
use std::rc::Rc;

use webview2_com::Microsoft::Web::WebView2::Win32::*;
use webview2_com::*;
use windows::core::{Interface, BOOL, PWSTR};
use windows::Win32::System::Com::*;
use windows::Win32::UI::Shell::*;
use windows::Win32::UI::WindowsAndMessaging::*;

use adhkar_common::{self as ac, h, js, take_pwstr};

use crate::{app, bridge, store, App, ORIGIN};

static SHIM: &str = include_str!("../../shim.js");

fn s(f: impl FnOnce(&mut PWSTR) -> windows::core::Result<()>) -> String {
    let mut p = PWSTR::null();
    if f(&mut p).is_err() { return String::new(); }
    unsafe { take_pwstr(p) }
}
/* a link out of the app opens in your own browser */
pub fn outside(u: &str) {
    let scheme = u.split(':').next().unwrap_or("").to_lowercase();
    if matches!(scheme.as_str(), "https" | "http" | "mailto") { ac::shell_open(u); }
}

#[cfg(debug_assertions)]
fn debug_port() -> Option<u16> { ac::env("ADHKAR_DEBUG_PORT").and_then(|p| p.parse::<u16>().ok()) }
#[cfg(not(debug_assertions))]
fn debug_port() -> Option<u16> { None }

pub fn init(a: &Rc<App>) -> std::result::Result<(), String> {
    let mut args = "--autoplay-policy=no-user-gesture-required --disable-features=msSmartScreenProtection,ElasticOverscroll".to_string();
    let dbg = debug_port();
    if let Some(p) = dbg { args += &format!(" --remote-debugging-port={}", p); }
    let w = Rc::new(ac::create_web(a.hwnd, &store::root().join("webview").to_string_lossy(), &args)?);
    *a.web.borrow_mut() = Some(w.clone());
    a.title_bar(a.dark.get());
    let v = &w.view;
    unsafe {
        let st = v.Settings().map_err(|e| e.to_string())?;
        let _ = st.SetAreDevToolsEnabled(dbg.is_some());
        let _ = st.SetAreDefaultContextMenusEnabled(false);
        let _ = st.SetIsStatusBarEnabled(false);
        let _ = st.SetIsZoomControlEnabled(false);
        let _ = st.SetAreHostObjectsAllowed(false);
        let _ = st.SetIsWebMessageEnabled(true);
        let _ = st.SetAreDefaultScriptDialogsEnabled(true);
        if let Ok(s3) = st.cast::<ICoreWebView2Settings3>() { let _ = s3.SetAreBrowserAcceleratorKeysEnabled(false); }
        if let Ok(s4) = st.cast::<ICoreWebView2Settings4>() { let _ = s4.SetIsGeneralAutofillEnabled(false); let _ = s4.SetIsPasswordAutosaveEnabled(false); }
        if let Ok(s5) = st.cast::<ICoreWebView2Settings5>() { let _ = s5.SetIsPinchZoomEnabled(false); }
        if let Ok(s6) = st.cast::<ICoreWebView2Settings6>() { let _ = s6.SetIsSwipeNavigationEnabled(false); }

        if let Some(z) = store::get("zoom").and_then(|z| z.as_f64()) { let _ = w.controller.SetZoomFactor(z.clamp(0.7, 2.0)); }
        let mut t = Default::default();
        let _ = w.controller.add_ZoomFactorChanged(&ZoomFactorChangedEventHandler::create(Box::new(|c, _| {
            if let Some(c) = c { let mut z = 1.0; let _ = c.ZoomFactor(&mut z); store::set("zoom", serde_json::json!(z)); }
            Ok(())
        })), &mut t);

        ac::add_script(v, SHIM);
        let _ = v.AddWebResourceRequestedFilter(&h(&format!("{}/*", ORIGIN)), COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);
        let env = w.env.clone();
        let _ = v.add_WebResourceRequested(&WebResourceRequestedEventHandler::create(Box::new(move |_, args| {
            if let Some(args) = args { serve(&env, &args); }
            Ok(())
        })), &mut t);
        let _ = v.add_NavigationStarting(&NavigationStartingEventHandler::create(Box::new(|_, args| {
            if let Some(args) = args {
                let u = s(|p| args.Uri(p));
                if !u.starts_with(&format!("{}/", ORIGIN)) { let _ = args.SetCancel(true); outside(&u); }
            }
            Ok(())
        })), &mut t);
        let _ = v.add_FrameNavigationStarting(&NavigationStartingEventHandler::create(Box::new(|_, args| {
            if let Some(args) = args {
                let u = s(|p| args.Uri(p));
                if !u.starts_with(&format!("{}/", ORIGIN)) && !u.starts_with("about:") { let _ = args.SetCancel(true); }
            }
            Ok(())
        })), &mut t);
        let _ = v.add_NewWindowRequested(&NewWindowRequestedEventHandler::create(Box::new(|_, args| {
            if let Some(args) = args { let _ = args.SetHandled(true); let u = s(|p| args.Uri(p)); outside(&u); }
            Ok(())
        })), &mut t);
        let _ = v.add_PermissionRequested(&PermissionRequestedEventHandler::create(Box::new(|_, args| {
            if let Some(args) = args {
                let u = s(|p| args.Uri(p));
                let mut k = COREWEBVIEW2_PERMISSION_KIND::default();
                let _ = args.PermissionKind(&mut k);
                let allow = u.starts_with(ORIGIN) && (k == COREWEBVIEW2_PERMISSION_KIND_AUTOPLAY || k == COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ);
                let _ = args.SetState(if allow { COREWEBVIEW2_PERMISSION_STATE_ALLOW } else { COREWEBVIEW2_PERMISSION_STATE_DENY });
            }
            Ok(())
        })), &mut t);
        if let Ok(v4) = v.cast::<ICoreWebView2_4>() {
            let _ = v4.add_DownloadStarting(&DownloadStartingEventHandler::create(Box::new(|_, args| { if let Some(a) = args { let _ = a.SetCancel(true); } Ok(()) })), &mut t);
        }
        let _ = v.add_DocumentTitleChanged(&DocumentTitleChangedEventHandler::create(Box::new(|sender, _| {
            if let (Some(sv), Some(a)) = (sender, app()) {
                let ti = s(|p| sv.DocumentTitle(p));
                let ti = if ti.is_empty() || ti.starts_with("http") { ac::APP_NAME.to_string() } else { ti };
                let _ = SetWindowTextW(a.hwnd, &h(&ti));
            }
            Ok(())
        })), &mut t);
        let _ = v.add_ContainsFullScreenElementChanged(&ContainsFullScreenElementChangedEventHandler::create(Box::new(|sender, _| {
            if let Some(sv) = sender {
                let mut on = BOOL(0); let _ = sv.ContainsFullScreenElement(&mut on);
                let on = on.as_bool();
                ac::later(move || if let Some(a) = app() { a.full_screen(on) });
            }
            Ok(())
        })), &mut t);
        let _ = v.add_ProcessFailed(&ProcessFailedEventHandler::create(Box::new(|sender, args| {
            if let (Some(sv), Some(args)) = (sender, args) {
                let mut k = COREWEBVIEW2_PROCESS_FAILED_KIND::default();
                let _ = args.ProcessFailedKind(&mut k);
                if k == COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_EXITED || k == COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_UNRESPONSIVE { let _ = sv.Reload(); }
            }
            Ok(())
        })), &mut t);
        let _ = v.add_WebMessageReceived(&WebMessageReceivedEventHandler::create(Box::new(|_, args| {
            if let Some(args) = args { message(&args); }
            Ok(())
        })), &mut t);
        let _ = v.add_NavigationCompleted(&NavigationCompletedEventHandler::create(Box::new(|_, _| {
            ac::later(|| if let Some(a) = app() { a.on_ready() });
            Ok(())
        })), &mut t);
        let _ = v.Navigate(&h(&format!("{}/index.html", ORIGIN)));
    }
    Ok(())
}

/* ---------- serving the app, your recitations and the bridge ---------- */
fn header(req: &ICoreWebView2WebResourceRequest, name: &str) -> Option<String> {
    unsafe {
        let hs = req.Headers().ok()?;
        let mut has = BOOL(0);
        hs.Contains(&h(name), &mut has).ok()?;
        if !has.as_bool() { return None; }
        let mut p = PWSTR::null();
        hs.GetHeader(&h(name), &mut p).ok()?;
        Some(take_pwstr(p))
    }
}
fn body(req: &ICoreWebView2WebResourceRequest) -> Vec<u8> {
    let mut out = vec![];
    unsafe {
        let Ok(st) = req.Content() else { return out };
        let mut buf = vec![0u8; 1 << 16];
        loop {
            let mut n = 0u32;
            let hr = st.Read(buf.as_mut_ptr() as _, buf.len() as u32, Some(&mut n));
            if n > 0 { out.extend_from_slice(&buf[..n as usize]); }
            if hr.is_err() || n == 0 { break; }
        }
    }
    out
}
fn respond(env: &ICoreWebView2Environment, stream: Option<IStream>, status: i32, reason: &str, headers: &str) -> Option<ICoreWebView2WebResourceResponse> {
    unsafe { env.CreateWebResourceResponse(stream.as_ref(), status, &h(reason), &h(headers)).ok() }
}
fn mem_stream(b: &[u8]) -> Option<IStream> { unsafe { SHCreateMemStream(Some(b)) } }
fn not_found(env: &ICoreWebView2Environment) -> Option<ICoreWebView2WebResourceResponse> { respond(env, None, 404, "Not Found", "Content-Type: text/plain") }

/* a whole file, or the part a recitation asked for (audio is sought through in parts: a range is answered with 206) */
fn file_response(env: &ICoreWebView2Environment, file: Option<&Path>, range: Option<String>) -> Option<ICoreWebView2WebResourceResponse> {
    let Some(file) = file.filter(|f| f.is_file()) else { return not_found(env) };
    let len = std::fs::metadata(file).map(|m| m.len()).unwrap_or(0);
    let name = file.to_string_lossy().to_lowercase();
    let cache = if [".html", ".js", ".css", ".json"].iter().any(|e| name.ends_with(e)) { "no-cache" } else { "max-age=31536000" };
    let head = format!("Content-Type: {}\r\nCache-Control: {}\r\nX-Content-Type-Options: nosniff\r\nAccept-Ranges: bytes", store::mime(file), cache);
    if let Some(r) = range.filter(|r| r.starts_with("bytes=") && len > 0) {
        let spec = r[6..].split(',').next().unwrap_or("");
        let (p0, p1) = spec.split_once('-').unwrap_or((spec, ""));
        let (mut a, mut b) = (0u64, len - 1);
        if !p0.is_empty() { if let Ok(x) = p0.trim().parse() { a = x; } } else if let Ok(x) = p1.trim().parse::<u64>() { a = len.saturating_sub(x); }
        if !p0.is_empty() { if let Ok(x) = p1.trim().parse::<u64>() { b = x.min(len - 1); } }
        if a >= len || b < a { return respond(env, None, 416, "Range Not Satisfiable", &format!("Content-Range: bytes */{}", len)); }
        /* WebView2 reads a response stream from its start, so the part asked for is read into memory, 8 MB at most */
        b = b.min(a + 8 * 1024 * 1024 - 1);
        let st = {
            use std::io::{Read, Seek, SeekFrom};
            let mut f = std::fs::File::open(file).ok()?;
            f.seek(SeekFrom::Start(a)).ok()?;
            let mut buf = vec![0u8; (b - a + 1) as usize];
            f.read_exact(&mut buf).ok()?;
            mem_stream(&buf)?
        };
        return respond(env, Some(st), 206, "Partial Content", &format!("{}\r\nContent-Length: {}\r\nContent-Range: bytes {}-{}/{}", head, b - a + 1, a, b, len));
    }
    let stream = unsafe { SHCreateStreamOnFileEx(&h(&file.to_string_lossy()), (STGM_READ | STGM_SHARE_DENY_NONE).0, 0, false, None).ok()? };
    respond(env, Some(stream), 200, "OK", &format!("{}\r\nContent-Length: {}", head, len))
}

fn serve(env: &ICoreWebView2Environment, args: &ICoreWebView2WebResourceRequestedEventArgs) {
    unsafe {
        let Ok(req) = args.Request() else { return };
        let uri = s(|p| req.Uri(p));
        let Some(rest) = uri.strip_prefix(ORIGIN) else { return };
        let path_q = rest.split(['?', '#']).next().unwrap_or("/");
        let mut path = percent_decode(path_q);
        if path.is_empty() || path == "/" { path = "/index.html".into(); }

        /* the bridge: only the app's own page, which marks its calls */
        if let Some(name) = path.strip_prefix("/__bridge/") {
            let method = s(|p| req.Method(p));
            let origin = header(&req, "Origin").unwrap_or_default();
            if method != "POST" || header(&req, "X-Adhkar").as_deref() != Some("1") || (!origin.is_empty() && origin != ORIGIN) {
                let _ = args.SetResponse(not_found(env).as_ref());
                return;
            }
            let answer = bridge::call(name, &body(&req));
            let text = match answer { Some(v) => format!("{{\"r\":{}}}", v), None => "{}".into() };
            let r = respond(env, mem_stream(text.as_bytes()), 200, "OK", "Content-Type: application/json; charset=utf-8\r\nCache-Control: no-store");
            let _ = args.SetResponse(r.as_ref());
            return;
        }
        let range = header(&req, "Range");
        let file = if let Some(n) = path.strip_prefix("/rec/") { store::audio_file(n) } else { safe_app_file(&path) };
        let r = file_response(env, file.as_deref(), range);
        let _ = args.SetResponse(r.as_ref());
    }
}
fn safe_app_file(path: &str) -> Option<std::path::PathBuf> {
    use std::path::Component;
    if path.contains('\\') || path.contains('\0') || path.contains(':') { return None; }
    let trimmed = path.trim_start_matches('/');
    if trimmed.is_empty() { return None; }
    let mut rel = std::path::PathBuf::new();
    for c in Path::new(trimmed).components() {
        match c {
            Component::Normal(seg) => rel.push(seg),
            _ => return None,
        }
    }
    let root = std::fs::canonicalize(store::app_dir()).ok()?;
    let full = std::fs::canonicalize(root.join(rel)).ok()?;
    if full.starts_with(&root) && full.is_file() { Some(full) } else { None }
}
fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) { out.push(v); i += 3; continue; }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/* ---------- a backup file dropped on the window arrives with its real place on disk ---------- */
fn message(args: &ICoreWebView2WebMessageReceivedEventArgs) {
    let kind = s(|p| unsafe { args.TryGetWebMessageAsString(p) });
    if kind != "drop" { return; }
    let mut paths = vec![];
    unsafe {
        if let Ok(a2) = args.cast::<ICoreWebView2WebMessageReceivedEventArgs2>() {
            if let Ok(objs) = a2.AdditionalObjects() {
                let mut n = 0u32;
                let _ = objs.Count(&mut n);
                for i in 0..n {
                    if let Ok(o) = objs.GetValueAtIndex(i) {
                        if let Ok(f) = o.cast::<ICoreWebView2File>() { let p = s(|p| f.Path(p)); if !p.is_empty() { paths.push(p); } }
                    }
                }
            }
        }
    }
    ac::later(move || if let Some(a) = app() { if let Some(p) = paths.first() { open_file(&a, Path::new(p)); } });
}
/* a backup comes in like the phone's import (from a drop, the Open window, or a file opened with Adhkār) */
pub fn open_file(a: &App, path: &Path) {
    if a.queue_file(path.to_path_buf()) { return; }
    if !path.is_file() { return; }
    if !path.to_string_lossy().to_lowercase().ends_with(".json") { a.toast("Adhkār opens its own backup files (.json)", "يفتح أذكار ملفات النسخ الاحتياطي الخاصة به (.json)"); return; }
    let p = path.to_path_buf();
    std::thread::spawn(move || {
        let t = store::read_text(&p);
        ac::post(move || if let Some(a) = app() {
            match t {
                Some(t) => { let j = js(&t); a.post(&format!("window.Desk&&Desk.onFile?Desk.onFile({0}):__native.onImport({0})", j)) }
                None => a.toast("That file could not be read", "تعذرت قراءة الملف"),
            }
        });
    });
}

#[cfg(test)]
mod tests {
    use super::safe_app_file;

    #[test]
    fn safe_app_file_blocks_traversal_and_unc() {
        assert!(safe_app_file("/\\Windows\\win.ini").is_none());
        assert!(safe_app_file("/\\\\attacker\\share\\x").is_none());
        assert!(safe_app_file("/../secret.txt").is_none());
        assert!(safe_app_file("/C:/Windows/win.ini").is_none());
        assert!(safe_app_file("/index.html\0.txt").is_none());
    }
}
