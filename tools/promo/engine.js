/* The films' shared engine (tools/promo/general.html, ramadan.html): the shape, the beats and the ways they open, the
   light that rides each cut, drifting motes, grain, the words rising from behind a mask, and the sound cues.
   A film calls Film({ dur, beats, draw, focus, area, cues, tint, flashes }) from its own script. Everything is a pure
   function of t: window.render(t) draws one frame; tools/promo/render.js steps through it into ffmpeg.
   Shapes (from the page's query): portrait 1080 x 1920 by default, ?feed 1080 x 1350, ?land 1920 x 1080. Each beat's
   visuals are drawn once in the portrait frame (.vis, 1080 x 1920); fit() moves the box `focus` of that frame into the
   shape's free area `area` (beside or below the words), so every shape is composed for itself, not cropped. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var seg = function (t, a, b) { return clamp((t - a) / (b - a), 0, 1); };
  var o3 = function (x) { return 1 - Math.pow(1 - x, 3); };
  var o5 = function (x) { return 1 - Math.pow(1 - x, 5); };
  var io = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var back = function (x) { var c = 1.5; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  var L = function (a, b, x) { return a + (b - a) * x; };
  var SHAPE = /[?&]land\b/.test(location.search) ? 'land' : /[?&]feed\b/.test(location.search) ? 'feed' : 'port';
  document.documentElement.className = SHAPE;
  var SW = SHAPE === 'land' ? 1920 : 1080, SH = SHAPE === 'land' ? 1080 : SHAPE === 'feed' ? 1350 : 1920;
  var rs = 1448;
  function rnd() { rs = (rs * 16807) % 2147483647; return rs / 2147483647; }
  window.F = { $: $, $$: $$, clamp: clamp, seg: seg, o3: o3, o5: o5, io: io, back: back, L: L, SHAPE: SHAPE, SW: SW, SH: SH, rnd: rnd };

  window.Film = function (cfg) {
    var DUR = (window.DUR = cfg.dur), TR = 0.7, BEATS = cfg.beats, AT = {};
    BEATS.forEach(function (b) { AT[b[0]] = b[1]; });
    var FOCUS = cfg.focus || {}, AREA = cfg.area || {};
    var DEF_FOCUS = FOCUS._ || [40, 500, 1040, 1460];
    var DEF_AREA = { port: null, feed: [40, 320, 1040, 1350], land: [780, 40, 1860, 1040] };
    function fit(id) {
      if (SHAPE === 'port') return null;
      var f = FOCUS[id] || DEF_FOCUS, a = (AREA[SHAPE] && AREA[SHAPE][id]) || (AREA[SHAPE] && AREA[SHAPE]._) || DEF_AREA[SHAPE];
      var s = Math.min((a[2] - a[0]) / (f[2] - f[0]), (a[3] - a[1]) / (f[3] - f[1]));
      return { s: s, tx: (a[0] + a[2]) / 2 - s * (f[0] + f[2]) / 2, ty: (a[1] + a[3]) / 2 - s * (f[1] + f[3]) / 2, cx: (f[0] + f[2]) / 2, cy: (f[1] + f[3]) / 2 };
    }
    var FITS = {};
    BEATS.forEach(function (b) { FITS[b[0]] = fit(b[0]); });

    /* a star texture, drawn once */
    (function () {
      var c = document.createElement('canvas'); c.width = 640; c.height = 1060;
      var x = c.getContext('2d');
      for (var i = 0; i < 240; i++) {
        var r = rnd() < .9 ? .5 + rnd() * .9 : 1.4 + rnd() * 1.2, a = .25 + rnd() * .75;
        x.fillStyle = 'rgba(255,' + (230 + rnd() * 25 | 0) + ',' + (190 + rnd() * 60 | 0) + ',' + a + ')';
        x.beginPath(); x.arc(rnd() * 640, rnd() * 1060, r, 0, 7); x.fill();
      }
      var u = c.toDataURL();
      $$('.stars').forEach(function (s) { s.style.backgroundImage = 'url(' + u + ')'; });
    })();

    /* grain and motes, at half the frame's resolution */
    var MW = SW / 2, MH = SH / 2;
    ['motes', 'grain'].forEach(function (id) { $(id).width = MW; $(id).height = MH; });
    var gc = $('grain').getContext('2d'), gimg = gc.createImageData(MW, MH);
    function grain(t) {
      var s = (Math.floor(t * 24) * 9301 + 49297) % 233280;
      for (var i = 0; i < gimg.data.length; i += 4) { s = (s * 9301 + 49297) % 233280; var v = (s / 233280) * 255; gimg.data[i] = gimg.data[i + 1] = gimg.data[i + 2] = v; gimg.data[i + 3] = 255; }
      gc.putImageData(gimg, 0, 0);
    }
    var mc = $('motes').getContext('2d'), MOTES = [];
    for (var i = 0; i < 50; i++) MOTES.push({ x: rnd() * MW, y: rnd() * MH, r: 1 + rnd() * 3.5, v: 6 + rnd() * 16, p: rnd() * 6.28, a: .15 + rnd() * .45 });
    function motes(t, tint) {
      mc.clearRect(0, 0, MW, MH);
      MOTES.forEach(function (m) {
        var y = ((m.y - t * m.v) % MH + MH) % MH, x = m.x + Math.sin(t * .5 + m.p) * 14, a = m.a * (.6 + .4 * Math.sin(t * 1.7 + m.p));
        var g = mc.createRadialGradient(x, y, 0, x, y, m.r * 3);
        g.addColorStop(0, 'rgba(' + tint + ',' + a + ')'); g.addColorStop(1, 'rgba(' + tint + ',0)');
        mc.fillStyle = g; mc.beginPath(); mc.arc(x, y, m.r * 3, 0, 7); mc.fill();
      });
    }
    /* the words rise from behind a mask, one line after another; in landscape they also drift in from the left */
    function words(id, lt, len, d0) {
      $$('#' + id + ' .band .m > span').forEach(function (s, i) {
        var a = o5(seg(lt, d0 + i * .16, d0 + .75 + i * .16)), out = io(seg(lt, len - .35, len + .25));
        s.style.transform = (SHAPE === 'land' ? 'translateX(' + (1 - a) * -30 + 'px) ' : '') + 'translateY(' + ((1 - a) * 115 - out * 40) + '%)';
        s.parentNode.style.opacity = 1 - out;
      });
    }

    /* the ways a beat opens, and what the outgoing beat does meanwhile */
    var DIAG = Math.sqrt((SW * SW + SH * SH) / 2);
    function reset(s) { s.clipPath = ''; s.transform = ''; s.opacity = 1; s.filter = ''; }
    function open(el, kind, k) {
      var e = io(k), s = el.style;
      reset(s);
      if (k >= 1) return;
      if (kind === 'fade') s.opacity = e;
      else if (kind === 'iris') s.clipPath = 'circle(' + L(0, 120, o3(k)) + '% at 50% 58%)';
      else if (kind === 'iris2') s.clipPath = 'circle(' + L(0, 170, o3(k)) + '% at 12% 28%)';
      else if (kind === 'diag') { var p = L(-80, 230, e); s.clipPath = 'polygon(0 0,' + p + '% 0,' + (p - 130) + '% 100%,0 100%)'; }
      else if (kind === 'zoom') { s.opacity = o3(seg(k, .15, .7)); s.transform = 'scale(' + L(.55, 1, o5(k)) + ') rotate(' + L(-6, 0, o5(k)) + 'deg)'; s.filter = 'blur(' + (1 - o3(k)) * 22 + 'px)'; }
      else if (kind === 'push') s.transform = 'translateY(' + (1 - o5(k)) * 100 + '%)';
      else if (kind === 'slide') { s.transform = 'translateX(' + (1 - o5(k)) * 100 + '%) skewX(' + (1 - o5(k)) * -8 + 'deg)'; s.filter = 'blur(' + (1 - o3(k)) * 8 + 'px)'; }
      else if (kind === 'window') s.clipPath = 'inset(' + L(44, 0, e) + '% ' + L(34, 0, e) + '% ' + L(44, 0, e) + '% ' + L(34, 0, e) + '% round ' + L(90, 0, e) + 'px)';
      else if (kind === 'shutter') s.clipPath = 'inset(' + L(50, 0, e) + '% 0 ' + L(50, 0, e) + '% 0)';
      else if (kind === 'split') s.clipPath = 'inset(0 ' + L(50, 0, e) + '% 0 ' + L(50, 0, e) + '%)';
      else if (kind === 'flip') { var f = seg(k, .45, 1); s.opacity = f > 0 ? 1 : 0; s.transform = 'rotateY(' + L(-90, 0, o3(f)) + 'deg) scale(' + L(.85, 1, o3(f)) + ')'; }
      else if (kind === 'bloom') { s.opacity = o3(k); s.filter = 'brightness(' + L(2.4, 1, e) + ') blur(' + (1 - e) * 14 + 'px)'; s.transform = 'scale(' + L(1.08, 1, o5(k)) + ')'; }
      else if (kind === 'flash') s.opacity = e;
    }
    function close(el, kind, k) {
      var s = el.style, e = io(k);
      reset(s);
      if (kind === 'zoom') { s.transform = 'scale(' + L(1, 2.4, Math.pow(k, 1.6)) + ')'; s.filter = 'blur(' + k * 24 + 'px) brightness(' + L(1, 1.8, k) + ')'; s.opacity = 1 - seg(k, .3, .8); }
      else if (kind === 'push') { s.transform = 'translateY(' + -o5(k) * 30 + '%) scale(' + L(1, .9, o5(k)) + ')'; s.filter = 'brightness(' + L(1, .35, k) + ')'; }
      else if (kind === 'slide') { s.transform = 'translateX(' + -o5(k) * 45 + '%) scale(' + L(1, .92, o5(k)) + ')'; s.filter = 'brightness(' + L(1, .4, k) + ') blur(' + k * 6 + 'px)'; }
      else if (kind === 'window' || kind === 'iris' || kind === 'iris2' || kind === 'split') { s.transform = 'scale(' + L(1, .9, e) + ')'; s.filter = 'brightness(' + L(1, .45, e) + ')'; }
      else if (kind === 'flip') { var f = seg(k, 0, .45); s.transform = 'rotateY(' + L(0, 90, Math.pow(f, 1.8)) + 'deg) scale(' + L(1, .85, f) + ')'; s.opacity = f < 1 ? 1 : 0; }
      else if (kind === 'shutter') { s.transform = 'scale(' + L(1, 1.08, e) + ')'; s.filter = 'brightness(' + L(1, .5, e) + ')'; }
      else if (kind === 'bloom') s.filter = 'brightness(' + L(1, 1.6, e) + ') blur(' + e * 10 + 'px)';
      else if (kind === 'diag') s.transform = 'translateX(' + -e * 12 + '%)';
    }
    /* the light that rides each cut: a ring on the iris, a streak along the wipe, bars on the shutter */
    function overlays(t) {
      var ring = $('tring').style, st = $('streak').style, b1 = $('bar1').style, b2 = $('bar2').style;
      ring.opacity = 0; st.opacity = 0; b1.opacity = 0; b2.opacity = 0;
      BEATS.forEach(function (b, i) {
        if (!i) return;
        var k = (t - b[1]) / TR;
        if (k < 0 || k > 1) return;
        if (b[2] === 'iris' || b[2] === 'iris2') {
          var r = L(0, b[2] === 'iris' ? 120 : 170, o3(k)) / 100 * DIAG, cx = b[2] === 'iris' ? SW / 2 : .12 * SW, cy = b[2] === 'iris' ? .58 * SH : .28 * SH;
          ring.left = cx - r + 'px'; ring.top = cy - r + 'px'; ring.width = ring.height = 2 * r + 'px'; ring.opacity = Math.sin(k * Math.PI) * .9;
        } else if (b[2] === 'diag') {
          var p = L(-80, 230, io(k)), x0 = p / 100 * SW, x1 = (p - 130) / 100 * SW, ang = Math.atan2(x0 - x1, SH) * 180 / Math.PI;
          st.left = (x0 + x1) / 2 - 130 + 'px'; st.top = (SH / 2 - 1600) + 'px'; st.transform = 'rotate(' + ang + 'deg)'; st.opacity = Math.sin(k * Math.PI);
        } else if (b[2] === 'shutter') {
          var y = L(50, 0, io(k)) / 100 * SH;
          b1.top = y - 3 + 'px'; b2.top = SH - y - 3 + 'px'; b1.opacity = b2.opacity = Math.sin(Math.min(1, k * 1.1) * Math.PI);
        }
      });
    }

    /* the sound cues: a whoosh panned with each cut, then the film's own (tools/promo/ramadan_sfx.py makes them) */
    var SFX = (window.SFX = []);
    var cue = function (k, t, o) { SFX.push(Object.assign({ k: k, t: +t.toFixed(3) }, o || {})); };
    var PAN = { iris: 0, iris2: -.6, diag: 1, zoom: 0, push: 0, window: 0, shutter: 0, split: 0, flip: -1, slide: -1, bloom: 0 };
    BEATS.forEach(function (b, i) { if (i && b[2] !== 'flash') cue('whoosh', b[1] - .18, { d: b[2] === 'zoom' ? .9 : .75, pan: PAN[b[2]], g: b[2] === 'zoom' ? 1.1 : .9 }); });
    if (cfg.cues) cfg.cues(cue, AT);
    var LAST = BEATS[BEATS.length - 1][0];

    window.render = function (t) {
      BEATS.forEach(function (b, i) {
        var el = $(b[0]), s = b[1], e = i + 1 < BEATS.length ? BEATS[i + 1][1] : DUR + 1, lt = t - s, len = e - s;
        var on = t >= s && t < e + TR;
        el.style.visibility = on ? 'visible' : 'hidden';
        el.style.zIndex = 2 + i;
        if (!on) return;
        if (t >= e && i + 1 < BEATS.length) close(el, BEATS[i + 1][2], seg(t, e, e + TR));
        else open(el, b[2], i === 0 ? 1 : seg(lt, 0, TR));
        var st = $(b[0] + 'st'); if (st) st.style.transform = 'translate(' + (-lt * 6) + 'px,' + (-lt * 14) + 'px)';
        var v = $(b[0] + 'v'), f = FITS[b[0]], push = 1 + .045 * seg(lt, 0, len + TR);
        if (v) v.style.transform = f
          ? 'translate(' + f.tx + 'px,' + f.ty + 'px) scale(' + f.s + ') translate(' + f.cx + 'px,' + f.cy + 'px) scale(' + push + ') translate(' + -f.cx + 'px,' + -f.cy + 'px)'
          : 'translate(540px,960px) scale(' + push + ') translate(-540px,-960px)';
        words(b[0], lt, b[0] === LAST ? 99 : len, .25);
        cfg.draw[b[0]](lt, len);
      });
      motes(t, cfg.tint ? cfg.tint(t, AT) : '246,214,150');
      grain(t);
      overlays(t);
      $$('.g, .rose').forEach(function (g) { g.style.backgroundPosition = (100 - ((t * 38) % 160)) + '% 0'; });
      $('fade').style.opacity = 1 - o3(seg(t, 0, .8)) + io(seg(t, DUR - .7, DUR));
      var fl = 0;
      (cfg.flashes || []).forEach(function (q) { fl = Math.max(fl, Math.sin(seg(t, AT[q[0]] - .1, AT[q[0]] + .5) * Math.PI) * q[1]); });
      $('flash').style.opacity = fl;
    };
    if (!/[?&]render/.test(location.search)) {
      var t0 = performance.now(), st = /[?&]t=([\d.]+)/.exec(location.search);
      if (st) window.render(+st[1]);
      else (function loop() { window.render(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); })();
    }
    return AT;
  };
})();
