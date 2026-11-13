/* Interface smoke test: node tools/smoke.js
   Boots the real page in jsdom, opens every view (and each collection, reader, settings section and
   onboarding step), runs every view's mount, and fails on any thrown error or console.error.
   It also renders a Ramaḍān date and a non-Ramaḍān date and checks seasonal content follows the calendar. */
'use strict';
const path = require('path'),
  fs = require('fs');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, '.node/node_modules/jsdom'));
const ROOT = path.join(__dirname, '..'),
  WEB = path.join(ROOT, 'web');
let fail = 0,
  pass = 0;
const ok = (c, msg) => {
  if (c) pass++;
  else {
    fail++;
    console.log('FAIL', msg);
  }
};

function boot(nowISO, state) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('error', (...a) => errors.push(a.join(' ')));
  vc.on('jsdomError', (e) => errors.push(String((e && (e.stack || e.message)) || e)));
  const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8').replace(/<script src="[^"]+"><\/script>\n/g, '');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://appassets.androidplatform.net/index.html#/',
    virtualConsole: vc
  });
  const w = dom.window;
  const fixed = new Date(nowISO).getTime(),
    RealDate = w.Date;
  class FakeDate extends RealDate {
    constructor(...a) {
      if (a.length) super(...a);
      else super(fixed + (RealDate.now() - t0));
    }
    static now() {
      return fixed + (RealDate.now() - t0);
    }
  }
  const t0 = RealDate.now();
  w.Date = FakeDate;
  w.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {}
  });
  w.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  w.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.scrollTo = () => {};
  w.HTMLCanvasElement.prototype.getContext = () => null;
  if (state) w.localStorage.setItem('adhkar.v10', JSON.stringify(state));
  const order = [
    ...fs.readFileSync(path.join(WEB, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"><\/script>/g)
  ].map((m) => m[1]);
  for (const src of order) {
    try {
      w.eval(fs.readFileSync(path.join(WEB, src), 'utf8') + '\n//# sourceURL=' + src);
    } catch (e) {
      errors.push(src + ': ' + (e.stack || e));
    }
  }
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { w, errors };
}

function visit(env, hash) {
  const { w, errors } = env,
    before = errors.length;
  /* these tests often change the state directly; count that as a change, so a kept tab is never shown stale */
  try {
    w.A.rev++;
    w.location.hash = hash;
    w.A.render();
  } catch (e) {
    errors.push(hash + ': ' + (e.stack || e));
  }
  const html = w.document.getElementById('app').innerHTML;
  ok(
    errors.length === before,
    'no error on ' + hash + (errors.length > before ? '\n   ' + errors.slice(before).join('\n   ') : '')
  );
  ok(html.length > 200, 'content on ' + hash);
  /* accessibility: every control has a name a screen reader can say */
  const unnamed = [...w.document.querySelectorAll('#app button, #app a[href], #app [role="switch"]')].filter(
    (e) =>
      !e.textContent.trim() &&
      !e.getAttribute('aria-label') &&
      !e.getAttribute('title') &&
      !e.closest('[aria-hidden="true"]')
  );
  ok(
    !unnamed.length,
    'unnamed controls on ' +
      hash +
      ': ' +
      unnamed
        .slice(0, 3)
        .map((e) => e.outerHTML.slice(0, 120))
        .join(' | ')
  );
  return html;
}

const KEY = 'adhkar.v10';
const base = boot('2026-11-02T09:00:00Z');
ok(base.errors.length === 0, 'boot without errors' + (base.errors.length ? '\n   ' + base.errors.join('\n   ') : ''));
const A = base.w.A;
ok(typeof A.render === 'function', 'app booted');

/* a finished profile in London so every page has prayer times */
const S = A.S;
Object.assign(S.profile, { onboarded: true, name: 'Test' });
S.loc = {
  name: 'London',
  country: 'United Kingdom',
  cc: 'GB',
  lat: 51.5074,
  lng: -0.1278,
  tz: 'Europe/London',
  src: 'city'
};
const settled = JSON.parse(JSON.stringify(S));

const views = [
  'modesty',
  'journal',
  'qada',
  '',
  'adhkar',
  'tracker',
  'salah',
  'profile',
  'insights',
  'calendar',
  'print',
  'jumuah',
  'answered',
  'deeds',
  'ramadan',
  'qibla',
  'month',
  'night',
  'duha',
  'location',
  'search',
  'saved'
];
views.forEach((v) => visit(base, '#/' + v));
base.w.DATA.collections.forEach((c) => {
  visit(base, '#/c/' + c.id);
  visit(base, '#/r/' + c.id + '/0' + (c.perPrayer ? '/fajr' : ''));
});
['appearance', 'reading', 'prayer', 'notifications', 'device', 'data', 'about'].forEach((s) =>
  visit(base, '#/settings/' + s)
);

/* Phase 3 states: journal with entries, iqāmah and silence on, memorise at every level */
S.journal.items.push(
  { id: 'a', text: 'Guidance for my family', tag: 'Family', since: '2026-10-01' },
  { id: 'b', text: 'A cure', since: '2026-09-01', done: '2026-10-20' }
);
S.iqama.on = true;
S.silence.on = true;
['#/journal', '#/salah', '#/settings/prayer', '#/settings/notifications'].forEach((h) => visit(base, h));
ok(/Iqāmah/.test(visit(base, '#/salah')), 'iqāmah shown on the Ṣalāh rows');
ok(base.w.A.duaPick('2026-11-02').id === 'a', 'only open duʿāʾs are picked for nudges');
visit(base, '#/r/morning/3');
/* memorise lives behind a small button beside Save and Share; its levels appear once it is tapped */
ok(!base.w.document.querySelector('[data-a="memo"]'), 'memorise levels stay out of the way until asked for');
base.w.document.querySelector('[data-a="memo-open"]').click();
[1, 2, 3].forEach((lv) => {
  const b = base.w.document.querySelector('[data-a="memo"][data-v="' + lv + '"]');
  ok(!!b, 'memorise level ' + lv + ' button');
  if (b) {
    b.click();
    const hid = base.w.document.querySelectorAll('.rd-ar.memo .mw').length;
    ok(hid > 0, 'memorise level ' + lv + ' hides words (' + hid + ')');
  }
});

/* travel: 400 km from home shortens ẓuhr, ʿaṣr and ʿishāʾ */
S.travel.home = { name: 'Lagos', lat: 6.5244, lng: 3.3792 };
S.loc = { name: 'Abuja', country: 'Nigeria', cc: 'NG', lat: 9.0765, lng: 7.3986, tz: 'Africa/Lagos', src: 'city' };
ok(!!base.w.A.travelling(), 'travelling 500 km from home');
ok(/2 rakʿahs/.test(visit(base, '#/salah')), 'shortened prayers marked');
ok(/Travelling/.test(visit(base, '#/')), 'travel card on Today');
S.travel.home = { name: 'Abuja', lat: 9.0765, lng: 7.3986 };
ok(!base.w.A.travelling(), 'not travelling at home');
S.loc = {
  name: 'London',
  country: 'United Kingdom',
  cc: 'GB',
  lat: 51.5074,
  lng: -0.1278,
  tz: 'Europe/London',
  src: 'city'
};
S.travel.home = null;

/* cycle: the habit is learned, the start is predicted and prompted, never applied by itself */
S.profile.gender = 'f';
S.excused.cycles = [
  { from: '2026-07-10', to: '2026-07-16' },
  { from: '2026-08-07', to: '2026-08-13' },
  { from: '2026-09-04', to: '2026-09-10' },
  { from: '2026-10-03', to: '2026-10-09' }
];
let cyc = base.w.A.cycle();
ok(cyc.len === 7 && cyc.gap === 28 && cyc.learned, 'habit learned: ' + JSON.stringify(cyc));
ok(cyc.next === '2026-10-31' && cyc.due, 'next start predicted and due: ' + cyc.next);
ok(/Your days may/.test(visit(base, '#/')), 'gentle prompt on Today');
ok(!S.excused.on, 'break never starts by itself');
ok(/usual days/.test(visit(base, '#/profile')), 'cycle card shows the habit');
S.excused.on = true;
S.excused.since = '2026-10-27';
ok(base.w.A.cycle().usualDone && /signs of purity/.test(visit(base, '#/')), 'purity prompt at the usual length');
S.excused.on = false;
S.excused.since = null;
S.excused.cycles = [];
S.profile.gender = '';

/* every setting survives a restart (the loader keeps only keys it knows) */
Object.assign(S.prefs, { lang: 'ar' });
S.notif.morning.from = 'sunrise';
S.notif.evening.from = 'maghrib';
S.excused.habit = { len: 6, gap: 27 };
S.excused.remind = true;
S.excused.snooze = '2026-11-01';
S.travel.km = 95;
S.iqama.on = true;
S.silence.on = true;
S.journal.nudge.adhan = 'maghrib';
const again = boot('2026-11-02T09:00:00Z', JSON.parse(JSON.stringify(S))).w.A.S;
ok(
  again.prefs.lang === 'ar' && again.notif.morning.from === 'sunrise' && again.notif.evening.from === 'maghrib',
  'language and adhkār windows persist'
);
ok(
  again.excused.habit &&
    again.excused.habit.gap === 27 &&
    again.excused.remind === true &&
    again.excused.snooze === '2026-11-01',
  'cycle settings persist'
);
ok(
  again.travel.km === 95 && again.iqama.on && again.silence.on && again.journal.nudge.adhan === 'maghrib',
  'travel, iqāmah, silence and nudges persist'
);
S.prefs.lang = 'en';
S.notif.morning.from = 'fajr';
S.notif.evening.from = 'asr';
S.excused.habit = null;
S.excused.remind = false;

/* every hadith on the content pages is shown verbatim (Arabic and the sunnah.com translation) */
const HD = base.w.HADITH;
base.w.A.DEEDS.forEach((d) => {
  const k = d.refs[0].u.replace('https://sunnah.com/', '');
  ok(HD[k] && HD[k].ar && HD[k].en, 'verbatim hadith for deed ' + d.id + ' (' + k + ')');
});
[
  'bukhari:1145',
  'abudawud:521',
  'tirmidhi:3499',
  'abudawud:1048',
  'tirmidhi:3585',
  'muslim:482',
  'muslim:2732',
  'abudawud:1536',
  'bukhari:1154',
  'abudawud:2540',
  'bukhari:990',
  'muslim:720',
  'muslim:748',
  'bukhari:1147',
  'abudawud:1502'
].forEach((k) => ok(HD[k], 'verbatim hadith ' + k));
ok(!/كَرِيمٌ/.test(HD['tirmidhi:3513'].ar), 'Laylat al-Qadr duʿāʾ without the unestablished addition');

/* nifās: kept out of the monthly habit, prompts at forty days */
S.profile.gender = 'f';
S.excused.cycles = [
  { from: '2026-08-07', to: '2026-08-13' },
  { from: '2026-09-04', to: '2026-09-10' }
];
S.excused.on = true;
S.excused.kind = 'nifas';
S.excused.since = '2026-09-20';
ok(base.w.A.cycle().nifas && base.w.A.cycle().usualDone, 'nifās counted to forty days');
ok(/Forty days have passed/.test(visit(base, '#/')), 'forty-day prompt on Today');
base.w.A.setExcused(false);
ok(S.excused.cycles.length === 2 && S.excused.nifas.length === 1, 'nifās not added to the cycle history');
S.excused.cycles = [];
S.excused.nifas = [];
S.profile.gender = '';
ok(/Not perfumed/.test(visit(base, '#/modesty')), 'dress guide renders');

/* a prayer cannot be logged before its time; the last third is shown as a span */
{
  const A2 = base.w.A,
    k = A2.today(),
    t = A2.pday(k),
    now = base.w.Date.now();
  const future = A2.PRAYERS.filter((p) => t[p] > now)[0],
    past = A2.PRAYERS.filter((p) => t[p] <= now).slice(-1)[0];
  if (future) ok(!A2.canLog(k, future), 'cannot log ' + future + ' before its time');
  if (past) ok(A2.canLog(k, past), 'can log ' + past + ' after its time');
  ok(!A2.canLog(A2.shift(k, 1), 'fajr'), 'cannot log tomorrow');
  ok(
    /→/.test(visit(base, '#/night')) && /At its start/.test(visit(base, '#/night')),
    'last third shown as a span with wake choices'
  );
  S.notif.night.off = 60;
  ok(
    A2.thirdWake(t) <= t.nextFajr - 15 * 60000 && A2.thirdWake(t) >= t.lastThird,
    'wake time stays inside the last third'
  );
  S.notif.night.off = 0;
}

const fresh = boot('2026-11-02T09:00:00Z');
for (let i = 0; i < 6; i++) {
  const h = visit(fresh, '#/welcome');
  ok(/class="ob/.test(h), 'onboarding step ' + i);
  const nx = fresh.w.document.querySelector('[data-a="ob-next"]');
  if (!nx) break;
  try {
    nx.click();
  } catch (e) {
    fresh.errors.push(String(e));
  }
}

/* seasonal content follows the calendar */
const out = boot('2026-11-02T09:00:00Z', settled);
const today = visit(out, '#/');
ok(!/Ramaḍān Mubārak/.test(today), 'no Ramaḍān greeting outside Ramaḍān');
ok(out.w.document.documentElement.dataset.season !== 'ramadan', 'no Ramaḍān season outside Ramaḍān');
const ram = boot('2027-02-20T09:00:00Z', settled);
const rt = visit(ram, '#/');
ok(ram.w.A.hijri(ram.w.A.today()).m === 9, 'fixture date is in Ramaḍān');
ok(/Ramaḍān Mubārak/.test(rt), 'Ramaḍān greeting in Ramaḍān');

/* the ṣalāh guide: every prayer has the right shape */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    A = env.w.A;
  const shape = (p, o) => {
    const s = A.salahPlan(Object.assign({ p, imam: false, short: false, g: 'm' }, o || {}));
    return {
      s,
      rak: Math.max(...s.map((x) => x.r)),
      t1: s.filter((x) => x.k === 'tash').length,
      fin: s.filter((x) => x.k === 'final').length,
      ruku: s.filter((x) => x.k === 'ruku').length,
      sujud: s.filter((x) => x.k === 'sujud').length
    };
  };
  [
    ['fajr', 2, 0],
    ['dhuhr', 4, 1],
    ['asr', 4, 1],
    ['maghrib', 3, 1],
    ['isha', 4, 1],
    ['witr', 1, 0],
    ['nafl', 2, 0],
    ['jumuah', 2, 0]
  ].forEach(([p, n, t1]) => {
    const x = shape(p);
    ok(
      x.rak === n && x.ruku === n && x.sujud === 2 * n && x.t1 === t1 && x.fin === 1,
      p + ': ' + n + ' rakʿahs, ' + t1 + ' first tashahhud, one final'
    );
  });
  ok(
    shape('dhuhr', { short: true }).rak === 2 &&
      shape('maghrib', { short: true }).rak === 3 &&
      shape('fajr', { short: true }).rak === 2,
    'travel shortens only the four-rakʿah prayers'
  );
  const f = shape('fajr').s,
    d = shape('dhuhr').s;
  ok(
    f.filter((x) => x.k === 'stand').every((x) => x.voice === 'aloud') &&
      d.filter((x) => x.k === 'stand').every((x) => x.voice === 'quiet'),
    'recitation aloud in Fajr, quiet in Dhuhr'
  );
  ok(
    shape('isha')
      .s.filter((x) => x.k === 'stand')
      .map((x) => x.voice)
      .join() === 'aloud,aloud,quiet,quiet',
    'ʿIshāʾ: aloud in the first two rakʿahs only'
  );
  ok(
    shape('maghrib', { imam: true })
      .s.filter((x) => x.k === 'rise')
      .every((x) => x.say.length === 1 && x.say[0][0] === 'p-rabbana'),
    'behind an imam, only Rabbanā wa lakal-ḥamd on rising'
  );
  ok(
    shape('dhuhr')
      .s.find((x) => x.k === 'final')
      .acts.some((a) => /tawarruk/.test(a[1])) &&
      shape('fajr')
        .s.find((x) => x.k === 'final')
        .acts.every((a) => !/tawarruk/.test(a[1])),
    'tawarruk only in prayers with two tashahhuds'
  );
  const ids = new Set();
  [].concat(...['fajr', 'dhuhr', 'maghrib', 'witr'].map((p) => shape(p).s)).forEach((x) =>
    (x.say || []).forEach((y) => {
      ids.add(y[0]);
      (y[2] || []).forEach((z) => ids.add(z));
    })
  );
  ok(
    [...ids].every((id) => (id === 'say:taslim' ? !!env.w.HADITH['say:taslim'] : !!env.w.DATA.items[id])),
    'every word in the guide comes from the verified data'
  );
  const keys = new Set();
  []
    .concat(...['fajr', 'dhuhr', 'maghrib'].map((p) => shape(p, { imam: true }).s))
    .forEach((x) => (x.acts || []).forEach((a) => a[2] && keys.add(a[2])));
  ok(
    [...keys].every((k) => !!env.w.HADITH[k]),
    'every evidence link has its verbatim hadith'
  );
  /* the player walks from the takbīr to the salām */
  visit(env, '#/learn');
  const p = visit(env, '#/learn/maghrib');
  ok(/Opening takbīr/.test(p), 'player opens on the opening takbīr');
  const steps = shape('maghrib').s.length;
  for (let i = 0; i < steps; i++) A.acts['lp-next']();
  ok(
    /Maghrib is complete/.test(env.w.document.getElementById('lpB').innerHTML) && A.S.learn.done.maghrib,
    'player reaches the end and remembers it'
  );
  ok(!env.errors.length, 'guide runs without errors ' + env.errors.join(' | '));
}

/* a damaged backup or store can not break the app */
{
  const bad = JSON.parse(JSON.stringify(settled));
  bad.profile = null;
  bad.saved = {};
  bad.loc = 'Paris';
  bad.prefs.nudge = null;
  bad.tasbih.log = 'x';
  bad.calc.adj = [];
  const env = boot('2026-11-02T09:00:00Z', bad),
    S = env.w.A.S;
  ok(
    S.profile &&
      typeof S.profile.name === 'string' &&
      Array.isArray(S.saved) &&
      S.loc === null &&
      S.prefs.nudge &&
      Array.isArray(S.tasbih.log) &&
      !Array.isArray(S.calc.adj),
    'merge keeps only values of the right shape'
  );
  env.w.A.S.profile.onboarded = true;
  visit(env, '#/');
  visit(env, '#/salah');
  ok(!env.errors.length, 'boots cleanly from a damaged store ' + env.errors.join(' | '));
}

/* high latitude with no adjustment: times stay real numbers, pages open */
{
  const st = JSON.parse(JSON.stringify(settled));
  st.loc = { name: 'London', lat: 51.5074, lng: -0.1278, tz: 'Europe/London', cc: 'GB' };
  st.calc.highLat = 'none';
  st.calc.auto = false;
  const env = boot('2026-06-21T12:00:00Z', st),
    A = env.w.A,
    t = A.pday(A.today());
  ok(isFinite(t.fajr) && isFinite(t.isha), 'high latitudes: fajr and ʿishāʾ always have a time');
  ['#/', '#/salah', '#/night'].forEach((h) => visit(env, h));
  ok(
    !env.errors.length && !/could not open/.test(env.w.document.body.innerHTML),
    'high latitudes: pages open ' + env.errors.join(' | ')
  );
}

/* search: phrases, exclusions, Arabic without ḥarakāt, app pages and settings */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    A = env.w.A;
  visit(env, '#/');
  const top = (q) => {
    const r = A.searchAll(q).list;
    return r.length ? r[0].d : null;
  };
  ok(
    A.searchAll('"seek refuge"').list.every((x) => x.d.f.some((f) => f.n.indexOf('seek refuge') >= 0)),
    'an exact phrase matches only that phrase'
  );
  ok(
    A.searchAll('sleep -quran').list.every((x) => !x.d.f.some((f) => f.n.indexOf('quran') >= 0)),
    'an excluded word leaves those results out'
  );
  ok(top('رب اغفر') && top('رب اغفر').k === 'dhikr', 'Arabic without ḥarakāt finds the dhikr');
  ok(top('qibla') && top('qibla').t === 'Qibla', 'a page is found by name');
  ok(
    top('tashahud') && A.searchAll('tashahud').list.some((x) => x.d.t === 'At-Taḥiyyāt'),
    'a near spelling still matches'
  );
  ok(
    A.searchAll('adhan sound').list.some((x) => x.d.t === 'Adhān at prayer time'),
    'settings are searchable'
  );
  ok(!A.searchAll('zzqqxx').list.length, 'nonsense finds nothing');
  ok(
    ['anxiety', 'worry', 'anger'].every((q) =>
      A.searchAll(q).list.some((x) => x.d.k === 'dhikr' && /h-/.test(x.d.it.uid))
    ),
    'feelings find the duʿāʾs for worry, distress and anger'
  );
  const html = visit(env, '#/search');
  ok(/Exact phrase/.test(html), 'search opens with its tips');
  ok(!env.errors.length, 'search runs without errors ' + env.errors.join(' | '));
}

