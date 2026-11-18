//! The bridge the page talks to. The first half mirrors the Android app's bridge method for method
//! (tools/bridge-check.js keeps the two in step; playback and the takbīr preview live in shim.js, in the page);
//! the second half is what only a computer can do. windows/shim.js sends each call here as JSON arguments; the answer
//! goes back as JSON, `None` meaning nothing. Anything slow runs off the window's thread and answers later.
use std::path::{Path, PathBuf};

use serde_json::{json, Value};

use adhkar_common::{self as ac, installer, js};

use crate::{app, dialogs, locate, store, update, VERSION};

pub fn running_installed() -> bool { installer::same(Path::new(&ac::exe_path()), &installer::exe()) }

fn post(script: String) { ac::post(move || if let Some(a) = app() { a.post(&script) }); }
fn toast(en: &'static str, ar: &'static str) { ac::post(move || if let Some(a) = app() { a.toast(en, ar) }); }

pub fn call(name: &str, body: &[u8]) -> Option<Value> {
    let args: Vec<Value> = serde_json::from_slice(body).unwrap_or_default();
    let s = |i: usize| -> String { args.get(i).and_then(|v| v.as_str()).map(String::from).unwrap_or_default() };
    let b = |i: usize| -> bool { args.get(i).and_then(|v| v.as_bool()).unwrap_or(false) };
    let n = |i: usize| -> f64 { args.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0) };
    let a = app()?;
    let hwnd = a.hwnd;
    match name {
        /* ---------- the same as the phone ---------- */
        "setCanBack" | "haptic" | "sync" | "audioHold" | "volumeKeys" | "openOverlay" | "openDndAccess" | "openBattery" | "startCompass" | "stopCompass" => None,
        "ready" => { ac::later(|| if let Some(a) = app() { a.on_ready() }); None }
        "saveState" => { store::save_state(s(0)); None }
        "loadState" => Some(store::load_state().map(Value::String).unwrap_or(Value::Null)),
        "version" => Some(json!(VERSION)),
        "systemDark" => Some(json!(ac::system_dark())),
        /* the screen stays on while counting, as on the phone */
        "keepAwake" => { let on = b(0); ac::later(move || keep_awake(on)); None }
        "setSystemBars" => { let light = b(0); ac::later(move || if let Some(a) = app() { a.title_bar(!light) }); None }
        "shareText" => {
            let t = s(0);
            ac::later(move || { dialogs::copy_text(hwnd, &t); if let Some(a) = app() { a.toast("Copied, ready to paste", "نُسخ، جاهز للصق"); } });
            None
        }
        "shareImage" => {
            let (b64, text) = (s(0), s(1));
            ac::later(move || {
                use base64::Engine;
                let Some(p) = dialogs::save(hwnd, "Adhkar.png", &[("Picture", "*.png")], &dialogs::pictures()) else { return };
                let ok = base64::engine::general_purpose::STANDARD.decode(b64).ok().map(|d| std::fs::write(&p, d).is_ok()).unwrap_or(false);
                if !ok { toast("Not saved", "لم يُحفظ"); return; }
                if !text.is_empty() { dialogs::copy_text(hwnd, &text); }
                ac::reveal(&p.to_string_lossy());
            });
            None
        }
        "openUrl" => {
            let u = s(0);
            if matches!(u.split(':').next().unwrap_or("").to_lowercase().as_str(), "https" | "http" | "mailto") { ac::shell_open(&u); }
            None
        }
        /* a phone's alarm clock has no counterpart here */
        "setAlarm" | "pinWidget" => Some(json!(false)),

        /* recitations: downloaded here, played by the page (shim.js) from https://adhkar.example/rec/ */
        "audioHave" => {
            let names: Vec<String> = serde_json::from_str(&s(0)).unwrap_or_default();
            let have: Vec<String> = names.into_iter().filter(|n| store::audio_file(n).map(|p| p.is_file()).unwrap_or(false)).collect();
            Some(json!(serde_json::to_string(&have).unwrap_or_default()))
        }
        "audioUsage" => Some(json!(store::audio_usage())),
        "audioDownload" => {
            let l: Vec<Value> = serde_json::from_str(&s(0)).unwrap_or_default();
            let tag = s(1);
            store::CANCEL.store(false, std::sync::atomic::Ordering::SeqCst);
            std::thread::spawn(move || {
                let total = l.len();
                let (mut done, mut failed, mut state) = (0usize, 0usize, "done");
                for it in &l {
                    if store::CANCEL.load(std::sync::atomic::Ordering::SeqCst) { state = "cancelled"; break; }
                    let (n, u) = (it["n"].as_str().unwrap_or(""), it["u"].as_str().unwrap_or(""));
                    if store::fetch_audio(n, u) || store::fetch_audio(n, u) { done += 1; } else { failed += 1; }
                    report(&tag, "progress", done + failed, total);
                }
                if state == "done" && failed > 0 { state = if done > 0 { "partial" } else { "error" }; }
                report(&tag, state, done, total);
            });
            None
        }
        "audioCancel" => { store::CANCEL.store(true, std::sync::atomic::Ordering::SeqCst); None }
        "audioDeleteAll" => { post("window.Desk&&Desk.stopAudio&&Desk.stopAudio()".into()); store::audio_delete_all(); None }

        /* updates from the release page, when you ask (update.rs) */
        "updateCan" => Some(json!(update::can())),
        "updateCheck" => { update::check(); None }
        "updateGet" => { update::get(); None }

        /* things a phone has and a computer does not: each answers so the page never waits or warns */
        "overlayOk" | "dndOk" | "batteryOk" | "requestNotifications" => Some(json!(true)),
        "takeNudgeTally" => Some(json!("{}")),
        "takeTrackerEvents" | "takeWidgetEvents" => Some(json!("[]")),
        "notificationState" => Some(json!("{\"granted\":true,\"exact\":true}")),
        "openSettings" => { ac::shell_open("ms-settings:notifications"); None }
        "locateQuiet" => { locate::locate(); Some(json!(true)) }
        "requestLocation" => { locate::locate(); None }

        "exportFile" => {
            let (nm, text) = (s(0), s(1));
            ac::later(move || {
                let name = if nm.is_empty() { "Adhkar-backup.json".to_string() } else { nm };
                let ok = dialogs::save(hwnd, &name, &[("Adhkār backup", "*.json")], &dialogs::documents()).map(|p| std::fs::write(p, text.as_bytes()).is_ok()).unwrap_or(false);
                post(format!("__native.onExported&&__native.onExported({})", ok));
            });
            None
        }
        "importFile" => {
            ac::later(move || {
                let Some(p) = dialogs::open(hwnd, &[("Adhkār backup", "*.json"), ("All files", "*.*")], &dialogs::documents()) else { return };
                if let Some(a) = app() { crate::web::open_file(&a, &p); }
            });
            None
        }
        /* Windows' own print dialog (not the browser's preview, which had no way back) */
        "printPage" => { ac::later(print_ui); None }

        /* ---------- only on a computer ---------- */
        "deskInfo" => {
            let mut zoom = 1.0;
            if let Some(w) = a.web.borrow().as_ref() { unsafe { let _ = w.controller.ZoomFactor(&mut zoom); } }
            let o = json!({
                "version": VERSION, "data": store::root().to_string_lossy(),
                "installed": installer::installed(), "portable": !running_installed(),
                "tray": store::flag("tray"), "startup": installer::starts_with_windows(),
                "next": a.pill_on(), "nextTop": store::flag("nextTop"),
                "zoom": zoom, "backups": store::backups(), "audio": store::audio_usage(),
                "documents": dialogs::documents().to_string_lossy()
            });
            Some(json!(o.to_string()))
        }
        "deskSet" => {
            let (key, on) = (s(0), b(1));
            ac::later(move || {
                let Some(a) = app() else { return };
                match key.as_str() {
                    "tray" => { store::set("tray", json!(on)); a.tray(on); }
                    "startup" => installer::start_with_windows(on, &if installer::exe().exists() { installer::exe() } else { PathBuf::from(ac::exe_path()) }),
                    "next" => a.show_pill(on),
                    "nextTop" => { store::set("nextTop", json!(on)); a.pill_top(on); }
                    "full" => a.full_screen(on),
                    _ => {}
                }
                a.post("window.Desk&&Desk.refresh&&Desk.refresh()");
            });
            None
        }
        "deskZoom" => {
            let z = n(0).clamp(0.7, 2.0);
            if let Some(w) = a.web.borrow().as_ref() { let c = ac::Ui(w.controller.clone()); ac::later(move || unsafe { let c = c; let _ = c.0.SetZoomFactor(z); }); }
            None
        }
        "titleBar" => { let dark = s(0) == "dark"; ac::later(move || if let Some(a) = app() { a.title_bar(dark) }); None }
        /* the reminders for the next two days, worked out by the page: [{t: ms, title, body, takbir, hour, route}] */
        "deskSchedule" => { if let Ok(v) = serde_json::from_str::<Value>(&s(0)) { *a.events.borrow_mut() = v.as_array().cloned().unwrap_or_default(); } None }
        /* the next prayer, for the pill and the tray */
        "deskNext" => { let (l, at, t) = (s(0), n(1), s(2)); ac::later(move || if let Some(a) = app() { a.set_next(&l, at, &t) }); None }
        "deskPill" => { let j = s(0); ac::later(move || if let Some(a) = app() { a.set_pill(&j) }); None }
        "openFolder" => {
            let p = match s(0).as_str() { "backups" => store::backup_dir(), "documents" => dialogs::documents(), _ => store::root().to_path_buf() };
            let _ = std::fs::create_dir_all(&p);
            ac::shell_open(&p.to_string_lossy());
            None
        }
        "backup" => Some(store::read_backup(&s(0)).map(Value::String).unwrap_or(Value::Null)),
        "install" => { ac::later(install); None }
        "quit" => { ac::later(|| if let Some(a) = app() { a.quit() }); None }
        "savePdf" => { let nm = s(0); ac::later(move || save_pdf(nm)); None }
        "reveal" => { let p = s(0); if in_documents(&p) { ac::reveal(&p); } None }
        "openPdf" => { let p = s(0); if in_documents(&p) { ac::shell_open(&p); } None }
        _ => None,
    }
}
fn report(tag: &str, state: &str, done: usize, total: usize) {
    let j = json!({ "tag": tag, "state": state, "done": done, "total": total }).to_string();
    post(format!("window.__native.onAudio&&__native.onAudio({})", js(&j)));
}
fn in_documents(p: &str) -> bool {
    !p.is_empty() && !p.contains("..") && Path::new(p).is_file() && p.to_lowercase().starts_with(&dialogs::documents().to_string_lossy().to_lowercase())
}
fn keep_awake(on: bool) {
    use windows::Win32::System::Power::*;
    unsafe { SetThreadExecutionState(if on { ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED } else { ES_CONTINUOUS }); }
}
fn print_ui() {
    use webview2_com::Microsoft::Web::WebView2::Win32::*;
    use windows::core::Interface;
    let Some(a) = app() else { return };
    let Some(v) = a.view() else { return };
    if let Ok(v16) = v.cast::<ICoreWebView2_16>() { unsafe { let _ = v16.ShowPrintUI(COREWEBVIEW2_PRINT_DIALOG_KIND_SYSTEM); } }
}

