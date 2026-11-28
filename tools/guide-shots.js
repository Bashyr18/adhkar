/* Every screenshot in the guide and the README, from the app itself with a month of sample use.
     node tools/guide-shots.js [group ...]       (groups: dark light ar friday friday-light ramadan desk desk-light desk-ar)
   Each group is one run of headless Edge (tools/cdp.js) with its own theme, language and, for Friday and Ramaḍān,
   a clock set to such a day, so those modes appear exactly as they do on that day. Phone screens are 360 x 746 at
   2x (saved 720 x 1491), desktop screens 1600 x 1000. Output: docs/guide/shots/<group>/<name>.webp. */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const ORIGIN = 'file:///' + path.join(ROOT, 'web', 'index.html').replace(/\\/g, '/').replace(/ /g, '%20');

/* name, route, and an optional step to run once the page is there */
const PHONE = {
  today: '#/',
  adhkar: '#/adhkar',
  collection: '#/c/morning',
  reader: '#/r/morning/0',
  search: '#/search',
  saved: '#/saved',
  counting: '#/counting',
  tracker: '#/tracker',
  insights: '#/insights',
  salah: '#/salah',
  qibla: '#/qibla',
  month: '#/month',
  night: '#/night',
  duha: '#/duha',
  qada: '#/qada',
  location: '#/location',
  learn: '#/learn',
  'learn-fajr': '#/learn/fajr',
  wudu: '#/purity/wudu/3',
  ghusl: '#/purity/ghusl',
  quiz: '#/learn/quiz',
  journal: '#/journal',
  answered: '#/answered',
  deeds: '#/deeds',
  modesty: '#/modesty',
  profile: '#/profile',
  calendar: '#/calendar',
  'plan-fast': '#/calendar',
  print: '#/print',
  's-appearance': '#/settings/appearance',
  's-reading': '#/settings/reading',
  's-prayer': '#/settings/prayer',
  's-reminders': '#/settings/notifications',
  's-data': '#/settings/data',
  settings: '#/settings',
  'print-times': '#/print|[data-w="times"]'
};
/* Ramaḍān and Friday: the screens that change with them */
const RAMADAN = { today: '#/', adhkar: '#/adhkar', salah: '#/salah', tracker: '#/tracker', month: '#/ramadan' };
const FRIDAY = { today: '#/', jumuah: '#/jumuah', kahf: '#/kahf' };
/* the theme sheet, opened from Today's palette button */
const SHEET = { 'theme-sheet': '#/|[data-a="theme"]' };
const GROUPS = {
  /* every screen in all three: the guide's Day / Night and English / العربية switches change every picture */
  dark: { theme: 'dark', shots: Object.keys(PHONE) },
  light: { theme: 'light', shots: Object.keys(PHONE) },
  ar: { theme: 'dark', ar: true, shots: Object.keys(PHONE) },
  extra: { theme: 'dark', shots: SHEET },
  'extra-light': { theme: 'light', dir: 'extra', suffix: '-light', shots: SHEET },
  'extra-ar': { theme: 'dark', ar: true, dir: 'extra', suffix: '-ar', shots: SHEET },
  /* a Friday morning, and the first days of Ramaḍān 1448 */
  friday: { theme: 'dark', at: '2026-11-20T09:30:00', shots: FRIDAY },
  'friday-light': { theme: 'light', at: '2026-11-20T09:30:00', dir: 'friday', suffix: '-light', shots: FRIDAY },
  'friday-ar': { theme: 'dark', ar: true, at: '2026-11-20T09:30:00', dir: 'friday', suffix: '-ar', shots: FRIDAY },
  'ramadan-light': { theme: 'light', at: '2027-02-18T15:20:00', dir: 'ramadan', suffix: '-light', shots: RAMADAN },
  'ramadan-ar': { theme: 'dark', ar: true, at: '2027-02-18T15:20:00', dir: 'ramadan', suffix: '-ar', shots: RAMADAN },
  ramadan: {
    theme: 'dark',
    at: '2027-02-18T15:20:00',
    shots: RAMADAN
  },
  'ramadan-desktop': { theme: 'dark', desk: true, at: '2027-02-18T15:20:00', shots: { month: '#/ramadan' } },
  desk: {
    theme: 'dark',
    desk: true,
    shots: {
      today: '#/',
      adhkar: '#/adhkar',
      reader: '#/r/morning/0',
      tracker: '#/tracker',
      insights: '#/insights',
      salah: '#/salah',
      learn: '#/learn/fajr',
      journal: '#/journal',
      profile: '#/profile',
      calendar: '#/calendar',
      print: 'rail:Print and PDF',
      pc: 'rail:This computer',
      palette: 'pal'
    }
  },
  'desk-light': {
    theme: 'light',
    desk: true,
    dir: 'desk',
    suffix: '-light',
    shots: { today: '#/', tracker: '#/tracker', salah: '#/salah' }
  },
  'desk-ar': {
    theme: 'dark',
    ar: true,
    desk: true,
    dir: 'desk',
    suffix: '-ar',
    shots: { today: '#/', tracker: '#/tracker' }
  }
};

