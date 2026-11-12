# Contributing

Jazākum Allāhu khayran for helping. Two kinds of change are welcome, and they follow different rules.

## Religious content

This is the part that matters most, and the rule is strict.

- **Nothing is typed by hand.** Arabic, translations and hadith enter the app only from a listed source, through the scripts in `tools/`. Never edit `web/js/data.js` or `web/js/hadith.js`.
- **Verbatim, with its source.** Each item carries its reference; each hadith carries its grade. Only authentic narrations are used: a narration graded weak is not added.
- **Changes are written down.** A correction goes in `FIX`, an explanation in `NOTE` (`tools/build_hadith.py`), each with a comment giving the reason.
- **A named reviewer.** A pull request that adds or changes religious content names the person of knowledge who reviewed it.
- **Audio matches the text exactly**, from a human reciter. If no recording of the exact words exists, the item says so.

## Code and design

- **Format before you commit:** `tools/.node/node_modules/.bin/prettier --write "web/js/*.js" "web/*.css" "tools/*.js"`. The automated checks fail on unformatted code.
- **Test what you change.** `node tools/test.js` and `node tools/smoke.js` must pass. Add a check for each new behaviour, named as a sentence about what the user experiences.
- **Every new setting goes into `defaults()`** in `web/js/core.js`. A saved value whose key is missing there is dropped on load.
- **Every new interface string gets its Arabic** in the dictionary in `web/js/i18n.js`. The tests check that every message has one.
- **Escape everything you put into the page** with `A.esc()`.
- **Keep the voice.** Short, warm and precise. No em dashes in interface text. "Translation", never "meaning". "Ramaḍān Mubārak", never "Kareem". Transliteration with its marks: ṣalāh, duʿāʾ, Qurʾān.
- **No sounds of bells or music.** Reminders use the adhān or the phone's default sound.
- **Check it on a phone**, in both themes and both languages, and at a narrow width (320 px).

## Pull requests

Say what changed and why, how you tested it, and what you could not test. Include screenshots for anything visible.
