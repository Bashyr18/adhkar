//! The pill: a small floating capsule that keeps the day in view while you work. The app draws it (js/pill.js), in its
//! own fonts, colours and icons; this window floats that picture over your work with smooth edges and a soft shadow,
//! and sets the countdown each second from digits the app drew, so it keeps counting while Adhkār is hidden.
//! Rest the pointer on it to open it; click to keep it open; click a line to go to it; double-click opens Adhkār; drag
//! it anywhere; right-click for its options.
use std::cell::RefCell;

use base64::Engine;
use serde_json::{json, Value};
use windows::core::PCWSTR;
use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Gdi::*;
use windows::Win32::Graphics::Imaging::*;
use windows::Win32::System::Com::*;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::*;
use windows::Win32::UI::WindowsAndMessaging::*;

use adhkar_common::{self as ac, h};

use crate::{app, store};

const TICK: usize = 1;
const WM_MOUSELEAVE: u32 = 0x02A3;
const HOVER: usize = 2;
const ID_OPEN: usize = 11; const ID_TOP: usize = 12; const ID_CLOSE: usize = 13;

/* a picture in premultiplied BGRA, ready to be composed */
struct Img { w: u32, h: u32, px: Vec<u8> }
struct Pic { src: IWICBitmap, w: u32, h: u32 }

struct St {
    hwnd: HWND,
    k: f64,
    closed: Option<Pic>, open_img: Option<Pic>, atlas: Option<Pic>,
    s: f64, margin: f64, cell: f64, colon: f64, cell_h: f64, cd_x: f64, cd_top: f64, ar: bool,
    target: f64, asked: bool,
    rows: Vec<(f64, f64)>, routes: Vec<Option<String>>,
    place: String, hover_open: bool,
    open: bool, pinned: bool, hover: i32, want: bool,
    dragging: bool, moved: bool, grab: POINT, down: POINT, tracking: bool,
    top: bool,
    /* scaled pictures, kept while the size stays the same */
    cache: Option<(bool, u32, u32, Img)>, atlas_cache: Option<(u32, Img)>,
}
thread_local! { static ST: RefCell<Option<St>> = const { RefCell::new(None) }; }
fn with<T>(f: impl FnOnce(&mut St) -> T) -> Option<T> { ST.with(|s| s.borrow_mut().as_mut().map(f)) }

pub struct Pill;

