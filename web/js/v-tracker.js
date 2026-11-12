/* Tracker: free remembrance through the day. Each phrase carries its own number from the Sunnah where one is
   established (subḥānallāh, subḥānallāhi wa biḥamdih and istighfār: a hundred a day), with the hadith; other phrases
   have no set number and are simply counted. By default you count on your fingers while the circle keeps the pace;
   tapping to count remains a choice. The day's total is a figure, not a goal.
   State lives in S.tasbih: per-day totals (days), per-phrase per-day (pd), all-time per phrase (per). */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    $ = A.$,
    esc = A.esc,
    ic = A.icon;
  var TARGETS = [33, 99, 100, 1000, 0];
  function T() {
    return S.tasbih;
  }

  function phrases() {
    return window.DATA.tasbih.concat(T().custom || []);
  }
  /* the numbers the Sunnah sets, with the evidence; a phrase without one has no daily goal */
  var SUNNAH = {
    subhanallah: { goal: 100, key: 'muslim:2698', d: 'A hundred a day: a thousand good deeds written' },
    subhanbihamdih: { goal: 100, key: 'bukhari:6405', d: 'A hundred a day: sins wiped away' },
    astaghfirullah: { goal: 100, key: 'muslim:2702', d: 'The Prophet ﷺ sought forgiveness a hundred times a day' },
    alhamdulillah: { after: 33, key: 'muslim:597', d: 'Thirty-three after each prayer' },
    allahuakbar: { after: 33, key: 'muslim:597', d: 'Thirty-three after each prayer' },
    salawat: { key: 'muslim:408', d: 'Allah blesses you ten times for each' }
  };
  A.trkSunnah = SUNNAH;
  function todayOf(id) {
    var d = (T().pd || {})[A.today()];
    return (d && d[id]) || 0;
  }
  function byId(id) {
    var l = phrases();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  /* a round on the fingers: for a phrase with a daily number, a target that divides it (or it divides), else the number itself */
  function roundOf(p) {
    var sn = SUNNAH[p.id],
      t = T().target;
    if (sn && sn.goal) return t && (sn.goal % t === 0 || t % sn.goal === 0) ? t : sn.goal;
    return t || (sn && sn.after) || 33;
  }
  A.trkPhrase = function () {
    var l = phrases();
    for (var i = 0; i < l.length; i++) if (l[i].id === T().cur) return l[i];
    return l[0];
  };
  function view() {
    var t = T().target,
      live = T().live || 0;
    return { c: t ? (live === 0 ? 0 : ((live - 1) % t) + 1) : live, laps: t ? Math.floor(live / t) : 0, t: t };
  }
  /* tick dial: one tick per count up to 100, otherwise 60 ticks showing the lap fraction */
  function dial(t, c) {
    var N = t && t <= 100 ? t : 60,
      lit = t && t <= 100 ? c : Math.round((t ? c / t : (c % 100) / 100) * 60);
    var R1 = 44.5,
      R2 = N > 60 ? 48 : 48.5,
      w = N > 60 ? 1.1 : N > 40 ? 1.6 : 2.2,
      s = '';
    for (var i = 0; i < N; i++) {
      var a = -Math.PI / 2 + (i * 2 * Math.PI) / N,
        x1 = 50 + R1 * Math.cos(a),
        y1 = 50 + R1 * Math.sin(a),
        x2 = 50 + R2 * Math.cos(a),
        y2 = 50 + R2 * Math.sin(a);
      s +=
        '<line class="tk' +
        (i < lit - 1 ? ' on' : i === lit - 1 ? ' on cur' : '') +
        '" x1="' +
        x1.toFixed(2) +
        '" y1="' +
        y1.toFixed(2) +
        '" x2="' +
        x2.toFixed(2) +
        '" y2="' +
        y2.toFixed(2) +
        '" stroke-width="' +
        w +
        '"/>';
    }
    var r = 41.5,
      circ = 2 * Math.PI * r,
      f = N ? lit / N : 0;
    s += '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--line)" stroke-width=".8"/>';
    s +=
      '<circle class="arcp" cx="50" cy="50" r="' +
      r +
      '" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="' +
      circ.toFixed(2) +
      '" stroke-dashoffset="' +
      (circ * (1 - f)).toFixed(2) +
      '" transform="rotate(-90 50 50)"/>';
    return (
      '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="trkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--gold3)"/><stop offset="1" stop-color="var(--gold2)"/></linearGradient></defs>' +
      s +
      '</svg>'
    );
  }
  function paint(el) {
    var v = view(),
      p = A.trkPhrase(),
      k = A.today(),
      today = T().days[k] || 0;
    if (!$('[data-dial]', el)) return;
    $('[data-dial]', el).innerHTML = dial(v.t, v.c);
    $('[data-c]', el).textContent = A.fmtN(v.c);
    $('[data-of]', el).textContent = v.t ? 'of ' + A.fmtN(v.t) : 'count';
    var lp = $('[data-lap]', el);
    lp.textContent = v.laps ? '× ' + v.laps : '';
    lp.style.display = v.laps ? '' : 'none';
    var td = $('[data-today]', el);
    if (td) td.textContent = A.fmtN(today);
    var tp = $('[data-tp]', el);
    if (tp) tp.textContent = A.fmtN(todayOf(p.id));
    $('[data-all]', el).textContent = A.fmtN(T().total || 0);
    $('[data-this]', el).textContent = A.fmtN((T().per || {})[p.id] || 0);
    $('[data-dialbtn]', el).setAttribute('aria-label', 'Count. ' + v.c + (v.t ? ' of ' + v.t : ''));
  }
  function click() {
    A.fx.click();
  }
  /* close the running session into the history log */
  function logSession() {
    var tr = T();
    if (!tr.live) return;
    tr.log = (tr.log || []).concat([{ t: Date.now(), id: tr.cur, n: tr.live }]).slice(-200);
  }
  /* count n of a phrase on a day: the day, the phrase, the phrase on that day, all time */
  function credit(id, n, k) {
    var tr = T(),
      p = byId(id),
      sn = SUNNAH[id],
      today = k === A.today(),
      before = today ? todayOf(id) : 0;
    tr.total = (tr.total || 0) + n;
    tr.days[k] = (tr.days[k] || 0) + n;
    tr.per = tr.per || {};
    tr.per[id] = (tr.per[id] || 0) + n;
    tr.pd = tr.pd || {};
    var d = (tr.pd[k] = tr.pd[k] || {});
    d[id] = (d[id] || 0) + n;
    /* keep sixty days of the per-phrase record */
    var keys = Object.keys(tr.pd);
    if (keys.length > 60)
      keys
        .sort()
        .slice(0, keys.length - 60)
        .forEach(function (x) {
          delete tr.pd[x];
        });
    if (today && p && sn && sn.goal && before < sn.goal && d[id] >= sn.goal) {
      A.toast(p.tr + ': a hundred today. Mā shāʾ Allāh', 'trophy');
      A.N.haptic('success');
    }
  }
  function add(n, quiet) {
    var tr = T(),
      p = A.trkPhrase();
    if (!quiet) tr.live = (tr.live || 0) + n;
    credit(p.id, n, A.today());
    A.save();
    if (quiet) return;
    var v = view(),
      el = $('#app'),
      lap = v.t && tr.live % v.t === 0;
    A.N.haptic(lap ? 'heavy' : 'tick');
    if (lap) A.fx.done();
    else click();
    if (lap) {
      var f = $('.dial .flash', el);
      if (f) {
        f.classList.remove('go');
        void f.offsetWidth;
        f.classList.add('go');
      }
    }
    if ($('[data-dial]', el)) paint(el);
  }
  /* what the home-screen widget did while the app was closed: taps continue the same round as the app, a reset
     closes it, and a round finished on the fingers is logged as a session. Each event names its phrase and day. */
  A.trkWidget = function (ev) {
    var tr = T(),
      k = A.today(),
      got = 0;
    (ev || []).forEach(function (e) {
      if (!e) return;
      if (e.k === 'reset') {
        logSession();
        tr.live = 0;
        return;
      }
      var n = Math.max(0, Math.min(10000, Math.round(+e.n || 0)));
      if (!n || !byId(e.id)) return;
      credit(e.id, n, /^\d{4}-\d\d-\d\d$/.test(e.d || '') ? e.d : k);
      if (e.k === 'tap') {
        if (e.id === tr.cur) tr.live = (tr.live || 0) + n;
      } else tr.log = (tr.log || []).concat([{ t: +e.t || Date.now(), id: e.id, n: n }]).slice(-200);
      got += n;
    });
    A.save();
    if (got) A.toast('+' + A.fmtN(got) + ' from your widget', 'widget');
    return got;
  };
  /* what the widget needs to show the same tracker as the app */
  A.trkSync = function () {
    var p = A.trkPhrase(),
      tr = T(),
      sn = SUNNAH[p.id] || {};
    return {
      id: p.id,
      ar: p.ar || '',
      tr: p.tr,
      target: tr.target || 0,
      round: roundOf(p),
      live: tr.live || 0,
      day: A.today(),
      today: todayOf(p.id),
      goal: sn.goal || 0,
      after: sn.after || 0,
      fingers: A.pace.on(),
      goals: Object.keys(SUNNAH)
        .filter(function (id) {
          return SUNNAH[id].goal && byId(id);
        })
        .map(function (id) {
          var x = byId(id);
          return { id: id, tr: x.tr, ar: x.ar || '', n: todayOf(id), g: SUNNAH[id].goal };
        })
    };
  };
  A.trkVolume = function () {
    var c = A.cur();
    if (!A.pace.on() && c && c.key && c.key.indexOf('tracker') === 0) {
      add(1);
      return true;
    }
    return false;
  };

  function recent() {
    var log = (T().log || []).slice(-4).reverse(),
      names = {};
    phrases().forEach(function (p) {
      names[p.id] = p.tr;
    });
    if (!log.length) return '';
    return (
      '<div class="sec"><h2>Recent sessions</h2></div><div class="card pad0"><div class="list">' +
      log
        .map(function (s) {
          var d = new Date(s.t),
            k = A.keyAt(s.t),
            when = (k === A.today() ? 'Today' : A.fmtDate(k, 'short')) + ' · ' + A.fmtTxt(s.t);
          void d;
          return (
            '<div class="li"><span class="badge s h-teal">' +
            ic('tracker', 's') +
            '</span><div class="grow"><div class="t clamp1">' +
            esc(names[s.id] || 'Custom') +
            '</div><div class="s">' +
            esc(when) +
            '</div></div><span class="x num">' +
            A.fmtN(s.n) +
            '</span></div>'
          );
        })
        .join('') +
      '</div></div>'
    );
  }

  A.V.tasbih = function () {
    return { redirect: '#/tracker' };
  };
  /* #/tracker/<phrase> (from a widget) opens the tracker on that phrase */
  function pick(id) {
    var tr = T();
    if (tr.cur === id || !byId(id)) return false;
    logSession();
    tr.cur = id;
    tr.live = 0;
    var p = A.trkPhrase(),
      sn = SUNNAH[p.id];
    if (sn && sn.goal) tr.target = sn.goal;
    else if (sn && sn.after) tr.target = sn.after;
    else if (p.n && TARGETS.indexOf(p.n) >= 0) tr.target = p.n;
    A.save();
    return true;
  }
  A.V.tracker = function (a) {
    if (a && a[0]) {
      pick(a[0]);
      return { redirect: '#/tracker' };
    }
    var fingers = A.pace.on();
    if (A.N.has && S.prefs.volKeys && !fingers) A.hint('tracker', 'The volume keys count too', 'tracker');
    var p = A.trkPhrase(),
      tr = T(),
      sn = SUNNAH[p.id],
      round = roundOf(p),
      td = todayOf(p.id);
    var h =
      '<header class="top"><div class="tt"><div class="eyebrow">Remembrance through the day</div><h1>Tracker</h1></div><div class="acts"><button type="button" class="ib" data-a="trk-stats" aria-label="Tracker history">' +
      ic('insights', 's') +
      '</button></div></header>';
    h += '<div class="trk">';
    h +=
      '<div class="trk-chips" role="group" aria-label="Phrase">' +
      phrases()
        .map(function (x) {
          var g = SUNNAH[x.id] && SUNNAH[x.id].goal,
            met = g && todayOf(x.id) >= g;
          return (
            '<button type="button" class="chip' +
            (x.id === tr.cur ? ' on' : '') +
            (met ? ' met' : '') +
            '" data-a="trk-pick" data-id="' +
            esc(x.id) +
            '" aria-pressed="' +
            (x.id === tr.cur) +
            '">' +
            (met ? ic('check', 'xs') : '') +
            esc(x.tr) +
            '</button>'
          );
        })
        .join('') +
      '<button type="button" class="chip" data-a="trk-custom" aria-label="Your own phrase">' +
      ic('plus', 'xs') +
      '</button></div>';
    h +=
      '<div class="trk-phrase">' +
      (p.ar ? '<div class="ar" lang="ar">' + esc(p.ar) + '</div>' : '') +
      '<div class="tr">' +
      esc(p.en || p.tr) +
      '</div>' +
      '<div class="trk-sn">' +
      (sn
        ? '<span class="lp-tag ' +
          (sn.goal ? 'k-r' : 'k-s') +
          '">' +
          (sn.goal
            ? A.T('Sunnah') + ' · ' + A.fmtN(sn.goal) + ' ' + A.T('a day')
            : sn.after
              ? A.T('After each prayer') + ' · ' + A.fmtN(sn.after)
              : A.T('No set number')) +
          '</span><button type="button" class="linkbtn" data-a="trk-why" data-k="' +
          sn.key +
          '">' +
          esc(sn.d) +
          ' ' +
          ic('info', 'xs') +
          '</button>'
        : '<span class="lp-tag k-s">' + A.T('No set number') + '</span>') +
      '</div></div>';
    if (fingers) {
      h +=
        '<div class="trk-pace">' +
        A.pace.button(
          { lt: p.lt || (p.ar ? p.ar.replace(/[^ء-ي]/g, '').length : 12), ar: p.ar, uid: 'trk:' + p.id },
          round,
          false,
          'big'
        ) +
        '</div>';
      h +=
        '<div class="trk-tools"><button type="button" class="chip on" data-a="trk-target" style="min-height:44px;padding:0 16px;font-size:13px">' +
        ic('target', 'xs') +
        A.T('Round') +
        ' ' +
        A.fmtN(round) +
        '</button></div>';
      h += S.hints.countTut
        ? '<p class="faint small trk-how">' +
          A.T('Count on your right hand; the circle keeps the pace.') +
          ' <button type="button" class="linkbtn" data-a="count-tour">' +
          A.T('How it works') +
          '</button></p>'
        : '<button type="button" class="ct-banner" data-a="count-tour"><span class="badge s">' +
          ic('hands', 's') +
          '</span><span class="grow"><b>' +
          A.T('New to counting on your fingers?') +
          '</b><span>' +
          A.T('A short practice, under a minute') +
          '</span></span>' +
          ic('right', 's') +
          '</button>';
    } else {
      h +=
        '<div class="dial" data-a="trk-tap" data-dialbtn role="button" tabindex="0"><div data-dial></div><div class="core"><div class="c num" data-c>0</div><div class="of" data-of></div><div class="lap" data-lap></div></div><i class="flash"></i></div>';
      h +=
        '<div class="trk-tools"><button type="button" class="ib" data-a="trk-reset" aria-label="Finish and reset">' +
        ic('reset', 's') +
        '</button><button type="button" class="chip on" data-a="trk-target" style="min-height:48px;padding:0 18px;font-size:13px">' +
        ic('target', 'xs') +
        (tr.target ? A.T('Target') + ' ' + A.fmtN(tr.target) : A.T('No target')) +
        '</button>' +
        '<button type="button" class="ib' +
        (S.prefs.sound ? ' on' : '') +
        '" data-a="trk-sound" aria-pressed="' +
        !!S.prefs.sound +
        '" aria-label="Sound">' +
        ic('vol', 's') +
        '</button>' +
        (A.N.has
          ? '<button type="button" class="ib' +
            (S.prefs.volKeys ? ' on' : '') +
            '" data-a="trk-vol" aria-pressed="' +
            !!S.prefs.volKeys +
            '" aria-label="Volume keys">' +
            ic('vib', 's') +
            '</button>'
          : '') +
        '</div>';
    }
    h += '</div>';
    /* today: the numbers the Sunnah sets, each on its own, and the day's total as a figure */
    var goals = Object.keys(SUNNAH).filter(function (id) {
      return (
        SUNNAH[id].goal &&
        phrases().some(function (x) {
          return x.id === id;
        })
      );
    });
    var names = {};
    phrases().forEach(function (x) {
      names[x.id] = x.tr;
    });
    h +=
      '<div class="sec"><h2>Today</h2><span class="aside">' +
      A.fmtN(T().days[A.today()] || 0) +
      ' ' +
      A.T('in all') +
      '</span></div><div class="card pad0 trk-day">' +
      goals
        .map(function (id) {
          var n = todayOf(id),
            g = SUNNAH[id].goal,
            f = Math.min(1, n / g);
          return (
            '<button type="button" class="set trk-goal' +
            (n >= g ? ' met' : '') +
            (id === tr.cur ? ' cur' : '') +
            '" data-a="trk-pick" data-id="' +
            id +
            '"><span class="trk-gr" style="--f:' +
            f.toFixed(3) +
            '">' +
            (n >= g ? ic('check', 'xs') : '') +
            '</span><div class="grow"><div class="t">' +
            esc(names[id]) +
            '</div><div class="s">' +
            A.fmtN(Math.min(n, g)) +
            ' ' +
            A.T('of') +
            ' ' +
            A.fmtN(g) +
            (n > g ? ' · +' + A.fmtN(n - g) : '') +
            '</div></div><span class="faint">' +
            ic('right', 's') +
            '</span></button>'
          );
        })
        .join('') +
      '<div class="set trk-this"><div class="grow"><div class="t">' +
      esc(p.tr) +
      '</div><div class="s">' +
      A.T('This phrase today') +
      '</div></div><b class="num" data-tp>' +
      A.fmtN(td) +
      '</b></div></div>';
    h +=
      '<div class="grid2"><div class="card stat h-teal">' +
      ic('tracker', 's') +
      '<div class="v" data-this>0</div><div class="k">This phrase, all time</div></div><div class="card stat h-gold">' +
      ic('star', 's') +
      '<div class="v" data-all>0</div><div class="k">All phrases, all time</div></div></div>';
    h +=
      '<div class="card col hd-card">' +
      A.saidFold('abudawud:1502', '') +
      '<div class="refs"><a href="https://sunnah.com/abudawud:1502" data-a="ext">' +
      ic('link', 'xs') +
      'Abū Dāwūd 1502 · ' +
      esc(A.grade('abudawud:1502')) +
      '</a></div></div>';
    h += recent();
    if (A.N.has)
      h +=
        '<button type="button" class="card coll press h-teal" data-a="pin-widget" data-w="tasbih"><div class="badge">' +
        ic('widget') +
        '</div><div class="grow"><div class="t">Add the tracker widget</div><div class="s">' +
        (fingers ? 'Your Sunnah numbers for today, on your home screen' : 'Count straight from your home screen') +
        '</div></div>' +
        ic('right', 's') +
        '</button>';
    return {
      html: h,
      title: 'Tracker',
      tab: 2,
      mount: function (el) {
        paint(el);
        var pb = $('.trk-pace .pace', el);
        if (pb) {
          A.pace.bind(pb, {
            it: { lt: p.lt || (p.ar ? p.ar.replace(/[^ء-ي]/g, '').length : 12), ar: p.ar, uid: 'trk:' + p.id },
            n: round,
            onDone: function () {
              var t2 = T();
              logSession();
              t2.live = round;
              add(round, true);
              logSession();
              t2.live = 0;
              A.save();
              A.fx.done();
              A.toast(A.fmtN(round) + ' · ' + p.tr, 'check');
              A.rerender();
            }
          });
          A.pace.longPress(pb);
          A.knob(pb);
        } else {
          var dl = $('.dial', el);
          if (dl) A.knob(dl);
          if (S.prefs.volKeys) A.N.volumeKeys(true);
        }
        if (S.prefs.wake) A.N.keepAwake(true);
      },
      unmount: function () {
        A.pace.stop();
        A.N.volumeKeys(false);
        A.N.keepAwake(false);
      }
    };
  };
  A.acts['trk-why'] = function (el) {
    var k = el.dataset.k,
      hd = window.HADITH[k];
    if (!hd) return;
    A.sheet(
      'The evidence',
      A.said(k, '', true) +
        '<div class="refs" style="margin-top:12px"><a href="https://sunnah.com/' +
        k +
        '" data-a="ext">' +
        ic('link', 'xs') +
        esc(A.refLabel(k)) +
        (hd.g ? ' · ' + esc(hd.g) : '') +
        '</a></div>'
    );
  };
  A.acts['trk-tap'] = function () {
    add(1);
  };
  A.acts['trk-pick'] = function (el) {
    if (pick(el.dataset.id)) {
      A.N.haptic('click');
      A.rerender();
    }
  };
  A.acts['trk-reset'] = function () {
    var tr = T();
    if (!tr.live) return;
    logSession();
    tr.live = 0;
    A.save();
    A.N.haptic('click');
    A.rerender();
    A.toast('Session saved, counter reset');
  };
  A.acts['trk-sound'] = function (el) {
    S.prefs.sound = !S.prefs.sound;
    A.save();
    el.classList.toggle('on', S.prefs.sound);
    el.setAttribute('aria-pressed', S.prefs.sound);
    if (S.prefs.sound) click();
  };
  A.acts['trk-vol'] = function (el) {
    S.prefs.volKeys = !S.prefs.volKeys;
    A.save();
    el.classList.toggle('on', S.prefs.volKeys);
    el.setAttribute('aria-pressed', S.prefs.volKeys);
    A.N.volumeKeys(S.prefs.volKeys);
    A.toast(S.prefs.volKeys ? 'Volume keys now count' : 'Volume keys released');
  };
  A.acts['trk-target'] = function () {
    A.options(
      'Target',
      TARGETS.map(function (t) {
        return {
          v: t,
          t: t ? 'Count to ' + A.fmtN(t) : 'No target',
          s: t === 33 ? 'After-prayer remembrance' : t === 100 ? 'A hundred times' : t === 0 ? 'Free counting' : ''
        };
      }),
      T().target,
      function (v) {
        var tr = T();
        logSession();
        tr.target = +v;
        tr.live = 0;
        A.save();
        A.rerender();
      }
    );
  };
  A.acts['trk-custom'] = function () {
    var tr = T();
    A.sheet(
      'Your own phrase',
      '<div class="field"><label for="cTr">Name or transliteration</label><input class="input" id="cTr" maxlength="60" placeholder="e.g. Yā Ḥayyu yā Qayyūm"></div><div class="field"><label for="cAr">Arabic (optional)</label><input class="input ar" id="cAr" maxlength="200" dir="rtl" lang="ar"></div><div class="field"><label for="cEn">Meaning (optional)</label><input class="input" id="cEn" maxlength="120"></div><button type="button" class="btn pri wide" id="cOk">Add phrase</button>' +
        ((tr.custom || []).length
          ? '<div class="divider"></div><div class="eyebrow">Your phrases</div>' +
            tr.custom
              .map(function (c) {
                return (
                  '<div class="set" style="padding:8px 0"><div class="grow"><div class="t">' +
                  esc(c.tr) +
                  '</div></div><button type="button" class="ib ghost" data-del="' +
                  esc(c.id) +
                  '" aria-label="Delete ' +
                  esc(c.tr) +
                  '">' +
                  ic('trash', 's') +
                  '</button></div>'
                );
              })
              .join('')
          : ''),
      {
        mount: function (el, o) {
          $('#cOk', el).addEventListener('click', function () {
            var trn = $('#cTr', el).value.trim();
            if (!trn) {
              $('#cTr', el).focus();
              return;
            }
            var id = 'c' + Date.now().toString(36);
            logSession();
            tr.custom = (tr.custom || []).concat([
              { id: id, tr: trn, ar: $('#cAr', el).value.trim(), en: $('#cEn', el).value.trim(), n: 0 }
            ]);
            tr.cur = id;
            tr.live = 0;
            A.save();
            o.close();
            A.rerender();
          });
          el.addEventListener('click', function (e) {
            var b = e.target.closest('[data-del]');
            if (!b) return;
            tr.custom = tr.custom.filter(function (c) {
              return c.id !== b.dataset.del;
            });
            if (tr.cur === b.dataset.del) tr.cur = 'subhanallah';
            A.save();
            o.close();
            A.rerender();
          });
        }
      }
    );
  };
  A.acts['trk-stats'] = function () {
    A.go('#/insights/tracker');
  };
  A.acts['pin-widget'] = function (el) {
    if (!A.N.pinWidget(el.dataset.w)) A.toast('Long-press your home screen → Widgets → Adhkār');
  };
})();
