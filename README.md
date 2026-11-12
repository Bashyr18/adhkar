# Adhkār

A free Android app for daily remembrance, built as ṣadaqah jāriyah.

- **Remembrance:** morning and evening adhkār, after ṣalāh, sleep, waking, the night, the adhān, worry and distress, and everyday duʿāʾs.
- **Prayer:** prayer times calculated on the phone, the qibla, Ḍuḥā, qiyām, make-up prayers, iqāmah times, silence during ṣalāh, and a step-by-step guide to the prayer.
- **Practice:** a Tracker with the numbers the Sunnah sets, counting on the fingers with a guided pace, a duʿāʾ journal, and a quiz with spaced repetition.
- **On the phone:** home-screen widgets, reminders at the minute, and the whole app in English or Arabic.

No ads, no account, no tracking. Everything stays on the phone; the internet is used only for recitations you choose to download.

**[Download the app](https://github.com/Bashyr18/adhkar/releases/latest/download/Adhkar.apk)** for Android 8 or later, or see [all releases](https://github.com/Bashyr18/adhkar/releases).

**[Read the illustrated user guide](https://bashyr18.github.io/adhkar/guide/)**: every page and feature, step by step, in dark and light, English and Arabic.

## Principles

Read these before changing anything. They are why the app is shaped the way it is.

1. **Religious text is never typed by hand.** Arabic and translations come from verified sources, through the build scripts in `tools/`, verbatim. See [Content](#content).
2. **Translations are labelled "Translation" and are verbatim:** sunnah.com for adhkār and hadith, The Clear Quran for the Qurʾān. Hadith carry their grade; only authentic narrations are used.
3. **The Sunnah shapes the design.** For example, dhikr is counted on the fingers by default, so the app keeps the pace rather than counting for you.
4. **Audio plays exactly what is on screen.** Where no recording of the exact words exists, the app says so.
5. **Prove it works.** Every change runs the content tests and the interface tests; screens are checked on a device.

## Layout

| Path | What |
|---|---|
| `web/` | The app: plain HTML, CSS and JavaScript, no framework. It also runs in a browser. |
| `web/js/core.js` | State, saved data, the catalogue of content, the bridge to Android. |
| `web/js/ui.js` | Router, rendering, sheets, gestures, theme. |
| `web/js/i18n.js` | The Arabic interface: formatters, the dictionary, number patterns. |
| `web/js/v-*.js` | One file per area of screens. |
| `web/js/pace.js`, `quiz.js`, `search.js`, `prayer.js`, `audio.js` | The engines. |
| `web/js/data.js`, `web/js/hadith.js` | **Generated** religious text. Never edit these; edit the build scripts. |
| `android/` | The native shell: a locked-down WebView, the bridge, reminders, widgets, the quick settings tile. No libraries. |
| `tools/` | Content builders, fetchers, tests, packers. |
| `docs/` | The illustrated user guide, published with GitHub Pages. |
| `store/` | Play Store listing and privacy policy. |

`web/js/prayer.js` is mirrored in `android/src/com/adhkar/app/PrayerCalc.java` (reminders and widgets use the Java one). The tests compare the two to the minute; change both together.

## Build

```bash
./build.sh
```

Needs JDK 17, Python 3, Node 20 or later, and the Android SDK (`build-tools/36.0.0`, `platforms/android-36`). The first time, install the Node tools:

```bash
cd tools/.node && npm ci
```

`build.sh` runs, in order: the content builders, the content tests, the interface tests, the web bundle, then aapt2, javac, d8, zipalign and apksigner. It writes:

- `dist/Adhkar.apk`: the signed app.
- `dist/Adhkar.aab`: the Play Store bundle (needs `tools/.bin/bundletool.jar`).
- `dist/Adhkar.html`: the whole app in one file, for testing in a browser.

The version lives in one place, the `VERSION` file: its first line is the name people see, the second is the code Android compares. Raise both for every release.

**Signing.** The first build creates a key in `keystore/`. That folder is private and is never committed. Every update must be signed with the same key, so keep a backup of it somewhere safe.

## Tests

```bash
node tools/test.js     # content: every item, hadith grades, prayer times against references, JS/Java parity
node tools/smoke.js    # interface: boots the real app in jsdom, opens every screen, drives the actions
```

Both run on every build and on every pull request. Write a test for each behaviour you add, named as a sentence about what the person using the app experiences.

## Content

```
tools/fetch_*.py      → tools/src/*.json            raw sources, kept as fetched
tools/build_content.py → web/js/data.js             adhkār, Qurʾān passages, the Tracker phrases
tools/build_hadith.py  → web/js/hadith.js           hadith, sliced verbatim between two markers
```

- **Adhkār:** Arabic from the Ḥiṣn al-Muslim API (hisnmuslim.com); translation and transliteration from sunnah.com's Ḥiṣn al-Muslim.
- **Qurʾān:** the Uthmani text from Quran.com; the translation is The Clear Quran (Dr Mustafa Khattab), used with permission.
- **Hadith:** Arabic and the sunnah.com English from fawazahmed0/hadith-api; grades as given on sunnah.com.
- **Recitations:** Ḥiṣn al-Muslim recordings (hisnmuslim.com) and Mishary al-ʿAfāsī (everyayah.com), downloaded by the app on request.

Every deliberate change to a source text is written down in code, with its reason: `FIX` (a correction) and `NOTE` (an explanation shown beside the text, never mixed into it) in `tools/build_hadith.py`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

GPL-3.0 (see [LICENSE](LICENSE)). Content sources, fonts and assets keep their own terms: see [NOTICE.md](NOTICE.md).