/* main tabs stay alive: coming back reuses the page unless something was saved, and returns to where you were */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    A = env.w.A,
    S = A.S,
    doc = env.w.document,
    go = (h) => {
      env.w.location.hash = h;
      A.render();
    };
  go('#/');
  const first = doc.querySelector('#app .view');
  first.setAttribute('data-probe', '1');
  go('#/adhkar');
  ok(!doc.querySelector('[data-probe]') && A.keptTabs().indexOf('today/') >= 0, 'leaving a main tab keeps its page');
  go('#/');
  ok(doc.querySelector('#app .view') === first, 'coming back reuses the same page');
  go('#/adhkar');
  S.profile.name = 'Probe';
  A.save();
  go('#/');
  ok(
    doc.querySelector('#app .view') !== first && /Probe/.test(doc.querySelector('#app').textContent),
    'a saved change rebuilds the page'
  );
  go('#/tracker');
  const t1 = doc.querySelector('#app .view');
  go('#/salah');
  go('#/tracker');
  ok(doc.querySelector('#app .view') !== t1, 'the Tracker is always rebuilt');
  go('#/salah');
  go('#/qibla');
  go('#/salah');
  ok(
    !!doc.querySelector('#app .view') && !env.errors.length,
    'kept tabs survive a visit to a sub-page ' + env.errors.join(' | ')
  );
  A.rerender();
  ok(A.keptTabs().indexOf('salah/') < 0, 'the page on screen is not also held as a kept copy');
  doc.documentElement.classList.add('rest');
  go('#/');
  ok(!doc.documentElement.classList.contains('rest'), 'ambient motion wakes when a page appears');
}

