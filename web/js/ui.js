/* Adhkār 10 — UI shell: router, nav, sheets, toast, ticker, theme, shared components, sky. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    $$ = A.$$,
    esc = A.esc,
    ic = A.icon;
  var app,
    nav,
    cur = null,
    lastKey = null,
    homeTab = null,
    shownHash = location.hash || '#/';
  /* Which element on the page being left becomes which on the page arriving. Opening a collection: the card that
     links to it becomes its header. Going back: the header becomes the card that links to it again. */
  var HERO = /^#\/c\//;
  function cardFor(hash) {
    var a = app.querySelector('.view a[href="' + hash + '"]');
    return a ? a.closest('.feature, .coll, .jr, .focus, .card') || a : null;
  }
  function heroPair(from, to) {
    if (HERO.test(to)) {
      var c = cardFor(to);
      return c
        ? {
            out: c,
            find: function () {
              return $('.view .chead', app);
            }
          }
        : null;
    }
    if (from && HERO.test(from)) {
      var h = $('.view .chead', app);
      return h
        ? {
            out: h,
            find: function () {
              return cardFor(from);
            }
          }
        : null;
    }
    return null;
  }
  /* Main tabs stay alive. Leaving one keeps its built page; coming back puts that page on screen again instead of
     building it anew, as long as nothing has been saved since, it is the same day and under a minute old (times and
     "now" badges move on). The Tracker is always rebuilt: its counter has to stop and start cleanly. */
  var KEEP = { 'today/': 1, 'adhkar/': 1, 'salah/': 1, 'profile/': 1 },
    kept = {},
    tabY = {},
    built = null,
    KEEP_MS = 60000;
  A.keptTabs = function () {
    return Object.keys(kept);
  };
  A.V = {}; /* views: name → function(params) → { html, title, tab, bare, mount(el), tick(el) } */
  A.acts = {}; /* delegated actions: data-a="name" */

  /* ================= components ================= */
  A.ring = function (frac, size, inner, hue, stroke) {
    size = size || 44;
    stroke = stroke || 3.4;
    var r = (size - stroke) / 2 - 0.5,
      c = 2 * Math.PI * r,
      f = A.clamp(frac || 0, 0, 1);
    return (
      '<div class="ring' +
      (f >= 1 ? ' done' : '') +
      '" style="--rs:' +
      size +
      'px' +
      (hue ? ';--h:' + hue : '') +
      '"><svg viewBox="0 0 ' +
      size +
      ' ' +
      size +
      '"><circle class="tr" cx="' +
      size / 2 +
      '" cy="' +
      size / 2 +
      '" r="' +
      r +
      '" fill="none" stroke-width="' +
      stroke +
      '"/><circle class="pr" cx="' +
      size / 2 +
      '" cy="' +
      size / 2 +
      '" r="' +
      r +
      '" fill="none" stroke-width="' +
      stroke +
      '" stroke-linecap="round" stroke-dasharray="' +
      c.toFixed(2) +
      '" stroke-dashoffset="' +
      (c * (1 - f)).toFixed(2) +
      '"/></svg><div class="in">' +
      (inner == null ? '' : inner) +
      '</div></div>'
    );
  };
  A.hueVar = function (h) {
    return 'var(--' + (h === 'gold' ? 'goldh' : h) + ')';
  };
  /* switches take their spoken name from the row they sit in */
  A.nameSwitches = function (root) {
    Array.prototype.forEach.call(root.querySelectorAll('.sw:not([aria-label])'), function (b) {
      var row = b.closest('.set, .row, .card'),
        t = row && row.querySelector('.t, b, [style*="font-weight"]');
      if (t && t.textContent.trim()) b.setAttribute('aria-label', t.textContent.trim());
    });
  };
  A.sw = function (on, act, data) {
    return (
      '<button type="button" class="sw" role="switch" aria-checked="' +
      !!on +
      '" data-a="' +
      act +
      '"' +
      (data || '') +
      '></button>'
    );
  };
  A.stepper = function (val, act, data) {
    return (
      '<div class="stepper"><button type="button" data-a="' +
      act +
      '" data-d="-1"' +
      (data || '') +
      ' aria-label="Decrease">' +
      ic('minus', 's') +
      '</button><b class="num">' +
      esc(val) +
      '</b><button type="button" data-a="' +
      act +
      '" data-d="1"' +
      (data || '') +
      ' aria-label="Increase">' +
      ic('plus', 's') +
      '</button></div>'
    );
  };
  /* the transliteration and translation of a text, one design everywhere: a label, then the text in its own
     direction; āyah numbers "(1)" become small markers, as in the Arabic */
  A.txSections = function (it, compact) {
    /* line by line: an āyah number becomes a marker, and the basmalah that opens a sūrah becomes a quiet divider */
    var BSM = /^(Bismill[āa]hir-Ra[ḥh]m[āa]nir-Ra[ḥh][īi]m\.?|In the Name of Allah,.*Most Merciful\.)$/;
    var vn = function (t) {
      return String(t)
        .split('\n')
        .map(function (l) {
          var m = l.match(/^\((\d+)\) ([\s\S]*)$/);
          if (m)
            return (
              '<span class="ln v"><span class="vn">' +
              A.fmtN(+m[1]) +
              '</span><span class="vt">' +
              esc(m[2]) +
              '</span></span>'
            );
          if (BSM.test(l.trim())) return '<span class="ln bsm-l"><span>' + esc(l.trim()) + '</span></span>';
          return '<span class="ln">' + esc(l) + '</span>';
        })
        .join('');
    };
    var h = '';
    if (S.prefs.tr && it.tr)
      h +=
        '<section class="tx-b tx-tr"><div class="tx-h">' +
        A.T('Transliteration') +
        '</div><div class="tx-t" dir="ltr" lang="en">' +
        vn(it.tr) +
        '</div></section>';
    if (S.prefs.en && it.en)
      h +=
        '<section class="tx-b tx-en"><div class="tx-h">' +
        A.T('Translation') +
        '</div><div class="tx-t" dir="ltr" lang="en">' +
        vn(it.en) +
        '</div></section>';
    return h ? '<div class="tx' + (compact ? ' sm' : '') + '">' + h + '</div>' : '';
  };
  A.back = function (label, href) {
    var t = A.backTarget && A.backTarget();
    if (t) {
      href = t.href;
      if (t.label) label = t.label;
    }
    return (
      '<a class="back" href="' +
      (href || '#/') +
      '" data-a="back"><span class="back-ic">' +
      ic('left', 's') +
      '</span><span class="back-t">' +
      esc(label || 'Back') +
      '</span></a>'
    );
  };

  /* eight-point star (khātam) path centred at cx,cy */
  A.starPath = function (cx, cy, R, r) {
    var pts = [];
    for (var i = 0; i < 16; i++) {
      var a = (Math.PI / 8) * i - Math.PI / 2,
        rr = i % 2 ? r : R;
      pts.push((cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2));
    }
    return 'M' + pts.join('L') + 'Z';
  };
  var HUES = {
    gold: ['#f1d59e', '#b88a3e'],
    dawn: ['#ffc38a', '#d0743a'],
    dusk: ['#f6a891', '#b4503e'],
    jade: ['#9fe6c7', '#2c9a72'],
    night: ['#c2c9ff', '#5562d0'],
    indigo: ['#cdbcff', '#7356d6'],
    teal: ['#9be6ea', '#22949b'],
    rose: ['#f7b8cb', '#b9507a'],
    sand: ['#efdcb9', '#a9814a'],
    goldh: ['#f4dc8c', '#b38a1a']
  };
  A.HUES = HUES;
  A.avatar = function (size, name, hue) {
    name = name == null ? S.profile.name : name;
    hue = hue || S.profile.hue || 'gold';
    var c = HUES[hue] || HUES.gold,
      id = 'av' + Math.random().toString(36).slice(2, 7),
      ini = (name || '')
        .trim()
        .split(/\s+/)
        .map(function (w) {
          return w[0];
        })
        .join('')
        .slice(0, 2)
        .toUpperCase();
    return (
      '<div class="avatar" style="width:' +
      size +
      'px;height:' +
      size +
      'px;font-size:' +
      Math.round(size * 0.36) +
      'px"><svg viewBox="0 0 100 100"><defs><linearGradient id="' +
      id +
      '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' +
      c[0] +
      '"/><stop offset="1" stop-color="' +
      c[1] +
      '"/></linearGradient></defs><rect width="100" height="100" fill="url(#' +
      id +
      ')"/><path d="' +
      A.starPath(50, 50, 62, 44) +
      '" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.4"/><path d="' +
      A.starPath(50, 50, 40, 28) +
      '" fill="rgba(255,255,255,.12)"/></svg>' +
      (ini ? '<span>' + esc(ini) + '</span>' : '<span>' + ic('user', 's') + '</span>') +
      '</div>'
    );
  };
  A.medal = function (b, on, size) {
    var c = ['var(--gold2)', 'var(--gold3)'],
      id = 'md' + b.id; /* one accent family for every medal */
    return (
      '<svg viewBox="0 0 100 100" width="' +
      (size || 58) +
      '" height="' +
      (size || 58) +
      '" aria-hidden="true"><defs><linearGradient id="' +
      id +
      '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:' +
      c[0] +
      '"/><stop offset="1" style="stop-color:' +
      c[1] +
      '"/></linearGradient></defs>' +
      '<path d="' +
      A.starPath(50, 50, 48, 40) +
      '" fill="url(#' +
      id +
      ')"/><path d="' +
      A.starPath(50, 50, 40, 33) +
      '" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.2"/>' +
      '<circle cx="50" cy="50" r="24" fill="rgba(0,0,0,.18)"/><g transform="translate(36 36) scale(1.17)" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' +
      pathOf(b.ic) +
      '"/></g></svg>'
    );
  };
  function pathOf(n) {
    var all = ic(n).match(/d="[^"]+"/g) || [];
    return all.length ? all[all.length - 1].slice(3, -1) : '';
  }
  A.rosette = function (size) {
    var g = '';
    for (var i = 0; i < 3; i++)
      g +=
        '<path d="' +
        A.starPath(60, 60, 54 - i * 15, 42 - i * 12) +
        '" fill="none" stroke="url(#rg)" stroke-width="' +
        (1.6 - i * 0.3) +
        '" opacity="' +
        (1 - i * 0.22) +
        '"/>';
    return (
      '<svg viewBox="0 0 120 120" width="' +
      size +
      '" height="' +
      size +
      '" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dfaa"/><stop offset="1" stop-color="#b8873a"/></linearGradient><radialGradient id="rgc"><stop offset="0" stop-color="rgba(241,213,158,.35)"/><stop offset="1" stop-color="rgba(241,213,158,0)"/></radialGradient></defs><circle cx="60" cy="60" r="58" fill="url(#rgc)"/>' +
      g +
      '<path d="' +
      A.starPath(60, 60, 13, 9) +
      '" fill="url(#rg)"/></svg>'
    );
  };

  /* ================= toast / live ================= */
  var toastT;
  /* a one-line tip, shown once, the first time a screen is used */
  A.hint = function (id, msg, icon) {
    if (!S.hints || S.hints[id] || !S.profile.onboarded) return;
    S.hints[id] = 1;
    A.save();
    setTimeout(function () {
      A.toast(msg, icon || 'info');
    }, 1100);
  };
  A.toast = function (msg, icon) {
    var t = $('#toast');
    if (!t) return;
    t.innerHTML = (icon ? '<i class="ti">' + ic(icon, 's') + '</i>' : '') + '<span>' + esc(msg) + '</span>';
    t.classList.toggle('hi', !!$('.reader'));
    t.classList.remove('on');
    void t.offsetWidth;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(
      function () {
        t.classList.remove('on');
      },
      Math.min(4200, 1800 + msg.length * 30)
    );
  };

  /* ================= sheet ================= */
  var sheetStack = [];
  A.sheet = function (title, body, opts) {
    opts = opts || {};
    var scrim = document.createElement('div'),
      sh = document.createElement('div');
    scrim.className = 'scrim';
    sh.className = 'sheet';
    sh.setAttribute('role', 'dialog');
    sh.setAttribute('aria-modal', 'true');
    sh.innerHTML =
      '<div class="grab"></div><div class="sh-h"><h3>' +
      esc(title) +
      '</h3><button type="button" class="ib ghost" data-a="sheet-close" aria-label="Close">' +
      ic('close', 's') +
      '</button></div><div class="sh-b">' +
      body +
      '</div>';
    document.body.appendChild(scrim);
    document.body.appendChild(sh);
    var o = {
      el: sh,
      close: function (silent) {
        if (o.closed) return;
        o.closed = true;
        sheetStack.splice(sheetStack.indexOf(o), 1);
        A.syncBack();
        scrim.classList.add('out');
        sh.classList.add('out');
        setTimeout(function () {
          scrim.remove();
          sh.remove();
        }, 260);
        if (opts.onClose && !silent) opts.onClose();
      }
    };
    scrim.addEventListener('click', function () {
      o.close();
    });
    dragClose(sh, o);
    sheetStack.push(o);
    A.syncBack();
    if (opts.mount) opts.mount(sh, o);
    return o;
  };
  function dragClose(sh, o) {
    var y0 = null,
      dy = 0,
      grab = $('.grab', sh),
      head = $('.sh-h', sh);
    function start(e) {
      y0 = e.touches[0].clientY;
      dy = 0;
      sh.style.transition = 'none';
    }
    function move(e) {
      if (y0 == null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      sh.style.transform = 'translateY(' + dy + 'px)';
    }
    function end() {
      if (y0 == null) return;
      sh.style.transition = '';
      if (dy > 90) o.close();
      else sh.style.transform = '';
      y0 = null;
    }
    [grab, head].forEach(function (h) {
      h.addEventListener('touchstart', start, { passive: true });
      h.addEventListener('touchmove', move, { passive: true });
      h.addEventListener('touchend', end);
    });
  }
  A.closeSheets = function () {
    sheetStack.slice().forEach(function (s) {
      s.close(true);
    });
  };
  A.acts['sheet-close'] = function (el) {
    var s = sheetStack[sheetStack.length - 1];
    if (s) s.close();
  };
  A.options = function (title, list, curVal, onPick) {
    var html = list
      .map(function (o) {
        return (
          '<button type="button" class="opt" data-a="opt-pick" data-v="' +
          esc(o.v) +
          '" aria-pressed="' +
          (String(o.v) === String(curVal)) +
          '"><span class="rad"></span><div class="grow"><div class="t">' +
          esc(o.t) +
          '</div>' +
          (o.s ? '<div class="s">' + esc(o.s) + '</div>' : '') +
          '</div></button>'
        );
      })
      .join('');
    var sh = A.sheet(title, html);
    sh.pick = function (v) {
      sh.close(true);
      onPick(v);
    };
    sh.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a="opt-pick"]');
      if (b) {
        e.stopPropagation();
        A.N.haptic('tick');
        sh.pick(b.dataset.v);
      }
    });
    return sh;
  };
  A.confirm = function (title, msg, okLabel, onOk, danger) {
    var sh = A.sheet(
      title,
      '<p class="muted" style="line-height:1.6">' +
        esc(msg) +
        '</p><div class="grid2" style="margin-top:6px"><button type="button" class="btn sec" data-a="sheet-close">Cancel</button><button type="button" class="btn ' +
        (danger ? 'warn' : 'pri') +
        '" data-ok>' +
        esc(okLabel) +
        '</button></div>'
    );
    $('[data-ok]', sh.el).addEventListener('click', function () {
      sh.close(true);
      onOk();
    });
  };

  /* ================= theme ================= */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  A.isLight = function () {
    if (S.prefs.theme === 'light') return true;
    if (S.prefs.theme === 'dark') return false;
    if (A.N.has) {
      var d = A.N.call('systemDark');
      if (d === true || d === false) return !d;
    }
    return !!(mq && mq.matches);
  };
  A.applyTheme = function () {
    var light = A.isLight(),
      r = document.documentElement;
    r.setAttribute('data-theme', light ? 'light' : 'dark');
    r.setAttribute('data-accent', S.prefs.accent || 'gold');
    /* Ramaḍān dresses the whole app for the month, then quietly steps back */
    if (A.isRamadan && A.isRamadan(A.today())) r.setAttribute('data-season', 'ramadan');
    else r.removeAttribute('data-season');
    r.style.setProperty('--ar', S.prefs.ar + 'px');
    r.classList.toggle('calm', !S.prefs.motion);
    var m = $('meta[name="theme-color"]');
    if (m) m.content = light ? '#f5f1e9' : '#07080d';
    A.N.statusBar(light);
  };
  /* theme sheet: mode and accent, applied with a soft crossfade */
  var ACCENTS = [
    ['gold', '#d9b26f'],
    ['emerald', '#4fbf96'],
    ['sapphire', '#6f95f0'],
    ['rose', '#e48aa6'],
    ['pearl', '#c9c4ba']
  ];
  function smooth(fn) {
    if (document.startViewTransition && S.prefs.motion) document.startViewTransition(fn);
    else fn();
  }
  A.themeSheet = function () {
    var prev = function (bg, card, ink) {
      return (
        '<i style="background:linear-gradient(160deg,' +
        bg +
        ' 0 55%,' +
        card +
        ' 55%);box-shadow:inset 0 0 0 1px rgba(128,128,128,.25)"><span style="display:block;margin:10px;height:6px;width:40%;border-radius:3px;background:' +
        ink +
        '"></span></i>'
      );
    };
    var modes = [
      ['auto', 'Auto', 'linear-gradient(135deg,#07080d 50%,#f5f1e9 50%)'],
      ['dark', 'Dark', '#07080d'],
      ['light', 'Light', '#f5f1e9']
    ];
    var h =
      '<div class="themes">' +
      modes
        .map(function (m) {
          return (
            '<button type="button" class="tmode" data-mode="' +
            m[0] +
            '" aria-pressed="' +
            (S.prefs.theme === m[0]) +
            '">' +
            prev(m[2], m[0] === 'light' ? '#fffdf9' : m[0] === 'dark' ? '#151925' : '#151925', 'var(--gold)') +
            m[1] +
            '</button>'
          );
        })
        .join('') +
      '</div>';
    h +=
      '<div class="eyebrow" style="text-align:center">Accent</div><div class="swatches">' +
      ACCENTS.map(function (c) {
        return (
          '<button type="button" class="swatch" data-acc="' +
          c[0] +
          '" aria-label="' +
          c[0] +
          '" aria-pressed="' +
          ((S.prefs.accent || 'gold') === c[0]) +
          '" style="background:radial-gradient(circle at 35% 30%,#fff6 0,transparent 45%),' +
          c[1] +
          '"></button>'
        );
      }).join('') +
      '</div>';
    A.sheet('Theme', h, {
      mount: function (el) {
        el.addEventListener('click', function (e) {
          var m = e.target.closest('[data-mode]'),
            c = e.target.closest('[data-acc]');
          if (!m && !c) return;
          if (m) S.prefs.theme = m.dataset.mode;
          else S.prefs.accent = c.dataset.acc;
          A.N.haptic('tick');
          A.save();
          A.$$('[data-mode]', el).forEach(function (b) {
            b.setAttribute('aria-pressed', b.dataset.mode === S.prefs.theme);
          });
          A.$$('[data-acc]', el).forEach(function (b) {
            b.setAttribute('aria-pressed', b.dataset.acc === S.prefs.accent);
          });
          smooth(A.applyTheme);
        });
      }
    });
  };
  A.acts.theme = function () {
    A.themeSheet();
  };

  if (mq && mq.addEventListener)
    mq.addEventListener('change', function () {
      if (S.prefs.theme === 'auto') A.applyTheme();
    });

  /* ================= sky (hero) ================= */
  var SKY = {
    night: ['#050818', '#0d1434', '#1a1d48', 'rgba(130,140,255,.30)'],
    fajr: ['#0b1233', '#2a2a5c', '#6e4a76', 'rgba(255,150,130,.42)'],
    rise: ['#273873', '#9a5d78', '#f2a46b', 'rgba(255,190,120,.85)'],
    morn: ['#1d5a9b', '#4a8bc6', '#a8cbe4', 'rgba(255,232,170,.70)'],
    noon: ['#16589f', '#3a89cf', '#89c0e8', 'rgba(255,246,205,.80)'],
    asr: ['#28558f', '#6f8db3', '#e2b47a', 'rgba(255,212,140,.75)'],
    set: ['#251c4c', '#873d62', '#ee8d59', 'rgba(255,140,90,.85)'],
    dusk: ['#0b1030', '#22204f', '#432f62', 'rgba(170,140,255,.38)']
  };
  function hex(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function mix(a, b, f) {
    if (a[0] === 'r') {
      var x = a.match(/[\d.]+/g).map(Number),
        y = b.match(/[\d.]+/g).map(Number);
      return (
        'rgba(' +
        x
          .map(function (v, i) {
            return i < 3 ? Math.round(v + (y[i] - v) * f) : (v + (y[i] - v) * f).toFixed(2);
          })
          .join(',') +
        ')'
      );
    }
    var p = hex(a),
      q = hex(b);
    return (
      'rgb(' +
      p
        .map(function (v, i) {
          return Math.round(v + (q[i] - v) * f);
        })
        .join(',') +
      ')'
    );
  }
  A.skyColors = function (n) {
    if (!n.t) return SKY.night;
    var t = n.t,
      y = A.pday(A.shift(n.key, -1)),
      H = 3600000;
    var anchors = [
      [y.isha + H, 'night'],
      [t.fajr - 20 * 60000, 'night'],
      [t.fajr, 'fajr'],
      [t.sunrise, 'rise'],
      [t.sunrise + 1.5 * H, 'morn'],
      [t.dhuhr, 'noon'],
      [t.asr, 'asr'],
      [t.maghrib - 25 * 60000, 'set'],
      [t.maghrib + 10 * 60000, 'set'],
      [t.isha, 'dusk'],
      [t.isha + H, 'night'],
      [t.nextFajr - 20 * 60000, 'night']
    ];
    var now = n.now,
      i = 0;
    while (i < anchors.length - 1 && anchors[i + 1][0] <= now) i++;
    var a = anchors[i],
      b = anchors[Math.min(i + 1, anchors.length - 1)],
      f = b[0] > a[0] ? A.clamp((now - a[0]) / (b[0] - a[0]), 0, 1) : 0;
    var ca = SKY[a[1]],
      cb = SKY[b[1]];
    return [0, 1, 2, 3].map(function (k) {
      return mix(ca[k], cb[k], f);
    });
  };
  var STARS = (function () {
    var s = '',
      r = 7;
    for (var i = 0; i < 34; i++) {
      r = (r * 9301 + 49297) % 233280;
      var x = r / 233280;
      r = (r * 9301 + 49297) % 233280;
      var y = r / 233280;
      s +=
        '<i style="left:' +
        (x * 100).toFixed(1) +
        '%;top:' +
        (y * 62).toFixed(1) +
        '%;animation-delay:' +
        ((i * 0.37) % 4).toFixed(2) +
        's;opacity:' +
        (0.3 + (i % 5) / 8).toFixed(2) +
        '"></i>';
    }
    return s;
  })();
  /* arc geometry (true proportions): horizon y=64, sunrise x=18 → sunset x=302 */
  function arcPt(f, night) {
    var x = 18 + 284 * f,
      y = 64 - (night ? 34 : 50) * Math.sin(Math.PI * f);
    return [x, y];
  }
  A.skyArc = function (n) {
    if (!n.t) return '';
    var t = n.t,
      now = n.now,
      day = now >= t.sunrise && now < t.maghrib,
      night = !day,
      f,
      s = '';
    var ns = now >= t.maghrib ? t.maghrib : A.pday(A.shift(n.key, -1)).maghrib,
      ne = now >= t.maghrib ? t.nextFajr : t.fajr;
    f = day ? (now - t.sunrise) / (t.maghrib - t.sunrise) : A.clamp((now - ns) / (ne - ns), 0, 1);
    var path = function (a, b) {
      var out = [];
      for (var i = 0; i <= 48; i++) {
        var q = arcPt(a + ((b - a) * i) / 48, night);
        out.push(q[0].toFixed(1) + ' ' + q[1].toFixed(1));
      }
      return 'M' + out.join('L');
    };
    var warm = day ? '#ffe2a6' : '#dfe3ff';
    s +=
      '<defs><linearGradient id="arcg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="' +
      warm +
      '"/></linearGradient>' +
      '<linearGradient id="hzn" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="gnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="orb"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="' +
      warm +
      '"/><stop offset="1" stop-color="' +
      (day ? '#ffb35c' : '#aab3ff') +
      '"/></radialGradient>' +
      '<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>';
    s += '<line x1="6" y1="64" x2="314" y2="64" stroke="url(#hzn)" stroke-width="1" stroke-linecap="round"/>';
    [
      [18, day ? 'Sunrise' : 'Maghrib'],
      [302, day ? 'Maghrib' : 'Fajr']
    ].forEach(function (e, n) {
      s +=
        '<circle cx="' +
        e[0] +
        '" cy="64" r="2.2" fill="#fff" fill-opacity=".7"/><text x="' +
        e[0] +
        '" y="76" text-anchor="' +
        (n ? 'end' : 'start') +
        '" font-size="7" font-weight="700" font-family="Quicksand" fill="#fff" fill-opacity=".55">' +
        e[1] +
        '</text>';
    });
    s +=
      '<path d="' +
      path(0, 1) +
      '" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2" stroke-dasharray="1.5 5" stroke-linecap="round"/>';
    if (f > 0.01) {
      s +=
        '<path d="' +
        path(0, f) +
        '" fill="none" stroke="' +
        warm +
        '" stroke-opacity=".55" stroke-width="5" stroke-linecap="round" filter="url(#soft)"/>';
      s +=
        '<path class="arcpast" d="' +
        path(0, f) +
        '" fill="none" stroke="url(#arcg)" stroke-width="2.2" stroke-linecap="round"/>';
    }
    var marks = day
      ? [
          ['Dhuhr', t.dhuhr],
          ['ʿAṣr', t.asr]
        ].map(function (m) {
          return [m[0], (m[1] - t.sunrise) / (t.maghrib - t.sunrise)];
        })
      : [
          ['Middle', 1 / 2],
          ['Last third', 2 / 3]
        ];
    marks.forEach(function (m) {
      var p = arcPt(m[1], night),
        passed = m[1] <= f;
      s +=
        '<circle cx="' +
        p[0].toFixed(1) +
        '" cy="' +
        p[1].toFixed(1) +
        '" r="3" fill="' +
        (passed ? warm : 'none') +
        '" stroke="#fff" stroke-opacity=".75" stroke-width="1"/>';
      s +=
        '<text x="' +
        p[0].toFixed(1) +
        '" y="' +
        (p[1] - 7).toFixed(1) +
        '" text-anchor="middle" font-size="7.5" font-weight="700" font-family="Quicksand" fill="#fff" fill-opacity=".7">' +
        m[0] +
        '</text>';
    });
    var o = arcPt(A.clamp(f, 0, 1), night),
      cx = o[0].toFixed(1),
      cy = o[1].toFixed(1);
    s += '<circle class="halo" cx="' + cx + '" cy="' + cy + '" r="15" fill="' + warm + '" fill-opacity=".22"/>';
    s += day
      ? '<circle cx="' + cx + '" cy="' + cy + '" r="7.5" fill="url(#orb)"/>'
      : '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="7.5" fill="url(#orb)"/><circle cx="' +
        (o[0] + 3.4).toFixed(1) +
        '" cy="' +
        (o[1] - 2.2).toFixed(1) +
        '" r="6.4" fill="#1a1d48" fill-opacity=".92"/>';
    return '<svg viewBox="0 0 320 80" aria-hidden="true">' + s + '</svg>';
  };
  A.skyHTML = function (n, compact) {
    var cols = A.skyColors(n),
      style = '--k1:' + cols[0] + ';--k2:' + cols[1] + ';--k3:' + cols[2] + ';--k4:' + cols[3];
    var isNight = n.t ? n.now < n.t.fajr || n.now >= n.t.isha + 1800000 : true;
    var loc = S.loc ? S.loc.name : 'Set location';
    var h = '<section class="sky' + (n.t ? '' : ' empty') + '" style="' + style + '" data-sky>';
    h +=
      '<div class="stars" style="opacity:' +
      (isNight ? 1 : 0) +
      '">' +
      STARS +
      '</div><div class="glow" style="' +
      glowPos(n) +
      '"></div>';
    h +=
      '<div class="meta"><div><div>' +
      esc(A.hijriText(n.key)) +
      '</div><div style="opacity:.75;margin-top:2px">' +
      esc(A.fmtDate(n.key)) +
      '</div></div><a class="loc" href="#/location">' +
      ic('pin', 'xs') +
      '<span class="clamp1">' +
      esc(loc) +
      '</span></a></div>';
    if (!n.t) {
      h +=
        '<div class="next"><div class="lbl">Prayer times</div><div class="nm"><b>Set your location</b></div><div class="cd">For accurate times, reminders, qibla and the night thirds.</div></div><div style="margin-top:16px"><a class="btn pri sm" href="#/location">' +
        ic('locate', 's') +
        'Choose location</a></div>';
    } else {
      h +=
        '<div class="next"><div class="lbl" data-sky-lbl>' +
        (n.next.k === 'sunrise' ? 'Fajr ends' : 'Next prayer') +
        '</div><div class="nm"><b>' +
        esc(n.next.k === 'sunrise' ? 'Sunrise' : P.NAMES[n.next.k]) +
        '</b><span class="ar">' +
        P.AR[n.next.k] +
        '</span></div>';
      h +=
        '<div class="cd"><span data-sky-cd>in <b>' +
        A.fmtCountdown(n.next.at - n.now) +
        '</b></span> · ' +
        A.fmtTxt(n.next.at) +
        '</div></div>';
      if (!compact) h += '<div class="arc" data-sky-arc>' + A.skyArc(n) + '</div>';
      h +=
        '<div class="times">' +
        P.ORDER.map(function (k) {
          var c = n.prev.key === n.key && (n.cur === k || (k === 'sunrise' && n.prev.k === 'sunrise'));
          return (
            '<div class="' +
            (c ? 'cur' : '') +
            '">' +
            (k === 'sunrise' ? 'Shurūq' : P.NAMES[k]) +
            '<b>' +
            A.fmtT(n.t[k], 'bare') +
            '</b></div>'
          );
        }).join('') +
        '</div>';
    }
    return h + '</section>';
  };
  function glowPos(n) {
    if (!n.t) return 'left:50%;top:-60px';
    var t = n.t,
      day = n.now >= t.sunrise && n.now < t.maghrib,
      f;
    if (day) f = (n.now - t.sunrise) / (t.maghrib - t.sunrise);
    else f = 0.5;
    return (
      'left:calc(' +
      (8 + f * 70).toFixed(1) +
      '% - 130px);top:' +
      (day ? (120 - Math.sin(Math.PI * f) * 150).toFixed(0) : 40) +
      'px'
    );
  }
  A.skyTick = function (el, n) {
    var sky = $('[data-sky]', el);
    if (!sky || !n.t) return;
    var cd = $('[data-sky-cd]', sky);
    if (cd) cd.innerHTML = 'in <b>' + A.fmtCountdown(n.next.at - n.now) + '</b>';
    if (n.now % 30000 < 1000 || !sky.dataset.painted) {
      sky.dataset.painted = 1;
      var cols = A.skyColors(n);
      ['--k1', '--k2', '--k3', '--k4'].forEach(function (v, i) {
        sky.style.setProperty(v, cols[i]);
      });
      var arc = $('[data-sky-arc]', sky);
      if (arc) {
        arc.classList.add('static');
        arc.innerHTML = A.skyArc(n);
      }
      var g = $('.glow', sky);
      if (g) g.setAttribute('style', glowPos(n));
    }
  };

  /* ================= router ================= */
  function parse() {
    var h = (location.hash || '#/').replace(/^#\/?/, ''),
      parts = h
        .split('/')
        .filter(Boolean)
        .map(function (x) {
          try {
            return decodeURIComponent(x);
          } catch (e) {
            return x;
          }
        });
    return { name: parts[0] || 'today', a: parts.slice(1), raw: h };
  }
  /* own navigation stack: deep links cold-start with no browser history, so Back needs a fallback */
  var stack = [],
    replacing = false;
  function track() {
    var h = location.hash || '#/';
    if (replacing) {
      replacing = false;
      stack[stack.length - 1] = h;
      return;
    }
    if (stack.length > 1 && stack[stack.length - 2] === h) stack.pop();
    else if (stack[stack.length - 1] !== h) stack.push(h);
  }
  A.go = function (h, replace) {
    if ((location.hash || '#/') === h) return;
    if (replace) {
      replacing = true;
      location.replace(h);
    } else location.hash = h;
  };
  var titles = {};
  /* the back link names the page you came from, and returns to it */
  A.backTarget = function () {
    var prev = stack.length > 1 ? stack[stack.length - 2] : null;
    return prev ? { href: prev, label: titles[prev] || null } : null;
  };
  A.goBack = function (fallback) {
    if (stack.length > 1) history.back();
    else A.go(fallback || '#/', true);
  };
  A.route = parse;
  var TABS = [
    ['today', 'Today', 'home', '#/'],
    ['adhkar', 'Adhkār', 'book', '#/adhkar'],
    ['tracker', 'Tracker', 'tracker', '#/tracker'],
    ['salah', 'Ṣalāh', 'mosque', '#/salah'],
    ['profile', 'You', 'user', '#/profile']
  ];
  function buildNav() {
    nav.innerHTML =
      '<i class="pill"></i>' +
      TABS.map(function (t) {
        return '<a href="' + t[3] + '" data-tab="' + t[0] + '">' + ic(t[2]) + '<span>' + t[1] + '</span></a>';
      }).join('');
  }
  A.render = function (opts) {
    opts = opts || {};
    var r = parse();
    if (r.name !== 'welcome') {
      var obg = document.querySelector('body > .ob-bg');
      if (obg) obg.remove();
    }
    if (!S.profile.onboarded && r.name !== 'welcome' && r.name !== 'location') {
      A.go('#/welcome', true);
      return;
    }
    if (r.name === 'r') {
      var ca = [r.a[0]].concat(r.a[2] ? [r.a[2]] : []);
      if (!cur || cur.key !== 'c/' + ca.join('/')) paint({ name: 'c', a: ca }, opts);
      A.openReader(r.a[0], +r.a[1] || 0, r.a[2]);
      A.syncBack();
      return;
    }
    if (A.readerOpen()) A.closeReader();
    paint(r, opts);
    A.syncBack();
  };
  function paint(r, opts) {
    var fn = A.V[r.name] || A.V.today,
      key = r.name + '/' + r.a.join('/');
    var same = lastKey === key,
      y = window.scrollY;
    if (!opts.keep) A.wake();
    /* remember where the tab being left was scrolled to, and keep its page */
    if (!same && lastKey && KEEP[lastKey]) {
      tabY[lastKey] = y;
      var leaving = app.querySelector('.view');
      if (leaving && built && built.key === lastKey && cur && cur.key === lastKey)
        kept[lastKey] = { node: leaving, v: cur, rev: built.rev, at: built.at, day: built.day };
    }
    var hit = !same && !opts.keep && KEEP[key] && kept[key],
      reuse = hit && hit.rev === A.rev && hit.day === A.today() && Date.now() - hit.at < KEEP_MS;
    delete kept[key];
    var v;
    try {
      v = reuse ? hit.v : fn(r.a, r);
    } catch (e) {
      /* error boundary: a broken view must never leave a blank screen */
      try {
        console.error(e);
      } catch (_) {}
      v = {
        title: 'Something went wrong',
        tab: -1,
        html:
          '<div class="empty card" style="margin-top:40px"><div class="badge" style="--h:var(--bad)">' +
          ic('info') +
          '</div><h3>This screen could not open</h3><p class="small">Your data is safe. Go back to Today, and if it happens again, export a backup from Settings.</p><p class="faint small" style="font-family:monospace">' +
          esc(String((e && e.message) || e).slice(0, 160)) +
          '</p><a class="btn pri" href="#/">Back to Today</a></div>'
      };
    }
    if (v.redirect) {
      A.go(v.redirect, true);
      return;
    }
    /* every page that is not a main tab gets a way back to wherever you came from */
    var main =
      ['today', 'adhkar', 'tracker', 'tasbih', 'salah', 'profile', 'welcome'].indexOf(r.name) >= 0 && !r.a.length;
    if (!reuse && !main && !v.bare && v.html.indexOf('data-a="back"') < 0) v.html = A.back('Back', '#/') + v.html;
    titles[location.hash || '#/'] = v.title;
    A.closeSheets();
    if (cur && cur.unmount) cur.unmount();
    cur = v;
    cur.key = key;
    app.className = v.bare ? 'bare' : '';
    var quick = v.tab != null && v.tab >= 0 && main; /* a main tab appears at once, with only a short fade */
    if (reuse) {
      /* the page built earlier goes back on screen as it was */
      hit.node.className = 'view' + (S.prefs.motion ? ' tabin' : '');
      app.innerHTML = '<div class="pattern" aria-hidden="true"></div>';
      app.appendChild(hit.node);
      built = { key: key, rev: hit.rev, at: hit.at, day: hit.day };
    } else {
      app.innerHTML =
        '<div class="pattern" aria-hidden="true"></div><div class="view' +
        (same || opts.keep || !S.prefs.motion ? '' : quick ? ' tabin' : ' in') +
        '">' +
        v.html +
        '</div>';
      A.nameSwitches(app);
      built = { key: key, rev: A.rev, at: Date.now(), day: A.today() };
    }
    document.title = (v.title ? v.title + ' · ' : '') + 'Adhkār';
    /* a sub-page lights the tab you reached it from, so the bar always says where Back leads; a cold deep link uses the page's own tab */
    var tab = v.tab != null ? v.tab : -1;
    if (main && tab >= 0) homeTab = tab;
    else if (!v.bare && tab >= 0 && homeTab != null) tab = homeTab;
    nav.classList.toggle('hide', !!v.bare);
    document.body.classList.toggle('is-bare', !!v.bare); /* full-screen pages: no nav, no fade behind it */
    nav.style.setProperty('--i', Math.max(0, tab));
    document.documentElement.setAttribute('data-page', tab >= 0 ? TABS[tab][0] : 'today');
    $$('a', nav).forEach(function (a, i) {
      if (i === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    $('.pill', nav).style.opacity = tab < 0 ? 0 : 1;
    /* keep scroll only when re-painting the same view; a new route always starts at the top */
    /* a main tab returns to where you left it; any other new page starts at the top */
    var back = same ? y : KEEP[key] && tabY[key] ? tabY[key] : 0;
    window.scrollTo(0, back);
    if (!same)
      requestAnimationFrame(function () {
        if (lastKey === key) window.scrollTo(0, back);
      });
    lastKey = key;
    if (reuse) {
      if (v.tick) {
        try {
          v.tick(app);
        } catch (e) {}
      }
    } /* bring the clock on a kept page up to the second */
    else if (v.mount) {
      try {
        v.mount(app);
      } catch (e) {
        try {
          console.error(e);
        } catch (_) {}
      }
    }
  }
  A.rerender = function () {
    A.render({ keep: true });
  };

  /* ---------- swiping between the main tabs ----------
     A clear sideways swipe on a main tab moves to the next or previous one; the page follows the finger a little
     first, so it feels held rather than triggered. Swipes that start at the screen's edges belong to the system's
     back gesture, and anything that scrolls or drags sideways itself (chips, sliders, the counting circle) keeps its
     own gesture. */
  var MAIN = ['today', 'adhkar', 'tracker', 'salah', 'profile'];
  function sideScroller(el) {
    for (; el && el !== app; el = el.parentElement) {
      if (el.matches('input, textarea, select, .pace, .counter, .dial, .seg, .rak, [data-noswipe]')) return true;
      if (el.scrollWidth > el.clientWidth + 2) {
        var ox = getComputedStyle(el).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
    }
    return false;
  }
  function swipeTabs() {
    var s = null,
      EDGE = 28;
    app.addEventListener(
      'touchstart',
      function (e) {
        s = null;
        if (e.touches.length !== 1 || sheetStack.length || A.readerOpen() || !S.profile.onboarded) return;
        var r = parse(),
          i = r.a.length ? -1 : MAIN.indexOf(r.name),
          t = e.touches[0];
        if (i < 0 || t.clientX < EDGE || t.clientX > window.innerWidth - EDGE || sideScroller(e.target)) return;
        if (A.pace && A.pace.speed && A.pace.speed()) return; /* a count in progress is never swiped away */
        s = { x: t.clientX, y: t.clientY, t: Date.now(), i: i, lock: null, view: $('.view', app) };
      },
      { passive: true }
    );
    app.addEventListener(
      'touchmove',
      function (e) {
        if (!s) return;
        var t = e.touches[0],
          dx = t.clientX - s.x,
          dy = t.clientY - s.y;
        if (!s.lock && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) s.lock = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y';
        if (s.lock !== 'x') {
          if (s.lock === 'y') s = null;
          return;
        }
        if (s.view && S.prefs.motion) {
          s.view.style.transition = 'none';
          s.view.style.transform = 'translateX(' + (dx * 0.22).toFixed(1) + 'px)';
        }
      },
      { passive: true }
    );
    var end = function (e) {
      if (!s) return;
      var o = s;
      s = null;
      var t = e.changedTouches && e.changedTouches[0],
        dx = t ? t.clientX - o.x : 0,
        dy = t ? t.clientY - o.y : 0;
      if (o.view) {
        o.view.style.transition = 'transform .22s var(--out)';
        o.view.style.transform = '';
        setTimeout(function () {
          if (o.view) o.view.style.transition = '';
        }, 240);
      }
      if (o.lock !== 'x' || Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - o.t > 700) return;
      var rtl = document.documentElement.dir === 'rtl',
        step = dx < 0 !== rtl ? 1 : -1,
        j = o.i + step;
      if (j < 0 || j >= MAIN.length) return;
      A.N.haptic('tick');
      A.tabSwitch = true;
      A.go(TABS[j][3]);
    };
    app.addEventListener('touchend', end, { passive: true });
    app.addEventListener(
      'touchcancel',
      function () {
        if (s && s.view) s.view.style.transform = '';
        s = null;
      },
      { passive: true }
    );
  }
  /* Ambient motion (twinkling stars, drifting clouds, soft glows) plays when a page appears or is touched, then
     rests. Left running, it makes the phone redraw the screen sixty times a second for as long as the page is open. */
  var restT = null,
    REST_MS = 8000;
  A.wake = function () {
    var r = document.documentElement;
    if (r.classList.contains('rest')) r.classList.remove('rest');
    clearTimeout(restT);
    restT = setTimeout(function () {
      r.classList.add('rest');
    }, REST_MS);
  };
  A.cur = function () {
    return cur;
  };

  /* native back: close sheet → reader → history */
  A.handleBack = function () {
    if (sheetStack.length) {
      sheetStack[sheetStack.length - 1].close();
      return true;
    }
    var r = parse();
    if (A.readerOpen()) {
      A.goBack('#/c/' + r.a[0] + (r.a[2] ? '/' + r.a[2] : ''));
      return true;
    }
    if (r.name === 'today' || r.name === 'welcome') return false;
    A.goBack(TAB_HOME[r.name] || '#/');
    return true;
  };
  window.__native.onBack = function () {
    endPreview(true);
    return A.handleBack() ? 'handled' : 'exit';
  };

  /* ---------- predictive back ----------
     Native registers for the back gesture only while back stays inside the app; otherwise Android previews going
     home. While the finger is down (Android 14 and later) the thing that will close leans away with the gesture:
     a sheet sinks, a page shrinks a little towards the far edge. */
  var canBack = null,
    preview = null;
  /* only what is on top can be reached by a screen reader: the page and the bar step back behind a sheet or the
     reader, and the bar steps out on full-screen pages */
  A.syncLayers = function () {
    var over = !!sheetStack.length || A.readerOpen(),
      bare = nav.classList.contains('hide');
    app.inert = over;
    nav.inert = over || bare;
    if (over || bare) nav.setAttribute('aria-hidden', 'true');
    else nav.removeAttribute('aria-hidden');
    if (over) app.setAttribute('aria-hidden', 'true');
    else app.removeAttribute('aria-hidden');
  };
  A.syncBack = function () {
    A.syncLayers();
    var r = parse(),
      can = !!sheetStack.length || A.readerOpen() || !(r.name === 'today' || r.name === 'welcome');
    if (can !== canBack) {
      canBack = can;
      A.N.call('setCanBack', can);
    }
  };
  function previewEl() {
    return sheetStack.length
      ? { el: sheetStack[sheetStack.length - 1].el, sheet: true }
      : { el: $('.reader') || $('.view', app), sheet: false };
  }
  window.__native.onBackStart = function (fromRight) {
    endPreview(true);
    var t = previewEl();
    if (!t.el) return;
    preview = { el: t.el, sheet: t.sheet, dir: fromRight ? -1 : 1 };
    t.el.style.transition = 'none';
    t.el.style.transformOrigin = fromRight ? '0% 50%' : '100% 50%';
    if (!t.sheet) t.el.style.willChange = 'transform';
  };
  window.__native.onBackProgress = function (p) {
    if (!preview || !S.prefs.motion) return;
    var q = Math.max(0, Math.min(1, +p || 0)),
      e = 1 - Math.pow(1 - q, 2);
    preview.el.style.transform = preview.sheet
      ? 'translateY(' + (e * 72).toFixed(1) + 'px)'
      : 'translateX(' + (preview.dir * e * 22).toFixed(1) + 'px) scale(' + (1 - e * 0.06).toFixed(4) + ')';
    if (!preview.sheet) preview.el.style.opacity = (1 - e * 0.2).toFixed(3);
  };
  window.__native.onBackCancel = function () {
    endPreview(false);
  };
  function endPreview(now) {
    if (!preview) return;
    var el = preview.el;
    preview = null;
    el.style.transition = now ? 'none' : 'transform .28s var(--out), opacity .28s var(--out)';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.willChange = '';
    setTimeout(
      function () {
        el.style.transition = '';
        el.style.transformOrigin = '';
      },
      now ? 0 : 300
    );
  }
  window.__native.onRoute = function (h) {
    if (h && h.charAt(0) === '#') {
      A.closeSheets();
      A.go(h);
    }
  };
  window.__native.onResume = function () {
    var te = A.N.trackerEvents();
    if (te.length && A.trkWidget) A.trkWidget(te);
    A.N.widgetEvents();
    if (A.autoLocate) A.autoLocate();
    A.applyTheme();
    /* an open sheet keeps what you typed: refresh the page only when nothing is open over it */
    if (!sheetStack.length) A.rerender();
  };
  window.__native.onInsets = function (top, bottom) {
    var r = document.documentElement.style;
    r.setProperty('--sat', top + 'px');
    r.setProperty('--sab', bottom + 'px');
  };
  var TAB_HOME = {
    ramadan: '#/',
    insights: '#/profile',
    calendar: '#/',
    c: '#/adhkar',
    search: '#/',
    saved: '#/adhkar',
    qibla: '#/salah',
    learn: '#/salah',
    modesty: '#/salah',
    month: '#/salah',
    night: '#/salah',
    duha: '#/salah',
    location: '#/salah',
    settings: '#/profile'
  };
  A.acts.unfold = function (el) {
    var l = el.closest('.fold3');
    if (l) {
      l.classList.remove('more');
      el.remove();
      A.N.haptic('tick');
    }
  };
  A.acts.back = function (el, e) {
    e.preventDefault();
    A.goBack(el.getAttribute('href') || '#/');
  };

  /* ================= events ================= */
  function onClick(e) {
    var el = e.target.closest('[data-a]');
    if (!el) return;
    var fn = A.acts[el.dataset.a];
    if (fn) {
      fn(el, e);
    }
  }

  /* ================= boot ================= */
  A.boot = function () {
    try {
      history.scrollRestoration = 'manual';
    } catch (e) {}
    app = $('#app');
    nav = $('#nav');
    buildNav();
    A.applyTheme();
    document.addEventListener('click', onClick);
    /* real visible height (shrinks with the keyboard), for full-screen layouts */
    var setVh = function () {
      document.documentElement.style.setProperty('--vh', window.innerHeight + 'px');
    };
    setVh();
    window.addEventListener('resize', function () {
      setVh();
      var f = document.activeElement;
      if (f && f.tagName === 'INPUT')
        setTimeout(function () {
          f.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 60);
    });
    /* tactile ripple on pressable surfaces */
    document.addEventListener(
      'pointerdown',
      function (e) {
        var t = e.target.closest('.btn, a.card, button.card, .li, .chip, .jr, .seg button, .rak button, .choice');
        if (!t || !S.prefs.motion) return;
        var r = t.getBoundingClientRect(),
          box = document.createElement('span'),
          dot = document.createElement('i'),
          size = Math.max(r.width, r.height) * 2.2;
        box.className = 'rpl';
        dot.style.width = dot.style.height = size + 'px';
        dot.style.left = e.clientX - r.left - size / 2 + 'px';
        dot.style.top = e.clientY - r.top - size / 2 + 'px';
        box.appendChild(dot);
        if (!t.dataset.rp) {
          t.dataset.rp = 1;
          if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
        }
        t.appendChild(box);
        setTimeout(function () {
          box.remove();
        }, 650);
      },
      { passive: true }
    );
    /* instant press state on finger-down (CSS :active waits for scroll disambiguation on touch) */
    nav.addEventListener(
      'pointerdown',
      function (e) {
        var a = e.target.closest('a[data-tab]');
        if (!a) return;
        var i = Array.prototype.indexOf.call(nav.querySelectorAll('a[data-tab]'), a);
        nav.style.setProperty('--i', i);
        $('.pill', nav).style.opacity = 1;
        /* switch tabs on touch-down: no wait for the finger to lift */
        var href = a.getAttribute('href');
        if ((location.hash || '#/') !== href) {
          A.tabSwitch = true;
          A.go(href);
        } else if (window.scrollY > 0) {
          tabY[lastKey] = 0;
          window.scrollTo({ top: 0, behavior: S.prefs.motion ? 'smooth' : 'auto' });
        } /* the tab you are on: back to the top */
      },
      { passive: true }
    );
    /* the back pill steps aside while you read down, and returns when you scroll up */
    var lastY = 0;
    window.addEventListener(
      'scroll',
      function () {
        var y = window.scrollY,
          d = y - lastY;
        if (Math.abs(d) < 6) return;
        var dn = d > 0 && y > 120;
        if (dn !== document.body.classList.contains('reading-down')) document.body.classList.toggle('reading-down', dn);
        lastY = y;
      },
      { passive: true }
    );
    window.addEventListener('hashchange', function () {
      document.body.classList.remove('reading-down');
      lastY = 0;
    });
    var lastTap = 0;
    document.addEventListener(
      'pointerup',
      function () {
        lastTap = Date.now();
      },
      { passive: true, capture: true }
    );
    swipeTabs();
    document.addEventListener('pointerdown', A.wake, { passive: true, capture: true });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = e.target;
      if (!t || t.tagName === 'BUTTON' || t.tagName === 'A' || t.getAttribute('role') !== 'button') return;
      e.preventDefault();
      t.click();
    });
    var pressed = null,
      unpress = function () {
        if (pressed) {
          pressed.classList.remove('is-pressed');
          pressed = null;
        }
      };
    document.addEventListener(
      'pointerdown',
      function (e) {
        var t = e.target.closest('button, a, .set, .li, .chip, .feature, .counter, [data-a]');
        if (!t || t.disabled) return;
        unpress();
        pressed = t;
        t.classList.add('is-pressed');
      },
      { passive: true }
    );
    ['pointerup', 'pointercancel', 'dragstart'].forEach(function (ev) {
      document.addEventListener(ev, unpress, { passive: true });
    });
    document.addEventListener('scroll', unpress, { passive: true, capture: true });
    track();
    window.addEventListener('hashchange', function () {
      track();
      /* a calm cross-fade between pages, and a card that opens a collection grows into that collection's header
         (and shrinks back into its card on the way back); only for taps inside the app, never allowed to stall */
      var to = location.hash || '#/',
        from = shownHash;
      shownHash = to;
      var reader = /^#\/r\//.test(to) || /^#\/r\//.test(stack[stack.length - 2] || ''); /* the reader moves itself */
      var tab = A.tabSwitch;
      A.tabSwitch = false;
      if (
        document.startViewTransition &&
        S.prefs.motion &&
        !document.hidden &&
        !reader &&
        !tab &&
        Date.now() - lastTap < 900
      ) {
        var hero = heroPair(from, to),
          done = false;
        if (hero) hero.out.style.viewTransitionName = 'hero';
        var vt = document.startViewTransition(function () {
          if (done) return;
          done = true;
          A.render();
          if (hero) {
            hero.inn = hero.find();
            if (hero.inn) hero.inn.style.viewTransitionName = 'hero';
          }
        });
        var clear = function () {
          if (hero)
            [hero.out, hero.inn].forEach(function (e) {
              if (e) e.style.viewTransitionName = '';
            });
        };
        if (vt.finished) vt.finished.then(clear, clear);
        setTimeout(function () {
          if (!done) {
            done = true;
            try {
              vt.skipTransition();
            } catch (e) {}
            clear();
            A.render();
          }
        }, 350);
      } else A.render();
    });
    document.addEventListener('visibilitychange', function () {
      document.documentElement.classList.toggle('idle', document.hidden);
      if (document.hidden) A.save(true);
      else if (!A.N.has) A.rerender();
    });
    var day = A.today();
    setInterval(function () {
      var d = A.today();
      if (d !== day) {
        day = d;
        A.rerender();
        return;
      }
      if (cur && cur.tick && !document.hidden) cur.tick(app);
    }, 1000);
    /* apply anything logged from the home-screen widgets before the first paint */
    A.N.widgetEvents();
    var wt = A.N.trackerEvents();
    if (wt.length && A.trkWidget) A.trkWidget(wt);
    A.render();
    requestAnimationFrame(function () {
      A.N.call('ready', Math.round(performance.now()));
    });
    if (A.migrated) A.toast('Progress from the previous version was imported', 'check');
    A.N.sync();
    if (A.autoLocate) setTimeout(A.autoLocate, 1500);
    var fresh = A.checkBadges();
    void fresh;
  };
})();