fn factory() -> Option<IWICImagingFactory> { unsafe { CoCreateInstance(&CLSID_WICImagingFactory, None, CLSCTX_INPROC_SERVER).ok() } }
/* a PNG from the page, decoded once */
fn decode(b64: &str) -> Option<Pic> {
    let b64 = b64.split_once(',').map(|x| x.1).unwrap_or(b64);
    let bytes = base64::engine::general_purpose::STANDARD.decode(b64).ok()?;
    unsafe {
        let f = factory()?;
        let st = f.CreateStream().ok()?;
        st.InitializeFromMemory(&bytes).ok()?;
        let dec = f.CreateDecoderFromStream(&st, std::ptr::null(), WICDecodeMetadataCacheOnLoad).ok()?;
        let frame = dec.GetFrame(0).ok()?;
        let conv = f.CreateFormatConverter().ok()?;
        conv.Initialize(&frame, &GUID_WICPixelFormat32bppPBGRA, WICBitmapDitherTypeNone, None, 0.0, WICBitmapPaletteTypeCustom).ok()?;
        let bmp = f.CreateBitmapFromSource(&conv, WICBitmapCacheOnLoad).ok()?;
        let (mut w, mut hh) = (0u32, 0u32);
        bmp.GetSize(&mut w, &mut hh).ok()?;
        Some(Pic { src: bmp, w, h: hh })
    }
}
/* the picture at a given size, smoothly */
fn scaled(p: &Pic, w: u32, hh: u32) -> Option<Img> {
    if w == 0 || hh == 0 { return None; }
    unsafe {
        let f = factory()?;
        let sc = f.CreateBitmapScaler().ok()?;
        sc.Initialize(&p.src, w, hh, WICBitmapInterpolationModeHighQualityCubic).ok()?;
        let mut px = vec![0u8; (w * hh * 4) as usize];
        sc.CopyPixels(std::ptr::null(), w * 4, &mut px).ok()?;
        Some(Img { w, h: hh, px })
    }
}
/* one picture over another, both premultiplied */
fn over(dst: &mut Img, src: &Img, sx: i32, sy: i32, sw: i32, shh: i32, dx: i32, dy: i32) {
    for y in 0..shh {
        let (yy, ty) = (sy + y, dy + y);
        if yy < 0 || ty < 0 || yy >= src.h as i32 || ty >= dst.h as i32 { continue; }
        for x in 0..sw {
            let (xx, tx) = (sx + x, dx + x);
            if xx < 0 || tx < 0 || xx >= src.w as i32 || tx >= dst.w as i32 { continue; }
            let si = ((yy as u32 * src.w + xx as u32) * 4) as usize;
            let di = ((ty as u32 * dst.w + tx as u32) * 4) as usize;
            let a = src.px[si + 3] as u32;
            if a == 0 { continue; }
            for c in 0..4 { dst.px[di + c] = (src.px[si + c] as u32 + dst.px[di + c] as u32 * (255 - a) / 255).min(255) as u8; }
        }
    }
}
/* a soft light on the line under the pointer: white at 18/255, its corners rounded */
fn glow(dst: &mut Img, x0: f64, y0: f64, w: f64, hh: f64, r: f64) {
    let r = r.min(w / 2.0).min(hh / 2.0);
    for y in y0.floor().max(0.0) as i32..((y0 + hh).ceil() as i32).min(dst.h as i32) {
        for x in x0.floor().max(0.0) as i32..((x0 + w).ceil() as i32).min(dst.w as i32) {
            let (px, py) = (x as f64 + 0.5, y as f64 + 0.5);
            let cx = px.clamp(x0 + r, x0 + w - r);
            let cy = py.clamp(y0 + r, y0 + hh - r);
            let d = ((px - cx).powi(2) + (py - cy).powi(2)).sqrt();
            let cov = (r - d + 0.5).clamp(0.0, 1.0) * (px - x0).clamp(0.0, 1.0) * (x0 + w - px).clamp(0.0, 1.0);
            if cov <= 0.0 { continue; }
            let a = (18.0 * cov) as u32;
            let i = ((y as u32 * dst.w + x as u32) * 4) as usize;
            for c in 0..4 { dst.px[i + c] = (a + dst.px[i + c] as u32 * (255 - a) / 255).min(255) as u8; }
        }
    }
}

fn now_ms() -> f64 { std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as f64).unwrap_or(0.0) }
fn countdown(s: &mut St) -> String {
    if s.target <= 0.0 { return String::new(); }
    let left = s.target - now_ms();
    /* the time has come: the page may be resting while Adhkār is hidden, so wake it to draw what is next */
    if left <= 0.0 { if !s.asked { s.asked = true; ac::later(|| if let Some(a) = app() { a.post("window.Desk&&Desk.pillNow&&Desk.pillNow()") }); } } else { s.asked = false; }
    let t = (left.max(0.0) / 1000.0) as u64;
    let (hh, m, sec) = (t / 3600, (t % 3600) / 60, t % 60);
    if hh >= 1 { format!("{}:{:02}:{:02}", hh, m, sec) } else { format!("{}:{:02}", m, sec) }
}

