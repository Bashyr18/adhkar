//! Everything Adhkār keeps on this computer, in one folder you can see: %LOCALAPPDATA%\Adhkar (the same folder and
//! the same files as every earlier version, so nothing moves when it updates)
//!   state.json   your record, in the phone's own format
//!   backups\     one copy a day, the last 30 days
//!   audio\       recitations you chose to download, kept for offline listening
//!   desk.json    this computer's own settings (window, tray, zoom, the pill)
//!   app-*\       the app itself, unpacked once per version; webview\ the browser's own files
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};

use serde_json::{json, Map, Value};

use adhkar_common::installer;

static ROOT: OnceLock<PathBuf> = OnceLock::new();
static APP: OnceLock<PathBuf> = OnceLock::new();
static STATE_LOCK: Mutex<()> = Mutex::new(());
static DESK: Mutex<Option<Map<String, Value>>> = Mutex::new(None);
pub static CANCEL: AtomicBool = AtomicBool::new(false);

pub fn init() {
    let r = installer::data_dir();
    let _ = fs::create_dir_all(r.join("audio"));
    let _ = fs::create_dir_all(r.join("backups"));
    let _ = ROOT.set(r);
}
pub fn root() -> &'static Path { ROOT.get().map(|p| p.as_path()).unwrap_or(Path::new(".")) }
pub fn audio_dir() -> PathBuf { root().join("audio") }
pub fn backup_dir() -> PathBuf { root().join("backups") }
pub fn set_app_dir(p: PathBuf) { let _ = APP.set(p); }
pub fn app_dir() -> &'static Path { APP.get().map(|p| p.as_path()).unwrap_or(Path::new(".")) }

/* ---------- the record ---------- */
fn state_file() -> PathBuf { root().join("state.json") }
pub fn load_state() -> Option<String> {
    let _g = STATE_LOCK.lock().unwrap();
    fs::read_to_string(state_file()).ok()
}
/* written whole to a side file, then swapped in, so a power cut never leaves half a record. One writer, off the
   window's thread, always writes the newest record it has been given: saves come quickly while counting, and one
   thread per save could finish out of order and leave an older record on disk */
static PENDING: Mutex<Option<(u64, String)>> = Mutex::new(None);
static WRITING: AtomicBool = AtomicBool::new(false);
static LAST_SEQ: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
pub fn save_state(json: String, seq: u64) {
    if json.len() < 2 || json.len() > 8_000_000 { return; }
    {
        let mut p = PENDING.lock().unwrap();
        /* a save that arrives after a newer one (the page numbers them) is already out of date */
        if seq > 0 && seq < LAST_SEQ.load(Ordering::SeqCst) { return; }
        if seq > 0 { LAST_SEQ.store(seq, Ordering::SeqCst); }
        *p = Some((seq, json));
    }
    if WRITING.swap(true, Ordering::SeqCst) { return; }
    std::thread::spawn(|| loop {
        let next = PENDING.lock().unwrap().take();
        match next {
            Some((_, j)) => write_state(&j),
            None => {
                WRITING.store(false, Ordering::SeqCst);
                /* a save may have arrived between the last look and letting go */
                if PENDING.lock().unwrap().is_none() || WRITING.swap(true, Ordering::SeqCst) { break; }
            }
        }
    });
}
/* called before exit: waits for any active disk write and flushes the newest pending snapshot synchronously */
pub fn flush_state() {
    if let Some((_, j)) = PENDING.lock().unwrap().take() {
        write_state(&j);
    } else {
        let _g = STATE_LOCK.lock().unwrap();
    }
}
fn write_state(json: &str) {
    let _g = STATE_LOCK.lock().unwrap();
    let f = state_file();
    let tmp = f.with_extension("json.tmp");
    let ok = (|| -> std::io::Result<()> {
        let mut o = fs::File::create(&tmp)?;
        o.write_all(json.as_bytes())?;
        o.sync_all()?;
        Ok(())
    })().is_ok();
    if !ok || fs::rename(&tmp, &f).is_err() { let _ = fs::remove_file(&tmp); return; }
    let today = backup_dir().join(format!("{}.json", today()));
    if !today.exists() {
        let _ = fs::copy(&f, &today);
        let mut all = names_with(&backup_dir(), ".json");
        all.sort();
        if all.len() > 30 { for n in &all[..all.len() - 30] { let _ = fs::remove_file(backup_dir().join(n)); } }
    }
}
pub fn today() -> String {
    let t = unsafe { windows::Win32::System::SystemInformation::GetLocalTime() };
    format!("{:04}-{:02}-{:02}", t.wYear, t.wMonth, t.wDay)
}
fn names_with(dir: &Path, ext: &str) -> Vec<String> {
    fs::read_dir(dir).map(|r| r.flatten().map(|e| e.file_name().to_string_lossy().into_owned()).filter(|n| n.ends_with(ext)).collect()).unwrap_or_default()
}
pub fn backups() -> Value {
    let mut all = names_with(&backup_dir(), ".json");
    all.sort();
    all.reverse();
    Value::Array(all.iter().map(|n| json!({ "name": n.trim_end_matches(".json"), "bytes": fs::metadata(backup_dir().join(n)).map(|m| m.len()).unwrap_or(0) })).collect())
}
pub fn read_backup(name: &str) -> Option<String> { let n = safe(name)?; fs::read_to_string(backup_dir().join(format!("{}.json", n))).ok() }
pub fn read_text(p: &Path) -> Option<String> {
    let m = fs::metadata(p).ok()?;
    if m.len() > 8_000_000 { return None; }
    fs::read_to_string(p).ok()
}

