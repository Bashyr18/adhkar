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

    /* ================= the window ================= */
    class SetupForm : Form {
        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h, int attr, ref int value, int size);

        enum Page { Welcome, Working, Done, Failed }
        Page page = Page.Welcome;
        bool desktop, startup, open = true, rtl = Installer.Ar;
        int pct; string step = "", error = "", hot, down;
        string have = Installer.Installed(), mine = Installer.Version;
        float s = 1;
        const int W = 640, H = 440;

        /* the app's own colours (web/app.css), dark or light as Windows is set */
        readonly bool dark;
        Color Bg, S1, Line, T1, T2, T3, Gold, GoldDeep, Ink;
        static readonly Image Logo = LoadLogo();
        static Image LoadLogo() { using (var r = Assembly.GetExecutingAssembly().GetManifestResourceStream("icon.png")) return r == null ? null : Image.FromStream(new MemoryStream(ReadAll(r))); }
        static byte[] ReadAll(Stream r) { var m = new MemoryStream(); r.CopyTo(m); return m.ToArray(); }

        public SetupForm() : this(SystemDark()) { }
        public SetupForm(bool dark) {
            this.dark = dark;
            Palette();
            desktop = have == null || Installer.HasDesktopLink();
            startup = Installer.StartsWithWindows();
            Text = Installer.T("Adhkār Setup", "تثبيت أذكار");
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            FormBorderStyle = FormBorderStyle.FixedSingle; MaximizeBox = false; MinimizeBox = true;
            StartPosition = FormStartPosition.CenterScreen;
            DoubleBuffered = true; KeyPreview = true; BackColor = Bg;
            RightToLeftLayout = false;
            using (var g = CreateGraphics()) s = g.DpiX / 96f;
            ClientSize = new Size((int)(W * s), (int)(H * s));
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
                Bg = Color.FromArgb(7, 8, 13); S1 = Color.FromArgb(16, 19, 28); Line = Color.FromArgb(34, 240, 228, 206);
                T1 = Color.FromArgb(245, 240, 231); T2 = Color.FromArgb(172, 167, 157); T3 = Color.FromArgb(138, 134, 124);
                Gold = Color.FromArgb(217, 178, 111); GoldDeep = Color.FromArgb(176, 134, 66); Ink = Color.FromArgb(26, 20, 8);
            } else {
                Bg = Color.FromArgb(245, 241, 233); S1 = Color.FromArgb(255, 253, 249); Line = Color.FromArgb(40, 64, 46, 18);
                T1 = Color.FromArgb(28, 24, 18); T2 = Color.FromArgb(92, 84, 72); T3 = Color.FromArgb(112, 104, 92);
                Gold = Color.FromArgb(160, 116, 44); GoldDeep = Color.FromArgb(132, 92, 30); Ink = Color.FromArgb(255, 252, 245);
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

        /* ---------- drawing: everything at 96 dpi units, scaled, and mirrored for Arabic ---------- */
        readonly Dictionary<string, RectangleF> spots = new Dictionary<string, RectangleF>();
        RectangleF R(float x, float y, float w, float h) {
            if (rtl) x = W - x - w;
            return new RectangleF(x * s, y * s, w * s, h * s);
        }
        static readonly string Face = PickFace();
        static string PickFace() {
            using (var f = new InstalledFontCollection())
                foreach (var ff in f.Families) if (ff.Name == "Segoe UI Variable Display") return ff.Name;
            return "Segoe UI";
        }
        Font F(float size, FontStyle st) { return new Font(Face, size * s, st, GraphicsUnit.Pixel); }
        void Say(Graphics g, string text, float size, FontStyle st, Color c, RectangleF r, bool centre = false, bool end = false) {
            using (var f = F(size, st)) using (var b = new SolidBrush(c))
            using (var fmt = new StringFormat()) {
                fmt.Alignment = centre ? StringAlignment.Center : end ? StringAlignment.Far : StringAlignment.Near;
                fmt.LineAlignment = StringAlignment.Near;
                if (rtl) fmt.FormatFlags |= StringFormatFlags.DirectionRightToLeft;
                fmt.Trimming = StringTrimming.EllipsisWord;
                g.DrawString(text, f, b, r, fmt);
            }
        }
        static GraphicsPath Round(RectangleF r, float rad) {
            var p = new GraphicsPath(); float d = rad * 2;
            p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            p.CloseFigure(); return p;
        }
        void Button(Graphics g, string id, string label, RectangleF r, bool primary) {
            spots[id] = r;
            bool h = hot == id, pr = down == id;
            using (var p = Round(r, r.Height / 2)) {
                if (primary) {
                    using (var b = new LinearGradientBrush(r, pr ? GoldDeep : ControlPaint.Light(Gold, h ? .25f : .12f), pr ? GoldDeep : Gold, 90f)) g.FillPath(b, p);
                } else {
                    using (var b = new SolidBrush(h ? Color.FromArgb(dark ? 22 : 14, T1) : Color.Transparent)) g.FillPath(b, p);
                    using (var pen = new Pen(h ? Color.FromArgb(120, Gold) : Line, 1 * s)) g.DrawPath(pen, p);
                }
            }
            using (var f = F(14, FontStyle.Bold)) using (var b = new SolidBrush(primary ? Ink : T1))
            using (var fmt = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                g.DrawString(label, f, b, r, fmt);
        }
        void Check(Graphics g, string id, bool on, string label, string sub, float y) {
            var box = R(40, y + 2, 20, 20);
            spots[id] = R(32, y - 6, W - 64, sub == null ? 34 : 50);
            if (hot == id) using (var p = Round(spots[id], 10 * s)) using (var b = new SolidBrush(Color.FromArgb(dark ? 14 : 10, T1))) g.FillPath(b, p);
            using (var p = Round(box, 6 * s)) {
                if (on) { using (var b = new SolidBrush(Gold)) g.FillPath(b, p); }
                else using (var pen = new Pen(Color.FromArgb(140, T3), 1.5f * s)) g.DrawPath(pen, p);
            }
            if (on) using (var pen = new Pen(Ink, 2.2f * s) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round })
                g.DrawLines(pen, new[] { new PointF(box.X + 5 * s, box.Y + 10.5f * s), new PointF(box.X + 8.5f * s, box.Y + 14 * s), new PointF(box.X + 15 * s, box.Y + 6.5f * s) });
            Say(g, label, 14.5f, FontStyle.Bold, T1, R(72, y, W - 112, 24));
            if (sub != null) Say(g, sub, 12.5f, FontStyle.Regular, T3, R(72, y + 22, W - 112, 20));
        }

        protected override void OnPaint(PaintEventArgs e) { Draw(e.Graphics); }
        public void Draw(Graphics g) {
            spots.Clear();
            g.SmoothingMode = SmoothingMode.AntiAlias; g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Bg);
            /* a soft light at the top, as at dawn */
            var glow = new RectangleF(-W * .25f * s, -H * .9f * s, W * 1.5f * s, H * 1.35f * s);
            using (var p = new GraphicsPath()) {
                p.AddEllipse(glow);
                using (var b = new PathGradientBrush(p) { CenterColor = Color.FromArgb(dark ? 46 : 60, Gold), SurroundColors = new[] { Color.FromArgb(0, Gold) } }) g.FillPath(b, p);
            }

            /* who we are */
            if (Logo != null) g.DrawImage(Logo, R(36, 34, 60, 60));
            Say(g, Installer.T("Adhkār", "أذكار"), 27, FontStyle.Bold, T1, R(112, 34, 300, 40));
            Say(g, Installer.T("Remembrance for every moment", "ذكر لكل لحظة"), 14, FontStyle.Regular, T2, R(113, 72, 340, 24));
            var chip = Installer.T("Version ", "الإصدار ") + mine;
            using (var f = F(12, FontStyle.Bold)) {
                var w = g.MeasureString(chip, f).Width / s + 22;
                var r = R(W - 36 - w, 44, w, 26);
                using (var p = Round(r, 13 * s)) using (var pen = new Pen(Color.FromArgb(90, Gold), 1 * s)) g.DrawPath(pen, p);
                Say(g, chip, 12, FontStyle.Bold, Gold, new RectangleF(r.X, r.Y + 4.5f * s, r.Width, r.Height), true);
            }
            using (var pen = new Pen(Line, 1 * s)) g.DrawLine(pen, 36 * s, 120 * s, (W - 36) * s, 120 * s);

            if (page == Page.Welcome) Welcome(g);
            else if (page == Page.Working) Working(g);
            else if (page == Page.Done) Finished(g);
            else Failed(g);
        }

        void Welcome(Graphics g) {
            string head, sub;
            if (have == null) { head = Installer.T("Install Adhkār", "ثبّت أذكار"); sub = Installer.T("It opens like any app, from Start or your desktop.", "يُفتح كأي تطبيق، من قائمة ابدأ أو سطح المكتب."); }
            else if (Installer.Newer(mine, have)) { head = Installer.T("Update Adhkār", "حدّث أذكار"); sub = Installer.T("From " + have + " to " + mine + ". Your record stays as it is.", "من " + have + " إلى " + mine + ". يبقى سجلك كما هو."); }
            else { head = Installer.T("Reinstall Adhkār", "أعد تثبيت أذكار"); sub = Installer.T("Version " + have + " is installed. Your record stays as it is.", "الإصدار " + have + " مثبّت. يبقى سجلك كما هو."); }
            Say(g, head, 20, FontStyle.Bold, T1, R(36, 140, W - 72, 30));
            Say(g, sub, 14, FontStyle.Regular, T2, R(36, 172, W - 72, 22));

            /* where it goes */
            var card = R(36, 206, W - 72, 58);
            using (var p = Round(card, 14 * s)) {
                using (var b = new SolidBrush(S1)) g.FillPath(b, p);
                using (var pen = new Pen(Line, 1 * s)) g.DrawPath(pen, p);
            }
            Say(g, Installer.T("For you on this computer, no administrator needed", "لك على هذا الحاسوب، دون صلاحيات المسؤول"), 13.5f, FontStyle.Bold, T1, R(54, 215, W - 108, 20));
            Say(g, Installer.Dir, 12.5f, FontStyle.Regular, T3, R(54, 236, W - 108, 20));

            Check(g, "desktop", desktop, Installer.T("A shortcut on the desktop", "اختصار على سطح المكتب"), null, 282);
            Check(g, "startup", startup, Installer.T("Start with Windows, quietly in the tray", "ابدأ مع ويندوز، بهدوء في شريط المهام"),
                Installer.T("So reminders ring even before you open it.", "لتصلك التذكيرات قبل أن تفتحه."), 318);

            Say(g, Installer.T("Free · No account · No ads", "مجاني · بلا حساب · بلا إعلانات"), 12.5f, FontStyle.Regular, T3, R(36, 398, 260, 20));
            string go = have == null ? Installer.T("Install", "ثبّت") : Installer.Newer(mine, have) ? Installer.T("Update", "حدّث") : Installer.T("Reinstall", "أعد التثبيت");
            Button(g, "go", go, R(W - 36 - 140, 386, 140, 40), true);
            Button(g, "cancel", Installer.T("Cancel", "إلغاء"), R(W - 36 - 140 - 12 - 108, 386, 108, 40), false);
        }
        void Working(Graphics g) {
            Say(g, Installer.T("Installing Adhkār", "جارٍ تثبيت أذكار"), 20, FontStyle.Bold, T1, R(36, 140, W - 72, 30));
            Say(g, step, 14, FontStyle.Regular, T2, R(36, 172, W - 72, 22));
            var track = R(36, 230, W - 72, 10);
            using (var p = Round(track, 5 * s)) using (var b = new SolidBrush(Color.FromArgb(dark ? 30 : 26, T1))) g.FillPath(b, p);
            var fw = Math.Max(10, (W - 72) * pct / 100f);
            var fill = R(36, 230, fw, 10);
            using (var p = Round(fill, 5 * s)) using (var b = new LinearGradientBrush(new RectangleF(36 * s, 0, (W - 72) * s, 1), GoldDeep, Gold, rtl ? 180f : 0f)) g.FillPath(b, p);
            Say(g, pct + "%", 13, FontStyle.Bold, Gold, R(36, 250, W - 72, 20), false, true);
            Say(g, Installer.T("Your record is kept apart from the program, so nothing you have counted is touched.", "سجلك محفوظ بعيدًا عن البرنامج، فلا يُمسّ شيء مما عددته."), 12.5f, FontStyle.Regular, T3, R(36, 398, W - 72, 20));
        }
        void Finished(Graphics g) {
            var c = R(36, 142, 52, 52);
            using (var b = new SolidBrush(Gold)) g.FillEllipse(b, c);
            using (var pen = new Pen(Ink, 3.4f * s) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round })
                g.DrawLines(pen, new[] { new PointF(c.X + 15 * s, c.Y + 27 * s), new PointF(c.X + 23 * s, c.Y + 35 * s), new PointF(c.X + 38 * s, c.Y + 18 * s) });
            Say(g, Installer.T("Adhkār is installed", "ثُبّت أذكار"), 20, FontStyle.Bold, T1, R(104, 144, W - 140, 30));
            Say(g, Installer.T("Version " + mine + ", in your own Programs folder.", "الإصدار " + mine + "، في مجلد برامجك."), 14, FontStyle.Regular, T2, R(104, 174, W - 140, 22));
            var lines = new[] {
                Installer.T("Open it from Start" + (desktop ? " or your desktop" : "") + ".", "افتحه من قائمة ابدأ" + (desktop ? " أو سطح المكتب" : "") + "."),
                Installer.T("It updates itself from inside the app when you ask it to.", "يحدّث نفسه من داخل التطبيق متى طلبت."),
                Installer.T("Remove it any time from Settings › Apps; your record stays.", "أزله متى شئت من الإعدادات › التطبيقات، ويبقى سجلك.")
            };
            for (int i = 0; i < lines.Length; i++) {
                var dot = R(40, 226 + i * 30 + 7, 6, 6);
                using (var b = new SolidBrush(Gold)) g.FillEllipse(b, dot);
                Say(g, lines[i], 13.5f, FontStyle.Regular, T2, R(58, 226 + i * 30, W - 94, 22));
            }
            Check(g, "open", open, Installer.T("Open Adhkār now", "افتح أذكار الآن"), null, 330);
            Button(g, "finish", Installer.T("Finish", "إنهاء"), R(W - 36 - 140, 386, 140, 40), true);
        }
        void Failed(Graphics g) {
            Say(g, Installer.T("Adhkār could not be installed", "تعذّر تثبيت أذكار"), 20, FontStyle.Bold, T1, R(36, 140, W - 72, 30));
            Say(g, Installer.T("Nothing you have recorded was touched. What happened:", "لم يُمسّ شيء من سجلك. ما حدث:"), 14, FontStyle.Regular, T2, R(36, 172, W - 72, 22));
            var card = R(36, 206, W - 72, 120);
            using (var p = Round(card, 14 * s)) {
                using (var b = new SolidBrush(S1)) g.FillPath(b, p);
                using (var pen = new Pen(Line, 1 * s)) g.DrawPath(pen, p);
            }
            Say(g, error, 13, FontStyle.Regular, T1, R(54, 220, W - 108, 96));
            Button(g, "go", Installer.T("Try again", "حاول مجددًا"), R(W - 36 - 140, 386, 140, 40), true);
            Button(g, "cancel", Installer.T("Close", "إغلاق"), R(W - 36 - 140 - 12 - 108, 386, 108, 40), false);
        }

        /* ---------- the mouse and the keys ---------- */
        string At(Point p) { foreach (var kv in spots) if (kv.Value.Contains(p)) return kv.Key; return null; }
        protected override void OnMouseMove(MouseEventArgs e) {
            var h = At(e.Location);
            if (h != hot) { hot = h; Cursor = h == null ? Cursors.Default : Cursors.Hand; Invalidate(); }
        }
        protected override void OnMouseLeave(EventArgs e) { hot = null; down = null; Invalidate(); }
        protected override void OnMouseDown(MouseEventArgs e) { down = At(e.Location); Invalidate(); }
        protected override void OnMouseUp(MouseEventArgs e) {
            var a = At(e.Location); var was = down; down = null; Invalidate();
            if (a != null && a == was) Act(a);
        }
        protected override void OnKeyDown(KeyEventArgs e) {
            if (e.KeyCode == Keys.Enter) Act(page == Page.Done ? "finish" : page == Page.Working ? null : "go");
            else if (e.KeyCode == Keys.Escape && page != Page.Working) Act(page == Page.Done ? "finish" : "cancel");
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
            else if (a == "go") Go();
            Invalidate();
        }
        void Go() {
            page = Page.Working; pct = 0; step = ""; Invalidate();
            var c = new Installer.Choice { Desktop = desktop, Startup = startup };
            var t = new Thread(() => {
                var err = Installer.Run(c, (p, st) => BeginInvoke(new Action(() => { pct = p; step = st; Invalidate(); })));
                Thread.Sleep(350);
                BeginInvoke(new Action(() => {
                    if (err == null) page = Page.Done;
                    else { page = Page.Failed; error = err; }
                    Invalidate();
                }));
            }) { IsBackground = true };
            t.Start();
        }

        /* ---------- pictures for the guide ---------- */
        public static void Shots(string dir) {
            Directory.CreateDirectory(dir);
            foreach (var ar in new[] { false, true })
                foreach (var dk in new[] { true, false }) {
                    Installer.Ar = ar;
                    var f = new SetupForm(dk); f.rtl = ar; f.s = 2; f.have = null; f.desktop = true; f.startup = false;
                    foreach (Page p in Enum.GetValues(typeof(Page))) {
                        if (p == Page.Failed) continue;
                        f.page = p; f.pct = 64; f.step = ar ? "نسخ التطبيق" : "Copying the app";
                        using (var b = new Bitmap(W * 2, H * 2)) {
                            using (var g = Graphics.FromImage(b)) f.Draw(g);
                            b.Save(Path.Combine(dir, (ar ? "ar-" : "") + (dk ? "dark-" : "light-") + p.ToString().ToLowerInvariant() + ".png"));
                        }
                    }
                }
        }
    }
}
