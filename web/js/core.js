/* Adhkār 10 — core: utilities, icons, state, catalogue, progress, stats, native bridge.
   No view code here. Religious text comes only from window.DATA (tools/build_content.py). */
(function () {
  'use strict';
  var A = (window.A = {});
  var D = window.DATA,
    P = window.Prayer;

  /* ================= utils ================= */
  A.$ = function (s, r) {
    return (r || document).querySelector(s);
  };
  A.$$ = function (s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  A.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ESC[c];
    });
  };
  A.clamp = function (n, a, b) {
    return Math.max(a, Math.min(b, n));
  };
  A.plural = function (n, one, many) {
    return n + ' ' + (n === 1 ? one : many || one + 's');
  };
  A.fmtN = function (n) {
    return Number(n || 0).toLocaleString('en-US');
  };
  A.debounce = function (fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  };

  /* ================= icons (24px line set) ================= */
  var IC = {
    home: 'M3.5 11.2 12 4.5l8.5 6.7M5.6 9.6V19.5h12.8V9.6M10 19.5v-5.2h4v5.2',
    book: 'M12 6.6C10 5.1 7.4 4.6 4 4.6v13.2c3.4 0 6 .5 8 2 2-1.5 4.6-2 8-2V4.6c-3.4 0-6 .5-8 2zM12 6.6v13.2',
    beads:
      'M12 3.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM6.6 5.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM17.4 5.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM4.4 10.9a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM19.6 10.9a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM6.6 16.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM17.4 16.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM12 17.4v4.2M10.2 21.6h3.6',
    mosque:
      'M3 21h18M5.5 21v-9M18.5 21v-9M5.5 12h13M7.5 12c0-3.4 2-5.1 4.5-6.6 2.5 1.5 4.5 3.2 4.5 6.6M12 5.4V2.6M10.9 3.4h2.2M10 21v-3a2 2 0 0 1 4 0v3M2.5 21V9l1-1.6 1 1.6v12M19.5 21V9l1-1.6 1 1.6v12',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1-3.7 4-5.5 7.5-5.5s6.5 1.8 7.5 5.5',
    sunrise: 'M3 18h18M6 14.5a6 6 0 0 1 12 0M12 3v5M9.2 5.8 12 3l2.8 2.8M4.5 11.5l1.4.8M19.5 11.5l-1.4.8M7 21.5h10',
    sunset: 'M3 18h18M6 14.5a6 6 0 0 1 12 0M12 8V3M9.2 5.2 12 8l2.8-2.8M4.5 11.5l1.4.8M19.5 11.5l-1.4.8M7 21.5h10',
    sun: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z',
    bed: 'M3 19v-8M3 15h18v4M21 15v-2.5a3 3 0 0 0-3-3h-7v5.5M6.8 12.6a1.6 1.6 0 1 0 0-.1z',
    bell: 'M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2.2 2.2 0 0 0 4 0',
    belloff: 'M6 9a6 6 0 0 1 9.4-4.9M18 9.5c.2 5.3 2.5 7 2.5 7H8M3.5 16.5S6 15 6 9.5M10 20a2.2 2.2 0 0 0 4 0M3 3l18 18',
    compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
    spark: 'M12 3c1 4 3 6 7 7-4 1-6 3-7 7-1-4-3-6-7-7 4-1 6-3 7-7z',
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.6-4.6',
    left: 'M15 5l-7 7 7 7',
    right: 'M9 5l7 7-7 7',
    down: 'M6 9l6 6 6-6',
    up: 'M6 15l6-6 6 6',
    close: 'M6 6l12 12M18 6 6 18',
    more: 'M12 6.5h.01M12 12h.01M12 17.5h.01',
    share: 'M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12',
    bookmark: 'M6.5 3.5h11v17L12 16.5l-5.5 4z',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    pause: 'M8.5 5.5v13M15.5 5.5v13',
    repeat: 'M17 2.5l3 3-3 3M4 11V9.5a4 4 0 0 1 4-4h12M7 21.5l-3-3 3-3M20 13v1.5a4 4 0 0 1-4 4H4',
    reset: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2',
    cal: 'M4 6h16v14H4zM4 10h16M8 3.5v5M16 3.5v5',
    flame:
      'M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.6-8.3.4 1.6 1.4 2.6 2.4 3.1C12 6.4 13.5 4 15.4 3c-.5 2.6.6 4.6 2 6.4 1.1 1.4 1.6 3 1.6 4.8 0 3.9-3 6.8-7 6.8z',
    trophy:
      'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1a3.5 3.5 0 0 0 3.6 3.5M16 6h3.5v1a3.5 3.5 0 0 1-3.6 3.5M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z',
    heart:
      'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4 7.6 4c2 0 3.4 1.1 4.4 2.6C13 5.1 14.4 4 16.4 4 20 4 22.4 7.6 21.2 11.1 19.5 15.9 12 20.5 12 20.5z',
    shield: 'M12 2.8 4.5 5.6V11c0 4.9 3.2 8.6 7.5 10.2 4.3-1.6 7.5-5.3 7.5-10.2V5.6z',
    star: 'M12 2.5l2.4 5.6 5.6-2.1-2.1 5.6 5.6 2.4-5.6 2.4 2.1 5.6-5.6-2.1L12 21.5l-2.4-5.6-5.6 2.1 2.1-5.6L.5 12l5.6-2.4L4 4l5.6 2.1z',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5.5M12 7.5v.5',
    mail: 'M4.5 5.5h15A1.5 1.5 0 0 1 21 7v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17V7a1.5 1.5 0 0 1 1.5-1.5zM3.5 6.5l8.5 6.5 8.5-6.5',
    link: 'M14 4h6v6M20 4l-9 9M18 14v5.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5H10',
    copy: 'M9 9h10.5v11.5H9zM5 15H4.5V3.5H16V4',
    text: 'M4 19 9 5l5 14M5.8 14.5h6.4M15 13.5h6M18 10.5v6',
    vib: 'M8 4h8v16H8zM4 8v8M20 8v8M2 10v4M22 10v4',
    vol: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
    widget: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    download: 'M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20.5h16',
    upload: 'M12 15V3M7.5 7.5 12 3l4.5 4.5M4 20.5h16',
    trash: 'M4 7h16M10 11v6M14 11v6M5.5 7l1 13h11l1-13M9 7V4h6v3',
    edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    kaaba: 'M4 7.5 12 4l8 3.5v10L12 21l-8-3.5zM4 7.5l8 3.5 8-3.5M12 11v10M4 11.2l8 3.5 8-3.5',
    alarm: 'M12 6.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM12 10v3.5l2.5 1.5M3.5 6 7 3M20.5 6 17 3',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    play: 'M7 4.5v15l12-7.5z',
    palette:
      'M12 3a9 9 0 0 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-1-.8-1.4-.8-2.4 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3zM7.5 12.5h.01M9.5 8h.01M14.5 8h.01M17 12h.01',
    globe:
      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z',
    hands:
      'M8 21v-5.5L4.6 9.8a1.5 1.5 0 0 1 2.5-1.6L10 12V4.5a1.3 1.3 0 0 1 2.6 0V12M16 21v-5.5l3.4-5.7a1.5 1.5 0 0 0-2.5-1.6L14 12',
    leaf: 'M5 19C5 10 10 4.5 20 4c-.5 10-6 15-15 15zM5 19l7-7',
    eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 11.5v1',
    locate: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
    swap: 'M7 4 3.5 7.5 7 11M3.5 7.5H17M17 13l3.5 3.5L17 20M20.5 16.5H7',
    moonstar:
      'M19 15.5A8 8 0 1 1 8.5 5a6.5 6.5 0 0 0 10.5 10.5zM17 3l.7 1.8L19.5 5.5l-1.8.7L17 8l-.7-1.8-1.8-.7 1.8-.7z',
    tracker:
      'M12 3.5a8.5 8.5 0 1 0 8.5 8.5M12 3.5V6M20.5 12H18M17.4 6.6l-1.7 1.7M12 12l3.4-3.4M12 13.7a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4',
    insights: 'M4 19V5M4 19h16M7.5 15l3.5-4.5 3 2.5 4.5-6M18.5 7h-2.5M18.5 7v2.5',
    level: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3 12h4M17 12h4',
    fast: 'M5 12a7 7 0 1 0 14 0M3 12h18M8 8.5c1.2-1.4 2.5-2 4-2s2.8.6 4 2M12 3v3',
    table: 'M4 5h16v14H4zM4 10h16M4 14.5h16M10 5v14'
  };
  /* duotone layer: a soft tinted fill beneath the line drawing */
  var FILL = {
    home: 'M5.6 9.6 12 4.9l6.4 4.7v9.9H5.6z',
    book: 'M12 6.6C10 5.1 7.4 4.6 4 4.6v13.2c3.4 0 6 .5 8 2z',
    tracker: 'M12 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4z',
    mosque: 'M7.5 12c0-3.4 2-5.1 4.5-6.6 2.5 1.5 4.5 3.2 4.5 6.6z',
    user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    sun: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z',
    moon: 1,
    moonstar: 1,
    bell: 'M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z',
    compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    spark: 1,
    star: 1,
    heart: 1,
    shield: 1,
    flame: 1,
    bookmark: 1,
    pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0z',
    cal: 'M4 6h16v4H4z',
    kaaba: 'M4 7.5 12 4l8 3.5-8 3.5z',
    insights: 'M7.5 15l3.5-4.5 3 2.5 4.5-6V19H7.5z',
    fast: 'M5 12a7 7 0 1 0 14 0z',
    bed: 'M3 15h18v4H3z',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    alarm: 'M12 6.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
    target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    sunrise: 'M6 14.5a6 6 0 0 1 12 0z',
    sunset: 'M6 14.5a6 6 0 0 1 12 0z',
    widget: 'M4 4h7v7H4z',
    leaf: 1,
    level: 'M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    mail: 'M4.5 5.5h15A1.5 1.5 0 0 1 21 7v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17V7a1.5 1.5 0 0 1 1.5-1.5z',
    palette: 1,
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    hands: 'M10 12V4.5a1.3 1.3 0 0 1 2.6 0V12z'
  };
  /* an icon's stroke and fill paths, for drawing it on a canvas (the desktop pill) */
  A.iconPaths = function (n) {
    var d = IC[n] || IC.spark,
      f = FILL[n];
    return { d: d, f: f === 1 ? d : f || null };
  };
  A.icon = function (n, cls) {
    var d = IC[n] || IC.spark,
      f = FILL[n],
      fd = f === 1 ? d : f;
    return (
      '<svg class="ic' +
      (n === 'left' || n === 'right' ? ' flip' : '') +
      (cls ? ' ' + cls : '') +
      '" viewBox="0 0 24 24" aria-hidden="true">' +
      (fd ? '<path class="f" d="' + fd + '"/>' : '') +
      '<path d="' +
      d +
      '"/></svg>'
    );
  };

  /* ================= state ================= */
  var KEY = 'adhkar.v10';
  function todayISO() {
    var d = new Date();
    return (
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    );
  }
  function defaults() {
    return {
      v: 10,
      profile: { name: '', hue: 'gold', since: todayISO(), onboarded: false, gender: '' },
      loc: null,
      calc: {
        method: 'mwl',
        asr: 'std',
        highLat: 'angle',
        auto: true,
        adj: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }
      },
      offsets: { ds: 20, de: 15 },
      prefs: {
        accent: 'gold',
        autoLoc: true,
        imsak: 0,
        theme: 'auto',
        ar: 30,
        tr: true,
        en: true,
        h24: false,
        haptics: true,
        motion: true,
        wake: true,
        tapText: true,
        autoNext: true,
        hijriAdj: 0,
        volKeys: true,
        trackPrayers: true,
        sound: false,
        count: 'fingers',
        pace: 'steady',
        lang: null,
        nudge: { on: true, every: 20, over: false },
        /* the desktop pill: where it sits, how big, what it shows */
        pill: { place: 'top', size: 'compact', hover: true, friday: true, adhkar: true, fast: true }
      },
      notif: {
        enabled: false,
        adhan: true,
        prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
        pre: 0,
        morning: { on: true, after: 20, from: 'fajr' },
        evening: { on: true, after: 30, from: 'asr' },
        sleep: { on: false, at: '22:30' },
        night: { on: false, off: 0 },
        duha: { on: false },
        friday: { on: true },
        ramadan: { suhoor: true, suhoorMin: 45, iftar: true },
        smart: true
      },
      counts: {},
      done: {},
      prayed: {},
      nights: {},
      duha: {},
      tasbih: {
        cur: 'subhanallah',
        target: 33,
        days: {},
        total: 0,
        per: {},
        live: 0,
        laps: 0,
        custom: [],
        log: [],
        pd: {}
      },
      fasts: {},
      fastPlan: {},
      deeds: {},
      ramadan: { skip: {}, taraweeh: {}, khatm: { juz: {}, done: 0 } },
      excused: {
        on: false,
        since: null,
        days: {},
        cycles: [],
        habit: null,
        remind: false,
        snooze: null,
        kind: 'hayd',
        nifas: []
      },
      qada: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, made: 0 },
      iqama: { on: false, fajr: 20, dhuhr: 15, asr: 15, maghrib: 5, isha: 15 },
      silence: { on: false, min: 20, jumuah: 50 },
      journal: { items: [], nudge: { night: true, friday: true, adhan: '' } },
      memo: {},
      travel: { on: true, km: 80, home: null },
      hints: {},
      learn: { last: null, done: {}, quiz: {}, qlog: [] },
      recent: [],
      paceMs: {},
      saved: [],
      last: null,
      badges: {},
      goals: { tasbih: 100 }
    };
  }
  function merge(base, x) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return base;
    Object.keys(base).forEach(function (k) {
      if (!(k in x)) return;
      var b = base[k],
        v = x[k];
      /* a stored or imported value is kept only when its shape matches the default: never null for an object, never an
         object for an array, so a damaged backup can not break the app */
      var obj = function (o) {
        return !!o && typeof o === 'object' && !Array.isArray(o);
      };
      if (Array.isArray(b)) {
        if (Array.isArray(v)) base[k] = v;
      } else if (obj(b)) {
        if (obj(v)) base[k] = Object.keys(b).length ? merge(b, v) : v;
      } else if (b === null) {
        if (v !== undefined && !Array.isArray(v) && typeof v !== 'function') base[k] = v;
      } else if (typeof v === typeof b && (typeof v !== 'number' || isFinite(v))) base[k] = v;
    });
    return base;
  }
  /* values whose default is null are checked by hand: a place needs real coordinates */
  function sane(s) {
    var l = s.loc;
    if (
      l &&
      !(typeof l === 'object' && isFinite(l.lat) && isFinite(l.lng) && Math.abs(l.lat) <= 90 && Math.abs(l.lng) <= 180)
    )
      s.loc = null;
    var h = s.travel.home;
    if (h && !(typeof h === 'object' && isFinite(h.lat) && isFinite(h.lng))) s.travel.home = null;
    if (s.learn.last && typeof s.learn.last.p !== 'string') s.learn.last = null;
    if (s.prefs.lang !== null && s.prefs.lang !== 'ar' && s.prefs.lang !== 'en') s.prefs.lang = null;
    return s;
  }
  A.storageOk = true;
  function load() {
    var raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      A.storageOk = false;
    }
    if (raw) {
      try {
        return sane(merge(defaults(), JSON.parse(raw)));
      } catch (e) {
        try {
          localStorage.setItem(KEY + '.corrupt.' + Date.now(), raw);
        } catch (_) {}
      }
    }
    /* WebView storage can be wiped (cleared data, WebView reset): fall back to the native mirror */
    try {
      var mirror = window.AndroidBridge && window.AndroidBridge.loadState && window.AndroidBridge.loadState();
      if (mirror) {
        var m = JSON.parse(mirror);
        if (m && m.v === 10) {
          A.restoredFromMirror = true;
          return sane(merge(defaults(), m));
        }
      }
    } catch (e) {}
    var s = defaults();
    try {
      var v8 = localStorage.getItem('adhkar.v8');
      if (v8) {
        importV8(s, JSON.parse(v8));
        A.migrated = true;
      }
    } catch (e) {}
    return s;
  }
  /* v8/v9 backups → v10 (counts keys are compatible: date|collection|id) */
  function importV8(s, r) {
    if (!r || r.v !== 8) throw new Error('Not an Adhkār backup');
    var re = /^\d{4}-\d{2}-\d{2}$/;
    Object.keys(r.counts || {}).forEach(function (k) {
      var p = k.split('|');
      if (p.length !== 3 || !re.test(p[0])) return;
      var n = r.counts[k];
      if (typeof n === 'number' && n > 0 && n < 1e6) s.counts[k] = Math.floor(n);
    });
    Object.keys(r.nights || {}).forEach(function (k) {
      var x = r.nights[k];
      if (re.test(k) && x) s.nights[k] = { dhikr: !!x.dhikr, pray: !!x.pray, rak: x.rak | 0, witr: false };
    });
    Object.keys(r.duha || {}).forEach(function (k) {
      if (re.test(k)) s.duha[k] = r.duha[k] | 0 || 2;
    });
    Object.keys(r.wake || {}).forEach(function (k) {
      if (re.test(k) && r.wake[k]) s.counts[k + '|waking|wake'] = 1;
    });
    if (r.prefs) {
      ['tr', 'en', 'h24', 'haptics', 'motion', 'wake', 'tapText', 'autoNext'].forEach(function (k) {
        if (typeof r.prefs[k] === 'boolean') s.prefs[k] = r.prefs[k];
      });
      if (['auto', 'dark', 'light'].indexOf(r.prefs.theme) >= 0) s.prefs.theme = r.prefs.theme;
      if (r.prefs.ar >= 22 && r.prefs.ar <= 52) s.prefs.ar = r.prefs.ar;
    }
    if (r.offsets) s.offsets = { ds: r.offsets.ds | 0 || 20, de: r.offsets.de | 0 || 15 };
    if (Array.isArray(r.saved))
      s.saved = r.saved
        .filter(function (x) {
          return typeof x === 'string';
        })
        .slice(0, 500);
    s.needsRebuild = true;
  }
  /* rebuild session completion marks from counts (after the catalogue exists) */
  function rebuildDone(s) {
    var seen = {};
    Object.keys(s.counts).forEach(function (k) {
      var p = k.split('|'),
        sk = p[0] + '|' + p[1];
      if (!seen[sk]) {
        seen[sk] = 1;
        markIfDone(s, p[0], p[1]);
      }
    });
    delete s.needsRebuild;
  }
  A.S = load();
  var S = A.S;
  var saveNow = function () {
    var json = JSON.stringify(S);
    try {
      localStorage.setItem(KEY, json);
      A.storageOk = true;
    } catch (e) {
      A.storageOk = false;
    }
    A.N.sync();
    mirrorSoon(json);
  };
  var mirrorJson = null,
    mirrorT = null;
  function mirrorSoon(json) {
    mirrorJson = json;
    clearTimeout(mirrorT);
    mirrorT = setTimeout(function () {
      try {
        if (window.AndroidBridge && window.AndroidBridge.saveState) window.AndroidBridge.saveState(mirrorJson);
      } catch (e) {}
    }, 1500);
  }
  var saveSoon = A.debounce(saveNow, 300);
  /* A.rev counts every change to the saved state; a screen kept alive is reused only if it was built at this count */
  A.rev = 0;
  A.save = function (now) {
    A.rev++;
    if (now) saveNow();
    else saveSoon();
  };
  A.reset = function () {
    A.rev++;
    var d = defaults();
    Object.keys(S).forEach(function (k) {
      delete S[k];
    });
    Object.assign(S, d);
    saveNow();
  };
  A.exportJSON = function () {
    return JSON.stringify({ app: 'adhkar', exported: new Date().toISOString(), state: S }, null, 1);
  };
  A.importJSON = function (text) {
    var r = JSON.parse(text),
      s = defaults();
    if (r && r.app === 'adhkar' && r.state && r.state.v === 10) sane(merge(s, r.state));
    else importV8(s, r);
    if (s.needsRebuild) rebuildDone(s);
    Object.keys(S).forEach(function (k) {
      delete S[k];
    });
    Object.assign(S, s);
    A.rev++;
    saveNow();
  };

  /* ================= time & location ================= */
  A.tz = function () {
    return (S.loc && S.loc.tz) || '';
  };
  A.parts = function (ms) {
    return P.partsIn(ms == null ? Date.now() : ms, A.tz());
  };
  A.keyAt = function (ms) {
    var p = A.parts(ms);
    return P.keyOf(p.y, p.m, p.d);
  };
  A.today = function () {
    return A.keyAt(Date.now());
  };
  A.shift = P.shiftKey;
  A.dow = function (key) {
    var a = key.split('-');
    return new Date(Date.UTC(+a[0], +a[1] - 1, +a[2])).getUTCDay();
  };
  var dayCache = {};
  function calcOpts() {
    return {
      lat: S.loc.lat,
      lng: S.loc.lng,
      elev: 0,
      method: S.calc.method,
      asr: S.calc.asr,
      highLat: S.calc.highLat,
      adj: S.calc.adj,
      offsets: S.offsets
    };
  }
  A.calcSig = function () {
    return S.loc
      ? [
          S.loc.lat,
          S.loc.lng,
          S.calc.method,
          S.calc.asr,
          S.calc.highLat,
          JSON.stringify(S.calc.adj),
          S.offsets.ds,
          S.offsets.de
        ].join('|')
      : '';
  };
  A.pday = function (key) {
    if (!S.loc) return null;
    var sig = A.calcSig() + '#' + key;
    if (!dayCache[sig]) {
      dayCache[sig] = P.day(key, calcOpts());
    }
    return dayCache[sig];
  };
  A.fmtT = function (ms, opt) {
    if (!isFinite(ms)) return '·';
    var p = A.parts(ms),
      h = p.h,
      m = String(p.min).padStart(2, '0');
    if (S.prefs.h24) return String(h).padStart(2, '0') + ':' + m;
    var ap = h < 12 ? 'am' : 'pm';
    h = h % 12 || 12;
    return h + ':' + m + (opt === 'bare' ? '' : '<small class="ap"> ' + ap + '</small>');
  };
  A.fmtTxt = function (ms) {
    if (!isFinite(ms)) return '·';
    return A.fmtT(ms, 'bare') + (S.prefs.h24 ? '' : A.parts(ms).h < 12 ? ' am' : ' pm');
  };
  A.fmtDur = function (ms, long) {
    var m = Math.max(0, Math.round(ms / 60000)),
      h = Math.floor(m / 60);
    m = m % 60;
    if (long) return h ? h + ' hr ' + (m ? m + ' min' : '') : m + ' min';
    return h ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm';
  };
  A.fmtCountdown = function (ms) {
    var s = Math.max(0, Math.floor(ms / 1000)),
      h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      ss = s % 60;
    return h
      ? h + 'h ' + String(m).padStart(2, '0') + 'm'
      : m
        ? m + 'm ' + String(ss).padStart(2, '0') + 's'
        : ss + 's';
  };
  var MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  A.MONTHS = MONTHS;
  A.DOW = DOW;
  A.fmtDate = function (key, style) {
    var a = key.split('-').map(Number),
      dw = DOW[A.dow(key)];
    if (style === 'short') return dw.slice(0, 3) + ', ' + a[2] + ' ' + MONTHS[a[1] - 1].slice(0, 3);
    return dw + ', ' + a[2] + ' ' + MONTHS[a[1] - 1];
  };

  /* Hijri (Umm al-Qurā via Intl), with user adjustment. */
  var HM = [
    'Muḥarram',
    'Ṣafar',
    'Rabīʿ al-Awwal',
    'Rabīʿ al-Ākhir',
    'Jumādā al-Ūlā',
    'Jumādā al-Ākhirah',
    'Rajab',
    'Shaʿbān',
    'Ramaḍān',
    'Shawwāl',
    'Dhū al-Qaʿdah',
    'Dhū al-Ḥijjah'
  ];
  var HM_AR = [
    'محرم',
    'صفر',
    'ربيع الأول',
    'ربيع الآخر',
    'جمادى الأولى',
    'جمادى الآخرة',
    'رجب',
    'شعبان',
    'رمضان',
    'شوال',
    'ذو القعدة',
    'ذو الحجة'
  ];
  var hfmt = null;
  try {
    hfmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    hfmt = null;
  }
  A.hijri = function (key) {
    var k = A.shift(key, S.prefs.hijriAdj | 0),
      a = k.split('-').map(Number);
    if (hfmt) {
      var p = {};
      hfmt.formatToParts(new Date(Date.UTC(a[0], a[1] - 1, a[2], 12))).forEach(function (x) {
        p[x.type] = x.value;
      });
      var d = parseInt(p.day, 10),
        m = parseInt(p.month, 10),
        y = parseInt(String(p.year).replace(/\D/g, ''), 10);
      if (d && m && y) return { d: d, m: m, y: y, name: HM[m - 1], ar: HM_AR[m - 1] };
    }
    /* arithmetic (tabular) fallback */
    var jd = Math.floor(Date.UTC(a[0], a[1] - 1, a[2]) / 86400000 + 2440587.5) + 0.5;
    var l = Math.floor(jd) - 1948440 + 10632,
      n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    var j =
      Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
      Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l =
      l -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    var mm = Math.floor((24 * l) / 709),
      dd = l - Math.floor((709 * mm) / 24),
      yy = 30 * n + j - 30;
    return { d: dd, m: mm, y: yy, name: HM[mm - 1], ar: HM_AR[mm - 1] };
  };
  A.hijriText = function (key) {
    var h = A.hijri(key);
    return h.d + ' ' + h.name + ' ' + h.y + ' AH';
  };

  /* Current position in the prayer day. */
  A.now = function () {
    var now = Date.now(),
      key = A.today();
    if (!S.loc) return { key: key, now: now };
    var t = A.pday(key),
      y = A.pday(A.shift(key, -1)),
      tm = A.pday(A.shift(key, 1));
    /* yesterday's maghrib and ʿishāʾ lead the sequence: at high latitudes ʿishāʾ can fall after midnight */
    var seq = [
      ['maghrib', y.maghrib, A.shift(key, -1)],
      ['isha', y.isha, A.shift(key, -1)]
    ]
      .concat(
        P.ORDER.map(function (k) {
          return [k, t[k], key];
        })
      )
      .concat([['fajr', tm.fajr, A.shift(key, 1)]])
      .filter(function (x) {
        return isFinite(x[1]);
      })
      .sort(function (a, b) {
        return a[1] - b[1];
      });
    var i = 1;
    while (i < seq.length && seq[i][1] <= now) i++;
    var prev = seq[i - 1],
      next = seq[Math.min(i, seq.length - 1)];
    /* 'current' prayer ignores sunrise (sunrise ends Fajr's time) */
    var cur = prev[0] === 'sunrise' ? null : prev[0];
    var nightKey = now < t.fajr ? A.shift(key, -1) : key;
    return {
      key: key,
      now: now,
      t: t,
      prev: { k: prev[0], at: prev[1], key: prev[2] },
      next: { k: next[0], at: next[1], key: next[2] },
      cur: cur,
      nightKey: nightKey,
      night: A.pday(nightKey)
    };
  };

  /* ================= catalogue ================= */
  var COL = {};
  D.collections.forEach(function (c) {
    COL[c.id] = c;
  });
  A.COLS = D.collections;
  A.PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  A.col = function (id) {
    return COL[id];
  };
  /* Resolved item list. For after-ṣalāh the prayer filters 'only' items. colKey is the tracking key. */
  A.items = function (cid, prayer) {
    var c = COL[cid];
    if (!c) return [];
    return c.items
      .filter(function (e) {
        return !e.only || (prayer && e.only.indexOf(prayer) >= 0);
      })
      .map(function (e, i) {
        var it = D.items[e.u],
          target = e.n != null ? e.n : it.count;
        return {
          uid: e.u,
          id: e.u.split(':').pop(),
          qs: it.qs,
          au: it.au,
          lt: it.lt || 0,
          rd: it.rd || 0,
          quran: !!it.quran,
          title: it.title,
          ar: it.ar,
          tr: it.tr,
          en: it.en,
          note: it.note,
          refs: it.refs,
          tag: it.tag,
          long: !!it.long,
          kind: it.kind === 'flag' ? 'flag' : target ? 'fixed' : 'open',
          target: it.kind === 'flag' ? 1 : target || null,
          only: e.only
        };
      });
  };
  A.colKey = function (cid, prayer) {
    return COL[cid] && COL[cid].perPrayer ? cid + '-' + (prayer || 'fajr') : cid;
  };
  A.cnt = function (date, ck, id) {
    return S.counts[date + '|' + ck + '|' + id] || 0;
  };
  A.setCnt = function (date, ck, id, n) {
    var k = date + '|' + ck + '|' + id;
    if (n > 0) S.counts[k] = n;
    else delete S.counts[k];
    var was = !!S.done[date + '|' + ck];
    markIfDone(S, date, ck);
    var is = !!S.done[date + '|' + ck];
    A.save();
    return { completed: !was && is };
  };
  function markIfDone(s, date, ck) {
    var base = ck.indexOf('salah-') === 0 ? 'salah' : ck,
      prayer = base === 'salah' ? ck.slice(6) : null,
      c = COL[base];
    if (!c || !c.track) return;
    var items = A.items ? A.items(base, prayer) : [];
    var all =
      items.length &&
      items.every(function (it) {
        var n = s.counts[date + '|' + ck + '|' + it.id] || 0;
        return it.kind === 'open' || n >= it.target;
      });
    if (all) {
      if (!s.done[date + '|' + ck]) s.done[date + '|' + ck] = Date.now();
    } else delete s.done[date + '|' + ck];
  }
  A.progress = function (date, cid, prayer) {
    var items = A.items(cid, prayer),
      ck = A.colKey(cid, prayer),
      done = 0,
      units = 0,
      ud = 0;
    items.forEach(function (it) {
      var n = A.cnt(date, ck, it.id);
      if (it.kind !== 'open') {
        units += it.target;
        ud += Math.min(n, it.target);
        if (n >= it.target) done++;
      }
    });
    var total = items.filter(function (it) {
      return it.kind !== 'open';
    }).length;
    return {
      done: done,
      total: total,
      frac: units ? ud / units : 0,
      complete: total > 0 && done === total,
      started: ud > 0,
      items: items,
      ck: ck
    };
  };
  A.firstOpen = function (date, cid, prayer) {
    var p = A.progress(date, cid, prayer);
    for (var i = 0; i < p.items.length; i++) {
      var it = p.items[i];
      if (it.kind !== 'open' && A.cnt(date, p.ck, it.id) < it.target) return i;
    }
    return 0;
  };
  /* rough recitation time: ~0.38 s per Arabic word */
  A.estimate = function (cid, prayer) {
    var s = 0;
    A.items(cid, prayer).forEach(function (it) {
      if (A.pace) s += A.pace.total(it, it.target || 1) / 1000;
      else {
        var w = it.ar.split(/\s+/).length;
        s += (it.long ? 120 : w * 0.38 + 1.2) * (it.target || 1);
      }
    });
    return Math.max(1, Math.round(s / 60));
  };
  A.isSaved = function (cid, id) {
    return S.saved.indexOf(cid + '|' + id) >= 0;
  };
  A.toggleSaved = function (cid, id) {
    var k = cid + '|' + id,
      i = S.saved.indexOf(k);
    if (i >= 0) S.saved.splice(i, 1);
    else S.saved.unshift(k);
    A.save();
    return i < 0;
  };
  /* lower-case, strip Latin diacritics and transliteration marks: "subhanallah" finds "Subḥānallāh" */
  /* an image or file shipped with the app; the single-file build supplies them embedded (window.ASSETS) */
  A.asset = function (path) {
    return (window.ASSETS && window.ASSETS[path]) || path;
  };
  A.fold = function (s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[ʿʾ’'‘`-]/g, '')
      .toLowerCase();
  };
  /* ================= stats ================= */
  A.dayDone = function (date) {
    var o = {
      morning: !!S.done[date + '|morning'],
      evening: !!S.done[date + '|evening'],
      sleep: !!S.done[date + '|sleep'],
      waking: !!S.done[date + '|waking'],
      salah: {}
    };
    A.PRAYERS.forEach(function (p) {
      o.salah[p] = !!S.done[date + '|salah-' + p];
    });
    o.salahN = A.PRAYERS.filter(function (p) {
      return o.salah[p];
    }).length;
    o.duha = !!S.duha[date];
    o.night = !!(S.nights[date] && (S.nights[date].pray || S.nights[date].dhikr));
    o.score =
      (o.morning ? 1 : 0) +
      (o.evening ? 1 : 0) +
      (o.sleep ? 1 : 0) +
      (o.waking ? 1 : 0) +
      o.salahN * 0.4 +
      (o.duha ? 1 : 0) +
      (o.night ? 1 : 0);
    return o;
  };
  function activeDays() {
    var set = {};
    Object.keys(S.done).forEach(function (k) {
      set[k.slice(0, 10)] = 1;
    });
    Object.keys(S.duha).forEach(function (k) {
      set[k] = 1;
    });
    Object.keys(S.nights).forEach(function (k) {
      var n = S.nights[k];
      if (n && (n.pray || n.dhikr)) set[k] = 1;
    });
    Object.keys(S.fasts || {}).forEach(function (k) {
      set[k] = 1;
    });
    return set;
  }
  /* Break-from-ṣalāh days are protected: they never break a streak (and never add to it on their own). */
  A.streaks = function () {
    var set = activeDays(),
      today = A.today(),
      ex = function (d) {
        return A.isExcused(d);
      };
    var d = set[today] || ex(today) ? today : A.shift(today, -1),
      cur = 0,
      guard = 0;
    while ((set[d] || ex(d)) && guard++ < 5000) {
      if (set[d]) cur++;
      d = A.shift(d, -1);
    }
    var keys = Object.keys(set).sort(),
      best = 0,
      run = 0,
      prev = null;
    keys.forEach(function (k) {
      var bridged =
        prev &&
        (function () {
          var x = A.shift(prev, 1);
          while (x < k && ex(x)) x = A.shift(x, 1);
          return x === k;
        })();
      run = bridged ? run + 1 : 1;
      best = Math.max(best, run);
      prev = k;
    });
    return { cur: cur, best: Math.max(best, cur), days: keys.length, todayActive: !!set[today] };
  };
  /* ---- break from ṣalāh (ḥayḍ / nifās) ---- */
  A.isExcused = function (d) {
    var e = S.excused;
    return !!(e && (e.days[d] || (e.on && e.since && d >= e.since && d <= A.today())));
  };
  A.excusedDay = function () {
    var e = S.excused;
    if (!e.on || !e.since) return 0;
    var n = 1,
      d = e.since,
      t = A.today();
    while (d < t && n < 400) {
      d = A.shift(d, 1);
      n++;
    }
    return n;
  };
  /* The habit is learned from her own cycles (median of the last six); she can set it until there are two.
     The app predicts and prompts. It never starts or ends a break by itself: in the Sunnah a woman stops praying when
     she sees the blood and resumes when she sees purity, so the decision stays hers. */
  function daysBetween(a, b) {
    return Math.round(
      (Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
        Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) /
        86400000
    );
  }
  function median(a) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) {
        return x - y;
      }),
      m = s.length >> 1;
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
  }
  A.daysBetween = daysBetween;
  A.cycle = function () {
    var e = S.excused,
      cy = (e.cycles || [])
        .filter(function (c) {
          return c.from && c.to;
        })
        .slice(-7),
      hb = e.habit || {};
    var lens = cy
        .map(function (c) {
          return daysBetween(c.from, c.to) + 1;
        })
        .slice(-6),
      gaps = [];
    for (var i = 1; i < cy.length; i++) gaps.push(daysBetween(cy[i - 1].from, cy[i].from));
    gaps = gaps
      .filter(function (g) {
        return g >= 15 && g <= 60;
      })
      .slice(-6);
    var len = lens.length >= 2 ? median(lens) : hb.len || median(lens) || 0,
      gap = gaps.length >= 1 ? median(gaps) : hb.gap || 0;
    var learned = lens.length >= 2 && gaps.length >= 1,
      t = A.today(),
      out = { len: len, gap: gap, learned: learned, count: cy.length };
    var lastStart = e.on ? e.since : cy.length ? cy[cy.length - 1].from : hb.last || null;
    if (gap && lastStart) {
      var next = A.shift(lastStart, gap);
      if (e.on) next = A.shift(e.since, gap);
      out.next = next;
      out.inDays = daysBetween(t, next);
      out.due = !e.on && out.inDays <= 1 && out.inDays >= -7 && e.snooze !== t;
    }
    if (e.on && e.kind === 'nifas') {
      out.day = A.excusedDay();
      out.nifas = true;
      out.usualDone = out.day >= 40;
      out.next = null;
      out.due = false;
      return out;
    }
    if (e.on && len) {
      out.day = A.excusedDay();
      out.usualDone = out.day >= len;
      out.long = out.day > len + 5;
    }
    return out;
  };
  A.setExcused = function (on, from) {
    var e = S.excused,
      t = A.today();
    if (on && !e.on) {
      e.on = true;
      e.since = from && from < t ? from : t;
      /* Ramaḍān days already filled in as fasted are not fasts on a break: they become days to make up */
      for (var d0 = e.since; d0 <= t; d0 = A.shift(d0, 1)) if (S.fasts[d0] === 'ramadan') delete S.fasts[d0];
    } else if (!on && e.on) {
      var d = e.since;
      while (d && d <= t) {
        e.days[d] = 1;
        d = A.shift(d, 1);
      }
      if (e.kind === 'nifas')
        e.nifas = (e.nifas || [])
          .concat([{ from: e.since, to: t }])
          .slice(-12); /* postpartum is not part of the monthly habit */
      else e.cycles = (e.cycles || []).concat([{ from: e.since, to: t }]).slice(-24);
      e.kind = 'hayd';
      e.on = false;
      e.since = null;
    }
    A.save(true);
  };
  /* Ramaḍān days missed on a break, minus make-up fasts logged since */
  A.qadaOwed = function () {
    var missed = 0,
      made = 0,
      e = S.excused,
      seen = {};
    Object.keys(e.days).forEach(function (d) {
      seen[d] = 1;
    });
    if (e.on && e.since) {
      var d = e.since;
      while (d <= A.today()) {
        seen[d] = 1;
        d = A.shift(d, 1);
      }
    }
    Object.keys(seen).forEach(function (d) {
      if (A.hijri(d).m === 9) missed++;
    });
    Object.keys(S.fasts || {}).forEach(function (d) {
      if (S.fasts[d] === 'qada') made++;
    });
    return { missed: missed, made: made, owed: Math.max(0, missed - made) };
  };

  A.totals = function () {
    var dhikr = 0,
      sessions = Object.keys(S.done).length,
      byDay = {};
    Object.keys(S.counts).forEach(function (k) {
      var n = S.counts[k];
      dhikr += n;
      var d = k.slice(0, 10);
      byDay[d] = (byDay[d] || 0) + n;
    });
    Object.keys(S.tasbih.days).forEach(function (d) {
      byDay[d] = (byDay[d] || 0) + S.tasbih.days[d];
    });
    var prayed = 0;
    Object.keys(S.prayed).forEach(function (d) {
      prayed += Object.keys(S.prayed[d]).length;
    });
    var nights = Object.keys(S.nights).filter(function (k) {
      return S.nights[k].pray;
    }).length;
    return {
      dhikr: dhikr + (S.tasbih.total || 0),
      tasbih: S.tasbih.total || 0,
      sessions: sessions,
      byDay: byDay,
      prayed: prayed,
      nights: nights,
      duha: Object.keys(S.duha).length,
      fasts: Object.keys(S.fasts || {}).length
    };
  };

  /* Dhikr of the day: deterministic per date, from general remembrance only.
     Time-bound collections (morning-only, evening-only, sleep, night, adhān, everyday situations) are excluded,
     and Ramaḍān duʿāʾs join only during Ramaḍān. */
  A.dailyDhikr = function (key) {
    var pool = [],
      seen = {},
      ram = A.hijri(key).m === 9;
    var add = function (c, it, i) {
      if (seen[it.uid] || it.kind === 'flag' || it.long || !it.en || it.ar.length >= 170 || it.ar.length < 40) return;
      seen[it.uid] = 1;
      pool.push({ c: c, it: it, i: i });
    };
    ['quick', 'salah'].concat(ram ? ['ramadan'] : []).forEach(function (id) {
      var c = COL[id];
      if (c)
        A.items(id, 'fajr').forEach(function (it, i) {
          add(c, it, i);
        });
    });
    /* items shared by morning and evening are not time-bound */
    var ev = {};
    A.items('evening').forEach(function (it) {
      ev[it.uid] = 1;
    });
    A.items('morning').forEach(function (it, i) {
      if (ev[it.uid]) add(COL.morning, it, i);
    });
    var h = 0;
    for (var j = 0; j < key.length; j++) h = (h * 31 + key.charCodeAt(j)) >>> 0;
    return pool[h % pool.length];
  };

  /* ================= achievements ================= */
  A.BADGES = [
    {
      id: 'first-light',
      name: 'First Light',
      d: 'Complete the morning adhkār',
      h: 'dawn',
      ic: 'sunrise',
      ok: function (x) {
        return x.has('morning');
      }
    },
    {
      id: 'dusk',
      name: 'Evening Calm',
      d: 'Complete the evening adhkār',
      h: 'dusk',
      ic: 'sunset',
      ok: function (x) {
        return x.has('evening');
      }
    },
    {
      id: 'five',
      name: 'Five Pillars',
      d: 'After-ṣalāh adhkār for all five prayers in a day',
      h: 'jade',
      ic: 'mosque',
      ok: function (x) {
        return x.fiveDay;
      }
    },
    {
      id: 'streak7',
      name: 'Steadfast',
      d: 'A 7-day streak',
      h: 'gold',
      ic: 'flame',
      ok: function (x) {
        return x.st.best >= 7;
      }
    },
    {
      id: 'streak30',
      name: 'Devoted',
      d: 'A 30-day streak',
      h: 'gold',
      ic: 'flame',
      ok: function (x) {
        return x.st.best >= 30;
      }
    },
    {
      id: 'streak100',
      name: 'Unwavering',
      d: 'A 100-day streak',
      h: 'gold',
      ic: 'trophy',
      ok: function (x) {
        return x.st.best >= 100;
      }
    },
    {
      id: 'tsb1k',
      name: 'A Thousand',
      d: '1,000 glorifications',
      h: 'teal',
      ic: 'tracker',
      ok: function (x) {
        return x.tot.dhikr >= 1000;
      }
    },
    {
      id: 'tsb10k',
      name: 'Ten Thousand',
      d: '10,000 glorifications',
      h: 'teal',
      ic: 'tracker',
      ok: function (x) {
        return x.tot.dhikr >= 10000;
      }
    },
    {
      id: 'night',
      name: 'Night Riser',
      d: 'Log a night prayer',
      h: 'night',
      ic: 'moon',
      ok: function (x) {
        return x.tot.nights >= 1;
      }
    },
    {
      id: 'duha7',
      name: 'Ḍuḥā Keeper',
      d: 'Pray Ḍuḥā on 7 days',
      h: 'goldh',
      ic: 'sun',
      ok: function (x) {
        return x.tot.duha >= 7;
      }
    },
    {
      id: 'sleep7',
      name: 'Peaceful Rest',
      d: 'Sleep adhkār 7 times',
      h: 'indigo',
      ic: 'bed',
      ok: function (x) {
        return x.n('sleep') >= 7;
      }
    },
    {
      id: 'fast7',
      name: 'Patient',
      d: 'Log 7 days of fasting',
      h: 'sand',
      ic: 'fast',
      ok: function (x) {
        return x.tot.fasts >= 7;
      }
    },
    {
      id: 'hundred',
      name: 'A Hundred Sittings',
      d: '100 completed sessions',
      h: 'rose',
      ic: 'star',
      ok: function (x) {
        return x.tot.sessions >= 100;
      }
    }
  ];
  A.checkBadges = function () {
    var cnt = {},
      five = {};
    Object.keys(S.done).forEach(function (k) {
      var c = k.slice(11);
      var b = c.indexOf('salah-') === 0 ? 'salah' : c;
      cnt[b] = (cnt[b] || 0) + 1;
      if (b === 'salah') five[k.slice(0, 10)] = (five[k.slice(0, 10)] || 0) + 1;
    });
    var x = {
      st: A.streaks(),
      tot: A.totals(),
      has: function (c) {
        return !!cnt[c];
      },
      n: function (c) {
        return cnt[c] || 0;
      },
      fiveDay: Object.keys(five).some(function (d) {
        return five[d] >= 5;
      })
    };
    var fresh = [];
    A.BADGES.forEach(function (b) {
      if (!S.badges[b.id] && b.ok(x)) {
        S.badges[b.id] = A.today();
        fresh.push(b);
      }
    });
    if (fresh.length) A.save();
    return fresh;
  };

  /* ================= occasions (Hijri-aware) ================= */
  /* the adhkār session due now: morning from Fajr (or sunrise) until the evening begins at ʿAṣr (or Maghrib) */
  /* a prayer can be logged only once its time has begun */
  A.canLog = function (day, p) {
    if (day > A.today()) return false;
    if (!S.loc) return true;
    var at = A.pday(day)[p];
    return !isFinite(at) || at <= Date.now(); /* yesterday's ʿishāʾ may still be ahead after midnight */
  };
  A.notYet = function (day, p) {
    A.N.haptic('tick');
    A.toast(P.NAMES[p] + ' begins at ' + A.fmtTxt(A.pday(day)[p]), 'clock');
  };
  /* the last third is a span, from its start until Fajr; the wake time can sit a little before or inside it */
  A.thirdWake = function (t) {
    var off = (S.notif.night && S.notif.night.off) || 0;
    return Math.min(t.lastThird + off * 60000, t.nextFajr - 15 * 60000);
  };
  A.thirdRange = function (t) {
    return A.fmtTxt(t.lastThird) + ' → ' + A.fmtTxt(t.nextFajr);
  };
  /* adhkār have their times: a quiet word when a collection is opened outside its own */
  A.timeNote = function (cid, prayer) {
    if (!S.loc) return '';
    var k = A.today(),
      t = A.pday(k),
      now = Date.now(),
      ses = A.sessionNow();
    if (cid === 'salah' && prayer && !A.canLog(k, prayer))
      return P.NAMES[prayer] + ' begins at ' + A.fmtTxt(t[prayer]) + '. These are said after the prayer.';
    if (cid === 'morning' && ses !== 'morning')
      return now < t.fajr
        ? 'The morning adhkār begin at Fajr, ' + A.fmtTxt(t.fajr) + '.'
        : now < t.asr
          ? 'The morning adhkār end before Dhuhr. The evening adhkār begin at ʿAṣr, ' + A.fmtTxt(t.asr) + '.'
          : 'The morning adhkār are from Fajr until before Dhuhr. It is evening now.';
    if (cid === 'evening' && ses !== 'evening' && now >= t.fajr && now < t.asr)
      return 'The evening adhkār begin at ʿAṣr, ' + A.fmtTxt(t.asr) + '.';
    return '';
  };
  A.sessionNow = function () {
    if (!S.loc) return null;
    var k = A.today(),
      t = A.pday(k),
      now = Date.now(),
      N = S.notif;
    var ms = N.morning && N.morning.from === 'sunrise' ? t.sunrise : t.fajr,
      es = N.evening && N.evening.from === 'maghrib' ? t.maghrib : t.asr;
    /* the morning adhkār end before Dhuhr, as the sun reaches its height; the evening ones begin at ʿAṣr */
    if (now >= ms && now < t.dhuhr) return 'morning';
    if (now >= es && now < t.isha + 90 * 60000) return 'evening';
    return null;
  };
  A.occasion = function (key, evening) {
    var h = A.hijri(key),
      hn = A.hijri(A.shift(key, 1)),
      dw = A.dow(key),
      out = [];
    /* a fast you planned: the evening before, to prepare; on the day, to log it */
    var plan = S.fastPlan || {};
    if (evening && plan[A.shift(key, 1)] && !S.fasts[A.shift(key, 1)])
      out.push({
        h: 'sand',
        ic: 'fast',
        t: 'Tomorrow you plan to fast',
        d: 'Make your intention tonight, and eat suhūr before Fajr.'
      });
    if (!evening && plan[key] && !S.fasts[key])
      out.push({
        h: 'sand',
        ic: 'fast',
        t: 'Today you planned to fast',
        d: 'May Allah accept it. Tap a day in the calendar to log it.'
      });
    /* after Maghrib the next Islamic day has begun, so tonight's notes come first */
    if (evening) {
      if (hn.m === 9 && hn.d === 1)
        out.push({
          h: 'goldh',
          ic: 'moonstar',
          t: 'Ramaḍān begins tonight',
          d: 'The first tarāwīḥ is tonight and the first fast is tomorrow, if the crescent is confirmed. Ramaḍān Mubārak.'
        });
      else if (hn.m === 10 && hn.d === 1)
        out.push({
          h: 'rose',
          ic: 'star',
          t: 'ʿĪd is tomorrow',
          d: 'The takbīr begins from sunset. Give zakāt al-fiṭr before the ʿĪd prayer.'
        });
      else if (hn.m === 9 && hn.d >= 21 && hn.d % 2 === 1)
        out.push({
          h: 'goldh',
          ic: 'moonstar',
          t: 'Tonight is night ' + hn.d,
          d: 'An odd night of the last ten. Seek Laylat al-Qadr: Allāhumma innaka ʿafuwwun tuḥibbu al-ʿafwa faʿfu ʿannī.'
        });
      else if (hn.m === 9 && hn.d >= 21)
        out.push({
          h: 'indigo',
          ic: 'moonstar',
          t: 'Night ' + hn.d + ' of Ramaḍān',
          d: 'The last ten nights. Keep striving in prayer, Qurʾān and duʿāʾ.'
        });
      if (dw === 4 && !(A.jumuah && A.jumuah().on))
        out.push({
          h: 'jade',
          ic: 'mosque',
          t: 'The night of Jumuʿah',
          d: 'Send abundant ṣalawāt upon the Prophet ﷺ tonight and tomorrow.'
        });
    }
    if (h.m === 9)
      out.push({
        h: 'goldh',
        ic: 'moonstar',
        t: 'Ramaḍān · day ' + h.d,
        d: 'The month of the Qurʾān. May Allah accept your fasting and prayers.'
      });
    if (h.m === 12 && h.d === 9)
      out.push({
        h: 'goldh',
        ic: 'sun',
        t: 'The Day of ʿArafah',
        d: 'Fasting it expiates two years of sins (Muslim 1162). Best of duʿāʾ is on this day.'
      });
    else if (h.m === 12 && h.d <= 10)
      out.push({
        h: 'goldh',
        ic: 'spark',
        t: 'The first ten of Dhū al-Ḥijjah',
        d: 'No days are dearer to Allah for good deeds. Increase in takbīr, taḥmīd and tahlīl.'
      });
    if ((h.m === 10 && h.d === 1) || (h.m === 12 && h.d === 10))
      out.push({
        h: 'rose',
        ic: 'star',
        t: 'The day of ʿĪd',
        d: 'Taqabbalallāhu minnā wa minkum: may Allah accept from us and from you. The greeting of the Companions.'
      });
    if (h.m === 1 && (h.d === 9 || h.d === 10))
      out.push({
        h: 'teal',
        ic: 'moon',
        t: 'ʿĀshūrāʾ',
        d: 'Fasting the 10th (with the 9th) expiates the year before (Muslim 1162).'
      });
    if (dw === 5 && !(A.jumuah && A.jumuah().on))
      out.push({
        h: 'jade',
        ic: 'mosque',
        t: 'Jumuʿah',
        d: 'Read Sūrat al-Kahf, send abundant ṣalawāt, and seek the hour of response before Maghrib.'
      });
    if (hn.d >= 13 && hn.d <= 15 && hn.m !== 9 && !(hn.m === 12 && hn.d === 13))
      out.push({
        h: 'sand',
        ic: 'moon',
        t: 'Tomorrow is a White Day (' + hn.d + ' ' + hn.name + ')',
        d: 'Fasting the 13th, 14th and 15th is like fasting the whole month.'
      });
    else if ((dw === 0 || dw === 3) && h.m !== 9)
      out.push({
        h: 'sand',
        ic: 'cal',
        t: 'Tomorrow is ' + (dw === 0 ? 'Monday' : 'Thursday'),
        d: 'Deeds are presented on Mondays and Thursdays, a Sunnah day to fast.'
      });
    return out;
  };

  /* ================= native bridge ================= */
  var B = window.AndroidBridge || null;
  function call(fn) {
    if (!B || typeof B[fn] !== 'function') return undefined;
    try {
      return B[fn].apply(B, Array.prototype.slice.call(arguments, 1));
    } catch (e) {
      return undefined;
    }
  }
  A.N = {
    has: !!B,
    call: call,
    haptic: function (k) {
      if (!S.prefs.haptics) return;
      if (B) call('haptic', k);
      else if (navigator.vibrate) {
        try {
          navigator.vibrate(
            k === 'heavy' ? [20, 50, 30] : k === 'success' ? [12, 60, 12, 60, 24] : k === 'click' ? 14 : 7
          );
        } catch (e) {}
      }
    },
    keepAwake: function (on) {
      call('keepAwake', !!on);
    },
    statusBar: function (light) {
      call('setSystemBars', !!light);
    },
    share: function (text) {
      if (B) return call('shareText', text);
      if (navigator.share) return navigator.share({ text: text }).catch(function () {});
      A.copy(text);
    },
    shareImage: function (dataUrl, text) {
      if (B) return call('shareImage', dataUrl.split(',')[1], text || '');
      fetch(dataUrl)
        .then(function (r) {
          return r.blob();
        })
        .then(function (b) {
          var f = new File([b], 'adhkar.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [f] }))
            navigator.share({ files: [f], text: text }).catch(function () {});
          else {
            var a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'adhkar.png';
            a.click();
          }
        });
    },
    open: function (url) {
      if (B) call('openUrl', url);
      else window.open(url, '_blank', 'noopener');
    },
    alarm: function (h, m, label) {
      return call('setAlarm', h, m, label) === true;
    },
    sync: A.debounce(function () {
      if (!B) return;
      var key = A.today(),
        dd = A.dayDone(key),
        tp = A.trkPhrase ? A.trkPhrase() : null,
        dz = A.dailyDhikr(key),
        prog = {};
      ['morning', 'evening', 'sleep'].forEach(function (id) {
        if (COL[id]) prog[id] = +A.progress(key, id).frac.toFixed(3);
      });
      call(
        'sync',
        JSON.stringify({
          name: S.profile.name,
          gender: S.profile.gender || '',
          lang: A.ar && A.ar() ? 'ar' : 'en',
          excused: !!S.excused.on,
          imsak: S.prefs.imsak || 0,
          loc: S.loc,
          calc: S.calc,
          offsets: S.offsets,
          notif: S.notif,
          h24: S.prefs.h24,
          hijriAdj: S.prefs.hijriAdj,
          today: {
            key: key,
            prayed: S.prayed[key] || {},
            morning: dd.morning,
            evening: dd.evening,
            sleep: dd.sleep,
            salah: dd.salah,
            duha: dd.duha
          },
          accent:
            { gold: '#f1d59e', emerald: '#9ee6c6', sapphire: '#b5c9fa', rose: '#f6c1d1', pearl: '#ece8df' }[
              S.prefs.accent
            ] || '#f1d59e',
          tasbih: tp && A.trkSync ? A.trkSync() : null,
          prog: prog,
          iqama: S.iqama,
          silence: S.silence,
          jumuah: (function () {
            var j = S.jumuah || {},
              f = A.jumuah ? A.jumuah() : {};
            return { overlay: j.overlay !== false, kahf: f.on && f.rec && f.rec.kahf ? f.key : '' };
          })(),
          fastPlan: Object.keys(S.fastPlan || {}).filter(function (k) {
            return k > key;
          }),
          cycle: (function () {
            if (S.profile.gender !== 'f' || !S.excused.remind) return null;
            var c = A.cycle();
            return {
              next: c.next || '',
              on: !!S.excused.on,
              end: S.excused.on && c.len && S.excused.kind !== 'nifas' ? A.shift(S.excused.since, c.len - 1) : ''
            };
          })(),
          nudge: {
            on: S.prefs.nudge.on,
            every: S.prefs.nudge.every,
            over: S.prefs.nudge.over,
            phrases: (D.tasbih || [])
              .filter(function (t) {
                return (
                  [
                    'subhanallah',
                    'alhamdulillah',
                    'allahuakbar',
                    'lailaha',
                    'astaghfirullah',
                    'subhanbihamdih',
                    'salawat',
                    'hawqala'
                  ].indexOf(t.id) >= 0
                );
              })
              .map(function (t) {
                return { id: t.id, ar: t.ar, tr: t.tr };
              })
          },
          journal: {
            nudge: S.journal.nudge,
            dua: (function () {
              var d = A.duaPick && A.duaPick(key);
              return d ? d.text.slice(0, 160) : '';
            })()
          },
          dod: dz
            ? {
                ar: dz.it.ar,
                en: dz.it.en,
                src: dz.it.refs && dz.it.refs[0] ? dz.it.refs[0].l : '',
                route: '#/r/' + dz.c.id + '/' + dz.i + (dz.c.perPrayer ? '/fajr' : '')
              }
            : null
        })
      );
    }, 400),
    /* prayers logged from the home-screen widget */
    widgetEvents: function () {
      var raw = call('takeWidgetEvents');
      if (!raw) return 0;
      var ev;
      try {
        ev = JSON.parse(raw);
      } catch (e) {
        return 0;
      }
      ev.forEach(function (x) {
        var o = (S.prayed[x.d] = S.prayed[x.d] || {});
        if (x.on) o[x.p] = Date.now();
        else delete o[x.p];
        if (!Object.keys(o).length) delete S.prayed[x.d];
      });
      if (ev.length) A.save(true);
      return ev.length;
    },
    /* taps, resets and finished rounds from the tracker widget */
    trackerEvents: function () {
      var r = call('takeTrackerEvents'),
        ev;
      try {
        ev = JSON.parse(r || '[]');
      } catch (e) {
        ev = [];
      }
      return Array.isArray(ev) ? ev : [];
    },
    pinWidget: function (kind) {
      return call('pinWidget', kind) === true;
    },
    volumeKeys: function (on) {
      call('volumeKeys', !!on);
    },
    compass: function (on) {
      call(on ? 'startCompass' : 'stopCompass');
    },
    location: function () {
      if (B) {
        call('requestLocation');
        return true;
      }
      return false;
    },
    notifPermission: function () {
      return B
        ? call('requestNotifications')
        : window.Notification && Notification.requestPermission
          ? Notification.requestPermission()
          : null;
    },
    notifState: function () {
      var s = call('notificationState');
      try {
        return s ? JSON.parse(s) : null;
      } catch (e) {
        return null;
      }
    },
    exportFile: function (name, text) {
      if (B) return call('exportFile', name, text);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = name;
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
      }, 4000);
    },
    importFile: function () {
      if (B) return call('importFile');
      var i = document.createElement('input');
      i.type = 'file';
      i.accept = 'application/json,.json';
      i.onchange = function () {
        var f = i.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          window.__native.onImport(r.result);
        };
        r.readAsText(f);
      };
      i.click();
    },
    openSettings: function (which) {
      call('openSettings', which);
    },
    version: function () {
      return call('version') || 'web';
    }
  };
  A.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText)
      return navigator.clipboard.writeText(text).then(
        function () {
          A.toast && A.toast('Copied');
        },
        function () {}
      );
    var t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    try {
      document.execCommand('copy');
      A.toast && A.toast('Copied');
    } catch (e) {}
    t.remove();
  };
  window.__native = window.__native || {};
  if (S.needsRebuild) {
    rebuildDone(S);
    A.save();
  }
})();
