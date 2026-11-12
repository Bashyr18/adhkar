/* A gentle on-screen dhikr: every few minutes while the app is open, a short remembrance slides up above the tab bar.
   Tap to count it once (it joins your Tracker totals); the arrow opens the Tracker; it leaves on its own otherwise. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    esc = A.esc,
    ic = A.icon;
  var ORDER = [
    'subhanallah',
    'alhamdulillah',
    'allahuakbar',
    'lailaha',
    'astaghfirullah',
    'subhanbihamdih',
    'salawat',
    'hawqala'
  ];
  var el = null,
    hideT = 0,
    lastShown = Date.now(),
    turn = 0;

  A.trkAddPhrase =
    A.trkAddPhrase ||
    function (id, n) {
      var tr = S.tasbih,
        k = A.today();
      tr.total = (tr.total || 0) + n;
      tr.days[k] = (tr.days[k] || 0) + n;
      tr.per = tr.per || {};
      tr.per[id] = (tr.per[id] || 0) + n;
      A.save();
    };
  function phrase() {
    var list = (window.DATA.tasbih || []).filter(function (t) {
      return ORDER.indexOf(t.id) >= 0;
    });
    list.sort(function (a, b) {
      return ORDER.indexOf(a.id) - ORDER.indexOf(b.id);
    });
    return list[turn++ % list.length];
  }
  function blocked() {
    var h = location.hash || '#/';
    return (
      document.hidden ||
      !S.profile.onboarded ||
      /^#\/(r\/|welcome|tracker|tasbih)/.test(h) ||
      document.querySelector('.sheet') ||
      (A.readerOpen && A.readerOpen())
    );
  }
  function hide() {
    clearTimeout(hideT);
    if (el) {
      el.classList.remove('in');
      var e = el;
      el = null;
      setTimeout(function () {
        e.remove();
      }, 400);
    }
  }
  function show() {
    var p = phrase();
    if (!p) return;
    hide();
    el = document.createElement('div');
    el.className = 'dnudge';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<button type="button" class="dn-main" aria-label="Count ' +
      esc(p.tr) +
      ' once"><span class="dn-ar ar" lang="ar">' +
      esc(p.ar) +
      '</span><span class="dn-tr">' +
      esc(p.tr) +
      '</span></button>' +
      '<button type="button" class="dn-go" aria-label="Open the Tracker">' +
      ic('right', 's') +
      '</button><button type="button" class="dn-x" aria-label="Dismiss">' +
      ic('close', 'xs') +
      '</button>';
    document.body.appendChild(el);
    if (A.localize) A.localize(el);
    requestAnimationFrame(function () {
      if (el) el.classList.add('in');
    });
    var mine = el;
    el.querySelector('.dn-main').addEventListener('click', function () {
      A.trkAddPhrase(p.id, 1);
      A.N.haptic('tick');
      if (A.fx && A.fx.click) A.fx.click();
      mine.classList.add('done');
      mine.querySelector('.dn-tr').textContent = A.T ? A.T('Counted') : 'Counted';
      setTimeout(hide, 900);
    });
    el.querySelector('.dn-go').addEventListener('click', function () {
      hide();
      A.go('#/tracker');
    });
    el.querySelector('.dn-x').addEventListener('click', hide);
    hideT = setTimeout(hide, 14000);
    lastShown = Date.now();
  }
  setInterval(function () {
    var n = S.prefs.nudge;
    if (!n || !n.on) return;
    if (Date.now() - lastShown < n.every * 60000) return;
    if (blocked()) {
      lastShown = Date.now() - (n.every - 1) * 60000;
      return;
    } // try again a minute later
    show();
  }, 30000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden)
      lastShown = Math.max(lastShown, Date.now() - 60000 * ((S.prefs.nudge || {}).every || 20) + 90000);
  });
  A.nudgeNow = show;
  /* dhikr counted from the floating reminder while the app was closed */
  A.takeNudges = function () {
    var r = A.N.call('takeNudgeTally'),
      o;
    try {
      o = JSON.parse(r || '{}');
    } catch (e) {
      o = {};
    }
    var n = 0;
    Object.keys(o).forEach(function (id) {
      if (o[id] > 0) {
        A.trkAddPhrase(id, o[id]);
        n += o[id];
      }
    });
    if (n) A.toast('+' + A.fmtN(n) + ' from the reminder', 'check');
  };
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && A.N.has) A.takeNudges();
  });
  setTimeout(function () {
    if (A.N.has) A.takeNudges();
  }, 1200);
})();
