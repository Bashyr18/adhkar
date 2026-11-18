//! Installing Adhkār like any other Windows program, shared by Adhkar-Setup.exe and by the app itself (its Install
//! button): a folder of its own (%LOCALAPPDATA%\Programs\Adhkar, no administrator needed), a Start menu entry, a
//! desktop shortcut if wanted, and an entry in Settings > Apps that removes it again. The record lives apart, in
//! %LOCALAPPDATA%\Adhkar, and is never touched.
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use windows::core::{Interface, GUID, PWSTR};
use windows::Win32::Foundation::*;
use windows::Win32::System::Com::*;
use windows::Win32::System::Diagnostics::ToolHelp::*;
use windows::Win32::System::Threading::*;
use windows::Win32::UI::Shell::*;

use crate::{h, registry as reg, take_pwstr, APP_NAME};

pub const ABOUT: &str = "Remembrance for every moment";
const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";

/* ADHKAR_INSTALL_ROOT=<folder> puts the program and its shortcuts in that folder (Programs\Adhkar, Start, Desktop) and
   uses a Settings line of its own, so installing can be tested without touching the computer's real Adhkār */
fn test() -> Option<String> { crate::env("ADHKAR_INSTALL_ROOT") }
fn uninst_key() -> String { format!(r"Software\Microsoft\Windows\CurrentVersion\Uninstall\{}", if test().is_some() { "Adhkar-Test" } else { "Adhkar" }) }
fn run_name() -> &'static str { if test().is_some() { "Adhkar-Test" } else { "Adhkar" } }

/* one Adhkār per person. A copy run on its own data folder (ADHKAR_DATA, for testing) is a separate app, so it never
   brings forward, or hands its arguments to, the copy in use. The names are the ones the earlier C# app used, so an
   old copy and a new one still recognise each other while one replaces the other. */
pub fn instance() -> String {
    let base = "Adhkar.Desktop.v1".to_string();
    match crate::env("ADHKAR_DATA") {
        None => base,
        Some(d) => {
            let mut hh: i32 = 17;
            for c in d.to_lowercase().encode_utf16() { hh = hh.wrapping_mul(31).wrapping_add(c as i32); }
            format!("{}.{:08x}", base, hh as u32)
        }
    }
}
pub fn pipe() -> String { format!(r"\\.\pipe\{}", instance()) }
pub fn mutex() -> String { format!(r"Local\{}", instance()) }

pub fn known(id: &GUID) -> PathBuf {
    unsafe { SHGetKnownFolderPath(id, KNOWN_FOLDER_FLAG(0), None).map(|p| PathBuf::from(take_pwstr(p))).unwrap_or_default() }
}
fn base(id: &GUID, test_sub: &str) -> PathBuf { match test() { Some(t) => Path::new(&t).join(test_sub), None => known(id) } }

pub fn dir() -> PathBuf { match test() { Some(t) => Path::new(&t).join("Programs").join("Adhkar"), None => known(&FOLDERID_LocalAppData).join("Programs").join("Adhkar") } }
pub fn exe() -> PathBuf { dir().join("Adhkar.exe") }
pub fn data_dir() -> PathBuf { crate::env("ADHKAR_DATA").map(PathBuf::from).unwrap_or_else(|| known(&FOLDERID_LocalAppData).join("Adhkar")) }
pub fn start_link() -> PathBuf { base(&FOLDERID_Programs, "Start").join(format!("{}.lnk", APP_NAME)) }
pub fn desktop_link() -> PathBuf { base(&FOLDERID_Desktop, "Desktop").join(format!("{}.lnk", APP_NAME)) }
/* the earlier app's scripting shell wrote "Adhkar.lnk", losing the ā: tidied whenever the real one is written */
fn plain_link(l: &Path) -> PathBuf { l.with_file_name("Adhkar.lnk") }