/* the first week: no walls of noughts; empty rows carry no dead buttons; the timetable keeps its headings */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    A = env.w.A,
    S = A.S,
    doc = env.w.document;
  S.counts = {};
  S.tasbih.total = 0;
  S.tasbih.days = {};
  S.prayed = {};
  S.done = {};
  visit(env, '#/profile');
  ok(
    !!doc.querySelector('.first-week') && !doc.querySelector('.stat .v'),
    'a new profile shows one welcome card instead of zero tiles'
  );
  S.prayed[A.today()] = { fajr: Date.now() };
  visit(env, '#/profile');
  ok(
    !doc.querySelector('.first-week') && doc.querySelectorAll('.stat.zero .hint').length > 0,
    'once something is logged, zero figures say how they begin'
  );
  visit(env, '#/');
  ok(
    !/\b0 day streak/.test(doc.querySelector('.sky .meta, .meta').textContent),
    'Today does not report a streak of nothing'
  );
  S.qada = { fajr: 2, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, made: 0 };
  visit(env, '#/qada');
  ok(doc.querySelectorAll('[data-a="qd-pray"]').length === 1, 'only a prayer that is owed offers "Prayed"');
  visit(env, '#/month');
  ok(!!doc.querySelector('.mt-card thead th'), 'the timetable has a heading row to keep in view');
}

