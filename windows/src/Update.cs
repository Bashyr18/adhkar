// Updates from the release page, only when you ask (Check now, or the weekly check you turned on in the app).
// 1. Ask GitHub for the latest release (api.github.com).
// 2. Download Adhkar-Windows.exe and the release's SHA256SUMS.txt, from github.com and GitHub's file hosts only.
// 3. The file must match its SHA-256 line and carry a higher version than this one; otherwise nothing changes.
// 4. A running .exe cannot be overwritten but can be renamed: this file becomes <name>.old, the new one takes its
//    place, and it starts, waits for this copy to close, then removes the .old file. Your record is untouched.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Adhkar {
    static class Update {
        const string Api = "https://api.github.com/repos/Bashyr18/adhkar/releases/latest";
        const string Asset = "Adhkar-Windows.exe", Sums = "SHA256SUMS.txt";
        const long MaxBytes = 200L * 1024 * 1024;
        static string exeUrl, sumsUrl, version; static long size;
        static volatile bool busy;

        /* for testing only: ADHKAR_UPDATE_API points the check at another address (a local copy of a release) */
        static string ApiUrl() { var o = Environment.GetEnvironmentVariable("ADHKAR_UPDATE_API"); return string.IsNullOrEmpty(o) ? Api : o; }
        static bool Testing() { return !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ADHKAR_UPDATE_API")); }
        static bool HostOk(Uri u) {
            if (Testing()) return true;
            if (u.Scheme != "https") return false;
            var h = u.Host.ToLowerInvariant();
            return h == "api.github.com" || h == "github.com" || h.EndsWith(".githubusercontent.com");
        }

        static HttpWebResponse Open(string url) {
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
            for (int hop = 0; hop < 5; hop++) {
                var u = new Uri(url);
                if (!HostOk(u)) throw new Exception("host " + u.Host);
                var rq = (HttpWebRequest)WebRequest.Create(u);
                rq.AllowAutoRedirect = false; rq.Timeout = 20000; rq.ReadWriteTimeout = 30000;
                rq.UserAgent = "Adhkar-Windows"; rq.Accept = "application/vnd.github+json, application/octet-stream, */*";
                HttpWebResponse rs;
                try { rs = (HttpWebResponse)rq.GetResponse(); }
                catch (WebException e) { rs = e.Response as HttpWebResponse; if (rs == null) throw; }
                int code = (int)rs.StatusCode;
                if (code >= 300 && code < 400) { var loc = rs.Headers["Location"]; rs.Close(); if (string.IsNullOrEmpty(loc)) throw new Exception("redirect"); url = new Uri(u, loc).AbsoluteUri; continue; }
                if (code != 200) { rs.Close(); throw new Exception("http " + code); }
                return rs;
            }
            throw new Exception("too many redirects");
        }
        static string Text(string url) {
            using (var rs = Open(url)) using (var r = new StreamReader(rs.GetResponseStream())) return r.ReadToEnd();
        }

        public static string Can() {
            /* a copy run from a folder it may not write to (Program Files) can not swap its own file */
            try {
                var dir = Path.GetDirectoryName(Application.ExecutablePath);
                var probe = Path.Combine(dir, ".adhkar-write-test");
                File.WriteAllText(probe, ""); File.Delete(probe);
                return "yes";
            } catch { return "no"; }
        }

        public static void Check(MainForm f) {
            if (busy) return;
            busy = true;
            Task.Run(() => {
                try {
                    var d = Store.Json.Deserialize<Dictionary<string, object>>(Text(ApiUrl()));
                    object tag; d.TryGetValue("tag_name", out tag);
                    version = (tag as string ?? "").TrimStart('v', 'V');
                    exeUrl = sumsUrl = null; size = 0;
                    object assets; d.TryGetValue("assets", out assets);
                    var list = assets as System.Collections.ArrayList;
                    if (list != null) foreach (var o in list) {
                        var a = o as Dictionary<string, object>; if (a == null) continue;
                        object n, u, s; a.TryGetValue("name", out n); a.TryGetValue("browser_download_url", out u); a.TryGetValue("size", out s);
                        if (n as string == Asset) { exeUrl = u as string; try { size = Convert.ToInt64(s); } catch { } }
                        if (n as string == Sums) sumsUrl = u as string;
                    }
                    object body; d.TryGetValue("body", out body);
                    var found = exeUrl != null && sumsUrl != null && Newer(version, Program.Version);
                    Send(f, found
                        ? new Dictionary<string, object> { { "state", "found" }, { "v", version }, { "size", size }, { "notes", Trim(body as string) } }
                        : new Dictionary<string, object> { { "state", "none" }, { "v", version } });
                } catch (Exception e) {
                    Send(f, new Dictionary<string, object> { { "state", "error" }, { "step", "check" }, { "why", e.Message } });
                } finally { busy = false; }
            });
        }

        public static void Get(MainForm f) {
            if (busy || exeUrl == null || sumsUrl == null) { Send(f, new Dictionary<string, object> { { "state", "error" }, { "step", "get" }, { "why", "check first" } }); return; }
            busy = true;
            Task.Run(() => {
                var dir = Path.Combine(Store.Root, "update"); Directory.CreateDirectory(dir);
                var part = Path.Combine(dir, "Adhkar-" + version + ".exe.part");
                try {
                    /* the file */
                    using (var rs = Open(exeUrl)) {
                        long total = rs.ContentLength > 0 ? rs.ContentLength : size, got = 0, last = 0;
                        using (var i = rs.GetResponseStream()) using (var o = File.Create(part)) {
                            var b = new byte[65536]; int r;
                            while ((r = i.Read(b, 0, b.Length)) > 0) {
                                got += r; if (got > MaxBytes) throw new Exception("too large");
                                o.Write(b, 0, r);
                                if (got - last > 131072) { last = got; Send(f, new Dictionary<string, object> { { "state", "progress" }, { "got", got }, { "total", total } }); }
                            }
                        }
                    }
                    /* its fingerprint, against the release's own list */
                    Send(f, new Dictionary<string, object> { { "state", "verifying" } });
                    string want = null;
                    foreach (var line in Text(sumsUrl).Split('\n')) {
                        var p = line.Trim().Split(new[] { ' ', '\t' }, 2, StringSplitOptions.RemoveEmptyEntries);
                        if (p.Length == 2 && p[1].TrimStart('*').Trim() == Asset) { want = p[0].ToLowerInvariant(); break; }
                    }
                    if (want == null) throw new Exception("no checksum");
                    string have;
                    using (var sha = SHA256.Create()) using (var s = File.OpenRead(part)) have = BitConverter.ToString(sha.ComputeHash(s)).Replace("-", "").ToLowerInvariant();
                    if (have != want) throw new Exception("checksum mismatch");
                    var fv = FileVersionInfo.GetVersionInfo(part);
                    if (!Newer(fv.FileMajorPart + "." + fv.FileMinorPart, Program.Version)) throw new Exception("not newer");
                    /* the swap */
                    Send(f, new Dictionary<string, object> { { "state", "installing" } });
                    var cur = Application.ExecutablePath; var old = cur + ".old";
                    try { if (File.Exists(old)) File.Delete(old); } catch { }
                    File.Move(cur, old);
                    try { File.Move(part, cur); } catch { File.Move(old, cur); throw; }
                    Send(f, new Dictionary<string, object> { { "state", "done" } });
                    f.BeginInvoke(new Action(() => {
                        try { Process.Start(new ProcessStartInfo(cur, "--after-update " + Process.GetCurrentProcess().Id) { UseShellExecute = false }); } catch { }
                        f.Quit();
                    }));
                } catch (Exception e) {
                    try { File.Delete(part); } catch { }
                    Send(f, new Dictionary<string, object> { { "state", "error" }, { "step", "get" }, { "why", e.Message } });
                    busy = false;
                }
            });
        }

        /* started by the old copy: wait for it to close (so the single-instance lock is free), then tidy up */
        public static void After(string[] args) {
            int i = Array.IndexOf(args, "--after-update");
            if (i < 0) return;
            int pid; if (i + 1 < args.Length && int.TryParse(args[i + 1], out pid)) {
                try { var p = Process.GetProcessById(pid); p.WaitForExit(15000); } catch { }
            }
        }
        public static void Tidy() {
            try { var old = Application.ExecutablePath + ".old"; if (File.Exists(old)) File.Delete(old); } catch { }
            try { var dir = Path.Combine(Store.Root, "update"); if (Directory.Exists(dir)) foreach (var x in Directory.GetFiles(dir)) File.Delete(x); } catch { }
        }

        public static bool Newer(string a, string b) {
            var x = (a ?? "").Split('.'); var y = (b ?? "").Split('.');
            for (int i = 0; i < Math.Max(x.Length, y.Length); i++) {
                int p = 0, q = 0; if (i < x.Length) int.TryParse(x[i], out p); if (i < y.Length) int.TryParse(y[i], out q);
                if (p != q) return p > q;
            }
            return false;
        }
        static string Trim(string s) { s = s ?? ""; return s.Length > 600 ? s.Substring(0, 600) : s; }
        static void Send(MainForm f, Dictionary<string, object> o) {
            var j = Store.Json.Serialize(o);
            f.Post("window.__native.onUpdate&&__native.onUpdate(" + Store.Json.Serialize(j) + ")");
        }
    }
}