fn render(s: &mut St) {
    let cd = countdown(s);
    let Some(pic) = (if s.open { s.open_img.as_ref() } else { s.closed.as_ref() }) else { return };
    let css = 1.0 / s.s;
    let (bw, bh) = (((pic.w as f64 * css) * s.k).round() as u32, ((pic.h as f64 * css) * s.k).round() as u32);
    let base = match &s.cache {
        Some((o, w, hh, img)) if *o == s.open && *w == bw && *hh == bh => Img { w: img.w, h: img.h, px: img.px.clone() },
        _ => {
            let Some(img) = scaled(pic, bw, bh) else { return };
            s.cache = Some((s.open, bw, bh, Img { w: img.w, h: img.h, px: img.px.clone() }));
            img
        }
    };
    let mut img = base;
    let pic_w = pic.w;
    /* the countdown, from the app's own digits, set at the end edge of the head */
    if !cd.is_empty() {
        if let Some(at) = s.atlas.as_ref() {
            let aw = ((at.w as f64 / s.s) * s.k).round() as u32;
            if s.atlas_cache.as_ref().map(|c| c.0) != Some(aw) {
                let ah = ((at.h as f64 / s.s) * s.k).round() as u32;
                if let Some(i) = scaled(at, aw, ah) { s.atlas_cache = Some((aw, i)); }
            }
            if let Some((_, a)) = s.atlas_cache.as_ref() {
                let w: f64 = cd.chars().map(|c| if c == ':' { s.colon } else { s.cell }).sum();
                let mut x = if s.ar { s.cd_x } else { s.cd_x - w };
                for c in cd.chars() {
                    let cw = if c == ':' { s.colon } else { s.cell };
                    let sx = if c == ':' { s.cell * 10.0 } else { (c as u32 - '0' as u32) as f64 * s.cell };
                    over(&mut img, a, (sx * s.k).round() as i32, 0, (cw * s.k).round() as i32, (s.cell_h * s.k).round() as i32, (x * s.k).round() as i32, (s.cd_top * s.k).round() as i32);
                    x += cw;
                }
            }
        }
    }
    /* the line under the pointer, gently lit */
    if s.open && s.hover >= 0 && (s.hover as usize) < s.rows.len() {
        let (ry, rh) = s.rows[s.hover as usize];
        let wcss = pic_w as f64 * css;
        glow(&mut img, (s.margin + 8.0) * s.k, (s.margin + ry) * s.k, (wcss - 2.0 * s.margin - 16.0) * s.k, (rh - 2.0) * s.k, 14.0 * s.k);
    }
    place(s, img.w as i32, img.h as i32);
    push(s.hwnd, &img);
}

/* where it sits: at the top of the screen like a notch, in the corner, or where it was dropped */
fn place(s: &St, w: i32, hh: i32) {
    unsafe {
        let mut r = RECT::default();
        let _ = GetWindowRect(s.hwnd, &mut r);
        let mon = MonitorFromPoint(POINT { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }, MONITOR_DEFAULTTONEAREST);
        let mut mi = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
        let _ = GetMonitorInfoW(mon, &mut mi);
        let wa = mi.rcWork;
        let m = (s.margin * s.k) as i32;
        let (x, y) = if s.dragging { (r.left, r.top) } else {
            match s.place.as_str() {
                "top" => (wa.left + (wa.right - wa.left - w) / 2, mi.rcMonitor.top + (6.0 * s.k) as i32 - m),
                "corner" => (wa.right - w + m - (14.0 * s.k) as i32, wa.bottom - hh + m - (14.0 * s.k) as i32),
                /* dropped somewhere: it grows upwards from its foot, and never above the screen */
                _ => (r.left, if r.bottom - r.top != hh && r.bottom > r.top { (r.bottom - hh).max(wa.top) } else { r.top }),
            }
        };
        let _ = SetWindowPos(s.hwnd, None, x, y, w, hh, SWP_NOZORDER | SWP_NOACTIVATE);
    }
}
/* per-pixel alpha onto the screen */
fn push(hwnd: HWND, img: &Img) {
    unsafe {
        let screen = GetDC(None);
        let mem = CreateCompatibleDC(Some(screen));
        let bi = BITMAPINFO { bmiHeader: BITMAPINFOHEADER { biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32, biWidth: img.w as i32, biHeight: -(img.h as i32), biPlanes: 1, biBitCount: 32, biCompression: BI_RGB.0, ..Default::default() }, ..Default::default() };
        let mut bits: *mut std::ffi::c_void = std::ptr::null_mut();
        if let Ok(hb) = CreateDIBSection(Some(screen), &bi, DIB_RGB_COLORS, &mut bits, None, 0) {
            std::ptr::copy_nonoverlapping(img.px.as_ptr(), bits as *mut u8, img.px.len());
            let old = SelectObject(mem, hb.into());
            let mut r = RECT::default();
            let _ = GetWindowRect(hwnd, &mut r);
            let pos = POINT { x: r.left, y: r.top };
            let size = SIZE { cx: img.w as i32, cy: img.h as i32 };
            let src = POINT { x: 0, y: 0 };
            let bl = BLENDFUNCTION { BlendOp: AC_SRC_OVER as u8, BlendFlags: 0, SourceConstantAlpha: 255, AlphaFormat: AC_SRC_ALPHA as u8 };
            let _ = UpdateLayeredWindow(hwnd, Some(screen), Some(&pos), Some(&size), Some(mem), Some(&src), COLORREF(0), Some(&bl), ULW_ALPHA);
            SelectObject(mem, old);
            let _ = DeleteObject(hb.into());
        }
        let _ = DeleteDC(mem);
        ReleaseDC(None, screen);
    }
}

