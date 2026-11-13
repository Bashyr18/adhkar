// The bridge the page talks to. The first half mirrors the Android app's bridge method for method
// (tools/bridge-check.js keeps the two in step; playback and the takbīr preview live in shim.js, in the page);
// the second half is what only a computer can do. Anything slow runs off the window's thread and answers later.
using System;
using System.Collections.Generic;
using System.Device.Location;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Adhkar {
    [ComVisible(true)]
    [ClassInterface(ClassInterfaceType.AutoDual)]
    public class Bridge {
        readonly MainForm f;
        internal Bridge(MainForm form) { f = form; }
        static string Q(object o) { return Store.Json.Serialize(o); }

        /* ---------- the same as the phone ---------- */
        public void setCanBack(bool can) { }
        public void ready(double ms) { f.BeginInvoke(new Action(() => f.PageReady())); }
        public void saveState(string json) { Store.SaveState(json); }
        public string loadState() { return Store.LoadState(); }
        public string version() { return Program.Version; }
        public bool systemDark() { return Native.SystemDark(); }
        public void haptic(string k) { }
        /* the screen stays on while counting, as on the phone */
        public void keepAwake(bool on) { f.BeginInvoke(new Action(() => Native.SetThreadExecutionState(on ? 0x80000003u : 0x80000000u))); }
        public void setSystemBars(bool light) { f.BeginInvoke(new Action(() => f.TitleBar(!light))); }
        public void shareText(string text) {
            f.BeginInvoke(new Action(() => {
                try { Clipboard.SetText(text ?? ""); f.Toast("Copied, ready to paste", "نُسخ، جاهز للصق"); } catch { }
            }));
        }
        public void shareImage(string b64, string text) {
            f.BeginInvoke(new Action(() => {
                using (var d = new SaveFileDialog { FileName = "Adhkar.png", Filter = "Picture|*.png", InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.MyPictures) }) {
                    if (d.ShowDialog(f) != DialogResult.OK) return;
                    try { File.WriteAllBytes(d.FileName, Convert.FromBase64String(b64)); } catch { f.Toast("Not saved", "لم يُحفظ"); return; }
                    if (!string.IsNullOrEmpty(text)) try { Clipboard.SetText(text); } catch { }
                    Shell.Reveal(d.FileName);
                }
            }));
        }
        public void openUrl(string url) {
            f.BeginInvoke(new Action(() => { Uri u; if (Uri.TryCreate(url ?? "", UriKind.Absolute, out u) && (u.Scheme == "https" || u.Scheme == "http" || u.Scheme == "mailto")) Shell.Open(u.AbsoluteUri); }));
        }
        /* a phone's alarm clock has no counterpart here */
        public bool setAlarm(int h, int m, string label) { return false; }
        /* the page's settings and today's state: the reminders are worked out by the page (desk.js) and handed over with deskSchedule */
        public void sync(string json) { }

        /* recitations: downloaded here, played by the page (shim.js) from https://adhkar.example/rec/ */
        public string audioHave(string names) {
            var o = new List<string>();
            try { foreach (var n in Store.Json.Deserialize<List<string>>(names ?? "[]")) { var p = Store.AudioFile(n); if (p != null && File.Exists(p)) o.Add(n); } } catch { }
            return Q(o);
        }
        public double audioUsage() { return Store.AudioUsage(); }
        public void audioDownload(string json, string tag) {
            List<Dictionary<string, object>> l; try { l = Store.Json.Deserialize<List<Dictionary<string, object>>>(json ?? "[]"); } catch { return; }
            Store.Cancel = false;
            Task.Run(() => {
                int done = 0, failed = 0, total = l.Count; string state = "done";
                foreach (var it in l) {
                    if (Store.Cancel) { state = "cancelled"; break; }
                    object n, u; it.TryGetValue("n", out n); it.TryGetValue("u", out u);
                    var ok = Store.FetchAudio(n as string, u as string) || Store.FetchAudio(n as string, u as string);
                    if (ok) done++; else failed++;
                    Report(tag, "progress", done + failed, total);
                }
                if (state == "done" && failed > 0) state = done > 0 ? "partial" : "error";
                Report(tag, state, done, total);
            });
        }
        void Report(string tag, string state, int done, int total) {
            var j = Q(new Dictionary<string, object> { { "tag", tag }, { "state", state }, { "done", done }, { "total", total } });
            f.Post("window.__native.onAudio&&__native.onAudio(" + Q(j) + ")");
        }
        public void audioCancel() { Store.Cancel = true; }
        public void audioDeleteAll() { f.Post("window.Desk&&Desk.stopAudio&&Desk.stopAudio()"); foreach (var x in Directory.GetFiles(Store.AudioDir)) try { File.Delete(x); } catch { } }
        public void audioHold(bool on) { }
        public void volumeKeys(bool on) { }

        /* things a phone has and a computer does not: each answers so the page never waits or warns */
        public bool overlayOk() { return true; }
        public void openOverlay() { }
        public string takeNudgeTally() { return "{}"; }
        public bool dndOk() { return true; }
        public void openDndAccess() { }
        public bool batteryOk() { return true; }
        public void openBattery() { }
        public string takeTrackerEvents() { return "[]"; }
        public string takeWidgetEvents() { return "[]"; }
        public bool pinWidget(string kind) { return false; }
        public void startCompass() { }
        public void stopCompass() { }
        public bool requestNotifications() { return true; }
        public string notificationState() { return "{\"granted\":true,\"exact\":true}"; }
        public void openSettings(string which) { Shell.Open("ms-settings:notifications"); }

        /* location: Windows' own location service, if it is on; otherwise the page offers the city list */
        GeoCoordinateWatcher geo;
        public bool locateQuiet() { Locate(true); return true; }
        public void requestLocation() { Locate(false); }
        void Locate(bool quiet) {
            f.BeginInvoke(new Action(() => {
                try {
                    if (geo != null) { geo.Dispose(); geo = null; }
                    var w = geo = new GeoCoordinateWatcher(GeoPositionAccuracy.Default);
                    var done = false;
                    Action<string> finish = j => { if (done) return; done = true; try { w.Stop(); } catch { } f.Post("window.__native.onLocation&&__native.onLocation(" + Q(j) + ")"); };
                    w.PositionChanged += (s, e) => {
                        var c = e.Position.Location; if (c.IsUnknown) return;
                        finish(Q(new Dictionary<string, object> { { "lat", c.Latitude }, { "lng", c.Longitude }, { "acc", c.HorizontalAccuracy } }));
                    };
                    w.StatusChanged += (s, e) => { if (e.Status == GeoPositionStatus.Disabled) finish("{\"error\":\"off\"}"); };
                    if (!w.TryStart(false, TimeSpan.FromMilliseconds(1000)) && w.Permission == GeoPositionPermission.Denied) { finish("{\"error\":\"denied\"}"); return; }
                    var t = new Timer { Interval = 15000 }; t.Tick += delegate { t.Stop(); t.Dispose(); finish("{\"error\":\"fail\"}"); }; t.Start();
                } catch { f.Post("window.__native.onLocation&&__native.onLocation('{\"error\":\"fail\"}')"); }
            }));
        }

        public void exportFile(string name, string text) {
            f.BeginInvoke(new Action(() => {
                using (var d = new SaveFileDialog { FileName = name ?? "Adhkar-backup.json", Filter = "Adhkār backup|*.json", InitialDirectory = Shell.Documents() }) {
                    var ok = false;
                    if (d.ShowDialog(f) == DialogResult.OK) try { File.WriteAllText(d.FileName, text, new UTF8Encoding(false)); ok = true; } catch { }
                    f.Post("__native.onExported&&__native.onExported(" + (ok ? "true" : "false") + ")");
                }
            }));
        }
        public void importFile() {
            f.BeginInvoke(new Action(() => {
                using (var d = new OpenFileDialog { Filter = "Adhkār backup|*.json|All files|*.*", InitialDirectory = Shell.Documents() }) {
                    if (d.ShowDialog(f) != DialogResult.OK) return;
                    f.OpenFile(d.FileName);
                }
            }));
        }

        /* ---------- only on a computer ---------- */
        public string deskInfo() {
            return Q(new Dictionary<string, object> {
                { "version", Program.Version }, { "data", Store.Root },
                { "installed", Shell.Installed() }, { "portable", !Shell.RunningInstalled() },
                { "tray", Store.Flag("tray") }, { "startup", Shell.StartsWithWindows() },
                { "next", f.NextOn }, { "nextTop", Store.Flag("nextTop") },
                { "zoom", f.Web.ZoomFactor }, { "backups", Store.Backups() }, { "audio", Store.AudioUsage() },
                { "documents", Shell.Documents() }
            });
        }
        public void deskSet(string key, bool on) {
            f.BeginInvoke(new Action(() => {
                switch (key) {
                    case "tray": Store.Set("tray", on); f.Tray.Visible = on; break;
                    case "startup": Shell.StartWithWindows(on); break;
                    case "next": f.ShowNext(on); break;
                    case "nextTop": Store.Set("nextTop", on); f.NextTop(on); break;
                    case "full": f.FullScreen(on); break;
                }
                f.Post("window.Desk&&Desk.refresh&&Desk.refresh()");
            }));
        }
        public void deskZoom(double z) { f.BeginInvoke(new Action(() => { f.Web.ZoomFactor = Math.Max(0.7, Math.Min(2.0, z)); })); }
        public void titleBar(string theme) { f.BeginInvoke(new Action(() => f.TitleBar(theme == "dark"))); }
        /* the reminders for the next two days, worked out by the page: [{t: ms, title, body, takbir, route}] */
        public void deskSchedule(string json) { f.Schedule(json); }
        /* the next prayer, for the small window and the tray */
        public void deskNext(string label, double at, string time) { f.BeginInvoke(new Action(() => f.SetNext(label, at, time))); }
        public void openFolder(string which) {
            var p = which == "backups" ? Store.BackupDir : which == "documents" ? Shell.Documents() : Store.Root;
            Directory.CreateDirectory(p); Shell.Open(p);
        }
        public string backup(string name) { return Store.ReadBackup(name); }
        public void install() { f.BeginInvoke(new Action(() => { var ok = Shell.Install(); f.Post("window.Desk&&Desk.onInstalled&&Desk.onInstalled(" + (ok ? "true" : "false") + ")"); })); }
        public void quit() { f.BeginInvoke(new Action(() => f.Quit())); }
        /* the page on screen, straight to a PDF in Documents\Adhkar */
        public void savePdf(string name) {
            f.BeginInvoke(new Action(async () => {
                var dir = Shell.Documents();
                var clean = new StringBuilder(); foreach (var ch in (name ?? "Adhkar")) clean.Append(Array.IndexOf(Path.GetInvalidFileNameChars(), ch) >= 0 ? '-' : ch);
                var path = Path.Combine(dir, clean.ToString().Trim() + ".pdf");
                for (int i = 2; File.Exists(path); i++) path = Path.Combine(dir, clean.ToString().Trim() + " (" + i + ").pdf");
                var ok = false;
                try {
                    var s = f.Web.CoreWebView2.Environment.CreatePrintSettings();
                    s.PageWidth = 8.27; s.PageHeight = 11.69; s.MarginTop = s.MarginBottom = s.MarginLeft = s.MarginRight = 0;
                    s.ShouldPrintBackgrounds = true; s.ShouldPrintHeaderAndFooter = false; s.ScaleFactor = 1;
                    ok = await f.Web.CoreWebView2.PrintToPdfAsync(path, s);
                } catch { }
                f.Post("window.Desk&&Desk.onPdf&&Desk.onPdf(" + (ok ? Q(path) : "null") + ")");
            }));
        }
        public void reveal(string path) { if (path != null && File.Exists(path) && path.StartsWith(Shell.Documents(), StringComparison.OrdinalIgnoreCase)) Shell.Reveal(path); }
        public void openPdf(string path) { if (path != null && File.Exists(path) && path.StartsWith(Shell.Documents(), StringComparison.OrdinalIgnoreCase)) Shell.Open(path); }
    }
}