pub fn installed() -> bool { exe().exists() && start_link().exists() }
pub fn installed_version() -> Option<String> { reg::get_string(reg::HKCU, &uninst_key(), "DisplayVersion") }
pub fn same(a: &Path, b: &Path) -> bool {
    match (fs::canonicalize(a), fs::canonicalize(b)) {
        (Ok(x), Ok(y)) => x.to_string_lossy().to_lowercase() == y.to_string_lossy().to_lowercase(),
        _ => a.to_string_lossy().to_lowercase() == b.to_string_lossy().to_lowercase(),
    }
}
/* the version written into a program file (its Properties), as "13.6" */
pub fn file_version(p: &Path) -> Option<String> {
    use windows::Win32::Storage::FileSystem::*;
    let w = crate::wide(&p.to_string_lossy());
    unsafe {
        let n = GetFileVersionInfoSizeW(windows::core::PCWSTR(w.as_ptr()), None);
        if n == 0 { return None; }
        let mut buf = vec![0u8; n as usize];
        GetFileVersionInfoW(windows::core::PCWSTR(w.as_ptr()), None, n, buf.as_mut_ptr() as _).ok()?;
        let mut p: *mut std::ffi::c_void = std::ptr::null_mut();
        let mut len = 0u32;
        if !VerQueryValueW(buf.as_ptr() as _, &h("\\"), &mut p, &mut len).as_bool() || p.is_null() { return None; }
        let f = &*(p as *const VS_FIXEDFILEINFO);
        Some(format!("{}.{}", f.dwFileVersionMS >> 16, f.dwFileVersionMS & 0xffff))
    }
}
/* "13.10" is newer than "13.9": part by part, as numbers */
pub fn newer(a: &str, b: &str) -> bool {
    let x: Vec<i64> = a.split('.').map(|p| p.trim().parse().unwrap_or(0)).collect();
    let y: Vec<i64> = b.split('.').map(|p| p.trim().parse().unwrap_or(0)).collect();
    for i in 0..x.len().max(y.len()) {
        let (p, q) = (x.get(i).copied().unwrap_or(0), y.get(i).copied().unwrap_or(0));
        if p != q { return p > q; }
    }
    false
}

