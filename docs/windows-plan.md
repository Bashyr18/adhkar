# Adhkār for Windows: the plan

Status: **built in 12.0**; 12.1 adds Adhkār's own desktop features (the day band, the sky rail, the session pane). 13.0 adds the pill at the top of the screen, Windows' own print dialog, and Learn the prayer as a spread. Phone sync follows. This is the plan the Windows edition was built from. It follows the
house method for desktop editions, whose reference implementation is Miftāḥ for Windows.

The aim is not the phone app in a window. It is the same app, the same record and the same content
rules, laid out again for a big screen, a keyboard, a mouse and a printer. Nothing is zoomed up, nothing
touches an edge, and no screen looks like a stretched phone.

## 1. Decisions already made

| Decision | Why |
|---|---|
| **WinForms + WebView2**, sharing the web app in `web/` unchanged | One codebase for content, logic and tests. WebView2 ships with Windows 10 and 11. |
| **C# 5, compiled by the `csc` built into Windows** (.NET Framework 4.8) | No Visual Studio and no SDK; builds on any Windows machine and in CI. |
| **One `.exe`, no installer** | Double-click to run. It can add itself to Start, run at sign-in and uninstall itself, per user, without administrator rights. |
| **Data in `%LOCALAPPDATA%\Adhkar`** | `state.json` in the phone's own format, 30 daily backups, downloaded recitations. |
| **The phone's bridge, name for name** | All 46 methods of `window.AndroidBridge` exist on Windows, so the web code never forks. A test proves it. |
| **Phone and computer join over home Wi-Fi only** | No account and no cloud. A backup file is the fallback. |
| **Stable download names** | `Adhkar.apk` and `Adhkar-Windows.exe` on every release, so the README and guide links never go stale. |

## 2. What the desktop edition adds

Chosen from the house catalogue for what Adhkār's users do at a computer.

| Feature | In Adhkār |
|---|---|
| **A rail instead of the tab bar** | Today, Adhkār, Tracker, Ṣalāh, Duʿāʾ and You down the left (the right in Arabic), with theme at the foot. Collapses to icons below 1150 px. |
| **Command palette (Ctrl K)** | Find any remembrance, collection, hadith or page by English or Arabic, with or without ḥarakāt. Built on the existing search engine. |
| **The keyboard** | Space taps the counting circle and holding Space pauses it, so counting on the fingers works the same way. ← and → move through the reader, Esc goes back, and Ctrl 1 to 6 switch areas. A shortcuts sheet behind `?`. Keys are ignored while typing. |
| **Wide layouts, designed for the space** | Today as a dashboard: the sky card and the day's prayers on one side, Now and the times of acceptance on the other. The reader in symmetric halves: the Arabic, then transliteration and translation. Ṣalāh with the day's times beside the month's timetable. Learning the prayer with the posture beside the words. |
| **Print and PDF** | The morning and evening adhkār as a booklet (Arabic, transliteration and translation, with sources). The month's prayer timetable for the home or the masjid. A Ramaḍān timetable with suhūr and ifṭār. White to the edge of the A4, saved to `Documents\Adhkar`. |
| **Reminders on the computer** | Prayer times and the chosen adhkār windows as Windows notifications, with the takbīr from Masjid an-Nabawī, never a chime. From the tray, so they arrive with the window closed. |
| **Next prayer, always in view** | A small window that can stay on top: the next prayer and its countdown, the computer's answer to the home-screen widget. The tray shows the same on hover. |
| **Tray, start with Windows, shortcuts, uninstall** | Per user. Closing can keep it in the tray, said once, never trapping anyone. |
| **Backups** | Thirty days, restorable, plus "Open the data folder". Drag a backup file onto the window to import it. |

What changes on a computer, because the hardware differs:

- **Location:** choose a city from the 615 built in, or type coordinates. No GPS.
- **Qibla:** the bearing and distance, and the sun method; there is no compass to turn.
- **Haptics, Do Not Disturb, battery settings, volume keys, the floating reminder:** these have no computer equivalent. Their bridge methods answer "not available", and the screens that offer them hide those rows.

## 3. Phone and computer together

- **Pair once:** the computer shows six digits; the phone enters them on the same Wi-Fi.
- **Sync:** the Tracker, prayers logged, the duʿāʾ journal, saved items and settings meet in both directions, merged by one function that the backup import also uses.
- **Private:** AES-256 with an HMAC on every message, keys derived from the code, nothing leaves the home network. Wrong codes are refused, and the code is withdrawn after 8 tries.
- **Fallback:** "Send to my other device" makes a backup file for any channel.

## 4. Build order

Each step ends with something checked.

1. **Shell.** `windows/src/App.cs`, `Store.cs` and `Shell.cs`: one instance, serve the bundled app from `https://adhkar.example/` (with 206 for audio), atomic saves, title bar in the theme's colours. *Check:* the `.exe` opens Today with the user's record.
2. **Bridge parity.** `Bridge.cs` and `shim.js` for all 46 methods; `tools/bridge-check.js` in the tests. *Check:* the check passes, and the existing 590 interface checks pass inside the shell.
3. **Desktop layer.** `web/js/desk.js` and `web/css/desk.css`, which decorate the shared screens rather than forking them: the rail, the palette, the keyboard and the wide layouts. *Check:* the audit at 1333 × 790 is clean.
4. **Desktop features.** Print and PDF, notifications and tray, the next-prayer window, backups, drag and drop.
5. **Phone sync.** `Link.cs` and the phone's side; `tools/link-test.js`. *Check:* paired with the emulator, records exchanged both ways, and wrong codes refused.
6. **Paper.** The booklet and timetables. *Check:* each PDF opened and rendered, Arabic set correctly, corners white.
7. **The audit.** 1333 × 790, 1600 × 1000 and 1920 × 1080; 100%, 125% and 150% scaling; light, dark and Arabic. Every screenshot looked at.
8. **Release.** Adhkār 12.0: `Adhkar.apk` and `Adhkar-Windows.exe` with versioned copies and `SHA256SUMS.txt`. The README and guide gain the Windows download and desktop screens. The SmartScreen step (**More info › Run anyway**) is documented until the app is signed.

## 5. Done means

- One `.exe` builds on a clean Windows machine and in CI, and starts without an installer or administrator rights.
- Every Android bridge method exists on Windows, and none blocks the window.
- The record is the phone's format, written atomically, with 30 daily backups.
- Every desktop feature works by keyboard and by mouse.
- A saved PDF is white to the edge, and its Arabic is set as in the app.
- The audit is clean at every size, theme and language, and every screenshot has been looked at.
- The release carries stable and versioned files with checksums, and the links point to the stable names.

## 6. Still to decide

- Whether phone sync ships in 12.0 or follows in 12.1.
- Which printables come first.
- Whether the next-prayer window stays on top by default.
