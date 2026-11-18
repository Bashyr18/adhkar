//! The few registry values Adhkār keeps, all under the current user (no administrator needed).
use crate::wide;
use windows::core::PCWSTR;
use windows::Win32::Foundation::ERROR_SUCCESS;
use windows::Win32::System::Registry::*;

pub const HKCU: HKEY = HKEY_CURRENT_USER;

fn open(root: HKEY, path: &str, write: bool) -> Option<HKEY> {
    let mut k = HKEY::default();
    let p = wide(path);
    unsafe {
        let r = if write {
            RegCreateKeyExW(root, PCWSTR(p.as_ptr()), None, PCWSTR::null(), REG_OPTION_NON_VOLATILE, KEY_READ | KEY_WRITE, None, &mut k, None)
        } else {
            RegOpenKeyExW(root, PCWSTR(p.as_ptr()), None, KEY_READ, &mut k)
        };
        if r == ERROR_SUCCESS { Some(k) } else { None }
    }
}
fn close(k: HKEY) { unsafe { let _ = RegCloseKey(k); } }

pub fn get_string(root: HKEY, path: &str, name: &str) -> Option<String> {
    let k = open(root, path, false)?;
    let n = wide(name);
    let mut buf = vec![0u16; 2048];
    let mut len = (buf.len() * 2) as u32;
    let mut ty = REG_VALUE_TYPE::default();
    let r = unsafe { RegQueryValueExW(k, PCWSTR(n.as_ptr()), None, Some(&mut ty), Some(buf.as_mut_ptr() as *mut u8), Some(&mut len)) };
    close(k);
    if r != ERROR_SUCCESS || (ty != REG_SZ && ty != REG_EXPAND_SZ) { return None; }
    Some(crate::from_wide(&buf[..(len as usize / 2).min(buf.len())]))
}
pub fn get_dword(root: HKEY, path: &str, name: &str) -> Option<u32> {
    let k = open(root, path, false)?;
    let n = wide(name);
    let mut v = 0u32;
    let mut len = 4u32;
    let mut ty = REG_VALUE_TYPE::default();
    let r = unsafe { RegQueryValueExW(k, PCWSTR(n.as_ptr()), None, Some(&mut ty), Some(&mut v as *mut u32 as *mut u8), Some(&mut len)) };
    close(k);
    if r == ERROR_SUCCESS && ty == REG_DWORD { Some(v) } else { None }
}
pub fn exists(root: HKEY, path: &str, name: &str) -> bool {
    let Some(k) = open(root, path, false) else { return false };
    let n = wide(name);
    let r = unsafe { RegQueryValueExW(k, PCWSTR(n.as_ptr()), None, None, None, None) };
    close(k);
    r == ERROR_SUCCESS
}
pub fn set_string(root: HKEY, path: &str, name: &str, value: &str) -> bool {
    let Some(k) = open(root, path, true) else { return false };
    let n = wide(name);
    let v = wide(value);
    let bytes = unsafe { std::slice::from_raw_parts(v.as_ptr() as *const u8, v.len() * 2) };
    let r = unsafe { RegSetValueExW(k, PCWSTR(n.as_ptr()), None, REG_SZ, Some(bytes)) };
    close(k);
    r == ERROR_SUCCESS
}
pub fn set_dword(root: HKEY, path: &str, name: &str, value: u32) -> bool {
    let Some(k) = open(root, path, true) else { return false };
    let n = wide(name);
    let r = unsafe { RegSetValueExW(k, PCWSTR(n.as_ptr()), None, REG_DWORD, Some(&value.to_le_bytes())) };
    close(k);
    r == ERROR_SUCCESS
}
pub fn delete_value(root: HKEY, path: &str, name: &str) {
    if let Some(k) = open(root, path, true) {
        let n = wide(name);
        unsafe { let _ = RegDeleteValueW(k, PCWSTR(n.as_ptr())); }
        close(k);
    }
}
pub fn delete_tree(root: HKEY, path: &str) {
    let p = wide(path);
    unsafe { let _ = RegDeleteTreeW(root, PCWSTR(p.as_ptr())); }
}