/* second wave: one lead on Today, a predictable tab highlight, grouped times, folded hadith, even rows */
{
  const env = boot('2026-11-02T13:30:00Z', settled),
    A = env.w.A,
    S = A.S,
    doc = env.w.document;
  visit(env, '#/');
  ok(!!doc.querySelector('.focus'), 'Today always leads with what is due now or what opens next');
  visit(env, '#/salah');
  visit(env, '#/journal');
  ok(
    doc.querySelector('#nav a[aria-current]').getAttribute('data-tab') === 'salah',
    'a sub-page keeps the tab you came from lit'
  );
  visit(env, '#/');
  visit(env, '#/journal');
  ok(
    doc.querySelector('#nav a[aria-current]').getAttribute('data-tab') === 'today',
    'the same sub-page reached from Today lights Today'
  );
  visit(env, '#/answered');
  const titles = [...doc.querySelectorAll('.li .t')].map((e) => e.textContent.replace(/ · .*/, ''));
  ok(titles.length > 0 && new Set(titles).size === titles.length, 'each kind of answered time is listed once');
  visit(env, '#/deeds');
  ok(
    doc.querySelectorAll('.deed-r').length > 5 && doc.querySelectorAll('details.more').length > 5,
    'each deed shows its reward in a line, with the hadith folded'
  );
  visit(env, '#/adhkar');
  const rows = [...doc.querySelectorAll('.coll')];
  ok(
    rows.length > 3 && rows.every((r) => r.lastElementChild.classList.contains('faint')),
    'every collection row ends the same way'
  );
  visit(env, '#/ramadan');
  ok(
    !/Mubārak/.test(doc.querySelector('h1').textContent) || A.ramadanInfo().on,
    'Ramaḍān is greeted with Mubārak only once it begins'
  );
}