pub enum From<'a> { File(&'a Path), Bytes(&'a [u8]) }

/* copies the program into its folder (unless it is already running from there), then the shortcuts and the Settings entry */
pub fn install(from: From, desktop: bool, version: &str, progress: &dyn Fn(f64)) -> Result<(), String> {
    fs::create_dir_all(dir()).map_err(|e| e.to_string())?;
    match from {
        From::Bytes(b) => copy(&mut &b[..], b.len() as u64, &exe(), progress)?,
        From::File(p) => if !same(p, &exe()) {
            let mut f = fs::File::open(p).map_err(|e| e.to_string())?;
            let len = f.metadata().map(|m| m.len()).unwrap_or(0);
            copy(&mut f, len, &exe(), progress)?;
        },
    }
    progress(0.9);
    let _ = fs::remove_file(plain_link(&start_link()));
    shortcut(&start_link(), &exe(), "", ABOUT)?;
    let _ = fs::remove_file(plain_link(&desktop_link()));
    if desktop { shortcut(&desktop_link(), &exe(), "", ABOUT)?; } else { let _ = fs::remove_file(desktop_link()); }
    register(version);
    /* starting with Windows follows the program to its new home */
    if starts_with_windows() { start_with_windows(true, &exe()); }
    progress(1.0);
    Ok(())
}
fn copy(from: &mut dyn Read, len: u64, to: &Path, progress: &dyn Fn(f64)) -> Result<(), String> {
    let part = to.with_extension("exe.new");
    {
        let mut o = fs::File::create(&part).map_err(|e| e.to_string())?;
        let mut buf = vec![0u8; 1 << 20];
        let mut total = 0u64;
        loop {
            let n = from.read(&mut buf).map_err(|e| e.to_string())?;
            if n == 0 { break; }
            o.write_all(&buf[..n]).map_err(|e| e.to_string())?;
            total += n as u64;
            if len > 0 { progress(0.9 * total as f64 / len as f64); }
        }
        o.sync_all().ok();
    }
    /* the old file may still be closing: a few tries. A running copy can be moved aside even when it cannot be deleted. */
    for i in 0.. {
        let _ = fs::remove_file(to);
        if to.exists() { let old = to.with_extension("exe.old"); let _ = fs::remove_file(&old); let _ = fs::rename(to, &old); }
        match fs::rename(&part, to) {
            Ok(_) => return Ok(()),
            Err(e) => { if i >= 20 { let _ = fs::remove_file(&part); return Err(e.to_string()); } std::thread::sleep(Duration::from_millis(250)); }
        }
    }
    Ok(())
}
/* the entry in Settings > Apps; written again by each new version so the number shown stays true */
pub fn register(version: &str) {
    let k = uninst_key();
    let e = exe().to_string_lossy().into_owned();
    let s = |n: &str, v: &str| { reg::set_string(reg::HKCU, &k, n, v); };
    s("DisplayName", &if test().is_some() { format!("{} (test)", APP_NAME) } else { APP_NAME.to_string() });
    s("DisplayVersion", version);
    s("Publisher", "Adhkār, open source");
    s("Comments", ABOUT);
    s("URLInfoAbout", "https://bashyr18.github.io/adhkar/guide/");
    s("HelpLink", "https://bashyr18.github.io/adhkar/guide/");
    s("URLUpdateInfo", "https://github.com/Bashyr18/adhkar/releases/latest");
    s("DisplayIcon", &format!("{},0", e));
    s("InstallLocation", &dir().to_string_lossy());
    if reg::get_string(reg::HKCU, &k, "InstallDate").is_none() { s("InstallDate", &today_compact()); }
    s("UninstallString", &format!("\"{}\" --uninstall", e));
    s("QuietUninstallString", &format!("\"{}\" --uninstall --quiet", e));
    reg::set_dword(reg::HKCU, &k, "NoModify", 1);
    reg::set_dword(reg::HKCU, &k, "NoRepair", 1);
    if let Ok(m) = fs::metadata(exe()) { reg::set_dword(reg::HKCU, &k, "EstimatedSize", (m.len() / 1024) as u32); }
}
fn today_compact() -> String {
    let t = unsafe { windows::Win32::System::SystemInformation::GetLocalTime() };
    format!("{:04}{:02}{:02}", t.wYear, t.wMonth, t.wDay)
}

pub fn starts_with_windows() -> bool { reg::exists(reg::HKCU, RUN_KEY, run_name()) }
pub fn start_with_windows(on: bool, exe: &Path) {
    if on { reg::set_string(reg::HKCU, RUN_KEY, run_name(), &format!("\"{}\" --tray", exe.to_string_lossy())); }
    else { reg::delete_value(reg::HKCU, RUN_KEY, run_name()); }
}

/* the program, the shortcuts and the Settings entry go; the record stays */
pub fn remove() {
    for l in [start_link(), desktop_link()] { let _ = fs::remove_file(plain_link(&l)); let _ = fs::remove_file(l); }
    start_with_windows(false, Path::new(""));
    reg::delete_tree(reg::HKCU, &uninst_key());
    if let Ok(rd) = fs::read_dir(data_dir()) {
        for e in rd.flatten() { if e.file_name().to_string_lossy().starts_with("app-") { let _ = fs::remove_dir_all(e.path()); } }
    }
    /* a running program cannot delete its own folder: a hidden command waits a moment, then removes the whole folder,
       trying again for a while if anything still holds a file (ping is the pause; timeout needs a console) */
    let d = dir().to_string_lossy().into_owned();
    let mut c = String::from("/d /c \"");
    for i in 0..15 {
        if i > 0 { c.push_str(" & "); }
        c.push_str(&format!("ping -n 2 127.0.0.1 >nul & if exist \"{d}\" rmdir /s /q \"{d}\" 2>nul"));
    }
    c.push('"');
    let cmd = std::env::var("ComSpec").unwrap_or_else(|_| r"C:\Windows\System32\cmd.exe".into());
    crate::spawn(&cmd, &c, Some(&std::env::temp_dir().to_string_lossy()), true);
}

/* every running Adhkar.exe started from the installed file, apart from this process */
fn others() -> Vec<u32> {
    let me = std::process::id();
    let target = exe();
    let mut out = vec![];
    unsafe {
        let Ok(snap) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else { return out };
        let mut e = PROCESSENTRY32W { dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32, ..Default::default() };
        if Process32FirstW(snap, &mut e).is_ok() {
            loop {
                let name = crate::from_wide(&e.szExeFile);
                if e.th32ProcessID != me && name.eq_ignore_ascii_case("Adhkar.exe") {
                    if let Some(p) = image_of(e.th32ProcessID) { if same(Path::new(&p), &target) { out.push(e.th32ProcessID); } }
                }
                if Process32NextW(snap, &mut e).is_err() { break; }
            }
        }
        let _ = CloseHandle(snap);
    }
    out
}
fn image_of(pid: u32) -> Option<String> {
    unsafe {
        let p = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = vec![0u16; 1024];
        let mut n = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(p, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut n).is_ok();
        let _ = CloseHandle(p);
        if ok { Some(String::from_utf16_lossy(&buf[..n as usize])) } else { None }
    }
}
pub fn running() -> bool { !others().is_empty() }
/* the installed Adhkār, if it is open, is asked to close (it saves as it goes), and only stopped if it does not.
   A copy running from somewhere else (Downloads, say) is asked too, since it holds the same single-instance name. */
pub fn close_running(wait_ms: u64) -> bool {
    pipe_send(&["--quit".to_string()], 1200);
    let until = Instant::now() + Duration::from_millis(wait_ms);
    while Instant::now() < until {
        if others().is_empty() { return true; }
        std::thread::sleep(Duration::from_millis(200));
    }
    for pid in others() {
        unsafe {
            if let Ok(p) = OpenProcess(PROCESS_TERMINATE | PROCESS_SYNCHRONIZE, false, pid) {
                let _ = TerminateProcess(p, 1);
                WaitForSingleObject(p, 3000);
                let _ = CloseHandle(p);
            }
        }
    }
    others().is_empty()
}

/* a second launch (a shortcut, a dropped file, the tray, the installer) hands its request to the window already open */
pub fn pipe_send(args: &[String], wait_ms: u32) -> bool {
    use windows::Win32::Storage::FileSystem::*;
    use windows::Win32::System::Pipes::WaitNamedPipeW;
    let name = h(&pipe());
    let body = args.join("\n");
    unsafe {
        let until = Instant::now() + Duration::from_millis(wait_ms as u64);
        loop {
            match CreateFileW(&name, FILE_GENERIC_WRITE.0, FILE_SHARE_NONE, None, OPEN_EXISTING, FILE_FLAGS_AND_ATTRIBUTES(0), None) {
                Ok(f) => {
                    let mut n = 0u32;
                    let ok = WriteFile(f, Some(body.as_bytes()), Some(&mut n), None).is_ok();
                    let _ = CloseHandle(f);
                    return ok;
                }
                Err(_) => {
                    if Instant::now() >= until { return false; }
                    let _ = WaitNamedPipeW(&name, 250);
                    std::thread::sleep(Duration::from_millis(50));
                }
            }
        }
    }
}

/* ---------- shortcuts, through the Unicode shell interface (so "Adhkār" keeps its ā) ---------- */
pub fn shortcut(lnk: &Path, target: &Path, args: &str, about: &str) -> Result<(), String> {
    unsafe {
        let l: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER).map_err(|e| e.to_string())?;
        l.SetPath(&h(&target.to_string_lossy())).map_err(|e| e.to_string())?;
        let _ = l.SetArguments(&h(args));
        let _ = l.SetDescription(&h(about));
        if let Some(d) = target.parent() { let _ = l.SetWorkingDirectory(&h(&d.to_string_lossy())); }
        let _ = l.SetIconLocation(&h(&target.to_string_lossy()), 0);
        if let Some(d) = lnk.parent() { let _ = fs::create_dir_all(d); }
        let pf: IPersistFile = l.cast().map_err(|e| e.to_string())?;
        pf.Save(&h(&lnk.to_string_lossy()), true).map_err(|e| e.to_string())?;
    }
    Ok(())
}
