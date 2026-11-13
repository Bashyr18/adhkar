// The next prayer, always in view: the computer's answer to the home-screen widget. A small window you can move
// anywhere and, if you like, keep on top. Double-click it to open Adhkār; right-click for its options.
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace Adhkar {
    class NextForm : Form {
        readonly MainForm main;
        readonly Timer tick = new Timer { Interval = 1000 };
        string label = "", time = ""; double at;
        bool dark;
        Point grab; bool dragging;
        static readonly Color Gold = Color.FromArgb(217, 178, 111), GoldDay = Color.FromArgb(138, 100, 32);

        public NextForm(MainForm m, bool isDark, bool top) {
            main = m; dark = isDark;
            Text = "Next prayer · Adhkār";
            FormBorderStyle = FormBorderStyle.None; ShowInTaskbar = false; TopMost = top;
            StartPosition = FormStartPosition.Manual;
            DoubleBuffered = true; AutoScaleMode = AutoScaleMode.Dpi;
            Size = new Size(Scale(248), Scale(92));
            var wa = Screen.PrimaryScreen.WorkingArea;
            var p = Store.Get("nextAt", null) as System.Collections.ArrayList;
            var loc = new Point(wa.Right - Width - Scale(24), wa.Bottom - Height - Scale(24));
            if (p != null && p.Count == 2) { var q = new Point(Convert.ToInt32(p[0]), Convert.ToInt32(p[1])); foreach (var sc in Screen.AllScreens) if (sc.WorkingArea.Contains(q)) { loc = q; break; } }
            Location = loc;
            Theme(dark);
            var menu = new ContextMenuStrip();
            var onTop = new ToolStripMenuItem("Keep on top") { Checked = top, CheckOnClick = true };
            onTop.CheckedChanged += delegate { TopMost = onTop.Checked; Store.Set("nextTop", onTop.Checked); };
            menu.Items.Add("Open Adhkār", null, delegate { main.Bring(); main.Route("salah"); });
            menu.Items.Add(onTop);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Close", null, delegate { Close(); });
            ContextMenuStrip = menu;
            tick.Tick += delegate { Invalidate(); };
            tick.Start();
        }
        int Scale(int px) { using (var g = CreateGraphics()) return (int)Math.Round(px * g.DpiX / 96f); }
        public void Theme(bool isDark) { dark = isDark; BackColor = dark ? Color.FromArgb(16, 19, 28) : Color.FromArgb(255, 253, 249); Invalidate(); }
        public void Set(string l, double a, string t) { label = l; at = a; time = t; Invalidate(); }

        protected override void OnPaint(PaintEventArgs e) {
            var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias; g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
            var r = new Rectangle(0, 0, Width - 1, Height - 1);
            using (var pen = new Pen(Color.FromArgb(dark ? 60 : 70, Gold), 1)) g.DrawRectangle(pen, r);
            var gold = dark ? Gold : GoldDay; var ink = dark ? Color.FromArgb(245, 240, 231) : Color.FromArgb(28, 25, 20); var soft = dark ? Color.FromArgb(172, 167, 157) : Color.FromArgb(95, 88, 76);
            var pad = Scale(16);
            /* the page names the prayer in the app's language; the two fixed words follow it */
            var ar = label.Length > 0 && label[0] >= 0x0600 && label[0] <= 0x06FF;
            using (var k = new Font("Segoe UI Semibold", 8f)) using (var b = new SolidBrush(gold)) g.DrawString(ar ? "الصلاة القادمة" : "NEXT PRAYER", k, b, pad, Scale(10));
            using (var big = new Font("Segoe UI Semibold", 17f)) using (var b = new SolidBrush(ink)) g.DrawString(string.IsNullOrEmpty(label) ? "Adhkār" : label, big, b, pad - Scale(2), Scale(26));
            var now = (DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
            var left = at > now ? TimeSpan.FromMilliseconds(at - now) : TimeSpan.Zero;
            var cd = at <= 0 ? "" : left.TotalHours >= 1 ? string.Format("{0}:{1:00}:{2:00}", (int)left.TotalHours, left.Minutes, left.Seconds) : string.Format("{0}:{1:00}", left.Minutes, left.Seconds);
            using (var f = new Font("Segoe UI", 9.5f)) using (var b = new SolidBrush(soft)) g.DrawString((cd.Length > 0 ? (ar ? "بعد " : "in ") + cd : "") + (time.Length > 0 ? "  ·  " + time : ""), f, b, pad, Scale(62));
        }
        protected override void OnMouseDown(MouseEventArgs e) { base.OnMouseDown(e); if (e.Button == MouseButtons.Left) { dragging = true; grab = e.Location; } }
        protected override void OnMouseMove(MouseEventArgs e) { base.OnMouseMove(e); if (dragging) Location = new Point(Location.X + e.X - grab.X, Location.Y + e.Y - grab.Y); }
        protected override void OnMouseUp(MouseEventArgs e) { base.OnMouseUp(e); if (dragging) { dragging = false; Store.Set("nextAt", new System.Collections.ArrayList { Location.X, Location.Y }); } }
        protected override void OnDoubleClick(EventArgs e) { base.OnDoubleClick(e); main.Bring(); main.Route("salah"); }
        protected override void OnFormClosed(FormClosedEventArgs e) { tick.Stop(); tick.Dispose(); base.OnFormClosed(e); }
    }
}
