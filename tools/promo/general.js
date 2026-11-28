/* The general film's beats (tools/promo/general.html), on the shared engine (engine.js). 50 seconds; the track's
   chorus lands at 6.2 s (general.sh starts it 33.58 s in), on the cut into the adhkār. Ramaḍān has two beats, L and M,
   about six and a half seconds; the rest is the whole year. */
(function () {
  'use strict';
  var $ = F.$, $$ = F.$$, seg = F.seg, o3 = F.o3, o5 = F.o5, io = F.io, back = F.back, L = F.L, clamp = F.clamp;
  var SHAPE = F.SHAPE, WIDE = SHAPE === 'land' ? 1.3 : 1;
  /* the feed puts the hook's words at the foot of the frame, under the mark */
  if (SHAPE === 'feed') $('Aband').style.cssText = 'top:auto !important;bottom:60px;height:auto';

  /* D · the beads of the pace ring */
  (function () {
    var h = '';
    for (var i = 0; i < 33; i++) {
      var a = (i / 33) * Math.PI * 2 - Math.PI / 2;
      h += '<circle cx="' + (300 + Math.cos(a) * 276).toFixed(1) + '" cy="' + (300 + Math.sin(a) * 276).toFixed(1) + '" r="6"/>';
    }
    $('Dbeads').innerHTML = h;
  })();

  /* E · the compass (Lagos: the qibla 63° from north) */
  var QB = 63;
  function heading(lt) { var u = Math.max(0, lt - .3); return QB - 120 * Math.exp(-1.6 * u) * Math.cos(3.4 * u); }
  (function () {
    var s = '<circle cx="400" cy="400" r="364" fill="none" stroke="url(#gold)" stroke-width="7"/><circle cx="400" cy="400" r="358" fill="rgba(8,14,22,.9)"/>';
    s += '<path id="Earc" fill="none" stroke="#f1d59e" stroke-width="14" stroke-linecap="round" opacity=".9" style="filter:drop-shadow(0 0 8px #f1d59e)"/>';
    s += '<g id="Edial">';
    for (var d = 0; d < 360; d += 5) {
      var a = (d - 90) * Math.PI / 180, big = d % 30 === 0, r1 = 330, r2 = big ? 296 : d % 15 === 0 ? 308 : 316;
      s += '<line x1="' + (400 + r1 * Math.cos(a)) + '" y1="' + (400 + r1 * Math.sin(a)) + '" x2="' + (400 + r2 * Math.cos(a)) + '" y2="' + (400 + r2 * Math.sin(a)) + '" stroke="rgba(245,240,231,' + (big ? .65 : .22) + ')" stroke-width="' + (big ? 3 : 2) + '" stroke-linecap="round"/>';
      if (big && d % 90) s += '<text x="' + (400 + 266 * Math.cos(a)) + '" y="' + (400 + 266 * Math.sin(a) + 8) + '" text-anchor="middle" transform="rotate(' + d + ' ' + (400 + 266 * Math.cos(a)) + ' ' + (400 + 266 * Math.sin(a)) + ')" style="font:700 20px Quicksand;fill:rgba(245,240,231,.4)">' + d + '</text>';
    }
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(function (c) {
      var a = (c[1] - 90) * Math.PI / 180, x = 400 + 252 * Math.cos(a), y = 400 + 252 * Math.sin(a);
      s += '<text x="' + x + '" y="' + (y + 14) + '" text-anchor="middle" transform="rotate(' + c[1] + ' ' + x + ' ' + y + ')" style="font:700 40px Quicksand;fill:' + (c[0] === 'N' ? '#e98a8a' : '#f5f0e7') + '">' + c[0] + '</text>';
    });
    var ka = (QB - 90) * Math.PI / 180, kx = 400 + 330 * Math.cos(ka), ky = 400 + 330 * Math.sin(ka);
    s += '<line x1="' + (400 + 140 * Math.cos(ka)) + '" y1="' + (400 + 140 * Math.sin(ka)) + '" x2="' + (400 + 290 * Math.cos(ka)) + '" y2="' + (400 + 290 * Math.sin(ka)) + '" stroke="#f1d59e" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round"/>';
    s += '<g transform="translate(' + kx + ' ' + ky + ') rotate(' + QB + ')"><circle r="56" fill="#f1d59e" filter="url(#soft)" opacity=".4" id="Ekg"/><circle r="38" fill="#05080c" stroke="url(#gold)" stroke-width="4"/><rect x="-18" y="-18" width="36" height="36" rx="4" fill="#15130f" stroke="#f6dfaa" stroke-width="2"/><rect x="-18" y="-8" width="36" height="6" fill="#d9a441"/></g>';
    s += '</g>';
    s += '<path d="M400 4 L424 50 L400 40 L376 50 Z" fill="#fff3d0" style="filter:drop-shadow(0 0 12px rgba(255,236,190,.9))"/>';
    s += '<circle cx="400" cy="400" r="130" fill="#0f2a24" stroke="rgba(127,224,187,0)" stroke-width="3" id="Ehub"/>';
    s += '<circle id="Elock" cx="400" cy="400" r="360" fill="none" stroke="#7fe0bb" stroke-width="6" opacity="0"/>';
    $('Ec').innerHTML = s;
  })();
  /* it locks once it stays within 2.5° to the end of the beat; the ratchet sounds on every ten degrees crossed */
  var QLOCK = 0, QTICKS = [];
  (function () {
    var prev = Math.floor(heading(0) / 10);
    for (var u = 0; u <= 3.4; u += 1 / 120) {
      var h = heading(u), b = Math.floor(h / 10);
      if (b !== prev) { QTICKS.push(u); prev = b; }
      if (!QLOCK && u > .5) { var ok = true; for (var w = u; w < 3.4; w += .05) if (Math.abs(heading(w) - QB) > 2.5) { ok = false; break; } if (ok) QLOCK = u; }
    }
    if (!QLOCK) QLOCK = 2.4;
  })();

  /* F · the dial of the day (Lagos in November, as in the guide) */
  var PR = [['Fajr', 5 + 24 / 60], ['Dhuhr', 12 + 31 / 60], ['ʿAṣr', 15 + 53 / 60], ['Maghrib', 18 + 26 / 60], ['ʿIshāʾ', 19 + 35 / 60]];
  var LAST3 = [1 + 44 / 60, 5 + 24 / 60], R = 300;
  function pt(h, r) { var a = (h / 24) * Math.PI * 2 - Math.PI / 2; return [400 + r * Math.cos(a), 400 + r * Math.sin(a)]; }
  function arc(h0, h1, r) { var p = pt(h0, r), q = pt(h1, r), big = (h1 - h0) / 24 > .5 ? 1 : 0; return 'M' + p[0] + ' ' + p[1] + 'A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + q[0] + ' ' + q[1]; }
  (function () {
    var s = '<circle cx="400" cy="400" r="' + R + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="34"/><circle cx="400" cy="400" r="' + (R - 52) + '" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="12"/>';
    for (var h = 0; h < 24; h++) { var a = pt(h, R - 70), b = pt(h, R - (h % 6 ? 80 : 92)); s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="rgba(245,240,231,' + (h % 6 ? .2 : .5) + ')" stroke-width="' + (h % 6 ? 2 : 3) + '" stroke-linecap="round"/>'; }
    s += '<path data-k="l3" d="' + arc(LAST3[0], LAST3[1], R) + '" fill="none" stroke="#a48df2" stroke-width="34" stroke-linecap="round" opacity="0"/>';
    PR.forEach(function (p, i) {
      s += '<path data-k="a' + i + '" d="' + arc(p[1] + .34, p[1] + .75, R) + '" fill="none" stroke="rgba(241,213,158,.4)" stroke-width="20" stroke-linecap="round" opacity="0"/>';
      s += '<path class="wing" data-k="' + i + '" d="' + arc(p[1], p[1] + .34, R) + '" fill="none" stroke="#f1d59e" stroke-width="50" stroke-linecap="round" filter="url(#soft)" opacity="0"/>';
      s += '<path data-k="' + i + '" d="' + arc(p[1], p[1] + .34, R) + '" fill="none" stroke="url(#gold)" stroke-width="34" stroke-linecap="round" opacity="0"/>';
      var q = pt(p[1] + .17, R + 66), side = q[0] > 410 ? 'start' : q[0] < 390 ? 'end' : 'middle';
      s += '<text data-k="' + i + '" x="' + q[0] + '" y="' + (q[1] + 10) + '" text-anchor="' + side + '" style="font:700 28px Quicksand;fill:#f5f0e7" opacity="0">' + p[0] + '</text>';
    });
    var q3 = pt((LAST3[0] + LAST3[1]) / 2, R + 66);
    s += '<text data-k="l3" x="' + q3[0] + '" y="' + (q3[1] + 10) + '" text-anchor="start" style="font:700 26px Quicksand;fill:#a48df2" opacity="0">Last third</text>';
    s += '<g id="Fhand"><line x1="400" y1="' + (400 - R + 50) + '" x2="400" y2="' + (400 - R + 6) + '" stroke="rgba(255,243,208,.9)" stroke-width="5" stroke-linecap="round"/><circle cx="400" cy="' + (400 - R) + '" r="17" fill="#fff3d0" style="filter:drop-shadow(0 0 14px rgba(255,236,190,.95))"/></g>';
    $('Fdial').innerHTML = s;
  })();
  var HITS = [['l3', LAST3[0], 'The last third of the night', 'Until Fajr · al-Bukhārī 1145'], ['0', PR[0][1], 'Between adhān and iqāmah', 'Fajr · Abū Dāwūd 521'],
    ['1', PR[1][1], 'Between adhān and iqāmah', 'Dhuhr · at-Tirmidhī 212'], ['2', PR[2][1], 'Between adhān and iqāmah', 'ʿAṣr · Abū Dāwūd 521'],
    ['3', PR[3][1], 'Between adhān and iqāmah', 'Maghrib · at-Tirmidhī 212'], ['4', PR[4][1], 'Between adhān and iqāmah', 'ʿIshāʾ · Abū Dāwūd 521']];

  /* K · the beads of her usual days; P · the promises */
  $('Kbeads').innerHTML = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<i style="flex:1;height:14px;border-radius:7px;display:block;background:' + (i < 2 ? '#ec8eab' : i === 2 ? '#ec8eab;box-shadow:0 0 18px #ec8eab' : 'rgba(236,142,171,.16)') + '"></i>'; }).join('');
  $('Pfree').innerHTML = ['Free', 'No ads', 'No account', 'Offline'].map(function (s) { return '<span class="kf" style="display:inline-block;padding:14px 26px;border-radius:99px;font:700 26px Quicksand;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1.5px rgba(246,223,170,.25)">' + s + '</span>'; }).join('');

  function phoneIn(id, lt, ry0, ry1, sc) {
    var a = o5(seg(lt, 0, 1.3));
    $(id).style.transform = 'translateY(' + (1 - a) * 320 + 'px) rotateX(' + (22 - 15 * a) + 'deg) rotateY(' + L(ry0, ry1, io(seg(lt, 0, 3.6))) + 'deg) scale(' + (sc || .84) + ')';
  }

  Film({
    dur: 50,
    beats: [['A', 0, 'fade'], ['B', 3.0, 'iris'], ['C', 6.2, 'zoom'], ['D', 9.6, 'diag'], ['E', 12.8, 'shutter'], ['F', 16.2, 'window'],
      ['G', 19.6, 'push'], ['H', 22.8, 'flip'], ['I', 25.8, 'split'], ['J', 28.6, 'slide'], ['K', 31.6, 'bloom'], ['L', 34.6, 'iris2'],
      ['M', 37.8, 'push'], ['N', 41.0, 'window'], ['O', 44.0, 'zoom'], ['P', 47.0, 'flash']],
    /* each beat's subject in the portrait frame, and where it goes in the other shapes */
    focus: { _: [40, 500, 1040, 1460], A: [140, 380, 940, 1080], C: [-160, 520, 1240, 1460], I: [-120, 520, 1200, 1460], J: [40, 520, 1180, 1460], N: [140, 520, 940, 1560], O: [-110, 620, 1190, 1400], P: [120, 300, 960, 1420],
      /* the feed: the desktop leans in, its sidebar and sky card filling the width, the far edge running off */
      feed: { O: [-40, 650, 900, 1390] },
      /* landscape: every phone whole, top to foot, beside the words; the computer as large as the frame allows */
      land: { B: [190, 520, 890, 1690], L: [190, 520, 890, 1690], M: [190, 520, 890, 1690], G: [80, 440, 1000, 1800], H: [140, 490, 940, 1800],
        J: [170, 520, 1110, 1680], C: [-160, 520, 1240, 1690], I: [-130, 520, 1210, 1640], O: [-10, 680, 1090, 1370] } },
    area: {
      feed: { _: [40, 320, 1040, 1350], A: [140, 70, 940, 1080], P: [80, 30, 1000, 1330], O: [0, 360, 1080, 1300] },
      land: { _: [780, 40, 1860, 1040], A: [820, 60, 1820, 1020], P: [400, 30, 1520, 1050], O: [640, 100, 1860, 1000], C: [740, 40, 1900, 1040], I: [740, 40, 1900, 1040] }
    },
    tint: function (t, AT) { return t >= AT.K && t < AT.L ? '246,190,215' : t >= AT.E && t < AT.F ? '170,235,210' : '246,214,150'; },
    flashes: [['C', .75], ['O', .45], ['P', .8]],
    cues: function (cue, AT) {
      cue('shimmer', .3, { d: 2 }); cue('impact', 1.6, { g: .5 });
      cue('pop', AT.B + 1.0, { p: .8 });
      cue('riser', AT.C - 1.3, { d: 1.3 }); cue('impact', AT.C, { g: 1 });
      [.9, 1.3].forEach(function (a) { cue('swipe', AT.C + a, { g: .5 }); });
      for (var n = 2; n <= 33; n++) cue('tick', AT.D + .5 + 2.2 * Math.pow((n - 1) / 32, 1 / .85), { g: .5, p: 1.1 });
      cue('lock', AT.D + 2.75, { g: .7 });
      QTICKS.forEach(function (u) { cue('ratchet', AT.E + u); });
      cue('lock', AT.E + QLOCK); cue('impact', AT.E + QLOCK, { g: .45 });
      HITS.forEach(function (h, i) { cue('pop', AT.F + .6 + i * .45, { p: i ? 1.25 : .9, g: .8 }); });
      cue('swipe', AT.G + 1.3, { g: 1 }); cue('pop', AT.G + 1.75, { p: .95, g: .7 });
      for (var c1 = 0; c1 < 18; c1++) cue('tick', AT.G + 2.1 + c1 * .055, { g: .35, p: 1.3 });
      cue('rustle', AT.H + 1.25, { d: .9 });
      cue('swipe', AT.I + .4, { g: .5 }); cue('shimmer', AT.I + 1.1, { d: 1 });
      cue('swipe', AT.J + 1.2, { g: .6 }); cue('pop', AT.J + 1.8, { p: 1.1 });
      cue('pop', AT.K + .3, { p: .75 });
      [1.5, 1.8, 2.1].forEach(function (a, i) { cue('pop', AT.K + a, { p: 1.1 + i * .12, g: .7 }); });
      cue('pop', AT.L + 1.0, { p: .85 }); cue('shimmer', AT.L + 1.4, { d: 1.2 });
      cue('swipe', AT.M + 1.0, { g: .5 }); cue('swipe', AT.M + 2.2, { g: .4 });
      cue('pop', AT.N + .4, { p: 1 }); cue('pop', AT.N + .55, { p: 1.15 }); cue('pop', AT.N + .7, { p: 1.3 }); cue('lock', AT.N + 1.9, { g: .6 });
      cue('pop', AT.O + 1.0, { p: .9 });
      cue('shimmer', AT.P + .2, { d: 2.4 }); cue('impact', AT.P + .6, { g: .8 }); cue('pop', AT.P + 1.3, { p: .8, g: .6 });
    },
    draw: {
      A: function (lt) {
        $('Adot').setAttribute('r', L(2, 0, seg(lt, .5, .9)) + Math.sin(seg(lt, 0, .5) * Math.PI) * 2);
        $('Aout').style.strokeDashoffset = 176 * (1 - io(seg(lt, .3, 1.5)));
        var sp = back(seg(lt, 1.1, 1.8));
        $('Ain').style.transform = 'scale(' + sp + ') rotate(' + (1 - sp) * 120 + 'deg)';
        $('Amark').style.transform = 'scale(' + L(.8, 1, o3(seg(lt, 0, 2.6))) + ')';
        $('Aglow').style.opacity = o3(seg(lt, 1, 2.2)) * (.85 + .15 * Math.sin(lt * 3));
        $('Arays').style.opacity = o3(seg(lt, 1.3, 2.4)) * .9;
        $('Arays').style.transform = 'rotate(' + lt * 8 + 'deg)';
      },
      B: function (lt) {
        phoneIn('Bph', lt, -18, 8);
        var p = back(seg(lt, .9, 1.7));
        $('Bpop').style.transform = 'translateZ(' + p * 150 + 'px) scale(' + (1 + .05 * p) + ')';
        $('Bgl').style.backgroundPosition = (100 - seg(lt, .4, 2.2) * 100) + '% 0';
      },
      C: function (lt) {
        var f = o5(seg(lt, .1, 1.3)), w = 330 * WIDE;
        $('C2').style.transform = 'translateY(' + (1 - f) * 260 + 'px) translateZ(' + 80 * f + 'px) rotateY(' + L(-10, 6, io(seg(lt, 0, 3.4))) + 'deg) scale(.8)';
        $('C1').style.transform = 'translateX(' + -w * f + 'px) translateY(' + (80 - 40 * f) + 'px) translateZ(' + -260 * f + 'px) rotateY(' + 28 * f + 'deg) scale(.72)';
        $('C3').style.transform = 'translateX(' + w * f + 'px) translateY(' + (80 - 40 * f) + 'px) translateZ(' + -260 * f + 'px) rotateY(' + -28 * f + 'deg) scale(.72)';
        $('C1').style.filter = $('C3').style.filter = 'brightness(' + L(1, .55, f) + ')';
        $('Cgl').style.backgroundPosition = (100 - seg(lt, .6, 2.6) * 100) + '% 0';
      },
      D: function (lt) {
        var p = lt < .5 ? 0 : Math.min(1, Math.pow((lt - .5) / 2.2, .85)), n = Math.max(1, Math.min(33, 1 + Math.floor(p * 32))), frac = n / 33;
        $('Dn').textContent = n;
        $('Darc').setAttribute('stroke-dashoffset', 1445 * (1 - frac)); $('Dglow').setAttribute('stroke-dashoffset', 1445 * (1 - frac));
        $$('#Dbeads circle').forEach(function (c, i) { c.setAttribute('fill', i < n ? '#f1d59e' : 'rgba(233,201,139,.16)'); c.setAttribute('r', i === n - 1 ? 9 : 6); });
        var since = lt < .5 ? 1 : (p * 32) % 1, rip = '';
        for (var r = 0; r < 2; r++) { var u = clamp(r ? since - .35 : since, 0, 1); rip += '<circle cx="300" cy="300" r="' + L(232, 300, o3(u)) + '" fill="none" stroke="rgba(246,223,170,' + (.35 * (1 - u)) + ')" stroke-width="' + L(6, 1, u) + '"/>'; }
        /* the round completes: one wider ring of light goes out */
        $('Drip').innerHTML = n < 33 ? rip : '<circle cx="300" cy="300" r="' + L(232, 330, o5(seg(lt, 2.75, 3.3))) + '" fill="none" stroke="rgba(246,223,170,' + .6 * (1 - seg(lt, 2.75, 3.3)) + ')" stroke-width="6"/>';
        $('Dring').style.transform = 'scale(' + L(.82, 1, o5(seg(lt, 0, .8))) + ') rotate(' + L(-30, 0, o5(seg(lt, 0, .8))) + 'deg)';
      },
      E: function (lt) {
        var h = heading(lt), a = o5(seg(lt, 0, 1));
        $('Ec').style.transform = 'scale(' + L(.75, 1, a) + ') rotateX(' + L(40, 0, a) + 'deg)';
        $('Edial').setAttribute('transform', 'rotate(' + -h + ' 400 400)');
        var off = ((QB - h) % 360 + 540) % 360 - 180, r = 384, a1 = -90 + off;
        var p1 = [400 + r * Math.cos(a1 * Math.PI / 180), 400 + r * Math.sin(a1 * Math.PI / 180)];
        $('Earc').setAttribute('d', 'M400 ' + (400 - r) + 'A' + r + ' ' + r + ' 0 0 ' + (off > 0 ? 1 : 0) + ' ' + p1[0] + ' ' + p1[1]);
        var locked = lt >= QLOCK, lk = seg(lt, QLOCK, QLOCK + .7);
        $('Earc').setAttribute('opacity', locked ? 0 : Math.min(1, Math.abs(off) / 8) * .9);
        $('Edeg').textContent = locked ? QB + '°' : Math.round(Math.abs(off)) + '°';
        $('Edeg').style.color = locked ? '#7fe0bb' : '#f5f0e7';
        $('Elab').textContent = locked ? 'FACING QIBLA ✓' : off > 0 ? 'TURN RIGHT' : 'TURN LEFT';
        $('Elab').style.color = locked ? '#7fe0bb' : '#a99e88';
        $('Ehub').setAttribute('fill', locked ? '#13463a' : '#0f2a24');
        $('Ehub').setAttribute('stroke', locked ? 'rgba(127,224,187,.7)' : 'rgba(127,224,187,0)');
        $('Emid').style.transform = 'scale(' + (locked ? 1 + .12 * Math.sin(lk * Math.PI) : 1) + ')';
        $('Elock').setAttribute('opacity', locked ? (1 - lk) * .95 : 0);
        $('Elock').setAttribute('r', 360 + o5(lk) * 90);
        $('Eglow').style.opacity = locked ? o3(lk) * (.8 + .2 * Math.sin(lt * 3)) : 0;
        $('Ekg').setAttribute('opacity', .35 + .25 * Math.sin(lt * 4));
      },
      F: function (lt) {
        $('Fdial').style.transform = 'rotate(' + L(-30, 0, o5(seg(lt, 0, 1.6))) + 'deg) scale(' + L(.8, 1, o5(seg(lt, 0, 1.6))) + ')';
        var idx = -1;
        HITS.forEach(function (hit, i) {
          var at = .6 + i * .45, k = o5(seg(lt, at, at + .45));
          $$('#Fdial [data-k="' + hit[0] + '"]').forEach(function (n) {
            n.setAttribute('opacity', n.classList.contains('wing') ? k * (.55 + .45 * Math.sin(Math.max(0, lt - at) * 5)) * (1 - seg(lt, at, at + 1.6)) : k);
          });
          $$('#Fdial [data-k="a' + hit[0] + '"]').forEach(function (n) { n.setAttribute('opacity', k); });
          if (lt >= at) idx = i;
        });
        var cur = HITS[Math.max(0, idx)], next = idx + 1 < HITS.length ? HITS[idx + 1][1] : 23.6;
        var hh = idx < 0 ? L(0, HITS[0][1], seg(lt, .2, .6)) : L(HITS[idx][1], next, io(seg(lt, .6 + idx * .45, .6 + (idx + 1) * .45)) * (idx + 1 < HITS.length ? 1 : seg(lt, .6 + idx * .45, 3.4)));
        $('Fhand').setAttribute('transform', 'rotate(' + hh / 24 * 360 + ' 400 400)');
        $('Fmid').style.opacity = o3(seg(lt, .6, 1));
        $('Ft').textContent = idx < 0 ? '' : cur[2]; $('Fh').textContent = idx < 0 ? '' : cur[3];
        var lift = idx < 0 ? 0 : o5(seg(lt, .6 + idx * .45, .9 + idx * .45));
        $('Ft').style.transform = 'translateY(' + (1 - lift) * 16 + 'px)'; $('Ft').style.opacity = lift;
      },
      G: function (lt) {
        var a = o5(seg(lt, 0, 1.3));
        $('Gph').style.transform = 'translateY(' + ((1 - a) * 260 + 120) + 'px) rotateX(' + (20 - 12 * a) + 'deg) rotateY(' + (14 - 22 * io(seg(lt, 0, 3.6))) + 'deg) scale(.82)';
        $('Ggl').style.backgroundPosition = (100 - seg(lt, .3, 2.3) * 100) + '% 0';
        var n = back(seg(lt, 1.3, 2.0));
        $('Gn').style.transform = 'translateY(' + L(SHAPE === 'port' ? -520 : -140, 0, n) + 'px) translateZ(160px) scale(' + L(.92, 1, o3(seg(lt, 1.3, 2.0))) + ')';
        $('Gn').style.opacity = o3(seg(lt, 1.3, 1.6));
        var dua = 'Guidance and good health for my parents', k = Math.floor(seg(lt, 2.1, 3.1) * dua.length);
        $('Gtype').textContent = dua.slice(0, k) + (lt > 2.0 && lt < 3.3 && Math.floor(lt * 3) % 2 ? '|' : '');
      },
      H: function (lt) {
        $('Hpath').style.strokeDashoffset = 1180 * (1 - io(seg(lt, 0, 1.3)));
        var e = o5(seg(lt, .15, 1.1));
        $('Hbook').style.transform = 'translateY(' + L(300, 0, e) + 'px) rotateX(' + L(25, 4, e) + 'deg) scale(' + L(.8, .84, seg(lt, 0, 3)) + ')';
        $('Hbook').style.opacity = e;
        var fl = io(seg(lt, 1.2, 2.1));
        $('Hpage').style.transform = 'rotateY(' + L(0, 170, fl) + 'deg)';
        $('Hpage').style.filter = 'brightness(' + L(1, .55, Math.sin(fl * Math.PI)) + ')';
        $('Hpage').style.opacity = fl > .55 ? 0 : 1;
      },
      I: function (lt) {
        /* the night slides in from the left, the forenoon from the right, and they part a little */
        var a = o5(seg(lt, 0, 1.2)), d = 210 * WIDE;
        $('I1').style.transform = 'translateX(' + L(-700, -d, a) + 'px) translateY(' + (1 - a) * 120 + 'px) rotateY(' + L(30, 12, a) + 'deg) scale(.74)';
        $('I2').style.transform = 'translateX(' + L(700, d, a) + 'px) translateY(' + (40 + (1 - a) * 120) + 'px) rotateY(' + L(-30, -12, a) + 'deg) scale(.74)';
      },
      J: function (lt) {
        phoneIn('J1', lt, -14, 6, .82);
        $('Jgl').style.backgroundPosition = (100 - seg(lt, .3, 2) * 100) + '% 0';
        /* the quiz slides over the lesson, offset, as the next step */
        var q = o5(seg(lt, 1.2, 2.1));
        $('J2').style.transform = 'translateX(' + L(900, 180 * WIDE, q) + 'px) translateY(120px) rotateY(' + L(-24, -8, q) + 'deg) scale(.7)';
        $('J1').style.filter = 'brightness(' + L(1, .6, q) + ')';
      },
      K: function (lt) {
        var a = o5(seg(lt, .2, 1.3));
        $('Kcard').style.transform = 'translateY(' + (1 - a) * 220 + 'px) rotateX(' + (1 - a) * 30 + 'deg) rotateY(' + Math.sin(lt * .8) * 4 + 'deg)';
        $('Kcard').style.opacity = o3(seg(lt, .2, .8));
        $('Kglow').style.transform = 'scale(' + (.9 + .08 * Math.sin(lt * 1.6)) + ')';
        ['Kc1', 'Kc2', 'Kc3'].forEach(function (id, i) {
          var k = back(seg(lt, 1.5 + i * .3, 2.1 + i * .3));
          $(id).style.opacity = seg(lt, 1.5 + i * .3, 1.7 + i * .3);
          $(id).style.transform = 'translateY(' + (1 - k) * 60 + 'px) scale(' + (.8 + .2 * k) + ') translateY(' + Math.sin(lt * 1.5 + i) * 6 + 'px)';
        });
        $$('#Kbeads i').forEach(function (b, i) { var k = o5(seg(lt, .8 + i * .07, 1.2 + i * .07)); b.style.transform = 'scaleY(' + k + ')'; b.style.opacity = k; });
      },
      L: function (lt) {
        phoneIn('Lph', lt, -16, 8);
        var p = back(seg(lt, .9, 1.7));
        $('Lpop').style.transform = 'translateZ(' + p * 150 + 'px) scale(' + (1 + .05 * p) + ')';
        $('Lgl').style.backgroundPosition = (100 - seg(lt, .4, 2.2) * 100) + '% 0';
      },
      M: function (lt) {
        phoneIn('Mph', lt, 14, -8);
        /* down through the fasts and make-up fasts to tarāwīḥ and the khatm */
        $('Mimg').style.transform = 'translateY(' + -io(seg(lt, .6, 3.0)) * 2500 + 'px)';
        $('Mgl').style.backgroundPosition = (100 - seg(lt, .3, 2.3) * 100) + '% 0';
      },
      N: function (lt) {
        [['W1', 0, -8], ['W2', .12, 10], ['W3', .22, -6]].forEach(function (w) {
          var e = back(seg(lt, w[1], w[1] + .8)), n = $(w[0]);
          n.style.opacity = seg(lt, w[1], w[1] + .2);
          n.style.transform = 'translateY(' + L(260, 0, e) + 'px) translateZ(' + L(-300, 0, e) + 'px) rotateX(' + L(30, 0, e) + 'deg) rotateY(' + (w[2] * (1 - e) + Math.sin(lt * 1.2 + w[1] * 9) * 2) + 'deg)';
        });
        /* the counts rise as fingers would: one widget completes its round, the other is on its way */
        [['W2', 33, .55, 1.9], ['W3', 21, .75, 2.0]].forEach(function (c) {
          var n = Math.round(c[1] * io(seg(lt, c[2], c[3])));
          $(c[0] + 'n').textContent = n;
          $(c[0] + 'r').style.strokeDashoffset = 527.8 * (1 - n / 33);
          $(c[0] + 'b').className = 'wt-b' + (n >= 33 ? ' on' : '');
        });
        var cd = 47 * 60 + 31 - Math.floor(lt);
        $('Wcd').textContent = 'in ' + Math.floor(cd / 60) + ':' + ('0' + cd % 60).slice(-2);
        $('Wbar').style.width = L(38, 74, io(seg(lt, .4, 2))) + '%';
      },
      O: function (lt) {
        var e = o5(seg(lt, 0, 1));
        $('Olap').style.transform = 'translateY(' + L(500, 0, e) + 'px) rotateX(' + L(30, 6, e) + 'deg) scale(' + L(.8, .86, seg(lt, 0, 3)) + ')';
        var pe = back(seg(lt, .9, 1.4));
        $('Opill').style.transform = 'translate(-50%,' + L(-90, 0, pe) + 'px) scale(' + L(.7, 1.15, pe) + ')';
        $('Opill').style.opacity = seg(lt, .9, 1.1);
        var s2 = Math.max(0, 8140 - Math.floor(lt - .9));
        $('Ocd').textContent = Math.floor(s2 / 3600) + ':' + ('0' + Math.floor(s2 % 3600 / 60)).slice(-2) + ':' + ('0' + s2 % 60).slice(-2);
      },
      P: function (lt) {
        $('Pout').style.strokeDashoffset = 176 * (1 - io(seg(lt, .05, .9)));
        var sp = back(seg(lt, .5, 1.1));
        $('Pin').style.transform = 'scale(' + sp + ') rotate(' + (1 - sp) * 120 + 'deg)';
        $('Ptile').setAttribute('opacity', o3(seg(lt, .1, .8)));
        $('Picon').style.transform = 'scale(' + L(.7, 1, o5(seg(lt, 0, 1.4))) + ') translateY(' + Math.sin(lt * 1.4) * 6 + 'px)';
        $('Pglow').style.opacity = o3(seg(lt, .6, 1.8)) * (.8 + .2 * Math.sin(lt * 2.4));
        [['Pname', .4], ['Ptag', .7], ['Pfree', 1.0], ['Pcta', 1.3]].forEach(function (q) {
          var k = o5(seg(lt, q[1], q[1] + .7));
          $(q[0]).style.opacity = k; $(q[0]).style.transform = 'translateY(' + (1 - k) * 50 + 'px)';
        });
        $$('#Pfree .kf').forEach(function (s, i) { s.style.transform = 'scale(' + back(seg(lt, 1.0 + i * .1, 1.5 + i * .1)) + ')'; });
      }
    }
  });
})();
