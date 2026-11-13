/* Engine tests: node tools/test.js
   1. prayer.js against published sunrise/sunset & qibla references
   2. prayer.js ↔ PrayerCalc.java parity (notifications/widgets use the Java engine)
   3. content integrity (every collection item resolves, Arabic present, no duplicate ids) */
'use strict';
const path = require('path'),
  fs = require('fs'),
  cp = require('child_process'),
  os = require('os');
const ROOT = path.join(__dirname, '..');
global.window = globalThis;
require(path.join(ROOT, 'web/js/prayer.js'));
require(path.join(ROOT, 'web/js/data.js'));
require(path.join(ROOT, 'web/js/cities.js'));
const P = globalThis.Prayer,
  D = globalThis.DATA;
let fail = 0,
  pass = 0;
const ok = (c, msg) => {
  if (c) pass++;
  else {
    fail++;
    console.log('FAIL', msg);
  }
};
const hm = (ms, tz) => new Date(ms).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
const mins = (s) => +s.slice(0, 2) * 60 + +s.slice(3);

/* hadith: every narration carries its grade (Qurʾān āyāt and plain phrases are not graded) */
{
  require(path.join(ROOT, 'web/js/hadith.js'));
  Object.keys(globalThis.HADITH).forEach((k) => {
    if (!/^(quran|say):/.test(k)) ok(!!globalThis.HADITH[k].g, 'hadith has a grade: ' + k);
  });
}
/* the version is defined once */
ok(
  /^\d+\.\d+\n\d+\n?$/.test(fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').replace(/\r/g, '')),
  'VERSION holds a name and a code'
);
ok(
  !/versionCode|versionName/.test(fs.readFileSync(path.join(ROOT, 'android/AndroidManifest.xml'), 'utf8')),
  'the manifest does not carry its own version'
);
/* the Arabic dictionary has one entry per English string */
{
  const src = fs.readFileSync(path.join(ROOT, 'web/js/i18n.js'), 'utf8'),
    seen = {},
    dup = [];
  const body = src.slice(src.indexOf('var D = {'), src.indexOf('\n  };', src.indexOf('var D = {')));
  for (const m of body.matchAll(/'((?:[^'\\]|\\.)+)':\s*'/g)) {
    if (seen[m[1]]) dup.push(m[1]);
    seen[m[1]] = 1;
  }
  ok(!dup.length, 'no duplicate dictionary keys ' + dup.join(' | '));
}

/* 1. references (sunrise/sunset ±3 min, qibla ±0.5°) */
[
  ['London', 51.5074, -0.1278, 'Europe/London', '2026-11-01', '06:56', '16:33', 118.99],
  ['New York', 40.7128, -74.006, 'America/New_York', '2026-11-01', '06:26', '16:53', 58.48],
  ['Makkah', 21.4225, 39.8262, 'Asia/Riyadh', '2026-11-01', '06:24', '17:46', null]
].forEach(([n, la, lo, tz, k, sr, ss, q]) => {
  const t = P.day(k, { lat: la, lng: lo, method: 'mwl' });
  ok(Math.abs(mins(hm(t.sunrise, tz)) - mins(sr)) <= 3, n + ' sunrise ' + hm(t.sunrise, tz) + ' vs ' + sr);
  ok(Math.abs(mins(hm(t.maghrib, tz)) - mins(ss)) <= 3, n + ' sunset ' + hm(t.maghrib, tz) + ' vs ' + ss);
  if (q) ok(Math.abs(P.qibla(la, lo) - q) < 0.5, n + ' qibla ' + P.qibla(la, lo).toFixed(2));
});
/* ordering & finiteness for every city, summer and winter, every method */
const methods = Object.keys(P.METHODS);
D &&
  globalThis.CITIES.forEach((c, i) =>
    ['2026-06-21', '2026-12-21'].forEach((k) => {
      const m = methods[i % methods.length],
        t = P.day(k, { lat: c.lat, lng: c.lng, method: m, highLat: 'angle' });
      const seq = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha, t.nextFajr];
      ok(seq.every(isFinite) && seq.every((v, j) => !j || v > seq[j - 1]), 'order ' + c.name + ' ' + k + ' ' + m);
    })
  );

