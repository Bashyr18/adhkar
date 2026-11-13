/* The desktop pill, drawn by the app itself: the same fonts (Quicksand, Amiri), the same colour tokens, the same
   icons as every other screen, painted on a canvas and handed to the Windows app, which floats it over your work with
   smooth edges and a soft shadow. The countdown changes every second even while the main window is hidden, so the
   app also hands over its digits, drawn in Quicksand, and the Windows app sets them in place each second.
   Inert outside the Windows app. */
(function () {
  'use strict';
  var A = window.A;
  if (!A) return;
  var S = 2, /* drawn at twice the size, for sharp edges on any screen scale */
    W = 340,
    M = 18, /* room for the shadow */
    HEAD = 68,
    ROW = 56,
    PADB = 10;
  /* the two sizes: compact (one line, as a notch) and comfortable */
  function size(info) {
    var c = info.size === 'compact';
    W = c ? 300 : 340;
    HEAD = c ? 48 : 68;
    ROW = c ? 52 : 56;
    return c;
  }
  var ready = null;
  function fonts() {
    if (ready) return ready;
    ready = document.fonts && document.fonts.load
      ? Promise.all([
          document.fonts.load('700 18px Quicksand'),
          document.fonts.load('600 12px Quicksand'),
          document.fonts.load('400 16px Amiri', 'الظهر')
        ]).catch(function () {})
      : Promise.resolve();
    return ready;
  }
  function tok(cs, n, fb) {
    var v = cs.getPropertyValue(n).trim();
    return v || fb;
  }
  function round(c, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function icon(c, name, cx, cy, size, col) {
    var p = A.iconPaths(name),
      k = size / 24;
    c.save();
    c.translate(cx - size / 2, cy - size / 2);
    c.scale(k, k);
    c.strokeStyle = col;
    c.fillStyle = col;
    c.lineWidth = 1.7;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (p.f) {
      c.globalAlpha = 0.28;
      c.fill(new Path2D(p.f));
      c.globalAlpha = 1;
    }
    c.stroke(new Path2D(p.d));
    c.restore();
  }
  function badge(c, cx, cy, r, name, T, frac, done) {
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = done ? T.gold : T.soft;
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = T.goldLine;
    c.stroke();
    if (done) {
      icon(c, 'check', cx, cy, r * 1.05, T.onGold);
    } else icon(c, name, cx, cy, r * 1.05, T.gold2);
    if (frac != null && !done) {
      c.beginPath();
      c.arc(cx, cy, r + 3.5, 0, Math.PI * 2);
      c.strokeStyle = T.track;
      c.lineWidth = 2;
      c.stroke();
      if (frac > 0) {
        c.beginPath();
        c.arc(cx, cy, r + 3.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac));
        c.strokeStyle = T.gold;
        c.lineCap = 'round';
        c.stroke();
      }
    }
  }
  /* text placed from the start edge, mirrored in Arabic */
  function txt(c, s, x, y, font, col, end, ar) {
    c.font = font;
    c.fillStyle = col;
    c.direction = ar ? 'rtl' : 'ltr';
    var left = ar ? !end : end;
    c.textAlign = left ? 'right' : 'left';
    c.fillText(s, ar ? W + 2 * M - x : x, y);
    return c.measureText(s).width;
  }
  function fit(c, s, font, max) {
    c.font = font;
    if (c.measureText(s).width <= max) return s;
    while (s.length > 1 && c.measureText(s + '…').width > max) s = s.slice(0, -1);
    return s + '…';
  }

  function paint(info, open) {
    var compact = size(info);
    var cs = getComputedStyle(document.documentElement),
      dark = document.documentElement.dataset.theme !== 'light',
      ar = info.lang === 'ar',
      fr = info.friday,
      live = !!(fr && fr.live),
      rows = open ? info.rows : [],
      H = HEAD + (open ? rows.length * ROW + PADB : 0),
      cv = document.createElement('canvas');
    var T = {
      bg: live ? (dark ? '#0b2420' : '#eef6f0') : tok(cs, '--s1', dark ? '#10131c' : '#fffdf9'),
      bg2: live ? (dark ? '#082019' : '#e3f0e8') : tok(cs, '--s1b', dark ? '#0d1018' : '#fbf8f2'),
      t1: tok(cs, '--t1', dark ? '#f5f0e7' : '#1c1914'),
      t2: tok(cs, '--t2', '#aca79d'),
      t3: tok(cs, '--t3', '#8a867c'),
      gold: tok(cs, '--gold', '#d9b26f'),
      gold2: tok(cs, '--gold2', '#f1d59e'),
      onGold: tok(cs, '--on-gold', '#1a1206'),
      goldLine: tok(cs, '--gold-line', 'rgba(217,178,111,.32)'),
      soft: tok(cs, '--gold-soft', 'rgba(217,178,111,.12)'),
      line: tok(cs, '--line2', 'rgba(240,228,206,.12)'),
      track: dark ? 'rgba(240,228,206,.1)' : 'rgba(64,46,18,.1)'
    };
    cv.width = (W + 2 * M) * S;
    cv.height = (H + 2 * M) * S;
    var c = cv.getContext('2d');
    c.scale(S, S);
    c.textBaseline = 'alphabetic';
    var rad = open ? 26 : HEAD / 2;
    /* the shadow, then the card: the app's surface, its hairline of gold */
    c.save();
    c.shadowColor = dark ? 'rgba(0,0,0,.55)' : 'rgba(60,44,16,.22)';
    c.shadowBlur = 22;
    c.shadowOffsetY = 8;
    round(c, M, M, W, H, rad);
    c.fillStyle = T.bg;
    c.fill();
    c.restore();
    var g = c.createLinearGradient(0, M, 0, M + H);
    g.addColorStop(0, T.bg);
    g.addColorStop(1, T.bg2);
    round(c, M, M, W, H, rad);
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = live ? 'rgba(231,207,146,.5)' : T.goldLine;
    round(c, M + 0.5, M + 0.5, W - 1, H - 1, rad);
    c.stroke();
    /* the head: a badge (with the ring of the adhkār of the hour), the next prayer and its Arabic name */
    var cy = M + HEAD / 2,
      br = compact ? 14 : 19,
      bx = M + (compact ? 10 : 16) + br;
    badge(c, ar ? W + 2 * M - bx : bx, cy, br, live ? 'hands' : info.icon || 'mosque', T, info.ring, false);
    var x0 = bx + br + (compact ? 12 : 14),
      right = W + M - (compact ? 18 : 20),
      base = compact ? cy + 6 : cy + 13,
      nf = compact ? '700 15.5px Quicksand' : '700 18px Quicksand';
    if (!compact) {
      c.letterSpacing = '1.4px';
      txt(c, live ? fr.kicker : info.kicker, x0, cy - 9, '700 9.5px Quicksand', live ? T.gold2 : T.gold, false, ar);
      c.letterSpacing = '0px';
      /* under the kicker's line, at the end, the time */
      txt(c, live ? info.untilLabel : info.time, right, cy - 9, '600 11px Quicksand', T.t3, true, ar);
    }
    var name = live ? fr.title : info.name,
      nw = txt(c, fit(c, name, nf, compact ? 120 : 150), x0, base, nf, live ? T.gold2 : T.t1, false, ar);
    if (!live && info.nameAr && !ar) txt(c, info.nameAr, x0 + nw + 7, base - 1, (compact ? '400 13.5px' : '400 15px') + ' Amiri', T.gold2, false, ar);
    /* the countdown itself is set by the Windows app, on the name's line */
    var out = { rows: [], cd: { x: ar ? W + 2 * M - right : right, base: base, ar: ar } };
    /* the day, opened: the Friday hours, the morning and evening adhkār, a fast you planned */
    if (open) {
      c.beginPath();
      c.moveTo(M + 18, M + HEAD + 0.5);
      c.lineTo(M + W - 18, M + HEAD + 0.5);
      c.strokeStyle = T.line;
      c.stroke();
      rows.forEach(function (r, i) {
        var y = M + HEAD + i * ROW + 4,
          ry = y + ROW / 2,
          rx = M + 16 + 16;
        if (i)
          (c.beginPath(),
            c.moveTo(M + 64, y + 0.5),
            c.lineTo(M + W - 18, y + 0.5),
            (c.strokeStyle = T.line),
            c.stroke());
        badge(c, ar ? W + 2 * M - rx : rx, ry, 15, r.icon, T, r.frac, r.done);
        var tx = M + 16 + 32 + 14,
          lim = W - 32 - 14 - 16 - (r.right ? 86 : 20);
        txt(c, fit(c, r.title, '700 13.5px Quicksand', lim), tx, ry - 2, '700 13.5px Quicksand', r.live ? T.gold2 : T.t1, false, ar);
        txt(c, fit(c, r.sub || '', '600 11.5px Quicksand', lim), tx, ry + 15, '600 11.5px Quicksand', T.t3, false, ar);
        if (r.right) {
          c.font = '700 11px Quicksand';
          var w = c.measureText(r.right).width + 22,
            px = ar ? M + 16 : right - w;
          if (r.chip) {
            round(c, px, ry - 12, w, 24, 12);
            c.fillStyle = T.soft;
            c.fill();
            c.strokeStyle = T.goldLine;
            c.stroke();
            txt(c, r.right, right - 11, ry + 4, '700 11px Quicksand', T.gold2, true, ar);
          } else txt(c, r.right, right, ry + 4, '700 12px Quicksand', r.live ? T.gold2 : T.t2, true, ar);
        }
        out.rows.push({ y: y - M, h: ROW, route: r.route });
      });
    }
    out.img = cv.toDataURL('image/png').split(',')[1];
    out.w = W + 2 * M;
    out.h = H + 2 * M;
    return out;
  }
  /* the digits of the countdown, in Quicksand, each in a cell of one width so the time never jitters */
  function atlas(ar, col, px) {
    var chars = (ar ? '٠١٢٣٤٥٦٧٨٩' : '0123456789') + ':',
      font = '700 ' + px + 'px Quicksand',
      cv = document.createElement('canvas'),
      c = cv.getContext('2d');
    c.font = font;
    var dw = 0;
    for (var i = 0; i < 10; i++) dw = Math.max(dw, c.measureText(chars[i]).width);
    var colon = c.measureText(':').width + 1,
      cell = Math.ceil(dw),
      b = Math.round(px * 1.05),
      h = Math.round(px * 1.4);
    cv.width = (cell * 10 + Math.ceil(colon)) * S;
    cv.height = h * S;
    c = cv.getContext('2d');
    c.scale(S, S);
    c.font = font;
    c.fillStyle = col;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    for (var j = 0; j < 10; j++) c.fillText(chars[j], j * cell + cell / 2, b);
    c.fillText(':', cell * 10 + colon / 2, b - px * 0.05);
    return { img: cv.toDataURL('image/png').split(',')[1], cell: cell, colon: colon, h: h, b: b };
  }

  /* everything the Windows app needs, at twice the size (s) */
  A.paintPill = function (info) {
    return fonts().then(function () {
      var cs = getComputedStyle(document.documentElement),
        live = !!(info.friday && info.friday.live),
        a = paint(info, false),
        b = paint(info, true),
        at = atlas(info.lang === 'ar', live ? tok(cs, '--gold2', '#f1d59e') : tok(cs, '--t1', '#f5f0e7'), info.size === 'compact' ? 16.5 : 20);
      a.cd.top = a.cd.base - at.b;
      return {
        s: S,
        place: info.place || 'top',
        hover: info.hover !== false,
        lang: info.lang,
        target: live ? info.friday.until : info.at,
        closed: { img: a.img, w: a.w, h: a.h },
        open: { img: b.img, w: b.w, h: b.h, rows: b.rows },
        cd: a.cd,
        head: HEAD,
        margin: M,
        atlas: at
      };
    });
  };
})();
