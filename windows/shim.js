/* Adhkār for Windows: runs before the page's own scripts. It gives the page the same bridge the Android app gives
   it, so the record, the recitations and every screen behave as on the phone, and it marks the page as running on a
   computer, which switches on web/js/desk.js. */
(function () {
  'use strict';
  /* the app's own page only, never a frame inside it */
  if (location.origin !== 'https://adhkar.example' || window.top !== window) return;
  var H = null;
  try {
    H = chrome.webview.hostObjects.sync.adhkar;
  } catch (e) {
    H = null;
  }
  if (!H) return;
  window.ADHKAR_DESKTOP = true;
  /* the document may not exist yet at this point */
  var mark = function () {
    document.documentElement.classList.add('is-desk');
  };
  if (document.documentElement) mark();
  else document.addEventListener('readystatechange', mark, { once: true });
  function call(fn, args) {
    try {
      return H[fn].apply(H, args || []);
    } catch (e) {
      console.warn('bridge ' + fn, e);
      return undefined;
    }
  }
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
    'exportFile',
    'importFile',
    'openSettings'
  ];
  var B = {};
  names.forEach(function (n) {
    B[n] = function () {
      return call(n, Array.prototype.slice.call(arguments));
    };
  });

  /* ---------- recitations: played here, from the files the computer downloaded (served under /rec/) ---------- */
  var Q = { list: [], i: 0, el: null, rate: 1, t: 0 };
  function stopEl() {
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
    var a = (Q.el = new Audio('/rec/' + Q.list[Q.i]));
    a.playbackRate = Q.rate;
    a.onended = function () {
      Q.i++;
      next();
    };
    a.onerror = function () {
      stopEl();
      if (nat().onAudioEnd) nat().onAudioEnd();
    };
    a.play().catch(function () {});
    Q.t = setInterval(function () {
      if (Q.el && Q.el.duration && nat().onAudioPos)
        nat().onAudioPos(Q.i, Q.list.length, Q.el.currentTime * 1000, Q.el.duration * 1000, !Q.el.paused);
    }, 200);
  }
  B.audioPlay = function (json, rate) {
    try {
      Q.list = JSON.parse(json || '[]');
    } catch (e) {
      Q.list = [];
    }
    Q.i = 0;
    Q.rate = Math.max(0.5, Math.min(1.5, +rate || 1));
    if (Q.list.length) next();
  };
  B.audioPause = function () {
    if (Q.el) Q.el.pause();
  };
  B.audioResume = function () {
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
    adhan = new Audio('/audio/adhan_takbir.ogg');
    adhan.onended = function () {
      adhan = null;
      if (nat().onAdhanEnd) nat().onAdhanEnd();
    };
    adhan.play().catch(function () {
      adhan = null;
    });
    return true;
  };
  window.AndroidBridge = B;
  window.DeskBridge = H;
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
