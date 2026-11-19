//! Updates from the release page, only when you ask (Check now, or the weekly check you turned on in the app).
//! 1. Ask GitHub for the latest release (api.github.com).
//! 2. Download Adhkar-Windows.exe and the release's SHA256SUMS.txt, from github.com and GitHub's file hosts only.
//! 3. The file must match its SHA-256 line and carry a higher version than this one; otherwise nothing changes.
//! 4. A running program cannot be overwritten but can be renamed: this file becomes <name>.old, the new one takes its
//!    place and starts, waits for this copy to close, then removes the .old file. Your record is untouched.
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use serde_json::{json, Value};

use adhkar_common::{self as ac, installer, js};

use crate::{app, net, store, VERSION};

const API: &str = "https://api.github.com/repos/Bashyr18/adhkar/releases/latest";
const ASSET: &str = "Adhkar-Windows.exe";
const SUMS: &str = "SHA256SUMS.txt";
const MAX_BYTES: u64 = 200 * 1024 * 1024;

static BUSY: AtomicBool = AtomicBool::new(false);
struct Found { exe: String, sums: String, version: String, size: u64 }
static FOUND: Mutex<Option<Found>> = Mutex::new(None);

/* for testing only: ADHKAR_UPDATE_API points the check at another address (a local copy of a release) */
fn api() -> String { ac::env("ADHKAR_UPDATE_API").unwrap_or_else(|| API.into()) }
fn testing() -> bool { ac::env("ADHKAR_UPDATE_API").is_some() }
fn host_ok(u: &str) -> bool {
    if testing() { return true; }
    if !u.starts_with("https://") { return false; }
    let h = net::host_of(u);
    h == "api.github.com" || h == "github.com" || h.ends_with(".githubusercontent.com")
}
fn send(o: Value) {
    let j = js(&o.to_string());
    ac::post(move || if let Some(a) = app() { a.post(&format!("window.__native.onUpdate&&__native.onUpdate({})", j)) });
}

/* a copy run from a folder it may not write to (Program Files) cannot swap its own file */
pub fn can() -> &'static str {
    let exe = PathBuf::from(ac::exe_path());
    let probe = exe.with_file_name(".adhkar-write-test");
    if fs::write(&probe, b"").is_ok() { let _ = fs::remove_file(&probe); "yes" } else { "no" }
}

pub fn check() {
    if BUSY.swap(true, Ordering::SeqCst) { return; }
    std::thread::spawn(|| {
        let r = (|| -> Result<Value, String> {
            let d: Value = serde_json::from_str(&net::text(net::open(&api(), &host_ok)?, 2_000_000)?).map_err(|e| e.to_string())?;
            let version = d["tag_name"].as_str().unwrap_or("").trim_start_matches(['v', 'V']).to_string();
            let (mut exe, mut sums, mut size) = (None, None, 0u64);
            for a in d["assets"].as_array().cloned().unwrap_or_default() {
                match a["name"].as_str() {
                    Some(ASSET) => { exe = a["browser_download_url"].as_str().map(String::from); size = a["size"].as_u64().unwrap_or(0); }
                    Some(SUMS) => sums = a["browser_download_url"].as_str().map(String::from),
                    _ => {}
                }
            }
            let notes: String = d["body"].as_str().unwrap_or("").chars().take(600).collect();
            match (exe, sums) {
                (Some(exe), Some(sums)) if installer::newer(&version, VERSION) => {
                    *FOUND.lock().unwrap() = Some(Found { exe, sums, version: version.clone(), size });
                    Ok(json!({ "state": "found", "v": version, "size": size, "notes": notes }))
                }
                _ => Ok(json!({ "state": "none", "v": version })),
            }
        })();
        send(r.unwrap_or_else(|e| json!({ "state": "error", "step": "check", "why": e })));
        BUSY.store(false, Ordering::SeqCst);
    });
}