/* back stays inside the app except on Today; the gesture preview never leaves a page displaced */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    A = env.w.A,
    doc = env.w.document,
    calls = [];
  const call = A.N.call;
  A.N.call = function (fn, v) {
    if (fn === 'setCanBack') calls.push(v);
    return call.apply(this, arguments);
  };
  visit(env, '#/salah');
  visit(env, '#/');
  const before = calls.length;
  visit(env, '#/qibla');
  ok(
    calls[calls.length - 1] === true && calls.length > before,
    'leaving Today tells Android that back stays in the app'
  );
  visit(env, '#/');
  ok(calls[calls.length - 1] === false, 'on Today, back is left to Android');
  const sh = A.sheet('Test', '<p>x</p>');
  ok(calls[calls.length - 1] === true, 'an open sheet takes the back gesture');
  sh.close(true);
  ok(calls[calls.length - 1] === false, 'closing it hands back to Android');
  visit(env, '#/salah');
  const v = doc.querySelector('#app .view');
  env.w.__native.onBackStart(0);
  env.w.__native.onBackProgress(0.6);
  ok(/scale/.test(v.style.transform), 'the page leans away while the gesture is held');
  env.w.__native.onBackCancel();
  ok(v.style.transform === '', 'cancelling the gesture puts the page back');
  A.N.call = call;
}

/* the card that opens a collection is found on the way in, and found again on the way back */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    A = env.w.A,
    doc = env.w.document;
  visit(env, '#/adhkar');
  ok(!!doc.querySelector('.view a[href="#/c/morning"]'), 'the Adhkār page has a card for each collection to grow from');
  visit(env, '#/c/morning');
  ok(!!doc.querySelector('.view .chead'), 'each collection has a header for the card to grow into');
}