/* from This computer: the same install as Adhkar-Setup.exe, then this copy hands over to the installed one */
fn install() {
    let me = PathBuf::from(ac::exe_path());
    /* a downloaded copy never replaces a newer one already installed */
    let have = installer::file_version(&installer::exe());
    let older = have.as_deref().map(|h| installer::newer(h, VERSION)).unwrap_or(false);
    let ok = if older {
        installer::install(installer::From::File(&installer::exe()), true, &have.clone().unwrap_or_default(), &|_| {}).is_ok()
    } else {
        installer::install(installer::From::File(&me), true, VERSION, &|_| {}).is_ok()
    };
    let Some(a) = app() else { return };
    a.post(&format!("window.Desk&&Desk.onInstalled&&Desk.onInstalled({})", ok));
    /* the installed copy takes over: it waits for this one to close, then opens */
    if ok && !running_installed() {
        let dir = installer::dir().to_string_lossy().into_owned();
        if !ac::spawn(&installer::exe().to_string_lossy(), &format!("--after-update {}", std::process::id()), Some(&dir), false) { return; }
        std::thread::spawn(|| { std::thread::sleep(std::time::Duration::from_millis(1400)); ac::later(|| if let Some(a) = app() { a.quit() }); });
    }
}

/* the page on screen, straight to a PDF in Documents\Adhkar */
fn save_pdf(name: String) {
    use webview2_com::Microsoft::Web::WebView2::Win32::*;
    use windows::core::Interface;
    let Some(a) = app() else { return };
    let dir = dialogs::documents();
    let clean: String = (if name.is_empty() { "Adhkar".to_string() } else { name }).chars().map(|c| if "<>:\"/\\|?*".contains(c) || (c as u32) < 32 { '-' } else { c }).collect();
    let clean = clean.trim().to_string();
    let mut path = dir.join(format!("{}.pdf", clean));
    let mut i = 2;
    while path.exists() { path = dir.join(format!("{} ({}).pdf", clean, i)); i += 1; }
    let done = |ok: bool, p: String| post(format!("window.Desk&&Desk.onPdf&&Desk.onPdf({})", if ok { js(&p) } else { "null".into() }));
    let w = a.web.borrow().clone();
    let Some(w) = w else { done(false, String::new()); return };
    let (Ok(v7), Ok(e6)) = (w.view.cast::<ICoreWebView2_7>(), w.env.cast::<ICoreWebView2Environment6>()) else { done(false, String::new()); return };
    unsafe {
        let Ok(st) = e6.CreatePrintSettings() else { done(false, String::new()); return };
        let _ = st.SetPageWidth(8.27); let _ = st.SetPageHeight(11.69);
        let _ = st.SetMarginTop(0.0); let _ = st.SetMarginBottom(0.0); let _ = st.SetMarginLeft(0.0); let _ = st.SetMarginRight(0.0);
        let _ = st.SetShouldPrintBackgrounds(true); let _ = st.SetShouldPrintHeaderAndFooter(false); let _ = st.SetScaleFactor(1.0);
        let p = path.to_string_lossy().into_owned();
        let p2 = p.clone();
        let handler = webview2_com::PrintToPdfCompletedHandler::create(Box::new(move |e, ok| { done(e.is_ok() && ok, p2); Ok(()) }));
        if v7.PrintToPdf(&ac::h(&p), &st, &handler).is_err() { done(false, String::new()); }
    }
}