/* 2. JS ↔ Java parity */
const cases = [];
globalThis.CITIES.filter((c, i) => i % 9 === 0).forEach((c, i) =>
  ['2026-03-20', '2026-06-21', '2026-11-01', '2026-12-21'].forEach((k) => {
    cases.push({
      lat: c.lat,
      lng: c.lng,
      method: methods[i % methods.length],
      asr: i % 2 ? 'hanafi' : 'std',
      highLat: ['angle', 'mid', 'seventh'][i % 3],
      key: k
    });
  })
);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adhkar-parity-'));
try {
  const src = [path.join(ROOT, 'android/src/com/adhkar/app/PrayerCalc.java'), path.join(__dirname, 'ParityTest.java')];
  cp.execFileSync('javac', ['-nowarn', '-encoding', 'UTF-8', '-d', tmp].concat(src), { stdio: 'pipe' });
  const input = cases
    .map((c) => [c.lat, c.lng, c.method, c.asr, c.highLat].concat(c.key.split('-').map(Number)).join('\t'))
    .join('\n');
  const out = cp
    .execFileSync('java', ['-cp', tmp, 'com.adhkar.app.ParityTest'], { input, encoding: 'utf8' })
    .trim()
    .split(/\r?\n/);
  let worst = 0;
  cases.forEach((c, i) => {
    const js = P.day(c.key, c),
      jv = out[i].split('\t').map(Number);
    ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'lastThird'].forEach((k, j) => {
      const d = Math.abs(js[k] - jv[j]) / 60000;
      worst = Math.max(worst, d);
      ok(d <= 1, 'parity ' + k + ' ' + JSON.stringify(c) + ' Δ' + d + 'min');
    });
  });
  console.log('parity cases', cases.length, 'worst Δ', worst, 'min');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

/* 3. content integrity */
const seen = new Set();
D.collections.forEach((c) =>
  c.items.forEach((e) => {
    const it = D.items[e.u];
    ok(!!it, 'item ' + e.u);
    ok(it && it.ar && it.ar.length > 1, 'arabic ' + e.u);
  })
);
Object.keys(D.items).forEach((k) => {
  ok(!seen.has(k), 'dup ' + k);
  seen.add(k);
});
D.tasbih.forEach((t) => ok(t.ar && t.tr, 'phrase ' + t.id));

/* 4. app logic: seasonal content never leaks outside its season */
global.localStorage = {
  getItem() {
    return null;
  },
  setItem() {}
};
global.document = {
  addEventListener() {},
  querySelector() {
    return null;
  }
};
// navigator already exists in Node 24
require(path.join(ROOT, 'web/js/core.js'));
const A = globalThis.A;
for (let i = 0; i < 400; i++) {
  const k = A.shift('2026-11-01', i),
    x = A.dailyDhikr(k),
    ram = A.hijri(k).m === 9;
  ok(!!x, 'dhikr of the day exists ' + k);
  ok(x.c.id !== 'ramadan' || ram, 'Ramadan duʿāʾ outside Ramadan on ' + k);
  ok(
    ['quick', 'salah', 'morning', 'ramadan'].indexOf(x.c.id) >= 0,
    'time-bound collection in dhikr of the day: ' + x.c.id
  );
}

