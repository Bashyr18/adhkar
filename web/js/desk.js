/* Adhkār on a computer, and on a tablet or an opened foldable. Inside the Windows app (windows/shim.js sets
   ADHKAR_DESKTOP) all of it runs. On a phone, a tablet or in a browser only the wide layout runs, and only while the
   screen is at least 600 wide: a tablet, a foldable opened out, a phone turned on its side stays a phone. Folding or
   unfolding switches it as it happens. The computer's own parts (Print and PDF, This computer, the keys, the tray)
   stay on the computer. (For checking the computer's layout in a browser, ?desk turns all of it on with a stand-in
   bridge.)

   What a computer adds, decorating the shared screens rather than replacing them:
   - a side rail instead of the bottom bar: the five areas, the duʿāʾ journal, Print and This computer;
   - Ctrl K: find any remembrance, hadith, page or setting, with the app's own search;
   - the keyboard: Space is the counting circle (tap, or hold to pause), arrows move through the reader, Esc goes back;
   - wide layouts that use the screen;
   - Print and PDF: the morning and evening adhkār as a booklet, and the month's prayer timetable;
   - reminders and the next prayer from the tray, worked out here and rung by the Windows app;
   - This computer: install, start with Windows, the tray, the next-prayer window, text size, backups. */
(function () {
  'use strict';
  var dev = !window.ADHKAR_DESKTOP && /[?&]desk(=|&|$)/.test(location.search);
  /* a tablet or foldable: the wide layout while the screen is wide enough, nothing of the computer's */
  var tab = !window.ADHKAR_DESKTOP && !dev;
  function roomy() {
    return !tab || innerWidth >= 600;
  }
  var A = window.A,
    S = A.S,
    $ = A.$,
    esc = A.esc,
    T = function (s) {
      return A.T ? A.T(s) : s;
    },
    L = function (en, ar) {
      return A.ar && A.ar() ? ar : en;
    };
  var $$ = function (s, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(s));
  };
  if (dev) {
    document.documentElement.classList.add('is-desk');
    window.DeskBridge = new Proxy(
      {},
      {
        get: function (o, k) {
          return k === 'deskInfo'
            ? function () {
                return JSON.stringify({
                  version: 'dev',
                  data: '%LOCALAPPDATA%\\Adhkar',
                  portable: true,
                  backups: [],
                  zoom: 1,
                  documents: 'Documents\\Adhkar'
                });
              }
            : function () {};
        }
      }
    );
  }
  /* on a tablet there is no Windows bridge: a silent stand-in, kept local so nothing else mistakes it for one */
  var B = tab
    ? new Proxy(
        {},
        {
          get: function () {
            return function () {
              return '';
            };
          }
        }
      )
    : window.DeskBridge;
  var Desk = (window.Desk = {});
  function info() {
    try {
      return JSON.parse(B.deskInfo());
    } catch (e) {
      return {};
    }
  }
  var IC = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    pc: '<rect x="2.8" y="4" width="18.4" height="12" rx="2"/><path d="M8.5 20h7M12 16v4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14h6M9 17h4"/>',
    folder: '<path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    kbd: '<rect x="2.8" y="6" width="18.4" height="12" rx="2"/><path d="M6.5 9.5h.01M10 9.5h.01M13.5 9.5h.01M17 9.5h.01M7.5 14.5h9"/>',
    fold: '<path d="M15 6l-6 6 6 6"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    journal:
      '<path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.5v17M9.5 8h5.5M9.5 11.5h5.5"/>',
    restore: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6M12 8v4l3 2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'
  };
  function ic(n, s) {
    if (!IC[n]) return A.icon(n, s || 's');
    return (
      '<svg class="ic" viewBox="0 0 24 24" width="' +
      (s || 20) +
      '" height="' +
      (s || 20) +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      IC[n] +
      '</svg>'
    );
  }
  function kbd(k) {
    return '<kbd>' + esc(k) + '</kbd>';
  }
  var MARK =
    '<svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><defs><linearGradient id="dkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dfaa"/><stop offset="1" stop-color="#b8873a"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="#0b0d16"/><path d="M32 8l6.1 8.2 9.9-2.1-2.1 9.9L54 32l-8.1 6.1 2.1 9.9-9.9-2.1L32 56l-6.1-8.1-9.9 2.1 2.1-9.9L10 32l8.1-6.1-2.1-9.9 9.9 2.1z" fill="none" stroke="url(#dkg)" stroke-width="2.2"/><path d="M32 21l3 4 4.9-1-1 4.9 4 3.1-4 3 1 4.9-4.9-1-3 4-3-4-4.9 1 1-4.9-4-3 4-3.1-1-4.9 4.9 1z" fill="url(#dkg)"/></svg>';

  /* ================= the rail ================= */
  var NAV = [
    ['today', 'Today', 'اليوم', 'home', '#/', ['today']],
    ['adhkar', 'Adhkār', 'الأذكار', 'book', '#/adhkar', ['adhkar', 'c', 'saved', 'search']],
    ['tracker', 'Tracker', 'العدّاد', 'tracker', '#/tracker', ['tracker', 'insights']],
    [
      'salah',
      'Ṣalāh',
      'الصلاة',
      'mosque',
      '#/salah',
      ['salah', 'learn', 'qibla', 'month', 'night', 'duha', 'qada', 'calendar', 'ramadan', 'location']
    ],
    ['journal', 'Duʿāʾ', 'الدعاء', null, '#/journal', ['journal', 'answered', 'deeds', 'modesty']],
    ['profile', 'You', 'أنت', 'user', '#/profile', ['profile', 'settings']]
  ];
  var rail = document.createElement('aside');
  rail.id = 'rail';
  var mini = false;
  try {
    mini = localStorage.getItem('adhkar.rail') === 'mini';
  } catch (e) {}
  var BARE = { welcome: 1 };
  function drawRail() {
    var r = A.route(),
      dark = document.documentElement.dataset.theme === 'dark';
    rail.setAttribute('aria-label', 'Adhkār');
    rail.innerHTML =
      '<div class="rl-sky" style="--sky:' +
      sky(Date.now()) +
      '"><div class="rl-top"><a class="rl-brand" href="#/" aria-label="Adhkār">' +
      MARK +
      '<span class="rl-word"><b>Adhkār</b><small lang="ar" dir="rtl">أذكار</small></span></a><button class="rl-fold" data-desk="fold" title="' +
      esc(L(mini ? 'Widen the rail' : 'Narrow the rail', mini ? 'وسّع الشريط' : 'ضيّق الشريط')) +
      '">' +
      ic('fold', 18) +
      '</button></div>' +
      dates() +
      '</div>' +
      '<button class="rl-search" data-desk="palette" title="' +
      esc(L('Search or jump', 'ابحث أو انتقل')) +
      '">' +
      ic('search', 18) +
      '<span>' +
      esc(L('Search or jump', 'ابحث أو انتقل')) +
      '</span>' +
      (tab ? '' : kbd('Ctrl K')) +
      '</button><nav class="rl-nav">' +
      NAV.map(function (n, i) {
        var on = n[5].indexOf(r.name) >= 0 || (r.name === 'r' && i === 1);
        return (
          '<a class="rl-i' +
          (on ? ' on' : '') +
          '" href="' +
          n[4] +
          '" title="' +
          esc(L(n[1], n[2])) +
          ' · Ctrl ' +
          (i + 1) +
          '"' +
          (on ? ' aria-current="page"' : '') +
          '>' +
          (n[3] ? A.icon(n[3], 's') : ic('journal', 20)) +
          '<span>' +
          esc(L(n[1], n[2])) +
          '</span></a>'
        );
      }).join('') +
      '</nav>' +
      (tab
        ? ''
        : '<div class="rl-sec">' +
          esc(L('On this computer', 'على هذا الحاسوب')) +
          '</div><nav class="rl-nav">' +
          '<a class="rl-i' +
          (r.raw === 'desk/print' ? ' on' : '') +
          '" href="#/desk/print">' +
          ic('print', 20) +
          '<span>' +
          esc(L('Print and PDF', 'الطباعة وPDF')) +
          '</span></a>' +
          '<a class="rl-i' +
          (r.raw === 'desk/pc' ? ' on' : '') +
          '" href="#/desk/pc">' +
          ic('pc', 20) +
          '<span>' +
          esc(L('This computer', 'هذا الحاسوب')) +
          '</span></a></nav>') +
      '<div class="grow"></div>' +
      '<div class="up-chip-slot rl-up">' +
      (A.upd ? A.upd.chip() : '') +
      '</div>' +
      '<div class="rl-next" id="rl-next"></div>' +
      '<div class="rl-foot"><button class="rl-tool" data-desk="theme" title="' +
      esc(L('Day or night', 'نهار أو ليل')) +
      ' · Ctrl Shift L">' +
      ic(dark ? 'sun' : 'moon', 19) +
      '<span>' +
      esc(dark ? L('Day', 'نهار') : L('Night', 'ليل')) +
      '</span></button>' +
      (tab
        ? ''
        : '<button class="rl-tool" data-desk="keys" title="' +
          esc(L('Keyboard shortcuts', 'اختصارات لوحة المفاتيح')) +
          ' · F1">' +
          ic('kbd', 19) +
          '<span>' +
          esc(L('Keys', 'المفاتيح')) +
          '</span></button>') +
      '</div>';
    paintNext();
  }
  function placeRail() {
    var name = A.route().name,
      root = document.documentElement,
      wideOk = roomy();
    var show = wideOk && !BARE[name] && !!(S.profile && S.profile.onboarded);
    if (tab) {
      root.classList.toggle('is-desk', wideOk);
      root.classList.toggle('is-tab', wideOk);
    }
    if (!rail.parentNode) document.body.insertBefore(rail, document.body.firstChild);
    root.classList.toggle('has-rail', show);
    /* a tablet in portrait or a foldable opened out keeps the rail to its icons, leaving the page the room */
    root.classList.toggle('rail-mini', show && (mini || (tab && innerWidth < 1000)));
    if (show) drawRail();
  }
  rail.addEventListener('click', function (e) {
    var b = e.target.closest('[data-desk]');
    if (!b) return;
    var k = b.dataset.desk;
    if (k === 'palette') Desk.palette();
    else if (k === 'keys') Desk.keys();
    else if (k === 'theme') theme();
    else if (k === 'fold') {
      mini = !mini;
      try {
        localStorage.setItem('adhkar.rail', mini ? 'mini' : 'wide');
      } catch (x) {}
      placeRail();
    }
  });
  function theme() {
    S.prefs.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    A.save(true);
    A.applyTheme();
    A.rerender();
  }

  /* ================= after every screen ================= */
  var TITLES = {
    today: 'Today',
    adhkar: 'Adhkār',
    tracker: 'Tracker',
    salah: 'Ṣalāh',
    profile: 'You',
    journal: 'Duʿāʾ'
  };
  function after() {
    placeRail();
    if (!roomy()) return;
    var r = A.route(),
      h1 = $('.view h1'),
      sub = TITLES[r.name] ? T(TITLES[r.name]) : h1 ? h1.textContent.trim() : '';
    document.title = ['Adhkār', sub].filter(Boolean).join(' · ');
    try {
      B.titleBar(document.documentElement.dataset.theme || 'dark');
    } catch (e) {}
    wide();
    placeDayBand();
    sessionPane();
  }
  /* a wide window, filled: the tab pages lay their cards out in two balanced columns */
  var COLS = {
    today: 1,
    profile: 1,
    salah: 1,
    tracker: 1,
    journal: 1,
    deeds: 1,
    insights: 1,
    learn: 1,
    answered: 1,
    night: 1,
    duha: 1,
    qada: 1,
    ramadan: 1,
    jumuah: 1,
    calendar: 1,
    qibla: 1
  };
  /* the page's key: a lesson or the quiz inside Learn are pages of their own, never split like Learn itself */
  function pageKey() {
    var r = A.route();
    return r.name === 'learn' && r.a.length ? 'learn/' + r.a[0] : r.name;
  }
  /* any block may start the right column, except one straight after its heading (a heading stays with what it
     heads); balance() then takes the split that leaves the columns closest in height */
  function auto(v) {
    var flat = [];
    [].slice.call(v.children).forEach(function (e) {
      if (/\bdk-c[ab]\b/.test(e.className)) flat = flat.concat([].slice.call(e.children));
      else if (!across(e)) flat.push(e);
    });
    return flat.filter(function (e, i) {
      return i > 0 && !flat[i - 1].classList.contains('sec');
    });
  }
  /* Some pages are laid out on purpose rather than poured into columns: a left and a right column, with the header
     (and any .dk-span row) across both. Each names the block that starts its right column; what comes before it is
     the left. The split is applied again whenever the app redraws the page. */
  var direct = function (v, el) {
    while (el && el.parentElement && el.parentElement !== v && !/\bdk-c[ab]\b/.test(el.parentElement.className))
      el = el.parentElement;
    return el;
  };
  var SPLIT = {
    tracker: function (v) {
      return v.querySelector('.trk-day') && direct(v, v.querySelector('.trk-day')).previousElementSibling;
    },
    salah: function (v) {
      return v.querySelector('.lp-entry') ? direct(v, v.querySelector('.lp-entry')) : null;
    },
    /* the achievements under the profile; the settings on their own on the right */
    /* the right column starts at Achievements or at Settings, whichever leaves the two columns closest in height:
       a sister's break days make the left side long, so the achievements move across */
    profile: function (v) {
      var m = v.querySelector('.medals'),
        st = v.querySelector('a.set');
      return [m && direct(v, m).previousElementSibling, st && direct(v, st).previousElementSibling].filter(Boolean);
    },
    learn: auto,
    answered: auto,
    night: auto,
    duha: auto,
    qada: auto,
    ramadan: auto,
    jumuah: auto,
    calendar: auto,
    qibla: auto,
    journal: function (v) {
      var n = v.querySelector('[data-a="dua-nudge"]');
      return n ? direct(v, n).previousElementSibling : null;
    }
  };
  var across = function (e) {
    return e.matches('header.top, .back, .dk-day, .dk-span');
  };
  /* of several places the right column could start, the one that leaves the two columns closest in height */
  function balance(flat, cands) {
    var hs = flat.map(function (e) {
        return across(e) ? 0 : e.getBoundingClientRect().height + 14;
      }),
      best = null,
      diff = Infinity,
      sum = function (l) {
        return l.reduce(function (x, y) {
          return x + y;
        }, 0);
      };
    cands.forEach(function (c) {
      var i = flat.indexOf(c);
      if (i < 0) return;
      var d = Math.abs(sum(hs.slice(0, i)) - sum(hs.slice(i)));
      if (d < diff) {
        diff = d;
        best = c;
      }
    });
    return best;
  }
  function lay(v, name) {
    var f = SPLIT[name],
      ca = v.querySelector(':scope > .dk-ca'),
      cb = v.querySelector(':scope > .dk-cb'),
      kids = [].slice.call(v.children);
    /* a page without a split, never laid out in columns: nothing to do (and nothing to move, which would wake the
       observer that called this) */
    if (!f && !ca && !cb) return;
    var stray = kids.filter(function (e) {
      return e !== ca && e !== cb && !across(e);
    });
    var flat = [];
    kids.forEach(function (e) {
      if (e === ca || e === cb) flat = flat.concat([].slice.call(e.children));
      else flat.push(e);
    });
    if (ca && cb && !stray.length) {
      /* already laid out: measured now in its final columns, move the split only if another balances better */
      var c0 = f && f(v);
      if (!c0 || c0.length === undefined) return;
      var b0 = balance(flat, c0);
      if (!b0 || b0 === cb.firstElementChild) return;
    }
    if (ca) ca.remove();
    if (cb) cb.remove();
    v.classList.remove('dk-two');
    /* every block back in the page, in order, so each can be measured (only those not already there) */
    flat.forEach(function (e) {
      if (e.parentElement !== v) v.appendChild(e);
    });
    var split = f && f(v);
    if (split && split.length !== undefined) split = b0 || balance(flat, split);
    if (!split) {
      /* back to one flow, in the original order */
      flat.forEach(function (e) {
        v.appendChild(e);
      });
      return;
    }
    ca = document.createElement('div');
    ca.className = 'dk-ca';
    cb = document.createElement('div');
    cb.className = 'dk-cb';
    var side = ca;
    flat.forEach(function (e) {
      if (across(e)) return;
      if (e === split) side = cb;
      side.appendChild(e);
    });
    v.appendChild(ca);
    v.appendChild(cb);
    v.classList.add('dk-two');
  }

  /* the Tracker, on a computer: the last seven days of remembrance under the counter, from the tracker's own record */
  var DAY_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function dayName(k, short) {
    if (A.ar && A.ar()) return DAY_AR[A.dow(k)];
    var n = A.DOW[A.dow(k)];
    return short ? n.slice(0, 3) : n;
  }
  function week() {
    var days = [],
      max = 1,
      sum = 0,
      best = null;
    for (var i = 6; i >= 0; i--) {
      var k = A.shift(A.today(), -i),
        n = (S.tasbih.days && S.tasbih.days[k]) || 0;
      days.push([k, n]);
      max = Math.max(max, n);
      sum += n;
      if (n && (!best || n > best[1])) best = [k, n];
    }
    return (
      '<div class="card dk-week' +
      (sum ? '' : ' dk-week-none') +
      '" data-sig="' +
      days.join(';') +
      '"><div class="dk-week-h"><div><div class="eyebrow">' +
      esc(T('This week')) +
      '</div><div class="dk-week-n"><b class="num">' +
      A.fmtN(sum) +
      '</b><span>' +
      esc(L('remembrances', 'ذكرًا')) +
      '</span></div></div>' +
      (best
        ? '<div class="dk-week-b"><span>' +
          esc(L('Strongest day', 'أقوى يوم')) +
          '</span><b>' +
          esc(dayName(best[0])) +
          '</b></div>'
        : '<a class="dk-week-go" href="#/tracker">' + esc(L('Open the tracker', 'افتح العدّاد')) + '</a>') +
      '</div>' +
      (sum
        ? ''
        : '<p class="dk-week-e">' +
          esc(L('Each glorification you count fills in its day here.', 'كل تسبيحة تعدّها تملأ يومها هنا.')) +
          '</p>') +
      '<div class="dk-bars">' +
      days
        .map(function (d, j) {
          return (
            '<div class="dk-bar' +
            (j === 6 ? ' on' : '') +
            (d[1] ? '' : ' zero') +
            '"><b class="num">' +
            (d[1] ? A.fmtN(d[1]) : '·') +
            '</b><i style="height:' +
            Math.max(4, Math.round((d[1] / max) * 100)) +
            '%"></i><span>' +
            esc(j === 6 ? L('Today', 'اليوم') : dayName(d[0], true)) +
            '</span></div>'
          );
        })
        .join('') +
      '</div></div>'
    );
  }
  /* My duʿāʾs, on a computer: today's times of answered duʿāʾ in order, the one now or next marked */
  function answerRow() {
    if (!S.loc || !window.Prayer) return '';
    var P = window.Prayer,
      MIN = 60000,
      k = A.today(),
      t = A.pday(k),
      y = A.pday(A.shift(k, -1)),
      now = Date.now(),
      list = [{ t: T('The last third of the night'), a: y.lastThird, b: t.fajr, ic: 'moon' }];
    A.PRAYERS.forEach(function (p) {
      var end = S.iqama && S.iqama.on && A.iqamaAt ? A.iqamaAt(k, p) : t[p] + 20 * MIN;
      list.push({ t: T(P.NAMES[p]), s: L('After the adhān', 'بعد الأذان'), a: t[p], b: end, ic: 'mosque' });
      if (p === 'asr' && A.dow(k) === 5)
        list.push({ t: T('The last hour of Friday'), a: t.maghrib - 60 * MIN, b: t.maghrib, ic: 'spark' });
    });
    list.push({
      t: L('Tonight', 'الليلة'),
      s: T('The last third of the night'),
      a: t.lastThird,
      b: A.pday(A.shift(k, 1)).fajr,
      ic: 'moon'
    });
    var next = null;
    list.forEach(function (x) {
      x.st = now >= x.b ? 'past' : now >= x.a ? 'now' : '';
      if (!x.st && !next) next = x;
    });
    if (next) next.st = 'next';
    return (
      '<div class="dk-span dk-ans" data-sig="' +
      list
        .map(function (x) {
          return x.st;
        })
        .join(',') +
      '"><div class="dk-ans-h"><span class="eyebrow">' +
      esc(L('The times of answer, today', 'أوقات الإجابة اليوم')) +
      '</span><a class="faint small" href="#/answered">' +
      esc(L('The evidence', 'الأدلة')) +
      '</a></div><div class="dk-ans-row">' +
      list
        .map(function (x) {
          return (
            '<div class="dk-ans-t ' +
            x.st +
            '">' +
            A.icon(x.ic, 'xs') +
            '<b>' +
            esc(x.t) +
            '</b><span>' +
            esc(x.s || '') +
            '</span><em class="num">' +
            A.fmtT(x.a) +
            '</em>' +
            (x.st === 'now'
              ? '<i>' + esc(L('Now', 'الآن')) + '</i>'
              : x.st === 'next'
                ? '<i>' + esc(L('Next', 'التالي')) + '</i>'
                : '') +
            '</div>'
          );
        })
        .join('') +
      '</div></div>'
    );
  }
  /* This computer: its cards dealt into two columns by height, so neither column ends with a hole */
  function deal(g) {
    if (!g) return;
    var want = g.clientWidth >= 1180 ? 3 : 2;
    if (g.dataset.cols && +g.dataset.cols !== want) {
      var back = [];
      [].slice.call(g.querySelectorAll(':scope > .dk-gc')).forEach(function (c) {
        back = back.concat([].slice.call(c.children));
      });
      g.innerHTML = '';
      back.forEach(function (c) {
        g.appendChild(c);
      });
    }
    var cols = g.querySelectorAll(':scope > .dk-gc'),
      stray = [].slice.call(g.children).filter(function (e) {
        return !e.classList.contains('dk-gc');
      });
    if (cols.length === want && !stray.length) return;
    var cards = [];
    [].slice.call(g.children).forEach(function (e) {
      if (e.classList.contains('dk-gc')) cards = cards.concat([].slice.call(e.children));
      else cards.push(e);
    });
    var hs = cards.map(function (c) {
      return c.offsetHeight;
    });
    g.innerHTML = '';
    var col = [],
      h = [];
    for (var k = 0; k < want; k++) {
      col.push(document.createElement('div'));
      col[k].className = 'dk-gc';
      h.push(0);
    }
    cards.forEach(function (c, i) {
      var m = h.indexOf(Math.min.apply(null, h));
      col[m].appendChild(c);
      h[m] += hs[i];
    });
    col.forEach(function (c) {
      g.appendChild(c);
    });
    g.dataset.cols = want;
    g.style.setProperty('--cols', want);
    g.classList.add('dealt');
  }
  function wide() {
    var v = $('#app > .view'),
      name = pageKey();
    if (!v) return;
    v.classList.toggle('dk-wide', !!COLS[name]);
    /* the quiz on a computer: a centred stage, the answers two by two, and the keys to answer with */
    v.classList.toggle('dk-quiz', name === 'learn/quiz');
    /* a collection: its scene across the top, the remembrances in two columns beneath */
    v.classList.toggle('dk-coll', name === 'c');
    /* Learn: the hadith it begins with goes across both columns */
    if (name === 'learn') {
      var lead = v.querySelector('.lp-lead');
      if (lead) lead.classList.add('dk-span');
    }
    /* the library: the two sessions side by side at a calmer height, the collections in a grid */
    v.classList.toggle('dk-lib', name === 'adhkar');
    if (name === 'tracker') {
      /* the phrases go across the whole page under the header, where they fit on a line or two */
      var chips = v.querySelector('.trk .trk-chips'),
        head = v.querySelector(':scope > header.top');
      if (chips && head) {
        [].slice.call(v.querySelectorAll(':scope > .trk-chips')).forEach(function (o) {
          o.remove();
        });
        chips.classList.add('dk-span');
        head.insertAdjacentElement('afterend', chips);
      }
      var trk = v.querySelector('.trk'),
        wk = v.querySelector('.dk-week'),
        html = trk ? week() : '';
      if (trk && (!wk || wk.dataset.sig !== /data-sig="([^"]*)"/.exec(html)[1])) {
        if (wk) wk.outerHTML = html;
        else trk.insertAdjacentHTML('afterend', html);
      }
    }
    /* You: this week's remembrance under the Insights link, so the profile side carries real figures too */
    if (name === 'profile') {
      var ins = v.querySelector('a[href="#/insights"]'),
        pw = v.querySelector('.dk-week'),
        ph = ins ? week() : '';
      if (ins && (!pw || pw.dataset.sig !== /data-sig="([^"]*)"/.exec(ph)[1])) {
        if (pw) pw.outerHTML = ph;
        else ins.insertAdjacentHTML('afterend', ph);
      }
    }
    if (name === 'journal') {
      var top = v.querySelector(':scope > header.top'),
        an = v.querySelector('.dk-ans'),
        row = answerRow(),
        sig = /data-sig="([^"]*)"/.exec(row);
      if (top && row && (!an || an.dataset.sig !== sig[1])) {
        if (an) an.outerHTML = row;
        else top.insertAdjacentHTML('afterend', row);
      }
    }
    lay(v, SPLIT[name] && COLS[name] ? name : '');
    /* a second look once the page has settled (images, fonts, the entrance), when the heights are the real ones */
    if (SPLIT[name] && COLS[name])
      setTimeout(function () {
        if ($('#app > .view') === v) lay(v, name);
      }, 450);
    deal(v.querySelector('.dk-grid'));
  }
  /* a window made wider or narrower: the columns are balanced again */
  var wasRoomy = roomy(),
    wasMini = innerWidth < 1000;
  addEventListener('resize', function () {
    /* a foldable opened or closed, a tablet turned: the layout follows at once */
    if (tab && (roomy() !== wasRoomy || innerWidth < 1000 !== wasMini)) {
      wasRoomy = roomy();
      wasMini = innerWidth < 1000;
      A.rerender();
      return;
    }
    clearTimeout(wide._r);
    wide._r = setTimeout(function () {
      var v = $('#app > .view'),
        n = pageKey();
      if (v && SPLIT[n] && COLS[n]) lay(v, n);
      if (v) deal(v.querySelector('.dk-grid'));
    }, 250);
  });
  /* the quiz from the keyboard: 1 to 4 choose an answer, Enter goes on */
  addEventListener('keydown', function (e) {
    if (pageKey() !== 'learn/quiz' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    var opts = [].slice.call(document.querySelectorAll('#app .qz-opt:not([disabled])'));
    if (/^[1-4]$/.test(e.key) && opts[+e.key - 1]) {
      e.preventDefault();
      opts[+e.key - 1].click();
    } else if (e.key === 'Enter') {
      var nx = document.querySelector('#app [data-a="qz-next"]');
      if (nx) {
        e.preventDefault();
        nx.click();
      }
    }
  });
  /* the times of answer move on through the day */
  setInterval(function () {
    if (A.route().name === 'journal') wide();
  }, 60000);
  /* the page is laid out for the computer in the observer itself, which runs before the browser paints: a page
     redrawn after a tap or a toggle is never shown for a frame in its phone layout first (that frame was a flash) */
  var screens = new MutationObserver(function () {
    after();
  });
  var apply0 = A.applyTheme;
  A.applyTheme = function () {
    apply0();
    if (document.body) {
      try {
        B.titleBar(document.documentElement.dataset.theme || 'dark');
      } catch (e) {}
      if (rail.parentNode && document.documentElement.classList.contains('has-rail')) drawRail();
      /* the pill follows the theme at once */
      setTimeout(nextToHost, 60);
    }
  };

  /* ================= the keyboard ================= */
  function typing(e) {
    var t = e.target;
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }
  function visible(el) {
    return el && el.offsetParent && !el.disabled;
  }
  function circle() {
    return $$('.reader .pace, .trk-pace .pace, .ct-circ .pace, .view .pace').filter(visible)[0];
  }
  var spaceDown = null;
  document.addEventListener('keydown', function (e) {
    var k = e.key,
      ctrl = e.ctrlKey || e.metaKey;
    if (pal) return; /* the search box has its own keys */
    if (ctrl && (k === 'k' || k === 'K')) {
      e.preventDefault();
      Desk.palette();
      return;
    }
    if (k === 'F1' || (k === '?' && !typing(e))) {
      e.preventDefault();
      Desk.keys();
      return;
    }
    if (!tab && k === 'F11') {
      e.preventDefault();
      B.deskSet('full', !document.documentElement.classList.contains('dk-full'));
      return;
    }
    if (!tab && ctrl && (k === '=' || k === '+')) {
      e.preventDefault();
      zoom(0.1);
      return;
    }
    if (!tab && ctrl && k === '-') {
      e.preventDefault();
      zoom(-0.1);
      return;
    }
    if (!tab && ctrl && k === '0') {
      e.preventDefault();
      B.deskZoom(1);
      return;
    }
    if (ctrl && e.shiftKey && (k === 'l' || k === 'L')) {
      e.preventDefault();
      theme();
      return;
    }
    if (!tab && ctrl && (k === 'p' || k === 'P')) {
      e.preventDefault();
      A.go('#/desk/print');
      return;
    }
    if (!tab && ctrl && k === ',') {
      e.preventDefault();
      A.go('#/desk/pc');
      return;
    }
    if (!tab && ctrl && (k === 'q' || k === 'Q')) {
      e.preventDefault();
      B.quit();
      return;
    }
    if (ctrl && /^[1-6]$/.test(k)) {
      e.preventDefault();
      A.go(NAV[+k - 1][4]);
      return;
    }
    if (typing(e) || ctrl || e.altKey) return;
    /* Space is the counting circle: a tap moves on, holding pauses, exactly as a finger on the phone */
    if (k === ' ') {
      var c = circle();
      if (!c) return;
      e.preventDefault();
      if (e.repeat || spaceDown) return;
      spaceDown = c;
      c.classList.add('kpress');
      c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      return;
    }
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      var rd = $('.reader');
      if (!rd || !visible(rd)) return;
      var fwd = (k === 'ArrowLeft') === (document.documentElement.dir === 'rtl');
      var btn = $$(
        fwd ? '.reader [data-a="rd-next"], .reader .rd-next' : '.reader [data-a="rd-prev"], .reader .rd-prev',
        document
      ).filter(visible)[0];
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    }
  });
  document.addEventListener('keyup', function (e) {
    if (e.key !== ' ' || !spaceDown) return;
    var c = spaceDown;
    spaceDown = null;
    c.classList.remove('kpress');
    c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    c.click();
    setTimeout(sessionPane, 250);
  });
  function zoom(d) {
    var z = info().zoom || 1;
    z = Math.max(0.7, Math.min(2, Math.round((z + d) * 10) / 10));
    B.deskZoom(z);
    A.toast(L('Size', 'الحجم') + ' ' + A.fmtN(Math.round(z * 100)) + '%');
  }
  Desk.keys = function () {
    var row = function (k, en, ar) {
      return '<div class="dk-k"><span>' + k + '</span><b>' + esc(L(en, ar)) + '</b></div>';
    };
    A.sheet(
      L('Keyboard', 'لوحة المفاتيح'),
      '<div class="dk-keys"><h4>' +
        esc(L('Anywhere', 'في كل مكان')) +
        '</h4>' +
        row(kbd('Ctrl') + kbd('K'), 'Search or jump to anything', 'ابحث أو انتقل إلى أي شيء') +
        row(
          kbd('Ctrl') + kbd('1') + '…' + kbd('6'),
          'Today, Adhkār, Tracker, Ṣalāh, Duʿāʾ, You',
          'اليوم، الأذكار، العدّاد، الصلاة، الدعاء، أنت'
        ) +
        row(kbd('Esc'), 'Close, or go back', 'أغلق أو ارجع') +
        row(kbd('Ctrl') + kbd('P'), 'Print and PDF', 'الطباعة وPDF') +
        row(
          kbd('Ctrl') + kbd('+') + ' ' + kbd('−') + ' ' + kbd('0'),
          'Bigger, smaller, as it was',
          'أكبر، أصغر، كما كان'
        ) +
        row(kbd('Ctrl') + kbd('Shift') + kbd('L'), 'Day or night', 'نهار أو ليل') +
        row(kbd('F11'), 'Full screen', 'ملء الشاشة') +
        row(kbd('Ctrl') + kbd(','), 'This computer', 'هذا الحاسوب') +
        '<h4>' +
        esc(L('Counting', 'العدّ')) +
        '</h4>' +
        row(kbd('Space'), 'Tap the circle as you finish each one', 'انقر الدائرة كلما أتممت واحدة') +
        row(
          kbd('Space') + ' ' + esc(L('held', 'مع الضغط')),
          'Pause, and hold again to carry on',
          'إيقاف مؤقت، واضغط مطولًا للمتابعة'
        ) +
        row(kbd('←') + ' ' + kbd('→'), 'Previous and next in the reader', 'السابق والتالي في القارئ') +
        '</div>'
    );
  };

  /* ================= Ctrl K: the app's own search, plus the places and actions ================= */
  var pal = null;
  function places() {
    var out = [];
    NAV.forEach(function (n, i) {
      out.push({
        g: L('Go to', 'انتقل إلى'),
        ic: n[3] ? A.icon(n[3], 's') : ic('journal'),
        t: L(n[1], n[2]),
        s: 'Ctrl ' + (i + 1),
        run: function () {
          A.go(n[4]);
        },
        w: (n[1] + ' ' + n[2] + ' ' + n[0]).toLowerCase()
      });
    });
    [
      ['Morning adhkār', 'أذكار الصباح', '#/c/morning', 'sunrise'],
      ['Evening adhkār', 'أذكار المساء', '#/c/evening', 'moon'],
      ['Print and PDF', 'الطباعة وPDF', '#/desk/print', null],
      ['This computer', 'هذا الحاسوب', '#/desk/pc', null]
    ].forEach(function (p) {
      out.push({
        g: L('Go to', 'انتقل إلى'),
        ic: p[3] ? A.icon(p[3], 's') : ic(p[2] === '#/desk/pc' ? 'pc' : 'print'),
        t: L(p[0], p[1]),
        s: '',
        run: function () {
          A.go(p[2]);
        },
        w: (p[0] + ' ' + p[1]).toLowerCase()
      });
    });
    out.push({
      g: L('Actions', 'إجراءات'),
      ic: ic(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'),
      t: L('Day or night', 'نهار أو ليل'),
      s: 'Ctrl Shift L',
      run: theme,
      w: 'theme dark light day night'
    });
    out.push({
      g: L('Actions', 'إجراءات'),
      ic: ic('kbd'),
      t: L('Keyboard shortcuts', 'اختصارات لوحة المفاتيح'),
      s: 'F1',
      run: Desk.keys,
      w: 'keys keyboard help'
    });
    return out;
  }
  Desk.palette = function () {
    if (pal) {
      closePal();
      return;
    }
    var base = places(),
      sel = 0,
      shown = [];
    pal = document.createElement('div');
    pal.className = 'dk-pal';
    pal.setAttribute('role', 'dialog');
    pal.setAttribute('aria-modal', 'true');
    pal.setAttribute('aria-label', L('Search', 'بحث'));
    pal.innerHTML =
      '<div class="dk-pal-bg"></div><div class="dk-pal-box"><label class="dk-pal-in">' +
      ic('search', 20) +
      '<input id="pal-q" role="combobox" aria-expanded="true" aria-controls="pal-l" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="' +
      esc(L('Search adhkār, hadith, pages, settings…', 'ابحث في الأذكار والأحاديث والصفحات والإعدادات…')) +
      '">' +
      kbd('Esc') +
      '</label><div class="dk-pal-list" id="pal-l" role="listbox"></div><div class="dk-pal-foot">' +
      kbd('↑') +
      kbd('↓') +
      '<span>' +
      esc(L('move', 'تنقّل')) +
      '</span>' +
      kbd('Enter') +
      '<span>' +
      esc(L('open', 'افتح')) +
      '</span></div></div>';
    document.body.appendChild(pal);
    var q = $('#pal-q', pal),
      list = $('#pal-l', pal);
    function found(s) {
      if (!s || !A.searchAll) return [];
      var KIND = {
        dhikr: L('Adhkār', 'الأذكار'),
        hadith: L('Hadith', 'الأحاديث'),
        quran: L('Qurʾān', 'القرآن'),
        page: L('Pages', 'الصفحات'),
        setting: L('Settings', 'الإعدادات')
      };
      return A.searchAll(s)
        .list.slice(0, 30)
        .map(function (x) {
          var d = x.d;
          return {
            g: KIND[d.k] || d.k,
            ic: A.icon(d.icon || (d.k === 'dhikr' ? 'book' : d.k === 'setting' ? 'gear' : 'text'), 's'),
            t: d.t,
            s: d.s || '',
            run: function () {
              if (d.k === 'hadith' || d.k === 'quran') A.sheet(d.t, A.said(d.key, '', true));
              else if (d.act && A.acts[d.act]) A.acts[d.act]();
              else if (d.href) A.go(d.href);
            }
          };
        });
    }
    function draw() {
      var s = q.value.trim(),
        low = s.toLowerCase();
      var mine = base.filter(function (e) {
        return !low || e.w.indexOf(low) >= 0;
      });
      shown = (low ? mine.slice(0, 4) : mine).concat(found(s));
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      var last = null;
      list.innerHTML = shown.length
        ? shown
            .map(function (e, i) {
              var head = e.g !== last ? '<div class="dk-pal-g">' + esc(e.g) + '</div>' : '';
              last = e.g;
              return (
                head +
                '<button id="pal-o-' +
                i +
                '" class="dk-pal-i' +
                (i === sel ? ' on' : '') +
                '" data-i="' +
                i +
                '" role="option" aria-selected="' +
                (i === sel) +
                '"><span class="dk-pal-ic">' +
                e.ic +
                '</span><span class="grow"><b>' +
                esc(e.t) +
                '</b>' +
                (e.s ? '<small>' + esc(e.s) + '</small>' : '') +
                '</span></button>'
              );
            })
            .join('')
        : '<p class="dk-pal-none">' + esc(L('Nothing by that name', 'لا شيء بهذا الاسم')) + '</p>';
      var on = $('.dk-pal-i.on', list);
      if (on) {
        q.setAttribute('aria-activedescendant', on.id);
        on.scrollIntoView({ block: 'nearest' });
      } else q.removeAttribute('aria-activedescendant');
    }
    function run(i) {
      var e = shown[i];
      if (!e) return;
      closePal();
      setTimeout(e.run, 10);
    }
    var t = 0;
    q.addEventListener('input', function () {
      sel = 0;
      clearTimeout(t);
      t = setTimeout(draw, 70);
    });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        sel = Math.min(shown.length - 1, sel + 1);
        draw();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        sel = Math.max(0, sel - 1);
        draw();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        run(sel);
      } else if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K'))) {
        e.preventDefault();
        closePal();
      }
    });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.dk-pal-i');
      if (b) run(+b.dataset.i);
    });
    $('.dk-pal-bg', pal).onclick = closePal;
    draw();
    requestAnimationFrame(function () {
      if (pal) pal.classList.add('on');
      q.focus();
    });
  };
  function closePal() {
    if (!pal) return;
    var p = pal;
    pal = null;
    p.classList.remove('on');
    setTimeout(function () {
      p.remove();
    }, 160);
  }
  /* Esc on a page with nothing open goes back, as the phone's back gesture does */
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key !== 'Escape' || pal || typing(e)) return;
      if ($('.sheet:not(.out)')) return; /* the app closes its own sheets */
      if (A.readerOpen && A.readerOpen()) return;
      if (A.route().name !== 'today') {
        e.preventDefault();
        A.goBack('#/');
      }
    },
    false
  );

  /* ================= the next prayer and the reminders, for the Windows app to ring ================= */
  var PN = {
    fajr: ['Fajr', 'الفجر'],
    sunrise: ['Sunrise', 'الشروق'],
    dhuhr: ['Dhuhr', 'الظهر'],
    asr: ['ʿAṣr', 'العصر'],
    maghrib: ['Maghrib', 'المغرب'],
    isha: ['ʿIshāʾ', 'العشاء']
  };
  function pname(k, at) {
    if (k === 'dhuhr' && at && A.dow(A.keyAt(at)) === 5) return A.T(A.pName('dhuhr', A.keyAt(at)));
    var n = PN[k] || [k, k];
    return L(n[0], n[1]);
  }
  function paintNext() {
    var box = $('#rl-next');
    if (!box) return;
    var n = A.now();
    if (!n.next || !n.next.at) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML =
      '<a href="#/salah" class="rl-nx">' +
      ic('clock', 18) +
      '<span class="grow"><small>' +
      esc(L('Next', 'القادمة')) +
      '</small><b>' +
      esc(pname(n.next.k, n.next.at)) +
      '</b></span><span class="rl-nx-t">' +
      A.fmtT(n.next.at) +
      '</span></a>';
  }
  function nextToHost() {
    if (tab) return; /* the tray, the pill and the reminders are the Windows app's */
    var n = A.now();
    if (!n.next || !n.next.at) return;
    try {
      B.deskNext(pname(n.next.k, n.next.at), n.next.at, A.fmtTxt(n.next.at));
    } catch (e) {}
    if (B.deskPill && A.paintPill) {
      var info = pillInfo(n),
        sig = JSON.stringify(info) + document.documentElement.dataset.theme;
      /* repaint only when something on it changes (the countdown ticks in the Windows app) */
      if (sig === Desk._pillSig) return;
      Desk._pillSig = sig;
      A.paintPill(info).then(function (o) {
        try {
          B.deskPill(JSON.stringify(o));
        } catch (e) {}
      });
    }
  }
  /* the pill's lines, in the app's language: the next prayer, the Friday hour, the adhkār of the day, a planned fast */
  var PAR = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
  function pillInfo(n) {
    var k = A.today(),
      nk = n.next.k,
      sess = A.sessionNow && A.sessionNow(),
      o = {
        lang: A.ar() ? 'ar' : 'en',
        kicker: nk === 'sunrise' ? L('FAJR ENDS', 'ينتهي الفجر') : L('NEXT PRAYER', 'الصلاة القادمة'),
        name: pname(nk, n.next.at),
        nameAr: nk === 'dhuhr' && A.dow(A.keyAt(n.next.at)) === 5 ? 'الجمعة' : PAR[nk] || '',
        time: L('at ', '') + A.fmtTxt(n.next.at),
        at: n.next.at,
        icon: nk === 'sunrise' ? 'sunrise' : 'mosque',
        ring: null,
        rows: []
      };
    var pp = pillPrefs();
    o.place = pp.place;
    o.size = pp.size;
    o.hover = !!pp.hover;
    var f = A.jumuah && pp.friday ? A.jumuah() : { on: false };
    if (f.on) {
      var live = f.now === 'last' || f.now === 'minbar',
        w = f.now === 'minbar' ? f.minbar : f.last;
      o.friday = {
        live: live,
        until: live ? w.to : 0,
        kicker: L('THE HOUR OF RESPONSE', 'ساعة الإجابة'),
        title: L('Make duʿāʾ', 'ادعُ الله')
      };
      o.untilLabel =
        f.now === 'last' ? L('until Maghrib', 'حتى المغرب') : L('until the prayer ends', 'حتى تنقضي الصلاة');
      o.rows.push({
        icon: 'mosque',
        title: L('Yawm al-Jumuʿah', 'يوم الجمعة'),
        sub: f.rec.kahf ? L('Al-Kahf read', 'قُرئت الكهف') : L('Read Sūrat al-Kahf', 'اقرأ سورة الكهف'),
        right: live ? L('Now', 'الآن') : L('Last hour ', 'آخر ساعة ') + A.fmtTxt(f.last.from),
        live: live,
        route: f.rec.kahf ? 'jumuah' : 'kahf'
      });
    }
    (pp.adhkar ? ['morning', 'evening'] : []).forEach(function (id) {
      var p = A.progress(k, id);
      if (sess === id && !p.complete) o.ring = +p.frac.toFixed(3);
      o.rows.push({
        icon: id === 'morning' ? 'sunrise' : 'moon',
        title: L(
          id === 'morning' ? 'Morning adhkār' : 'Evening adhkār',
          id === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'
        ),
        sub: p.complete
          ? L('Complete · mā shāʾ Allāh', 'اكتملت · ما شاء الله')
          : (sess === id ? L('Now · ', 'الآن · ') : '') + A.fmtN(p.done) + ' / ' + A.fmtN(p.total),
        right: p.complete ? '' : L(p.started ? 'Continue' : 'Begin', p.started ? 'تابع' : 'ابدأ'),
        chip: true,
        done: !!p.complete,
        frac: p.complete ? 1 : +p.frac.toFixed(3),
        route: 'c/' + id
      });
    });
    var tm = A.shift(k, 1);
    if (pp.fast && S.fastPlan && S.fastPlan[tm])
      o.rows.push({
        icon: 'fast',
        title: L('Tomorrow you plan to fast', 'غدًا تنوي الصيام'),
        sub: L('Intention tonight, suhūr before Fajr', 'النية الليلة، والسحور قبل الفجر'),
        route: 'calendar'
      });
    else if (pp.fast && S.fastPlan && S.fastPlan[k] && !S.fasts[k])
      o.rows.push({
        icon: 'fast',
        title: L('Today you planned to fast', 'نويت صيام اليوم'),
        sub: L('Log it in the calendar', 'سجّله في التقويم'),
        route: 'calendar'
      });
    return o;
  }
  /* wall-clock HH:MM on `key` in the selected location's timezone */
  function at(key, hm) {
    var p = String(hm || '22:30').split(':'),
      hh = Math.max(0, Math.min(23, +p[0] || 0)),
      mm = Math.max(0, Math.min(59, +p[1] || 0)),
      a = key.split('-'),
      guess = Date.UTC(+a[0], +a[1] - 1, +a[2], hh, mm, 0);
    for (var i = 0; i < 2; i++) {
      var got = A.parts(guess),
        dayDiff = Date.UTC(+a[0], +a[1] - 1, +a[2]) - Date.UTC(got.y, got.m - 1, got.d),
        minDiff = (hh - got.h) * 60 + (mm - got.min);
      guess += dayDiff + minDiff * 60000;
    }
    return guess;
  }
  /* the next two days of reminders, from the same settings the phone uses */
  function schedule() {
    if (tab) return; /* a phone or tablet rings its own reminders natively */
    var N = S.notif,
      out = [],
      now = Date.now(),
      todayKey = A.today(),
      exc = !!(S.excused && S.excused.on);
    if (!N || !S.loc) {
      try {
        B.deskSchedule('[]');
      } catch (e) {}
      return;
    }
    [A.shift(todayKey, -1), todayKey, A.shift(todayKey, 1)].forEach(function (key) {
      var t = A.pday(key);
      if (!t) return;
      if (!N.enabled) return;
      var tomorrow = A.shift(key, 1),
        plan = S.fastPlan && S.fastPlan[tomorrow];
      if (plan && !exc && !A.noFastDay(A.hijri(tomorrow)) && isFinite(t.maghrib))
        out.push({
          t: t.maghrib,
          title: L('Tomorrow you plan to fast', 'غدًا تنوي الصيام'),
          body: L('Make your intention tonight, and eat suhūr before Fajr', 'انوِ الليلة، وتسحّر قبل الفجر'),
          route: 'calendar'
        });
      var smart = N.smart !== false && key <= todayKey,
        dd = smart ? A.dayDone(key) : {},
        jn = S.journal.nudge,
        openDua = S.journal.items.find(function (d) {
          return d && !d.done && d.text;
        }),
        jFri = !!(openDua && jn.friday),
        friday = !!(N.friday && N.friday.on);
      if (A.dow(key) === 5 && (friday || jFri)) {
        var fr = (S.jumuah && S.jumuah.days && S.jumuah.days[key]) || {};
        if (friday && !fr.kahf && isFinite(t.sunrise))
          out.push({
            t: t.sunrise + 120 * 60000,
            title: L('Yawm al-Jumuʿah', 'يوم الجمعة'),
            body: L('Read Sūrat al-Kahf and send abundant ṣalawāt', 'اقرأ سورة الكهف وأكثر من الصلاة على النبي ﷺ'),
            route: 'kahf'
          });
        if (isFinite(t.maghrib))
          out.push({
            t: t.maghrib - 60 * 60000,
            title: L('The hour of response', 'ساعة الإجابة'),
            body: jFri
              ? openDua.text.slice(0, 120)
              : L('The last hour before Maghrib on Friday. Make duʿāʾ.', 'آخر ساعة قبل مغرب الجمعة، فادعُ الله.'),
            route: jFri ? 'journal' : 'jumuah',
            hour: true
          });
      }
      if (!exc) {
        A.PRAYERS.forEach(function (p) {
          if (!N.prayers || !N.prayers[p] || !isFinite(t[p])) return;
          out.push({
            t: t[p],
            title: L('Time for ' + PN[p][0], 'حان وقت ' + PN[p][1]),
            body: A.fmtTxt(t[p]),
            takbir: !!N.adhan,
            route: 'salah'
          });
          if (N.pre > 0)
            out.push({
              t: t[p] - N.pre * 60000,
              title: L(PN[p][0] + ' in ' + N.pre + ' min', PN[p][1] + ' بعد ' + A.fmtN(N.pre) + ' د'),
              body: A.fmtTxt(t[p]),
              route: 'salah'
            });
        });
      }
      if (N.morning && N.morning.on && !(smart && dd.morning) && isFinite(t[N.morning.from]))
        out.push({
          t: t[N.morning.from] + (N.morning.after || 0) * 60000,
          title: L('Morning adhkār', 'أذكار الصباح'),
          body: L('The morning remembrance is open', 'حان وقت أذكار الصباح'),
          route: 'c/morning'
        });
      if (N.evening && N.evening.on && !(smart && dd.evening) && isFinite(t[N.evening.from]))
        out.push({
          t: t[N.evening.from] + (N.evening.after || 0) * 60000,
          title: L('Evening adhkār', 'أذكار المساء'),
          body: L('The evening remembrance is open', 'حان وقت أذكار المساء'),
          route: 'c/evening'
        });
      if (N.sleep && N.sleep.on && !(smart && dd.sleep))
        out.push({
          t: at(key, N.sleep.at),
          title: L('Before sleep', 'قبل النوم'),
          body: L('The adhkār before sleeping', 'أذكار النوم'),
          route: 'c/sleep'
        });
      if (N.duha && N.duha.on && !(smart && dd.duha) && isFinite(t.duhaStart))
        out.push({
          t: t.duhaStart,
          title: L('Ḍuḥā time', 'وقت الضحى'),
          body: L('Open until ', 'يمتد الوقت إلى ') + A.fmtTxt(t.duhaEnd),
          route: 'duha'
        });
      var jNight = !!(jn.night && openDua);
      if (((N.night && N.night.on) || jNight) && isFinite(t.lastThird) && isFinite(t.nextFajr))
        out.push({
          t: Math.min(t.lastThird + ((N.night && N.night.off) || 0) * 60000, t.nextFajr - 15 * 60000),
          title: L('The last third of the night', 'ثلث الليل الآخر'),
          body: jNight ? openDua.text.slice(0, 120) : L('Call upon your Lord before Fajr', 'ادعُ ربك قبل الفجر'),
          route: jNight ? 'journal' : 'night'
        });
      if (openDua && jn.adhan && isFinite(t[jn.adhan]))
        out.push({
          t: t[jn.adhan] + 2 * 60000,
          title: L('Between adhān and iqāmah', 'بين الأذان والإقامة'),
          body: openDua.text.slice(0, 120),
          route: 'journal'
        });
      if (A.isRamadan && A.isRamadan(key) && N.ramadan) {
        if (N.ramadan.iftar && !exc && isFinite(t.maghrib))
          out.push({
            t: t.maghrib,
            title: L('Ifṭār', 'الإفطار'),
            body: L('Time to break your fast', 'حان وقت الإفطار'),
            route: 'ramadan'
          });
        var imsakMs = (S.prefs.imsak || 0) * 60000;
        if (N.ramadan.suhoor && !exc && isFinite(t.fajr))
          out.push({
            t: t.fajr - imsakMs - (N.ramadan.suhoorMin || 45) * 60000,
            title: L('Suhūr', 'السحور'),
            body: L('Suhūr ends at ', 'ينتهي السحور ') + A.fmtTxt(t.fajr - imsakMs),
            route: 'ramadan'
          });
      }
    });
    out = out.filter(function (x) {
      return x.t > now - 60000;
    });
    try {
      B.deskSchedule(JSON.stringify(out));
    } catch (e) {}
  }
  Desk.schedule = schedule;
  /* the pill was dragged away from the top or the corner: it is free now */
  /* the Windows app asks for a fresh pill when its countdown runs out (the page may be resting while hidden) */
  Desk.pillNow = function () {
    Desk._pillSig = '';
    nextToHost();
  };
  Desk.pillFree = function () {
    pillPrefs().place = 'free';
    A.save();
    Desk._pillSig = '';
    if (A.route().raw === 'desk/pc') A.rerender();
  };
  var sync0 = A.N.sync;
  A.N.sync = function () {
    if (sync0) sync0.apply(this, arguments);
    clearTimeout(Desk._st);
    Desk._st = setTimeout(function () {
      schedule();
      nextToHost();
    }, 500);
  };
  setInterval(function () {
    paintNext();
    nextToHost();
    var sk = $('.rl-sky');
    if (sk) sk.style.setProperty('--sky', sky(Date.now()));
    var band = $('.dk-day');
    if (band && A.route().name === 'today') {
      band.outerHTML = dayBand();
      declutter($('.dk-day'));
    }
  }, 60000);
  setInterval(schedule, 30 * 60000);
  /* the takbīr, when a prayer's reminder rings */
  var tk = null;
  Desk.takbir = function () {
    if (tk) return;
    /* played from memory (window.DeskMedia, in the Windows shim): WebView2 does not serve an <audio> element's own
       requests from the app's files */
    var clear = function () {
      tk = null;
    };
    tk = {};
    (window.DeskMedia ? window.DeskMedia('/audio/adhan_takbir.ogg') : Promise.resolve('/audio/adhan_takbir.ogg')).then(
      function (url) {
        tk = new Audio(url);
        tk.onended = tk.onerror = clear;
        tk.play().catch(clear);
      },
      clear
    );
  };
  Desk.stopAudio = function () {
    if (window.DeskAudio) window.DeskAudio.stop();
  };

  /* ================= files: a backup dropped on the window ================= */
  Desk.onFile = function (text) {
    window.__native.onImport(text);
  };
  Desk.onFull = function (on) {
    document.documentElement.classList.toggle('dk-full', on);
  };
  Desk.refresh = function () {
    if (A.route().raw.indexOf('desk/') === 0) A.rerender();
  };
  Desk.onInstalled = function (ok) {
    A.toast(
      ok
        ? L('Installed. Opening Adhkār from Start…', 'ثُبّت. يُفتح أذكار من قائمة ابدأ…')
        : L('Could not install', 'تعذّر التثبيت'),
      ok ? 'check' : null
    );
    Desk.refresh();
  };

  /* ================= the pages a computer adds ================= */
  var month = 0,
    printWhat = 'morning';
  A.V.desk = function (a) {
    var which = a[0] || 'pc';
    if (which === 'print') return printPage();
    return pcPage();
  };
  function head(title, sub) {
    return (
      '<header class="top dk-head"><div class="tt"><div class="eyebrow">' +
      esc(L('On this computer', 'على هذا الحاسوب')) +
      '</div><h1>' +
      esc(title) +
      '</h1>' +
      (sub ? '<p class="dk-sub">' + esc(sub) + '</p>' : '') +
      '</div></header>'
    );
  }
  function toggle(key, on, title, sub) {
    return (
      '<label class="set dk-set"><div class="grow"><div class="t">' +
      esc(title) +
      '</div>' +
      (sub ? '<div class="s">' + esc(sub) + '</div>' : '') +
      '</div><button type="button" class="dk-sw' +
      (on ? ' on' : '') +
      '" role="switch" aria-checked="' +
      !!on +
      '" data-dk-set="' +
      key +
      '" aria-label="' +
      esc(title) +
      '"><i></i></button></label>'
    );
  }
  /* the pill, made yours: where it sits, its size, whether it opens under the pointer, and what it shows */
  function pillPrefs() {
    var p = (S.prefs.pill = S.prefs.pill || {});
    if (!p.place) p.place = 'top';
    if (!p.size) p.size = 'compact';
    ['hover', 'friday', 'adhkar', 'fast'].forEach(function (k) {
      if (p[k] == null) p[k] = true;
    });
    return p;
  }
  function pillOptions() {
    var p = pillPrefs();
    var seg = function (key, opts) {
      return (
        '<div class="dk-zoom dk-pill-seg">' +
        opts
          .map(function (o) {
            return (
              '<button class="dk-z' +
              (p[key] === o[0] ? ' on' : '') +
              '" data-pill-opt="' +
              key +
              '" data-v="' +
              o[0] +
              '">' +
              esc(o[1]) +
              '</button>'
            );
          })
          .join('') +
        '</div>'
      );
    };
    var sw = function (key, title, sub) {
      return (
        '<label class="set dk-set"><div class="grow"><div class="t">' +
        esc(title) +
        '</div>' +
        (sub ? '<div class="s">' + esc(sub) + '</div>' : '') +
        '</div><button type="button" class="dk-sw' +
        (p[key] ? ' on' : '') +
        '" role="switch" aria-checked="' +
        !!p[key] +
        '" data-pill="' +
        key +
        '" aria-label="' +
        esc(title) +
        '"><i></i></button></label>'
      );
    };
    return (
      '<div class="dk-row dk-pill-row"><div class="grow"><b>' +
      esc(L('Where it sits', 'مكانها')) +
      '</b><small>' +
      esc(
        L(
          'At the top, like a notch; in the corner; or wherever you drop it',
          'في الأعلى كالنتوء، أو في الزاوية، أو حيث تضعها'
        )
      ) +
      '</small></div>' +
      seg('place', [
        ['top', L('Top', 'الأعلى')],
        ['corner', L('Corner', 'الزاوية')],
        ['free', L('Free', 'حرّة')]
      ]) +
      '</div><div class="dk-row dk-pill-row"><div class="grow"><b>' +
      esc(L('Size', 'الحجم')) +
      '</b></div>' +
      seg('size', [
        ['compact', L('Compact', 'صغيرة')],
        ['regular', L('Comfortable', 'مريحة')]
      ]) +
      '</div>' +
      sw('hover', L('Open when the pointer rests on it', 'تنفتح حين يستقر المؤشر عليها'), '') +
      sw('friday', L('Show the Friday hours', 'إظهار ساعات الجمعة'), '') +
      sw('adhkar', L('Show the morning and evening adhkār', 'إظهار أذكار الصباح والمساء'), '') +
      sw('fast', L('Show a fast you planned', 'إظهار صيام نويته'), '')
    );
  }
  /* the recitations, kept on this computer: download them once, and they play offline in the reader and in Learn */
  function recitations() {
    if (!A.audio || !A.audio.ok() || A.audio.web) return '';
    var miss = A.audio.missing(),
      used = A.audio.usage();
    return (
      '<section class="card dk-card"><h3>' +
      esc(L('Recitations', 'التلاوات')) +
      '</h3><div class="dk-row"><div class="grow"><b>' +
      esc(
        miss.length
          ? L('Download every recitation', 'نزّل كل التلاوات')
          : L('Every recitation is on this computer', 'كل التلاوات على هذا الحاسوب')
      ) +
      '</b><small>' +
      esc(
        miss.length
          ? A.plural(miss.length, 'recording') +
              ' · ' +
              A.audio.mb(A.audio.bytes(miss)) +
              ' · ' +
              L('then they play offline', 'ثم تعمل دون اتصال')
          : L('They play offline, in the reader and in Learn mode', 'تعمل دون اتصال في القارئ ووضع التعلّم')
      ) +
      '</small><div class="au-dl" data-au-all style="margin-top:10px"><i></i></div><small data-au-all-t></small></div>' +
      (miss.length
        ? '<button class="btn pri sm" data-a="au-get-all">' +
          ic('download', 18) +
          '<span>' +
          esc(L('Download', 'نزّل')) +
          '</span></button>'
        : A.icon('check', 's')) +
      '</div><div class="dk-row"><div class="grow"><b>' +
      esc(L('Space used', 'المساحة المستخدمة')) +
      '</b><small>' +
      esc(used ? (used / 1048576).toFixed(1) + ' MB' : L('None yet', 'لا شيء بعد')) +
      '</small></div>' +
      (used ? '<button class="btn ghost sm" data-a="au-clear">' + esc(L('Remove', 'إزالة')) + '</button>' : '') +
      '</div><p class="dk-note">' +
      esc(
        L(
          'Ḥiṣn al-Muslim recordings, and the Qurʾān by Mishary al-ʿAfāsī. Sūrat al-Kahf downloads when you first press Listen.',
          'تسجيلات حصن المسلم، والقرآن بصوت مشاري العفاسي. تُنزّل سورة الكهف عند أول ضغطة على استمع.'
        )
      ) +
      '</p></section>'
    );
  }
  function pcPage() {
    var I = info(),
      backups = (I.backups || []).slice(0, 30);
    /* what is true of this computer at a glance, before the settings */
    var chip = function (icon, k, v) {
      return (
        '<span class="dk-st">' + ic(icon, 16) + '<span><small>' + esc(k) + '</small><b>' + esc(v) + '</b></span></span>'
      );
    };
    var mb = function (b) {
      return b ? (b / 1048576).toFixed(b > 1048576 * 10 ? 0 : 1) + (A.ar() ? ' م.ب' : ' MB') : L('None', 'لا شيء');
    };
    var strip =
      '<div class="dk-status">' +
      chip('pc', L('Version', 'الإصدار'), 'Adhkār ' + (I.version || '')) +
      chip('folder', L('Running', 'التشغيل'), I.portable ? L('From the file', 'من الملف') : L('Installed', 'مثبّت')) +
      chip('pdf', L('Backups', 'النسخ الاحتياطية'), String((I.backups || []).length)) +
      chip('print', L('Recitations stored', 'التلاوات المحفوظة'), mb(I.audio)) +
      '</div>';
    var html =
      '<div class="view dk-page dk-pcpage">' +
      head(L('This computer', 'هذا الحاسوب'), L('Adhkār ', 'أذكار ') + (I.version || '')) +
      strip +
      '<div class="dk-grid">' +
      '<section class="card dk-card"><h3>' +
      esc(L('On Windows', 'في ويندوز')) +
      '</h3>' +
      (I.portable && I.installed
        ? '<div class="dk-row"><div class="grow"><b>' +
          esc(L('Adhkār is installed', 'أذكار مثبّت')) +
          '</b><small>' +
          esc(
            L(
              'This window is the file you downloaded. Open the installed app, from Start or your desktop, and this copy closes; you may delete the downloaded file.',
              'هذه النافذة هي الملف الذي نزّلته. افتح التطبيق المثبّت، من قائمة ابدأ أو سطح المكتب، فتُغلق هذه النسخة، ولك أن تحذف الملف المنزّل.'
            )
          ) +
          '</small></div><button class="btn pri sm" data-dk="install">' +
          esc(L('Open it', 'افتحه')) +
          '</button></div>'
        : I.portable
          ? '<div class="dk-row"><div class="grow"><b>' +
            esc(L('Install Adhkār', 'ثبّت أذكار')) +
            '</b><small>' +
            esc(
              L(
                'This window is the file you downloaded. Install puts Adhkār in its own folder, in Start and on your desktop, and opens it from there, like any app. For you only, no administrator needed; your record is the same either way.',
                'هذه النافذة هي الملف الذي نزّلته. التثبيت يضع أذكار في مجلده وفي قائمة ابدأ وعلى سطح المكتب ويفتحه من هناك، كأي تطبيق. لك وحدك ودون صلاحيات المسؤول، وسجلك هو نفسه في الحالتين.'
              )
            ) +
            '</small></div><button class="btn pri sm" data-dk="install">' +
            esc(L('Install', 'ثبّت')) +
            '</button></div>'
          : '<div class="dk-row"><div class="grow"><b>' +
            esc(L('Installed', 'مثبّت')) +
            '</b><small>' +
            esc(L('Remove it from Settings › Apps; your record stays.', 'أزله من الإعدادات › التطبيقات، ويبقى سجلك.')) +
            '</small></div>' +
            A.icon('check', 's') +
            '</div>') +
      '<div class="dk-row"><div class="grow"><b>' +
      esc(L('Adhkār on your phone', 'أذكار على هاتفك')) +
      '</b><small>' +
      esc(
        L(
          'The Android app, free from the same page. Open this on your phone, or download it here and send it across.',
          'تطبيق أندرويد، مجانًا من الصفحة نفسها. افتح الرابط على هاتفك، أو نزّله هنا وأرسله إليه.'
        )
      ) +
      '</small></div><a class="btn ghost sm" data-a="ext" href="https://github.com/Bashyr18/adhkar/releases/latest">' +
      esc(L('Get it', 'احصل عليه')) +
      '</a></div>' +
      toggle(
        'startup',
        I.startup,
        L('Start with Windows', 'التشغيل مع ويندوز'),
        L('Quietly, in the tray, so reminders arrive', 'بهدوء في شريط المهام لتصلك التذكيرات')
      ) +
      toggle(
        'tray',
        I.tray,
        L('Keep in the tray when closed', 'البقاء في شريط المهام عند الإغلاق'),
        L('Reminders arrive with the window closed', 'تصل التذكيرات والنافذة مغلقة')
      ) +
      '</section>' +
      '<section class="card dk-card dk-pillcard"><h3>' +
      esc(L('The pill', 'الكبسولة')) +
      '</h3>' +
      /* the pill itself, drawn by the same painter as the real one, so a change here shows at once */
      '<div class="dk-pill-prev"><img id="dkPillPrev" alt=""></div>' +
      toggle(
        'next',
        I.next,
        L('A floating pill that keeps the day in view', 'كبسولة عائمة تُبقي يومك أمامك'),
        L(
          'The next prayer, the Friday hour, your adhkār and a planned fast. Click to open it, drag it anywhere',
          'الصلاة القادمة وساعة الجمعة وأذكارك وصيام نويته. انقر لفتحها واسحبها حيث شئت'
        )
      ) +
      toggle('nextTop', I.nextTop, L('Keep it on top of other windows', 'إبقاؤها فوق النوافذ الأخرى'), '') +
      pillOptions() +
      '<div class="dk-row"><div class="grow"><b>' +
      esc(L('Reminders', 'التذكيرات')) +
      '</b><small>' +
      esc(
        S.notif && S.notif.enabled
          ? L('On, with the prayer times you chose', 'مفعّلة، بأوقات الصلاة التي اخترتها')
          : L('Off', 'متوقفة')
      ) +
      '</small></div><a class="btn ghost sm" href="#/settings/notifications">' +
      esc(L('Choose', 'اختر')) +
      '</a></div></section>' +
      '<section class="card dk-card"><h3>' +
      esc(L('Text size', 'حجم النص')) +
      '</h3><div class="dk-zoom">' +
      [0.9, 1, 1.1, 1.25, 1.5]
        .map(function (z) {
          return (
            '<button class="dk-z' +
            (Math.abs((I.zoom || 1) - z) < 0.02 ? ' on' : '') +
            '" data-zoom="' +
            z +
            '">' +
            A.fmtN(Math.round(z * 100)) +
            '%</button>'
          );
        })
        .join('') +
      '</div><p class="dk-note">' +
      kbd('Ctrl') +
      kbd('+') +
      ' ' +
      kbd('Ctrl') +
      kbd('−') +
      ' ' +
      kbd('Ctrl') +
      kbd('0') +
      '</p></section>' +
      '<section class="card dk-card dk-backups"><h3>' +
      esc(L('Backups', 'النسخ الاحتياطية')) +
      '<small>' +
      esc(L('One a day, the last 30 days', 'نسخة كل يوم، آخر ٣٠ يومًا')) +
      '</small></h3>' +
      (backups.length
        ? '<div class="dk-blist">' +
          backups
            .map(function (b) {
              return (
                '<div class="dk-b">' +
                ic('restore', 18) +
                '<span class="grow">' +
                esc(A.fmtDate(b.name, 'long')) +
                '</span><button class="btn ghost sm" data-restore="' +
                esc(b.name) +
                '">' +
                esc(L('Restore', 'استعد')) +
                '</button></div>'
              );
            })
            .join('') +
          '</div>'
        : '<p class="dk-note">' +
          esc(
            L(
              'The first copy is made today, the first time your record changes.',
              'تُصنع أول نسخة اليوم عند أول تغيير في سجلك.'
            )
          ) +
          '</p>') +
      '<div class="dk-row2"><button class="btn ghost sm" data-folder="backups">' +
      ic('folder', 18) +
      '<span>' +
      esc(L('Open the backups folder', 'افتح مجلد النسخ')) +
      '</span></button><button class="btn ghost sm" data-folder="data">' +
      ic('folder', 18) +
      '<span>' +
      esc(L('Open the data folder', 'افتح مجلد البيانات')) +
      '</span></button></div></section>' +
      recitations() +
      '</div></div>';
    return {
      title: L('This computer', 'هذا الحاسوب'),
      html: html,
      mount: function (el) {
        var prev = $('#dkPillPrev', el),
          now = A.now();
        if (prev && A.paintPill && now.next && now.next.at)
          A.paintPill(pillInfo(now)).then(function (o) {
            prev.src = 'data:image/png;base64,' + o.open.img;
            prev.style.width = o.open.w / o.s + 'px';
          });
        /* #app stays across redraws: listen once, or each redraw adds a handler and one click acts several times */
        if (el._dkPc) return;
        el._dkPc = true;
        el.addEventListener('click', function (e) {
          if (A.route().raw !== 'desk/pc') return;
          var po = e.target.closest('[data-pill-opt]'),
            ps = e.target.closest('[data-pill]');
          if (po || ps) {
            var pp = pillPrefs();
            if (po) pp[po.dataset.pillOpt] = po.dataset.v;
            else pp[ps.dataset.pill] = !pp[ps.dataset.pill];
            A.save();
            Desk._pillSig = '';
            nextToHost();
            A.rerender();
            return;
          }
          var s = e.target.closest('[data-dk-set]');
          if (s) {
            var on = !s.classList.contains('on');
            s.classList.toggle('on', on);
            s.setAttribute('aria-checked', on);
            B.deskSet(s.dataset.dkSet, on);
            if (s.dataset.dkSet === 'next' && on) nextToHost();
            return;
          }
          var z = e.target.closest('[data-zoom]');
          if (z) {
            B.deskZoom(+z.dataset.zoom);
            $$('.dk-z', el).forEach(function (x) {
              x.classList.toggle('on', x === z);
            });
            return;
          }
          if (e.target.closest('[data-dk="install"]')) return B.install();
          var f = e.target.closest('[data-folder]');
          if (f) return B.openFolder(f.dataset.folder);
          var r = e.target.closest('[data-restore]');
          if (r) {
            var t = B.backup(r.dataset.restore);
            if (t) window.__native.onImport(t);
          }
        });
      }
    };
  }

  function sheetsFor(what) {
    return A.print.sheets(what, month);
  }
  function printPage() {
    var count = function (id) {
      try {
        return A.items(id).length;
      } catch (e) {
        return 0;
      }
    };
    var nM = count('morning'),
      nE = count('evening');
    var opts = [
      ['morning', L('Morning adhkār', 'أذكار الصباح'), 'sunrise', A.fmtN(nM) + L(' adhkār', ' ذكرًا')],
      ['evening', L('Evening adhkār', 'أذكار المساء'), 'moon', A.fmtN(nE) + L(' adhkār', ' ذكرًا')],
      ['both', L('Morning and evening', 'الصباح والمساء'), 'book', L('One booklet', 'كتيّب واحد')],
      ['times', L('Prayer timetable', 'جدول مواقيت الصلاة'), 'mosque', L('Every day of the month', 'كل أيام الشهر')]
    ];
    var incl =
      printWhat === 'times'
        ? [
            L(
              'Fajr, sunrise, Dhuhr, ʿAṣr, Maghrib and ʿIshāʾ for each day',
              'الفجر والشروق والظهر والعصر والمغرب والعشاء لكل يوم'
            ),
            L('Hijri and calendar dates side by side', 'التاريخ الهجري والميلادي معًا'),
            L('Your place and calculation method', 'مدينتك وطريقة الحساب')
          ]
        : [
            L('The Arabic, set as in the app', 'النص العربي كما في التطبيق'),
            L('Transliteration and translation', 'النطق والترجمة'),
            L('How many times, and every source', 'عدد المرات والمصادر كلها')
          ];
    var html =
      '<div class="view dk-page dk-print">' +
      head(
        L('Print and PDF', 'الطباعة وPDF'),
        L('On A4, white to the edge, with every source.', 'على ورق A4 أبيض حتى الحافة، مع المصادر.')
      ) +
      '<div class="dk-pp"><aside class="card dk-card dk-pp-side"><h3>' +
      esc(L('What to print', 'ماذا تطبع')) +
      '</h3><div class="dk-pick">' +
      opts
        .map(function (o) {
          return (
            '<button class="dk-pk' +
            (printWhat === o[0] ? ' on' : '') +
            '" data-what="' +
            o[0] +
            '">' +
            A.icon(o[2], 's') +
            '<span><b>' +
            esc(o[1]) +
            '</b><small>' +
            esc(o[3]) +
            '</small></span></button>'
          );
        })
        .join('') +
      '</div>' +
      (printWhat === 'times'
        ? '<h3>' +
          esc(L('Month', 'الشهر')) +
          '</h3><div class="dk-zoom">' +
          [0, 1, 2]
            .map(function (m) {
              var d = new Date();
              d.setMonth(d.getMonth() + m, 1);
              return (
                '<button class="dk-z' +
                (month === m ? ' on' : '') +
                '" data-month="' +
                m +
                '">' +
                esc(d.toLocaleDateString(A.ar() ? 'ar' : 'en-GB', { month: 'long' })) +
                '</button>'
              );
            })
            .join('') +
          '</div>'
        : '') +
      '<h3>' +
      esc(L('On the paper', 'على الورق')) +
      '</h3><ul class="dk-incl">' +
      incl
        .map(function (x) {
          return '<li>' + ic('check', 14) + '<span>' + esc(x) + '</span></li>';
        })
        .join('') +
      '</ul>' +
      '<div class="dk-pp-go"><button class="btn pri" data-print="paper">' +
      ic('print', 18) +
      '<span>' +
      esc(L('Print', 'اطبع')) +
      '</span></button><button class="btn ghost" data-print="pdf">' +
      ic('pdf', 18) +
      '<span>' +
      esc(L('Save as PDF', 'احفظ PDF')) +
      '</span></button></div><p class="dk-note">' +
      esc(L('PDFs go to Documents › Adhkar.', 'تُحفظ ملفات PDF في المستندات › Adhkar.')) +
      '</p></aside><div class="dk-pp-view"><div class="dk-pp-bar"><span><b>' +
      esc(
        (opts.filter(function (o) {
          return o[0] === printWhat;
        })[0] || opts[0])[1]
      ) +
      '</b> · A4</span><div class="dk-zoom"><button class="dk-z' +
      (Desk._ppFit !== 'page' ? ' on' : '') +
      '" data-ppfit="width">' +
      esc(L('Fit width', 'ملء العرض')) +
      '</button><button class="dk-z' +
      (Desk._ppFit === 'page' ? ' on' : '') +
      '" data-ppfit="page">' +
      esc(L('Whole page', 'الصفحة كاملة')) +
      '</button></div></div><div class="dk-preview" id="dk-preview"><div class="dk-paper-wrap">' +
      sheetsFor(printWhat) +
      '</div></div></div></div></div>';
    return {
      title: L('Print and PDF', 'الطباعة وPDF'),
      html: html,
      mount: function (el) {
        /* the paper is drawn at its real size, then scaled to fit the room beside the choices */
        var fit = (Desk._ppFitFn = function () {
          var box = $('#dk-preview'),
            wrap = box && $('.dk-paper-wrap', box);
          if (!wrap || !box.clientWidth) return;
          /* the width of the room, or a whole A4 page (1123 px tall at full size) in the height there is */
          var zw = (box.clientWidth - 60) / 794,
            zp = (box.clientHeight - 60) / 1123;
          wrap.style.zoom = Math.min(1.1, Desk._ppFit === 'page' ? Math.min(zw, zp) : zw).toFixed(3);
        });
        fit();
        requestAnimationFrame(fit);
        if (!Desk._fit) {
          Desk._fit = true;
          addEventListener('resize', function () {
            if (Desk._ppFitFn) Desk._ppFitFn();
          });
        }
        if (el._dkPrint) return;
        el._dkPrint = true;
        el.addEventListener('click', function (e) {
          if (A.route().raw !== 'desk/print') return;
          var w = e.target.closest('[data-what]');
          if (w) {
            printWhat = w.dataset.what;
            A.rerender();
            return;
          }
          var zf = e.target.closest('[data-ppfit]');
          if (zf) {
            Desk._ppFit = zf.dataset.ppfit;
            A.rerender();
            return;
          }
          var m = e.target.closest('[data-month]');
          if (m) {
            month = +m.dataset.month;
            A.rerender();
            return;
          }
          var p = e.target.closest('[data-print]');
          if (p) doPrint(p.dataset.print === 'pdf');
        });
      }
    };
  }
  /* the paper goes to Windows' own print dialog (it always closes back to the app), or straight to a PDF */
  function doPrint(pdf) {
    A.print.go(printWhat, month, pdf);
  }
  Desk.onPdf = function (path) {
    document.documentElement.classList.remove('printing');
    if (A.print && A.print._origTitle) {
      document.title = A.print._origTitle;
      A.print._origTitle = null;
    }
    if (!path) {
      A.toast(L('The PDF could not be saved', 'تعذر حفظ ملف PDF'));
      return;
    }
    A.sheet(
      L('Saved as PDF', 'حُفظ PDF'),
      '<div class="dk-saved">' +
        ic('pdf', 34) +
        '<p>' +
        esc(path.split(/[\\/]/).pop()) +
        '</p><small>' +
        esc(L('Documents › Adhkar', 'المستندات › Adhkar')) +
        '</small><div class="dk-row2"><button class="btn pri" id="pdf-open">' +
        esc(L('Open it', 'افتحه')) +
        '</button><button class="btn ghost" id="pdf-show">' +
        ic('folder', 18) +
        '<span>' +
        esc(L('Show in folder', 'أظهره في المجلد')) +
        '</span></button></div></div>'
    );
    var sh = $('.sheet:last-of-type');
    var o = $('#pdf-open'),
      s = $('#pdf-show');
    if (o)
      o.onclick = function () {
        B.openPdf(path);
      };
    if (s)
      s.onclick = function () {
        B.reveal(path);
      };
    void sh;
  };

  /* ================= the sky of the day: Adhkār's own motif, made for a wide screen ================= */
  /* the colour of the sky at a moment, from the day's own times: night, dawn, day, afternoon, dusk */
  var SKY = {
    night: ['#0b1030', '#1b1a52'],
    dawn: ['#2b2f6e', '#e39466'],
    day: ['#3b7bc6', '#a6cdef'],
    after: ['#d49a5c', '#6a5aa0'],
    dusk: ['#45306b', '#141842']
  };
  function phase(ms) {
    var t = S.loc && A.pday(A.keyAt(ms));
    if (!t) return 'night';
    if (ms < t.fajr || ms >= t.isha) return 'night';
    if (ms < t.sunrise) return 'dawn';
    if (ms < t.asr) return 'day';
    if (ms < t.maghrib) return 'after';
    return 'dusk';
  }
  function sky(ms) {
    var c = SKY[phase(ms)];
    return 'linear-gradient(135deg,' + c[0] + ',' + c[1] + ')';
  }
  function dates() {
    var k = A.today();
    return (
      '<div class="rl-dates"><b>' +
      esc(A.hijriText ? A.hijriText(k) : '') +
      '</b><small>' +
      esc(A.fmtDate(k)) +
      '</small></div>'
    );
  }

  /* the day band: the whole day from Fajr to the next Fajr at a glance, its prayers and the times of its
     remembrance laid on the sky, with now marked. Only a wide screen can show a day this way. */
  function dayBand() {
    if (!S.loc) return '';
    var k = A.today(),
      t = A.pday(k),
      now = Date.now(),
      N = S.notif || {};
    if (!t || !isFinite(t.fajr) || !isFinite(t.nextFajr)) return '';
    var a = t.fajr,
      b = t.nextFajr,
      span = b - a;
    if (now < a) {
      /* before Fajr, the band is yesterday's night */
      var y = A.pday(A.shift(k, -1));
      if (y && isFinite(y.fajr)) {
        t = y;
        k = A.shift(k, -1);
        a = t.fajr;
        b = t.nextFajr;
        span = b - a;
      }
    }
    var x = function (ms) {
      return Math.max(0, Math.min(100, ((ms - a) / span) * 100));
    };
    var done = A.dayDone(k),
      ms = N.morning && N.morning.from === 'sunrise' ? t.sunrise : t.fajr,
      es = N.evening && N.evening.from === 'maghrib' ? t.maghrib : t.asr;
    /* the sky behind, its stops at the day's own times */
    var stops = [
      [a, SKY.dawn[0]],
      [t.sunrise, SKY.dawn[1]],
      [(t.sunrise + t.dhuhr) / 2, SKY.day[0]],
      [t.dhuhr, SKY.day[1]],
      [t.asr, SKY.day[0]],
      [t.maghrib, SKY.after[0]],
      [(t.maghrib + t.isha) / 2, SKY.dusk[0]],
      [t.isha, SKY.night[1]],
      [b, SKY.night[0]]
    ]
      .map(function (q) {
        return q[1] + ' ' + x(q[0]).toFixed(2) + '%';
      })
      .join(',');
    var win = function (cls, from, to, label, ar, href, isDone) {
      if (!isFinite(from) || !isFinite(to) || to <= from) return '';
      return (
        '<a class="db-w ' +
        cls +
        (isDone ? ' done' : '') +
        (now >= from && now < to ? ' now' : '') +
        '" href="' +
        href +
        '" style="inset-inline-start:' +
        x(from).toFixed(2) +
        '%;width:' +
        (x(to) - x(from)).toFixed(2) +
        '%" title="' +
        esc(L(label, ar) + ' · ' + A.fmtTxt(from) + ' → ' + A.fmtTxt(to)) +
        '"><span>' +
        (isDone ? A.icon('check', 'xs') : '') +
        esc(L(label, ar)) +
        '</span></a>'
      );
    };
    var marks = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
      .map(function (p) {
        var prayed = p !== 'sunrise' && S.prayed[k] && S.prayed[k][p];
        return (
          '<a class="db-p' +
          (p === 'sunrise' ? ' sun' : '') +
          (prayed ? ' prayed' : '') +
          '" href="#/salah" style="inset-inline-start:' +
          x(t[p]).toFixed(2) +
          '%"><i></i><b>' +
          esc(pname(p)) +
          '</b><small>' +
          esc(A.fmtTxt(t[p])) +
          '</small></a>'
        );
      })
      .join('');
    var inDay = now >= a && now < b;
    return (
      '<section class="dk-day" aria-label="' +
      esc(L('The day', 'اليوم')) +
      '"><div class="db-sky" style="background:linear-gradient(' +
      /* the sky runs the way the page reads: Fajr at the start in either language */
      (document.documentElement.dir === 'rtl' ? '270deg' : '90deg') +
      ',' +
      stops +
      ')">' +
      marks +
      (inDay
        ? '<span class="db-now" style="inset-inline-start:' +
          x(now).toFixed(2) +
          '%"><em>' +
          esc(L('Now', 'الآن')) +
          '</em></span>'
        : '') +
      '</div><div class="db-wins">' +
      win('m', ms, t.dhuhr, 'Morning adhkār', 'أذكار الصباح', '#/c/morning', done.morning) +
      win('d', t.duhaStart, t.duhaEnd, 'Ḍuḥā', 'الضحى', '#/duha', !!S.duha[k]) +
      win('e', es, t.isha + 90 * 60000, 'Evening adhkār', 'أذكار المساء', '#/c/evening', done.evening) +
      win('n', t.lastThird, b, 'The last third', 'الثلث الأخير', '#/night', false) +
      '</div></section>'
    );
  }
  /* prayers close together (Maghrib and ʿIshāʾ, an hour apart) would print over each other: a label that would
     touch its neighbour drops to a second row, its time kept in the tooltip */
  function declutter(band) {
    if (!band) return;
    var marks = $$('.db-p', band),
      rtl = document.documentElement.dir === 'rtl',
      prev = null;
    var box = band.getBoundingClientRect();
    marks.forEach(function (m) {
      m.classList.remove('low', 'tuck', 'nudge');
      m.style.removeProperty('--nx');
      m.title = $('b', m).textContent + ' · ' + $('small', m).textContent;
    });
    marks.forEach(function (m) {
      var r = $('b', m).getBoundingClientRect(),
        sm = $('small', m).getBoundingClientRect(),
        a = Math.min(r.left, sm.left),
        b = Math.max(r.right, sm.right);
      var hits = prev && (rtl ? b + 8 > prev[0] : a < prev[1] + 8),
        tick = m.getBoundingClientRect().left;
      /* a mark whose line would run past the end of the label before it starts beneath that label */
      if (prev && (rtl ? tick > prev[0] - 12 : tick < prev[1] + 12)) m.classList.add('tuck');
      if (hits) {
        /* crowded: keep it on the same row, its name and time set just past the label before it; only if there is
           no room for that does it take the lower row */
        var dx = rtl ? prev[0] - 14 - b : prev[1] + 14 - a,
          fits = rtl ? a + dx >= box.left + 8 : b + dx <= box.right - 8;
        if (fits) {
          m.classList.add('nudge');
          m.style.setProperty('--nx', dx + 'px');
          prev = [a + dx, b + dx];
        } else m.classList.add('low');
      } else prev = [a, b];
    });
  }
  function placeDayBand() {
    var v = $('#app > .view.dk-wide');
    if (!v || A.route().name !== 'today' || $('.dk-day', v)) return;
    var html = dayBand();
    if (!html) return;
    var top = $('.top', v);
    if (top) top.insertAdjacentHTML('afterend', html);
    declutter($('.dk-day', v));
  }

  /* the reader's session, all of it beside the page: where you are, what is done, any one a click away */
  function sessionPane() {
    var rd = $('.reader'),
      r = A.route();
    if (!rd || r.name !== 'r' || innerWidth < 1280) {
      if (rd) rd.classList.remove('dk-sess');
      return;
    }
    var cid = r.a[0],
      idx = +r.a[1] || 0,
      c = A.col(cid);
    if (!c) return;
    var prayer = c.perPrayer && A.PRAYERS.indexOf(r.a[2]) >= 0 ? r.a[2] : null;
    var items = A.items(cid, prayer),
      ck = A.colKey(cid, prayer),
      day = A.today(),
      n = 0;
    var rows = items
      .map(function (it, i) {
        var got = A.cnt(day, ck, it.id),
          tgt = it.target || 1,
          full = it.kind === 'open' ? got > 0 : got >= tgt;
        if (full) n++;
        return (
          '<a class="ss-i' +
          (i === idx ? ' on' : '') +
          (full ? ' done' : '') +
          '" href="#/r/' +
          esc(cid) +
          '/' +
          i +
          (prayer ? '/' + esc(prayer) : '') +
          '"><span class="ss-n">' +
          (full ? A.icon('check', 'xs') : A.fmtN(i + 1)) +
          '</span><span class="grow"><b>' +
          esc(it.title) +
          '</b>' +
          (tgt > 1 ? '<small>' + A.fmtN(Math.min(got, tgt)) + ' / ' + A.fmtN(tgt) + '</small>' : '') +
          '</span></a>'
        );
      })
      .join('');
    var pane = $('.dk-ss', rd);
    if (!pane) {
      pane = document.createElement('aside');
      pane.className = 'dk-ss';
      rd.appendChild(pane);
    }
    pane.innerHTML =
      '<div class="ss-h"><small>' +
      esc(L('This session', 'هذه الجلسة')) +
      '</small><b>' +
      esc(c.title) +
      '</b><div class="ss-bar"><i style="width:' +
      Math.round((100 * n) / Math.max(1, items.length)) +
      '%"></i></div><small>' +
      A.fmtN(n) +
      ' / ' +
      A.fmtN(items.length) +
      ' ' +
      esc(L('complete', 'مكتملة')) +
      '</small></div><nav class="ss-list">' +
      rows +
      '</nav>';
    rd.classList.add('dk-sess');
    var on = $('.ss-i.on', pane);
    if (on && !pane._seen) on.scrollIntoView({ block: 'center' });
    pane._seen = true;
  }
  /* the reader opens over the page and changes without a new screen: watch it, and the address */
  var rdWatch = new MutationObserver(function () {
    clearTimeout(rdWatch._t);
    rdWatch._t = setTimeout(sessionPane, 60);
  });
  addEventListener('hashchange', function () {
    setTimeout(sessionPane, 120);
  });
  document.addEventListener('click', function () {
    setTimeout(sessionPane, 250);
  });
  addEventListener('resize', function () {
    sessionPane();
  });

  /* ================= start ================= */
  function start() {
    var app = $('#app');
    if (app) screens.observe(app, { childList: true });
    rdWatch.observe(document.body, { childList: true });
    after();
    if (tab) return;
    schedule();
    nextToHost();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start, 0);
})();
