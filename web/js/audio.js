/* Recited audio: optional downloads of the Ḥiṣn al-Muslim recordings and Qurʾān verses (Mishary al-ʿAfāsī),
   a listen bar in the reader, and Learn mode: it recites, then pauses for you to repeat, three times. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    $ = A.$,
    esc = A.esc,
    ic = A.icon;
  var pad = function (n) {
    return ('00' + n).slice(-3);
  };

  function files(it) {
    var a = it && it.au;
    if (!a) return [];
    if (a.own)
      return [
        {
          n:
            'o' +
            a.own
              .replace(/\.mp3$/, '')
              .replace(/[^a-z0-9]/g, '')
              .slice(0, 20) +
            '.mp3',
          u: 'asset:audio/' + a.own
        }
      ];
    if (a.h) return [{ n: 'h' + a.h + '.mp3', u: 'https://www.hisnmuslim.com/audio/ar/' + a.h + '.mp3' }];
    return a.q.map(function (x) {
      var k = pad(x[0]) + pad(x[1]);
      return { n: 'q' + k + '.mp3', u: 'https://everyayah.com/data/Alafasy_128kbps/' + k + '.mp3' };
    });
  }
  var haveCache = null;
  function have(list) {
    if (!A.N.has) return [];
    var r = A.N.call(
      'audioHave',
      JSON.stringify(
        list.map(function (f) {
          return f.n;
        })
      )
    );
    try {
      return JSON.parse(r || '[]');
    } catch (e) {
      return [];
    }
  }
  /* in a browser (the standalone page), recitations stream straight from the two sources; the app downloads them */
  var WEB = !A.N.has && !!window.ADHKAR_WEB_AUDIO && typeof window.Audio === 'function';
  var AU = (A.audio = {
    ok: function () {
      return WEB || (A.N.has && typeof window.AndroidBridge.audioPlay === 'function');
    },
    web: WEB,
    files: files,
    ready: function (it) {
      var f = files(it);
      return f.length > 0 && (WEB || have(f).length === f.length);
    },
    collection: function (cid) {
      var seen = {},
        out = [];
      A.items(cid, cid === 'salah' ? 'fajr' : undefined).forEach(function (it) {
        files(it).forEach(function (f) {
          if (!seen[f.n]) {
            seen[f.n] = 1;
            out.push(f);
          }
        });
      });
      return out;
    },
    usage: function () {
      return +(A.N.call('audioUsage') || 0);
    },
    all: function () {
      var seen = {},
        out = [];
      window.DATA.collections.forEach(function (c) {
        A.items(c.id, c.perPrayer ? 'fajr' : undefined).forEach(function (it) {
          files(it).forEach(function (f) {
            if (!seen[f.n]) {
              seen[f.n] = 1;
              out.push(f);
            }
          });
        });
      });
      return out;
    },
    bytes: function (list) {
      var z = (window.DATA.meta && window.DATA.meta.ausz) || {};
      return list.reduce(function (s, f) {
        return s + (z[f.n] || 350000);
      }, 0);
    },
    mb: function (b) {
      return A.fmtN(Math.max(1, Math.round(b / 1048576))) + (A.ar() ? ' ميغابايت' : ' MB');
    },
    missing: function () {
      if (WEB) return [];
      var l = AU.all(),
        h = have(l);
      return l.filter(function (f) {
        return h.indexOf(f.n) < 0;
      });
    }
  });
  /* the bar on screen redraws itself whenever a download lands, so it never shows Download for audio you have */
  AU.refresh = function () {
    var b = document.getElementById('aubar');
    if (b && P.it && !P.playing && !P.round) b.outerHTML = AU.bar(P.it, b.dataset.cid || '');
  };

  /* ---------- downloads ---------- */
  var jobs = {};
  AU.download = function (list, tag, cb) {
    if (!list.length) {
      cb && cb(true);
      return;
    }
    jobs[tag] = cb || null;
    A.N.call('audioDownload', JSON.stringify(list), tag);
  };
  window.__native = window.__native || {};
  window.__native.onAudio = function (json) {
    var r;
    try {
      r = JSON.parse(json);
    } catch (e) {
      return;
    }
    var bar = document.querySelector('[data-au-tag="' + r.tag + '"]');
    if (bar) {
      var p = bar.querySelector('.au-dl i');
      if (p) p.style.width = (r.total ? (r.done / r.total) * 100 : 0) + '%';
      var t = bar.querySelector('.au-dl-t');
      if (t && r.state === 'progress') t.textContent = 'Downloading ' + r.done + ' of ' + r.total;
    }
    var all = document.querySelector('[data-au-all]');
    if (all && r.tag === 'all') {
      var pi = all.querySelector('i');
      if (pi) pi.style.width = (r.total ? (r.done / r.total) * 100 : 0) + '%';
      var tt = all.querySelector('[data-au-all-t]');
      if (tt)
        tt.textContent =
          r.state === 'progress' ? A.T('Downloading') + ' ' + A.fmtN(r.done) + ' / ' + A.fmtN(r.total) : '';
    }
    if (r.state === 'progress') return;
    var cb = jobs[r.tag];
    delete jobs[r.tag];
    if (r.state === 'error') A.toast('Could not download. Check your connection and try again.', 'info');
    if (r.state === 'partial')
      A.toast(A.fmtN(r.done) + ' of ' + A.fmtN(r.total) + ' downloaded. Try again for the rest.', 'info');
    AU.refresh();
    if (cb) cb(r.state === 'done' || r.state === 'partial');
    else A.rerender();
  };

  /* ---------- playback ---------- */
  var P = { it: null, rate: 1, learn: false, round: 0, playing: false, wait: 0, timer: 0 };
  function setBar(state, frac) {
    var b = document.getElementById('aubar');
    if (!b) return;
    b.dataset.state = state;
    var r = b.querySelector('.au-ring circle.v');
    if (r) r.style.strokeDashoffset = (1 - (frac || 0)) * 100.5;
    var l = b.querySelector('.au-lbl');
    if (l)
      l.textContent =
        state === 'turn'
          ? A.T('Your turn · tap when you have said it')
          : state === 'play'
            ? P.learn
              ? A.T('Listen') + ' · ' + A.T('round') + ' ' + A.fmtN(P.round + 1) + ' / ' + A.fmtN(3)
              : A.T('Reciting')
            : A.T('Listen to the recitation');
    b.classList.toggle('turn', state === 'turn');
  }
  function hold(on) {
    A.N.call('audioHold', !!on);
  }
  var W = { el: null, list: [], i: 0, t: 0 };
  function webUrl(f) {
    return f.u.indexOf('asset:') === 0 ? f.u.slice(6) : f.u;
  }
  function webPlay(list, rate) {
    webStop();
    W.list = list;
    W.i = 0;
    webNext(rate);
  }
  function webNext(rate) {
    if (W.i >= W.list.length) {
      webStop();
      window.__native.onAudioEnd();
      return;
    }
    var a = (W.el = new window.Audio(webUrl(W.list[W.i])));
    a.playbackRate = rate || 1;
    a.preload = 'auto';
    a.onended = function () {
      W.i++;
      webNext(P.rate);
    };
    a.onerror = function () {
      webStop();
      A.toast('Could not play. Check your connection and try again.', 'info');
      P.playing = false;
      setBar('idle', 0);
    };
    a.play().catch(function () {});
    clearInterval(W.t);
    W.t = setInterval(function () {
      if (W.el && W.el.duration)
        window.__native.onAudioPos(W.i, W.list.length, W.el.currentTime * 1000, W.el.duration * 1000, !W.el.paused);
    }, 200);
  }
  function webStop() {
    clearInterval(W.t);
    if (W.el) {
      try {
        W.el.pause();
      } catch (e) {}
      W.el.onended = null;
      W.el = null;
    }
  }
  function playIt() {
    hold(true);
    P.playing = true;
    setBar('play', 0);
    if (WEB) webPlay(files(P.it), P.rate);
    else
      A.N.call(
        'audioPlay',
        JSON.stringify(
          files(P.it).map(function (f) {
            return f.n;
          })
        ),
        P.rate
      );
  }
  AU.stop = function () {
    hold(false);
    clearInterval(P.timer);
    P.playing = false;
    P.round = 0;
    if (WEB) webStop();
    else A.N.call('audioStop');
    setBar('idle', 0);
  };
  var lastDur = 0,
    lastQ = [0, 1];
  window.__native.onAudioPos = function (qi, qn, pos, dur, playing) {
    if (!P.playing || !dur) return;
    lastDur = dur;
    lastQ = [qi, qn];
    setBar('play', (qi + pos / dur) / qn);
    var t = document.querySelector('#aubar [data-au-time]');
    if (t)
      t.textContent = qn > 1 ? A.T('Āyah') + ' ' + A.fmtN(qi + 1) + ' / ' + A.fmtN(qn) : mmss(pos) + ' / ' + mmss(dur);
  };
  window.__native.onAudioEnd = function () {
    if (!P.playing) return;
    if (P.learn && P.round < 2) {
      /* your turn: as long as you take to say it (your pace for this dhikr), counting down; tap to go on sooner */
      var wait = Math.max(2500, Math.min(90000, (A.pace ? A.pace.rep(P.it) : (lastDur * lastQ[1]) / P.rate) * 1.12)),
        t0 = Date.now();
      A.N.haptic('tick');
      setBar('turn', 1);
      P.turnEnd = t0 + wait;
      clearInterval(P.timer);
      P.timer = setInterval(function () {
        var left = P.turnEnd - Date.now(),
          f = left / wait;
        if (left <= 0) {
          nextRound();
          return;
        }
        setBar('turn', f);
        var t = document.querySelector('#aubar [data-au-time]');
        if (t) t.textContent = A.fmtN(Math.ceil(left / 1000)) + (A.ar() ? ' ث' : ' s');
      }, 100);
      return;
    }
    if (P.learn) {
      A.toast(A.T('Three rounds. Mā shāʾ Allāh'), 'check');
      A.N.haptic('success');
    }
    P.playing = false;
    P.round = 0;
    hold(false);
    setBar('idle', 0);
    var t = document.querySelector('#aubar [data-au-time]');
    if (t) t.textContent = '';
  };
  function nextRound() {
    clearInterval(P.timer);
    P.round++;
    var t = document.querySelector('#aubar [data-au-time]');
    if (t) t.textContent = '';
    A.N.haptic('tick');
    playIt();
  }

  function mmss(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return A.fmtN(Math.floor(s / 60)) + ':' + (s % 60 < 10 ? (A.ar() ? '٠' : '0') : '') + A.fmtN(s % 60);
  }
  /* ---------- the bar in the reader ---------- */
  AU.bar = function (it, cid) {
    if (!AU.ok()) return '';
    /* no separate recording of these exact words: say so quietly rather than play something else */
    if (!files(it).length)
      return it.kind === 'flag'
        ? ''
        : '<div class="au au-none" id="aubar"><span class="au-none-ic">' +
            ic('vol', 'xs') +
            '</span><span>' +
            A.T('No separate recording of these exact words') +
            '</span></div>';
    var ready = AU.ready(it);
    var ring =
      '<svg class="au-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16"/><circle class="v" cx="18" cy="18" r="16"/></svg>';
    if (!ready)
      return (
        '<div class="au" id="aubar" data-cid="' +
        esc(cid || '') +
        '" data-state="dl" data-au-tag="one-' +
        esc(it.uid || it.id || '') +
        '"><button type="button" class="au-play" data-a="au-get" aria-label="Download and play the recitation">' +
        ring +
        ic('download', 's') +
        '</button><div class="grow"><div class="au-lbl au-dl-t">Listen to the recitation</div><div class="au-s">' +
        A.T('This one now, or All') +
        ' · ' +
        AU.mb(AU.bytes(AU.missing())) +
        '</div><div class="au-dl"><i></i></div></div><button type="button" class="chip" data-a="au-get-all" data-c="' +
        esc(cid) +
        '">All</button></div>'
      );
    return (
      '<div class="au" id="aubar" data-cid="' +
      esc(cid || '') +
      '" data-state="idle"><button type="button" class="au-play" data-a="au-toggle" aria-label="Play or pause the recitation">' +
      ring +
      '<span class="pi">' +
      ic('play', 's') +
      '</span><span class="pa">' +
      ic('pause', 's') +
      '</span></button><div class="grow"><div class="au-lbl">Listen to the recitation</div><div class="au-s">' +
      (it.au.q ? 'Mishary al-ʿAfāsī' : it.au.own ? 'Recitation' : 'Ḥiṣn al-Muslim recording') +
      ' <span class="au-time" data-au-time></span></div></div>' +
      '<button type="button" class="chip au-rate" data-a="au-rate">' +
      P.rate +
      '×</button><button type="button" class="chip au-learn' +
      (P.learn ? ' on' : '') +
      '" data-a="au-learn" aria-pressed="' +
      P.learn +
      '">' +
      ic('repeat', 'xs') +
      'Learn</button></div>'
    );
  };
  AU.attach = function (it) {
    if (P.it && P.it !== it) AU.stop();
    P.it = it;
  };
  A.acts['au-toggle'] = function () {
    var b = document.getElementById('aubar'),
      st = b && b.dataset.state;
    if (st === 'play') {
      if (WEB) {
        if (W.el) W.el.pause();
      } else A.N.call('audioPause');
      P.playing = false;
      b.dataset.state = 'paused';
      return;
    }
    if (st === 'paused') {
      P.playing = true;
      if (WEB) {
        if (W.el) W.el.play().catch(function () {});
      } else A.N.call('audioResume');
      b.dataset.state = 'play';
      return;
    }
    if (st === 'turn') {
      nextRound();
      return;
    } /* you have said it: listen again */
    P.round = 0;
    playIt();
  };
  A.acts['au-rate'] = function (el) {
    P.rate = P.rate === 1 ? 0.75 : P.rate === 0.75 ? 0.5 : 1;
    el.textContent = P.rate + '×';
    if (WEB) {
      if (W.el) W.el.playbackRate = P.rate;
    } else A.N.call('audioRate', P.rate);
    A.N.haptic('tick');
  };
  A.acts['au-learn'] = function (el) {
    P.learn = !P.learn;
    el.classList.toggle('on', P.learn);
    el.setAttribute('aria-pressed', P.learn);
    A.N.haptic('tick');
    A.toast(P.learn ? 'Learn mode: listen, then repeat in the pause. Three rounds.' : 'Learn mode off', 'repeat');
  };
  A.acts['au-get'] = function (el) {
    var it = P.it;
    if (!it) return;
    el.disabled = true;
    /* each item downloads under its own tag; if you have moved on by the time it lands, nothing plays */
    AU.download(files(it), 'one-' + (it.uid || it.id), function (ok) {
      if (P.it !== it) return;
      if (ok) {
        var b = document.getElementById('aubar');
        if (b) b.outerHTML = AU.bar(it, '');
        playIt();
      } else el.disabled = false;
    });
  };
  AU.getAll = function (done) {
    var list = AU.missing();
    if (!list.length) {
      A.toast(window.ADHKAR_DESKTOP ? 'Every recitation is on this computer' : 'Every recitation is on your phone', 'check');
      if (done) done(true);
      return;
    }
    var b = document.getElementById('aubar');
    if (b) b.dataset.auTag = 'all';
    AU.download(list, 'all', function (ok) {
      if (ok) A.toast('Recitations downloaded', 'check');
      if (done) done(ok);
      else A.rerender();
    });
  };
  A.acts['au-get-all'] = function () {
    var list = AU.missing();
    if (!list.length) {
      A.toast(window.ADHKAR_DESKTOP ? 'Every recitation is on this computer' : 'Every recitation is on your phone', 'check');
      return;
    }
    A.confirm(
      'Download every recitation?',
      A.plural(list.length, 'recording') + ' · ' + AU.mb(AU.bytes(list)) + ' · ' + A.T('they then play offline'),
      'Download',
      function () {
        AU.getAll();
      }
    );
  };
  window.addEventListener('hashchange', function () {
    if (P.playing || P.round) {
      if (!/^#\/r\//.test(location.hash)) AU.stop();
    }
  });
  A.acts['au-clear'] = function () {
    A.confirm(
      'Remove downloaded recitations?',
      'They can be downloaded again at any time.',
      'Remove',
      function () {
        AU.stop();
        A.N.call('audioDeleteAll');
        A.rerender();
      },
      true
    );
  };
})();