/* a month of steady use, so every screen has something true to show */
function sample(now, g) {
  const iso = (d) =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const done = {},
    prayed = {},
    days = {},
    P = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  let total = 0,
    r = 11;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 1; i <= 34; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(6, 10, 0, 0);
    const k = iso(d),
      at = d.getTime();
    if (rnd() < 0.93) done[k + '|morning'] = at;
    if (rnd() < 0.82) done[k + '|evening'] = at + 11 * 3600e3;
    if (rnd() < 0.6) done[k + '|sleep'] = at + 16 * 3600e3;
    prayed[k] = {};
    P.forEach((p, j) => {
      if (rnd() < 0.95) {
        prayed[k][p] = 1;
        if (rnd() < 0.7) done[k + '|salah-' + p] = at + j * 3 * 3600e3;
      }
    });
    const n = Math.round(60 + rnd() * 240 + (i % 7 === 2 ? 120 : 0));
    days[k] = n;
    total += n;
  }
  const t = iso(new Date(now));
  prayed[t] = { fajr: 1 };
  return {
    v: 10,
    profile: { name: 'Bashir', hue: 'gold', since: iso(new Date(now - 40 * 864e5)), onboarded: true, gender: 'm' },
    loc: { lat: 6.5244, lng: 3.3792, name: 'Lagos', city: 'Lagos', country: 'Nigeria', src: 'city', tz: 1 },
    prefs: { theme: g.theme, lang: g.ar ? 'ar' : null },
    hints: { counting: 1, tracker: 1, reader: 1, today: 1, 'pace-tap': 1, fingers: 1 },
    saved: ['morning|kursi', 'morning|ikhlas', 'sleep|z-quls'],
    done,
    prayed,
    tasbih: {
      cur: 'subhanallah',
      target: 33,
      days,
      total,
      per: {
        subhanallah: Math.round(total * 0.4),
        alhamdulillah: Math.round(total * 0.35),
        allahuakbar: Math.round(total * 0.25)
      }
    }
  };
}