/* accessibility: nothing tappable is a bare div; every control has a name a screen reader can say */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    doc = env.w.document;
  const routes = [
    '#/',
    '#/adhkar',
    '#/tracker',
    '#/salah',
    '#/profile',
    '#/c/morning',
    '#/learn',
    '#/journal',
    '#/answered',
    '#/deeds',
    '#/calendar',
    '#/qibla',
    '#/night',
    '#/duha',
    '#/qada',
    '#/insights',
    '#/settings/appearance'
  ];
  const bad = [];
  routes.forEach((h) => {
    visit(env, h);
    doc.querySelectorAll('#app div[data-a]:not([role="button"])').forEach((e) => bad.push(h + ' ' + e.className));
  });
  ok(!bad.length, 'every tappable element is a button or says it is one ' + bad.join(' | '));
  ok(
    !doc.getElementById('app').hasAttribute('tabindex'),
    'the page is not one focusable block (TalkBack would read it as a single item)'
  );
  visit(env, '#/tracker');
  const pb = doc.querySelector('.trk-pace .pace');
  env.w.A.acts['pace-tap'](pb);
  let t0 = env.w.Date.now();
  while (env.w.Date.now() - t0 < 300) {}
  env.w.A.acts['pace-tap'](pb);
  ok(/2/.test(pb.querySelector('[data-say]').textContent), 'the counting circle tells a screen reader each count');
  env.w.A.pace.stop();
  visit(env, '#/learn/fajr');
  ok(
    doc.getElementById('nav').getAttribute('aria-hidden') === 'true',
    'a hidden bottom bar is hidden from screen readers too'
  );
  visit(env, '#/');
  const sh = env.w.A.sheet('Test', '<p>x</p>');
  ok(doc.getElementById('app').inert === true, 'behind a sheet, the page cannot be reached by a screen reader');
  sh.close(true);
  ok(!doc.getElementById('app').inert, 'and comes back when it closes');
}

/* every message the app can show has its Arabic */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    A = env.w.A;
  A.S.prefs.lang = 'ar';
  const all = new Set();
  for (const f of fs.readdirSync(path.join(WEB, 'js'))) {
    const s = fs.readFileSync(path.join(WEB, 'js', f), 'utf8');
    for (const m of s.matchAll(/A\.toast\('((?:[^'\\]|\\.)+)'\s*[,)]/g)) all.add(m[1]);
  }
  const miss = [...all].filter((t) => !A.toAr(t));
  ok(all.size > 20 && !miss.length, 'every message has Arabic ' + miss.join(' | '));
}

/* counting on the fingers: the pace never counts for you; your confirmation records the whole count */
{
  const env = boot('2026-11-02T07:30:00Z', settled),
    A = env.w.A,
    S = A.S,
    doc = env.w.document;
  ok(S.prefs.count === 'fingers' && A.pace.on(), 'finger counting is the default');
  const kursi = env.w.DATA.items.kursi,
    sub = env.w.DATA.items['t-subhan'];
  ok(
    A.pace.rep(kursi) > A.pace.rep(sub) && A.pace.rep(sub) >= 650 && A.pace.rep(kursi) < 60000,
    'each recitation is paced by its own length'
  );
  S.prefs.pace = 'calm';
  const calm = A.pace.rep(kursi);
  S.prefs.pace = 'brisk';
  ok(calm > A.pace.rep(kursi), 'a calmer pace takes longer');
  S.prefs.pace = 'steady';
  visit(env, '#/r/morning/0');
  const items = A.items('morning'),
    it0 = items[0],
    pb = doc.querySelector('#rdD .pace');
  ok(!!pb && !doc.querySelector('#rdD .counter:not(.pace)'), 'the reader shows the pace circle, not a tap counter');
  A.acts['pace-tap'](pb);
  ok(pb.dataset.state === 'run' && A.cnt(A.today(), 'morning', it0.id) === 0, 'starting the pace counts nothing');
  /* a tap moves on a count: tap through every count and it asks to confirm */
  for (let i = 0; i < (it0.target || 1); i++) A.acts['pace-tap'](pb);
  ok(
    pb.dataset.state === 'confirm' && A.cnt(A.today(), 'morning', it0.id) === 0,
    'each tap moves on a count; the last one asks to confirm'
  );
  A.acts['pace-tap'](pb);
  ok(A.cnt(A.today(), 'morning', it0.id) === (it0.target || 1), 'confirming records the full count');
  /* a repeated dhikr: taps quicker than the pace teach it your speed */
  const thrice = items.find((x) => x.target === 3),
    ti = items.indexOf(thrice);
  if (thrice) {
    visit(env, '#/r/morning/' + ti);
    const b2 = doc.querySelector('#rdD .pace');
    A.acts['pace-tap'](b2);
    const t0 = env.w.Date.now();
    while (env.w.Date.now() - t0 < 320) {}
    A.acts['pace-tap'](b2);
    const t1 = env.w.Date.now();
    while (env.w.Date.now() - t1 < 320) {}
    A.acts['pace-tap'](b2);
    A.acts['pace-tap'](b2);
    A.acts['pace-tap'](b2);
    ok(
      S.paceMs[thrice.uid] > 0 && S.paceMs[thrice.uid] < A.pace.rep({ lt: thrice.lt, ar: thrice.ar }) + 1,
      'your own pace is learnt for that dhikr'
    );
  }
  /* tapping quickens the pace; after a pause it resumes at the normal pace */
  {
    visit(env, '#/tracker');
    const b3 = doc.querySelector('.trk-pace .pace');
    A.acts['pace-tap'](b3);
    const sp0 = A.pace.speed();
    let t2 = env.w.Date.now();
    while (env.w.Date.now() - t2 < 300) {}
    A.acts['pace-tap'](b3);
    const quick = A.pace.speed().ms;
    A.pace.hold(b3);
    ok(b3.dataset.state === 'paused', 'a hold pauses');
    A.pace.hold(b3);
    ok(
      b3.dataset.state === 'run' && quick < sp0.base && A.pace.speed().ms === sp0.base,
      'resuming returns to the normal pace'
    );
    A.pace.stop();
  }
  /* the counting tour: each step waits for you */
  {
    visit(env, '#/counting');
    const ct = doc.querySelector('.ct');
    ok(!!ct && ct.dataset.k === 'hand', 'the counting tour opens on the right hand');
    ct.querySelector('[data-ct-go]').click();
    const tb = ct.querySelector('.ct-circ .pace');
    A.acts['pace-tap'](tb);
    ok(tb.dataset.state === 'run', 'the tour uses the real circle');
    let t3 = env.w.Date.now();
    while (env.w.Date.now() - t3 < 300) {}
    A.acts['pace-tap'](tb);
    t3 = env.w.Date.now();
    while (env.w.Date.now() - t3 < 300) {}
    A.acts['pace-tap'](tb);
    ok(A.pace.speed().ms < 1700, 'tapping in the tour quickens it');
    A.pace.hold(tb);
    A.pace.hold(tb);
    ok(A.pace.speed().ms === 1700, 'and a pause brings it back to normal');
    A.pace.stop();
  }
  ok(!env.errors.length, 'finger counting runs without errors ' + env.errors.join(' | '));
}

