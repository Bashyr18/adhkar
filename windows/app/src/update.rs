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
const SUMS_SIG: &str = "SHA256SUMS.txt.sig";
/* Ed25519 public key corresponding to keystore/update-signing.key (only the public key ships in the binary) */
const PUBKEY: [u8; 32] = [
    0xa7, 0xd6, 0xc5, 0xdc, 0x35, 0x09, 0x27, 0x7d, 0xb7, 0xa2, 0x9a, 0x30, 0x29, 0xbd, 0xb2, 0xd5,
    0xf7, 0x53, 0xab, 0x62, 0x16, 0x35, 0x1c, 0xdf, 0xd8, 0x5b, 0x48, 0xcd, 0x22, 0x6a, 0xff, 0x2d,
];
const MAX_BYTES: u64 = 200 * 1024 * 1024;

static BUSY: AtomicBool = AtomicBool::new(false);
struct Found { exe: String, sums: String, sig: Option<String>, version: String, size: u64 }
static FOUND: Mutex<Option<Found>> = Mutex::new(None);

/* for testing only (debug builds): ADHKAR_UPDATE_API points the check at another address */
#[cfg(debug_assertions)]
fn api() -> String { ac::env("ADHKAR_UPDATE_API").unwrap_or_else(|| API.into()) }
#[cfg(not(debug_assertions))]
fn api() -> String { API.into() }
#[cfg(debug_assertions)]
fn testing() -> bool { ac::env("ADHKAR_UPDATE_API").is_some() }
#[cfg(not(debug_assertions))]
fn testing() -> bool { false }
fn host_ok(u: &str) -> bool {
    if testing() { return true; }
    if !u.starts_with("https://") { return false; }
    let h = net::host_of(u);
    h == "api.github.com" || h == "github.com" || h.ends_with(".githubusercontent.com")
}
fn verify_sums_sig(sums_bytes: &[u8], sig_hex: &str, pubkey: &[u8; 32]) -> Result<(), String> {
    use ed25519_dalek::{Signature, Verifier, VerifyingKey};
    let s = sig_hex.trim();
    if s.len() != 128 { return Err("invalid signature".into()); }
    let mut raw = [0u8; 64];
    for i in 0..64 {
        raw[i] = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).map_err(|_| "invalid signature".to_string())?;
    }
    let vk = VerifyingKey::from_bytes(pubkey).map_err(|_| "invalid public key".to_string())?;
    vk.verify(sums_bytes, &Signature::from_bytes(&raw)).map_err(|_| "signature mismatch".into())
}
fn fetch_latest() -> Result<(Option<Found>, String, String), String> {
    let d: Value = serde_json::from_str(&net::text(net::open(&api(), &host_ok)?, 2_000_000)?).map_err(|e| e.to_string())?;
    let version = d["tag_name"].as_str().unwrap_or("").trim_start_matches(['v', 'V']).to_string();
    let (mut exe, mut sums, mut sig, mut size) = (None, None, None, 0u64);
    for a in d["assets"].as_array().cloned().unwrap_or_default() {
        match a["name"].as_str() {
            Some(ASSET) => { exe = a["browser_download_url"].as_str().map(String::from); size = a["size"].as_u64().unwrap_or(0); }
            Some(SUMS) => sums = a["browser_download_url"].as_str().map(String::from),
            Some(SUMS_SIG) => sig = a["browser_download_url"].as_str().map(String::from),
            _ => {}
        }
    }
    let notes: String = d["body"].as_str().unwrap_or("").chars().take(600).collect();
    let found = match (exe, sums) {
        (Some(exe), Some(sums)) if installer::valid_version(&version) && installer::newer(&version, VERSION) => {
            Some(Found { exe, sums, sig, version: version.clone(), size })
        }
        _ => None,
    };
    Ok((found, version, notes))
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
            let (found, version, notes) = fetch_latest()?;
            match found {
                Some(f) => {
                    let v = f.version.clone();
                    let sz = f.size;
                    *FOUND.lock().unwrap() = Some(f);
                    Ok(json!({ "state": "found", "v": v, "size": sz, "notes": notes }))
                }
                None => {
                    *FOUND.lock().unwrap() = None;
                    Ok(json!({ "state": "none", "v": version }))
                }
            }
        })();
        send(r.unwrap_or_else(|e| json!({ "state": "error", "step": "check", "why": e })));
        BUSY.store(false, Ordering::SeqCst);
    });
}

pub fn get() {
    if BUSY.swap(true, Ordering::SeqCst) { return; }
    std::thread::spawn(move || {
        /* after a restart, FOUND is empty even when S.upd.v still remembers a release: re-fetch its URLs automatically */
        let mut f = FOUND.lock().unwrap().as_ref().map(|f| (f.exe.clone(), f.sums.clone(), f.sig.clone(), f.version.clone(), f.size));
        if f.is_none() {
            match fetch_latest() {
                Ok((Some(found), _, _)) => {
                    f = Some((found.exe.clone(), found.sums.clone(), found.sig.clone(), found.version.clone(), found.size));
                    *FOUND.lock().unwrap() = Some(found);
                }
                Ok((None, _, _)) => { send(json!({ "state": "error", "step": "get", "why": "not newer" })); BUSY.store(false, Ordering::SeqCst); return; }
                Err(e) => { send(json!({ "state": "error", "step": "get", "why": e })); BUSY.store(false, Ordering::SeqCst); return; }
            }
        }
        let Some((exe_url, sums_url, sig_url, version, size)) = f else { BUSY.store(false, Ordering::SeqCst); return };
        if !installer::valid_version(&version) { send(json!({ "state": "error", "step": "get", "why": "invalid version" })); BUSY.store(false, Ordering::SeqCst); return; }
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
                let pc = (got.saturating_mul(100)).checked_div(total).unwrap_or(0) as i64;
                if pc > last_pc && last_t.elapsed().as_millis() >= 150 { last_pc = pc; last_t = std::time::Instant::now(); send(json!({ "state": "progress", "got": got, "total": total })); }
            }
            drop(o);
            /* its fingerprint, against the release's own signed list */
            send(json!({ "state": "verifying" }));
            let sums = net::text(net::open(&sums_url, &host_ok)?, 200_000)?;
            if !testing() {
                let sig_u = sig_url.as_deref().ok_or("missing signature")?;
                let sig_hex = net::text(net::open(sig_u, &host_ok)?, 1024)?;
                verify_sums_sig(sums.as_bytes(), &sig_hex, &PUBKEY)?;
            }
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

#[cfg(test)]
mod tests {
    use super::verify_sums_sig;
    use ed25519_dalek::{Signer, SigningKey};

    #[test]
    fn sums_signature_verifies_and_rejects_tampering() {
        let sk = SigningKey::from_bytes(&[7u8; 32]);
        let pk = sk.verifying_key().to_bytes();
        let body = b"deadbeef *Adhkar-Windows.exe\n";
        let sig_hex: String = sk.sign(body).to_bytes().iter().map(|b| format!("{:02x}", b)).collect();
        assert!(verify_sums_sig(body, &sig_hex, &pk).is_ok());
        assert!(verify_sums_sig(b"deadbeef *Adhkar-Windows.exe\n ", &sig_hex, &pk).is_err());
        assert!(verify_sums_sig(body, "00", &pk).is_err());
    }
}