fn row_at(s: &St, y: i32) -> i32 {
    if !s.open { return -1; }
    let yy = y as f64 / s.k - s.margin;
    s.rows.iter().position(|(ry, rh)| yy >= *ry && yy < ry + rh).map(|i| i as i32).unwrap_or(-1)
}

extern "system" fn wndproc(hwnd: HWND, msg: u32, wp: WPARAM, lp: LPARAM) -> LRESULT {
    let x = (lp.0 & 0xffff) as i16 as i32;
    let y = ((lp.0 >> 16) & 0xffff) as i16 as i32;
    unsafe {
        match msg {
            WM_TIMER if wp.0 == TICK => { with(render); LRESULT(0) }
            WM_TIMER if wp.0 == HOVER => {
                let _ = KillTimer(Some(hwnd), HOVER);
                with(|s| { if !s.pinned && s.open != s.want { s.open = s.want; s.hover = -1; render(s); } });
                LRESULT(0)
            }
            WM_MOUSEMOVE => {
                with(|s| {
                    if !s.tracking {
                        s.tracking = true;
                        let mut t = TRACKMOUSEEVENT { cbSize: std::mem::size_of::<TRACKMOUSEEVENT>() as u32, dwFlags: TME_LEAVE, hwndTrack: hwnd, dwHoverTime: 0 };
                        let _ = TrackMouseEvent(&mut t);
                        /* resting the pointer opens it a moment later */
                        if s.hover_open && !s.dragging { s.want = true; SetTimer(Some(hwnd), HOVER, 260, None); }
                    }
                    if s.dragging {
                        let mut p = POINT::default(); let _ = GetCursorPos(&mut p);
                        if (p.x - s.down.x).abs() > 3 || (p.y - s.down.y).abs() > 3 { s.moved = true; }
                        if s.moved {
                            let _ = SetWindowPos(hwnd, None, p.x - s.grab.x, p.y - s.grab.y, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE);
                            return;
                        }
                    }
                    let hv = row_at(s, y);
                    if hv != s.hover { s.hover = hv; render(s); }
                    let _ = SetCursor(Some(LoadCursorW(None, if hv >= 0 { IDC_HAND } else { IDC_ARROW }).unwrap_or_default()));
                });
                LRESULT(0)
            }
            WM_MOUSELEAVE => {
                with(|s| {
                    s.tracking = false;
                    if s.hover != -1 { s.hover = -1; render(s); }
                    /* leaving closes it, unless a click pinned it open */
                    if s.hover_open && !s.pinned { s.want = false; SetTimer(Some(hwnd), HOVER, 650, None); }
                });
                LRESULT(0)
            }
            WM_LBUTTONDOWN => {
                with(|s| {
                    s.dragging = true; s.moved = false;
                    let _ = GetCursorPos(&mut s.down);
                    let mut r = RECT::default(); let _ = GetWindowRect(hwnd, &mut r);
                    s.grab = POINT { x: s.down.x - r.left, y: s.down.y - r.top };
                });
                SetCapture(hwnd);
                LRESULT(0)
            }
            WM_LBUTTONUP => {
                let _ = ReleaseCapture();
                let go = with(|s| -> Option<String> {
                    if !s.dragging { return None; }
                    s.dragging = false;
                    if s.moved {
                        let mut r = RECT::default(); let _ = GetWindowRect(hwnd, &mut r);
                        store::set("nextAt", json!([r.left, r.top]));
                        /* dragged away from the top or the corner: it stays where it was dropped */
                        if s.place != "free" { s.place = "free".into(); ac::later(|| if let Some(a) = app() { a.post("window.Desk&&Desk.pillFree&&Desk.pillFree()") }); }
                        return None;
                    }
                    let i = row_at(s, y);
                    if i >= 0 { if let Some(r) = s.routes.get(i as usize).cloned().flatten() { return Some(r); } }
                    s.pinned = !(s.open && s.pinned);
                    s.open = s.pinned || !s.open;
                    if !s.pinned && s.hover_open { s.open = false; }
                    s.hover = -1;
                    render(s);
                    None
                }).flatten();
                if let Some(r) = go { ac::later(move || if let Some(a) = app() { a.bring(); a.route(&r); }); }
                LRESULT(0)
            }
            WM_LBUTTONDBLCLK => { ac::later(|| if let Some(a) = app() { a.bring() }); LRESULT(0) }
            WM_RBUTTONUP => {
                let top = with(|s| s.top).unwrap_or(false);
                let m = CreatePopupMenu().unwrap();
                let _ = AppendMenuW(m, MF_STRING, ID_OPEN, &h("Open Adhkār"));
                let _ = AppendMenuW(m, if top { MF_STRING | MF_CHECKED } else { MF_STRING }, ID_TOP, &h("Keep on top"));
                let _ = AppendMenuW(m, MF_SEPARATOR, 0, PCWSTR::null());
                let _ = AppendMenuW(m, MF_STRING, ID_CLOSE, &h("Close the pill"));
                let mut p = POINT::default(); let _ = GetCursorPos(&mut p);
                let _ = SetForegroundWindow(hwnd);
                let id = TrackPopupMenu(m, TPM_RIGHTBUTTON | TPM_RETURNCMD, p.x, p.y, Some(0), hwnd, None).0 as usize;
                let _ = DestroyMenu(m);
                match id {
                    ID_OPEN => ac::later(|| if let Some(a) = app() { a.bring() }),
                    ID_TOP => { let on = !top; store::set("nextTop", json!(on)); Pill.set_top(on); }
                    ID_CLOSE => { Pill.close(); ac::later(|| if let Some(a) = app() { a.pill_closed() }); }
                    _ => {}
                }
                let _ = x;
                LRESULT(0)
            }
            WM_MOUSEACTIVATE => LRESULT(MA_NOACTIVATE as isize),
            /* dragged to a screen of another scale: drawn again at that scale */
            WM_DPICHANGED => {
                let dpi = (wp.0 & 0xffff) as f64;
                with(|s| { s.k = dpi / 96.0; s.cache = None; s.atlas_cache = None; render(s); });
                LRESULT(0)
            }
            _ => DefWindowProcW(hwnd, msg, wp, lp),
        }
    }
}

