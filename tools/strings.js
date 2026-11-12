/* Lists every English interface string the app renders (all views, settings, onboarding), for translation.
   node tools/strings.js > out.json */
'use strict';
const path = require('path'),
  fs = require('fs');
const smoke = fs.readFileSync(path.join(__dirname, 'smoke.js'), 'utf8');
const bootSrc = smoke.slice(smoke.indexOf('function boot('), smoke.indexOf('function visit('));
const { JSDOM, VirtualConsole } = require(path.join(__dirname, '.node/node_modules/jsdom'));
const WEB = path.join(__dirname, '..', 'web');
const boot = new Function('JSDOM', 'VirtualConsole', 'fs', 'path', 'WEB', bootSrc + '\nreturn boot;')(
  JSDOM,
  VirtualConsole,
  fs,
  path,
  WEB
);
const env = boot('2026-11-02T09:00:00Z'),
  w = env.w,
  A = w.A,
  S = A.S;
Object.assign(S.profile, { onboarded: true, name: 'Test' });
S.loc = {
  name: 'London',
  country: 'United Kingdom',
  cc: 'GB',
  lat: 51.5,
  lng: -0.12,
  tz: 'Europe/London',
  src: 'city'
};
S.journal.items.push({ id: 'a', text: 'x', since: '2026-10-01' });
if (process.argv[2] === 'ar') {
  S.prefs.lang = 'ar';
  A.applyLang();
}
const seen = new Map();
function harvest(tag) {
  const walk = (n) => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) {
        const t = c.nodeValue.replace(/\s+/g, ' ').trim();
        if (t && /[A-Za-z]{2}/.test(t) && !/[\u0600-\u06FF]/.test(t)) seen.set(t, seen.get(t) || tag);
      } else if (c.nodeType === 1 && !c.matches('.rd-tr,.rd-en,.en,.ar,[lang=ar],.tr,script,style')) walk(c);
    }
  };
  if (tag === 'location') return;
  walk(w.document.body);
  w.document.querySelectorAll('[aria-label],[placeholder]').forEach((e) =>
    ['aria-label', 'placeholder'].forEach((a) => {
      const v = e.getAttribute(a);
      if (v && /[A-Za-z]{2}/.test(v)) seen.set(v, seen.get(v) || tag + '@' + a);
    })
  );
}
const routes = [
  '',
  'adhkar',
  'tracker',
  'salah',
  'profile',
  'insights',
  'calendar',
  'answered',
  'deeds',
  'ramadan',
  'qibla',
  'month',
  'night',
  'duha',
  'location',
  'search',
  'saved',
  'journal',
  'qada'
];
w.DATA.collections.forEach((c) => routes.push('c/' + c.id));
['appearance', 'reading', 'prayer', 'notifications', 'device', 'data', 'about'].forEach((s) =>
  routes.push('settings/' + s)
);
for (const r of routes) {
  w.location.hash = '#/' + r;
  try {
    A.render();
  } catch (e) {}
  harvest(r);
}
w.location.hash = '#/r/morning/0';
A.render();
setTimeout(() => {
  harvest('reader');
  console.log(JSON.stringify([...seen.keys()].sort(), null, 1));
  console.error('strings:', seen.size);
  process.exit(0);
}, 50);
