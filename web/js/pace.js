/* Counting on the fingers. The Prophet ﷺ counted tasbīḥ on the fingers of his right hand (Abū Dāwūd 1502), so
   by default the app does not count for you: it keeps a natural pace while you count on your own fingers, then
   asks you to confirm before it moves on.
   Tap the circle as you finish each one and it moves on at once; your own speed is learnt and kept for that dhikr.
   Hold it to pause; when you resume, the pace returns to normal. The pace comes from each dhikr's length. Letters spoken (data.js `lt`) become time with a rate calibrated from 104
   measured recordings (about 4.8 letters a second at the reciters' teaching pace); your own pace is a multiple of
   that, chosen in Reading settings. The Qurʾān is given more time for its elongations (madd). */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    $ = A.$,
    esc = A.esc,
    ic = A.icon;
  var RATE = { calm: 5.5, steady: 7.5, brisk: 10 }; /* letters a second, by the reader's chosen pace */
  var GAP = 320,
    MIN = 650,
    QURAN = 0.72; /* a breath between repetitions; never quicker than this */
  /* where the text has a measured recording, your pace is held to a share of the reciter's own time, so a passage
     the recording takes 52 s over is never given 24 s */
  var OF_REC = { calm: 0.9, steady: 0.72, brisk: 0.56 };

  var P = (A.pace = {
    on: function () {
      return S.prefs.count !== 'tap';
    },
    /* milliseconds for one recitation of an item */
    rep: function (it) {
      /* once you have shown your own pace for this dhikr, that is used */
      if (it.ms) return it.ms; /* a fixed pace (the counting tour) */
      var own = it.uid && S.paceMs && S.paceMs[it.uid];
      if (own) return Math.max(MIN, own);
      var lt = it.lt || (it.ar ? it.ar.replace(/[^ء-ي]/g, '').length : 12),
        r = RATE[S.prefs.pace] || RATE.steady;
      var est = Math.round((lt / (r * (it.quran ? QURAN : 1))) * 1000) + GAP;
      if (it.rd) est = Math.max(est, Math.round(it.rd * 1000 * (OF_REC[S.prefs.pace] || OF_REC.steady)) + GAP);
      return Math.max(MIN, est);
    },
    total: function (it, n) {
      return P.rep(it) * Math.max(1, n || 1);
    },
    label: function (ms) {
      var s = Math.round(ms / 1000),
        ar = A.ar && A.ar();
      return '≈ ' + (s < 60 ? A.fmtN(s) + (ar ? ' ث' : ' s') : A.fmtN(Math.round(s / 60)) + (ar ? ' د' : ' min'));
    }
  });

  /* ---------- one running guide at a time ---------- */
  /* one running guide at a time: { el, it, n, ms, done, repStart, paused, pausedAt, taps: [ms of counts you finished yourself] } */
  var run = null;
  P.stop = function () {
    if (run && run.raf) cancelAnimationFrame(run.raf);
    run = null;
  };
  /* end the running guide after k more counts (the tour uses it to reach the confirmation) */
  P.wrap = function (k) {
    if (run && !run.paused) run.n = Math.min(run.n, run.done + Math.max(1, k));
  };
  function emit(type, k) {
    var o = run && run.el._pace;
    if (o && o.onEvent)
      try {
        o.onEvent(type, k);
      } catch (e) {}
  }

  /* the ring: one mark per repetition (up to 100), filling at the pace */
  function ring(n) {
    var N = Math.min(n, 100),
      R = 57,
      s = '';
    if (N > 1)
      for (var q = 0; q < N; q++) {
        var a = (q * 2 * Math.PI) / N - Math.PI / 2,
          r1 = 60.2,
          r2 = N > 40 ? 62.6 : 63.6;
        s +=
          '<line class="tick" data-q="' +
          q +
          '" x1="' +
          (62 + r1 * Math.cos(a)).toFixed(2) +
          '" y1="' +
          (62 + r1 * Math.sin(a)).toFixed(2) +
          '" x2="' +
          (62 + r2 * Math.cos(a)).toFixed(2) +
          '" y2="' +
          (62 + r2 * Math.sin(a)).toFixed(2) +
          '"/>';
      }
    var c = 2 * Math.PI * R;
    return (
      '<svg viewBox="0 0 124 124" aria-hidden="true">' +
      s +
      '<circle class="tr" cx="62" cy="62" r="' +
      R +
      '" fill="none" stroke-width="2"/><circle class="pr" cx="62" cy="62" r="' +
      R +
      '" fill="none" stroke-width="3" stroke-linecap="round" stroke-dasharray="' +
      c.toFixed(2) +
      '" stroke-dashoffset="' +
      c.toFixed(2) +
      '" transform="rotate(-90 62 62)"/><circle class="rep" cx="62" cy="62" r="49" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="' +
      (2 * Math.PI * 49).toFixed(2) +
      '" stroke-dashoffset="' +
      (2 * Math.PI * 49).toFixed(2) +
      '" transform="rotate(-90 62 62)"/></svg>'
    );
  }
  /* the button that stands where a counter would: idle, running, paused, then waiting for your confirmation */
  P.button = function (it, n, done, extraCls) {
    var ms = P.total(it, n);
    return (
      '<button type="button" class="counter pace' +
      (done ? ' done' : '') +
      (extraCls ? ' ' + extraCls : '') +
      '" data-a="pace-tap" data-state="' +
      (done ? 'done' : 'idle') +
      '" aria-label="' +
      (done ? 'Done' : 'Begin counting on your fingers') +
      '"><i class="halo" aria-hidden="true"></i>' +
      ring(n) +
      '<span class="face">' +
      (done
        ? '<span class="pc-ic">' + ic('check') + '</span><span class="of">' + esc(A.T('Done')) + '</span>'
        : '<span class="c num" data-pc>' +
          (n > 1 ? '×' + A.fmtN(n) : ic('play')) +
          '</span><span class="of" data-pl>' +
          esc(P.label(ms)) +
          '</span>') +
      '</span><i class="rip"></i><span class="sr" aria-live="polite" data-say></span></button>'
    );
  };
  /* bind a pace button: opts = { it, n, onDone(), onUndo(), onStart() } */
  P.bind = function (el, opts) {
    if (el) el._pace = opts;
  };

  function lightTicks(el, k, n) {
    var lim = n > 100 ? Math.floor((k * 100) / n) : k;
    A.$$('.tick', el).forEach(function (t) {
      var q = +t.dataset.q;
      t.classList.toggle('on', q < lim);
      t.classList.toggle('just', q === lim - 1);
    });
  }
  /* each count lands with a beat: the ring breathes, the number rolls, a soft tick under the finger */
  /* spoken feedback for a screen reader: only real changes, never the label that is redrawn every frame */
  function say(el, text) {
    var s = el.querySelector('[data-say]');
    if (s) s.textContent = text;
  }
  function beat(el, k) {
    el.classList.remove('beat');
    void el.offsetWidth;
    el.classList.add('beat');
    var r = el.querySelector('.rip');
    if (r) {
      r.classList.remove('go');
      void r.offsetWidth;
      r.classList.add('go');
    }
    var pc = el.querySelector('[data-pc]');
    if (pc) {
      pc.textContent = A.fmtN(Math.min(run.n, k + 1));
      pc.classList.remove('roll');
      void pc.offsetWidth;
      pc.classList.add('roll');
    }
    A.N.haptic('tick');
    say(el, A.fmtN(Math.min(run.n, k + 1)) + (run.n > 1 ? ' ' + A.T('of') + ' ' + A.fmtN(run.n) : ''));
    emit('count', k);
  }
  function ask(el) {
    el.dataset.state = 'confirm';
    el.classList.remove('running', 'paused');
    el.classList.add('ask');
    el.querySelector('.face').innerHTML =
      '<span class="pc-ic">' + ic('check') + '</span><span class="of">' + esc(A.T('Tap when done')) + '</span>';
    el.setAttribute('aria-label', 'Confirm you have finished');
    el.insertAdjacentHTML(
      'beforeend',
      '<span class="sr" aria-live="assertive">' + esc(A.T('Tap when done')) + '</span>'
    );
    var rp = el.querySelector('.rep');
    if (rp) rp.style.strokeDashoffset = 0;
    A.N.haptic('click');
    if (run) {
      run.raf = null;
      emit('ask');
    }
  }
  function frame() {
    if (!run || !run.el.isConnected) {
      P.stop();
      return;
    }
    var el = run.el,
      now = Date.now(),
      e = (run.paused ? run.pausedAt : now) - run.repStart;
    /* the guide moves on by itself at the pace; a tap moves it on sooner */
    if (!run.paused && e >= run.ms) {
      run.done++;
      run.repStart += run.ms;
      e = now - run.repStart;
      if (run.done < run.n) beat(el, run.done);
    }
    if (run.done >= run.n) {
      lightTicks(el, run.n, run.n);
      var p0 = el.querySelector('.pr');
      if (p0) p0.style.strokeDashoffset = 0;
      ask(el);
      return;
    }
    var within = Math.min(1, Math.max(0, e / run.ms)),
      f = (run.done + within) / run.n,
      c = 2 * Math.PI * 57,
      cr = 2 * Math.PI * 49;
    var pr = el.querySelector('.pr');
    if (pr) pr.style.strokeDashoffset = (c * (1 - f)).toFixed(2);
    var rp = el.querySelector('.rep');
    if (rp) rp.style.strokeDashoffset = (cr * (1 - within)).toFixed(2);
    if (run.lit !== run.done) {
      lightTicks(el, run.done, run.n);
      run.lit = run.done;
    }
    /* the label says when the pace is following your quicker taps, and when it has gone back to normal */
    var pl = el.querySelector('[data-pl]'),
      note = run.note && now < run.note.until ? run.note.t : '',
      quick = run.ms < run.base * 0.92;
    if (pl)
      pl.textContent = run.paused
        ? A.T('Paused · hold to resume')
        : note ||
          (run.n > 1 ? A.T('of') + ' ' + A.fmtN(run.n) : A.T('Reciting')) +
            (quick && !note ? ' · ' + A.T('your pace') : '');
    el.classList.toggle('quick', quick && !run.paused);
    run.raf = requestAnimationFrame(frame);
  }
  /* you finished this one: count it and begin the next; the pace learns from you */
  function advance() {
    var now = Date.now(),
      e = now - run.repStart;
    if (e > 250) {
      run.taps.push(e);
      if (e < run.ms) run.ms = Math.max(MIN, Math.round(run.ms * 0.55 + e * 0.45));
    }
    run.done++;
    run.repStart = now;
    emit('advance', run.done);
    if (run.done >= run.n) {
      frame();
      return;
    }
    beat(run.el, run.done);
  }
  function remember() {
    if (!run || !run.it || !run.it.uid || run.taps.length < 2) return;
    var t = run.taps.slice().sort(function (a, b) {
        return a - b;
      }),
      mid = t[Math.floor(t.length / 2)];
    S.paceMs = S.paceMs || {};
    S.paceMs[run.it.uid] = Math.max(MIN, Math.round(mid));
    var keys = Object.keys(S.paceMs);
    if (keys.length > 300) delete S.paceMs[keys[0]];
  }
  A.acts['pace-tap'] = function (el) {
    var o = el._pace;
    if (!o) return;
    if (el._held) {
      el._held = false;
      return;
    }
    var st = el.dataset.state;
    if (st === 'done') return o.onUndo && o.onUndo();
    if (st === 'confirm') {
      remember();
      P.stop();
      A.N.haptic('success');
      o.onDone();
      return;
    }
    if (st === 'idle') {
      P.stop();
      var now = Date.now();
      var base = P.rep(o.it);
      run = {
        el: el,
        it: o.it,
        n: Math.max(1, o.n),
        ms: base,
        base: base,
        done: 0,
        repStart: now,
        paused: false,
        lit: null,
        taps: []
      };
      el.dataset.state = 'run';
      el.classList.add('running');
      var pc = el.querySelector('[data-pc]');
      if (pc) pc.textContent = A.fmtN(1);
      A.N.haptic('tick');
      if (o.onStart) o.onStart();
      if (!o.it.ms && !S.hints.countTut)
        A.hint('pace-tap', A.T('Tap the circle as you finish each one to move ahead. Hold it to pause.'), 'hands');
      run.raf = requestAnimationFrame(frame);
      return;
    }
    if (!run || run.el !== el) return;
    if (st === 'run') advance();
    else if (st === 'paused') resume(el);
  };
  function pause(el) {
    run.paused = true;
    run.pausedAt = Date.now();
    el.dataset.state = 'paused';
    el.classList.add('paused');
    A.N.haptic('click');
    say(el, A.T('Paused'));
    emit('pause');
  }
  /* after a pause you begin again at the normal pace: the speed your taps had built up is let go, and only what
     you tap from here on teaches the pace. The current count starts afresh. */
  function resume(el) {
    var was = run.ms;
    run.repStart = Date.now();
    run.paused = false;
    run.ms = run.base;
    run.taps = [];
    if (was < run.base * 0.92) run.note = { t: A.T('Normal pace'), until: Date.now() + 1800 };
    el.dataset.state = 'run';
    el.classList.remove('paused');
    A.N.haptic('tick');
    say(el, A.T('Normal pace'));
    emit('resume');
  }
  /* a hold: pause, or resume at the normal pace; true when it did something */
  P.hold = function (el) {
    if (!run || run.el !== el) return false;
    var st = el.dataset.state;
    if (st === 'run') {
      pause(el);
      return true;
    }
    if (st === 'paused') {
      resume(el);
      return true;
    }
    return false;
  };
  P.speed = function () {
    return run ? { ms: run.ms, base: run.base } : null;
  };
  /* hold the circle to pause and resume; a tap only ever moves you forward */
  P.longPress = function (el) {
    if (!el) return;
    var t = null;
    /* a new press clears the last hold: after a long press the system often sends no click, which would
       otherwise leave the next tap swallowed */
    var down = function () {
      el._held = false;
      t = setTimeout(function () {
        t = null;
        if (P.hold(el)) el._held = true;
      }, 480);
    };
    var up = function () {
      if (t) {
        clearTimeout(t);
        t = null;
      }
    };
    el.addEventListener('pointerdown', down);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      el.addEventListener(ev, up);
    });
    el.addEventListener(
      'click',
      function (e) {
        if (el._held) {
          el._held = false;
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      },
      true
    );
  };
  /* the choice, in Reading settings and the reader's sheet */
  A.countingRows = function () {
    var seg = function (act, cur, opts) {
      return (
        '<div class="seg sm">' +
        opts
          .map(function (o) {
            return (
              '<button type="button" data-a="' +
              act +
              '" data-v="' +
              o[0] +
              '" aria-pressed="' +
              (cur === o[0]) +
              '">' +
              o[1] +
              '</button>'
            );
          })
          .join('') +
        '</div>'
      );
    };
    var h =
      '<div class="set"><div class="grow"><div class="t">Counting</div><div class="s">' +
      (P.on() ? 'On your fingers, as the Sunnah teaches; the app keeps the pace' : 'Tap to count each one') +
      '</div></div><div class="ctl">' +
      seg('count-mode', S.prefs.count === 'tap' ? 'tap' : 'fingers', [
        ['fingers', 'Fingers'],
        ['tap', 'Tap']
      ]) +
      '</div></div>';
    if (P.on())
      h +=
        '<div class="set"><div class="grow"><div class="t">Pace</div><div class="s">How long each recitation takes</div></div><div class="ctl">' +
        seg('pace-pick', S.prefs.pace || 'steady', [
          ['calm', 'Calm'],
          ['steady', 'Steady'],
          ['brisk', 'Brisk']
        ]) +
        '</div></div>';
    if (P.on())
      h +=
        '<button type="button" class="set press" data-a="count-tour"><div class="grow"><div class="t">How counting works</div><div class="s">A short practice, under a minute</div></div>' +
        ic('right', 's') +
        '</button>';
    return h;
  };
  A.acts['count-mode'] = function (el) {
    S.prefs.count = el.dataset.v;
    A.save();
    A.N.haptic('tick');
    if (S.prefs.count !== 'tap') A.N.volumeKeys(false);
    A.rerender();
    var s = document.querySelector('.sheet .sh-b [data-a="count-mode"]');
    if (s && A.readingSheet) A.readingSheet();
  };
  A.acts['pace-pick'] = function (el) {
    S.prefs.pace = el.dataset.v;
    A.save();
    A.N.haptic('tick');
    A.$$('[data-a="pace-pick"]').forEach(function (b) {
      b.setAttribute('aria-pressed', b === el);
    });
  };

  /* ---------- the counting tour ----------
     A short practice with the real circle at a quick fixed pace: the right hand, begin, tap to move ahead, hold to
     pause (the pace returns to normal when you resume), confirm at the end. Each step waits for you to do it.
     A small hand beside the circle lights one joint for each count, as you would on your own fingers. */
  /* the right hand, palm towards you: one silhouette, with a pad for each joint (three on each finger, little
     finger to index, then two on the thumb) */
  var FING = [
      [55, 66],
      [85, 36],
      [115, 24],
      [145, 40]
    ],
    W = 26,
    CREASE = 132,
    SPLIT = [0.3, 0.33, 0.37];
  function hand(cls) {
    var body = '',
      pads = '',
      q = 0;
    FING.forEach(function (f) {
      body +=
        '<rect x="' + (f[0] - W / 2) + '" y="' + f[1] + '" width="' + W + '" height="' + (150 - f[1]) + '" rx="13"/>';
      var L = CREASE - f[1],
        y = f[1];
      SPLIT.forEach(function (fr) {
        var h = L * fr;
        pads +=
          '<rect class="sg" style="--i:' +
          q++ +
          '" x="' +
          (f[0] - W / 2 + 3.5) +
          '" y="' +
          (y + 3).toFixed(1) +
          '" width="' +
          (W - 7) +
          '" height="' +
          (h - 4.5).toFixed(1) +
          '" rx="8"/>';
        y += h;
      });
    });
    /* the thumb, from the heel of the palm outwards */
    body += '<rect x="150" y="104" width="28" height="98" rx="14" transform="rotate(32 164 196)"/>';
    pads +=
      '<g transform="rotate(32 164 196)"><rect class="sg" style="--i:' +
      q++ +
      '" x="153.5" y="108" width="21" height="30" rx="9"/><rect class="sg" style="--i:' +
      q++ +
      '" x="153.5" y="141" width="21" height="34" rx="9"/></g>';
    return (
      '<svg class="ct-hand ' +
      (cls || '') +
      '" viewBox="0 0 200 240" aria-hidden="true"><g class="palm">' +
      body +
      '<rect x="42" y="118" width="122" height="112" rx="36"/></g>' +
      pads +
      '</svg>'
    );
  }
  var JOINTS = 14;
  var STEPS = [
    {
      k: 'hand',
      t: 'Count on your right hand',
      s: 'The Prophet ﷺ counted tasbīḥ on the fingers of his right hand. Here the app keeps the pace and never counts for you.'
    },
    {
      k: 'start',
      t: 'Tap the circle to begin',
      s: 'It fills at a natural pace, measured from real recitations. Count along on your fingers.',
      cue: 'tap'
    },
    {
      k: 'tap',
      t: 'Finished one sooner? Tap',
      s: 'It moves straight on and follows your speed. Tap twice to try it.',
      cue: 'tap'
    },
    {
      k: 'hold',
      t: 'Hold to pause',
      s: 'Press and hold the circle. Hold again to carry on, and the pace returns to normal.',
      cue: 'hold'
    },
    {
      k: 'confirm',
      t: 'Tap to confirm at the end',
      s: 'Nothing is recorded until you say you have finished.',
      cue: 'tap'
    },
    { k: 'done', t: 'That is all', s: '' }
  ];
  P.tourHtml = function (compact) {
    return (
      '<div class="ct' +
      (compact ? ' compact' : '') +
      '" data-ct="0"><div class="ct-dots" aria-hidden="true">' +
      STEPS.slice(0, 5)
        .map(function (x, i) {
          return '<i data-i="' + i + '"></i>';
        })
        .join('') +
      '</div>' +
      '<div class="ct-stage"><div class="ct-intro">' +
      hand('loop') +
      '<a class="ct-ref" href="https://sunnah.com/abudawud:1502" data-a="ext">' +
      ic('link', 'xs') +
      'Abū Dāwūd 1502</a></div>' +
      '<div class="ct-demo"><div class="ct-mini">' +
      hand('mini') +
      '<span class="ct-n num" data-ctn>0</span></div><div class="ct-circ">' +
      P.button({ ms: 1700 }, 33, false, 'big') +
      '<i class="ct-cue" aria-hidden="true"><b></b></i></div></div>' +
      '<div class="ct-fin"><div class="ct-fin-ic">' +
      ic('check') +
      '</div><div class="ct-legend">' +
      [
        ['tap', 'Tap', 'Finished one: move on'],
        ['hold', 'Hold', 'Pause, then carry on at the normal pace'],
        ['check', 'Last tap', 'Confirm you are done']
      ]
        .map(function (x, i) {
          return (
            '<div style="--i:' +
            i +
            '"><span class="ct-g ' +
            x[0] +
            '"><i></i></span><div><b>' +
            A.T(x[1]) +
            '</b><span>' +
            A.T(x[2]) +
            '</span></div></div>'
          );
        })
        .join('') +
      '</div></div></div>' +
      '<div class="ct-card" aria-live="polite"><div class="ct-t"></div><div class="ct-s"></div><div class="ct-acts"></div></div></div>'
    );
  };
  P.tourMount = function (root, onFinish, finLabel) {
    var el = root.querySelector('.ct');
    if (!el) return;
    var pb = el.querySelector('.pace'),
      step = 0,
      taps = 0,
      paused = false;
    function show(i) {
      step = i;
      var st = STEPS[i];
      el.dataset.ct = i;
      el.dataset.k = st.k;
      A.$$('.ct-dots i', el).forEach(function (d, j) {
        d.className = j < i ? 'on' : j === i ? 'cur' : '';
      });
      var card = el.querySelector('.ct-card');
      card.classList.remove('in');
      void card.offsetWidth;
      card.classList.add('in');
      el.querySelector('.ct-t').textContent = A.T(st.t);
      el.querySelector('.ct-s').textContent = st.s ? A.T(st.s) : '';
      el.querySelector('.ct-cue').className = 'ct-cue' + (st.cue ? ' ' + st.cue : '');
      var acts = el.querySelector('.ct-acts');
      acts.innerHTML =
        st.k === 'hand'
          ? '<button type="button" class="btn pri sm" data-ct-go>' + A.T('Try it') + ic('right', 's') + '</button>'
          : st.k === 'done'
            ? '<button type="button" class="chip" data-ct-again>' +
              ic('reset', 'xs') +
              A.T('Practise again') +
              '</button>' +
              (onFinish
                ? '<button type="button" class="btn pri sm" data-ct-end>' +
                  A.T(finLabel || 'Start counting') +
                  '</button>'
                : '')
            : '';
      if (st.k === 'confirm') P.wrap(2);
      if (st.k === 'done') {
        S.hints.countTut = 1;
        A.save();
      }
    }
    function lightHand(k) {
      var segs = A.$$('.ct-mini .sg', el),
        n = k % JOINTS;
      segs.forEach(function (s, j) {
        s.classList.toggle('on', j < n || (k > 0 && n === 0));
        s.classList.toggle('just', j === (n + JOINTS - 1) % JOINTS && k > 0);
      });
      var c = el.querySelector('[data-ctn]');
      if (c) c.textContent = A.fmtN(k);
    }
    function reset() {
      P.stop();
      taps = 0;
      paused = false;
      var fresh = document.createElement('div');
      fresh.innerHTML = P.button({ ms: 1700 }, 33, false, 'big');
      pb.replaceWith(fresh.firstChild);
      pb = el.querySelector('.ct-circ .pace');
      bind();
      lightHand(0);
    }
    function bind() {
      P.bind(pb, {
        it: { ms: 1700 },
        n: 33,
        onStart: function () {
          lightHand(1);
          if (STEPS[step].k === 'start')
            setTimeout(function () {
              show(2);
            }, 900);
        },
        onEvent: function (type, k) {
          if (type === 'count' || type === 'advance') lightHand((k || 0) + 1);
          var kk = STEPS[step].k;
          if (type === 'advance' && kk === 'tap' && ++taps >= 2)
            setTimeout(function () {
              show(3);
            }, 500);
          if (type === 'pause' && kk === 'hold') {
            paused = true;
            el.querySelector('.ct-s').textContent = A.T('Paused. Hold again to carry on.');
          }
          if (type === 'resume' && kk === 'hold' && paused)
            setTimeout(function () {
              show(4);
            }, 700);
          if (type === 'ask' && kk !== 'confirm') show(4);
        },
        onDone: function () {
          A.fx.done();
          show(5);
          var f = el.querySelector('.ct-circ .pace');
          if (f) {
            f.dataset.state = 'done';
            f.classList.remove('ask');
            f.classList.add('done');
            f.querySelector('.face').innerHTML =
              '<span class="pc-ic">' + ic('check') + '</span><span class="of">' + esc(A.T('Done')) + '</span>';
          }
        }
      });
      P.longPress(pb);
    }
    bind();
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-ct-go]')) {
        show(1);
        return;
      }
      if (e.target.closest('[data-ct-again]')) {
        reset();
        show(1);
        return;
      }
      if (e.target.closest('[data-ct-end]')) {
        onFinish();
      }
    });
    show(0);
  };
  /* the tour on its own page, from the Tracker and Reading settings */
  A.V.counting = function () {
    return {
      html:
        A.back('Tracker', '#/tracker') +
        '<header class="top"><div class="tt"><div class="eyebrow">' +
        A.T('Counting on your fingers') +
        '</div><h1>' +
        A.T('How it works') +
        '</h1></div></header>' +
        P.tourHtml(false),
      title: 'How counting works',
      tab: 2,
      mount: function (el) {
        P.tourMount(el, function () {
          A.goBack('#/tracker');
        });
      },
      unmount: function () {
        P.stop();
      }
    };
  };
  A.acts['count-tour'] = function () {
    A.closeSheets && A.closeSheets();
    A.go('#/counting');
  };
})();
