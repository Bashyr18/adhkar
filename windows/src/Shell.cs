// Windows itself: the title bar's colours, shortcuts in Start and on the desktop, starting with Windows,
// and an entry in Settings > Apps so Adhkār can be removed like any other program. All per user, no administrator.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Adhkar {
    static class Native {
        [DllImport("shcore.dll")] public static extern int SetProcessDpiAwareness(int value);
        [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
        [DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);
        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h, int attr, ref int value, int size);
        static int Ref(Color c) { return c.R | (c.G << 8) | (c.B << 16); }
        /* the title bar takes the page's own colours, so the window reads as one surface */
        public static void Caption(IntPtr h, bool dark, Color bg, Color fg) {
            try {
                int d = dark ? 1 : 0; DwmSetWindowAttribute(h, 20, ref d, 4);
                int b = Ref(bg); DwmSetWindowAttribute(h, 35, ref b, 4);
                int t = Ref(fg); DwmSetWindowAttribute(h, 36, ref t, 4);
                int border = Ref(bg); DwmSetWindowAttribute(h, 34, ref border, 4);
                int round = 2; DwmSetWindowAttribute(h, 33, ref round, 4);
            } catch { }
        }
        /* Windows' own apps setting: light or dark */
        public static bool SystemDark() {
            try {
                using (var k = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")) {
                    var v = k == null ? null : k.GetValue("AppsUseLightTheme");
                    return v is int && (int)v == 0;
                }
            } catch { return false; }
        }
    }

    static class Shell {
        const string AppName = "Adhkār";
        /* ADHKAR_INSTALL_ROOT (as for Adhkar-Setup.exe) points installing at a test folder and a test registry entry */
        static readonly string TestRoot = Environment.GetEnvironmentVariable("ADHKAR_INSTALL_ROOT");
        static bool Test { get { return !string.IsNullOrEmpty(TestRoot); } }
        static string Uninst { get { return @"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + (Test ? "Adhkar-Test" : "Adhkar"); } }
        static string RunValue { get { return Test ? "Adhkar-Test" : "Adhkar"; } }
        const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";

        public static void Open(string what) { try { Process.Start(new ProcessStartInfo(what) { UseShellExecute = true }); } catch { } }
        public static void Reveal(string file) { try { Process.Start("explorer.exe", "/select,\"" + file + "\""); } catch { } }
        public static string Documents() { var d = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Adhkar"); Directory.CreateDirectory(d); return d; }

        static string InstallDir { get { return Test ? Path.Combine(TestRoot, "Programs", "Adhkar") : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Adhkar"); } }
        static string InstalledExe { get { return Path.Combine(InstallDir, "Adhkar.exe"); } }
        static string StartLink { get { return Path.Combine(Test ? Path.Combine(TestRoot, "Start") : Environment.GetFolderPath(Environment.SpecialFolder.Programs), AppName + ".lnk"); } }
        static string DesktopLink { get { return Path.Combine(Test ? Path.Combine(TestRoot, "Desktop") : Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), AppName + ".lnk"); } }

        public static bool Installed() { return File.Exists(InstalledExe) && File.Exists(StartLink); }
        public static bool RunningInstalled() { return string.Equals(Path.GetFullPath(Application.ExecutablePath), Path.GetFullPath(InstalledExe), StringComparison.OrdinalIgnoreCase); }

        /* a copy in the user's own Programs folder, two shortcuts and an entry in Settings > Apps, as Adhkar-Setup.exe
           does; a downloaded copy never replaces a newer one already installed */
        public static bool Install() {
            try {
                Directory.CreateDirectory(InstallDir);
                if (!RunningInstalled() && !(File.Exists(InstalledExe) && Older(Program.Version, FileVer(InstalledExe)))) {
                    var tmp = InstalledExe + ".new";
                    File.Copy(Application.ExecutablePath, tmp, true);
                    if (File.Exists(InstalledExe)) { try { File.Delete(InstalledExe); } catch { File.Move(InstalledExe, InstalledExe + ".old"); } }
                    File.Move(tmp, InstalledExe);
                }
                try { File.Delete(Path.Combine(Path.GetDirectoryName(StartLink), "Adhkar.lnk")); } catch { }
                try { File.Delete(Path.Combine(Path.GetDirectoryName(DesktopLink), "Adhkar.lnk")); } catch { }
                Link(StartLink, InstalledExe, "", "Remembrance for every moment");
                Link(DesktopLink, InstalledExe, "", "Remembrance for every moment");
                Register();
                if (StartsWithWindows()) StartWithWindows(true);
                return true;
            } catch { return false; }
        }
        static void Register() {
            using (var k = Registry.CurrentUser.CreateSubKey(Uninst)) {
                k.SetValue("DisplayName", Test ? AppName + " (test)" : AppName);
                k.SetValue("DisplayVersion", FileVer(InstalledExe));
                k.SetValue("Publisher", "Adhkār, open source");
                k.SetValue("Comments", "Remembrance for every moment");
                k.SetValue("DisplayIcon", InstalledExe + ",0");
                k.SetValue("InstallLocation", InstallDir);
                k.SetValue("UninstallString", "\"" + InstalledExe + "\" --uninstall");
                k.SetValue("QuietUninstallString", "\"" + InstalledExe + "\" --uninstall --quiet");
                k.SetValue("URLInfoAbout", "https://bashyr18.github.io/adhkar/guide/");
                k.SetValue("HelpLink", "https://bashyr18.github.io/adhkar/guide/");
                k.SetValue("URLUpdateInfo", "https://github.com/Bashyr18/adhkar/releases/latest");
                if (k.GetValue("InstallDate") == null) k.SetValue("InstallDate", DateTime.Now.ToString("yyyyMMdd", System.Globalization.CultureInfo.InvariantCulture));
                k.SetValue("NoModify", 1, RegistryValueKind.DWord); k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                k.SetValue("EstimatedSize", (int)(new FileInfo(InstalledExe).Length / 1024), RegistryValueKind.DWord);
            }
        }
        /* an installed copy that updated itself keeps Settings > Apps telling the truth about its version */
        public static void Refresh() {
            try {
                if (!RunningInstalled()) return;
                using (var k = Registry.CurrentUser.OpenSubKey(Uninst)) {
                    if (k != null && (k.GetValue("DisplayVersion") as string) == Program.Version && k.GetValue("QuietUninstallString") != null) return;
                }
                Register();
            } catch { }
        }
        static string FileVer(string exe) {
            try { var f = FileVersionInfo.GetVersionInfo(exe); return f.FileMajorPart + "." + f.FileMinorPart; } catch { return Program.Version; }
        }
        static bool Older(string a, string b) { return Update.Newer(b, a); }
        /* the downloaded copy hands over to the installed one, which starts once this window has closed */
        public static void OpenInstalled(int pid) {
            try { Process.Start(new ProcessStartInfo(InstalledExe, "--after-update " + pid) { UseShellExecute = false, WorkingDirectory = InstallDir }); } catch { }
        }
        static void Link(string lnk, string target, string args, string about) {
            /* the scripting shell writes file names in the old code page, which turns ā into a: save under a plain
               name, then give the file its real one */
            Directory.CreateDirectory(Path.GetDirectoryName(lnk));
            var plain = Path.Combine(Path.GetDirectoryName(lnk), "adhkar-new-shortcut.lnk");
            var t = Type.GetTypeFromProgID("WScript.Shell"); dynamic sh = Activator.CreateInstance(t);
            dynamic l = sh.CreateShortcut(plain);
            l.TargetPath = target; l.Arguments = args; l.Description = about; l.WorkingDirectory = Path.GetDirectoryName(target); l.IconLocation = target + ",0";
            l.Save();
            Marshal.FinalReleaseComObject(l); Marshal.FinalReleaseComObject(sh);
            if (File.Exists(lnk)) File.Delete(lnk);
            File.Move(plain, lnk);
        }
        public static bool StartsWithWindows() { using (var k = Registry.CurrentUser.OpenSubKey(RunKey)) return k != null && k.GetValue(RunValue) != null; }
        public static void StartWithWindows(bool on) {
            using (var k = Registry.CurrentUser.CreateSubKey(RunKey)) {
                if (on) k.SetValue(RunValue, "\"" + (File.Exists(InstalledExe) ? InstalledExe : Application.ExecutablePath) + "\" --tray");
                else if (k.GetValue(RunValue) != null) k.DeleteValue(RunValue);
            }
        }
        /* from Settings > Apps: the program goes; your record stays, so nothing is lost if you install it again */
        public static void Uninstall(bool quiet) {
            if (!quiet && MessageBox.Show("Remove Adhkār from this computer?\n\nYour record stays in\n" + Store.Root + "\nso nothing is lost if you install it again.", AppName, MessageBoxButtons.OKCancel, MessageBoxIcon.Question) != DialogResult.OK) return;
            /* an open Adhkār is asked to close first, or its file could not be removed */
            try {
                using (var p = new System.IO.Pipes.NamedPipeClientStream(".", Program.PipeName, System.IO.Pipes.PipeDirection.Out)) {
                    p.Connect(1200);
                    var b = System.Text.Encoding.UTF8.GetBytes("--quit"); p.Write(b, 0, b.Length);
                }
            } catch { }
            var me = Process.GetCurrentProcess().Id;
            foreach (var p in Process.GetProcessesByName("Adhkar")) {
                try {
                    if (p.Id == me || !string.Equals(Path.GetFullPath(p.MainModule.FileName), Path.GetFullPath(InstalledExe), StringComparison.OrdinalIgnoreCase)) continue;
                    if (!p.WaitForExit(8000)) p.Kill();
                } catch { }
            }
            try { File.Delete(StartLink); } catch { }
            try { File.Delete(DesktopLink); } catch { }
            try { StartWithWindows(false); } catch { }
            try { Registry.CurrentUser.DeleteSubKeyTree(Uninst, false); } catch { }
            try { foreach (var d in Directory.GetDirectories(Store.Root, "app-*")) Directory.Delete(d, true); } catch { }
            /* this very file is still running: a hidden helper removes the folder a moment after it closes
               (ping is the pause; timeout needs a console, which a hidden helper does not have) */
            try {
                Process.Start(new ProcessStartInfo("cmd.exe", "/d /c ping -n 4 127.0.0.1 >nul & rmdir /s /q \"" + InstallDir + "\"") {
                    CreateNoWindow = true, UseShellExecute = false, WindowStyle = ProcessWindowStyle.Hidden, WorkingDirectory = Path.GetTempPath()
                });
            } catch { }
            if (!quiet) MessageBox.Show("Adhkār has been removed. Your record is still in " + Store.Root + ".", AppName);
        }
    }
}