/* the Tracker: each phrase has its own Sunnah number; the day total is only a figure */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    A = env.w.A,
    S = A.S,
    doc = env.w.document;
  S.tasbih.cur = 'astaghfirullah';
  S.tasbih.target = 100;
  visit(env, '#/tracker');
  ok(
    /100/.test(doc.querySelector('.trk-sn').textContent) && !!doc.querySelector('[data-a="trk-why"]'),
    'istighfār shows its Sunnah number and evidence'
  );
  const pb = doc.querySelector('.trk-pace .pace');
  pb.dataset.state = 'confirm';
  A.acts['pace-tap'](pb);
  ok(
    (S.tasbih.pd[A.today()] || {}).astaghfirullah === 100 && S.tasbih.days[A.today()] >= 100,
    'a confirmed round is logged to that phrase and the day'
  );
  visit(env, '#/tracker');
  ok(
    !!doc.querySelector('.trk-goal.met[data-id="astaghfirullah"]') &&
      !doc.querySelector('.trk-goal.met[data-id="subhanallah"]'),
    'each Sunnah count is met on its own'
  );
  S.tasbih.cur = 'hawqala';
  visit(env, '#/tracker');
  ok(/No set number/.test(doc.querySelector('.trk-sn').textContent), 'a phrase without a Sunnah number has no goal');
  ok(!env.errors.length, 'tracker runs without errors ' + env.errors.join(' | '));
}

/* test yourself: answers move mastery, a wrong answer sends a question back */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    A = env.w.A,
    S = A.S,
    doc = env.w.document;
  visit(env, '#/learn');
  ok(/Test yourself/.test(doc.body.textContent) && A.quizMastery('sahw') === 0, 'mastery starts at zero');
  A.quizStart('sahw');
  let html = visit(env, '#/learn/quiz/sahw');
  ok(doc.querySelectorAll('.qz-opt').length === 4, 'a question shows four options');
  const right = doc.querySelector('.qz-opt[data-o="0"]');
  A.acts['qz-pick'](right);
  ok(A.quizMastery('sahw') > 0 && !!doc.querySelector('.qz-why.ok'), 'a right answer raises mastery and explains why');
  A.acts['qz-next']();
  const wrong = doc.querySelector('.qz-opt[data-o="1"]');
  A.acts['qz-pick'](wrong);
  ok(!!doc.querySelector('.qz-why.no') && !!doc.querySelector('.qz-opt.right'), 'a wrong answer shows the right one');
  for (let i = 0; i < 10; i++) {
    const o = doc.querySelector('.qz-opt[data-o="0"]');
    if (o && !o.disabled) A.acts['qz-pick'](o);
    const n = doc.querySelector('[data-a="qz-next"]');
    if (n) A.acts['qz-next']();
  }
  ok(!!doc.querySelector('.qz-res'), 'a round ends with its result');
  ok(Object.keys(S.learn.quiz).length >= 8, 'every answered question is remembered');
  const stv = A.quizStats();
  ok(
    stv.seen >= 8 && stv.wrong >= 1 && stv.review >= 1 && stv.acc > 0 && stv.acc < 1,
    'the dashboard counts answers, accuracy and what to review'
  );
  visit(env, '#/learn');
  ok(
    !!doc.querySelector('.qz-dash .qz-kpis') && !!doc.querySelector('[data-t="review"]'),
    'Learn the prayer shows the dashboard and a review round'
  );
  A.quizStart('review');
  visit(env, '#/learn/quiz/review');
  ok(doc.querySelectorAll('.qz-opt').length === 4, 'a review round asks the questions you missed');
  ok(!env.errors.length, 'quiz runs without errors ' + env.errors.join(' | '));
}

/* adhkār in their time; verse numbers in every Qurʾān transliteration */
{
  const env = boot('2026-11-02T09:00:00Z', settled),
    A = env.w.A,
    D = env.w.DATA;
  const t = A.pday(A.today());
  ok(
    A.timeNote('salah', 'maghrib').indexOf('begins at') > 0 && A.timeNote('salah', 'fajr') === '',
    'a prayer not yet begun is noted; a past one is not'
  );
  ok(
    /It is evening|begin at/.test(A.timeNote('evening', null)) || A.sessionNow() === 'evening',
    'the evening adhkār are noted before ʿAṣr'
  );
  ok(
    ['ikhlas', 'falaq', 'nas', 'z-quls', 'p-fatiha', 'z-baqarah', 'w-imran'].every((k) =>
      /\(1\)|\(285\)|\(190\)/.test(D.items[k].tr)
    ),
    'Qurʾān transliterations are numbered by āyah'
  );
  ok(D.items['w-imran'].tr.split('\n').length === 11, 'Āl ʿImrān 190–200 is transliterated in full');
  ok(
    Object.values(D.items).every((i) => i.lt > 0),
    'every dhikr has its length'
  );
  ok(
    D.items.kursi.rd > 40 &&
      A.pace.rep(Object.assign({ rd: D.items.kursi.rd }, D.items.kursi)) >= D.items.kursi.rd * 1000 * 0.7,
    'a recorded passage is paced against its recording'
  );
  const tx = A.txSections(D.items['z-quls']);
  ok(
    (tx.match(/class="ln v"/g) || []).length === 30 && (tx.match(/bsm-l/g) || []).length === 6,
    'āyah lines and basmalah dividers render as their own rows'
  );
  ok(
    D.items['z-quls'].en.split(String.fromCharCode(10)).filter((l) => /^In the Name of Allah/.test(l)).length === 3,
    'each of the three Quls opens with its basmalah in the translation'
  );
}

