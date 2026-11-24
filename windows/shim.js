/* Adhkār for Windows: runs before the page's own scripts (added by windows/app/src/web.rs). It gives the page the same bridge the Android app gives
   it, so the record, the recitations and every screen behave as on the phone, and it marks the page as running on a
   computer, which switches on web/js/desk.js. */
(function () {
  'use strict';
  /* the app's own page only, never a frame inside it */
  if (location.origin !== 'https://adhkar.example' || window.top !== window) return;
  if (!(window.chrome && chrome.webview)) return;
  window.ADHKAR_DESKTOP = true;
  /* the document may not exist yet at this point */
  var mark = function () {
    document.documentElement.classList.add('is-desk');
  };
  if (document.documentElement) mark();
  else document.addEventListener('readystatechange', mark, { once: true });
  /* every call goes to the program (windows/app/src/bridge.rs) as one small request and waits for its answer, as the
     phone's does */
  /* calls whose answer the page never uses go without waiting, so the page never pauses for them (a save, the title
     bar's colours, the reminders handed over); the rest wait for their answer, as the phone's do. Answers that cannot
     change while the app runs are kept after the first ask. */
  var NOWAIT = {
    saveState: 1,
    titleBar: 1,
    keepAwake: 1,
    setCanBack: 1,
    setSystemBars: 1,
    volumeKeys: 1,
    audioHold: 1,
    haptic: 1,
    sync: 1,
    deskSchedule: 1,
    deskNext: 1,
    deskPill: 1,
    startCompass: 1,
    stopCompass: 1
  };
  var KEEP = { version: 1, updateCan: 1, overlayOk: 1, dndOk: 1, batteryOk: 1 },
    kept = {},
    seq = 0;
  function call(fn, args, mustWait) {
    if (KEEP[fn] && fn in kept) return kept[fn];
    args = args || [];
    /* saves carry a number, so an earlier one that arrives late never overwrites a later one */
    if (fn === 'saveState') args = [args[0], ++seq];
    try {
      var wait = mustWait || !NOWAIT[fn],
        x = new XMLHttpRequest();
      x.open('POST', '/__bridge/' + fn, !wait);
      x.setRequestHeader('X-Adhkar', '1');
      x.setRequestHeader('Content-Type', 'application/json');
      x.send(JSON.stringify(args));
      if (!wait) return undefined;
      if (x.status !== 200) return undefined;
      var o = JSON.parse(x.responseText),
        r = 'r' in o ? o.r : undefined;
      if (KEEP[fn]) kept[fn] = r;
      return r;
    } catch (e) {
      console.warn('bridge ' + fn, e);
      return undefined;
    }
  }
  /* the program is about to close: the record goes over now, and waits to be received */
  window.__adhkarFlush = function () {
    try {
      if (window.A && A.S) call('saveState', [JSON.stringify(A.S)], true);
    } catch (e) {}
    return 1;
  };
  var nat = function () {
    return window.__native || {};
  };

  var names = [
    'setCanBack',
    'audioHave',
    'audioUsage',
    'audioDownload',
    'audioCancel',
    'audioDeleteAll',
    'overlayOk',
    'openOverlay',
    'takeNudgeTally',
    'dndOk',
    'openDndAccess',
    'batteryOk',
    'openBattery',
    'ready',
    'saveState',
    'loadState',
    'version',
    'systemDark',
    'haptic',
    'keepAwake',
    'setSystemBars',
    'shareText',
    'shareImage',
    'openUrl',
    'setAlarm',
    'sync',
    'takeTrackerEvents',
    'takeWidgetEvents',
    'pinWidget',
    'volumeKeys',
    'audioHold',
    'startCompass',
    'stopCompass',
    'locateQuiet',
    'requestLocation',
    'requestNotifications',
    'notificationState',
    'testReminder',
    'exportFile',
    'importFile',
    'printPage',
    'openSettings',
    'updateCan',
    'updateCheck',
    'updateGet'
  ];
  /* what only a computer can do (web/js/desk.js, print.js) */
  var desk = [
    'deskInfo',
    'deskSet',
    'deskZoom',
    'titleBar',
    'deskSchedule',
    'deskNext',
    'deskPill',
    'openFolder',
    'backup',
    'install',
    'quit',
    'savePdf',
    'reveal',
    'openPdf'
  ];
  var B = {},
    D = {};
  names.concat(desk).forEach(function (n) {
    D[n] = B[n] = function () {
      return call(n, Array.prototype.slice.call(arguments));
    };
  });

  /* ---------- recitations: played here, from the files the computer downloaded (served under /rec/) ----------
     WebView2 does not pass an <audio> element's requests through the app's own file server (they would go out to a
     host that does not exist and fail with "no supported source"), but it does pass fetch(). So each file is fetched,
     held in memory as a blob, and played from there. The last few stay ready, and the next verse is fetched while
     the current one plays, so a recitation runs on without gaps. */
  var blobs = {},
    order = [];
  var media = (window.DeskMedia = function (path) {
    if (blobs[path]) return Promise.resolve(blobs[path]);
    return fetch(path)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.blob();
      })
      .then(function (b) {
        if (blobs[path]) return blobs[path];
        blobs[path] = URL.createObjectURL(b);
        order.push(path);
        while (order.length > 12) {
          var old = order.shift();
          URL.revokeObjectURL(blobs[old]);
          delete blobs[old];
        }
        return blobs[path];
      });
  });
  var Q = { list: [], i: 0, el: null, rate: 1, t: 0, gen: 0, held: false };
  function stopEl() {
    Q.gen++;
    clearInterval(Q.t);
    if (Q.el) {
      Q.el.onended = Q.el.onerror = null;
      try {
        Q.el.pause();
      } catch (e) {}
      Q.el = null;
    }
  }
  function next() {
    stopEl();
    if (Q.i >= Q.list.length) {
      if (nat().onAudioEnd) nat().onAudioEnd();
      return;
    }
    var gen = Q.gen,
      fail = function () {
        if (gen !== Q.gen) return;
        stopEl();
        if (nat().onAudioEnd) nat().onAudioEnd();
      };
    media('/rec/' + Q.list[Q.i]).then(function (url) {
      if (gen !== Q.gen) return;
      var a = (Q.el = new Audio(url));
      a.playbackRate = Q.rate;
      a.onended = function () {
        Q.i++;
        next();
      };
      a.onerror = fail;
      if (!Q.held) a.play().catch(fail);
      if (Q.i + 1 < Q.list.length) media('/rec/' + Q.list[Q.i + 1]).catch(function () {});
      Q.t = setInterval(function () {
        if (Q.el && Q.el.duration && nat().onAudioPos)
          nat().onAudioPos(Q.i, Q.list.length, Q.el.currentTime * 1000, Q.el.duration * 1000, !Q.el.paused);
      }, 200);
    }, fail);
  }
  B.audioPlay = function (json, rate) {
    try {
      Q.list = JSON.parse(json || '[]');
    } catch (e) {
      Q.list = [];
    }
    Q.i = 0;
    Q.held = false;
    Q.rate = Math.max(0.5, Math.min(1.5, +rate || 1));
    if (Q.list.length) next();
  };
  B.audioPause = function () {
    Q.held = true;
    if (Q.el) Q.el.pause();
  };
  B.audioResume = function () {
    Q.held = false;
    if (Q.el) Q.el.play().catch(function () {});
  };
  B.audioRate = function (r) {
    Q.rate = Math.max(0.5, Math.min(1.5, +r || 1));
    if (Q.el) Q.el.playbackRate = Q.rate;
  };
  B.audioStop = function () {
    stopEl();
  };
  /* the takbīr of the adhān from Masjid an-Nabawī, as the phone plays it */
  var adhan = null;
  B.previewAdhan = function () {
    if (adhan) {
      adhan.pause();
      adhan = null;
      return false;
    }
    var me = (adhan = {
      pause: function () {
        me.off = true;
      }
    });
    var done = function () {
      if (adhan === me) adhan = null;
      if (nat().onAdhanEnd) nat().onAdhanEnd();
    };
    media('/audio/adhan_takbir.ogg').then(function (url) {
      if (me.off || adhan !== me) return;
      var a = (adhan = new Audio(url));
      a.onended = a.onerror = done;
      a.play().catch(done);
    }, done);
    return true;
  };
  window.AndroidBridge = B;
  window.DeskBridge = D;
  window.DeskAudio = { stop: stopEl };

  /* a backup file dropped anywhere on the window */
  function over(e) {
    if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      document.documentElement.classList.add('dropping');
    }
  }
  addEventListener('dragenter', over);
  addEventListener('dragover', over);
  addEventListener('dragleave', function (e) {
    if (!e.relatedTarget) document.documentElement.classList.remove('dropping');
  });
  addEventListener('drop', function (e) {
    document.documentElement.classList.remove('dropping');
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    e.preventDefault();
    chrome.webview.postMessageWithAdditionalObjects('drop', e.dataTransfer.files);
  });
})();
