/* Adhkār on a computer. Everything here runs only inside the Windows app (windows/shim.js sets ADHKAR_DESKTOP);
   on a phone or in a browser this file does nothing. (For checking the layout in a browser, ?desk turns it on with a
   stand-in bridge.)

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
  if (!window.ADHKAR_DESKTOP && !dev) return;
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
  var B = window.DeskBridge;
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
      '<div class="rl-top"><a class="rl-brand" href="#/" aria-label="Adhkār">' +
      MARK +
      '<span class="rl-word"><b>Adhkār</b><small lang="ar" dir="rtl">أذكار</small></span></a><button class="rl-fold" data-desk="fold" title="' +
      esc(L(mini ? 'Widen the rail' : 'Narrow the rail', mini ? 'وسّع الشريط' : 'ضيّق الشريط')) +
      '">' +
      ic('fold', 18) +
      '</button></div>' +
      '<button class="rl-search" data-desk="palette" title="' +
      esc(L('Search or jump', 'ابحث أو انتقل')) +
      '">' +
      ic('search', 18) +
      '<span>' +
      esc(L('Search or jump', 'ابحث أو انتقل')) +
      '</span>' +
      kbd('Ctrl K') +
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
      '</nav><div class="rl-sec">' +
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
      '</span></a></nav><div class="grow"></div>' +
      '<div class="rl-next" id="rl-next"></div>' +
      '<div class="rl-foot"><button class="rl-tool" data-desk="theme" title="' +
      esc(L('Day or night', 'نهار أو ليل')) +
      ' · Ctrl Shift L">' +
      ic(dark ? 'sun' : 'moon', 19) +
      '<span>' +
      esc(dark ? L('Day', 'نهار') : L('Night', 'ليل')) +
      '</span></button><button class="rl-tool" data-desk="keys" title="' +
      esc(L('Keyboard shortcuts', 'اختصارات لوحة المفاتيح')) +
      ' · F1">' +
      ic('kbd', 19) +
      '<span>' +
      esc(L('Keys', 'المفاتيح')) +
      '</span></button></div>';
    paintNext();
  }
  function placeRail() {
    var name = A.route().name;
    var show = !BARE[name] && !!(S.profile && S.profile.onboarded);
    if (!rail.parentNode) document.body.insertBefore(rail, document.body.firstChild);
    document.documentElement.classList.toggle('has-rail', show);
    document.documentElement.classList.toggle('rail-mini', show && mini);
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
    var r = A.route(),
      h1 = $('.view h1'),
      sub = TITLES[r.name] ? T(TITLES[r.name]) : h1 ? h1.textContent.trim() : '';
    document.title = ['Adhkār', sub].filter(Boolean).join(' · ');
    try {
      B.titleBar(document.documentElement.dataset.theme || 'dark');
    } catch (e) {}
    wide();
  }
  /* a wide window, filled: the tab pages lay their cards out in two balanced columns */
  var COLS = { today: 1, profile: 1, salah: 1, tracker: 1, journal: 1, deeds: 1, insights: 1 };
  function wide() {
    var v = $('#app > .view'),
      name = A.route().name;
    if (!v) return;
    v.classList.toggle('dk-wide', !!COLS[name]);
  }
  var screens = new MutationObserver(function () {
    clearTimeout(screens._t);
    screens._t = setTimeout(after, 16);
  });
  var apply0 = A.applyTheme;
  A.applyTheme = function () {
    apply0();
    if (document.body) {
      try {
        B.titleBar(document.documentElement.dataset.theme || 'dark');
      } catch (e) {}
      if (rail.parentNode && document.documentElement.classList.contains('has-rail')) drawRail();
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
    if (k === 'F11') {
      e.preventDefault();
      B.deskSet('full', !document.documentElement.classList.contains('dk-full'));
      return;
    }
    if (ctrl && (k === '=' || k === '+')) {
      e.preventDefault();
      zoom(0.1);
      return;
    }
    if (ctrl && k === '-') {
      e.preventDefault();
      zoom(-0.1);
      return;
    }
    if (ctrl && k === '0') {
      e.preventDefault();
      B.deskZoom(1);
      return;
    }
    if (ctrl && e.shiftKey && (k === 'l' || k === 'L')) {
      e.preventDefault();
      theme();
      return;
    }
    if (ctrl && (k === 'p' || k === 'P')) {
      e.preventDefault();
      A.go('#/desk/print');
      return;
    }
    if (ctrl && k === ',') {
      e.preventDefault();
      A.go('#/desk/pc');
      return;
    }
    if (ctrl && (k === 'q' || k === 'Q')) {
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
    pal.setAttribute('aria-label', L('Search', 'بحث'));
    pal.innerHTML =
      '<div class="dk-pal-bg"></div><div class="dk-pal-box"><label class="dk-pal-in">' +
      ic('search', 20) +
      '<input id="pal-q" autocomplete="off" spellcheck="false" placeholder="' +
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
                '<button class="dk-pal-i' +
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
      if (on) on.scrollIntoView({ block: 'nearest' });
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
  function pname(k) {
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
      esc(pname(n.next.k)) +
      '</b></span><span class="rl-nx-t">' +
      A.fmtT(n.next.at) +
      '</span></a>';
  }
  function nextToHost() {
    var n = A.now();
    if (!n.next || !n.next.at) return;
    try {
      B.deskNext(pname(n.next.k), n.next.at, A.fmtTxt(n.next.at));
    } catch (e) {}
  }
  function at(t, hm) {
    var p = String(hm || '').split(':'),
      d = new Date(t);
    d.setHours(+p[0] || 0, +p[1] || 0, 0, 0);
    return d.getTime();
  }
  /* the next two days of reminders, from the same settings the phone uses */
  function schedule() {
    var N = S.notif,
      out = [],
      now = Date.now();
    if (!N || !N.enabled || !S.loc) {
      try {
        B.deskSchedule('[]');
      } catch (e) {}
      return;
    }
    [A.today(), A.shift(A.today(), 1)].forEach(function (key) {
      var t = A.pday(key);
      if (!t) return;
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
      if (N.morning && N.morning.on && isFinite(t[N.morning.from]))
        out.push({
          t: t[N.morning.from] + (N.morning.after || 0) * 60000,
          title: L('Morning adhkār', 'أذكار الصباح'),
          body: L('The morning remembrance is open', 'حان وقت أذكار الصباح'),
          route: 'c/morning'
        });
      if (N.evening && N.evening.on && isFinite(t[N.evening.from]))
        out.push({
          t: t[N.evening.from] + (N.evening.after || 0) * 60000,
          title: L('Evening adhkār', 'أذكار المساء'),
          body: L('The evening remembrance is open', 'حان وقت أذكار المساء'),
          route: 'c/evening'
        });
      if (N.sleep && N.sleep.on)
        out.push({
          t: at(t.dhuhr, N.sleep.at),
          title: L('Before sleep', 'قبل النوم'),
          body: L('The adhkār before sleeping', 'أذكار النوم'),
          route: 'c/sleep'
        });
      if (A.isRamadan && A.isRamadan(key) && N.ramadan) {
        if (N.ramadan.iftar && isFinite(t.maghrib))
          out.push({
            t: t.maghrib,
            title: L('Ifṭār', 'الإفطار'),
            body: L('Time to break your fast', 'حان وقت الإفطار'),
            route: 'ramadan'
          });
        if (N.ramadan.suhoor && isFinite(t.fajr))
          out.push({
            t: t.fajr - (N.ramadan.suhoorMin || 45) * 60000,
            title: L('Suhūr', 'السحور'),
            body: L('Suhūr ends at ', 'ينتهي السحور ') + A.fmtTxt(t.fajr - (S.prefs.imsak || 0) * 60000),
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
  }, 60000);
  setInterval(schedule, 30 * 60000);
  /* the takbīr, when a prayer's reminder rings */
  var tk = null;
  Desk.takbir = function () {
    if (tk) return;
    tk = new Audio('/audio/adhan_takbir.ogg');
    tk.onended = tk.onerror = function () {
      tk = null;
    };
    tk.play().catch(function () {
      tk = null;
    });
  };
  Desk.stopAudio = function () {
    if (window.DeskAudio) window.DeskAudio.stop();
  };

  /* ================= files: a backup dropped on the window ================= */
  Desk.onFile = function (text) {
    A.confirm(
      L('Bring in this backup?', 'استيراد هذه النسخة؟'),
      L(
        'Your record on this computer is replaced by the one in the file. Today’s copy stays in Backups.',
        'يُستبدل سجلك على هذا الحاسوب بما في الملف. وتبقى نسخة اليوم في النسخ الاحتياطية.'
      ),
      L('Bring it in', 'استورد'),
      function () {
        window.__native.onImport(text);
      }
    );
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
        ? L('Installed: Adhkār is in Start and on your desktop', 'ثُبّت: أذكار في قائمة ابدأ وعلى سطح المكتب')
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
  function pcPage() {
    var I = info(),
      backups = (I.backups || []).slice(0, 30);
    var html =
      '<div class="view dk-page">' +
      head(L('This computer', 'هذا الحاسوب'), L('Adhkār ', 'أذكار ') + (I.version || '')) +
      '<div class="dk-grid">' +
      '<section class="card dk-card"><h3>' +
      esc(L('On Windows', 'في ويندوز')) +
      '</h3>' +
      (I.portable
        ? '<div class="dk-row"><div class="grow"><b>' +
          esc(L('Install Adhkār', 'ثبّت أذكار')) +
          '</b><small>' +
          esc(
            L(
              'In Start and on your desktop, for you only. No administrator needed.',
              'في قائمة ابدأ وعلى سطح المكتب، لك وحدك. دون صلاحيات المسؤول.'
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
      '<section class="card dk-card"><h3>' +
      esc(L('The next prayer', 'الصلاة القادمة')) +
      '</h3>' +
      toggle(
        'next',
        I.next,
        L('A small window with the next prayer', 'نافذة صغيرة بالصلاة القادمة'),
        L('Move it anywhere; double-click to open Adhkār', 'حرّكها حيث شئت، وانقر مرتين لفتح أذكار')
      ) +
      toggle('nextTop', I.nextTop, L('Keep it on top of other windows', 'إبقاؤها فوق النوافذ الأخرى'), '') +
      '<div class="dk-row"><div class="grow"><b>' +
      esc(L('Reminders', 'التذكيرات')) +
      '</b><small>' +
      esc(
        S.notif && S.notif.enabled
          ? L('On, with the prayer times you chose', 'مفعّلة، بأوقات الصلاة التي اخترتها')
          : L('Off', 'متوقفة')
      ) +
      '</small></div><a class="btn ghost sm" href="#/settings/reminders">' +
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
      '</div></div>';
    return {
      title: L('This computer', 'هذا الحاسوب'),
      html: html,
      mount: function (el) {
        el.addEventListener('click', function (e) {
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
            var name = r.dataset.restore;
            A.confirm(
              L('Restore this copy?', 'استعادة هذه النسخة؟'),
              L('Your record goes back to how it was on ', 'يعود سجلك إلى ما كان عليه في ') +
                A.fmtDate(name, 'long') +
                L('. Today’s copy stays in Backups.', '. وتبقى نسخة اليوم في النسخ الاحتياطية.'),
              L('Restore', 'استعد'),
              function () {
                var t = B.backup(name);
                if (t) window.__native.onImport(t);
              }
            );
          }
        });
      }
    };
  }

  /* ---------- Print and PDF ---------- */
  function sheetsFor(what) {
    if (what === 'times') return timetable(month);
    var ids = what === 'both' ? ['morning', 'evening'] : [what];
    return ids.map(booklet).join('');
  }
  function booklet(cid) {
    var c = A.col(cid),
      items = A.items(cid);
    var rows = items
      .map(function (it, i) {
        var refs = (it.refs || [])
          .map(function (r) {
            return r.l;
          })
          .join(' · ');
        return (
          '<article class="pp-it"><div class="pp-ih"><span class="pp-n">' +
          (i + 1) +
          '</span><b>' +
          esc(it.title) +
          '</b>' +
          (it.target > 1 ? '<span class="pp-x">×' + it.target + '</span>' : '') +
          '</div><p class="pp-ar" lang="ar" dir="rtl">' +
          esc(it.ar) +
          '</p>' +
          (it.tr ? '<p class="pp-tr">' + esc(it.tr) + '</p>' : '') +
          (it.en ? '<p class="pp-en"><span>' + esc(T('Translation')) + '</span>' + esc(it.en) + '</p>' : '') +
          (refs ? '<p class="pp-ref">' + esc(refs) + '</p>' : '') +
          '</article>'
        );
      })
      .join('');
    return (
      '<table class="pp-flow"><thead><tr><td><div class="pp-sp"></div></td></tr></thead><tfoot><tr><td><div class="pp-sp"></div></td></tr></tfoot><tbody><tr><td><div class="pp-sheet"><header class="pp-h"><div><small>Adhkār</small><h2>' +
      esc(c.title) +
      '</h2></div><p lang="ar" dir="rtl">' +
      esc(c.ar || '') +
      '</p></header>' +
      rows +
      '<footer class="pp-f">' +
      esc('Arabic from Ḥiṣn al-Muslim; translations from sunnah.com and The Clear Quran. Free, from the Adhkār app.') +
      '</footer></div></td></tr></tbody></table>'
    );
  }
  function timetable(off) {
    var now = new Date(),
      first = new Date(now.getFullYear(), now.getMonth() + off, 1),
      days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    if (!S.loc)
      return (
        '<div class="pp-page"><p>' +
        esc(L('Choose your place first, under Ṣalāh.', 'اختر مكانك أولًا من الصلاة.')) +
        '</p></div>'
      );
    var cols = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'],
      today = A.today();
    var body = '';
    for (var d = 1; d <= days; d++) {
      var dt = new Date(first.getFullYear(), first.getMonth(), d),
        key = A.keyAt(dt.getTime()),
        t = A.pday(key),
        h = A.hijri(key),
        fri = dt.getDay() === 5;
      body +=
        '<tr class="' +
        (fri ? 'fri' : '') +
        (key === today ? ' now' : '') +
        '"><td class="d"><b>' +
        d +
        '</b> ' +
        esc(dt.toLocaleDateString('en-GB', { weekday: 'short' })) +
        '</td><td class="hj">' +
        h.d +
        '</td>' +
        cols
          .map(function (k) {
            return '<td>' + (t && isFinite(t[k]) ? esc(A.fmtTxt(t[k])) : '') + '</td>';
          })
          .join('') +
        '</tr>';
    }
    var place = (S.loc && (S.loc.name || S.loc.city)) || '';
    return (
      '<div class="pp-page pp-tt"><header class="pp-h"><div><small>Adhkār · ' +
      esc(place) +
      '</small><h2>' +
      esc(first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })) +
      '</h2></div><p>' +
      esc(A.hijriText ? A.hijriText(A.keyAt(first.getTime())) : '') +
      '</p></header><table class="pp-times"><thead><tr><th>Day</th><th>Hijri</th><th>Fajr</th><th>Sunrise</th><th>Dhuhr</th><th>ʿAṣr</th><th>Maghrib</th><th>ʿIshāʾ</th></tr></thead><tbody>' +
      body +
      '</tbody></table><footer class="pp-f">' +
      esc(
        'Calculated for ' + place + '. Times may differ from your masjid by a few minutes. Free, from the Adhkār app.'
      ) +
      '</footer></div>'
    );
  }
  function printPage() {
    var opts = [
      ['morning', L('Morning adhkār', 'أذكار الصباح'), 'sunrise'],
      ['evening', L('Evening adhkār', 'أذكار المساء'), 'moon'],
      ['both', L('Morning and evening', 'الصباح والمساء'), 'book'],
      ['times', L('Prayer timetable', 'جدول مواقيت الصلاة'), 'mosque']
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
            '<span>' +
            esc(o[1]) +
            '</span></button>'
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
      '</p></aside><div class="dk-preview" id="dk-preview"><div class="dk-paper-wrap">' +
      sheetsFor(printWhat) +
      '</div></div></div></div>';
    return {
      title: L('Print and PDF', 'الطباعة وPDF'),
      html: html,
      mount: function (el) {
        /* the paper is drawn at its real size, then scaled to fit the room beside the choices */
        var fit = function () {
          var box = $('#dk-preview', el),
            wrap = box && $('.dk-paper-wrap', box);
          if (!wrap || !box.clientWidth) return;
          wrap.style.zoom = Math.min(0.9, (box.clientWidth - 54) / 794).toFixed(3);
        };
        fit();
        requestAnimationFrame(fit);
        if (!Desk._fit) {
          Desk._fit = true;
          addEventListener('resize', function () {
            var b = $('#dk-preview .dk-paper-wrap');
            if (b) b.style.zoom = Math.min(0.9, ($('#dk-preview').clientWidth - 54) / 794).toFixed(3);
          });
        }
        el.addEventListener('click', function (e) {
          var w = e.target.closest('[data-what]');
          if (w) {
            printWhat = w.dataset.what;
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
  /* the paper lives in its own block that only print shows; the app stays on screen while Windows prints it */
  function doPrint(pdf) {
    var paper = document.getElementById('dk-paper');
    if (!paper) {
      paper = document.createElement('div');
      paper.id = 'dk-paper';
      document.body.appendChild(paper);
    }
    paper.innerHTML = sheetsFor(printWhat);
    var name =
      printWhat === 'times'
        ? 'Prayer timetable ' +
          new Date(new Date().getFullYear(), new Date().getMonth() + month, 1).toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric'
          })
        : printWhat === 'both'
          ? 'Morning and evening adhkar'
          : printWhat === 'morning'
            ? 'Morning adhkar'
            : 'Evening adhkar';
    document.documentElement.classList.add('printing');
    setTimeout(function () {
      if (pdf) B.savePdf(name);
      else {
        var t = document.title;
        document.title = name;
        window.print();
        document.title = t;
        document.documentElement.classList.remove('printing');
      }
    }, 60);
  }
  Desk.onPdf = function (path) {
    document.documentElement.classList.remove('printing');
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

  /* ================= start ================= */
  function start() {
    var app = $('#app');
    if (app) screens.observe(app, { childList: true });
    after();
    schedule();
    nextToHost();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start, 0);
})();
