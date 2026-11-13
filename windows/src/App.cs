// Adhkār for Windows: the same app and the same record as the phone, in a window made for a big screen, a keyboard
// and a printer. One file to run, no installer needed, no account, and nothing leaves the computer except the
// recitations you choose to download.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.IO.Pipes;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Adhkar {
    static class Program {
        public const string Host = "adhkar.example", Origin = "https://adhkar.example";
        public const string PipeName = "Adhkar.Desktop.v1";
        public static string Version = "12.0";
        static Mutex single;

        [STAThread]
        static int Main(string[] args) {
            AppDomain.CurrentDomain.AssemblyResolve += Resolve;
            Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
            try { Native.SetProcessDpiAwareness(2); } catch { }
            Store.Init();
            var v = Assembly.GetExecutingAssembly().GetName().Version; Version = v.Major + "." + v.Minor;
            if (Array.IndexOf(args, "--uninstall") >= 0) { Shell.Uninstall(); return 0; }
            bool first; single = new Mutex(true, "Local\\Adhkar.Desktop.v1", out first);
            if (!first) { Hand(args); return 0; }
            try { Unpack(); }
            catch (Exception e) { MessageBox.Show("Adhkār could not start.\n\n" + e.Message, "Adhkār", MessageBoxButtons.OK, MessageBoxIcon.Error); return 1; }
            return Run(args);
        }
        [MethodImpl(MethodImplOptions.NoInlining)]
        static int Run(string[] args) {
            string have = null;
            try { have = CoreWebView2Environment.GetAvailableBrowserVersionString(); } catch { }
            if (string.IsNullOrEmpty(have)) {
                if (MessageBox.Show("Adhkār needs Microsoft Edge WebView2, a free part of Windows that is missing on this computer.\n\nOpen Microsoft's page to install it?", "Adhkār", MessageBoxButtons.YesNo, MessageBoxIcon.Information) == DialogResult.Yes)
                    Shell.Open("https://developer.microsoft.com/microsoft-edge/webview2/#download");
                return 1;
            }
            Application.Run(new MainForm(args));
            GC.KeepAlive(single);
            return 0;
        }

        /* a second launch (a shortcut, the tray, a dropped file) hands its request to the window already open */
        static void Hand(string[] args) {
            try {
                using (var p = new NamedPipeClientStream(".", PipeName, PipeDirection.Out)) {
                    p.Connect(2500);
                    var b = Encoding.UTF8.GetBytes(string.Join("\n", args.Length == 0 ? new[] { "--show" } : args));
                    p.Write(b, 0, b.Length);
                }
            } catch { }
        }

        /* the WebView2 libraries travel inside this .exe */
        static readonly Dictionary<string, Assembly> loaded = new Dictionary<string, Assembly>();
        static Assembly Resolve(object s, ResolveEventArgs e) {
            var n = new AssemblyName(e.Name).Name;
            lock (loaded) {
                Assembly a; if (loaded.TryGetValue(n, out a)) return a;
                using (var r = Assembly.GetExecutingAssembly().GetManifestResourceStream(n + ".dll")) {
                    if (r == null) return null;
                    var b = new byte[r.Length]; r.Read(b, 0, b.Length);
                    a = Assembly.Load(b); loaded[n] = a; return a;
                }
            }
        }
        /* the app and the native loader are unpacked once per version, beside your data */
        static void Unpack() {
            var asm = Assembly.GetExecutingAssembly();
            using (var s = asm.GetManifestResourceStream("app.zip")) {
                string tag = "app-" + Version + "-" + s.Length;
                Store.AppDir = Path.Combine(Store.Root, tag);
                if (!File.Exists(Path.Combine(Store.AppDir, ".done"))) {
                    if (Directory.Exists(Store.AppDir)) Directory.Delete(Store.AppDir, true);
                    using (var z = new ZipArchive(s, ZipArchiveMode.Read)) z.ExtractToDirectory(Store.AppDir);
                    File.WriteAllText(Path.Combine(Store.AppDir, ".done"), "ok");
                    foreach (var d in Directory.GetDirectories(Store.Root, "app-*")) if (!d.Equals(Store.AppDir, StringComparison.OrdinalIgnoreCase)) try { Directory.Delete(d, true); } catch { }
                }
            }
            var bin = Path.Combine(Store.Root, "bin"); Directory.CreateDirectory(bin);
            var loader = Path.Combine(bin, "WebView2Loader.dll");
            using (var s = asm.GetManifestResourceStream("WebView2Loader.dll")) {
                if (!File.Exists(loader) || new FileInfo(loader).Length != s.Length) {
                    try { using (var o = File.Create(loader)) s.CopyTo(o); } catch { /* in use by another copy: the same version is already there */ }
                }
            }
            SetLoader(bin);
        }
        [MethodImpl(MethodImplOptions.NoInlining)]
        static void SetLoader(string bin) { CoreWebView2Environment.SetLoaderDllFolderPath(bin); }
    }

    class MainForm : Form {
        public WebView2 Web;
        public NotifyIcon Tray;
        public bool Quitting, Ready;
        readonly string[] startArgs;
        Bridge bridge;
        string pendingRoute;
        readonly List<string> pendingFiles = new List<string>();
        FormWindowState beforeFull = FormWindowState.Normal; Rectangle beforeFullBounds; bool full;
        System.Windows.Forms.Timer clock;
        static readonly Color Night = Color.FromArgb(7, 8, 13), Day = Color.FromArgb(245, 241, 233);

        public MainForm(string[] args) {
            startArgs = args;
            Text = "Adhkār";
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            AutoScaleMode = AutoScaleMode.Dpi;
            MinimumSize = new Size(480, 560);
            var dark = (Store.Get("dark", Native.SystemDark()) as bool?) ?? true;
            BackColor = dark ? Night : Day;
            RestoreBounds0();
            Web = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = BackColor };
            Controls.Add(Web);
            bridge = new Bridge(this);
            ParseArgs(args);
            if (Array.IndexOf(args, "--tray") >= 0) { WindowState = FormWindowState.Minimized; ShowInTaskbar = false; }
            Listen();
            SetupTray();
            clock = new System.Windows.Forms.Timer { Interval = 15000 }; clock.Tick += delegate { Remind(); }; clock.Start();
        }

        protected override void OnHandleCreated(EventArgs e) {
            base.OnHandleCreated(e);
            TitleBar(BackColor == Night);
        }
        protected override async void OnShown(EventArgs e) {
            base.OnShown(e);
            if (Array.IndexOf(startArgs, "--tray") >= 0) Hide();
            try { await Init(); }
            catch (Exception x) { MessageBox.Show(this, "Adhkār could not open its window.\n\n" + x.Message, "Adhkār", MessageBoxButtons.OK, MessageBoxIcon.Error); Quitting = true; Close(); }
            /* the pill is on unless you closed it: it stays on screen when Adhkār is minimised or in the tray */
            if (!(Store.Get("next", true) is bool) || (bool)Store.Get("next", true)) ShowNext(true);
        }

        async Task Init() {
            var opts = new CoreWebView2EnvironmentOptions();
            var args = "--autoplay-policy=no-user-gesture-required --disable-features=msSmartScreenProtection,ElasticOverscroll";
            var dbg = Environment.GetEnvironmentVariable("ADHKAR_DEBUG_PORT");
            if (!string.IsNullOrEmpty(dbg)) args += " --remote-debugging-port=" + dbg;
            opts.AdditionalBrowserArguments = args;
            var env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Store.Root, "webview"), opts);
            await Web.EnsureCoreWebView2Async(env);
            var cw = Web.CoreWebView2;
            var st = cw.Settings;
            st.AreDevToolsEnabled = !string.IsNullOrEmpty(dbg);
            st.AreDefaultContextMenusEnabled = false;
            st.IsStatusBarEnabled = false;
            st.AreBrowserAcceleratorKeysEnabled = false;
            st.IsGeneralAutofillEnabled = false;
            st.IsPasswordAutosaveEnabled = false;
            st.IsSwipeNavigationEnabled = false;
            st.IsZoomControlEnabled = false;
            st.AreHostObjectsAllowed = true;
            st.IsWebMessageEnabled = true;
            try { st.IsPinchZoomEnabled = false; } catch { }
            object z = Store.Get("zoom", null); if (z != null) try { Web.ZoomFactor = Convert.ToDouble(z); } catch { }
            Web.ZoomFactorChanged += delegate { Store.Set("zoom", Web.ZoomFactor); };

            cw.AddHostObjectToScript("adhkar", bridge);
            await cw.AddScriptToExecuteOnDocumentCreatedAsync(Shim());
            cw.AddWebResourceRequestedFilter(Program.Origin + "/*", CoreWebView2WebResourceContext.All);
            cw.WebResourceRequested += Serve;
            cw.NavigationStarting += (s, e) => {
                var u = e.Uri ?? "";
                if (u.StartsWith(Program.Origin + "/")) return;
                e.Cancel = true; Outside(u);
            };
            cw.FrameNavigationStarting += (s, e) => { if (!(e.Uri ?? "").StartsWith(Program.Origin + "/") && !(e.Uri ?? "").StartsWith("about:")) e.Cancel = true; };
            cw.NewWindowRequested += (s, e) => { e.Handled = true; Outside(e.Uri); };
            cw.PermissionRequested += (s, e) => {
                var mine = (e.Uri ?? "").StartsWith(Program.Origin);
                e.State = mine && (e.PermissionKind == CoreWebView2PermissionKind.Autoplay || e.PermissionKind == CoreWebView2PermissionKind.ClipboardRead)
                    ? CoreWebView2PermissionState.Allow : CoreWebView2PermissionState.Deny;
            };
            cw.DownloadStarting += (s, e) => { e.Cancel = true; };
            cw.DocumentTitleChanged += (s, e) => { var t = cw.DocumentTitle; Text = string.IsNullOrEmpty(t) || t.StartsWith("http") ? "Adhkār" : t; };
            cw.ContainsFullScreenElementChanged += (s, e) => FullScreen(cw.ContainsFullScreenElement);
            cw.ProcessFailed += (s, e) => { if (e.ProcessFailedKind == CoreWebView2ProcessFailedKind.RenderProcessExited || e.ProcessFailedKind == CoreWebView2ProcessFailedKind.RenderProcessUnresponsive) try { cw.Reload(); } catch { } };
            cw.WebMessageReceived += Message;
            cw.NavigationCompleted += (s, e) => { Ready = true; Flush(); };
            cw.Navigate(Program.Origin + "/index.html");
        }
        /* the page has drawn its first screen: hand it what arrived meanwhile */
        public void PageReady() { Ready = true; Flush(); }
        void Flush() {
            foreach (var f in pendingFiles) OpenFile(f);
            pendingFiles.Clear();
            if (pendingRoute != null) { var r = pendingRoute; pendingRoute = null; Route(r); }
        }

        void Outside(string u) {
            Uri x; if (!Uri.TryCreate(u ?? "", UriKind.Absolute, out x)) return;
            if (x.Scheme != "https" && x.Scheme != "http" && x.Scheme != "mailto") return;
            Shell.Open(x.AbsoluteUri);
        }

        /* ---------- serving the app: its own files, and your downloaded recitations under /rec/ ---------- */
        void Serve(object sender, CoreWebView2WebResourceRequestedEventArgs e) {
            var cw = Web.CoreWebView2;
            Uri u; if (!Uri.TryCreate(e.Request.Uri, UriKind.Absolute, out u) || u.Host != Program.Host) return;
            var path = Uri.UnescapeDataString(u.AbsolutePath);
            if (path == "/" || path == "") path = "/index.html";
            string range = null; try { if (e.Request.Headers.Contains("Range")) range = e.Request.Headers.GetHeader("Range"); } catch { }
            string file = null;
            if (path.StartsWith("/rec/")) file = Store.AudioFile(path.Substring(5));
            else { var rel = path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar); if (!rel.Contains("..")) file = Path.Combine(Store.AppDir, rel); }
            e.Response = Respond(cw, file, range);
        }
        static CoreWebView2WebResourceResponse Respond(CoreWebView2 cw, string file, string range) {
            if (file == null || !File.Exists(file)) return cw.Environment.CreateWebResourceResponse(null, 404, "Not Found", "Content-Type: text/plain");
            var mime = Store.Mime(file);
            long len = new FileInfo(file).Length;
            var name = Path.GetFileName(file).ToLowerInvariant();
            string cache = name.EndsWith(".html") || name.EndsWith(".js") || name.EndsWith(".css") || name.EndsWith(".json") ? "no-cache" : "max-age=31536000";
            var head = "Content-Type: " + mime + "\r\nCache-Control: " + cache + "\r\nX-Content-Type-Options: nosniff\r\nAccept-Ranges: bytes";
            Stream s = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, 65536, FileOptions.SequentialScan);
            /* audio is sought through in parts: answer a range with 206, or seeking breaks */
            if (range != null && range.StartsWith("bytes=") && len > 0) {
                var p = range.Substring(6).Split(',')[0].Split('-'); long a = 0, b = len - 1, x;
                if (p[0].Length > 0 && long.TryParse(p[0], out x)) a = x;
                else if (p.Length > 1 && long.TryParse(p[1], out x)) a = Math.Max(0, len - x);
                if (p.Length > 1 && p[0].Length > 0 && long.TryParse(p[1], out x)) b = Math.Min(x, len - 1);
                if (a >= len) { s.Dispose(); return cw.Environment.CreateWebResourceResponse(null, 416, "Range Not Satisfiable", "Content-Range: bytes */" + len); }
                s.Seek(a, SeekOrigin.Begin);
                return cw.Environment.CreateWebResourceResponse(new Slice(s, b - a + 1), 206, "Partial Content", head + "\r\nContent-Length: " + (b - a + 1) + "\r\nContent-Range: bytes " + a + "-" + b + "/" + len);
            }
            return cw.Environment.CreateWebResourceResponse(s, 200, "OK", head + "\r\nContent-Length: " + len);
        }

        /* a backup file dropped on the window, or opened from the Open dialog, comes in like the phone's import */
        void Message(object sender, CoreWebView2WebMessageReceivedEventArgs e) {
            string kind = null; try { kind = e.TryGetWebMessageAsString(); } catch { }
            if (kind != "drop") return;
            try { foreach (var o in e.AdditionalObjects) { var f = o as CoreWebView2File; if (f != null) { OpenFile(f.Path); break; } } } catch { }
        }
        public void OpenFile(string path) {
            if (!Ready) { pendingFiles.Add(path); return; }
            if (!File.Exists(path)) return;
            if (!path.EndsWith(".json", StringComparison.OrdinalIgnoreCase)) { Toast("Adhkār opens its own backup files (.json)", "يفتح أذكار ملفات النسخ الاحتياطي الخاصة به (.json)"); return; }
            Task.Run(() => {
                string text = null; try { text = Store.ReadText(path); } catch { }
                if (text == null) { Toast("That file could not be read", "تعذرت قراءة الملف"); return; }
                Post("window.Desk&&Desk.onFile?Desk.onFile(" + Store.Json.Serialize(text) + "):__native.onImport(" + Store.Json.Serialize(text) + ")");
            });
        }
        public void Toast(string en, string ar) { Post("A.toast(A.ar&&A.ar()?" + Store.Json.Serialize(ar) + ":" + Store.Json.Serialize(en) + ")"); }
        public void Post(string js) {
            if (InvokeRequired) { BeginInvoke(new Action(() => Post(js))); return; }
            try { if (Web != null && Web.CoreWebView2 != null) Web.CoreWebView2.ExecuteScriptAsync(js); } catch { }
        }
        public void Route(string r) {
            if (!Ready) { pendingRoute = r; return; }
            Post("location.hash=" + Store.Json.Serialize(r.StartsWith("#") ? r : "#/" + r));
        }

        /* ---------- arguments: from the command line, a shortcut, or a second launch ---------- */
        void ParseArgs(string[] args) {
            foreach (var a in args) {
                if (a.StartsWith("--route=")) Route(a.Substring(8));
                else if (!a.StartsWith("--") && File.Exists(a)) OpenFile(a);
            }
        }
        void Listen() {
            var t = new Thread(() => {
                while (!Quitting) {
                    try {
                        using (var p = new NamedPipeServerStream(Program.PipeName, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.None)) {
                            p.WaitForConnection();
                            var ms = new MemoryStream(); p.CopyTo(ms);
                            var args = Encoding.UTF8.GetString(ms.ToArray()).Split('\n');
                            BeginInvoke(new Action(() => { Bring(); ParseArgs(args); }));
                        }
                    } catch { Thread.Sleep(200); }
                }
            }) { IsBackground = true, Name = "single-instance" };
            t.Start();
        }
        public void Bring() {
            if (!Visible) Show();
            ShowInTaskbar = true;
            if (WindowState == FormWindowState.Minimized) WindowState = Store.Flag("max") ? FormWindowState.Maximized : FormWindowState.Normal;
            Activate(); BringToFront();
            Native.SetForegroundWindow(Handle);
        }

        /* ---------- the window ---------- */
        void RestoreBounds0() {
            StartPosition = FormStartPosition.Manual;
            var wa = Screen.PrimaryScreen.WorkingArea;
            int w = Math.Min(1360, wa.Width - 80), h = Math.Min(880, wa.Height - 60);
            var r = new Rectangle(wa.Left + (wa.Width - w) / 2, wa.Top + (wa.Height - h) / 2, w, h);
            var saved = Store.Get("bounds", null) as System.Collections.ArrayList;
            if (saved != null && saved.Count == 4) {
                var s = new Rectangle(Convert.ToInt32(saved[0]), Convert.ToInt32(saved[1]), Convert.ToInt32(saved[2]), Convert.ToInt32(saved[3]));
                foreach (var sc in Screen.AllScreens) if (sc.WorkingArea.IntersectsWith(s) && s.Width >= 480 && s.Height >= 480) { r = s; break; }
            }
            Bounds = r;
            if (Store.Flag("max")) WindowState = FormWindowState.Maximized;
        }
        void KeepBounds() {
            if (full) return;
            Store.Set("max", WindowState == FormWindowState.Maximized);
            var b = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
            Store.Set("bounds", new System.Collections.ArrayList { b.X, b.Y, b.Width, b.Height });
        }
        protected override void OnResizeEnd(EventArgs e) { base.OnResizeEnd(e); KeepBounds(); }
        protected override void OnFormClosing(FormClosingEventArgs e) {
            if (!Quitting && e.CloseReason == CloseReason.UserClosing && Store.Flag("tray")) {
                e.Cancel = true; KeepBounds(); Hide();
                if (!Store.Flag("trayTold")) { Store.Set("trayTold", true); Tray.ShowBalloonTip(4000, "Adhkār is still here", "It stays in the tray for your reminders. Right-click the icon to quit.", ToolTipIcon.None); }
                return;
            }
            KeepBounds();
            if (next != null) { next.Close(); next = null; }
            if (Tray != null) { Tray.Visible = false; Tray.Dispose(); }
            base.OnFormClosing(e);
        }
        protected override void OnActivated(EventArgs e) { base.OnActivated(e); Post("window.__native&&__native.onResume&&__native.onResume()"); }

        public void TitleBar(bool dark) {
            Store.Set("dark", dark);
            BackColor = dark ? Night : Day;
            if (Web != null) Web.DefaultBackgroundColor = BackColor;
            if (!IsHandleCreated) return;
            Native.Caption(Handle, dark, BackColor, dark ? Color.FromArgb(240, 233, 220) : Color.FromArgb(40, 33, 22));
            if (next != null) next.Theme(dark);
        }
        public void FullScreen(bool on) {
            if (on == full) return;
            full = on;
            if (on) {
                beforeFull = WindowState; beforeFullBounds = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
                FormBorderStyle = FormBorderStyle.None; WindowState = FormWindowState.Normal; Bounds = Screen.FromControl(this).Bounds;
            } else {
                FormBorderStyle = FormBorderStyle.Sizable; Bounds = beforeFullBounds; WindowState = beforeFull;
                TitleBar(BackColor == Night);
            }
            Post("window.Desk&&Desk.onFull&&Desk.onFull(" + (on ? "true" : "false") + ")");
        }

        /* ---------- the tray ---------- */
        void SetupTray() {
            Tray = new NotifyIcon { Icon = Icon, Text = "Adhkār", Visible = Store.Flag("tray") };
            var m = new ContextMenuStrip();
            m.Items.Add("Open Adhkār", null, delegate { Bring(); });
            m.Items.Add("Morning adhkār", null, delegate { Bring(); Route("c/morning"); });
            m.Items.Add("Evening adhkār", null, delegate { Bring(); Route("c/evening"); });
            m.Items.Add("The pill", null, delegate { ShowNext(next == null); });
            m.Items.Add(new ToolStripSeparator());
            m.Items.Add("Quit Adhkār", null, delegate { Quit(); });
            Tray.ContextMenuStrip = m;
            Tray.DoubleClick += delegate { Bring(); };
            Tray.BalloonTipClicked += delegate { Bring(); if (lastRoute != null) Route(lastRoute); };
        }
        public void Quit() { Quitting = true; Close(); }

        /* ---------- reminders: the page works out the next two days; this clock rings them, window open or not ---------- */
        class Event { public double t; public string title, body, route; public bool takbir, hour; }
        List<Event> events = new List<Event>();
        readonly HashSet<string> rung = new HashSet<string>();
        string lastRoute;
        public void Schedule(string json) {
            var l = new List<Event>();
            try {
                foreach (var o in Store.Json.Deserialize<List<Dictionary<string, object>>>(json ?? "[]")) {
                    var ev = new Event { t = Convert.ToDouble(o["t"]), title = o["title"] as string, body = o.ContainsKey("body") ? o["body"] as string : "" };
                    ev.route = o.ContainsKey("route") ? o["route"] as string : null;
                    ev.takbir = o.ContainsKey("takbir") && o["takbir"] is bool && (bool)o["takbir"];
                    ev.hour = o.ContainsKey("hour") && o["hour"] is bool && (bool)o["hour"];
                    l.Add(ev);
                }
            } catch { return; }
            BeginInvoke(new Action(() => { events = l; }));
        }
        void Remind() {
            var now = (DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
            foreach (var ev in events) {
                if (ev.t > now || now - ev.t > 120000) continue;
                var key = ev.t + "|" + ev.title; if (rung.Contains(key)) continue;
                rung.Add(key);
                lastRoute = ev.route;
                bool was = Tray.Visible; Tray.Visible = true;
                Tray.ShowBalloonTip(10000, ev.title ?? "Adhkār", string.IsNullOrEmpty(ev.body) ? " " : ev.body, ToolTipIcon.None);
                if (!was) { var t = new System.Windows.Forms.Timer { Interval = 15000 }; t.Tick += delegate { t.Stop(); t.Dispose(); Tray.Visible = Store.Flag("tray"); }; t.Start(); }
                /* the human adhān's takbīr, played by the page, as on the phone; never a chime */
                if (ev.takbir) Post("window.Desk&&Desk.takbir&&Desk.takbir()");
                /* Friday's hour of response: the pill comes forward, open, on top of whatever you are working in */
                if (ev.hour) { if (next == null) ShowNext(true); if (next != null) { next.TopMost = true; next.Alert(); } }
            }
            if (rung.Count > 200) rung.Clear();
        }

        /* ---------- the next prayer, in a small window of its own ---------- */
        NextForm next;
        public bool NextOn { get { return next != null; } }
        string nextLabel = "", nextTime = ""; double nextAt;
        public void SetNext(string label, double at, string time) {
            nextLabel = label ?? ""; nextAt = at; nextTime = time ?? "";
            if (next != null) next.Set(nextLabel, nextAt, nextTime);
            var tip = "Adhkār · " + nextLabel + " " + nextTime; Tray.Text = tip.Length > 63 ? tip.Substring(0, 63) : tip;
        }
        string pill = "{}";
        public void SetPill(string json) { pill = json ?? "{}"; if (next != null) next.SetInfo(pill); }
        public void ShowNext(bool on) {
            Store.Set("next", on);
            if (on && next == null) {
                next = new NextForm(this, BackColor == Night, Store.Flag("nextTop"));
                next.Set(nextLabel, nextAt, nextTime);
                next.SetInfo(pill);
                next.FormClosed += delegate { next = null; Store.Set("next", false); Post("window.Desk&&Desk.refresh&&Desk.refresh()"); };
                next.Show();
            } else if (!on && next != null) next.Close();
        }
        public void NextTop(bool on) { if (next != null) next.TopMost = on; }

        static string Shim() {
            using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("shim.js"))
            using (var r = new StreamReader(s, Encoding.UTF8)) return r.ReadToEnd();
        }
    }

    /* part of a file, for audio that is being sought through */
    class Slice : Stream {
        readonly Stream s; long left;
        public Slice(Stream inner, long length) { s = inner; left = length; }
        public override int Read(byte[] buffer, int offset, int count) { if (left <= 0) return 0; int n = s.Read(buffer, offset, (int)Math.Min(count, left)); left -= n; return n; }
        public override bool CanRead { get { return true; } }
        public override bool CanSeek { get { return false; } }
        public override bool CanWrite { get { return false; } }
        public override long Length { get { throw new NotSupportedException(); } }
        public override long Position { get { throw new NotSupportedException(); } set { throw new NotSupportedException(); } }
        public override void Flush() { }
        public override long Seek(long o, SeekOrigin r) { throw new NotSupportedException(); }
        public override void SetLength(long v) { throw new NotSupportedException(); }
        public override void Write(byte[] b, int o, int c) { throw new NotSupportedException(); }
        protected override void Dispose(bool d) { if (d) s.Dispose(); base.Dispose(d); }
    }
}
