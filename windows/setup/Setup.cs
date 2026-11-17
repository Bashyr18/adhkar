// Adhkār Setup: installs Adhkār the way Windows apps install, for the person signed in and without administrator
// rights: the program in its own folder (%LOCALAPPDATA%\Programs\Adhkar), a shortcut in Start and on the desktop, an
// entry in Settings > Apps to remove it, and, if chosen, a quiet start with Windows. It carries the app inside it.
//   Adhkar-Setup.exe               the window
//   Adhkar-Setup.exe /S            installs without asking (--open starts it afterwards)
//   Adhkar-Setup.exe --shot <dir>  pictures of each page, in English and Arabic, for the guide (installs nothing)
// ADHKAR_INSTALL_ROOT points everything at a test folder (and a test entry in the registry) for checking it.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Globalization;
using System.IO;
using System.IO.Pipes;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace AdhkarSetup {
    static class Program {
        [DllImport("shcore.dll")] static extern int SetProcessDpiAwareness(int value);

        [STAThread]
        static int Main(string[] args) {
            try { SetProcessDpiAwareness(2); } catch { }
            Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
            int i = Array.IndexOf(args, "--shot");
            if (i >= 0 && i + 1 < args.Length) { SetupForm.Shots(args[i + 1]); return 0; }
            if (Array.IndexOf(args, "/S") >= 0 || Array.IndexOf(args, "--silent") >= 0) {
                var err = Installer.Run(new Installer.Choice { Desktop = true, Startup = Installer.StartsWithWindows() }, null);
                if (err != null) { Console.Error.WriteLine(err); return 1; }
                if (Array.IndexOf(args, "--open") >= 0) Installer.Launch();
                return 0;
            }
            bool first; var m = new Mutex(true, "Local\\Adhkar.Setup", out first);
            if (!first) return 0;
            Application.Run(new SetupForm());
            GC.KeepAlive(m);
            return 0;
        }
    }

    /* ================= what installing does ================= */
    static class Installer {
        public class Choice { public bool Desktop, Startup; }
        const string Name = "Adhkār";
        static readonly string TestRoot = Environment.GetEnvironmentVariable("ADHKAR_INSTALL_ROOT");
        static bool Test { get { return !string.IsNullOrEmpty(TestRoot); } }

        public static string Dir {
            get { return Test ? Path.Combine(TestRoot, "Programs", "Adhkar") : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Adhkar"); }
        }
        public static string Exe { get { return Path.Combine(Dir, "Adhkar.exe"); } }
        static string StartDir { get { return Test ? Path.Combine(TestRoot, "Start") : Environment.GetFolderPath(Environment.SpecialFolder.Programs); } }
        static string DesktopDir { get { return Test ? Path.Combine(TestRoot, "Desktop") : Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory); } }
        static string UninstKey { get { return @"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + (Test ? "Adhkar-Test" : "Adhkar"); } }
        const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        static string RunValue { get { return Test ? "Adhkar-Test" : "Adhkar"; } }

        /* the version inside this setup, and the one already on the computer (null if none) */
        public static string Version {
            get { var v = Assembly.GetExecutingAssembly().GetName().Version; return v.Major + "." + v.Minor; }
        }
        public static string Installed() {
            try {
                if (!File.Exists(Exe)) return null;
                var f = FileVersionInfo.GetVersionInfo(Exe);
                return f.FileMajorPart + "." + f.FileMinorPart;
            } catch { return null; }
        }
        public static bool Newer(string a, string b) {
            var x = (a ?? "").Split('.'); var y = (b ?? "").Split('.');
            for (int i = 0; i < Math.Max(x.Length, y.Length); i++) {
                int p = 0, q = 0; if (i < x.Length) int.TryParse(x[i], out p); if (i < y.Length) int.TryParse(y[i], out q);
                if (p != q) return p > q;
            }
            return false;
        }
        public static long PayloadSize() {
            using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("Adhkar.exe")) return s == null ? 0 : s.Length;
        }
        public static bool StartsWithWindows() {
            try { using (var k = Registry.CurrentUser.OpenSubKey(RunKey)) return k != null && k.GetValue(RunValue) != null; } catch { return false; }
        }
        public static bool HasDesktopLink() { return File.Exists(Path.Combine(DesktopDir, Name + ".lnk")); }

        /* every running Adhkār is asked to close (it saves as it goes, so nothing is lost); one that does not is ended */
        static string Pipe() {
            var d = Environment.GetEnvironmentVariable("ADHKAR_DATA");
            if (string.IsNullOrEmpty(d)) return "Adhkar.Desktop.v1";
            unchecked { int h = 17; foreach (var ch in d.ToLowerInvariant()) h = h * 31 + ch; return "Adhkar.Desktop.v1." + ((uint)h).ToString("x8"); }
        }
        static List<Process> Running() {
            var l = new List<Process>();
            foreach (var p in Process.GetProcesses()) {
                try {
                    var path = p.MainModule.FileName;
                    if (string.Equals(Path.GetFullPath(path), Path.GetFullPath(Exe), StringComparison.OrdinalIgnoreCase)) l.Add(p);
                } catch { }
            }
            return l;
        }
        public static bool IsRunning() { return Running().Count > 0; }
        static void CloseRunning() {
            var l = Running();
            if (l.Count == 0) return;
            try {
                using (var c = new NamedPipeClientStream(".", Pipe(), PipeDirection.Out)) {
                    c.Connect(1500);
                    var b = Encoding.UTF8.GetBytes("--quit"); c.Write(b, 0, b.Length);
                }
            } catch { }
            var until = DateTime.Now.AddSeconds(8);
            foreach (var p in l) { try { p.WaitForExit((int)Math.Max(0, (until - DateTime.Now).TotalMilliseconds)); } catch { } }
            foreach (var p in l) { try { if (!p.HasExited) { p.Kill(); p.WaitForExit(3000); } } catch { } }
        }

        /* returns null when done, or what went wrong; tell(percent, step) reports progress */
        public static string Run(Choice c, Action<int, string> tell) {
            Action<int, string> say = tell ?? ((a, b) => { });
            string step = "";
            try {
                step = T("Closing Adhkār", "إغلاق أذكار"); say(4, step);
                CloseRunning();

                step = T("Copying the app", "نسخ التطبيق"); say(10, step);
                Directory.CreateDirectory(Dir);
                var tmp = Exe + ".new";
                using (var src = Assembly.GetExecutingAssembly().GetManifestResourceStream("Adhkar.exe"))
                using (var dst = File.Create(tmp)) {
                    var buf = new byte[1 << 16]; long done = 0, all = Math.Max(1, src.Length); int n;
                    while ((n = src.Read(buf, 0, buf.Length)) > 0) {
                        dst.Write(buf, 0, n); done += n;
                        say(10 + (int)(60 * done / all), step);
                    }
                }
                if (File.Exists(Exe)) {
                    try { File.Delete(Exe); }
                    catch { File.Move(Exe, Exe + ".old"); }   /* a file still held is moved aside; the app removes it next time */
                }
                File.Move(tmp, Exe);

                step = T("Adding it to Start", "إضافته إلى قائمة ابدأ"); say(76, step);
                Directory.CreateDirectory(StartDir);
                foreach (var old in new[] { "Adhkar.lnk", Name + ".lnk" }) { try { File.Delete(Path.Combine(StartDir, old)); } catch { } }
                Link(Path.Combine(StartDir, Name + ".lnk"));
                Directory.CreateDirectory(DesktopDir);
                foreach (var old in new[] { "Adhkar.lnk", Name + ".lnk" }) { try { File.Delete(Path.Combine(DesktopDir, old)); } catch { } }
                if (c.Desktop) Link(Path.Combine(DesktopDir, Name + ".lnk"));

                step = T("Adding it to Settings › Apps", "إضافته إلى الإعدادات › التطبيقات"); say(88, step);
                using (var k = Registry.CurrentUser.CreateSubKey(UninstKey)) {
                    k.SetValue("DisplayName", Test ? Name + " (test)" : Name);
                    k.SetValue("DisplayVersion", Version);
                    k.SetValue("Publisher", "Adhkār, open source");
                    k.SetValue("Comments", "Remembrance for every moment");
                    k.SetValue("DisplayIcon", Exe + ",0");
                    k.SetValue("InstallLocation", Dir);
                    k.SetValue("UninstallString", "\"" + Exe + "\" --uninstall");
                    k.SetValue("QuietUninstallString", "\"" + Exe + "\" --uninstall --quiet");
                    k.SetValue("URLInfoAbout", "https://bashyr18.github.io/adhkar/guide/");
                    k.SetValue("HelpLink", "https://bashyr18.github.io/adhkar/guide/");
                    k.SetValue("URLUpdateInfo", "https://github.com/Bashyr18/adhkar/releases/latest");
                    k.SetValue("InstallDate", DateTime.Now.ToString("yyyyMMdd", CultureInfo.InvariantCulture));
                    k.SetValue("EstimatedSize", (int)(new FileInfo(Exe).Length / 1024), RegistryValueKind.DWord);
                    k.SetValue("NoModify", 1, RegistryValueKind.DWord); k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                }
                using (var k = Registry.CurrentUser.CreateSubKey(RunKey)) {
                    if (c.Startup) k.SetValue(RunValue, "\"" + Exe + "\" --tray");
                    else if (k.GetValue(RunValue) != null) k.DeleteValue(RunValue);
                }
                say(100, T("Done", "تمّ"));
                return null;
            } catch (Exception e) {
                try { File.Delete(Exe + ".new"); } catch { }
                return step + ": " + e.Message;
            }
        }
        static void Link(string lnk) {
            /* the scripting shell writes file names in the old code page, which turns ā into a: save under a plain
               name, then give the file its real one */
            var plain = Path.Combine(Path.GetDirectoryName(lnk), "adhkar-new-shortcut.lnk");
            var t = Type.GetTypeFromProgID("WScript.Shell"); dynamic sh = Activator.CreateInstance(t);
            dynamic l = sh.CreateShortcut(plain);
            l.TargetPath = Exe; l.Description = "Remembrance for every moment"; l.WorkingDirectory = Dir; l.IconLocation = Exe + ",0";
            l.Save();
            Marshal.FinalReleaseComObject(l); Marshal.FinalReleaseComObject(sh);
            if (File.Exists(lnk)) File.Delete(lnk);
            File.Move(plain, lnk);
        }
        public static void Launch() {
            try { Process.Start(new ProcessStartInfo(Exe) { UseShellExecute = true, WorkingDirectory = Dir }); } catch { }
        }

        /* English, or Arabic when Windows is set to Arabic */
        public static bool Ar = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "ar" || Environment.GetEnvironmentVariable("ADHKAR_SETUP_LANG") == "ar";
        public static string T(string en, string ar) { return Ar ? ar : en; }
    }

    /* ================= the window =================
       Two panels: the brand on the left (windows/setup/art-*.png, drawn by tools/setup-art.js with the app's own
       fonts and rosette), the task on the right. Everything is painted here at 96 dpi units, scaled for the screen
       and mirrored for Arabic; pages slide in, progress eases, and every control can be reached with Tab. */
    class SetupForm : Form {
        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h, int attr, ref int value, int size);

        enum Page { Welcome, Working, Done, Failed }
        Page page = Page.Welcome;
        bool desktop, startup, open = true, rtl = Installer.Ar;
        int pct; float shown; string error = "", hot, down, focus;
        string have = Installer.Installed(), mine = Installer.Version;
        float s = 1;
        const int W = 720, H = 470, ART = 260, PAD = 40;
        int CX { get { return ART + PAD; } }            /* where the content starts */
        int CW { get { return W - ART - PAD * 2; } }    /* and how wide it is */

        /* the app's own colours (web/app.css), dark or light as Windows is set */
        readonly bool dark;
        Color Bg, S1, S2, Line, T1, T2, T3, Gold, Gold2, GoldDeep, Ink;
        Image art;
        static Image Res(string n) {
            using (var r = Assembly.GetExecutingAssembly().GetManifestResourceStream(n)) {
                if (r == null) return null;
                var m = new MemoryStream(); r.CopyTo(m); return Image.FromStream(m);
            }
        }

        /* motion: a page arrives over 320 ms; progress eases toward the real figure; the working ring turns */
        readonly System.Windows.Forms.Timer tick = new System.Windows.Forms.Timer { Interval = 15 };
        readonly Stopwatch clock = Stopwatch.StartNew();
        double pageAt, doneAt;

        public SetupForm() : this(SystemDark()) { }
        public SetupForm(bool dark) {
            this.dark = dark;
            Palette();
            art = Res("art-" + (dark ? "dark" : "light") + (rtl ? "-ar" : "") + ".png");
            desktop = have == null || Installer.HasDesktopLink();
            startup = Installer.StartsWithWindows();
            Text = Installer.T("Adhkār Setup", "تثبيت أذكار");
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            FormBorderStyle = FormBorderStyle.FixedSingle; MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            DoubleBuffered = true; KeyPreview = true; BackColor = Bg;
            using (var g = CreateGraphics()) s = g.DpiX / 96f;
            ClientSize = new Size((int)(W * s), (int)(H * s));
            tick.Tick += delegate { Invalidate(); if (!Moving()) tick.Stop(); };
            Go(Page.Welcome);
        }
        static bool SystemDark() {
            try {
                using (var k = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")) {
                    var v = k == null ? null : k.GetValue("AppsUseLightTheme");
                    return !(v is int && (int)v == 1);
                }
            } catch { return true; }
        }
        void Palette() {
            if (dark) {
                Bg = Color.FromArgb(9, 10, 16); S1 = Color.FromArgb(17, 20, 30); S2 = Color.FromArgb(24, 28, 40); Line = Color.FromArgb(30, 240, 228, 206);
                T1 = Color.FromArgb(245, 240, 231); T2 = Color.FromArgb(180, 175, 165); T3 = Color.FromArgb(140, 136, 126);
                Gold = Color.FromArgb(217, 178, 111); Gold2 = Color.FromArgb(246, 223, 170); GoldDeep = Color.FromArgb(176, 134, 66); Ink = Color.FromArgb(26, 20, 8);
            } else {
                Bg = Color.FromArgb(250, 247, 241); S1 = Color.FromArgb(255, 255, 255); S2 = Color.FromArgb(243, 237, 226); Line = Color.FromArgb(34, 64, 46, 18);
                T1 = Color.FromArgb(28, 24, 18); T2 = Color.FromArgb(88, 80, 68); T3 = Color.FromArgb(118, 110, 98);
                Gold = Color.FromArgb(166, 120, 46); Gold2 = Color.FromArgb(201, 154, 69); GoldDeep = Color.FromArgb(132, 92, 30); Ink = Color.FromArgb(255, 252, 245);
            }
        }
        protected override void OnHandleCreated(EventArgs e) {
            base.OnHandleCreated(e);
            try {
                int d = dark ? 1 : 0; DwmSetWindowAttribute(Handle, 20, ref d, 4);
                int c = Bg.R | (Bg.G << 8) | (Bg.B << 16); DwmSetWindowAttribute(Handle, 35, ref c, 4);
                int t = T1.R | (T1.G << 8) | (T1.B << 16); DwmSetWindowAttribute(Handle, 36, ref t, 4);
            } catch { }
        }

        double Now { get { return clock.Elapsed.TotalMilliseconds; } }
        bool Moving() { return Now - pageAt < 360 || page == Page.Working || Math.Abs(shown - pct) > .3f || (page == Page.Done && Now - doneAt < 700); }
        void Go(Page p) {
            page = p; pageAt = Now; if (p == Page.Done) doneAt = Now;
            focus = null; hot = null;
            tick.Start(); Invalidate();
        }
        static double Ease(double t) { t = Math.Max(0, Math.Min(1, t)); return 1 - Math.Pow(1 - t, 3); }

        /* ---------- drawing helpers ---------- */
        readonly Dictionary<string, RectangleF> spots = new Dictionary<string, RectangleF>();
        readonly List<string> order = new List<string>();
        float dy;   /* the arriving page's offset */
        RectangleF R(float x, float y, float w, float h) {
            if (rtl) x = W - x - w;
            return new RectangleF(x * s, (y + dy) * s, w * s, h * s);
        }
        static readonly string Face = PickFace();
        static string PickFace() {
            using (var f = new InstalledFontCollection())
                foreach (var ff in f.Families) if (ff.Name == "Segoe UI Variable Display") return ff.Name;
            return "Segoe UI";
        }
        Font F(float size, FontStyle st) { return new Font(Face, size * s, st, GraphicsUnit.Pixel); }
        int alpha = 255;
        Color A(Color c) { return Color.FromArgb(c.A * alpha / 255, c); }
        void Say(Graphics g, string text, float size, FontStyle st, Color c, RectangleF r, bool centre = false, bool end = false, bool middle = false, bool path = false) {
            using (var f = F(size, st)) using (var b = new SolidBrush(A(c)))
            using (var fmt = new StringFormat()) {
                fmt.Alignment = centre ? StringAlignment.Center : end ? StringAlignment.Far : StringAlignment.Near;
                fmt.LineAlignment = middle ? StringAlignment.Center : StringAlignment.Near;
                if (rtl) fmt.FormatFlags |= StringFormatFlags.DirectionRightToLeft;
                fmt.Trimming = path ? StringTrimming.EllipsisPath : StringTrimming.EllipsisCharacter;
                if (path) { fmt.FormatFlags |= StringFormatFlags.NoWrap; fmt.FormatFlags &= ~StringFormatFlags.DirectionRightToLeft; if (rtl) fmt.Alignment = StringAlignment.Far; }
                g.DrawString(text, f, b, r, fmt);
            }
        }
        static GraphicsPath Round(RectangleF r, float rad) {
            var p = new GraphicsPath(); float d = Math.Min(rad * 2, Math.Min(r.Width, r.Height));
            p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            p.CloseFigure(); return p;
        }
        void Spot(string id, RectangleF r) { spots[id] = r; order.Add(id); }
        void Ring(Graphics g, RectangleF r, float rad) {
            var o = RectangleF.Inflate(r, 3 * s, 3 * s);
            using (var p = Round(o, rad + 3)) using (var pen = new Pen(A(Color.FromArgb(200, Gold)), 2 * s)) g.DrawPath(pen, p);
        }
        void Button(Graphics g, string id, string label, RectangleF r, bool primary) {
            Spot(id, r);
            bool h = hot == id, pr = down == id;
            using (var p = Round(r, 12 * s)) {
                if (primary) {
                    using (var b = new LinearGradientBrush(r, A(pr ? GoldDeep : h ? Gold2 : Color.FromArgb(Gold.R + (255 - Gold.R) / 6, Gold.G + (255 - Gold.G) / 6, Gold.B + (255 - Gold.B) / 6)), A(pr ? GoldDeep : Gold), 90f)) g.FillPath(b, p);
                    using (var pen = new Pen(A(Color.FromArgb(70, 255, 255, 255)), 1 * s)) g.DrawLine(pen, r.X + 12 * s, r.Y + 1 * s, r.Right - 12 * s, r.Y + 1 * s);
                } else {
                    using (var b = new SolidBrush(A(h ? S2 : S1))) g.FillPath(b, p);
                    using (var pen = new Pen(A(Line), 1 * s)) g.DrawPath(pen, p);
                }
            }
            if (focus == id) Ring(g, r, 12 * s);
            using (var f = F(14, FontStyle.Bold)) using (var b = new SolidBrush(A(primary ? Ink : T1)))
            using (var fmt = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                g.DrawString(label, f, b, r, fmt);
        }
        /* a switch, as in the app's settings */
        void Toggle(Graphics g, string id, bool on, string label, string sub, float y) {
            var row = R(CX - 12, y - 10, CW + 24, sub == null ? 44 : 60);
            Spot(id, row);
            if (hot == id) using (var p = Round(row, 12 * s)) using (var b = new SolidBrush(A(S1))) g.FillPath(b, p);
            if (focus == id) Ring(g, row, 12 * s);
            var sw = R(CX + CW - 42, y + 1, 42, 24);
            using (var p = Round(sw, 12 * s)) {
                if (on) using (var b = new LinearGradientBrush(sw, A(Gold2), A(Gold), 90f)) g.FillPath(b, p);
                else { using (var b = new SolidBrush(A(S2))) g.FillPath(b, p); using (var pen = new Pen(A(Line), 1 * s)) g.DrawPath(pen, p); }
            }
            float kx = (on != rtl) ? sw.Right - 22 * s : sw.X + 2 * s;
            var knob = new RectangleF(kx, sw.Y + 2 * s, 20 * s, 20 * s);
            using (var b = new SolidBrush(A(on ? Ink : dark ? Color.FromArgb(150, 146, 136) : Color.White))) g.FillEllipse(b, knob);
            if (!on && !dark) using (var pen = new Pen(A(Line), 1 * s)) g.DrawEllipse(pen, knob);
            Say(g, label, 14.5f, FontStyle.Bold, T1, R(CX, y, CW - 60, 22));
            if (sub != null) Say(g, sub, 12.5f, FontStyle.Regular, T3, R(CX, y + 22, CW - 60, 20));
        }
        void Check(Graphics g, PointF c, float r, float t, Color fill, Color stroke) {
            using (var b = new SolidBrush(A(fill))) g.FillEllipse(b, c.X - r, c.Y - r, r * 2, r * 2);
            if (t <= 0) return;
            var pts = new[] { new PointF(c.X - r * .42f, c.Y + r * .02f), new PointF(c.X - r * .1f, c.Y + r * .34f), new PointF(c.X + r * .45f, c.Y - r * .3f) };
            using (var pen = new Pen(A(stroke), Math.Max(1.6f * s, r * .17f)) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round }) {
                /* drawn on, stroke by stroke */
                float l1 = .45f;
                if (t < l1) g.DrawLine(pen, pts[0], Lerp(pts[0], pts[1], t / l1));
                else g.DrawLines(pen, new[] { pts[0], pts[1], Lerp(pts[1], pts[2], (t - l1) / (1 - l1)) });
            }
        }
        static PointF Lerp(PointF a, PointF b, float t) { t = Math.Max(0, Math.Min(1, t)); return new PointF(a.X + (b.X - a.X) * t, a.Y + (b.Y - a.Y) * t); }

        protected override void OnPaint(PaintEventArgs e) { Draw(e.Graphics); }
        public void Draw(Graphics g) {
            spots.Clear(); order.Clear();
            g.SmoothingMode = SmoothingMode.AntiAlias; g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Bg);

            /* the brand panel, and a hairline where it meets the page */
            alpha = 255; dy = 0;
            var ar = R(0, 0, ART, H);
            if (art != null) g.DrawImage(art, ar);
            using (var pen = new Pen(Line, 1 * s)) { float x = rtl ? ar.X : ar.Right; g.DrawLine(pen, x, 0, x, H * s); }
            /* the version, quietly at the foot of the panel */
            var chip = Installer.T("Version ", "الإصدار ") + mine;
            using (var f = F(11.5f, FontStyle.Bold)) {
                var w = g.MeasureString(chip, f).Width / s + 22;
                var r = R((ART - w) / 2, H - 46, w, 24);
                using (var p = Round(r, 12 * s)) {
                    using (var b = new SolidBrush(Color.FromArgb(dark ? 120 : 150, dark ? Color.Black : Color.White))) g.FillPath(b, p);
                    using (var pen = new Pen(Color.FromArgb(110, Gold), 1 * s)) g.DrawPath(pen, p);
                }
                Say(g, chip, 11.5f, FontStyle.Bold, dark ? Gold2 : GoldDeep, r, true, false, true);
            }

            /* the page, arriving */
            double t = Ease((Now - pageAt) / 320.0);
            alpha = (int)(255 * t); dy = (float)(14 * (1 - t));
            if (page == Page.Welcome) Welcome(g);
            else if (page == Page.Working) Working(g);
            else if (page == Page.Done) Finished(g);
            else Failed(g);
        }

        string Head() {
            if (have == null) return Installer.T("Install Adhkār", "ثبّت أذكار");
            return Installer.Newer(mine, have) ? Installer.T("Update Adhkār", "حدّث أذكار") : Installer.T("Reinstall Adhkār", "أعد تثبيت أذكار");
        }
        void Welcome(Graphics g) {
            string sub = have == null ? Installer.T("It opens like any app, from Start or your desktop.", "يُفتح كأي تطبيق، من قائمة ابدأ أو سطح المكتب.")
                : Installer.Newer(mine, have) ? Installer.T("From " + have + " to " + mine + ". Your record stays as it is.", "من " + have + " إلى " + mine + ". يبقى سجلك كما هو.")
                : Installer.T("Version " + have + " is installed. Your record stays as it is.", "الإصدار " + have + " مثبّت. يبقى سجلك كما هو.");
            Say(g, Head(), 24, FontStyle.Bold, T1, R(CX, 44, CW, 34));
            Say(g, sub, 14, FontStyle.Regular, T2, R(CX, 82, CW, 40));

            /* where it goes */
            var card = R(CX, 128, CW, 70);
            using (var p = Round(card, 14 * s)) {
                using (var b = new SolidBrush(A(S1))) g.FillPath(b, p);
                using (var pen = new Pen(A(Line), 1 * s)) g.DrawPath(pen, p);
            }
            Folder(g, R(CX + 16, 147, 30, 30));
            Say(g, Installer.T("For you only, no administrator needed", "لك وحدك، دون صلاحيات المسؤول"), 13.5f, FontStyle.Bold, T1, R(CX + 58, 142, CW - 74, 20));
            Say(g, Installer.Dir.Replace(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "%USERPROFILE%"), 12, FontStyle.Regular, T3, R(CX + 58, 163, CW - 74, 20), false, false, false, true);

            Toggle(g, "desktop", desktop, Installer.T("Shortcut on the desktop", "اختصار على سطح المكتب"), null, 228);
            Toggle(g, "startup", startup, Installer.T("Start with Windows", "ابدأ مع ويندوز"),
                Installer.T("Quietly in the tray, so reminders ring on time.", "بهدوء في شريط المهام، لتصلك التذكيرات في وقتها."), 274);

            using (var pen = new Pen(A(Line), 1 * s)) { var l = R(CX, 386, CW, 0); g.DrawLine(pen, l.X, l.Y, l.Right, l.Y); }
            string go = have == null ? Installer.T("Install", "ثبّت") : Installer.Newer(mine, have) ? Installer.T("Update", "حدّث") : Installer.T("Reinstall", "أعد التثبيت");
            Say(g, Installer.T("Free · No account · No ads · Works offline", "مجاني · بلا حساب · بلا إعلانات · يعمل دون إنترنت"), 12, FontStyle.Regular, T3, R(CX, 356, CW, 20));
            Button(g, "cancel", Installer.T("Cancel", "إلغاء"), R(CX + CW - 132 - 10 - 100, 404, 100, 42), false);
            Button(g, "go", go, R(CX + CW - 132, 404, 132, 42), true);
        }
        void Folder(Graphics g, RectangleF r) {
            using (var p = Round(r, 9 * s)) using (var b = new SolidBrush(A(Color.FromArgb(dark ? 40 : 34, Gold)))) g.FillPath(b, p);
            var i = RectangleF.Inflate(r, -8 * s, -9 * s);
            using (var pen = new Pen(A(Gold), 1.6f * s) { LineJoin = LineJoin.Round }) {
                var p = new GraphicsPath();
                p.AddLines(new[] { new PointF(i.X, i.Bottom), new PointF(i.X, i.Y), new PointF(i.X + i.Width * .38f, i.Y), new PointF(i.X + i.Width * .5f, i.Y + i.Height * .2f), new PointF(i.Right, i.Y + i.Height * .2f), new PointF(i.Right, i.Bottom) });
                p.CloseFigure(); g.DrawPath(pen, p);
            }
        }

        static readonly string[][] Steps = {
            new[] { "Closing Adhkār if it is open", "إغلاق أذكار إن كان مفتوحًا" },
            new[] { "Copying the app", "نسخ التطبيق" },
            new[] { "Adding it to Start and the desktop", "إضافته إلى قائمة ابدأ وسطح المكتب" },
            new[] { "Adding it to Settings › Apps", "إضافته إلى الإعدادات › التطبيقات" }
        };
        int StepNow { get { return pct >= 100 ? 4 : pct >= 88 ? 3 : pct >= 76 ? 2 : pct >= 10 ? 1 : 0; } }
        void Working(Graphics g) {
            Say(g, have == null ? Installer.T("Installing", "جارٍ التثبيت") : Installer.T("Updating", "جارٍ التحديث"), 24, FontStyle.Bold, T1, R(CX, 44, CW, 34));
            Say(g, Installer.T("This takes a few seconds.", "يستغرق ذلك ثوانيَ معدودة."), 14, FontStyle.Regular, T2, R(CX, 82, CW, 22));
            for (int i = 0; i < Steps.Length; i++) {
                float y = 134 + i * 46;
                var c = R(CX + 2, y, 26, 26); var cc = new PointF(c.X + c.Width / 2, c.Y + c.Height / 2);
                if (i < StepNow) Check(g, cc, 13 * s, 1, Gold, Ink);
                else if (i == StepNow) {
                    using (var pen = new Pen(A(Color.FromArgb(50, Gold)), 2.4f * s)) g.DrawEllipse(pen, RectangleF.Inflate(c, -2 * s, -2 * s));
                    using (var pen = new Pen(A(Gold), 2.4f * s) { StartCap = LineCap.Round, EndCap = LineCap.Round })
                        g.DrawArc(pen, RectangleF.Inflate(c, -2 * s, -2 * s), (float)(Now * .36 % 360), 90);
                } else using (var pen = new Pen(A(Line), 1.6f * s)) g.DrawEllipse(pen, RectangleF.Inflate(c, -2 * s, -2 * s));
                Say(g, Installer.T(Steps[i][0], Steps[i][1]), 14, i == StepNow ? FontStyle.Bold : FontStyle.Regular, i <= StepNow ? T1 : T3, R(CX + 42, y + 3, CW - 42, 22));
            }
            shown += (pct - shown) * .14f;
            var track = R(CX, 338, CW, 6);
            using (var p = Round(track, 3 * s)) using (var b = new SolidBrush(A(S2))) g.FillPath(b, p);
            var fw = Math.Max(6, CW * shown / 100f);
            var fill = R(CX, 338, fw, 6);
            using (var p = Round(fill, 3 * s)) using (var b = new LinearGradientBrush(new RectangleF(R(CX, 0, CW, 1).X, 0, CW * s, 1), A(GoldDeep), A(Gold2), rtl ? 180f : 0f)) g.FillPath(b, p);
            Say(g, Math.Round(shown) + "%", 12.5f, FontStyle.Bold, Gold, R(CX, 352, CW, 20), false, true);
            Say(g, Installer.T("Your record is kept apart from the program: nothing you have counted is touched.", "سجلك محفوظ بعيدًا عن البرنامج: لا يُمسّ شيء مما عددته."), 12, FontStyle.Regular, T3, R(CX, 414, CW, 36));
        }
        void Finished(Graphics g) {
            double t = Ease((Now - doneAt - 120) / 520.0);
            var c = R(CX, 44, 52, 52); var cc = new PointF(c.X + c.Width / 2, c.Y + c.Height / 2);
            float grow = (float)(.7 + .3 * Ease((Now - doneAt) / 260.0));
            using (var b = new SolidBrush(A(Color.FromArgb(dark ? 40 : 30, Gold)))) g.FillEllipse(b, RectangleF.Inflate(c, 8 * s * grow, 8 * s * grow));
            Check(g, cc, 26 * s * grow, (float)t, Gold, Ink);
            Say(g, have == null ? Installer.T("Adhkār is installed", "ثُبّت أذكار") : Installer.T("Adhkār is up to date", "أذكار محدَّث"), 24, FontStyle.Bold, T1, R(CX + 68, 46, CW - 68, 34));
            Say(g, Installer.T("Version " + mine + ", ready in Start.", "الإصدار " + mine + "، جاهز في قائمة ابدأ."), 14, FontStyle.Regular, T2, R(CX + 68, 80, CW - 68, 22));
            var rows = new[] {
                new[] { "Open it from Start" + (desktop ? " or the desktop" : ""), "افتحه من قائمة ابدأ" + (desktop ? " أو سطح المكتب" : "") },
                new[] { "It updates itself when you ask it to", "يحدّث نفسه متى طلبت" },
                new[] { "Remove it from Settings › Apps; your record stays", "أزله من الإعدادات › التطبيقات، ويبقى سجلك" }
            };
            for (int i = 0; i < rows.Length; i++) {
                float y = 132 + i * 44;
                var card = R(CX, y, CW, 36);
                using (var p = Round(card, 10 * s)) using (var b = new SolidBrush(A(S1))) g.FillPath(b, p);
                var d = R(CX + 14, y + 15, 6, 6);
                using (var b = new SolidBrush(A(Gold))) g.FillEllipse(b, d);
                Say(g, Installer.T(rows[i][0], rows[i][1]), 13.5f, FontStyle.Regular, T2, R(CX + 32, y + 9, CW - 44, 20));
            }
            Toggle(g, "open", open, Installer.T("Open Adhkār now", "افتح أذكار الآن"), null, 288);
            using (var pen = new Pen(A(Line), 1 * s)) { var l = R(CX, 386, CW, 0); g.DrawLine(pen, l.X, l.Y, l.Right, l.Y); }
            Button(g, "finish", Installer.T("Finish", "إنهاء"), R(CX + CW - 132, 404, 132, 42), true);
        }
        void Failed(Graphics g) {
            Say(g, Installer.T("Adhkār could not be installed", "تعذّر تثبيت أذكار"), 24, FontStyle.Bold, T1, R(CX, 44, CW, 34));
            Say(g, Installer.T("Nothing you have recorded was touched. What happened:", "لم يُمسّ شيء من سجلك. ما حدث:"), 14, FontStyle.Regular, T2, R(CX, 82, CW, 22));
            var card = R(CX, 124, CW, 150);
            using (var p = Round(card, 14 * s)) {
                using (var b = new SolidBrush(A(S1))) g.FillPath(b, p);
                using (var pen = new Pen(A(Line), 1 * s)) g.DrawPath(pen, p);
            }
            Say(g, error, 13, FontStyle.Regular, T1, R(CX + 18, 140, CW - 36, 120));
            using (var pen = new Pen(A(Line), 1 * s)) { var l = R(CX, 386, CW, 0); g.DrawLine(pen, l.X, l.Y, l.Right, l.Y); }
            Button(g, "cancel", Installer.T("Close", "إغلاق"), R(CX + CW - 132 - 10 - 100, 404, 100, 42), false);
            Button(g, "go", Installer.T("Try again", "حاول مجددًا"), R(CX + CW - 132, 404, 132, 42), true);
        }

        /* ---------- the mouse and the keys ---------- */
        string At(Point p) { foreach (var kv in spots) if (kv.Value.Contains(p)) return kv.Key; return null; }
        protected override void OnMouseMove(MouseEventArgs e) {
            var h = At(e.Location);
            if (h != hot) { hot = h; Cursor = h == null ? Cursors.Default : Cursors.Hand; Invalidate(); }
        }
        protected override void OnMouseLeave(EventArgs e) { hot = null; down = null; Invalidate(); }
        protected override void OnMouseDown(MouseEventArgs e) { down = At(e.Location); focus = null; Invalidate(); }
        protected override void OnMouseUp(MouseEventArgs e) {
            var a = At(e.Location); var was = down; down = null; Invalidate();
            if (a != null && a == was) Act(a);
        }
        protected override bool ProcessDialogKey(Keys k) {
            if (k == Keys.Tab || k == (Keys.Tab | Keys.Shift)) {
                if (order.Count == 0) return true;
                int i = focus == null ? -1 : order.IndexOf(focus);
                i = (k & Keys.Shift) != 0 ? (i <= 0 ? order.Count - 1 : i - 1) : (i + 1) % order.Count;
                focus = order[i]; Invalidate(); return true;
            }
            return base.ProcessDialogKey(k);
        }
        protected override void OnKeyDown(KeyEventArgs e) {
            if (page == Page.Working) return;
            if (e.KeyCode == Keys.Space && focus != null) Act(focus);
            else if (e.KeyCode == Keys.Enter) Act(focus ?? (page == Page.Done ? "finish" : "go"));
            else if (e.KeyCode == Keys.Escape) Act(page == Page.Done ? "finish" : "cancel");
        }
        protected override void OnFormClosing(FormClosingEventArgs e) {
            if (page == Page.Working) e.Cancel = true;   /* never half-installed */
            base.OnFormClosing(e);
        }
        void Act(string a) {
            if (a == null) return;
            if (a == "desktop") desktop = !desktop;
            else if (a == "startup") startup = !startup;
            else if (a == "open") open = !open;
            else if (a == "cancel") Close();
            else if (a == "finish") { if (open) Installer.Launch(); Close(); }
            else if (a == "go") Install();
            Invalidate();
        }
        void Install() {
            pct = 0; shown = 0; Go(Page.Working);
            var c = new Installer.Choice { Desktop = desktop, Startup = startup };
            var th = new Thread(() => {
                var err = Installer.Run(c, (p, st) => BeginInvoke(new Action(() => { pct = p; tick.Start(); })));
                Thread.Sleep(700);   /* long enough to see each step complete */
                BeginInvoke(new Action(() => {
                    if (err == null) Go(Page.Done);
                    else { error = err; Go(Page.Failed); }
                }));
            }) { IsBackground = true };
            th.Start();
        }

        /* ---------- pictures for the guide ---------- */
        public static void Shots(string dir) {
            Directory.CreateDirectory(dir);
            foreach (var ar in new[] { false, true })
                foreach (var dk in new[] { true, false }) {
                    Installer.Ar = ar;
                    var f = new SetupForm(dk); f.rtl = ar; f.s = 2; f.have = null; f.desktop = true; f.startup = false;
                    f.art = Res("art-" + (dk ? "dark" : "light") + (ar ? "-ar" : "") + ".png");
                    foreach (Page p in Enum.GetValues(typeof(Page))) {
                        f.page = p; f.pageAt = f.doneAt = -100000; f.pct = 62; f.shown = 62; f.error = "Copying the app: access to the path is denied.";
                        using (var b = new Bitmap(W * 2, H * 2)) {
                            using (var g = Graphics.FromImage(b)) f.Draw(g);
                            b.Save(Path.Combine(dir, (ar ? "ar-" : "") + (dk ? "dark-" : "light-") + p.ToString().ToLowerInvariant() + ".png"));
                        }
                    }
                }
        }
    }
}
