/* Adhkār for iOS: injected before the page's own scripts (by MainViewController.swift). It provides the same
   window.AndroidBridge contract as Android and Windows so every screen, state mirror, recitation download, prayer
   reminder, location and Qibla compass work identically on iPhone and iPad. */
(function () {
  'use strict';
  /* the app's own bundled page only, never an external frame */
  if (location.protocol !== 'adhkar-app:' || window.top !== window) return;
  if (!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.adhkar)) return;

  window.ADHKAR_IOS = true;
  var mark = function () {
    document.documentElement.classList.add('is-ios');
  };
  if (document.documentElement) mark();
  else document.addEventListener('readystatechange', mark, { once: true });

  var post = window.webkit.messageHandlers.adhkar;
  /* calls whose return value the page does not read go asynchronously over WKScriptMessageHandler; calls whose return
     value is needed synchronously go over WKUIDelegate's prompt channel (verified against scheme + main frame).
     Immutable capabilities are cached after the first call. */
  var NOWAIT = {
    setCanBack: 1,
    audioDownload: 1,
    audioCancel: 1,
    audioDeleteAll: 1,
    audioPlay: 1,
    audioPause: 1,
    audioResume: 1,
    audioRate: 1,
    audioStop: 1,
    openOverlay: 1,
    openDndAccess: 1,
    openBattery: 1,
    ready: 1,
    saveState: 1,
    haptic: 1,
    keepAwake: 1,
    setSystemBars: 1,
    shareText: 1,
    shareImage: 1,
    openUrl: 1,
    sync: 1,
    volumeKeys: 1,
    audioHold: 1,
    startCompass: 1,
    stopCompass: 1,
    requestLocation: 1,
    printPage: 1,
    exportFile: 1,
    importFile: 1,
    openSettings: 1,
    updateCheck: 1,
    updateGet: 1
  };
  var KEEP = {
    version: 1,
    updateCan: 1,
    overlayOk: 1,
    dndOk: 1,
    batteryOk: 1,
    setAlarm: 1,
    pinWidget: 1
  };
  var kept = {},
    seq = 0;

  function call(fn, args, mustWait) {
    if (KEEP[fn] && fn in kept) return kept[fn];
    args = args || [];
    /* saves carry a monotonic number so an older write arriving late never overwrites a newer one */
    if (fn === 'saveState') args = [args[0], ++seq];
    try {
      if (!mustWait && NOWAIT[fn]) {
        post.postMessage({ fn: fn, args: args });
        return undefined;
      }
      var raw = window.prompt('__adhkar__:' + fn, JSON.stringify(args));
      if (raw === null || raw === undefined || raw === '') return undefined;
      var o = JSON.parse(raw),
        r = 'r' in o ? o.r : undefined;
      if (KEEP[fn]) kept[fn] = r;
      return r;
    } catch (e) {
      console.warn('ios bridge ' + fn, e);
      return undefined;
    }
  }

  /* called by SceneDelegate when entering background so the durable native mirror is always current */
  window.__adhkarFlush = function () {
    try {
      if (window.A && A.S) call('saveState', [JSON.stringify(A.S)], true);
    } catch (e) {}
    return 1;
  };

  var names = [
    'setCanBack',
    'audioHave',
    'audioUsage',
    'audioDownload',
    'audioCancel',
    'audioDeleteAll',
    'audioPlay',
    'audioPause',
    'audioResume',
    'audioRate',
    'audioStop',
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
    'previewAdhan',
    'startCompass',
    'stopCompass',
    'locateQuiet',
    'requestLocation',
    'requestNotifications',
    'notificationState',
    'testReminder',
    'printPage',
    'exportFile',
    'importFile',
    'openSettings',
    'updateCan',
    'updateCheck',
    'updateGet'
  ];

  var B = {};
  names.forEach(function (n) {
    B[n] = function () {
      return call(n, Array.prototype.slice.call(arguments));
    };
  });
  window.AndroidBridge = B;
})();
