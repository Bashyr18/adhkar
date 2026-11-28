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

function boot(nowISO, state, setup) {
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
  if (setup) setup(w);
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
S.excused.days = {};
S.excused.ended = {};
S.excused.endedAt = 0;
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
  const nx = fresh.w.document.querySelector('[data-a="ob-next"], [data-a="ob-notif"]');
  if (!nx) break;
  try {
    nx.click();
  } catch (e) {
    fresh.errors.push(String(e));
  }
}

/* New settings are on, while explicit choices survive backup and reload. */
{
  let requests = 0,
    checks = 0;
  const install = (w) => {
    w.AndroidBridge = {
      updateCan: () => 'yes',
      updateCheck: () => {
        checks++;
      },
      requestNotifications: () => {
        requests++;
        return false;
      }
    };
  };
  const env = boot('2026-11-24T12:00:00Z', null, install),
    w = env.w,
    A = w.A;
  for (let i = 0; i < 4; i++) A.obNext();
  const doc = w.document;
  ok(
    doc.querySelector('[data-a="ob-reminders"]').getAttribute('aria-checked') === 'true' &&
      doc.querySelector('[data-a="upd-auto"]').getAttribute('aria-checked') === 'true' &&
      A.S.prefs.widgets &&
      A.S.prefs.nudge.on &&
      A.S.prefs.nudge.over,
    'fresh reminder, widget and update choices are on'
  );
  A.upd.autoCheck();
  ok(checks === 0 && requests === 0, 'setup gives users a choice before asking or checking');
  doc.querySelector('[data-a="upd-auto"]').click();
  doc.querySelector('[data-a="ob-notif"]').click();
  ok(doc.querySelector('[data-a="ob-notif"]').disabled, 'permission prompt stays on the reminder step');
  w.__native.onPermission('notifications', false);
  ok(!!doc.querySelector('[data-a="ob-notif"]'), 'permission result leaves setup on reminders');
  ok(requests === 1 && A.S.notif.enabled, 'the default choice prompts once and system denial is independent');
  A.S.notif.enabled = false;
  A.S.prefs.widgets = false;
  A.S.prefs.nudge.on = false;
  const restored = boot('2026-11-24T12:00:00Z', JSON.parse(A.exportJSON()).state);
  const p = restored.w.A.S;
  ok(!p.notif.enabled && !p.upd.auto && !p.prefs.widgets && !p.prefs.nudge.on, 'explicit opt-outs survive reload');
  const older = A.readBackup(JSON.stringify({ app: 'adhkar', state: { v: 10, profile: { onboarded: true } } }));
  ok(
    !older.notif.enabled && !older.upd.auto && !older.prefs.nudge.over,
    'omitted legacy choices preserve earlier defaults'
  );
  w.close();
  restored.w.close();
}
{
  const env = boot('2026-11-24T12:00:00Z', settled),
    w = env.w,
    A = w.A;
  visit(env, '#/');
  A.nudgeNow();
  const button = w.document.querySelector('.dn-main');
  const before = A.S.tasbih.total;
  if (button) {
    button.click();
    button.click();
  }
  ok(!!button && A.S.tasbih.total === before + 1, 'the on-screen dhikr counts only once');
  A.hideNudge();
  for (const route of ['#/kahf', '#/counting', '#/purity/wudu']) {
    visit(env, route);
    const count = w.document.querySelectorAll('.dnudge').length;
    A.nudgeNow();
    ok(w.document.querySelectorAll('.dnudge').length === count, 'dhikr avoids ' + route);
  }
  for (const [kind, max] of [
    ['wudu', 7],
    ['ghusl', 6]
  ]) {
    visit(env, '#/purity/' + kind);
    const doc = w.document;
    ok(doc.querySelectorAll('.pu [data-a="pu-to"]').length === max, kind + ' opens with every step to jump to');
    ok(doc.querySelectorAll('.pu-evidence li').length >= 4, kind + ' includes offline source summaries');
    ok(
      doc.querySelector('.pu-k[aria-pressed="true"]').dataset.k === kind &&
        doc.querySelectorAll('#puP i').length === max,
      kind + ' marks its own lesson and has a progress bar per step'
    );
    for (let i = 1; i <= max; i++) {
      visit(env, '#/purity/' + kind + '/' + i);
      const art = doc.querySelector('.pu .lp-fig.on').getAttribute('src');
      const filled = [...doc.querySelectorAll('#puP b')].filter((b) => /scaleX\(1\)/.test(b.style.transform)).length;
      ok(fs.existsSync(path.join(WEB, art)) && filled === i, kind + ' step ' + i + ' has its art and progress');
    }
    visit(env, '#/purity/' + kind + '/' + (max + 1));
    ok(!!doc.querySelector('.pu .lp-done'), kind + ' has a completion view');
  }
  /* the dock steps through, and the other lesson slides in place from the opening page */
  visit(env, '#/purity/wudu');
  A.acts['pu-next']();
  ok(/Step 1 of 7/.test(w.document.getElementById('puR').textContent), 'Begin moves to the first step');
  A.acts['pu-prev']();
  A.acts['pu-kind'](w.document.querySelector('.pu-k[data-k="ghusl"]'));
  ok(
    w.document.getElementById('puT').textContent === 'Ghusl' && w.document.querySelectorAll('#puP i').length === 6,
    'choosing ghusl switches the lesson in place'
  );
  A.S.prefs.lang = 'ar';
  visit(env, '#/purity/ghusl/4');
  ok(
    w.document.querySelector('.pu .lp-name h2').textContent === 'أوصل الماء إلى أصول الشعر',
    'purification steps are available in Arabic'
  );
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
  ok(!/seek the hour of response before Maghrib/.test(today), 'the Friday occasion line steps aside for the card');
  ok(
    /Jumuʿah/.test(visit(fri, '#/salah')) && !/>Dhuhr</.test(visit(fri, '#/salah')),
    'on Friday the Dhuhr row is Jumuʿah for a brother'
  );
  const jp = visit(fri, '#/jumuah');
  ok(
    /Ṣalāt al-Jumuʿah/.test(jp) && /fr-hr mb/.test(jp) && /fr-hr ls/.test(jp),
    'the Jumuʿah page shows the prayer and the two hours'
  );
  ok(!/If you attend the masjid/.test(jp), 'a brother sees every Sunnah of attending as his');
  const kh = visit(fri, '#/kahf');
  ok((kh.match(/class="kf-page"/g) || []).length === 12, 'al-Kahf opens on its twelve Madani pages');
  ok(
    new Set((kh.match(/kf-w end" data-v="(\d+)"/g) || []).map((x) => x.match(/\d+/)[0])).size === 110,
    'every verse end of al-Kahf is on the pages'
  );
  A.S.profile.gender = 'f';
  const sp = visit(fri, '#/jumuah');
  ok(
    /Jumuʿah or Ẓuhr/.test(sp) && /If you attend the masjid/.test(sp),
    'a sister sees Jumuʿah or Ẓuhr, and the Sunnahs of attending as optional'
  );
  ok(/Jumuʿah or Ẓuhr/.test(visit(fri, '#/salah')), 'a sister’s Ṣalāh list names Jumuʿah or Ẓuhr');
  A.S.excused.on = true;
  ok(
    /On a break from ṣalāh/.test(visit(fri, '#/jumuah')) && !/data-a="fr-prayed"/.test(visit(fri, '#/jumuah')),
    'on a break, the Friday prayer is not asked of her'
  );
  A.S.excused.on = false;
  A.S.profile.gender = '';
  ok(!fri.errors.length, 'Friday pages open cleanly ' + fri.errors.join(' | '));

  const last = boot('2026-11-13T15:40:00Z', settled);
  ok(last.w.A.jumuah().now === 'last', 'the last hour before Maghrib is lit as the hour of response');
  const thu = boot('2026-11-12T18:00:00Z', settled);
  ok(
    thu.w.A.jumuah().on && thu.w.A.jumuah().phase === 'night' && thu.w.A.jumuah().key === '2026-11-13',
    'Thursday after Maghrib is the night of Jumuʿah'
  );
  const wed = boot('2026-11-11T12:00:00Z', settled);
  visit(wed, '#/');
  ok(
    !wed.w.A.jumuah().on && !wed.w.document.documentElement.hasAttribute('data-friday'),
    'a Wednesday is an ordinary day'
  );
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
  ok(
    sh && /Plan a fast/.test(sh.innerHTML) && !sh.querySelector('[data-fast]'),
    'a future day offers a plan, not a log'
  );
  sh.querySelector('[data-plan="sunnah"]').click();
  ok(
    A.S.fastPlan['2026-11-16'] === 'sunnah' && !A.S.fasts['2026-11-16'],
    'planning a fast does not count it as fasted'
  );
  ok(
    /class="[^"]*plan[^"]*"[^>]*data-k|data-k="2026-11-16" class="[^"]*plan/.test(visit(env, '#/calendar')),
    'a planned day is marked on the calendar'
  );
  const eve = boot('2026-11-15T18:00:00Z', JSON.parse(JSON.stringify(A.S)));
  ok(
    eve.w.A.occasion('2026-11-15', true).some((o) => o.t === 'Tomorrow you plan to fast'),
    'the evening before shows the planned fast'
  );
  ok(!env.errors.length, 'fast planning runs cleanly ' + env.errors.join(' | '));
}

/* the morning adhkār end before Dhuhr; the evening ones begin at ʿAṣr */
{
  const am = boot('2026-11-11T09:30:00Z', settled),
    mid = boot('2026-11-11T12:40:00Z', settled),
    pm = boot('2026-11-11T14:30:00Z', settled);
  const t = mid.w.A.pday(mid.w.A.today());
  ok(am.w.A.sessionNow() === 'morning', 'mid-morning is the time of the morning adhkār');
  ok(
    Date.now() &&
      mid.w.A.sessionNow() === null &&
      Date.parse('2026-11-11T12:40:00Z') > t.dhuhr &&
      Date.parse('2026-11-11T12:40:00Z') < t.asr,
    'between Dhuhr and ʿAṣr neither session is due'
  );
  ok(pm.w.A.sessionNow() === 'evening', 'after ʿAṣr is the time of the evening adhkār');
}

/* the basmalah always stands apart from the first āyah: in the Muṣḥaf view, on Today's card and in the translation */
{
  const env = boot('2026-11-13T10:00:00Z', settled),
    A = env.w.A,
    d = env.w.document;
  const all = [];
  A.COLS.forEach((c) =>
    A.items(c.id, c.perPrayer ? 'fajr' : undefined).forEach((it, i) => {
      if (it.qs) all.push({ c, it, i });
    })
  );
  const ikh = all.find((x) => x.it.qs[0].s === 112),
    fat = all.find((x) => x.it.qs[0].s === 1);
  const m1 = d.createElement('div');
  m1.innerHTML = A.mushaf(ikh.it.qs, false);
  ok(
    m1.querySelector('.bsm') && !/بِسْمِ/.test(m1.querySelector('.ayat').textContent),
    'al-Ikhlāṣ: the basmalah is its own line, not part of the first āyah'
  );
  const m2 = d.createElement('div');
  m2.innerHTML = A.mushaf(fat.it.qs, false);
  ok(
    m2.querySelector('.ayat.bsm1') &&
      m2.querySelectorAll('.ayat.bsm1 .am').length === 1 &&
      !/بِسْمِ/.test(m2.querySelectorAll('.ayat')[1].textContent),
    'al-Fātiḥah: its first āyah, the basmalah, has a line of its own'
  );
  const en = d.createElement('div');
  en.innerHTML = A.txLines(ikh.it.en);
  ok(
    en.firstChild.classList.contains('bsm-l') && en.querySelectorAll('.ln.v').length === 4,
    'the translation opens with the basmalah alone, then the numbered āyāt'
  );
  A.dailyDhikr = () => ikh;
  const today = visit(env, '#/');
  ok(
    /class="card dod[\s\S]*class="bsm"[\s\S]*bsm-l/.test(today),
    "Today's dhikr of the day keeps the basmalah apart, in the Arabic and the translation"
  );
  ok(!env.errors.length, 'basmalah views run cleanly ' + env.errors.join(' | '));
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

/* audit regression suite: persistence, sanitization, timezone math, prototype safety, and cleanup */
{
  /* 1. S.jumuah survives reload and backup import */
  const jst = JSON.parse(JSON.stringify(settled));
  jst.jumuah = {
    days: { '2026-11-13': { kahf: 1700000000000, ghusl: 1 } },
    khutbah: 15,
    overlay: false,
    kahf: { page: 5, verse: 42 }
  };
  const jenv = boot('2026-11-13T10:00:00Z', jst);
  ok(
    jenv.w.A.S.jumuah &&
      jenv.w.A.S.jumuah.kahf.page === 5 &&
      jenv.w.A.S.jumuah.days['2026-11-13'].kahf === 1700000000000 &&
      jenv.w.A.S.jumuah.khutbah === 15,
    'S.jumuah survives app restart'
  );
  const exported = jenv.w.A.exportJSON();
  jenv.w.A.reset();
  jenv.w.A.importJSON(exported);
  ok(
    jenv.w.A.S.jumuah && jenv.w.A.S.jumuah.kahf.page === 5 && jenv.w.A.S.jumuah.overlay === false,
    'S.jumuah survives backup export and import'
  );

  /* 2. Damaged / crafted backup JSON is sanitized and escaped cleanly */
  const bad = {
    app: 'adhkar',
    state: {
      v: 10,
      loc: { lat: null, lng: null, name: 'Bad' },
      calc: { method: 'bogus', asr: 'bad', highLat: 'bad' },
      prefs: { theme: 'bad', accent: '"><img src=x>', ar: 999, hijriAdj: 99, nudge: { on: true, every: -5 } },
      profile: { name: 'May', since: '"><script>1</script>', onboarded: true },
      notif: { enabled: true, sleep: { on: true, at: '"><svg>' } },
      excused: { on: true, since: '0001-01-01', days: {} },
      counts: { '2026-11-13|morning|a': '999' },
      prayed: { '2026-11-13': null },
      nights: { '2026-11-13': null },
      journal: { items: [{ id: '"><img src=x>', text: 'Dua', since: 'bad' }] },
      learn: { last: { p: '"><img', i: 1, n: 5, at: Date.now() }, qlog: [{ r: '1', n: '2' }] },
      last: { c: 'morning', d: '2026-11-13', p: '"><img' }
    }
  };
  const senv = boot('2026-11-13T10:00:00Z', settled);
  senv.w.A.importJSON(JSON.stringify(bad));
  const BS = senv.w.A.S;
  ok(
    BS.loc === null && BS.calc.method === 'mwl' && BS.prefs.theme === 'auto' && BS.prefs.accent === 'gold',
    'invalid loc and enums fall back safely'
  );
  ok(
    BS.notif.sleep.at === '22:30' && BS.excused.on === false && BS.excused.since === null,
    'invalid sleep time and ancient excused.since are cleared'
  );
  ok(BS.prefs.ar === 54 && BS.prefs.hijriAdj === 2 && BS.prefs.nudge.every === 5, 'numeric prefs are clamped');
  ok(
    BS.learn.last === null && BS.last === null && BS.learn.qlog.length === 0,
    'invalid last/learn pointers and qlog are dropped'
  );
  ok(typeof senv.w.A.totals().dhikr === 'number', 'totals() never throws or concatenates strings on damaged maps');
  const jhtml = visit(senv, '#/journal');
  ok(!jhtml.includes('"><img src=x>'), 'journal id is HTML-escaped');
  const phtml = visit(senv, '#/settings/notifications');
  ok(!phtml.includes('"><svg>') && !senv.errors.length, 'settings and profile render cleanly after damaged import');

  /* 3. A.trkAddPhrase credits daily Sunnah phrase counts (pd) */
  const nenv = boot('2026-11-13T10:00:00Z', settled);
  nenv.w.A.trkAddPhrase('subhanbihamdih', 3);
  ok(
    nenv.w.A.S.tasbih.pd[nenv.w.A.today()] && nenv.w.A.S.tasbih.pd[nenv.w.A.today()].subhanbihamdih === 3,
    'trkAddPhrase updates today per-phrase Sunnah progress'
  );

  /* 4. Timetable print aligns to location timezone, not device midnight */
  const ny = JSON.parse(JSON.stringify(settled));
  ny.loc = { name: 'New York', lat: 40.7128, lng: -74.006, tz: 'America/New_York', cc: 'US' };
  const penv = boot('2026-11-15T12:00:00Z', ny);
  const sheet = penv.w.A.print.sheets('times', 0);
  const nov1Fajr = penv.w.A.fmtTxt(penv.w.A.pday('2026-11-01').fajr);
  ok(
    sheet.includes('<td>' + nov1Fajr + '</td>'),
    'printed timetable uses location civil date (not shifted by device TZ)'
  );

  /* 5. Kahf view exposes unmount; !S.loc provides nightKey; Object.prototype keys safe */
  const kenv = boot('2026-11-13T10:00:00Z', settled);
  ok(typeof kenv.w.A.V.kahf().unmount === 'function', 'A.V.kahf defines unmount to release observers and audio');
  kenv.w.A.S.loc = null;
  ok(kenv.w.A.now().nightKey === kenv.w.A.today(), 'A.now().nightKey falls back to today when location is unset');
  kenv.w.A.S.prefs.lang = 'ar';
  ok(kenv.w.A.T('constructor') === 'constructor', 'i18n lookup ignores Object.prototype keys');
  visit(kenv, '#/toString');
  visit(kenv, '#/c/toString');
  visit(kenv, '#/settings/toString');
  visit(kenv, '#/learn/toString');
  ok(!kenv.errors.length, 'Object.prototype route names never crash router or views');

  /* 6. International Date Line location aligns noon to civil date */
  const idl = JSON.parse(JSON.stringify(settled));
  idl.loc = { name: 'Apia', lat: -13.8333, lng: -171.75, tz: 'Pacific/Apia', cc: 'WS' };
  const idlEnv = boot('2026-11-22T00:00:00Z', idl);
  const apiaDay = idlEnv.w.A.pday('2026-11-22');
  ok(
    idlEnv.w.A.keyAt(apiaDay.dhuhr) === '2026-11-22',
    'IDL location (Pacific/Apia) dhuhr falls on requested civil day'
  );

  /* 7. Logging a prayer on Today refreshes the prayed ring */
  const tenv = boot('2026-11-13T10:00:00Z', settled);
  visit(tenv, '#/');
  const fbtn = tenv.w.document.querySelector('[data-a="dash-pray"][data-p="fajr"]');
  tenv.w.A.acts['dash-pray'](fbtn);
  ok(
    /<b>1<i>\/5<\/i><\/b>/.test(tenv.w.document.getElementById('dash').innerHTML),
    'dash-pray updates the X/5 prayed ring immediately'
  );

  /* 8. History compaction rolls >1yr counts into archivedCounts without changing totals */
  const cenv = boot('2026-11-13T10:00:00Z', settled);
  const oldBk = JSON.parse(cenv.w.A.exportJSON());
  oldBk.state.counts = { '2024-01-10|morning|m1': 33, '2024-01-10|morning|m2': 7, '2026-11-13|morning|m1': 3 };
  cenv.w.A.importJSON(JSON.stringify(oldBk));
  ok(
    !cenv.w.A.S.counts['2024-01-10|morning|m1'] &&
      cenv.w.A.S.archivedCounts['2024-01-10'] === 40 &&
      cenv.w.A.S.counts['2026-11-13|morning|m1'] === 3 &&
      cenv.w.A.totals().dhikr === 43 &&
      cenv.w.A.totals().byDay['2024-01-10'] === 40,
    'counts older than 365 days compact into archivedCounts with identical totals'
  );

  /* 9. Backup merge combines two devices without overwriting local settings or higher counts */
  const menv = boot('2026-11-13T10:00:00Z', settled);
  menv.w.A.S.prefs.accent = 'emerald';
  menv.w.A.S.counts['2026-11-13|morning|m1'] = 10;
  menv.w.A.S.prayed['2026-11-13'] = { fajr: 1 };
  menv.w.A.S.journal.items = [{ id: 'j1', text: 'Local dua', since: '2026-11-10' }];
  const other = JSON.parse(menv.w.A.exportJSON());
  other.state.prefs.accent = 'rose';
  other.state.counts = { '2026-11-13|morning|m1': 5, '2026-11-13|evening|e1': 12 };
  other.state.prayed = { '2026-11-13': { dhuhr: 1 } };
  other.state.journal.items = [
    { id: 'j1', text: 'Dup', since: '2026-11-10' },
    { id: 'j2', text: 'Phone dua', since: '2026-11-12' }
  ];
  menv.w.A.importJSON(JSON.stringify(other), 'merge');
  ok(
    menv.w.A.S.prefs.accent === 'emerald' &&
      menv.w.A.S.counts['2026-11-13|morning|m1'] === 10 &&
      menv.w.A.S.counts['2026-11-13|evening|e1'] === 12 &&
      menv.w.A.S.prayed['2026-11-13'].fajr &&
      menv.w.A.S.prayed['2026-11-13'].dhuhr &&
      menv.w.A.S.journal.items.length === 2,
    'backup merge keeps local prefs, takes max counts, and unions prayers and journal'
  );

  /* 10. A.chart.area handles empty data cleanly */
  const box = menv.w.document.createElement('div');
  menv.w.A.chart.area(box, [], {});
  ok(box.innerHTML === '', 'A.chart.area handles empty data without throwing');
}

{
  const { w } = boot('2026-11-24T12:00:00Z', settled);
  const a = w.A;
  const before = JSON.parse(a.exportJSON()).state;
  before.counts = { '2024-01-10|morning|m1': 33 };
  a.importJSON(JSON.stringify(before), 'replace');
  const second = { ...before, counts: { '2024-01-10|evening|e1': 20 } };
  a.importJSON(JSON.stringify(second), 'merge');
  a.importJSON(JSON.stringify(before), 'merge');
  a.importJSON(JSON.stringify(second), 'merge');
  ok(a.totals().byDay['2024-01-10'] === 53, 'raw daily backups restore and archived counts merge idempotently');
  a.S.tasbih.days = { '2026-11-24': 100 };
  a.S.tasbih.pd = { '2026-11-24': { subhanallah: 100 } };
  const next = JSON.parse(a.exportJSON());
  next.state.tasbih.pd['2026-11-24'] = { astaghfirullah: 100 };
  a.importJSON(JSON.stringify(next), 'merge');
  ok(a.S.tasbih.days['2026-11-24'] === 200, 'merged Tracker totals include both distinct phrases');
  w.close();
}
{
  const { w } = boot('2026-11-24T12:00:00Z');
  const a = w.A;
  const incoming = a.exportJSON();
  a.S.saved.push('sample');
  a.S.fasts['2026-11-23'] = 'sunnah';
  w.__native.onImport(incoming);
  const replace = w.document.getElementById('impRep');
  ok(!!replace && a.S.saved.length === 1, 'backup import offers a choice when bookmarks and fasts are present');
  if (replace) replace.click();
  const recovery = w.localStorage.getItem('adhkar.before-import');
  ok(!!recovery && a.readBackup(recovery).fasts['2026-11-23'] === 'sunnah', 'replace saves a restorable copy first');
  a.S.saved.push('keep-me');
  w.__native.onImport(incoming);
  const original = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function (key, value) {
    if (key === 'adhkar.v10') throw new w.DOMException('Full', 'QuotaExceededError');
    return original.call(this, key, value);
  };
  w.document.querySelector('.sheet:not(.out) #impRep').click();
  w.Storage.prototype.setItem = original;
  ok(a.S.saved.includes('keep-me'), 'a failed replacement write leaves current records in place');
  w.close();
}
{
  const time = '2026-11-24T22:00:00Z';
  const state = { ...settled, loc: { name: 'Makkah', lat: 21.42, lng: 39.82, tz: 'Asia/Riyadh' } };
  const env = boot(time, state);
  env.w.A.setExcused(true);
  const restored = boot(time, JSON.parse(env.w.A.exportJSON()).state);
  ok(
    restored.w.A.S.excused.on && restored.w.A.S.excused.since === '2026-11-25',
    'location date survives a reload during a break'
  );
  env.w.close();
  restored.w.close();
}
{
  let scheduled = [];
  const state = { ...settled, loc: { name: 'Lagos', lat: 6.52, lng: 3.38, tz: 'Africa/Lagos' } };
  const { w } = boot('2026-11-27T00:05:00Z', state, (win) => {
    win.ADHKAR_DESKTOP = true;
    win.DeskBridge = {
      deskSchedule: (json) => {
        scheduled = JSON.parse(json);
      }
    };
  });
  const a = w.A;
  a.S.notif.enabled = true;
  a.S.notif.night.on = true;
  a.S.notif.night.off = 0;
  a.S.notif.friday.on = false;
  a.S.journal.nudge.night = false;
  a.S.journal.nudge.friday = true;
  a.S.journal.items = [{ id: 'sample', text: 'Sample request', since: '2026-11-20' }];
  w.Desk.schedule();
  const tonight = a.pday('2026-11-26').lastThird;
  ok(
    tonight > w.Date.now() && scheduled.some((e) => e.t === tonight && e.route === 'night'),
    'Windows keeps the current night after midnight'
  );
  ok(
    scheduled.some((e) => e.route === 'journal' && e.hour),
    'Windows honors a Friday journal-only reminder'
  );
  a.S.notif.enabled = false;
  a.S.fastPlan['2026-11-28'] = 'sunnah';
  w.Desk.schedule();
  ok(scheduled.length === 0, 'turning reminders off cancels planned-fast notifications too');
  ok(
    a.dayOcc('2026-05-28').some((e) => e.nofast) &&
      !a.dayOcc('2026-05-28').some((e) => /Sunnah fast/.test(e.t)) &&
      !a.occasion('2028-05-07', false).some((e) => e.t === 'Tomorrow is Monday') &&
      /day of ʿĪd/.test(a.occasion('2026-05-27', false)[0].t),
    'fasting recommendations respect Tashrīq and Today prioritizes Eid'
  );
  const sheet = a.sheet('Example', '<button>Example</button>');
  sheet.el.querySelector('button').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(sheet.closed, 'Escape closes a sheet');
  a.openReader('morning', 0);
  ok(
    w.document.querySelector('.reader').contains(w.document.activeElement),
    'opening the reader moves keyboard focus inside'
  );
  w.close();
}
{
  const { w } = boot('2026-11-24T12:00:00Z', null, (win) => {
    win.AndroidBridge = {};
  });
  const a = w.A;
  for (let i = 0; i < 3; i++) a.obNext();
  const { document } = w;
  const city = document.querySelector('[data-a="pick-city"][data-ob]');
  if (city) city.click();
  ok(
    !!city && !!document.querySelector('.ob-times') && !!document.querySelector('[data-a="coords"]'),
    'city selection shows prayer preview and coordinates'
  );
  a.obNext();
  const sw = document.querySelector('[data-a="ob-prayers"]');
  if (sw) sw.click();
  ok(!!sw && !Object.values(a.S.notif.prayers).some(Boolean), 'onboarding can turn off prayer alerts independently');
  a.S.notif.enabled = true;
  a.N.notifState = () => ({ granted: false, exact: true });
  ok(/Blocked by system/.test(a.V.settings(['notifications']).html), 'reminder settings report OS-level blocking');
  w.close();
}

{
  let download, testReminder;
  const state = { ...settled, loc: { name: 'Lagos', lat: 6.52, lng: 3.38, tz: 'Africa/Lagos' } };
  const { w } = boot('2026-11-24T13:00:00Z', state, (win) => {
    win.AndroidBridge = {
      audioPlay() {},
      audioHave() {
        return '[]';
      },
      audioDownload(list, tag) {
        download = { list: JSON.parse(list), tag };
      },
      testReminder(title) {
        testReminder = title;
        return true;
      }
    };
  });
  const a = w.A;
  a.S.prayed[a.today()] = {};
  a.acts['dash-pray']({ dataset: { p: 'dhuhr' } });
  ok(
    !!w.document.querySelector('#dash a[href^="#/r/salah/"][href$="/dhuhr"]'),
    'logging a prayer offers its after-prayer reader directly'
  );
  const div = w.document.createElement('div');
  div.innerHTML = a.audio.collectionButton('morning');
  const button = div.firstElementChild;
  if (button) {
    a.acts['au-get-collection'](button);
    w.document.querySelector('.sheet:not(.out) [data-ok]').click();
  }
  ok(
    !!download &&
      download.tag === 'collection-morning' &&
      download.list.length === a.audio.collection('morning').length &&
      download.list.length < a.audio.all().length,
    'collection download sends only its missing files to the native bridge'
  );
  a.acts['test-reminder']();
  ok(testReminder === 'Test reminder', 'test reminder uses the native notification bridge');
  w.close();
}

{
  /* iOS shim & UI: boots the app with ios/shim.js under adhkar-app://app and verifies bridge calls and iOS-specific settings */
  const iosShimSrc = fs.readFileSync(path.join(ROOT, 'ios/shim.js'), 'utf8');
  const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8').replace(/<script src="[^"]+"><\/script>\n/g, '');
  const posted = [],
    prompted = [];
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'adhkar-app://app/index.html#/'
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
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
  w.webkit = {
    messageHandlers: {
      adhkar: {
        postMessage(msg) {
          posted.push(msg);
        }
      }
    }
  };
  const curVer = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim().split(/\r?\n/)[0];
  w.prompt = (key, def) => {
    prompted.push([key, def]);
    if (key === '__adhkar__:version') return JSON.stringify({ r: curVer });
    if (key === '__adhkar__:updateCan') return JSON.stringify({ r: '' });
    if (key === '__adhkar__:notificationState')
      return JSON.stringify({ r: '{"granted":true,"exact":true,"nextAt":0}' });
    if (key === '__adhkar__:audioHave') return JSON.stringify({ r: '[]' });
    if (key === '__adhkar__:audioUsage') return JSON.stringify({ r: 0 });
    if (key === '__adhkar__:overlayOk' || key === '__adhkar__:dndOk' || key === '__adhkar__:batteryOk')
      return JSON.stringify({ r: true });
    return JSON.stringify({ r: null });
  };
  const mem = {};
  Object.defineProperty(w, 'localStorage', {
    value: {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => {
        mem[k] = String(v);
      },
      removeItem: (k) => {
        delete mem[k];
      }
    }
  });
  w.localStorage.setItem('adhkar.v10', JSON.stringify(settled));
  w.eval(iosShimSrc);
  const order = [
    ...fs.readFileSync(path.join(WEB, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"><\/script>/g)
  ].map((m) => m[1]);
  for (const src of order) w.eval(fs.readFileSync(path.join(WEB, src), 'utf8'));
  w.A.S.notif.enabled = true;
  w.A.S.prefs.nudge.on = true;
  const reading = w.A.V.settings(['reading']).html;
  const notifs = w.A.V.settings(['notifications']).html;
  const device = w.A.V.settings(['device']).html;
  const fri = w.A.V.jumuah().html;
  ok(
    w.ADHKAR_IOS === true && w.document.documentElement.classList.contains('is-ios'),
    'iOS shim marks the page as iOS'
  );
  ok(w.A.N.version() === curVer, 'iOS shim resolves synchronous version via prompt bridge');
  ok(!/Volume keys count/.test(reading), 'iOS hides Android volume-key counting option');
  ok(
    !/Also over other apps/.test(notifs) && !/Silence my phone/.test(notifs),
    'iOS hides Android overlay and DND controls'
  );
  ok(
    /Test haptics/.test(device) && !/Quick settings tile/.test(device),
    'iOS device settings show haptics without Android tiles'
  );
  ok(!/The hour, over other apps/.test(fri), 'iOS Jumuʿah screen hides Android overlay toggle');
  w.A.N.haptic('tick');
  ok(
    posted.some((m) => m.fn === 'haptic'),
    'iOS async bridge calls go through WKScriptMessageHandler'
  );
  w.close();
}

/* Ramaḍān: missed days and break days are both made up; the page shows the month, the make-up fasts and tonight */
{
  const st = JSON.parse(JSON.stringify(settled));
  st.excused = { on: false, since: null, days: { '2027-02-14': 1, '2027-02-15': 1 }, cycles: [], habit: {} };
  st.ramadan = { skip: { '2027-02-24': 1 }, taraweeh: { '2027-03-03': 11 }, khatm: { juz: { 1: 1, 2: 1 }, done: 0 } };
  st.fasts = { '2026-12-01': 'qada' };
  const env = boot('2027-03-05T14:20:00Z', st),
    A = env.w.A,
    doc = env.w.document;
  const q = A.qadaOwed();
  ok(
    q.brk === 2 && q.skipped === 1 && q.missed === 3 && q.owed === 3 && q.made === 0,
    'a missed Ramaḍān day is made up like a break day, and a make-up kept before any miss answers none ' +
      JSON.stringify(q)
  );
  const beforeFasts = JSON.stringify(A.S.fasts);
  visit(env, '#/ramadan');
  ok(JSON.stringify(A.S.fasts) === beforeFasts, 'opening Ramadan writes no fasting record');
  ok(doc.querySelectorAll('.rmd.unlogged').length > 0, 'unlogged days are distinct from missed days');
  A.S.ramadan.khatm.juz = {};
  for (let j = 1; j <= 30; j++) A.acts['rm-juz']({ dataset: { v: String(j) } });
  ok(
    A.S.ramadan.khatm.done === 0 && Object.keys(A.S.ramadan.khatm.juz).length === 30,
    'the last juz stays editable before saving'
  );
  A.acts['rm-juz']({ dataset: { v: '30' } });
  ok(!A.S.ramadan.khatm.juz[30] && A.S.ramadan.khatm.done === 0, 'an accidental last juz can be corrected');
  A.acts['rm-juz']({ dataset: { v: '30' } });
  A.acts['rm-khatm-save']();
  doc.querySelector('.sheet [data-ok]').click();
  ok(A.S.ramadan.khatm.done === 1 && !Object.keys(A.S.ramadan.khatm.juz).length, 'confirmation saves one khatm');
  ok(
    !!doc.querySelector('.rm-qada') && doc.querySelector('.rm-qada .ring [data-n]').dataset.n === '3',
    'the make-up fasts card counts what is owed'
  );
  ok(
    doc.querySelector('.rmd.today').getAttribute('aria-current') === 'date' &&
      doc.querySelector('.rm-tw [data-v="8"]').getAttribute('aria-label') === 'Log 8 rakʿahs',
    'today and the rakʿah choices say what they are'
  );
  /* after Ramaḍān: make-ups count in order, never a future one; the button never replaces another fast or logs ʿĪd */
  {
    const st2 = JSON.parse(JSON.stringify(st));
    st2.fasts = { '2026-12-01': 'qada', '2027-03-15': 'qada', '2027-04-30': 'qada', '2027-03-19': 'mon' };
    const e2 = boot('2027-03-19T09:00:00Z', st2),
      A2 = e2.w.A,
      q2 = A2.qadaOwed();
    ok(
      q2.made === 1 && q2.owed === 2,
      'only make-ups kept after a miss, and not in the future, count ' + JSON.stringify(q2)
    );
    visit(e2, '#/ramadan');
    A2.acts['rm-qada']();
    ok(A2.S.fasts['2027-03-19'] === 'mon', 'logging a make-up never replaces a fast already logged today');
    const e3 = boot('2027-03-09T09:00:00Z', st);
    e3.w.A.acts['rm-qada']();
    ok(!e3.w.A.S.fasts['2027-03-09'], 'no make-up fast is logged on ʿĪd');
  }
  ok(
    doc.querySelectorAll('.rmgrid .rmd.off').length === 1 && doc.querySelectorAll('.rmd.ex').length === 2,
    'the month shows a missed day and the break days'
  );
  ok(
    !!doc.querySelector('.rm-arc [data-rm-orb]') && !!doc.querySelector('[data-rm-cd]'),
    'the Ramaḍān card has its live countdown and the arc of the fast'
  );
  ok(doc.querySelectorAll('.rm-sky .rn.now').length === 1, 'tonight is marked among the last ten nights');
  ok(
    doc.querySelector('.rm-dua .ar').textContent === env.w.DATA.items['r-qadr'].ar,
    'the duʿāʾ of Laylat al-Qadr is shown from the verified data'
  );
  ok(
    !!doc.querySelector('.rm-tw') && !!doc.querySelector('.rm-kh .rm-pace'),
    'tarāwīḥ and the khatm pace are shown in Ramaḍān'
  );
  visit(env, '#/answered');
  ok(
    doc.querySelectorAll('.ans-dial .dl-w').length >= 10 && !!doc.querySelector('[data-dl-hand]'),
    'the times of duʿāʾ are drawn on a dial of the day'
  );
  const pre = boot('2026-11-28T10:00:00Z', settled);
  visit(pre, '#/ramadan');
  ok(!pre.w.document.querySelector('.rm-tw'), 'tarāwīḥ waits for Ramaḍān');
  ok(
    !!pre.w.document.querySelector('.rm-daily-cta [data-a="rm-share"]'),
    'pre-Ramaḍān page offers browsing the Day 1 to ʿĪd cards'
  );
}

/* v13.10 release-gate checks: web remindersOn, Arabic Qibla, qaḍāʾ filter, break bead cap, Ramaḍān/ʿĪd dual share cards */
{
  /* 1. Web without native bridge reports reminders Off even though defaults() has notif.enabled = true */
  const webEnv = boot('2026-11-28T10:00:00Z', settled);
  const wA = webEnv.w.A;
  ok(
    wA.S.notif.enabled === true && wA.remindersOn() === false,
    'web reports A.remindersOn() false without a native bridge'
  );
  visit(webEnv, '#/profile');
  ok(
    !/Reminders<\/span><b>On<\/b>/.test(webEnv.w.document.body.innerHTML),
    'web profile does not claim reminders are On'
  );
  visit(webEnv, '#/salah');
  ok(
    !webEnv.w.document.querySelector('[data-a="bell"][aria-pressed="true"]'),
    'web prayer bells do not appear active when notifications cannot fire'
  );
  visit(webEnv, '#/journal');
  ok(
    !webEnv.w.document.querySelector('[data-a="dua-nudge"][aria-checked="true"]'),
    'web journal reminder switches stay Off without a native bridge'
  );
  visit(webEnv, '#/purity/wudu/1');
  webEnv.w.A.rerender();
  ok(
    !!webEnv.w.document.querySelector('.pu.no-anim'),
    'same-step purity rerender suppresses entrance animation to avoid flashes'
  );
  webEnv.w.close();

  /* 2. Arabic Qibla uses full Arabic cardinal words and localized digits */
  const arQ = boot('2026-11-28T10:00:00Z', { ...settled, prefs: { ...settled.prefs, lang: 'ar' } });
  visit(arQ, '#/qibla');
  const qTxt = arQ.w.document.body.textContent;
  ok(
    /جنوب شرق|شمال شرق|جنوب غرب|شمال غرب|شمال|جنوب|شرق|غرب/.test(qTxt) && /[٠-٩]+°/.test(qTxt),
    'Arabic Qibla shows full Arabic compass words and Arabic digits'
  );

  /* 3. Break-day beads are capped with an overflow chip when a long recorded habit would overflow the row */
  const brkEnv = boot('2026-11-28T10:00:00Z', {
    ...settled,
    profile: { ...settled.profile, gender: 'f' },
    excused: {
      on: true,
      since: '2026-11-26',
      cycles: [{ from: '2026-09-01', to: '2026-09-25' }]
    }
  });
  visit(brkEnv, '#/');
  const beads = brkEnv.w.document.querySelectorAll('.brk-beads i').length;
  ok(
    beads === 14 && /\+11/.test((brkEnv.w.document.querySelector('.brk-beads') || {}).textContent || ''),
    'break beads cap overflow with a +N chip'
  );
  brkEnv.w.close();

  /* 4. Ramaḍān Day 1–30, Odd Nights, ʿĪd al-Fiṭr & Shawwāl shareable cards */
  const rmEnv = boot('2027-03-04T14:00:00Z', settled); /* Ramaḍān 25, odd night */
  const rA = rmEnv.w.A;
  const totalCards = rA.ramadanCardCount();
  let allVerified = totalCards === 32;
  for (let i = 0; i < totalCards; i++) {
    const e = rA.ramadanDayEntry(i);
    if (!e || !e.ar || !e.en || !e.ref) allVerified = false;
  }
  ok(allVerified, 'all 32 Ramaḍān Day 1–30, ʿĪd and Shawwāl cards resolve to verified verbatim Arabic and English');
  ok(
    rA.ramadanDayEntry(1).entry.k === 'muslim:1080' &&
      rA.ramadanDayEntry(4).g === 'Ḥasan (al-Albānī)' &&
      rA.ramadanDayEntry(28).entry.k === 'muslim:1170',
    'Day 2 (Muslim 1080), Day 5 (Ḥasan al-Albānī), and Night 29 (Muslim 1170) carry exact verified sources and grades'
  );
  visit(rmEnv, '#/');
  ok(
    !!rmEnv.w.document.querySelector('.rm-daily.is-odd [data-a="rm-share"]'),
    'Today shows the odd-night shareable card during the last ten'
  );
  rA.openRamadanShare(26);
  const sh = rmEnv.w.document.querySelector('.sheet:not(.out)');
  ok(
    !!sh &&
      !!sh.querySelector('[data-fmt="status"]') &&
      !!sh.querySelector('[data-fmt="post"]') &&
      !!sh.querySelector('[data-rm-step="1"]') &&
      sh.querySelectorAll('[data-rm-jump]').length === 4,
    'Ramaḍān share sheet exposes dual Status/Post formats and Day 1 to ʿĪd navigation'
  );
  /* Verify qadaOwed ignores any qada entry mistakenly recorded inside Ramaḍān */
  rA.S.fasts['2027-02-20'] = 'qada';
  ok(rA.qadaOwed().made === 0, 'qadaOwed ignores qada entries inside Ramaḍān');
  rmEnv.w.close();

  /* 5. ʿĪd al-Fiṭr (1 Shawwāl = 2027-03-09) shows the ʿĪd shareable card on Today, including in Arabic mode */
  const eidEnv = boot('2027-03-09T09:00:00Z', settled);
  visit(eidEnv, '#/');
  ok(
    !!eidEnv.w.document.querySelector('.rm-daily.is-eid') && /ʿĪd Mubārak/.test(eidEnv.w.document.body.textContent),
    'Today shows the ʿĪd al-Fiṭr shareable card on 1 Shawwāl'
  );
  eidEnv.w.close();

  const eidAr = boot('2027-03-09T09:00:00Z', { ...settled, prefs: { ...settled.prefs, lang: 'ar' } });
  visit(eidAr, '#/');
  ok(
    !!eidAr.w.document.querySelector('.rm-daily.is-eid') &&
      !eidAr.w.document.querySelector('.rm-daily .rm-daily-en') &&
      /عيد الفطر/.test(eidAr.w.document.querySelector('.rm-daily').textContent),
    'Arabic mode renders the ʿĪd shareable card purely in Arabic'
  );

  /* 6. Sol 6.2 regressions: per-prayer break eligibility, multi-break ended map, OS-blocked reminders, Jumuʿah guard, Qibla static fallback */
  {
    const lagos = {
      ...settled,
      profile: { ...settled.profile, gender: 'f' },
      loc: { name: 'Lagos', lat: 6.52, lng: 3.38, tz: 'Africa/Lagos' }
    };
    const b1 = boot('2026-02-19T12:20:00Z', {
      ...lagos,
      excused: {
        on: true,
        since: '2026-02-15',
        days: { '2026-02-15': 1, '2026-02-16': 1, '2026-02-17': 1, '2026-02-18': 1 }
      }
    });
    const A1 = b1.w.A;
    A1.setExcused(false); /* ends at 13:20 Lagos (after Fajr/sunrise, during Dhuhr) */
    ok(
      A1.prayerExcused('2026-02-19', 'fajr') && !A1.prayerExcused('2026-02-19', 'dhuhr'),
      'ending a break at Dhuhr excuses Fajr and enables Dhuhr'
    );
    visit(b1, '#/');
    const dots = Array.from(b1.w.document.querySelectorAll('#dash [data-a="dash-pray"]')).map((x) => x.dataset.p);
    ok(
      !dots.includes('fajr') && dots.includes('dhuhr') && dots.length === 4,
      'Today dash hides excused Fajr and shows 4 remaining prayers'
    );
    A1.acts['dash-pray']({ dataset: { p: 'fajr' } });
    ok(!(A1.S.prayed['2026-02-19'] || {}).fajr, 'dash-pray rejects excused Fajr');
    /* Starting a second break later preserves the prior break day end timestamp */
    const snap = JSON.parse(A1.exportJSON());
    b1.w.close();

    const b2 = boot('2026-03-19T10:00:00Z', snap.state);
    const A2 = b2.w.A;
    A2.setExcused(true);
    ok(
      A2.breakEndedOn('2026-02-19') && !A2.prayerExcused('2026-02-19', 'dhuhr'),
      'a second break does not revoke the earlier break day prayer eligibility'
    );
    b2.w.close();
  }

  /* 7. OS-blocked notifications reflect Off across Friday, Ramaḍān, Night, and Ḍuḥā while preserving saved prefs */
  {
    let permissionRequests = 0;
    const osEnv = boot('2026-11-27T12:00:00Z', settled, (win) => {
      win.AndroidBridge = {
        notificationState() {
          return JSON.stringify({ granted: false, exact: true });
        },
        requestNotifications() {
          permissionRequests++;
        }
      };
    });
    const oA = osEnv.w.A;
    oA.S.notif.enabled = true;
    oA.S.notif.friday.on = true;
    oA.S.notif.ramadan.suhoor = true;
    oA.S.notif.ramadan.iftar = true;
    ok(oA.remindersOn() === false, 'A.remindersOn() is false when OS denies notification permission');
    visit(osEnv, '#/jumuah');
    ok(
      !osEnv.w.document.querySelector('[data-a="fr-notif"][aria-checked="true"]'),
      'Friday switch shows Off when OS blocks notifications'
    );
    visit(osEnv, '#/ramadan');
    ok(
      !osEnv.w.document.querySelector('[data-a="rm-n"][aria-checked="true"]'),
      'Suḥūr and Ifṭār switches show Off when OS blocks notifications'
    );
    ok(
      oA.S.notif.friday.on === true && oA.S.notif.ramadan.suhoor === true,
      'saved preferences stay intact while OS blocks delivery'
    );
    const salahHtml = visit(osEnv, '#/salah');
    ok(
      /System notifications are blocked\./.test(salahHtml) && /data-a="os-settings"/.test(salahHtml),
      'Ṣalāh shows OS-blocked banner and Settings shortcut when OS denies permission'
    );
    oA.acts.bell({ dataset: { k: 'fajr' } });
    ok(permissionRequests === 0, 'an OS-blocked Ṣalāh bell leaves recovery to system Settings');
    osEnv.w.close();
  }

  /* 8. Jumuʿah fr-prayed works on Friday after Dhuhr, ticks cleanly, and refuses stale clicks after Friday Maghrib */
  {
    const friOk = boot('2026-11-27T14:00:00Z', settled);
    const fA = friOk.w.A;
    visit(friOk, '#/jumuah');
    const v = fA.V.jumuah();
    v.tick(friOk.w.document.getElementById('app'));
    fA.acts['fr-prayed']({ dataset: { d: '2026-11-27' } });
    ok(!!(fA.S.prayed['2026-11-27'] || {}).dhuhr, 'fr-prayed marks Jumuʿah prayed during Friday afternoon');
    ok(!friOk.errors.length, 'Jumuʿah tick runs cleanly on Friday');
    friOk.w.close();

    const satEnv = boot('2026-11-28T10:00:00Z', settled);
    const sA = satEnv.w.A;
    sA.acts['fr-prayed']({ dataset: { d: '2026-11-27' } });
    ok(!(sA.S.prayed['2026-11-27'] || {}).dhuhr, 'fr-prayed ignores stale checkbox taps after Friday Maghrib');
    satEnv.w.close();
  }

  /* 9. Qibla static fallback before sensor sample & after sunset */
  {
    const qEnv = boot('2026-11-28T22:00:00Z', settled); /* night in London */
    visit(qEnv, '#/qibla');
    ok(
      /Face \d+° from true north/.test((qEnv.w.document.getElementById('qmsg') || {}).textContent || ''),
      'Qibla shows static bearing guidance until a real sensor sample arrives'
    );
    qEnv.w.A.acts['q-mode']({ dataset: { v: 'sun' } });
    ok(
      (qEnv.w.document.getElementById('qlbl') || {}).textContent === 'from north',
      'Qibla sun mode shows from north instead of sun at top after sunset'
    );
    qEnv.w.close();
  }

  /* 10. Reader finger-counting timers stay with the item that scheduled them */
  {
    const fEnv = boot('2026-11-28T07:00:00Z', settled);
    const fA = fEnv.w.A;
    const timers = [];
    const origSetTimeout = fEnv.w.setTimeout;
    fEnv.w.setTimeout = function (fn, ms) {
      if (ms >= 400 && ms <= 600) {
        timers.push(fn);
        return timers.length;
      }
      return origSetTimeout.call(this, fn, ms);
    };
    fA.S.prefs.count = 'fingers';
    fA.S.prefs.autoNext = true;
    visit(fEnv, '#/r/morning/0');
    const paceBtn = fEnv.w.document.querySelector('[data-a="pace-tap"]');
    ok(!!paceBtn, 'fingers mode renders pace circle');
    if (paceBtn && paceBtn._pace && paceBtn._pace.onDone) {
      paceBtn._pace.onDone();
      visit(fEnv, '#/r/morning/1');
      visit(fEnv, '#/r/morning/0');
      timers.splice(0).forEach((fn) => fn());
      ok(fEnv.w.location.hash === '#/r/morning/0', 'returning to a Morning item does not revive its old timer');
      visit(fEnv, '#/r/morning/1');
      const nextPaceBtn = fEnv.w.document.querySelector('[data-a="pace-tap"]');
      ok(!!(nextPaceBtn && nextPaceBtn._pace), 'the next Morning item renders a pace circle');
      if (nextPaceBtn && nextPaceBtn._pace) nextPaceBtn._pace.onDone();
      visit(fEnv, '#/r/evening/0');
      timers.splice(0).forEach((fn) => fn());
      ok(fEnv.w.location.hash === '#/r/evening/0', 'finger-counting timer from Morning does not advance Evening');
    }
    fEnv.w.close();
  }

  /* 11. Learn lp-start starts fresh at step 0; Today break snooze hides usualDone; backup merge preserves cycles */
  {
    const nEnv = boot('2026-11-28T09:00:00Z', settled);
    const nA = nEnv.w.A;
    nA.S.learn.last = { p: 'dhuhr', imam: false, short: false, i: 3, n: 10, at: Date.now() };
    visit(nEnv, '#/learn');
    nA.acts['lp-pick']({ dataset: { p: 'dhuhr' } });
    nA.acts['lp-imam']();
    nA.acts['lp-start']();
    nEnv.w.dispatchEvent(new nEnv.w.Event('hashchange'));
    ok(
      nA.S.learn.last && nA.S.learn.last.i === 0 && nA.S.learn.last.imam === true,
      'lp-start resets to step 0 with chosen options'
    );

    nA.S.profile.gender = 'f';
    nA.S.excused.on = true;
    nA.S.excused.since = '2026-11-20';
    nA.S.excused.habit = { len: 7, gap: 28 };
    ok(/Look for the signs of purity/.test(visit(nEnv, '#/')), 'usualDone prompt renders before snooze');
    nA.acts['cyc-later']();
    ok(!/Look for the signs of purity/.test(visit(nEnv, '#/')), 'tapping Not yet snoozes usualDone prompt for today');

    const freshEnv = boot('2026-11-28T09:00:00Z', {});
    ok(freshEnv.w.A.hasLocalBackupData() === false, 'fresh un-onboarded install hasLocalBackupData() is false');
    freshEnv.w.close();

    const backup = JSON.stringify({
      app: 'adhkar',
      state: {
        v: 10,
        profile: { onboarded: true, since: '2026-01-01' },
        counts: {},
        excused: {
          days: { '2026-10-01': 1 },
          cycles: [{ from: '2026-10-01', to: '2026-10-06' }],
          nifas: [{ from: '2026-05-01', to: '2026-06-05' }]
        }
      }
    });
    nA.S.excused.cycles = [{ from: '2026-11-01', to: '2026-11-06' }];
    nA.S.excused.nifas = [];
    nA.importJSON(backup, 'merge');
    ok(
      nA.S.excused.cycles.length === 2 && nA.S.excused.nifas.length === 1,
      'backup merge preserves excused.cycles and excused.nifas'
    );
    ok(nA.V.print().tab === 4 && nA.V.jumuah().tab === 0, 'print and jumuah views preserve active nav tab');
    nEnv.w.close();
  }

  /* 12. Android widgetEvents() checks persisted break history during startup */
  {
    const day = '2026-11-27';
    const state = JSON.parse(JSON.stringify(settled));
    state.profile.gender = 'f';
    state.excused.days[day] = 1;
    state.excused.ended = { [day]: Date.parse(day + 'T13:00:00Z') };
    let queued = JSON.stringify([
      { d: day, p: 'fajr', on: true },
      { d: day, p: 'maghrib', on: true }
    ]);
    const wEnv = boot('2026-11-28T10:00:00Z', state, (win) => {
      win.AndroidBridge = {
        takeWidgetEvents() {
          const out = queued;
          queued = '';
          return out;
        }
      };
    });
    const wA = wEnv.w.A;
    ok(wA.prayerExcused(day, 'fajr'), 'previous-day Fajr before break end is excused');
    ok(!(wA.S.prayed[day] || {}).fajr, 'widgetEvents() refuses to credit an excused previous-day prayer');
    ok(!!(wA.S.prayed[day] || {}).maghrib, 'widgetEvents() credits a previous-day prayer after the break ended');
    wEnv.w.close();
  }
}

setTimeout(function () {
  ok(global.__arEnv.w.__arCheck(), 'the reader is translated in Arabic mode');
  console.log('smoke: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}, 50);