/* one group, inside headless Edge */
async function run(page) {
  const name = process.env.GS_GROUP,
    g = GROUPS[name];
  const dir = path.join(ROOT, 'docs', 'guide', 'shots', g.dir || name);
  fs.mkdirSync(dir, { recursive: true });
  const at = g.at ? new Date(g.at).getTime() : Date.now();
  const clock = g.at
    ? `(function(){var off=${at}-Date.now(),D=Date;function F(){return arguments.length?new(Function.prototype.bind.apply(D,[null].concat([].slice.call(arguments)))):new D(D.now()+off)}F.prototype=D.prototype;F.now=function(){return D.now()+off};F.UTC=D.UTC;F.parse=D.parse;Date=F;})();`
    : '';
  const seed = `localStorage.clear();localStorage.setItem('adhkar.v10',${JSON.stringify(JSON.stringify(sample(at, g)))});`;
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: clock + seed });
  if (g.desk) await page.size(1600, 1000, 1);
  else await page.size(360, 746, 2);
  await page.send('Page.navigate', { url: ORIGIN + (g.desk ? '?desk' : '') });
  await page.wait(3500);
  const shots = Array.isArray(g.shots) ? Object.fromEntries(g.shots.map((s) => [s, PHONE[s]])) : g.shots;
  /* GS_ONLY="answered,calendar" retakes only those */
  if (process.env.GS_ONLY) {
    const only = process.env.GS_ONLY.split(',');
    Object.keys(shots).forEach((k) => only.indexOf(k) < 0 && delete shots[k]);
  }
  /* start from Today so every page is reached the way a person reaches it */
  await page.eval("location.hash='#/';1");
  await page.wait(1200);
  for (const [shot, route] of Object.entries(shots)) {
    if (route === 'pal') {
      await page.eval("location.hash='#/';1");
      await page.wait(1200);
      await page.eval('Desk.palette();1');
      await page.wait(400);
      await page.eval(
        "(function(){var i=document.getElementById('pal-q');i.value='kursi';i.dispatchEvent(new Event('input',{bubbles:true}));return 1})()"
      );
      await page.wait(900);
    } else if (route.indexOf('rail:') === 0) {
      await page.eval(
        `[].slice.call(document.querySelectorAll('#rail a,#rail button')).filter(function(e){return e.textContent.indexOf(${JSON.stringify(route.slice(5))})>=0})[0].click();1`
      );
      await page.wait(1600);
    } else {
      const [hash, tap] = route.split('|');
      await page.eval(`location.hash=${JSON.stringify(hash)};1`);
      await page.wait(1500);
      if (tap) {
        await page.eval(`(function(){var b=document.querySelector(${JSON.stringify(tap)});if(b)b.click();return 1})()`);
        await page.wait(1100);
      }
    }
    if (shot === 'plan-fast') {
      await page.eval(
        '(function(){var b=document.querySelector(\'[data-a="cal-day"]:not(.past)\')||document.querySelector(\'[data-a="cal-day"]\');if(b)b.click();return 1})()'
      );
      await page.wait(900);
    }
    await page.eval('window.scrollTo(0,0);1');
    await page.wait(250);
    const r = await page.send('Page.captureScreenshot', { format: 'png' });
    const png = path.join(dir, shot + (g.suffix || '') + '.png');
    fs.writeFileSync(png, Buffer.from(r.result.data, 'base64'));
    if (route === 'pal') await page.eval('Desk.palette();1');
    console.log(name, shot);
  }
  if (page.errs.length) console.log('page errors:', page.errs.slice(0, 5).join(' | '));
}

if (process.env.GS_GROUP) module.exports = run;
else {
  /* the runner: each group in its own browser, then every PNG to WebP (phone shots cropped to 720 x 1491) */
  const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(GROUPS);
  /* headless Edge now and then stops answering mid-group: give each group six minutes, and one more try */
  for (const name of want) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        execFileSync(
          process.execPath,
          [path.join(__dirname, 'cdp.js'), __filename, path.join(ROOT, 'build', 'shots')],
          {
            stdio: 'inherit',
            timeout: 6 * 60 * 1000,
            killSignal: 'SIGKILL',
            env: Object.assign({}, process.env, { GS_GROUP: name, CDP_ORIGIN: ORIGIN })
          }
        );
        break;
      } catch (e) {
        console.log(name, 'stopped answering' + (attempt === 1 ? '; once more' : '; skipped'));
      }
    }
  }
  execFileSync(
    'python',
    [
      '-I',
      '-c',
      `
import glob, os
from PIL import Image
for f in glob.glob(${JSON.stringify(path.join(ROOT, 'docs', 'guide', 'shots').replace(/\\/g, '/'))} + '/*/*.png'):
    im = Image.open(f).convert('RGB')
    if im.width == 720: im = im.crop((0, 0, 720, 1491))
    im.save(f[:-4] + '.webp', quality=86, method=6)
    os.remove(f)
`
    ],
    { stdio: 'inherit' }
  );
}
