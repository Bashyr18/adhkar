/* The Ramaḍān film's beats (tools/promo/ramadan.html), on the shared engine (engine.js). 45 seconds; the track's
   chorus lands at 12.45 s (ramadan.sh starts it 27.33 s in), on the cut into the times of answered duʿāʾ. */
(function () {
  'use strict';
  var $ = F.$, $$ = F.$$, clamp = F.clamp, seg = F.seg, o3 = F.o3, o5 = F.o5, io = F.io, back = F.back, L = F.L, rnd = F.rnd;
  var SHAPE = F.SHAPE;
  window.DROP = 12.45;
  /* the feed puts the opening words at the foot of the frame, under the crescent */
  if (SHAPE === 'feed') $('Ab').style.cssText = 'top:auto !important;bottom:60px;height:auto';

  /* ---------- lanterns ---------- */
  function lanterns(el, list) {
    $(el).innerHTML = list.map(function (l, i) {
      return '<svg class="lan" data-i="' + i + '" viewBox="0 0 100 220" style="position:absolute;left:' + l[0] + 'px;top:0;width:' + l[2] + 'px;height:' + l[2] * 2.2 + 'px;overflow:visible;transform-origin:50% -' + l[1] + 'px"><g style="filter:drop-shadow(0 0 24px rgba(246,200,110,.75))"><use href="#lantern"/></g></svg>';
    }).join('');
    return list;
  }
  var LA = lanterns('Alans', [[60, 300, 110], [210, 140, 80], [800, 200, 96], [930, 360, 76]]);
  var LK = lanterns('Klans', [[60, 160, 90], [200, 60, 66], [830, 100, 84], [950, 240, 64]]);
  function swing(el, list, lt, drop) {
    $$('#' + el + ' .lan').forEach(function (s, i) {
      var l = list[i], d = o3(seg(lt, drop + i * .14, drop + 1.3 + i * .14));
      var y = L(-l[2] * 2.4 - l[1] - 40, l[1], d);
      var a = Math.sin(lt * 1.3 + i * 1.7) * 3 * (1 - .4 * d) + (1 - d) * 10 * (i % 2 ? 1 : -1);
      s.style.transform = 'translateY(' + y + 'px) rotate(' + a + 'deg)';
    });
  }

  /* ---------- C · the fasts grid ---------- */
  function grid(el, n, cols, w, gap) {
    var h = '';
    for (var i = 0; i < n; i++) {
      var c = i % cols, r = (i / cols) | 0;
      h += '<div class="cell" data-i="' + i + '" style="left:' + c * (w + gap) + 'px;top:' + r * (w + gap) + 'px;width:' + w + 'px;height:' + w + 'px">' + (i + 1) + '</div>';
    }
    $(el).innerHTML = h;
  }
  grid('Cgrid', 29, 6, 124, 19);
  grid('Hgrid', 29, 6, 96, 14);
  $$('#Hgrid .cell').forEach(function (c) { c.style.fontSize = '28px'; c.style.borderRadius = '20px'; });
  /* days 12 to 17 on a break, day 23 missed: seven fasts to make up */
  var HMISS = [11, 12, 13, 14, 15, 16, 22];
  $('Hfly').innerHTML = HMISS.map(function (i) { return '<div class="hf" style="position:absolute;left:0;top:0;width:96px;height:96px;border-radius:20px;display:none"></div>'; }).join('');
  $('Hdots').innerHTML = HMISS.map(function () { return '<span class="hd" style="width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font:700 24px Quicksand;box-shadow:inset 0 0 0 2px rgba(246,223,170,.35)"></span>'; }).join('');

  /* ---------- Q · the compass (Lagos, as in the guide: the qibla is 63° from north) ---------- */
  var QB = 63;
  function heading(lt) { var u = Math.max(0, lt - .3); return QB + 150 * Math.exp(-1.45 * u) * Math.cos(3.4 * u); }
  (function () {
    var s = '<circle cx="400" cy="400" r="360" fill="rgba(6,24,22,.55)" stroke="rgba(246,223,170,.12)" stroke-width="2"/>';
    s += '<path id="Qarc" fill="none" stroke="url(#gold)" stroke-width="10" stroke-linecap="round" opacity=".9"/>';
    s += '<g id="Qdial">';
    for (var d = 0; d < 360; d += 5) {
      var a = (d - 90) * Math.PI / 180, big = d % 30 === 0, r1 = 330, r2 = big ? 296 : d % 15 === 0 ? 308 : 316;
      s += '<line x1="' + (400 + r1 * Math.cos(a)) + '" y1="' + (400 + r1 * Math.sin(a)) + '" x2="' + (400 + r2 * Math.cos(a)) + '" y2="' + (400 + r2 * Math.sin(a)) + '" stroke="rgba(245,240,231,' + (big ? .6 : .22) + ')" stroke-width="' + (big ? 3 : 2) + '" stroke-linecap="round"/>';
      if (big && d % 90) s += '<text x="' + (400 + 266 * Math.cos(a)) + '" y="' + (400 + 266 * Math.sin(a) + 8) + '" text-anchor="middle" transform="rotate(' + d + ' ' + (400 + 266 * Math.cos(a)) + ' ' + (400 + 266 * Math.sin(a)) + ')" style="font:700 20px Quicksand;fill:rgba(245,240,231,.4)">' + d + '</text>';
    }
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(function (c) {
      var a = (c[1] - 90) * Math.PI / 180, x = 400 + 258 * Math.cos(a), y = 400 + 258 * Math.sin(a);
      s += '<text x="' + x + '" y="' + (y + 14) + '" text-anchor="middle" transform="rotate(' + c[1] + ' ' + x + ' ' + y + ')" style="font:700 40px Quicksand;fill:' + (c[0] === 'N' ? '#e98a8a' : '#f5f0e7') + '">' + c[0] + '</text>';
    });
    var ka = (QB - 90) * Math.PI / 180, kx = 400 + 372 * Math.cos(ka), ky = 400 + 372 * Math.sin(ka);
    s += '<g id="Qkaaba" transform="translate(' + kx + ' ' + ky + ') rotate(' + QB + ')"><circle r="46" fill="#f1d59e" filter="url(#soft)" opacity=".55" id="Qkg"/><circle r="34" fill="#0b0d16" stroke="url(#gold)" stroke-width="3"/>' +
      '<path d="M-15 -10 L0 -17 L15 -10 L15 12 L0 19 L-15 12 Z" fill="#1b1b1f" stroke="#f1d59e" stroke-width="1.6"/><path d="M-15 -4 L0 3 L15 -4" fill="none" stroke="#f1d59e" stroke-width="3"/><path d="M0 3V19" stroke="#f1d59e" stroke-width="1.2" opacity=".6"/></g>';
    s += '</g>';
    s += '<path d="M400 14 L420 54 L400 46 L380 54 Z" fill="#fff3d0" style="filter:drop-shadow(0 0 12px rgba(255,236,190,.9))"/>';
    s += '<circle id="Qlock" cx="400" cy="400" r="360" fill="none" stroke="#f1d59e" stroke-width="6" opacity="0"/>';
    $('Qc').innerHTML = s;
  })();
  /* when it settles (stays within 1.5°), and the ten-degree marks it crosses on the way: the ratchet the sound follows */
  var QLOCK = 0, QTICKS = [];
  (function () {
    var prev = Math.floor(heading(0) / 10);
    for (var u = 0; u <= 3.6; u += 1 / 120) {
      var h = heading(u), b = Math.floor(h / 10);
      if (b !== prev) { QTICKS.push(u); prev = b; }
      if (!QLOCK && u > .5) { var ok = true; for (var w = u; w < 3.6; w += .05) if (Math.abs(heading(w) - QB) > 1.5) { ok = false; break; } if (ok) QLOCK = u; }
    }
  })();
  grid('Ijuz', 30, 6, 56, 10);
  $$('#Ijuz .cell').forEach(function (c) { c.style.fontSize = '20px'; c.style.borderRadius = '14px'; });

  /* ---------- D · the dial of the day (Lagos, 18 February: the guide's own day) ---------- */
  var PR = [['Fajr', 5 + 52 / 60], ['Dhuhr', 13], ['ʿAṣr', 16 + 21 / 60], ['Maghrib', 18 + 58 / 60], ['ʿIshāʾ', 20 + 5 / 60]];
  var LAST3 = [1 + 47 / 60, 5 + 52 / 60];
  var CX = 400, CY = 400, R = 300;
  function pt(h, r) { var a = (h / 24) * Math.PI * 2 - Math.PI / 2; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; }
  function arc(h0, h1, r) { var p = pt(h0, r), q = pt(h1, r), big = (h1 - h0) / 24 > .5 ? 1 : 0; return 'M' + p[0] + ' ' + p[1] + 'A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + q[0] + ' ' + q[1]; }
  (function () {
    var s = '<circle cx="400" cy="400" r="' + R + '" fill="rgba(255,255,255,.025)" stroke="rgba(233,201,139,.14)" stroke-width="26"/>';
    for (var h = 0; h < 24; h++) { var a = pt(h, R - 34), b = pt(h, R - (h % 6 ? 44 : 54)); s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="rgba(245,240,231,' + (h % 6 ? .18 : .45) + ')" stroke-width="' + (h % 6 ? 2 : 3) + '" stroke-linecap="round"/>'; }
    [['12 am', 0], ['6 am', 6], ['12 pm', 12], ['6 pm', 18]].forEach(function (l) { var p = pt(l[1], R - 86); s += '<text x="' + p[0] + '" y="' + (p[1] + 8) + '" text-anchor="middle" style="font:700 20px Quicksand;fill:rgba(245,240,231,.4);letter-spacing:2px">' + l[0].toUpperCase() + '</text>'; });
    s += '<path class="win" data-k="l3" d="' + arc(LAST3[0], LAST3[1], R) + '" fill="none" stroke="url(#gold)" stroke-width="26" stroke-linecap="round" opacity="0"/>';
    s += '<path class="wing" data-k="l3" d="' + arc(LAST3[0], LAST3[1], R) + '" fill="none" stroke="#f1d59e" stroke-width="40" stroke-linecap="round" filter="url(#soft)" opacity="0"/>';
    PR.forEach(function (p, i) {
      s += '<path class="wing" data-k="' + i + '" d="' + arc(p[1], p[1] + .35, R) + '" fill="none" stroke="#f1d59e" stroke-width="44" stroke-linecap="round" filter="url(#soft)" opacity="0"/>';
      s += '<path class="win" data-k="' + i + '" d="' + arc(p[1], p[1] + .35, R) + '" fill="none" stroke="url(#gold)" stroke-width="26" stroke-linecap="round" opacity="0"/>';
      var q = pt(p[1] + .17, R + 62);
      s += '<text class="lab" data-k="' + i + '" x="' + q[0] + '" y="' + (q[1] + 10) + '" text-anchor="middle" style="font:700 28px Quicksand;fill:#f5f0e7" opacity="0">' + p[0] + '</text>';
    });
    var q3 = pt((LAST3[0] + LAST3[1]) / 2, R + 72);
    s += '<text class="lab" data-k="l3" x="' + q3[0] + '" y="' + (q3[1] + 10) + '" text-anchor="middle" style="font:700 26px Quicksand;fill:#f1d59e" opacity="0">Last third</text>';
    s += '<g id="Dhand"><line x1="400" y1="400" x2="400" y2="' + (400 - R + 4) + '" stroke="rgba(255,243,208,.75)" stroke-width="3" stroke-linecap="round"/><circle cx="400" cy="' + (400 - R) + '" r="15" fill="#fff3d0" style="filter:drop-shadow(0 0 14px rgba(255,236,190,.95))"/><circle cx="400" cy="400" r="8" fill="#f1d59e"/></g>';
    $('Ddial').innerHTML = s;
  })();
  /* the windows the hand reaches, in order of the sweep (it starts at midnight) */
  var HITS = [['l3', LAST3[0], 'The last third of the night', 'Until Fajr · al-Bukhārī 1145'], ['0', PR[0][1], 'Between adhān and iqāmah', 'Fajr · Abū Dāwūd 521'], ['1', PR[1][1], 'Between adhān and iqāmah', 'Dhuhr · at-Tirmidhī 212'],
    ['2', PR[2][1], 'Between adhān and iqāmah', 'ʿAṣr · Abū Dāwūd 521'], ['3', PR[3][1], 'Between adhān and iqāmah', 'Maghrib · at-Tirmidhī 212'], ['4', PR[4][1], 'Between adhān and iqāmah', 'ʿIshāʾ · Abū Dāwūd 521']];

  /* ---------- F · the last ten nights ---------- */
  (function () {
    var s = '<path d="M0 520 Q 270 470 540 500 T 1080 480 V 900 H 0 Z" fill="rgba(3,5,22,.0)"/>';
    for (var i = 0; i < 10; i++) {
      var n = 21 + i, x = 90 + i * 100, y = 260 + Math.sin(i * .9) * 50 - (n % 2 ? 60 : 0), odd = n % 2;
      s += '<g class="nt" data-i="' + i + '" data-odd="' + odd + '" transform="translate(' + x + ' ' + y + ')">' +
        (odd ? '<circle r="46" fill="#f1d59e" filter="url(#soft)" class="ng" opacity="0"/><path class="ns" d="M0 -26 L7 -7 L26 0 L7 7 L0 26 L-7 7 L-26 0 L-7 -7Z" fill="url(#gold)"/>' : '<circle class="ns" r="6" fill="rgba(245,240,231,.4)"/>') +
        '<text y="' + (odd ? 70 : 46) + '" text-anchor="middle" style="font:700 ' + (odd ? 26 : 20) + 'px Quicksand;fill:' + (odd ? '#f1d59e' : 'rgba(245,240,231,.4)') + '">' + n + '</text></g>';
    }
    $('Fsky').innerHTML = s;
  })();

  /* ---------- K · the promises ---------- */
  $('Kfree').innerHTML = ['Free', 'No ads', 'No account', 'Offline'].map(function (s) { return '<span class="kf" style="padding:14px 26px;border-radius:99px;font:700 26px Quicksand;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1.5px rgba(246,223,170,.25)">' + s + '</span>'; }).join('');

  Film({
    dur: 45,
    beats: [['A', 0, 'fade'], ['B', 4.2, 'iris'], ['C', 8.2, 'diag'], ['D', 12.45, 'zoom'], ['E', 17.0, 'push'], ['F', 21.2, 'window'],
      ['Q', 25.0, 'shutter'], ['G', 28.6, 'flip'], ['H', 32.2, 'slide'], ['I', 36.2, 'iris2'], ['J', 38.6, 'zoom'], ['K', 41.3, 'flash']],
    /* each beat's subject in the portrait frame, and where it goes in the feed and in landscape */
    focus: { _: [40, 500, 1040, 1460], A: [60, 120, 1020, 960], J: [24, 688, 1056, 1385], K: [60, 160, 1020, 1440],
      /* the feed: the dashboard leans in, its sidebar and ifṭār card filling the width, the far edge running off */
      feed: { J: [30, 700, 930, 1360] },
      /* landscape: each phone whole, top to foot, beside the words; the dashboard as large as the frame allows */
      land: { B: [120, 520, 960, 1700], E: [80, 440, 1000, 1800], J: [30, 700, 1050, 1360] } },
    area: {
      feed: { _: [40, 320, 1040, 1350], A: [60, 30, 1020, 960], K: [60, 20, 1020, 1330], J: [0, 360, 1080, 1300] },
      land: { _: [780, 40, 1860, 1040], A: [860, 40, 1860, 1040], K: [420, 20, 1500, 1060], J: [620, 110, 1870, 990] }
    },
    tint: function (t, AT) {
      return t >= AT.G && t < AT.H ? '246,190,215' : '246,214,150';
    },
    flashes: [['D', .75], ['J', .5], ['K', .8]],
    cues: function (cue, AT) {
    cue('shimmer', .35, { d: 2.2 }); cue('impact', 2.0, { g: .55 });
    cue('pop', AT.B + 1.0, { p: .8 }); cue('swipe', AT.B + 1.5, { g: .7 });
    [2.5, 3.5].forEach(function (a) { cue('tick', AT.B + a, { g: .5 }); });
    for (var f = 0; f < 11; f++) cue('pop', AT.C + .55 + f * .17, { p: 1 + f * .06, g: .55 });
    cue('shimmer', AT.C + 2.4, { d: 1 });
    cue('riser', AT.D - 1.35, { d: 1.35 }); cue('impact', AT.D, { g: 1 });
    HITS.forEach(function (h, i) { cue('pop', AT.D + .6 + i * .55, { p: i ? 1.25 : .9, g: .8 }); });
    cue('swipe', AT.E + 1.4, { g: 1 }); cue('pop', AT.E + 1.85, { p: .95, g: .7 });
    for (var c1 = 0; c1 < 20; c1++) cue('tick', AT.E + 2.2 + c1 * .07, { g: .35, p: 1.3 });
    for (var c2 = 0; c2 < 5; c2++) cue('shimmer', AT.F + .9 + c2 * .38, { d: .7, g: .6 });
    cue('swipe', AT.F + 2.2, { g: .6 });
    QTICKS.forEach(function (u) { cue('ratchet', AT.Q + u); });
    cue('lock', AT.Q + QLOCK); cue('impact', AT.Q + QLOCK, { g: .45 });
    cue('pop', AT.G + .3, { p: .75 });
    [1.7, 2.0, 2.3].forEach(function (a, i) { cue('pop', AT.G + a, { p: 1.1 + i * .12, g: .7 }); });
    for (var j = 0; j < 7; j++) { cue('swipe', AT.H + 1.05 + j * .07, { g: .25 }); cue('pop', AT.H + 1.6 + j * .07, { p: 1.2 + j * .05, g: .5 }); }
    [0, 1, 2].forEach(function (j) { cue('lock', AT.H + 2.35 + j * .38, { g: .7 }); });
    for (var n = 0; n < 30; n += 3) cue('tick', AT.I + .6 + n * .065, { g: .4, p: 1.1 });
    cue('shimmer', AT.I + 2.6, { d: .9 });
    cue('shimmer', AT.K + .2, { d: 2.4 }); cue('impact', AT.K + .6, { g: .8 }); cue('pop', AT.K + 1.3, { p: .8, g: .6 });
    },
    draw: {
    A: function (lt) {
      var d = io(seg(lt, .3, 2.0));
      $('Acres').style.strokeDasharray = '1400'; $('Acres').style.strokeDashoffset = 1400 * (1 - d);
      $('Acres').setAttribute('fill-opacity', o3(seg(lt, 1.6, 2.6)));
      var sp = back(seg(lt, 2.0, 2.8));
      $('Astar').setAttribute('transform', 'translate(262 128) scale(' + sp + ') rotate(' + (1 - sp) * 90 + ')');
      $('Amoon').style.transform = 'translateY(' + (1 - o3(seg(lt, 0, 3))) * 60 + 'px) rotate(' + (-8 + lt * 2) + 'deg)';
      $('Aglow').style.opacity = o3(seg(lt, 1.4, 3)) * (.85 + .15 * Math.sin(lt * 3));
      $('Aglow').style.transform = 'scale(' + (.7 + .3 * o3(seg(lt, 1.4, 3))) + ')';
      swing('Alans', LA, lt, .6);
    },
    B: function (lt) {
      var a = o5(seg(lt, 0, 1.4));
      $('Bph').style.transform = 'translateY(' + (1 - a) * 300 + 'px) rotateX(' + (24 - 16 * a) + 'deg) rotateY(' + (-18 + 26 * io(seg(lt, 0, 4.6))) + 'deg) scale(.86)';
      var p = back(seg(lt, .9, 1.7));
      $('Bpop').style.transform = 'translateZ(' + p * 140 + 'px) scale(' + (1 + .05 * p) + ')';
      $('Bgl').style.backgroundPosition = (100 - seg(lt, .4, 2.2) * 100) + '% 0';
      var g = o5(seg(lt, 1.5, 2.3));
      $('Bcd').style.opacity = g; $('Bcd').style.transform = 'translateY(' + (1 - g) * 120 + 'px) translateZ(' + 200 * g + 'px)';
      var secs = 3 * 3600 + 37 * 60 + 53 - Math.floor(Math.max(0, lt - 1.5) * 1), h = (secs / 3600) | 0, m = ((secs % 3600) / 60) | 0, sc = secs % 60;
      $('Bnum').textContent = h + ':' + (m < 10 ? '0' : '') + m + ':' + (sc < 10 ? '0' : '') + sc;
      $('Bfill').style.width = L(0, 62, o3(seg(lt, 1.8, 3.4))) + '%';
    },
    C: function (lt) {
      $('Cgrid').style.transform = 'rotateX(' + L(38, 14, o5(seg(lt, 0, 2.5))) + 'deg) rotateZ(' + L(-6, 0, o5(seg(lt, 0, 2.5))) + 'deg) translateY(' + L(80, 0, o5(seg(lt, 0, 1.5))) + 'px)';
      var day = 0;
      $$('#Cgrid .cell').forEach(function (c, i) {
        var at = .55 + i * .17, k = seg(lt, at, at + .35), fill = i < 11 && lt >= at, pop = i < 11 ? back(k) : 1;
        var vis = o3(seg(lt, .05 + i * .02, .5 + i * .02));
        if (fill) day = i + 1;
        c.style.opacity = vis;
        c.style.background = fill ? 'linear-gradient(180deg,#f6dfaa,#d9a441)' : 'rgba(255,255,255,.06)';
        c.style.color = fill ? '#2a1d06' : 'rgba(245,240,231,.45)';
        c.style.boxShadow = i === 10 && fill ? '0 0 0 4px #fff3d0, 0 0 50px rgba(246,214,150,.8)' : fill ? '0 16px 30px -12px rgba(217,164,65,.6)' : 'inset 0 0 0 1.5px rgba(255,255,255,.06)';
        c.style.transform = 'translateZ(' + (fill ? (1 - Math.abs(1 - pop)) * 0 + 24 * (1 - k) + (i === 10 ? 30 * Math.sin(lt * 4) * .2 + 10 : 0) : 0) + 'px) scale(' + (i < 11 && lt >= at ? pop : 1) + ')';
      });
      $('Cday').textContent = 'DAY ' + Math.max(1, day) + ' OF 29';
      $('Cday').style.opacity = o3(seg(lt, .6, 1));
    },
    D: function (lt) {
      var sw = io(seg(lt, .5, 3.9)), h = sw * 24 * .9;
      $('Dhand').setAttribute('transform', 'rotate(' + h / 24 * 360 + ' 400 400)');
      $('Ddial').style.transform = 'rotate(' + L(-30, 0, o5(seg(lt, 0, 1.6))) + 'deg) scale(' + L(.8, 1, o5(seg(lt, 0, 1.6))) + ')';
      var cur = null;
      HITS.forEach(function (hit, i) {
        var at = .6 + i * .55, k = o5(seg(lt, at, at + .5));
        $$('#Ddial [data-k="' + hit[0] + '"]').forEach(function (n) {
          if (n.classList.contains('wing')) n.setAttribute('opacity', k * (.55 + .45 * Math.sin(Math.max(0, lt - at) * 5) * (1 - seg(lt, at, at + 1.6))));
          else n.setAttribute('opacity', k);
        });
        if (lt >= at) cur = hit;
      });
      /* the hand is drawn to each window as it lights, so the sweep follows the times, not the clock */
      var idx = -1; HITS.forEach(function (h2, i) { if (lt >= .6 + i * .55) idx = i; });
      var target = idx < 0 ? 0 : HITS[idx][1], next = idx + 1 < HITS.length ? HITS[idx + 1][1] : 23.5;
      var kk = idx < 0 ? seg(lt, .2, .6) : io(seg(lt, .6 + idx * .55, .6 + (idx + 1) * .55));
      var hh = idx < 0 ? L(0, HITS[0][1], kk) : L(target, next, kk * (idx + 1 < HITS.length ? 1 : seg(lt, .6 + idx * .55, 4.6)));
      $('Dhand').setAttribute('transform', 'rotate(' + hh / 24 * 360 + ' 400 400)');
      $('Dmid').style.opacity = o3(seg(lt, .6, 1));
      $('Dt').textContent = cur ? cur[2] : '';
      $('Dh').textContent = cur ? cur[3] : '';
      var lift = cur ? o5(seg(lt, .6 + idx * .55, .9 + idx * .55)) : 0;
      $('Dt').style.transform = 'translateY(' + (1 - lift) * 16 + 'px)'; $('Dt').style.opacity = lift;
    },
    E: function (lt) {
      var a = o5(seg(lt, 0, 1.4));
      $('Eph').style.transform = 'translateY(' + ((1 - a) * 260 + 120) + 'px) rotateX(' + (20 - 12 * a) + 'deg) rotateY(' + (14 - 22 * io(seg(lt, 0, 4.8))) + 'deg) scale(.82)';
      $('Egl').style.backgroundPosition = (100 - seg(lt, .3, 2.3) * 100) + '% 0';
      var n = back(seg(lt, 1.4, 2.1)), out = 0;
      $('En').style.transform = 'translateY(' + L(F.SHAPE === 'port' ? -520 : -140, 0, n) + 'px) translateZ(' + 160 + 'px) scale(' + L(.92, 1, o3(seg(lt, 1.4, 2.1))) + ')';
      $('En').style.opacity = o3(seg(lt, 1.4, 1.7)) * (1 - out);
      var dua = 'Guidance and good health for my parents', k = Math.floor(seg(lt, 2.2, 3.6) * dua.length);
      $('Etype').textContent = dua.slice(0, k) + (lt > 2.1 && lt < 4.2 && Math.floor(lt * 3) % 2 ? '|' : '');
    },
    F: function (lt) {
      $('Fsky').style.transform = 'translateY(' + L(60, 0, o5(seg(lt, 0, 2))) + 'px)';
      var odd = 0;
      $$('#Fsky .nt').forEach(function (g, i) {
        var vis = o3(seg(lt, .1 + i * .06, .6 + i * .06)), isOdd = g.dataset.odd === '1';
        g.style.opacity = vis;
        if (isOdd) {
          var at = .9 + odd * .38, k = back(seg(lt, at, at + .5)), gl = g.querySelector('.ng');
          gl.setAttribute('opacity', seg(lt, at, at + .3) * (.5 + .3 * Math.sin(lt * 3 + i)));
          g.querySelector('.ns').setAttribute('transform', 'scale(' + (.35 + .65 * k) + ') rotate(' + (lt * 20 + i * 10) + ')');
          odd++;
        }
      });
      var r = o5(seg(lt, 2.2, 3.2));
      $('Far').style.clipPath = 'inset(0 0 0 ' + (1 - r) * 100 + '%)';
      $('Far').style.opacity = r > 0 ? 1 : 0;
      $('Fen').style.opacity = o3(seg(lt, 2.8, 3.4)); $('Fen').style.transform = 'translateY(' + (1 - o3(seg(lt, 2.8, 3.4))) * 20 + 'px)';
      $('Fref').style.opacity = o3(seg(lt, 3.1, 3.6)) * .9;
    },
    G: function (lt) {
      var a = o5(seg(lt, .2, 1.4));
      $('Gcard').style.transform = 'translateY(' + (1 - a) * 220 + 'px) rotateX(' + (1 - a) * 30 + 'deg) rotateY(' + Math.sin(lt * .8) * 4 + 'deg)';
      $('Gcard').style.opacity = o3(seg(lt, .2, .8));
      $('Gglow').style.transform = 'scale(' + (.9 + .08 * Math.sin(lt * 1.6)) + ')';
      ['Gc1', 'Gc2', 'Gc3'].forEach(function (id, i) {
        var k = back(seg(lt, 1.7 + i * .3, 2.3 + i * .3));
        $(id).style.opacity = seg(lt, 1.7 + i * .3, 1.9 + i * .3);
        $(id).style.transform = 'translateY(' + (1 - k) * 60 + 'px) scale(' + (.8 + .2 * k) + ') translateY(' + Math.sin(lt * 1.5 + i) * 6 + 'px)';
      });
    },
    Q: function (lt) {
      var h = heading(lt), a = o5(seg(lt, 0, 1));
      $('Qc').style.transform = 'scale(' + L(.75, 1, a) + ') rotateX(' + L(40, 0, a) + 'deg)';
      $('Qdial').setAttribute('transform', 'rotate(' + -h + ' 400 400)');
      /* the arc from where you face to the qibla */
      var off = ((QB - h) % 360 + 540) % 360 - 180, r = 372, a0 = -90, a1 = -90 + off;
      var p0 = [400 + r * Math.cos(a0 * Math.PI / 180), 400 + r * Math.sin(a0 * Math.PI / 180)], p1 = [400 + r * Math.cos(a1 * Math.PI / 180), 400 + r * Math.sin(a1 * Math.PI / 180)];
      $('Qarc').setAttribute('d', 'M' + p0[0] + ' ' + p0[1] + 'A' + r + ' ' + r + ' 0 ' + (Math.abs(off) > 180 ? 1 : 0) + ' ' + (off > 0 ? 1 : 0) + ' ' + p1[0] + ' ' + p1[1]);
      $('Qarc').setAttribute('opacity', Math.min(1, Math.abs(off) / 8) * .9);
      var locked = lt >= QLOCK, lk = seg(lt, QLOCK, QLOCK + .6);
      $('Qdeg').textContent = locked ? QB + '°' : Math.round(((h % 360) + 360) % 360) + '°';
      $('Qdeg').style.color = locked ? '#f1d59e' : '#f5f0e7';
      $('Qlab').textContent = locked ? 'FACING THE QIBLA ✓' : 'TURN TO FACE';
      $('Qlab').style.color = locked ? '#f1d59e' : '#a99e88';
      $('Qmid').style.transform = 'scale(' + (locked ? L(1.12, 1, o5(lk)) : 1) + ')';
      $('Qlock').setAttribute('opacity', locked ? (1 - lk) * .9 : 0);
      $('Qlock').setAttribute('r', 360 + o5(lk) * 70);
      $('Qglow').style.opacity = locked ? o3(lk) * (.8 + .2 * Math.sin(lt * 3)) : 0;
      $('Qkg').setAttribute('opacity', locked ? .5 + .4 * Math.sin(lt * 4) : .3);
      var c = back(seg(lt, QLOCK + .4, QLOCK + 1));
      $('Qsun').style.opacity = seg(lt, QLOCK + .4, QLOCK + .6); $('Qsun').style.transform = 'translateY(' + (1 - c) * 50 + 'px) scale(' + (.85 + .15 * c) + ')';
    },
    H: function (lt) {
      var g = o5(seg(lt, 0, 1.6));
      $('Hgrid').style.transform = 'rotateX(' + L(34, 10, g) + 'deg) translateY(' + L(40, 0, g) + 'px)';
      $('Hleg').style.opacity = o3(seg(lt, .5, .9));
      var cells = $$('#Hgrid .cell');
      cells.forEach(function (c, i) {
        var mi = HMISS.indexOf(i), at = .3 + i * .022, on = lt >= at;
        c.style.opacity = o3(seg(lt, at - .2, at + .1));
        if (mi < 0) {
          c.style.background = on ? 'linear-gradient(180deg,#f6dfaa,#d9a441)' : 'rgba(255,255,255,.06)';
          c.style.color = on ? '#2a1d06' : 'rgba(245,240,231,.45)'; c.style.boxShadow = 'none';
        } else {
          var gone = seg(lt, 1.05 + mi * .07, 1.25 + mi * .07);
          c.style.background = i === 22 ? 'rgba(233,138,138,.08)' : 'linear-gradient(180deg,#d4a6e6,#9a63b4)';
          c.style.color = i === 22 ? '#f1a3a3' : '#22102b';
          c.style.boxShadow = i === 22 ? 'inset 0 0 0 3px #e98a8a' : '0 0 30px rgba(190,130,220,.55)';
          c.style.opacity = o3(seg(lt, at - .2, at + .1)) * L(1, .28, gone);
        }
      });
      /* the seven fly into the ring, one after another, along an arc */
      var arrived = 0, cx = 130 + 40 + 90 - 48, cy = 1150 + 125 - 48;
      $$('#Hfly .hf').forEach(function (f, j) {
        var i = HMISS[j], x0 = 217 + (i % 6) * 110, y0 = 545 + ((i / 6) | 0) * 110, k = seg(lt, 1.05 + j * .07, 1.6 + j * .07), e = io(k);
        if (k >= 1) arrived++;
        f.style.display = k > 0 && k < 1 ? 'block' : 'none';
        f.style.background = i === 22 ? 'linear-gradient(180deg,#f3a6a6,#c75f5f)' : 'linear-gradient(180deg,#d4a6e6,#9a63b4)';
        f.style.boxShadow = '0 0 40px rgba(240,200,255,.6)';
        var x = L(x0, cx, e) + Math.sin(e * Math.PI) * (j - 3) * 60, y = L(y0, cy, e) - Math.sin(e * Math.PI) * 120;
        f.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + L(1, .3, e) + ') rotate(' + e * 180 + 'deg)';
        f.style.borderRadius = L(20, 48, e) + 'px';
      });
      var q = o5(seg(lt, .7, 1.3));
      $('Hq').style.opacity = q; $('Hq').style.transform = 'translateY(' + (1 - q) * 90 + 'px)';
      var done = 0;
      $$('#Hdots .hd').forEach(function (d, j) {
        var at = 2.35 + j * .38, on = j < 3 && lt >= at, k = back(seg(lt, at, at + .3));
        if (on) done++;
        d.style.background = on ? 'linear-gradient(180deg,#f6dfaa,#d9a441)' : 'transparent';
        d.style.color = '#2a1d06'; d.textContent = on ? '✓' : '';
        d.style.transform = 'scale(' + (on ? k : j < arrived ? 1 : .6) + ')';
        d.style.opacity = j < arrived ? 1 : .25;
      });
      var left = arrived - done;
      $('Hn').textContent = left;
      $('Hn').style.transform = 'scale(' + (1 + .18 * Math.sin(seg(lt, 1.05 + (arrived - 1) * .07 + .55, 1.05 + (arrived - 1) * .07 + .85) * Math.PI)) + ')';
      $('Ht').textContent = done ? left + ' left · ' + done + ' made up' : arrived ? arrived + ' fasts to make up' : 'Fasts to make up';
      $('Hring').style.strokeDashoffset = 515 * (1 - io(seg(lt, 2.35, 3.5)) * 3 / 7);
    },
    I: function (lt) {
      var a = o5(seg(lt, .2, 1.2));
      $('Iring').style.transform = 'translateY(' + (1 - a) * 80 + 'px) rotate(' + (1 - a) * -40 + 'deg)';
      var n = io(seg(lt, .6, 2.6));
      $('Iarc').style.strokeDashoffset = 1005 * (1 - n * 11 / 29);
      $('In').textContent = Math.round(n * 11);
      var j = 0;
      $$('#Ijuz .cell').forEach(function (c, i) {
        var at = .6 + i * .065, on = i < 30 && lt >= at, k = back(seg(lt, at, at + .3));
        if (on) j++;
        c.style.opacity = o3(seg(lt, .1 + i * .01, .5 + i * .01));
        c.style.background = on ? 'linear-gradient(180deg,#f6dfaa,#d9a441)' : 'rgba(255,255,255,.06)';
        c.style.color = on ? '#2a1d06' : 'rgba(245,240,231,.45)';
        c.style.transform = 'scale(' + (on ? k : 1) + ')';
      });
      $('Ijn').textContent = j >= 30 ? 'Khatm complete · alḥamdulillāh' : 'Juzʾ ' + j + ' of 30';
      $('Ijn').style.color = j >= 30 ? '#f1d59e' : '#a99e88';
    },
    J: function (lt) {
      var k = o5(seg(lt, 0, .85));
      $('Jdesk').style.transform = 'translateY(' + (1 - k) * 68 + 'px) scale(' + L(.94, 1, k) + ')';
      $('Jdesk').style.opacity = k;
    },
    K: function (lt) {
      swing('Klans', LK, lt, .1);
      var d = io(seg(lt, .05, .9));
      $('Kout').style.strokeDashoffset = 176 * (1 - d);
      var sp = back(seg(lt, .5, 1.1));
      $('Kin').style.transform = 'scale(' + sp + ') rotate(' + (1 - sp) * 120 + 'deg)';
      $('Ktile').setAttribute('opacity', o3(seg(lt, .1, .8)));
      $('Kicon').style.transform = 'scale(' + L(.7, 1, o5(seg(lt, 0, 1.4))) + ') translateY(' + Math.sin(lt * 1.4) * 6 + 'px)';
      $('Kglow').style.opacity = o3(seg(lt, .6, 1.8)) * (.8 + .2 * Math.sin(lt * 2.4));
      [['Kname', .4], ['Kmub', .7], ['Kfree', 1.0], ['Kcta', 1.3]].forEach(function (q) {
        var k = o5(seg(lt, q[1], q[1] + .7));
        $(q[0]).style.opacity = k; $(q[0]).style.transform = 'translateY(' + (1 - k) * 50 + 'px)';
      });
      $$('#Kfree .kf').forEach(function (s, i) { var k = back(seg(lt, 1.0 + i * .1, 1.5 + i * .1)); s.style.transform = 'scale(' + k + ')'; s.style.display = 'inline-block'; });
      $('Kcta').style.boxShadow = '0 30px 60px -20px rgba(246,214,150,' + (.4 + .25 * Math.sin(lt * 3)) + ')';
    }
    }
  });
})();