/* Jumuʿah: from Maghrib on Thursday to Maghrib on Friday, with its prayer, its hours and al-Kahf on its pages */
{
  const fri = boot('2026-11-13T10:00:00Z', settled),
    A = fri.w.A,
    f = A.jumuah(),
    root = fri.w.document.documentElement;
  ok(f.on && f.phase === 'day' && f.key === '2026-11-13', 'Friday morning is Jumuʿah, by day');
  const today = visit(fri, '#/');
  ok(root.hasAttribute('data-friday') && /fr-hero/.test(today), 'Friday dresses the app and leads Today with its card');
  ok(!/seek the hour of response before Maghrib/.test(today),'the Friday occasion line steps aside for the card');
  ok(/Jumuʿah/.test(visit(fri, '#/salah')) && !/>Dhuhr</.test(visit(fri, '#/salah')), 'on Friday the Dhuhr row is Jumuʿah for a brother');
  const jp = visit(fri, '#/jumuah');
  ok(/Ṣalāt al-Jumuʿah/.test(jp) && /fr-hr mb/.test(jp) && /fr-hr ls/.test(jp), 'the Jumuʿah page shows the prayer and the two hours');
  ok(!/If you attend the masjid/.test(jp), 'a brother sees every Sunnah of attending as his');
  const kh = visit(fri, '#/kahf');
  ok((kh.match(/class="kf-page"/g) || []).length === 12, 'al-Kahf opens on its twelve Madani pages');
  ok(new Set((kh.match(/kf-w end" data-v="(\d+)"/g) || []).map((x) => x.match(/\d+/)[0])).size === 110, 'every verse end of al-Kahf is on the pages');
  A.S.profile.gender = 'f';
  const sp = visit(fri, '#/jumuah');
  ok(/Jumuʿah or Ẓuhr/.test(sp) && /If you attend the masjid/.test(sp), 'a sister sees Jumuʿah or Ẓuhr, and the Sunnahs of attending as optional');
  ok(/Jumuʿah or Ẓuhr/.test(visit(fri, '#/salah')), 'a sister’s Ṣalāh list names Jumuʿah or Ẓuhr');
  A.S.excused.on = true;
  ok(/On a break from ṣalāh/.test(visit(fri, '#/jumuah')) && !/data-a="fr-prayed"/.test(visit(fri, '#/jumuah')), 'on a break, the Friday prayer is not asked of her');
  A.S.excused.on = false;
  A.S.profile.gender = '';
  ok(!fri.errors.length, 'Friday pages open cleanly ' + fri.errors.join(' | '));

  const last = boot('2026-11-13T15:40:00Z', settled);
  ok(last.w.A.jumuah().now === 'last', 'the last hour before Maghrib is lit as the hour of response');
  const thu = boot('2026-11-12T18:00:00Z', settled);
  ok(thu.w.A.jumuah().on && thu.w.A.jumuah().phase === 'night' && thu.w.A.jumuah().key === '2026-11-13', 'Thursday after Maghrib is the night of Jumuʿah');
  const wed = boot('2026-11-11T12:00:00Z', settled);
  visit(wed, '#/');
  ok(!wed.w.A.jumuah().on && !wed.w.document.documentElement.hasAttribute('data-friday'), 'a Wednesday is an ordinary day');
  const after = boot('2026-11-13T17:30:00Z', settled);
  ok(!after.w.A.jumuah().on, 'Jumuʿah ends at Maghrib on Friday');
}

/* fasting looks only backwards: a day that has not come can be planned, never logged */
{
  const env = boot('2026-11-13T10:00:00Z', settled),
    A = env.w.A,
    d = env.w.document;
  visit(env, '#/calendar');
  const btn = d.createElement('button');
  btn.dataset.k = '2026-11-16';
  A.acts['cal-day'](btn);
  const sh = [...d.querySelectorAll('.sheet')].pop();
  ok(sh && /Plan a fast/.test(sh.innerHTML) && !sh.querySelector('[data-fast]'), 'a future day offers a plan, not a log');
  sh.querySelector('[data-plan="sunnah"]').click();
  ok(A.S.fastPlan['2026-11-16'] === 'sunnah' && !A.S.fasts['2026-11-16'], 'planning a fast does not count it as fasted');
  ok(/class="[^"]*plan[^"]*"[^>]*data-k|data-k="2026-11-16" class="[^"]*plan/.test(visit(env, '#/calendar')), 'a planned day is marked on the calendar');
  const eve = boot('2026-11-15T18:00:00Z', JSON.parse(JSON.stringify(A.S)));
  ok(eve.w.A.occasion('2026-11-15', true).some((o) => o.t === 'Tomorrow you plan to fast'), 'the evening before shows the planned fast');
  ok(!env.errors.length, 'fast planning runs cleanly ' + env.errors.join(' | '));
}

/* Arabic mode reaches the reader, which sits outside the page */
{
  const st = JSON.parse(JSON.stringify(settled));
  st.prefs.lang = 'ar';
  const env = boot('2026-11-02T09:00:00Z', st);
  visit(env, '#/r/hardship/1');
  env.w.__arCheck = () => {
    const h = env.w.document.querySelector('.rd-head h2');
    return h && /[؀-ۿ]/.test(h.textContent);
  };
  global.__arEnv = env;
}

setTimeout(function () {
  ok(global.__arEnv.w.__arCheck(), 'the reader is translated in Arabic mode');
  console.log('smoke: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}, 50);
