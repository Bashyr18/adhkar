/* Updates, for the copies installed from the release page (the Android APK and the Windows app). Nothing reaches the
   network unless you ask: "Check now", or the weekly check you can turn on. The device asks GitHub for the latest
   release, downloads the file for this device, checks it against the release's SHA-256 list, and installs it:
   Android through its own installer (which refuses anything not signed with the app's key), Windows by swapping the
   app's file and starting again. A copy from Google Play is updated by Play, so none of this shows there. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    esc = A.esc,
    ic = A.icon;
  var WEEK = 7 * 864e5;
  var L = function (en, ar) {
    return A.ar && A.ar() ? ar : en;
  };
  function cur() {
    return A.N.has ? String(A.N.version() || '') : '';
  }
  /* 13.10 is newer than 13.9: compared part by part, as numbers */
  function newer(a, b) {
    var x = String(a || '')
        .replace(/^v/, '')
        .split('.'),
      y = String(b || '')
        .replace(/^v/, '')
        .split('.');
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var p = +x[i] || 0,
        q = +y[i] || 0;
      if (p !== q) return p > q;
    }
    return false;
  }
  var U = (A.upd = {
    newer: newer,
    /* 'yes' where this copy can update itself; 'store' when a store updates it; '' in a browser */
    can: function () {
      if (!A.N.has) return '';
      try {
        return String(A.N.call('updateCan') || '');
      } catch (e) {
        return '';
      }
    },
    /* a newer version is known */
    ready: function () {
      return U.can() === 'yes' && !!S.upd.v && newer(S.upd.v, cur());
    },
    check: function (manual) {
      if (U.can() !== 'yes' || U.busy) return;
      U.manual = !!manual;
      U.busy = 'check';
      repaint();
      A.N.call('updateCheck');
    },
    get: function () {
      if (U.can() !== 'yes' || U.busy === 'get') return;
      U.busy = 'get';
      U.got = 0;
      repaint();
      A.N.call('updateGet');
    }
  });

  window.__native = window.__native || {};
  window.__native.onUpdate = function (json) {
    var r;
    try {
      r = JSON.parse(json);
    } catch (e) {
      return;
    }
    var manual = U.manual;
    if (r.state === 'found' || r.state === 'none') {
      U.busy = null;
      S.upd.at = Date.now();
      if (r.state === 'found') {
        var fresh = S.upd.v !== r.v;
        S.upd.v = r.v;
        S.upd.size = +r.size || 0;
        S.upd.notes = String(r.notes || '').slice(0, 600);
        A.save();
        if (manual) U.open();
        else if (fresh) A.toast(L('Adhkār ', 'أذكار ') + r.v + L(' is ready to install', ' جاهز للتثبيت'), 'spark');
      } else {
        S.upd.v = '';
        A.save();
        if (manual) A.toast(L('You have the latest version', 'لديك أحدث إصدار'), 'check');
      }
    } else if (r.state === 'progress') {
      U.got = r.total ? r.got / r.total : 0;
    } else if (r.state === 'verifying' || r.state === 'installing') {
      U.busy = r.state;
    } else if (r.state === 'permission') {
      U.busy = null;
      A.toast(
        L(
          'Allow Adhkār to install apps, then tap Install again',
          'اسمح لأذكار بتثبيت التطبيقات، ثم اضغط تثبيت مرة أخرى'
        ),
        'shield'
      );
    } else if (r.state === 'done') {
      U.busy = 'restart';
    } else if (r.state === 'error') {
      U.busy = null;
      if (manual || r.step === 'get')
        A.toast(
          r.step === 'get'
            ? L('The update could not be installed. Nothing was changed.', 'تعذّر تثبيت التحديث، ولم يتغيّر شيء.')
            : L('Could not check for updates. Try again later.', 'تعذّر التحقق من التحديثات. حاول لاحقًا.'),
          'info'
        );
    }
    repaint();
  };

  /* ---------- what you see ---------- */
  function mb(b) {
    return b ? (b / 1048576).toFixed(1) + (A.ar && A.ar() ? ' ميغابايت' : ' MB') : '';
  }
  function bar() {
    var label =
      U.busy === 'get'
        ? L('Downloading', 'جارٍ التنزيل') + ' · ' + Math.round((U.got || 0) * 100) + '%'
        : U.busy === 'verifying'
          ? L('Checking the file', 'جارٍ التحقق من الملف')
          : U.busy === 'installing'
            ? L('Installing', 'جارٍ التثبيت')
            : U.busy === 'restart'
              ? L('Starting the new version', 'جارٍ تشغيل الإصدار الجديد')
              : '';
    return (
      '<div class="up-prog"><i style="width:' +
      Math.round((U.busy === 'get' ? U.got || 0 : 1) * 100) +
      '%"></i></div><div class="up-lbl">' +
      esc(label) +
      '</div>'
    );
  }
  function sheetBody() {
    var going = U.busy === 'get' || U.busy === 'verifying' || U.busy === 'installing' || U.busy === 'restart';
    var notes = (S.upd.notes || '')
      .split(/\r?\n/)
      .map(function (l) {
        return l.replace(/^[#*\-\s]+/, '').trim();
      })
      .filter(Boolean)
      .slice(0, 5);
    return (
      '<div class="up-sheet"><div class="up-v">' +
      A.rosette(56) +
      '<div><div class="eyebrow">' +
      esc(L('A new version', 'إصدار جديد')) +
      '</div><div class="up-n">Adhkār ' +
      esc(S.upd.v) +
      '</div><div class="faint small">' +
      esc(L('You have ', 'لديك ') + cur()) +
      (S.upd.size ? ' · ' + esc(mb(S.upd.size)) : '') +
      '</div></div></div>' +
      (notes.length
        ? '<ul class="up-notes">' +
          notes
            .map(function (n) {
              return '<li>' + esc(n) + '</li>';
            })
            .join('') +
          '</ul>'
        : '') +
      (going
        ? bar()
        : '<button type="button" class="btn pri wide" data-a="upd-get">' +
          ic('download', 's') +
          esc(
            window.ADHKAR_DESKTOP
              ? L('Download and restart', 'نزّل وأعد التشغيل')
              : L('Download and install', 'نزّل وثبّت')
          ) +
          '</button>') +
      '<p class="faint small up-safe">' +
      esc(
        L(
          'From the official release page, checked against its SHA-256 list before it is installed. Your record stays as it is.',
          'من صفحة الإصدارات الرسمية، ويُتحقّق منه بقائمة SHA-256 قبل التثبيت. سجلّك يبقى كما هو.'
        )
      ) +
      '</p></div>'
    );
  }
  U.open = function () {
    if (!U.ready() && !U.busy) return U.check(true);
    if (U.sh && !U.sh.closed) return;
    U.sh = A.sheet(L('Update Adhkār', 'تحديث أذكار'), sheetBody());
  };
  /* the small key shown where you will see it: the Today header on a phone, the rail on a computer */
  U.chip = function () {
    if (!U.ready()) return '';
    return (
      '<button type="button" class="up-chip" data-a="upd-open" aria-label="' +
      esc(L('Update to ', 'حدّث إلى ') + S.upd.v) +
      '">' +
      ic('download', 'xs') +
      '<span>' +
      esc(L('Update', 'تحديث')) +
      '</span></button>'
    );
  };
  /* Settings › About: the version, Check now, and the weekly check */
  U.settings = function () {
    var c = U.can();
    if (c === 'store')
      return (
        '<div class="card col up-set"><div class="eyebrow">' +
        esc(L('Updates', 'التحديثات')) +
        '</div><p class="muted small">' +
        esc(L('Google Play keeps this copy up to date.', 'يحدّث Google Play هذه النسخة.')) +
        '</p></div>'
      );
    if (c !== 'yes') return '';
    var when = S.upd.at
      ? L('Last checked ', 'آخر تحقق ') + A.fmtDate(A.keyAt(S.upd.at))
      : L('Not checked yet', 'لم يتم التحقق بعد');
    return (
      '<div class="card pad0 up-set"><div class="list">' +
      '<div class="set"><span class="badge h-gold">' +
      ic('download', 's') +
      '</span><div class="grow"><div class="t">' +
      esc(U.ready() ? L('Adhkār ', 'أذكار ') + S.upd.v + L(' is ready', ' جاهز') : L('Updates', 'التحديثات')) +
      '</div><div class="s">' +
      esc(U.busy === 'check' ? L('Checking…', 'جارٍ التحقق…') : when) +
      '</div></div><button type="button" class="btn sec sm" data-a="' +
      (U.ready() ? 'upd-open' : 'upd-check') +
      '"' +
      (U.busy ? ' disabled' : '') +
      '>' +
      esc(U.ready() ? L('Install', 'ثبّت') : L('Check now', 'تحقق الآن')) +
      '</button></div>' +
      '<div class="set"><div class="grow"><div class="t">' +
      esc(L('Check once a week', 'تحقق مرة كل أسبوع')) +
      '</div><div class="s">' +
      esc(L('Only asks GitHub for the latest version number', 'يسأل GitHub عن رقم أحدث إصدار فقط')) +
      '</div></div>' +
      A.sw(!!S.upd.auto, 'upd-auto') +
      '</div></div></div>'
    );
  };
  function repaint() {
    if (U.sh && !U.sh.closed) {
      var b = U.sh.el.querySelector('.sh-b');
      if (b) b.innerHTML = sheetBody();
    }
    [].slice.call(document.querySelectorAll('.up-set')).forEach(function (el) {
      el.outerHTML = U.settings();
    });
    [].slice.call(document.querySelectorAll('.up-chip-slot')).forEach(function (el) {
      el.innerHTML = U.chip();
    });
  }
  U.repaint = repaint;

  A.acts['upd-open'] = function () {
    U.open();
  };
  A.acts['upd-check'] = function () {
    U.check(true);
  };
  A.acts['upd-get'] = function () {
    U.get();
  };
  A.acts['upd-auto'] = function (el) {
    S.upd.auto = !S.upd.auto;
    A.save();
    if (el) el.classList.toggle('on', S.upd.auto);
    if (S.upd.auto && Date.now() - (S.upd.at || 0) > WEEK) U.check(false);
    repaint();
  };

  /* the weekly check, only if you turned it on */
  setTimeout(function () {
    if (S.upd && S.upd.auto && U.can() === 'yes' && Date.now() - (S.upd.at || 0) > WEEK) U.check(false);
    else repaint();
  }, 8000);
})();