impl Pill {
    pub fn new(top: bool) -> Option<Pill> {
        unsafe {
            let inst = GetModuleHandleW(None).ok()?;
            let class = h("AdhkarPill");
            let wc = WNDCLASSEXW { cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32, style: CS_DBLCLKS, lpfnWndProc: Some(wndproc), hInstance: inst.into(), hCursor: LoadCursorW(None, IDC_ARROW).unwrap_or_default(), lpszClassName: PCWSTR(class.as_ptr()), ..Default::default() };
            RegisterClassExW(&wc);
            let ex = WS_EX_LAYERED | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | if top { WS_EX_TOPMOST } else { WINDOW_EX_STYLE(0) };
            /* where it was left, if that is still on a screen; otherwise near the corner */
            let mut wa = RECT::default();
            let _ = SystemParametersInfoW(SPI_GETWORKAREA, 0, Some(&mut wa as *mut RECT as _), SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0));
            let mut at = POINT { x: wa.right - 400, y: wa.bottom - 120 };
            if let Some(v) = store::get("nextAt").and_then(|v| v.as_array().cloned()) {
                if v.len() == 2 {
                    let p = POINT { x: v[0].as_f64().unwrap_or(0.0) as i32, y: v[1].as_f64().unwrap_or(0.0) as i32 };
                    if !MonitorFromPoint(p, MONITOR_DEFAULTTONULL).is_invalid() { at = p; }
                }
            }
            let hwnd = CreateWindowExW(ex, &class, &h(ac::APP_NAME), WS_POPUP, at.x, at.y, 1, 1, None, None, Some(inst.into()), None).ok()?;
            let k = ac::dpi_of(hwnd);
            let open = ac::env("ADHKAR_PILL_OPEN").is_some();
            ST.with(|s| *s.borrow_mut() = Some(St {
                hwnd, k, closed: None, open_img: None, atlas: None, s: 2.0, margin: 18.0, cell: 0.0, colon: 0.0, cell_h: 0.0, cd_x: 0.0, cd_top: 0.0, ar: false,
                target: 0.0, asked: false, rows: vec![], routes: vec![], place: "top".into(), hover_open: true,
                open, pinned: open, hover: -1, want: false, dragging: false, moved: false, grab: POINT::default(), down: POINT::default(), tracking: false,
                top, cache: None, atlas_cache: None,
            }));
            let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
            SetTimer(Some(hwnd), TICK, 1000, None);
            Some(Pill)
        }
    }
    /* the next time, until the app's own picture arrives */
    pub fn set_target(&self, at: f64) { with(|s| if s.closed.is_none() { s.target = at; }); }
    pub fn set_info(&self, json: &str) {
        let Ok(o) = serde_json::from_str::<Value>(json) else { return };
        if o.get("closed").is_none() { return; }
        let d = |v: &Value, k: &str| v[k].as_f64().unwrap_or(0.0);
        let (Some(ci), Some(oi), Some(ai)) = (o["closed"]["img"].as_str().and_then(decode), o["open"]["img"].as_str().and_then(decode), o["atlas"]["img"].as_str().and_then(decode)) else { return };
        with(|s| {
            s.closed = Some(ci); s.open_img = Some(oi); s.atlas = Some(ai);
            s.cache = None; s.atlas_cache = None;
            if let Some(p) = o["place"].as_str().filter(|p| !p.is_empty()) { s.place = p.into(); }
            s.hover_open = o["hover"].as_bool() != Some(false);
            s.s = d(&o, "s"); if s.s <= 0.0 { s.s = 2.0; }
            s.target = d(&o, "target"); s.margin = d(&o, "margin");
            let (at, cd) = (&o["atlas"], &o["cd"]);
            s.cell = d(at, "cell"); s.colon = d(at, "colon"); s.cell_h = d(at, "h");
            s.cd_x = d(cd, "x"); s.cd_top = d(cd, "top"); s.ar = cd["ar"].as_bool() == Some(true);
            s.rows.clear(); s.routes.clear();
            for r in o["open"]["rows"].as_array().cloned().unwrap_or_default() {
                s.rows.push((d(&r, "y"), d(&r, "h")));
                s.routes.push(r["route"].as_str().map(String::from));
            }
            render(s);
        });
    }
    pub fn render(&self) { with(render); }
    pub fn alert(&self) { with(|s| { s.open = true; render(s); }); }
    pub fn set_top(&self, on: bool) {
        with(|s| { s.top = on; unsafe { let _ = SetWindowPos(s.hwnd, Some(if on { HWND_TOPMOST } else { HWND_NOTOPMOST }), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE); } });
    }
    pub fn close(&self) {
        if let Some(st) = ST.with(|s| s.borrow_mut().take()) { unsafe { let _ = KillTimer(Some(st.hwnd), TICK); let _ = DestroyWindow(st.hwnd); } }
    }
}