pub fn get() {
    let f = FOUND.lock().unwrap().as_ref().map(|f| (f.exe.clone(), f.sums.clone(), f.version.clone(), f.size));
    let Some((exe_url, sums_url, version, size)) = f else { send(json!({ "state": "error", "step": "get", "why": "check first" })); return };
    if BUSY.swap(true, Ordering::SeqCst) { return; }
    std::thread::spawn(move || {
        let dir = store::root().join("update");
        let _ = fs::create_dir_all(&dir);
        let part = dir.join(format!("Adhkar-{}.exe.part", version));
        let r = (|| -> Result<(), String> {
            /* the file, with progress only as it rises and at most every 150 ms (the window would drown otherwise) */
            let rs = net::open(&exe_url, &host_ok)?;
            let total: u64 = rs.header("Content-Length").and_then(|v| v.parse().ok()).unwrap_or(size);
            let mut rd = rs.into_reader();
            let mut o = fs::File::create(&part).map_err(|e| e.to_string())?;
            let mut buf = vec![0u8; 65536];
            let (mut got, mut last_pc, mut last_t) = (0u64, -1i64, std::time::Instant::now());
            loop {
                let n = rd.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                got += n as u64;
                if got > MAX_BYTES { return Err("too large".into()); }
                o.write_all(&buf[..n]).map_err(|e| e.to_string())?;
                let pc = if total > 0 { (got * 100 / total) as i64 } else { 0 };
                if pc > last_pc && last_t.elapsed().as_millis() >= 150 { last_pc = pc; last_t = std::time::Instant::now(); send(json!({ "state": "progress", "got": got, "total": total })); }
            }
            drop(o);
            /* its fingerprint, against the release's own list */
            send(json!({ "state": "verifying" }));
            let sums = net::text(net::open(&sums_url, &host_ok)?, 200_000)?;
            let want = sums.lines().find_map(|l| {
                let mut p = l.trim().splitn(2, [' ', '\t']);
                let (h, n) = (p.next()?, p.next()?.trim().trim_start_matches('*').trim());
                if n == ASSET { Some(h.to_lowercase()) } else { None }
            }).ok_or("no checksum")?;
            if net::sha256(&part).as_deref() != Some(want.as_str()) { return Err("checksum mismatch".into()); }
            let fv = installer::file_version(&part).unwrap_or_default();
            if !installer::newer(&fv, VERSION) { return Err("not newer".into()); }
            Ok(())
        })();
        match r {
            Ok(()) => { send(json!({ "state": "installing" })); ac::later(move || swap(part)); }
            Err(e) => { let _ = fs::remove_file(&part); send(json!({ "state": "error", "step": "get", "why": e })); BUSY.store(false, Ordering::SeqCst); }
        }
    });
}
/* the swap, on the window's thread: this file aside, the new one in its place, started; then this copy closes */
fn swap(part: PathBuf) {
    let cur = PathBuf::from(ac::exe_path());
    let old = PathBuf::from(format!("{}.old", cur.display()));
    let _ = fs::remove_file(&old);
    if fs::rename(&cur, &old).is_err() { send(json!({ "state": "error", "step": "get", "why": "could not move the running file" })); BUSY.store(false, Ordering::SeqCst); return; }
    /* the download lives beside the record; a copy run from another drive cannot be moved across, so it is copied */
    if fs::rename(&part, &cur).is_err() && fs::copy(&part, &cur).is_err() {
        let _ = fs::rename(&old, &cur);
        send(json!({ "state": "error", "step": "get", "why": "could not put the new file in place" }));
        BUSY.store(false, Ordering::SeqCst);
        return;
    }
    let _ = fs::remove_file(&part);
    send(json!({ "state": "done" }));
    let dir = cur.parent().map(|p| p.to_string_lossy().into_owned());
    ac::spawn(&cur.to_string_lossy(), &format!("--after-update {}", std::process::id()), dir.as_deref(), false);
    if let Some(a) = app() { a.quit(); }
}

/* started by the old copy (this one or an earlier C# one): wait for it to close, so the single-instance name is free */
pub fn after(args: &[String]) {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::*;
    let Some(i) = args.iter().position(|a| a == "--after-update") else { return };
    if let Some(pid) = args.get(i + 1).and_then(|p| p.parse::<u32>().ok()) {
        unsafe {
            if let Ok(p) = OpenProcess(PROCESS_SYNCHRONIZE, false, pid) { WaitForSingleObject(p, 15000); let _ = CloseHandle(p); }
        }
    }
}
/* what an update or an install moved aside, and any download left behind, are gone once this copy runs */
pub fn tidy() {
    let _ = fs::remove_file(format!("{}.old", ac::exe_path()));
    if let Ok(r) = fs::read_dir(store::root().join("update")) { for e in r.flatten() { let _ = fs::remove_file(e.path()); } }
}
