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
        const string Uninst = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\Adhkar";
        const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";

        public static void Open(string what) { try { Process.Start(new ProcessStartInfo(what) { UseShellExecute = true }); } catch { } }
        public static void Reveal(string file) { try { Process.Start("explorer.exe", "/select,\"" + file + "\""); } catch { } }
        public static string Documents() { var d = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Adhkar"); Directory.CreateDirectory(d); return d; }

        static string InstallDir { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Adhkar"); } }
        static string InstalledExe { get { return Path.Combine(InstallDir, "Adhkar.exe"); } }
        static string StartLink { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), AppName + ".lnk"); } }
        static string DesktopLink { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), AppName + ".lnk"); } }

        public static bool Installed() { return File.Exists(InstalledExe) && File.Exists(StartLink); }
        public static bool RunningInstalled() { return string.Equals(Path.GetFullPath(Application.ExecutablePath), Path.GetFullPath(InstalledExe), StringComparison.OrdinalIgnoreCase); }

        /* a copy in the user's own Programs folder, two shortcuts and an entry in Settings > Apps */
        public static bool Install() {
            try {
                Directory.CreateDirectory(InstallDir);
                if (!RunningInstalled()) File.Copy(Application.ExecutablePath, InstalledExe, true);
                Link(StartLink, InstalledExe, "", "Remembrance for every moment");
                Link(DesktopLink, InstalledExe, "", "Remembrance for every moment");
                using (var k = Registry.CurrentUser.CreateSubKey(Uninst)) {
                    k.SetValue("DisplayName", AppName);
                    k.SetValue("DisplayVersion", Program.Version);
                    k.SetValue("Publisher", "Adhkār, open source");
                    k.SetValue("DisplayIcon", InstalledExe + ",0");
                    k.SetValue("InstallLocation", InstallDir);
                    k.SetValue("UninstallString", "\"" + InstalledExe + "\" --uninstall");
                    k.SetValue("NoModify", 1, RegistryValueKind.DWord); k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    k.SetValue("EstimatedSize", (int)(new FileInfo(InstalledExe).Length / 1024), RegistryValueKind.DWord);
                }
                if (StartsWithWindows()) StartWithWindows(true);
                return true;
            } catch { return false; }
        }
        static void Link(string lnk, string target, string args, string about) {
            var t = Type.GetTypeFromProgID("WScript.Shell"); dynamic sh = Activator.CreateInstance(t);
            dynamic l = sh.CreateShortcut(lnk);
            l.TargetPath = target; l.Arguments = args; l.Description = about; l.WorkingDirectory = Path.GetDirectoryName(target); l.IconLocation = target + ",0";
            l.Save();
            Marshal.FinalReleaseComObject(l); Marshal.FinalReleaseComObject(sh);
        }
        public static bool StartsWithWindows() { using (var k = Registry.CurrentUser.OpenSubKey(RunKey)) return k != null && k.GetValue("Adhkar") != null; }
        public static void StartWithWindows(bool on) {
            using (var k = Registry.CurrentUser.CreateSubKey(RunKey)) {
                if (on) k.SetValue("Adhkar", "\"" + (File.Exists(InstalledExe) ? InstalledExe : Application.ExecutablePath) + "\" --tray");
                else if (k.GetValue("Adhkar") != null) k.DeleteValue("Adhkar");
            }
        }
        /* from Settings > Apps: the program goes; your record stays, so nothing is lost if you install it again */
        public static void Uninstall() {
            if (MessageBox.Show("Remove Adhkār from this computer?\n\nYour record stays in\n" + Store.Root + "\nso nothing is lost if you install it again.", AppName, MessageBoxButtons.OKCancel, MessageBoxIcon.Question) != DialogResult.OK) return;
            try { File.Delete(StartLink); } catch { }
            try { File.Delete(DesktopLink); } catch { }
            try { StartWithWindows(false); } catch { }
            try { Registry.CurrentUser.DeleteSubKeyTree(Uninst, false); } catch { }
            try { foreach (var d in Directory.GetDirectories(Store.Root, "app-*")) Directory.Delete(d, true); } catch { }
            try { Process.Start(new ProcessStartInfo("cmd.exe", "/c timeout /t 2 /nobreak >nul & rmdir /s /q \"" + InstallDir + "\"") { CreateNoWindow = true, UseShellExecute = false, WindowStyle = ProcessWindowStyle.Hidden }); } catch { }
            MessageBox.Show("Adhkār has been removed. Your record is still in " + Store.Root + ".", AppName);
        }
    }
}
