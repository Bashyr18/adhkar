// Everything Adhkār keeps on this computer, in one folder you can see: %LOCALAPPDATA%\Adhkar
//   state.json   your record, in the phone's own format
//   backups\     one copy a day, the last 30 days
//   audio\       recitations you chose to download, kept for offline listening
//   desk.json    this computer's own settings (window, tray, zoom, the next-prayer window)
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace Adhkar {
    static class Store {
        public static string Root, AppDir, AudioDir, BackupDir, StateFile, DeskFile;
        public static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue, RecursionLimit = 256 };
        static readonly object stateLock = new object(), deskLock = new object();

        public static void Init() {
            string over = Environment.GetEnvironmentVariable("ADHKAR_DATA");
            Root = string.IsNullOrEmpty(over) ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Adhkar") : over;
            Directory.CreateDirectory(Root);
            AudioDir = Dir("audio"); BackupDir = Dir("backups");
            StateFile = Path.Combine(Root, "state.json"); DeskFile = Path.Combine(Root, "desk.json");
        }
        static string Dir(string n) { var d = Path.Combine(Root, n); Directory.CreateDirectory(d); return d; }

        /* ---------- the record ---------- */
        public static string LoadState() {
            lock (stateLock) {
                try { return File.Exists(StateFile) ? File.ReadAllText(StateFile, Encoding.UTF8) : null; } catch { return null; }
            }
        }
        /* written whole to a side file, then swapped in, so a power cut never leaves half a record */
        public static void SaveState(string json) {
            if (json == null || json.Length < 2 || json.Length > 8000000) return;
            ThreadPool.QueueUserWorkItem(delegate {
                lock (stateLock) {
                    try {
                        var tmp = StateFile + ".tmp";
                        using (var f = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None, 65536, FileOptions.WriteThrough)) {
                            var b = new UTF8Encoding(false).GetBytes(json); f.Write(b, 0, b.Length); f.Flush(true);
                        }
                        if (File.Exists(StateFile)) File.Replace(tmp, StateFile, null); else File.Move(tmp, StateFile);
                        var today = Path.Combine(BackupDir, DateTime.Now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) + ".json");
                        if (!File.Exists(today)) {
                            File.Copy(StateFile, today);
                            var all = Directory.GetFiles(BackupDir, "*.json"); Array.Sort(all);
                            for (int i = 0; i < all.Length - 30; i++) try { File.Delete(all[i]); } catch { }
                        }
                    } catch { }
                }
            });
        }
        public static List<Dictionary<string, object>> Backups() {
            var o = new List<Dictionary<string, object>>();
            var all = Directory.GetFiles(BackupDir, "*.json"); Array.Sort(all); Array.Reverse(all);
            foreach (var f in all) o.Add(new Dictionary<string, object> { { "name", Path.GetFileNameWithoutExtension(f) }, { "bytes", new FileInfo(f).Length } });
            return o;
        }
        public static string ReadBackup(string name) {
            var n = Safe(name); if (n == null) return null;
            var f = Path.Combine(BackupDir, n + ".json");
            return File.Exists(f) ? File.ReadAllText(f, Encoding.UTF8) : null;
        }
        public static string ReadText(string path) {
            var fi = new FileInfo(path);
            if (!fi.Exists || fi.Length > 8000000) return null;
            return File.ReadAllText(path, Encoding.UTF8);
        }

        /* ---------- this computer's own settings ---------- */
        static Dictionary<string, object> desk;
        public static Dictionary<string, object> Desk {
            get {
                lock (deskLock) {
                    if (desk == null) {
                        try { desk = File.Exists(DeskFile) ? Json.Deserialize<Dictionary<string, object>>(File.ReadAllText(DeskFile, Encoding.UTF8)) : null; } catch { desk = null; }
                        if (desk == null) desk = new Dictionary<string, object>();
                    }
                    return desk;
                }
            }
        }
        public static object Get(string k, object fallback) { object v; return Desk.TryGetValue(k, out v) && v != null ? v : fallback; }
        public static bool Flag(string k) { object v = Get(k, false); return v is bool && (bool)v; }
        public static void Set(string k, object v) { lock (deskLock) { Desk[k] = v; SaveDesk(); } }
        static void SaveDesk() {
            lock (deskLock) {
                try { var tmp = DeskFile + ".tmp"; File.WriteAllText(tmp, Json.Serialize(Desk), new UTF8Encoding(false)); if (File.Exists(DeskFile)) File.Replace(tmp, DeskFile, null); else File.Move(tmp, DeskFile); } catch { }
            }
        }

        public static string Safe(string name) {
            var n = Path.GetFileName((name ?? "").Replace('\\', '/'));
            if (n.Length == 0 || n.Contains("..") || n.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0) return null;
            return n;
        }

        /* ---------- recitations: only from the two recitation sources, or the app's own recordings ---------- */
        static readonly string[] Hosts = { "https://www.hisnmuslim.com/audio/ar/", "https://everyayah.com/data/Alafasy_128kbps/" };
        const long MaxBytes = 12L * 1024 * 1024;
        public static volatile bool Cancel;
        public static bool AudioName(string n) {
            if (n == null || n.Length < 5 || n.Length > 28 || !n.EndsWith(".mp3")) return false;
            for (int i = 0; i < n.Length - 4; i++) { var c = n[i]; if (!(c >= 'a' && c <= 'z') && !(c >= '0' && c <= '9')) return false; }
            return true;
        }
        static bool Allowed(string u) {
            if (u == null) return false;
            foreach (var h in Hosts) {
                if (!u.StartsWith(h)) continue;
                var rest = u.Substring(h.Length); if (!rest.EndsWith(".mp3") || rest.Length > 10) return false;
                for (int i = 0; i < rest.Length - 4; i++) if (!char.IsDigit(rest[i])) return false;
                return true;
            }
            return false;
        }
        public static string AudioFile(string n) { return AudioName(n) ? Path.Combine(AudioDir, n) : null; }
        /* one file: from the app's own recordings, or from its source once; true when it is here */
        public static bool FetchAudio(string n, string u) {
            var dst = AudioFile(n); if (dst == null) return false;
            if (File.Exists(dst) && new FileInfo(dst).Length > 0) return true;
            var tmp = dst + ".part";
            try {
                if (u != null && u.StartsWith("asset:audio/")) {
                    var rel = u.Substring(6); foreach (var c in rel) if (!(c >= 'a' && c <= 'z') && !(c >= '0' && c <= '9') && c != '-' && c != '/' && c != '.') return false;
                    var src = Path.Combine(AppDir, rel.Replace('/', Path.DirectorySeparatorChar)); if (!File.Exists(src)) return false;
                    File.Copy(src, tmp, true);
                } else {
                    if (!Allowed(u)) return false;
                    ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
                    var rq = (HttpWebRequest)WebRequest.Create(u); rq.Timeout = 15000; rq.ReadWriteTimeout = 20000; rq.AllowAutoRedirect = false; rq.UserAgent = "Adhkar";
                    using (var rs = (HttpWebResponse)rq.GetResponse()) {
                        if (rs.StatusCode != HttpStatusCode.OK) return false;
                        if (rs.ContentType != null && !rs.ContentType.StartsWith("audio/")) return false;
                        using (var i = rs.GetResponseStream()) using (var o = File.Create(tmp)) {
                            var b = new byte[32768]; int r; long total = 0;
                            while ((r = i.Read(b, 0, b.Length)) > 0) { if (Cancel) throw new Exception("cancelled"); total += r; if (total > MaxBytes) throw new Exception("too large"); o.Write(b, 0, r); }
                        }
                    }
                }
                if (File.Exists(dst)) File.Delete(tmp); else File.Move(tmp, dst);
                return true;
            } catch { try { File.Delete(tmp); } catch { } return false; }
        }
        public static long AudioUsage() { long s = 0; foreach (var f in Directory.GetFiles(AudioDir)) s += new FileInfo(f).Length; return s; }

        public static string Mime(string file) {
            switch (Path.GetExtension(file).ToLowerInvariant()) {
                case ".html": return "text/html; charset=utf-8";
                case ".js": return "text/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".json": return "application/json";
                case ".svg": return "image/svg+xml";
                case ".png": return "image/png";
                case ".jpg": case ".jpeg": return "image/jpeg";
                case ".webp": return "image/webp";
                case ".woff2": return "font/woff2";
                case ".mp3": return "audio/mpeg";
                case ".ogg": return "audio/ogg";
                case ".wav": return "audio/wav";
            }
            return "application/octet-stream";
        }
    }
}