/* 4b. after Maghrib the next Islamic day leads: the eve of Ramaḍān, the odd nights, ʿĪd eve */
let eves = 0;
for (let i = 0; i < 400; i++) {
  const k = A.shift('2026-11-01', i),
    hn = A.hijri(A.shift(k, 1)),
    ev = A.occasion(k, true),
    day = A.occasion(k, false);
  if (hn.m === 9 && hn.d === 1) {
    eves++;
    ok(ev[0] && ev[0].t === 'Ramaḍān begins tonight', 'Ramaḍān eve note on ' + k);
    ok(!day.some((o) => /tonight/.test(o.t)), 'no eve note in daytime ' + k);
  }
  if (hn.m === 9 && hn.d === 27) {
    eves++;
    ok(ev[0] && ev[0].t === 'Tonight is night 27', 'night 27 note on ' + k);
  }
  if (hn.m === 10 && hn.d === 1) {
    eves++;
    ok(ev[0] && ev[0].t === 'ʿĪd is tomorrow', 'ʿĪd eve note on ' + k);
  }
}
ok(eves === 3, 'eve fixtures found: ' + eves);

/* 5. wording guard: phrases the app must never show (Salafī consistency) and no em dashes in displayed text */
const BANNED = [
  [/Ramad(a|ā|ha)n Kar(ee|ī|i)m/i, 'Ramaḍān Kareem (use Ramaḍān Mubārak)'],
  [/Jumu.?ah Mub(a|ā)rak/i, 'weekly Jumuʿah Mubārak'],
  [/(Islamic|Hijri) New Year/i, 'Islamic New Year occasion'],
  [/\b(jingle|chime|bell sound|ringtone)\b/i, 'musical sound wording'],
  [/\b(tehran|jafari)\b/i, 'Shia calculation method']
];
const shown = fs
  .readdirSync(path.join(ROOT, 'web/js'))
  .filter((f) => f !== 'cities.js' && f !== 'kahf.js') /* generated: verbatim sources keep their own punctuation */
  .map((f) => [f, fs.readFileSync(path.join(ROOT, 'web/js', f), 'utf8')]);
shown.forEach(([f, src]) => {
  const text = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  BANNED.forEach(([re, why]) => ok(!re.test(text), 'banned wording in ' + f + ': ' + why));
  ok(!/['"`][^'"`\n]*—[^'"`\n]*['"`]/.test(text), 'em dash in displayed text in ' + f);
});

/* Sūrat al-Kahf: the mushaf pages and the verses, exactly as the sources give them */
{
  const sandbox = {};
  new Function('window', fs.readFileSync(path.join(ROOT, 'web/js/kahf.js'), 'utf8'))(sandbox);
  const K = sandbox.KAHF;
  ok(K && K.verses.length === 110, 'al-Kahf has 110 verses');
  ok(K.verses.every((v, i) => v.n === i + 1), 'al-Kahf verses run 1 to 110 in order');
  ok(K.verses.every((v) => v.ar && v.en && !/[<>]/.test(v.en)), 'every verse of al-Kahf has its Arabic and a clean translation');
  ok(K.pages.map((p) => p.p).join() === '293,294,295,296,297,298,299,300,301,302,303,304', 'al-Kahf is on Madani pages 293 to 304');
  K.pages.forEach((p) => {
    const ls = p.lines.map((l) => l.l), first = p.p === 293 ? 12 : 1;
    ok(ls.join() === Array.from({ length: 16 - first }, (_, i) => first + i).join(), 'page ' + p.p + ' has every line from ' + first + ' to 15');
  });
  const ends = {}, words = {};
  K.pages.forEach((p) => p.lines.forEach((l) => l.w.forEach((w) => {
    if (w[2]) ends[w[1]] = (ends[w[1]] || 0) + 1;
    else words[w[1]] = (words[w[1]] || 0) + 1;
  })));
  ok(K.verses.every((v) => ends[v.n] === 1), 'every verse of al-Kahf ends with exactly one verse mark');
  ok(K.verses.every((v) => words[v.n] === v.ar.split(/\s+/).filter((x) => !/^[\u06D6-\u06ED\u0660-\u0669۝]+$/.test(x)).length), 'each verse has one mushaf glyph per word of its text');
  ok(K.bismillah.indexOf('بِسْمِ') === 0, 'the bismillah comes from al-Fātiḥah 1:1');
}

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
