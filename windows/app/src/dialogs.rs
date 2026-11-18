//! Windows' own Save and Open windows, and the clipboard.
use std::path::{Path, PathBuf};

use windows::core::{HSTRING, PCWSTR};
use windows::Win32::Foundation::*;
use windows::Win32::System::Com::*;
use windows::Win32::System::DataExchange::*;
use windows::Win32::System::Memory::*;
use windows::Win32::System::Ole::CF_UNICODETEXT;
use windows::Win32::UI::Shell::Common::COMDLG_FILTERSPEC;
use windows::Win32::UI::Shell::*;

use adhkar_common::{h, take_pwstr};

fn specs(filters: &[(&str, &str)]) -> (Vec<HSTRING>, Vec<COMDLG_FILTERSPEC>) {
    let mut keep = vec![];
    for (n, p) in filters { keep.push(h(n)); keep.push(h(p)); }
    let s = (0..filters.len()).map(|i| COMDLG_FILTERSPEC { pszName: PCWSTR(keep[i * 2].as_ptr()), pszSpec: PCWSTR(keep[i * 2 + 1].as_ptr()) }).collect();
    (keep, s)
}
fn folder(d: &IFileDialog, dir: &Path) {
    unsafe {
        if let Ok(item) = SHCreateItemFromParsingName::<_, _, IShellItem>(&h(&dir.to_string_lossy()), None) { let _ = d.SetFolder(&item); }
    }
}
fn result(d: &IFileDialog) -> Option<PathBuf> {
    unsafe {
        let item = d.GetResult().ok()?;
        let p = item.GetDisplayName(SIGDN_FILESYSPATH).ok()?;
        Some(PathBuf::from(take_pwstr(p)))
    }
}
pub fn save(owner: HWND, name: &str, filters: &[(&str, &str)], dir: &Path) -> Option<PathBuf> {
    unsafe {
        let d: IFileSaveDialog = CoCreateInstance(&FileSaveDialog, None, CLSCTX_INPROC_SERVER).ok()?;
        let (_k, s) = specs(filters);
        let _ = d.SetFileTypes(&s);
        let _ = d.SetFileName(&h(name));
        if let Some(e) = Path::new(name).extension() { let _ = d.SetDefaultExtension(&h(&e.to_string_lossy())); }
        let _ = d.SetOptions(d.GetOptions().unwrap_or_default() | FOS_OVERWRITEPROMPT | FOS_FORCEFILESYSTEM);
        let fd: IFileDialog = windows::core::Interface::cast(&d).ok()?;
        folder(&fd, dir);
        d.Show(Some(owner)).ok()?;
        result(&fd)
    }
}
pub fn open(owner: HWND, filters: &[(&str, &str)], dir: &Path) -> Option<PathBuf> {
    unsafe {
        let d: IFileOpenDialog = CoCreateInstance(&FileOpenDialog, None, CLSCTX_INPROC_SERVER).ok()?;
        let (_k, s) = specs(filters);
        let _ = d.SetFileTypes(&s);
        let _ = d.SetOptions(d.GetOptions().unwrap_or_default() | FOS_FILEMUSTEXIST | FOS_FORCEFILESYSTEM);
        let fd: IFileDialog = windows::core::Interface::cast(&d).ok()?;
        folder(&fd, dir);
        d.Show(Some(owner)).ok()?;
        result(&fd)
    }
}
pub fn copy_text(owner: HWND, text: &str) {
    let w: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        if OpenClipboard(Some(owner)).is_err() { return; }
        let _ = EmptyClipboard();
        if let Ok(g) = GlobalAlloc(GMEM_MOVEABLE, w.len() * 2) {
            let p = GlobalLock(g) as *mut u16;
            if !p.is_null() {
                std::ptr::copy_nonoverlapping(w.as_ptr(), p, w.len());
                let _ = GlobalUnlock(g);
                let _ = SetClipboardData(CF_UNICODETEXT.0 as u32, Some(HANDLE(g.0)));
            }
        }
        let _ = CloseClipboard();
    }
}
pub fn documents() -> PathBuf {
    let d = adhkar_common::installer::known(&FOLDERID_Documents).join("Adhkar");
    let _ = std::fs::create_dir_all(&d);
    d
}
pub fn pictures() -> PathBuf { adhkar_common::installer::known(&FOLDERID_Pictures) }
