// The pill: a small floating capsule that keeps the day in view while you work. The app draws it (js/pill.js), in
// its own fonts, colours and icons; this window floats that picture over your work with smooth edges and a soft
// shadow, and sets the countdown each second from digits the app drew, so it keeps counting while Adhkār is hidden.
// Click it to open the day; click a line to go to it; double-click opens Adhkār; drag it anywhere; right-click for
// its options.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace Adhkar {
    class NextForm : Form {
        readonly MainForm main;
        readonly Timer tick = new Timer { Interval = 1000 };
        readonly float k;
        bool open, ar, pinned, hoverOpen = true;
        string place = "top";
        readonly Timer hoverT = new Timer { Interval = 260 };
        bool hoverWant;
        int hover = -1;
        Point grab, down; bool dragging, moved;
        Bitmap closedImg, openImg, atlas;
        float s = 2, cell, colon, cellH, cdX, cdTop, margin = 18;
        double target;
        readonly List<RectangleF> rows = new List<RectangleF>();
        readonly List<string> routes = new List<string>();

        public NextForm(MainForm m, bool isDark, bool top) {
            main = m;
            Text = "Adhkār";
            FormBorderStyle = FormBorderStyle.None; ShowInTaskbar = false; TopMost = top;
            StartPosition = FormStartPosition.Manual;
            using (var g = CreateGraphics()) k = g.DpiX / 96f;
            var wa = Screen.PrimaryScreen.WorkingArea;
            Size = new Size(S(376), S(104));
            var p = Store.Get("nextAt", null) as System.Collections.ArrayList;
            var loc = new Point(wa.Right - Width - S(8), wa.Bottom - Height - S(8));
            if (p != null && p.Count == 2) { var q = new Point(Convert.ToInt32(p[0]), Convert.ToInt32(p[1])); foreach (var sc in Screen.AllScreens) if (sc.WorkingArea.Contains(q)) { loc = q; break; } }
            Location = loc;
            var menu = new ContextMenuStrip();
            var onTop = new ToolStripMenuItem("Keep on top") { Checked = top, CheckOnClick = true };
            onTop.CheckedChanged += delegate { TopMost = onTop.Checked; Store.Set("nextTop", onTop.Checked); };
            menu.Items.Add("Open Adhkār", null, delegate { main.Bring(); });
            menu.Items.Add(onTop);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Close the pill", null, delegate { Close(); });
            ContextMenuStrip = menu;
            tick.Tick += delegate { Render(); };
            tick.Start();
            if (Environment.GetEnvironmentVariable("ADHKAR_PILL_OPEN") != null) open = pinned = true;
            /* resting the pointer opens it a moment later; leaving closes it, unless a click pinned it open */
            hoverT.Tick += delegate { hoverT.Stop(); if (pinned) return; if (open != hoverWant) { open = hoverWant; hover = -1; Render(); } };
        }
        protected override void OnMouseEnter(EventArgs e) { base.OnMouseEnter(e); if (!hoverOpen || dragging) return; hoverWant = true; hoverT.Interval = 260; hoverT.Stop(); hoverT.Start(); }
        /* where it sits: at the top of the screen like a notch, in the corner, or where it was dropped */
        void Place() {
            var sc = Screen.FromPoint(new Point(Left + Width / 2, Top + Height / 2));
            var wa = sc.WorkingArea; int m = S(margin);
            if (place == "top") { Left = wa.Left + (wa.Width - Width) / 2; Top = sc.Bounds.Top + S(6) - m; }
            else if (place == "corner") { Left = wa.Right - Width + m - S(14); Top = wa.Bottom - Height + m - S(14); }
        }
        protected override CreateParams CreateParams {
            get { var cp = base.CreateParams; cp.ExStyle |= 0x00080000 /* layered */ | 0x00000080 /* tool window */; return cp; }
        }
        protected override void OnShown(EventArgs e) { base.OnShown(e); Render(); }
        int S(float px) { return (int)Math.Round(px * k); }
        public void Theme(bool isDark) { Render(); }
        public void Set(string l, double a, string t) { if (closedImg == null) target = a; }
        public void Alert() { open = true; Render(); }

        static Bitmap Png(object b64) {
            var str = b64 as string; if (string.IsNullOrEmpty(str)) return null;
            using (var ms = new MemoryStream(Convert.FromBase64String(str))) using (var b = new Bitmap(ms)) return new Bitmap(b);
        }
        static double D(Dictionary<string, object> d, string key) { object o; return d != null && d.TryGetValue(key, out o) && o != null ? Convert.ToDouble(o) : 0; }
        public void SetInfo(string json) {
            Dictionary<string, object> o;
            try { o = Store.Json.Deserialize<Dictionary<string, object>>(json ?? "{}"); } catch { return; }
            if (o == null || !o.ContainsKey("closed")) return;
            try {
                var c = o["closed"] as Dictionary<string, object>; var op = o["open"] as Dictionary<string, object>;
                var at = o["atlas"] as Dictionary<string, object>; var cd = o["cd"] as Dictionary<string, object>;
                var pl = o.ContainsKey("place") ? o["place"] as string : null; if (!string.IsNullOrEmpty(pl)) place = pl;
                hoverOpen = !(o.ContainsKey("hover") && o["hover"] is bool && !(bool)o["hover"]);
                var ci = Png(c["img"]); var oi = Png(op["img"]); var ai = Png(at["img"]);
                if (ci == null || oi == null || ai == null) return;
                if (closedImg != null) closedImg.Dispose();
                if (openImg != null) openImg.Dispose();
                if (atlas != null) atlas.Dispose();
                closedImg = ci; openImg = oi; atlas = ai;
                s = (float)D(o, "s"); if (s <= 0) s = 2;
                target = D(o, "target"); margin = (float)D(o, "margin");
                cell = (float)D(at, "cell"); colon = (float)D(at, "colon"); cellH = (float)D(at, "h");
                cdX = (float)D(cd, "x"); cdTop = (float)D(cd, "top"); ar = cd.ContainsKey("ar") && cd["ar"] is bool && (bool)cd["ar"];
                rows.Clear(); routes.Clear();
                var list = op["rows"] as System.Collections.ArrayList;
                if (list != null) foreach (var x in list) {
                    var r = x as Dictionary<string, object>; if (r == null) continue;
                    rows.Add(new RectangleF(0, (float)D(r, "y"), 1, (float)D(r, "h")));
                    routes.Add(r["route"] as string);
                }
            } catch { return; }
            Render();
        }

        static double Now() { return (DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds; }
        bool asked;
        string Countdown() {
            if (target <= 0) return "";
            /* the time has come: the page may be resting while Adhkār is hidden, so wake it to draw what is next */
            if (target - Now() <= 0) { if (!asked) { asked = true; main.Post("window.Desk&&Desk.pillNow&&Desk.pillNow()"); } }
            else asked = false;
            var t = TimeSpan.FromMilliseconds(Math.Max(0, target - Now()));
            return t.TotalHours >= 1 ? string.Format("{0}:{1:00}:{2:00}", (int)t.TotalHours, t.Minutes, t.Seconds) : string.Format("{0}:{1:00}", t.Minutes, t.Seconds);
        }

        void Render() {
            if (!IsHandleCreated || IsDisposed || closedImg == null) return;
            var img = open ? openImg : closedImg;
            float css = 1f / s; /* image pixels to css pixels */
            int bw = S(img.Width * css), bh = S(img.Height * css);
            if (Width != bw || Height != bh) {
                /* at the top it grows downwards, like a notch opening; elsewhere upwards, so it never runs off the screen */
                var bottom = Bottom;
                Size = new Size(bw, bh);
                if (place == "free") {
                    Top = bottom - bh;
                    var wa = Screen.FromControl(this).WorkingArea;
                    if (Top < wa.Top) Top = wa.Top;
                }
            }
            if (place != "free" && !dragging) Place();
            using (var bmp = new Bitmap(bw, bh, PixelFormat.Format32bppPArgb))
            using (var g = Graphics.FromImage(bmp)) {
                g.Clear(Color.Transparent);
                g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality; g.SmoothingMode = SmoothingMode.AntiAlias;
                g.DrawImage(img, new Rectangle(0, 0, bw, bh));
                g.ScaleTransform(k, k);
                /* the countdown, from the app's own digits, set at the end edge of the head */
                var str = Countdown();
                if (str.Length > 0 && atlas != null) {
                    float w = 0; foreach (var ch in str) w += ch == ':' ? colon : cell;
                    float x = ar ? cdX : cdX - w;
                    foreach (var ch in str) {
                        float cw = ch == ':' ? colon : cell, sx = ch == ':' ? cell * 10 : (ch - '0') * cell;
                        g.DrawImage(atlas, new RectangleF(x, cdTop, cw, cellH), new RectangleF(sx * s, 0, cw * s, cellH * s), GraphicsUnit.Pixel);
                        x += cw;
                    }
                }
                /* the line under the pointer, gently lit */
                if (open && hover >= 0 && hover < rows.Count) {
                    var r = rows[hover];
                    using (var p = Round(new RectangleF(margin + 8, margin + r.Y, img.Width * css - 2 * margin - 16, r.Height - 2), 14))
                    using (var b = new SolidBrush(Color.FromArgb(18, 255, 255, 255))) g.FillPath(b, p);
                }
                Push(bmp);
                /* development only: with a debug port set, the pill also saves what it drew, for checking by eye */
                if (Environment.GetEnvironmentVariable("ADHKAR_DEBUG_PORT") != null) try { bmp.Save(Path.Combine(Store.Root, open ? "pill-open.png" : "pill.png"), ImageFormat.Png); } catch { }
            }
        }
        static GraphicsPath Round(RectangleF r, float rad) {
            rad = Math.Min(rad, Math.Min(r.Width, r.Height) / 2f);
            var p = new GraphicsPath(); float d = rad * 2;
            p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            p.CloseFigure(); return p;
        }

        /* ---------- per-pixel alpha onto the screen ---------- */
        [StructLayout(LayoutKind.Sequential)] struct PT { public int x, y; public PT(int a, int b) { x = a; y = b; } }
        [StructLayout(LayoutKind.Sequential)] struct SZ { public int cx, cy; public SZ(int a, int b) { cx = a; cy = b; } }
        [StructLayout(LayoutKind.Sequential, Pack = 1)] struct BLEND { public byte op, flags, alpha, format; }
        [DllImport("user32.dll")] static extern bool UpdateLayeredWindow(IntPtr h, IntPtr dst, ref PT pos, ref SZ size, IntPtr src, ref PT srcPos, int key, ref BLEND b, int flags);
        [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr h);
        [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr h, IntPtr dc);
        [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleDC(IntPtr dc);
        [DllImport("gdi32.dll")] static extern bool DeleteDC(IntPtr dc);
        [DllImport("gdi32.dll")] static extern IntPtr SelectObject(IntPtr dc, IntPtr o);
        [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr o);
        void Push(Bitmap bmp) {
            IntPtr screen = GetDC(IntPtr.Zero), mem = CreateCompatibleDC(screen), hb = IntPtr.Zero, old = IntPtr.Zero;
            try {
                hb = bmp.GetHbitmap(Color.FromArgb(0));
                old = SelectObject(mem, hb);
                var size = new SZ(bmp.Width, bmp.Height); var src = new PT(0, 0); var pos = new PT(Left, Top);
                var bl = new BLEND { op = 0, flags = 0, alpha = 255, format = 1 };
                UpdateLayeredWindow(Handle, screen, ref pos, ref size, mem, ref src, 0, ref bl, 2);
            } finally {
                ReleaseDC(IntPtr.Zero, screen);
                if (hb != IntPtr.Zero) { SelectObject(mem, old); DeleteObject(hb); }
                DeleteDC(mem);
            }
        }

        /* ---------- the mouse ---------- */
        int RowAt(Point p) {
            if (!open) return -1;
            float y = p.Y / k - margin;
            for (int i = 0; i < rows.Count; i++) if (y >= rows[i].Y && y < rows[i].Y + rows[i].Height) return i;
            return -1;
        }
        protected override void OnMouseDown(MouseEventArgs e) { base.OnMouseDown(e); if (e.Button == MouseButtons.Left) { dragging = true; moved = false; grab = e.Location; down = Cursor.Position; } }
        protected override void OnMouseMove(MouseEventArgs e) {
            base.OnMouseMove(e);
            if (dragging && (Math.Abs(Cursor.Position.X - down.X) > 3 || Math.Abs(Cursor.Position.Y - down.Y) > 3)) moved = true;
            if (dragging && moved) { Location = new Point(Location.X + e.X - grab.X, Location.Y + e.Y - grab.Y); Render(); return; }
            var hv = RowAt(e.Location);
            if (hv != hover) { hover = hv; Cursor = hv >= 0 ? Cursors.Hand : Cursors.Default; Render(); }
        }
        protected override void OnMouseLeave(EventArgs e) {
            base.OnMouseLeave(e);
            if (hover != -1) { hover = -1; Render(); }
            if (hoverOpen && !pinned) { hoverWant = false; hoverT.Interval = 650; hoverT.Stop(); hoverT.Start(); }
        }
        protected override void OnMouseUp(MouseEventArgs e) {
            base.OnMouseUp(e);
            if (!dragging) return;
            dragging = false;
            if (moved) {
                Store.Set("nextAt", new System.Collections.ArrayList { Location.X, Location.Y });
                /* dragged away from the top or the corner: it stays where it was dropped */
                if (place != "free") { place = "free"; main.Post("window.Desk&&Desk.pillFree&&Desk.pillFree()"); }
                return;
            }
            if (e.Button != MouseButtons.Left) return;
            var i = RowAt(e.Location);
            if (i >= 0 && routes[i] != null) { main.Bring(); main.Route(routes[i]); return; }
            pinned = !(open && pinned); open = pinned || !open; if (!pinned && hoverOpen) open = false;
            hover = -1; Render();
        }
        protected override void OnDoubleClick(EventArgs e) { base.OnDoubleClick(e); main.Bring(); }
        protected override void OnFormClosed(FormClosedEventArgs e) {
            tick.Stop(); tick.Dispose(); hoverT.Stop(); hoverT.Dispose();
            if (closedImg != null) closedImg.Dispose();
            if (openImg != null) openImg.Dispose();
            if (atlas != null) atlas.Dispose();
            base.OnFormClosed(e);
        }
    }
}