/* ---------- this computer's own settings ---------- */
fn desk_file() -> PathBuf { root().join("desk.json") }
fn with_desk<T>(f: impl FnOnce(&mut Map<String, Value>) -> T) -> T {
    let mut g = DESK.lock().unwrap();
    if g.is_none() {
        let m = fs::read_to_string(desk_file()).ok().and_then(|s| serde_json::from_str::<Value>(&s).ok()).and_then(|v| v.as_object().cloned()).unwrap_or_default();
        *g = Some(m);
    }
    f(g.as_mut().unwrap())
}
pub fn get(k: &str) -> Option<Value> { with_desk(|m| m.get(k).cloned()).filter(|v| !v.is_null()) }
pub fn flag(k: &str) -> bool { get(k).and_then(|v| v.as_bool()).unwrap_or(false) }
pub fn set(k: &str, v: Value) {
    with_desk(|m| {
        m.insert(k.to_string(), v);
        let text = Value::Object(m.clone()).to_string();
        let tmp = desk_file().with_extension("json.tmp");
        if fs::write(&tmp, text).is_ok() { let _ = fs::rename(&tmp, desk_file()); }
    });
}

/* a plain file name, never a path */
pub fn safe(name: &str) -> Option<String> {
    let n = name.replace('\\', "/");
    let n = n.rsplit('/').next().unwrap_or("").to_string();
    if n.is_empty() || n.contains("..") || n.chars().any(|c| "<>:\"|?*".contains(c) || (c as u32) < 32) { return None; }
    Some(n)
}

/* ---------- recitations: only from the two recitation sources, or the app's own recordings ---------- */
const HOSTS: [&str; 2] = ["https://www.hisnmuslim.com/audio/ar/", "https://everyayah.com/data/Alafasy_128kbps/"];
const MAX_BYTES: u64 = 12 * 1024 * 1024;
pub fn audio_name(n: &str) -> bool {
    n.len() >= 5 && n.len() <= 28 && n.ends_with(".mp3") && n[..n.len() - 4].chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
}
fn allowed(u: &str) -> bool {
    HOSTS.iter().any(|h| u.strip_prefix(h).map(|rest| rest.ends_with(".mp3") && rest.len() <= 10 && rest[..rest.len() - 4].chars().all(|c| c.is_ascii_digit())).unwrap_or(false))
}
pub fn audio_file(n: &str) -> Option<PathBuf> { if audio_name(n) { Some(audio_dir().join(n)) } else { None } }
/* one file: from the app's own recordings, or from its source once; true when it is here */
pub fn fetch_audio(n: &str, u: &str) -> bool {
    let Some(dst) = audio_file(n) else { return false };
    if fs::metadata(&dst).map(|m| m.len() > 0).unwrap_or(false) { return true; }
    let tmp = dst.with_extension("mp3.part");
    let ok = (|| -> Option<()> {
        if let Some(rel) = u.strip_prefix("asset:audio/") {
            if !rel.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || "-/.".contains(c)) || rel.contains("..") { return None; }
            fs::copy(app_dir().join("audio").join(rel.replace('/', "\\")), &tmp).ok()?;
        } else {
            if !allowed(u) { return None; }
            let r = crate::net::agent_no_redirect().get(u).call().ok()?;
            if r.status() != 200 { return None; }
            if !r.content_type().starts_with("audio/") { return None; }
            let mut rd = r.into_reader();
            let mut o = fs::File::create(&tmp).ok()?;
            let mut buf = vec![0u8; 32768];
            let mut total = 0u64;
            loop {
                if CANCEL.load(Ordering::SeqCst) { return None; }
                let k = rd.read(&mut buf).ok()?;
                if k == 0 { break; }
                total += k as u64;
                if total > MAX_BYTES { return None; }
                o.write_all(&buf[..k]).ok()?;
            }
        }
        if dst.exists() { let _ = fs::remove_file(&tmp); } else { fs::rename(&tmp, &dst).ok()?; }
        Some(())
    })().is_some();
    if !ok { let _ = fs::remove_file(&tmp); }
    ok
}
pub fn audio_usage() -> u64 { fs::read_dir(audio_dir()).map(|r| r.flatten().filter_map(|e| e.metadata().ok()).map(|m| m.len()).sum()).unwrap_or(0) }
pub fn audio_delete_all() { if let Ok(r) = fs::read_dir(audio_dir()) { for e in r.flatten() { let _ = fs::remove_file(e.path()); } } }

pub fn mime(file: &Path) -> &'static str {
    match file.extension().map(|e| e.to_string_lossy().to_lowercase()).as_deref() {
        Some("html") => "text/html; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("woff2") => "font/woff2",
        Some("mp3") => "audio/mpeg",
        Some("ogg") => "audio/ogg",
        Some("wav") => "audio/wav",
        _ => "application/octet-stream",
    }
}
