/* Jumuʿah. Friday mode runs from Maghrib on Thursday to Maghrib on Friday (the night and the day of Jumuʿah):
   the app takes on its own look, Today leads with the day, and the Jumuʿah page holds its Sunnahs, each with its
   verified narration, the two hours of response the narrations name, and Sūrat al-Kahf on its Madani pages.

   The two hours (the strongest of the scholars' opinions, as Ibn al-Qayyim weighs them in Zād al-Maʿād):
   - from when the imam sits on the minbar until the prayer is finished (Muslim 853); the khuṭbah time is the
     masjid's own, so it is set here, counted from Dhuhr;
   - the last hour after ʿAṣr, before Maghrib (Abū Dāwūd 1048). */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    $ = A.$,
    esc = A.esc,
    ic = A.icon,
    MIN = 60000;
  function J() {
    var j = (S.jumuah = S.jumuah || {});
    j.days = j.days || {};
    if (j.khutbah == null) j.khutbah = 0; /* minutes after Dhuhr that the imam sits on the minbar */
    if (j.overlay == null) j.overlay = true;
    j.kahf = j.kahf || { page: 0, verse: 1 };
    return j;
  }
  function day(key) {
    var d = J().days;
    return (d[key] = d[key] || {});
  }

  /* ---------- which Friday, and where in it we are ---------- */
  A.jumuah = function (ms) {
    ms = ms || Date.now();
    if (!S.loc) return { on: false };
    var k = A.keyAt(ms),
      t = A.pday(k),
      dw = A.dow(k),
      fk = null,
      phase = null;
    if (!t) return { on: false };
    if (dw === 4 && ms >= t.maghrib) {
      fk = A.shift(k, 1);
      phase = 'night';
    } else if (dw === 5 && ms < t.maghrib) {
      fk = k;
      phase = ms < t.fajr ? 'night' : 'day';
    }
    if (!fk) return { on: false, next: nextFriday(k) };
    var ft = A.pday(fk),
      j = J(),
      minbar = { from: ft.dhuhr + j.khutbah * MIN, to: ft.dhuhr + (j.khutbah + 50) * MIN },
      last = { from: ft.maghrib - 60 * MIN, to: ft.maghrib },
      now = ms >= minbar.from && ms < minbar.to ? 'minbar' : ms >= last.from && ms < last.to ? 'last' : null;
    return { on: true, key: fk, t: ft, phase: phase, minbar: minbar, last: last, now: now, rec: day(fk) };
  };
  function nextFriday(k) {
    for (var i = 0; i < 8; i++) if (A.dow(A.shift(k, i)) === 5) return A.shift(k, i);
    return null;
  }
  /* on Friday the Dhuhr slot is Jumuʿah: for a brother it is Jumuʿah; for a sister, who is not required to attend,
     it is Jumuʿah with the imam or Ẓuhr at home */
  var sister = function () {
    return S.profile && S.profile.gender === 'f';
  };
  A.pName = function (k, key, short) {
    if (k === 'dhuhr' && key && A.dow(key) === 5) return sister() && !short ? 'Jumuʿah or Ẓuhr' : 'Jumuʿah';
    return window.Prayer.NAMES[k];
  };
  A.pAr = function (k, key) {
    if (k === 'dhuhr' && key && A.dow(key) === 5) return sister() ? 'الجمعة أو الظهر' : 'الجمعة';
    return window.Prayer.AR[k];
  };
  /* the look of the day, beside Ramaḍān's (Ramaḍān's own dress wins in its month) */
  function season() {
    var r = document.documentElement,
      on = A.jumuah().on && r.getAttribute('data-season') !== 'ramadan';
    if (on) r.setAttribute('data-friday', '');
    else r.removeAttribute('data-friday');
    return on;
  }
  var apply0 = A.applyTheme;
  A.applyTheme = function () {
    apply0();
    season();
  };
  setInterval(function () {
    var was = document.documentElement.hasAttribute('data-friday');
    if (season() !== was) A.rerender();
  }, 60000);

  /* ---------- the Sunnahs of the day, each with the narration it rests on ---------- */
  var SUNNAH = [
    { id: 'kahf', t: 'Read Sūrat al-Kahf', d: 'In the night or the day of Jumuʿah', ev: 'kahf', all: 1, href: '#/kahf' },
    { id: 'salawat', t: 'Send abundant ṣalawāt', d: 'They are presented to the Prophet ﷺ', ev: 'abudawud:1047', all: 1, href: '#/tracker' },
    { id: 'hour', t: 'Duʿāʾ in the hour of response', d: 'At the minbar, or the last hour before Maghrib', ev: 'hour', all: 1, href: '#/journal' },
    { id: 'ghusl', t: 'Ghusl', d: 'Before going to the prayer', ev: 'bukhari:880' },
    { id: 'siwak', t: 'Siwāk and perfume', d: 'If you have it', ev: 'bukhari:880' },
    { id: 'early', t: 'Go early', d: 'The first hour is as offering a camel', ev: 'bukhari:881' },
    { id: 'listen', t: 'Listen in silence', d: 'Even “be quiet” breaks it', ev: 'bukhari:934' }
  ];
  /* Jumuʿah is not required of women; the Sunnahs of attending are shown to sisters as optional */
  function sunnahs() {
    var sis = S.profile && S.profile.gender === 'f';
    return SUNNAH.map(function (x) {
      return { x: x, opt: sis && !x.all };
    });
  }
  function doneCount(rec) {
    var l = sunnahs().filter(function (s) {
      return !s.opt;
    });
    return {
      n: l.filter(function (s) {
        return rec[s.x.id];
      }).length,
      of: l.length
    };
  }
  function evidence(key) {
    if (key === 'kahf')
      return (
        '<div class="fr-ref"><b>' +
        esc(A.T('Reading Sūrat al-Kahf on Jumuʿah')) +
        '</b><span>' +
        esc(A.T('al-Ḥākim and al-Bayhaqī · Ṣaḥīḥ (al-Albānī, Ṣaḥīḥ al-Jāmiʿ 6470)')) +
        '</span></div>' +
        '<div class="eyebrow" style="margin-top:14px">' +
        esc(A.T('And its first ten verses')) +
        '</div>' +
        A.said('muslim:809') +
        cite('muslim:809')
      );
    if (key === 'hour')
      return (
        A.said('muslim:853') +
        cite('muslim:853') +
        A.said('abudawud:1048') +
        cite('abudawud:1048') +
        '<p class="fr-note">' +
        esc(A.T('Ibn al-Qayyim, in Zād al-Maʿād, held these two the strongest of the opinions on the hour.')) +
        '</p>'
      );
    return A.said(key) + cite(key);
  }
  function cite(key) {
    var H = window.HADITH && window.HADITH[key];
    if (!H) return '';
    return (
      '<div class="refs"><a href="https://sunnah.com/' +
      key +
      '" data-a="ext">' +
      ic('link', 'xs') +
      esc(A.refLabel ? A.refLabel(key) : key) +
      (H.g ? ' · ' + esc(H.g) : '') +
      '</a></div>'
    );
  }
  A.acts['fr-ev'] = function (el) {
    var x = SUNNAH.filter(function (s) {
      return s.id === el.dataset.k;
    })[0];
    if (x) A.sheet(A.T(x.t), evidence(x.ev));
  };
  A.acts['fr-tick'] = function (el) {
    var f = A.jumuah();
    if (!f.on) {
      A.toast(A.T('These are for the night and day of Jumuʿah'));
      return;
    }
    var r = day(f.key),
      id = el.dataset.k;
    if (r[id]) delete r[id];
    else r[id] = Date.now();
    A.save();
    A.N.haptic(r[id] ? 'success' : 'tick');
    A.rerender();
  };

  /* ---------- the hour, in words, with its countdown ---------- */
  function state(f) {
    var now = Date.now();
    if (!f.on) return null;
    if (f.now === 'last') return { k: 'last', t: 'The last hour · Maghrib in', d: 'Ask now: this is the hour to seek', at: f.last.to };
    if (f.now === 'minbar') return { k: 'minbar', t: 'The hour at the minbar', d: 'Listen in silence; ask when the imam sits, and in the prayer', at: f.minbar.to };
    if (f.phase === 'night') return { k: 'night', t: 'Fajr at', d: 'Read al-Kahf and send abundant ṣalawāt', at: f.t.fajr };
    if (now < f.minbar.from) return { k: 'morning', t: 'Khuṭbah at', d: 'Ghusl, go early, and read al-Kahf', at: f.minbar.from };
    return { k: 'after', t: 'The last hour begins at', d: 'Seek the hour of response with duʿāʾ before Maghrib', at: f.last.from };
  }
  function countdown(st) {
    var left = st.at - Date.now();
    return st.k === 'last' || st.k === 'minbar' ? A.fmtCountdown(Math.max(0, left)) : A.fmtTxt(st.at);
  }

  /* the minbar, drawn: an arch with its lamp, the motif of the day */
  var ARCH =
    '<svg class="fr-arch" viewBox="0 0 120 150" aria-hidden="true"><defs><radialGradient id="frg"><stop offset="0" stop-color="#ffe7ad" stop-opacity=".95"/><stop offset="1" stop-color="#ffe7ad" stop-opacity="0"/></radialGradient></defs>' +
    '<circle cx="60" cy="74" r="44" fill="url(#frg)" opacity=".55"/>' +
    '<path d="M14 148V70C14 38 38 16 60 6c22 10 46 32 46 64v78" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
    '<path d="M28 148V74c0-24 16-42 32-50 16 8 32 26 32 50v74" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".55"/>' +
    '<path d="M60 26v22" stroke="currentColor" stroke-width="1"/><path d="M53 48h14l-2 6h-10z" fill="currentColor"/>' +
    '<path d="M50 54h20l3 14-5 10H52l-5-10z" fill="rgba(255,214,140,.25)" stroke="currentColor" stroke-width="1.4"/>' +
    '<ellipse class="fr-flame" cx="60" cy="65" rx="3.2" ry="5.5" fill="#ffe2a2"/>' +
    '<path d="M60 0l2.3 3.1 3.8-.8-.8 3.8L68.4 8.4l-3.1 2.3.8 3.8-3.8-.8L60 16.8l-2.3-3.1-3.8.8.8-3.8-3.1-2.3 3.1-2.3-.8-3.8 3.8.8z" fill="currentColor"/>' +
    '</svg>';

  /* ---------- Today: the card that leads the day ---------- */
  A.fridayCard = function () {
    var f = A.jumuah();
    if (!f.on) return '';
    var st = state(f),
      dc = doneCount(f.rec),
      kp = J().kahf;
    return (
      '<a class="card fr-hero press" href="#/jumuah">' +
      ARCH +
      '<div class="fr-h"><div class="eyebrow">' +
      esc(A.T('Yawm al-Jumuʿah')) +
      '</div><div class="fr-ar" lang="ar">يوم الجمعة</div></div>' +
      '<div class="fr-st"><div class="muted small">' +
      esc(A.T(st.t)) +
      '</div><div class="fr-cd num" data-fr-cd>' +
      esc(countdown(st)) +
      '</div><div class="muted small">' +
      esc(A.T(st.d)) +
      '</div></div>' +
      '<div class="fr-chips"><span class="chip' +
      (f.rec.kahf ? ' on' : '') +
      '">' +
      ic(f.rec.kahf ? 'check' : 'book', 'xs') +
      esc(A.T('Al-Kahf')) +
      (f.rec.kahf || !kp.page ? '' : ' · ' + A.fmtN(kp.page + 1) + '/' + A.fmtN(12)) +
      '</span><span class="chip' +
      (f.rec.salawat ? ' on' : '') +
      '">' +
      ic(f.rec.salawat ? 'check' : 'heart', 'xs') +
      esc(A.T('Ṣalawāt')) +
      '</span><span class="chip">' +
      A.fmtN(dc.n) +
      ' / ' +
      A.fmtN(dc.of) +
      ' ' +
      esc(A.T('Sunnahs')) +
      '</span></div></a>'
    );
  };
  A.fridayTick = function (el) {
    var cd = $('[data-fr-cd]', el);
    if (!cd) return;
    var f = A.jumuah(),
      st = state(f);
    if (st) cd.textContent = A.T(countdown(st));
  };

  /* ---------- the Jumuʿah page ---------- */
  A.V.jumuah = function () {
    var f = A.jumuah(),
      j = J(),
      key = f.on ? f.key : f.next,
      t = A.pday(key),
      rec = day(key),
      st = state(f);
    var h =
      A.back('Back', '#/') +
      '<header class="top fr-top"><div class="tt"><div class="eyebrow">' +
      esc(f.on ? A.T(f.phase === 'night' ? 'The night of Jumuʿah' : 'Yawm al-Jumuʿah') : A.T('Next Jumuʿah') + ' · ' + A.fmtDate(key, 'short')) +
      '</div><h1>' +
      esc(A.T('Jumuʿah')) +
      ' <em lang="ar">الجمعة</em></h1></div></header>';
    /* the day at a glance: Fajr to Maghrib, the two hours lit */
    if (t) {
      var a = t.fajr,
        b = t.maghrib,
        x = function (ms) {
          return Math.max(0, Math.min(100, ((ms - a) / (b - a)) * 100));
        },
        mb = { from: t.dhuhr + j.khutbah * MIN, to: t.dhuhr + (j.khutbah + 50) * MIN },
        ls = { from: t.maghrib - 60 * MIN, to: t.maghrib },
        now = Date.now();
      h +=
        '<section class="card fr-day"><div class="fr-line"><span class="fr-win mb' +
        (f.now === 'minbar' ? ' now' : '') +
        '" style="inset-inline-start:' +
        x(mb.from).toFixed(1) +
        '%;width:' +
        (x(mb.to) - x(mb.from)).toFixed(1) +
        '%"></span><span class="fr-win ls' +
        (f.now === 'last' ? ' now' : '') +
        '" style="inset-inline-start:' +
        x(ls.from).toFixed(1) +
        '%;width:' +
        (x(ls.to) - x(ls.from)).toFixed(1) +
        '%"></span>' +
        (f.on && f.phase === 'day' && now > a && now < b ? '<i class="fr-now" style="inset-inline-start:' + x(now).toFixed(1) + '%"></i>' : '') +
        '</div><div class="fr-ends"><span>' +
        esc(A.T('Fajr')) +
        ' ' +
        A.fmtT(t.fajr) +
        '</span><span>' +
        esc(A.T('Maghrib')) +
        ' ' +
        A.fmtT(t.maghrib) +
        '</span></div><div class="fr-hours">' +
        hourRow('mb', 'At the minbar', 'From when the imam sits until the prayer ends', mb, f.now === 'minbar') +
        hourRow('ls', 'The last hour', 'After ʿAṣr, the hour before Maghrib', ls, f.now === 'last') +
        '</div><button type="button" class="btn ghost sm fr-why" data-a="fr-ev" data-k="hour">' +
        ic('info', 's') +
        '<span>' +
        esc(A.T('Why these two hours')) +
        '</span></button></section>';
    }
    /* the prayer itself: Jumuʿah for a brother; for a sister, Jumuʿah with the imam or Ẓuhr at home */
    if (t) {
      var sis = sister(),
        exc = S.excused && S.excused.on && sis,
        prd = (S.prayed[key] || {}).dhuhr,
        can = f.on && Date.now() >= t.dhuhr && !exc;
      h +=
        '<section class="card fr-pray' +
        (prd ? ' on' : '') +
        '">' +
        (can
          ? '<button type="button" class="fr-tk" data-a="fr-prayed" data-d="' +
            key +
            '" role="checkbox" aria-checked="' +
            !!prd +
            '" aria-label="' +
            esc(A.T(sis ? 'Jumuʿah or Ẓuhr' : 'Ṣalāt al-Jumuʿah')) +
            '">' +
            (prd ? ic('check', 's') : '') +
            '</button>'
          : '<span class="fr-pi">' + ic('mosque', 's') + '</span>') +
        '<div class="grow"><div class="t">' +
        esc(A.T(sis ? 'Jumuʿah or Ẓuhr' : 'Ṣalāt al-Jumuʿah')) +
        ' <span class="fr-pt">' +
        A.fmtT(t.dhuhr) +
        '</span></div><div class="s">' +
        esc(
          A.T(
            exc
              ? 'On a break from ṣalāh'
              : sis
                ? 'Not required of women: pray it with the imam, or Ẓuhr at home'
                : 'Two rakʿahs after the khuṭbah, in congregation, in place of Ẓuhr'
          )
        ) +
        '</div></div><button type="button" class="ib ghost sm" data-a="fr-who" aria-label="' +
        esc(A.T('The evidence')) +
        '">' +
        ic('info', 's') +
        '</button></section>';
    }
    /* Sūrat al-Kahf */
    var kp = j.kahf,
      read = Object.keys(j.days).filter(function (d) {
        return j.days[d].kahf;
      }).length;
    h +=
      '<a class="card fr-kahf press" href="#/kahf"><div class="fr-kahf-a" lang="ar">الكهف</div><div class="grow"><div class="eyebrow">' +
      esc(A.T('Sūrat al-Kahf')) +
      '</div><div class="ttl">' +
      esc(rec.kahf ? A.T('Read this Jumuʿah') : kp.page ? A.T('Continue from page') + ' ' + A.fmtN(293 + kp.page) : A.T('Read on its Madani pages')) +
      '</div><div class="sub">' +
      esc(A.T('110 verses · 12 pages')) +
      (read ? ' · ' + A.fmtN(read) + ' ' + esc(A.T(read === 1 ? 'Jumuʿah read' : 'Jumuʿahs read')) : '') +
      '</div></div>' +
      (rec.kahf ? '<span class="fr-ok">' + ic('check', 's') + '</span>' : ic('right', 's')) +
      '</a>';
    /* the Sunnahs */
    var list = sunnahs(),
      main = list.filter(function (s) {
        return !s.opt;
      }),
      opt = list.filter(function (s) {
        return s.opt;
      });
    var row = function (s) {
      var on = !!rec[s.x.id];
      return (
        '<div class="fr-s' +
        (on ? ' on' : '') +
        '"><button type="button" class="fr-tk" data-a="fr-tick" data-k="' +
        s.x.id +
        '" role="checkbox" aria-checked="' +
        on +
        '" aria-label="' +
        esc(A.T(s.x.t)) +
        '">' +
        (on ? ic('check', 's') : '') +
        '</button><div class="grow"><div class="t">' +
        esc(A.T(s.x.t)) +
        '</div><div class="s">' +
        esc(A.T(s.x.d)) +
        '</div></div><button type="button" class="ib ghost sm" data-a="fr-ev" data-k="' +
        s.x.id +
        '" aria-label="' +
        esc(A.T('The evidence')) +
        '">' +
        ic('info', 's') +
        '</button></div>'
      );
    };
    var dc = doneCount(rec);
    h +=
      '<div class="sec"><h2>' +
      esc(A.T('The Sunnahs of the day')) +
      '</h2><span class="aside">' +
      A.fmtN(dc.n) +
      ' / ' +
      A.fmtN(dc.of) +
      '</span></div><div class="card pad0 fr-list">' +
      main.map(row).join('') +
      '</div>';
    if (opt.length)
      h +=
        '<div class="sec"><h2>' +
        esc(A.T('If you attend the masjid')) +
        '</h2></div><div class="card pad0 fr-list">' +
        opt.map(row).join('') +
        '</div>';
    h +=
      '<div class="card fr-fajr">' +
      ic('sunrise', 's') +
      '<div class="grow"><div class="t">' +
      esc(A.T('Fajr on Jumuʿah')) +
      '</div><div class="s">' +
      esc(A.T('The Prophet ﷺ recited as-Sajdah and al-Insān')) +
      '</div></div><button type="button" class="ib ghost sm" data-a="fr-fajr" aria-label="' +
      esc(A.T('The evidence')) +
      '">' +
      ic('info', 's') +
      '</button></div>';
    /* settings: the masjid's khuṭbah, and the reminders */
    var N = S.notif;
    h +=
      '<div class="sec"><h2>' +
      esc(A.T('Your Jumuʿah')) +
      '</h2></div><div class="card pad0"><div class="list">' +
      '<div class="set"><div class="grow"><div class="t">' +
      esc(A.T('Khuṭbah at your masjid')) +
      '</div><div class="s">' +
      esc(kh(j.khutbah)) +
      '</div></div><div class="ctl">' +
      A.stepper(t ? A.fmtTxt(t.dhuhr + j.khutbah * MIN) : kh(j.khutbah), 'fr-kh') +
      '</div></div>' +
      '<div class="set"><div class="grow"><div class="t">' +
      esc(A.T('Friday reminders')) +
      '</div><div class="s">' +
      esc(A.T('Al-Kahf in the morning, the last hour before Maghrib')) +
      '</div></div><div class="ctl">' +
      A.sw(N.enabled && N.friday && N.friday.on, 'fr-notif') +
      '</div></div>' +
      '<div class="set"><div class="grow"><div class="t">' +
      esc(A.T('The hour, over other apps')) +
      '</div><div class="s">' +
      esc(A.T('A card on screen when the last hour begins')) +
      '</div></div><div class="ctl">' +
      A.sw(j.overlay, 'fr-ov') +
      '</div></div></div></div>';
    return {
      html: h,
      title: A.T('Jumuʿah'),
      tick: function (el) {
        void el;
      }
    };
  };
  function hourRow(cls, title, sub, w, on) {
    return (
      '<div class="fr-hr ' +
      cls +
      (on ? ' now' : '') +
      '"><i></i><div class="grow"><div class="t">' +
      esc(A.T(title)) +
      (on ? ' <span class="fr-live">' + esc(A.T('Now')) + '</span>' : '') +
      '</div><div class="s">' +
      esc(A.T(sub)) +
      '</div></div><div class="fr-tm">' +
      esc(A.fmtTxt(w.from)) +
      '<small>' +
      esc(A.T('to') + ' ' + A.fmtTxt(w.to)) +
      '</small></div></div>'
    );
  }
  function kh(m) {
    if (!m) return A.T('At Dhuhr');
    return A.fmtN(Math.abs(m)) + ' ' + A.T(m > 0 ? 'min after Dhuhr' : 'min before Dhuhr');
  }
  A.acts['fr-kh'] = function (el) {
    var j = J();
    j.khutbah = A.clamp(j.khutbah + +el.dataset.d * 5, -60, 120);
    A.save();
    A.rerender();
  };
  A.acts['fr-notif'] = function () {
    var N = S.notif;
    if (!N.enabled) {
      A.enableNotifs(function (ok) {
        if (ok) {
          N.friday.on = true;
          A.save();
          A.rerender();
        }
      });
      return;
    }
    N.friday.on = !N.friday.on;
    A.save();
    A.rerender();
  };
  A.acts['fr-ov'] = function () {
    var j = J();
    j.overlay = !j.overlay;
    A.save();
    if (j.overlay && A.N.call('overlayOk') === false) A.N.call('openOverlay');
    A.rerender();
  };
  A.acts['fr-prayed'] = function (el) {
    var d = el.dataset.d,
      o = (S.prayed[d] = S.prayed[d] || {});
    if (o.dhuhr) delete o.dhuhr;
    else o.dhuhr = Date.now();
    if (!Object.keys(o).length) delete S.prayed[d];
    A.save();
    A.N.haptic(o.dhuhr ? 'success' : 'tick');
    A.rerender();
  };
  /* who Jumuʿah is required of: a reference and its grade, and the scholars' agreement on a woman who attends */
  A.acts['fr-who'] = function () {
    A.sheet(
      A.T('Who must attend Jumuʿah'),
      '<div class="fr-ref"><b>' +
        esc(A.T('The ruling, in summary')) +
        '</b><span>' +
        esc(A.T('Required of every adult Muslim man who is resident and well; not required of a woman, a child, or one who is ill')) +
        '</span><span>' +
        esc(A.T('Abū Dāwūd 1067 · Ṣaḥīḥ (al-Albānī)')) +
        '</span></div><p class="fr-note">' +
        esc(
          A.T(
            'A woman who prays Jumuʿah with the imam need not pray Ẓuhr; Ibn al-Mundhir reports the scholars agreed on this. A traveller and one who is ill pray Ẓuhr.'
          )
        ) +
        '</p><a class="btn ghost sm" href="#/learn/jumuah">' +
        ic('mosque', 's') +
        '<span>' +
        esc(A.T('Learn the Jumuʿah prayer')) +
        '</span></a>'
    );
  };
  A.acts['fr-fajr'] = function () {
    A.sheet(A.T('Fajr on Jumuʿah'), A.said('bukhari:891') + cite('bukhari:891'));
  };

  /* ================= Sūrat al-Kahf on its Madani pages ================= */
  var K = { mode: 'mushaf', playing: false, verse: 0, from: 0 },
    loaded = {};
  /* the page fonts are declared in friday.css; ask for one and wait until it is ready before fitting its lines */
  function fontFor(p) {
    var fam = 'kf' + p;
    if (loaded[p]) return loaded[p];
    loaded[p] =
      document.fonts && document.fonts.load
        ? document.fonts.load('20px ' + fam).then(
            function () {
              return fam;
            },
            function () {
              return fam;
            }
          )
        : Promise.resolve(fam);
    return loaded[p];
  }
  function pageHTML(pg) {
    var h = '<section class="kf-page" data-p="' + pg.p + '" style="font-family:kf' + pg.p + ',serif"><div class="kf-lines">';
    if (pg.p === 293)
      h +=
        '<div class="kf-ban"><span lang="ar">سورة الكهف</span></div><div class="kf-bism" lang="ar">' + esc(window.KAHF.bismillah) + '</div>';
    pg.lines.forEach(function (ln) {
      h +=
        '<div class="kf-l" data-l="' +
        ln.l +
        '">' +
        ln.w
          .map(function (w) {
            return '<span class="kf-w' + (w[2] ? ' end' : '') + '" data-v="' + w[1] + '">' + esc(w[0]) + '</span>';
          })
          .join('') +
        '</div>';
    });
    h += '</div><footer class="kf-pn">' + A.fmtN(pg.p) + '</footer></section>';
    return h;
  }
  function trHTML() {
    return window.KAHF.verses
      .map(function (v) {
        return (
          (v.n === 75 ? '<div class="kf-juz">' + esc(A.T('Juzʾ')) + ' ' + A.fmtN(16) + '</div>' : '') +
          '<article class="kf-v" data-v="' +
          v.n +
          '"><div class="kf-vn">' +
          A.fmtN(v.n) +
          '</div><p class="kf-va" lang="ar">' +
          esc(v.ar) +
          '</p>' +
          (A.ar() ? '' : '<p class="kf-ve"><span>' + esc(A.T('Translation')) + '</span>' + esc(v.en) + '</p>') +
          '</article>'
        );
      })
      .join('');
  }
  A.V.kahf = function () {
    var KH = window.KAHF;
    if (!KH) return { html: '<p>…</p>' };
    var j = J(),
      f = A.jumuah(),
      done = f.on && f.rec.kahf;
    var h =
      '<div class="kf" data-mode="' +
      K.mode +
      '">' +
      '<header class="kf-top"><button type="button" class="ib ghost" data-a="kf-close" aria-label="' +
      esc(A.T('Close')) +
      '">' +
      ic('close', 's') +
      '</button><div class="kf-ttl"><b>' +
      esc(A.T('Sūrat al-Kahf')) +
      '</b><small id="kfPg"></small></div>' +
      '<div class="seg sm kf-mode"><button type="button" data-a="kf-mode" data-m="mushaf" aria-pressed="' +
      (K.mode === 'mushaf') +
      '">' +
      esc(A.T('Mushaf')) +
      '</button><button type="button" data-a="kf-mode" data-m="tr" aria-pressed="' +
      (K.mode === 'tr') +
      '">' +
      esc(A.T(A.ar() ? 'Verses' : 'Translation')) +
      '</button></div></header>' +
      '<div class="kf-body">' +
      (K.mode === 'mushaf' ? '<div class="kf-track" id="kfTrack" dir="rtl">' + KH.pages.map(pageHTML).join('') + '</div>' : '<div class="kf-tr" id="kfTr">' + trHTML() + '</div>') +
      '</div>' +
      '<footer class="kf-foot"><div class="kf-au" data-au-tag="kahf"><button type="button" class="kf-play" data-a="kf-play" aria-label="' +
      esc(A.T('Listen')) +
      '">' +
      ic(K.playing ? 'pause' : 'play', 's fill') +
      '</button><div class="grow"><div class="t" id="kfAuT">' +
      esc(A.T(K.playing ? 'Reciting' : 'Listen · Mishary al-ʿAfāsī')) +
      '</div><div class="au-dl"><i></i></div></div></div>' +
      '<button type="button" class="btn ' +
      (done ? 'ghost' : 'pri') +
      ' sm kf-done" data-a="kf-done">' +
      ic('check', 's') +
      '<span>' +
      esc(A.T(done ? 'Read this Jumuʿah' : 'I have read it')) +
      '</span></button></footer></div>';
    void j;
    return {
      html: h,
      title: A.T('Sūrat al-Kahf'),
      bare: true,
      mount: mountKahf
    };
  };
  function fit(page) {
    /* the full lines of a Madani page share one width: size the font so the widest fills the page */
    var lines = $('.kf-lines', page),
      ls = page.querySelectorAll('.kf-l');
    if (!lines || !ls.length) return;
    lines.style.setProperty('--kf', '40px');
    var w = 0;
    Array.prototype.forEach.call(ls, function (l) {
      l.style.display = 'inline-flex';
      w = Math.max(w, l.scrollWidth);
      l.style.display = '';
    });
    lines.style.width = '';
    var cs = getComputedStyle(lines),
      padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
      padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom),
      room = lines.clientWidth - padX;
    if (!(w > 0 && room > 0)) return;
    /* the page fits the screen both ways: by its width, and by the height its lines (and the sūrah's header) need */
    var byW = ((40 * room) / w) * 0.985,
      extra = page.dataset.p === '293' ? 4.6 : 0,
      tall = page.clientHeight - padY - 46,
      byH = tall / ((ls.length + extra) * 1.95),
      f = Math.max(12, Math.min(byW, byH));
    lines.style.setProperty('--kf', f + 'px');
    if (byH < byW) lines.style.width = Math.ceil((w * f) / 40 / 0.985 + padX) + 'px';
  }
  function mountKahf(el) {
    var j = J(),
      track = $('#kfTrack', el),
      pg = $('#kfPg', el);
    var setPg = function (i) {
      j.kahf.page = i;
      var p = 293 + i;
      if (pg) pg.textContent = A.T('Page') + ' ' + A.fmtN(p) + ' · ' + A.T('Juzʾ') + ' ' + A.fmtN(firstVerse(i) >= 75 ? 16 : 15);
      A.save();
    };
    if (track) {
      var pages = Array.prototype.slice.call(track.querySelectorAll('.kf-page'));
      pages.forEach(function (p) {
        fontFor(p.dataset.p).then(function () {
          requestAnimationFrame(function () {
            fit(p);
          });
        });
      });
      var io = new IntersectionObserver(
        function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && e.intersectionRatio > 0.55) setPg(pages.indexOf(e.target));
          });
        },
        { root: track, threshold: [0.55] }
      );
      pages.forEach(function (p) {
        io.observe(p);
      });
      var start = pages[Math.min(pages.length - 1, j.kahf.page || 0)];
      requestAnimationFrame(function () {
        if (start) start.scrollIntoView({ block: 'nearest', inline: 'start' });
      });
      if (!K.resize) {
        K.resize = true;
        addEventListener('resize', function () {
          Array.prototype.forEach.call(document.querySelectorAll('.kf-page'), fit);
        });
      }
      /* a verse tapped shows its translation */
      track.addEventListener('click', function (e) {
        var w = e.target.closest('.kf-w');
        if (!w) return;
        var n = +w.dataset.v,
          v = window.KAHF.verses[n - 1];
        mark(n);
        A.sheet(
          A.T('Al-Kahf') + ' ' + A.fmtN(18) + ':' + A.fmtN(n),
          '<p class="hd-ar hd-quran" lang="ar">' +
            esc(v.ar) +
            '</p>' +
            (A.ar() ? '' : '<p class="hd-en">' + esc(v.en) + '</p>') +
            '<div class="refs"><a href="https://quran.com/18/' +
            n +
            '" data-a="ext">' +
            ic('link', 'xs') +
            'Qurʾān 18:' +
            n +
            '</a></div><button type="button" class="btn ghost sm" data-a="kf-from" data-v="' +
            n +
            '">' +
            ic('play', 's') +
            '<span>' +
            esc(A.T('Listen from here')) +
            '</span></button>'
        );
      });
    } else {
      setPg(j.kahf.page || 0);
      /* the verses open where the pages were left */
      var v0 = $('.kf-v[data-v="' + firstVerse(j.kahf.page || 0) + '"]', el);
      if (v0 && (j.kahf.page || 0) > 0)
        requestAnimationFrame(function () {
          v0.scrollIntoView({ block: 'start' });
        });
    }
    if (K.playing && K.verse) mark(K.verse);
  }
  function mark(n) {
    $$('.kf-w.on, .kf-v.on').forEach(function (x) {
      x.classList.remove('on');
    });
    $$('.kf-w[data-v="' + n + '"], .kf-v[data-v="' + n + '"]').forEach(function (x) {
      x.classList.add('on');
    });
  }
  function $$(s) {
    return Array.prototype.slice.call(document.querySelectorAll(s));
  }
  A.acts['kf-close'] = function () {
    stopKahf();
    A.goBack(A.jumuah().on ? '#/jumuah' : '#/');
  };
  A.acts['kf-mode'] = function (el) {
    K.mode = el.dataset.m;
    A.rerender();
  };
  A.acts['kf-done'] = function () {
    var f = A.jumuah(),
      key = f.on ? f.key : null;
    if (!key) {
      J().kahf.last = Date.now();
      A.save();
      A.toast(A.T('May Allah accept it. It counts for Jumuʿah from Maghrib on Thursday.'), 'heart');
      return;
    }
    var r = day(key);
    r.kahf = Date.now();
    J().kahf.page = 0;
    A.save();
    A.N.haptic('success');
    if (A.fx && A.fx.done) A.fx.done();
    A.toast(A.T('May Allah grant you light between the two Fridays'), 'heart');
    A.rerender();
  };

  /* ---------- recitation: verse by verse, the reciting verse lit and its page turned to ---------- */
  function files(from) {
    var out = [];
    for (var n = from; n <= 110; n++) {
      var k = '018' + ('00' + n).slice(-3);
      out.push({ n: 'q' + k + '.mp3', u: 'https://everyayah.com/data/Alafasy_128kbps/' + k + '.mp3' });
    }
    return out;
  }
  var web = { el: null, i: 0, list: [] };
  function playFrom(n) {
    var list = files(n);
    K.from = n;
    K.playing = true;
    if (!A.N.has) {
      web.list = list;
      web.i = 0;
      webNext();
      paintAu();
      return;
    }
    var have = [];
    try {
      have = JSON.parse(A.N.call('audioHave', JSON.stringify(list.map(function (f) { return f.n; }))) || '[]');
    } catch (e) {}
    if (have.length < list.length) {
      K.playing = false;
      var t = $('#kfAuT');
      if (t) t.textContent = A.T('Downloading the recitation…');
      A.audio.download(list, 'kahf', function (ok) {
        if (ok) playFrom(n);
        else paintAu();
      });
      return;
    }
    A.N.call('audioPlay', JSON.stringify(list.map(function (f) { return f.n; })), 1);
    paintAu();
  }
  function webNext() {
    if (web.el) web.el.pause();
    if (web.i >= web.list.length) return endKahf();
    K.verse = K.from + web.i;
    onVerse(K.verse);
    web.el = new Audio(web.list[web.i].u);
    web.el.onended = function () {
      web.i++;
      webNext();
    };
    web.el.onerror = endKahf;
    web.el.play().catch(endKahf);
  }
  function stopKahf() {
    if (!K.playing) return;
    K.playing = false;
    if (web.el) {
      web.el.pause();
      web.el = null;
    } else A.N.call('audioStop');
    paintAu();
  }
  function endKahf() {
    K.playing = false;
    web.el = null;
    paintAu();
  }
  function onVerse(n) {
    if (n === K.verse && $('.kf-w.on[data-v="' + n + '"], .kf-v.on[data-v="' + n + '"]')) return;
    K.verse = n;
    mark(n);
    var w = $('.kf-w[data-v="' + n + '"]') || $('.kf-v[data-v="' + n + '"]');
    if (w) {
      var page = w.closest('.kf-page');
      if (page) page.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'smooth' });
      else w.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
  function paintAu() {
    var b = $('.kf-play'),
      t = $('#kfAuT');
    if (b) b.innerHTML = ic(K.playing ? 'pause' : 'play', 's fill');
    if (t) t.textContent = A.T(K.playing ? 'Reciting' : 'Listen · Mishary al-ʿAfāsī');
  }
  A.acts['kf-play'] = function () {
    if (K.playing) stopKahf();
    else playFrom(K.verse && K.verse < 110 ? K.verse : (window.KAHF.pages[J().kahf.page || 0] || {}).lines ? firstVerse(J().kahf.page || 0) : 1);
  };
  A.acts['kf-from'] = function (el) {
    A.closeSheets();
    stopKahf();
    playFrom(+el.dataset.v);
  };
  function firstVerse(i) {
    var pg = window.KAHF.pages[i];
    return pg && pg.lines[0] && pg.lines[0].w[0] ? pg.lines[0].w[0][1] : 1;
  }
  /* the shared player answers to the reader while al-Kahf is reciting */
  window.__native = window.__native || {};
  var pos0 = window.__native.onAudioPos,
    end0 = window.__native.onAudioEnd;
  window.__native.onAudioPos = function (qi) {
    if (K.playing) return onVerse(K.from + qi);
    if (pos0) pos0.apply(this, arguments);
  };
  window.__native.onAudioEnd = function () {
    if (K.playing) return endKahf();
    if (end0) end0.apply(this, arguments);
  };

  /* ---------- Arabic ---------- */
  if (A.addAr)
    A.addAr({
      'Yawm al-Jumuʿah': 'يوم الجمعة',
      'The night of Jumuʿah': 'ليلة الجمعة',
      'Next Jumuʿah': 'الجمعة القادمة',
      Jumuʿah: 'الجمعة',
      'Read Sūrat al-Kahf': 'قراءة سورة الكهف',
      'In the night or the day of Jumuʿah': 'في ليلة الجمعة أو يومها',
      'Send abundant ṣalawāt': 'الإكثار من الصلاة على النبي ﷺ',
      'They are presented to the Prophet ﷺ': 'تُعرض على النبي ﷺ',
      'Duʿāʾ in the hour of response': 'الدعاء في ساعة الإجابة',
      'At the minbar, or the last hour before Maghrib': 'عند المنبر أو آخر ساعة قبل المغرب',
      Ghusl: 'الغسل',
      'Before going to the prayer': 'قبل الذهاب إلى الصلاة',
      'Siwāk and perfume': 'السواك والطيب',
      'If you have it': 'إن وجد',
      'Go early': 'التبكير',
      'The first hour is as offering a camel': 'الساعة الأولى كمن قرّب بدنة',
      'Listen in silence': 'الإنصات للخطبة',
      'Even “be quiet” breaks it': 'حتى قول «أنصت» لغو',
      'The last hour before Maghrib': 'آخر ساعة قبل المغرب',
      'Ask now: this is the hour to seek': 'ادعُ الآن، فهذه الساعة تُتحرّى',
      'From the minbar to the prayer’s end': 'من جلوس الإمام إلى انقضاء الصلاة',
      'Listen, and ask in the pauses': 'أنصت، وادعُ في السكتات',
      'Read al-Kahf and send abundant ṣalawāt': 'اقرأ الكهف وأكثر من الصلاة على النبي ﷺ',
      'Ghusl, go early, and read al-Kahf': 'اغتسل وبكّر واقرأ الكهف',
      'After the prayer': 'بعد الصلاة',
      'The last hour before Maghrib comes next': 'وتأتي بعدها آخر ساعة قبل المغرب',
      'Fajr at': 'الفجر',
      'Khuṭbah at': 'الخطبة',
      'Last hour from': 'آخر ساعة من',
      'Al-Kahf': 'الكهف',
      Ṣalawāt: 'الصلاة على النبي',
      Sunnahs: 'سنن',
      'At the minbar': 'عند المنبر',
      'From when the imam sits until the prayer ends': 'من جلوس الإمام إلى أن تُقضى الصلاة',
      'The last hour': 'آخر ساعة',
      'After ʿAṣr, the hour before Maghrib': 'بعد العصر، الساعة التي قبل المغرب',
      'Why these two hours': 'لماذا هاتان الساعتان',
      'Sūrat al-Kahf': 'سورة الكهف',
      'Read this Jumuʿah': 'قُرئت هذه الجمعة',
      'Continue from page': 'تابع من الصفحة',
      'Read on its Madani pages': 'اقرأها في صفحات المصحف المدني',
      '110 verses · 12 pages': '١١٠ آيات · ١٢ صفحة',
      'Jumuʿah read': 'جمعة قُرئت',
      'Jumuʿahs read': 'جُمع قُرئت',
      'The Sunnahs of the day': 'سنن اليوم',
      'If you attend the masjid': 'إن حضرتِ المسجد',
      'The evidence': 'الدليل',
      'Fajr on Jumuʿah': 'فجر الجمعة',
      'The Prophet ﷺ recited as-Sajdah and al-Insān': 'كان النبي ﷺ يقرأ السجدة والإنسان',
      'Your Jumuʿah': 'جمعتك',
      'Khuṭbah at your masjid': 'الخطبة في مسجدك',
      'At Dhuhr': 'عند الظهر',
      'min after Dhuhr': 'د بعد الظهر',
      'min before Dhuhr': 'د قبل الظهر',
      'Friday reminders': 'تذكيرات الجمعة',
      'Al-Kahf in the morning, the last hour before Maghrib': 'الكهف صباحًا، وآخر ساعة قبل المغرب',
      'The hour, over other apps': 'الساعة فوق التطبيقات الأخرى',
      'A card on screen when the last hour begins': 'بطاقة على الشاشة حين تبدأ آخر ساعة',
      'These are for the night and day of Jumuʿah': 'هذه لليلة الجمعة ويومها',
      'Reading Sūrat al-Kahf on Jumuʿah': 'قراءة سورة الكهف يوم الجمعة',
      'al-Ḥākim and al-Bayhaqī · Ṣaḥīḥ (al-Albānī, Ṣaḥīḥ al-Jāmiʿ 6470)': 'الحاكم والبيهقي · صحيح (الألباني، صحيح الجامع ٦٤٧٠)',
      'And its first ten verses': 'وعشر آيات من أولها',
      'Ibn al-Qayyim, in Zād al-Maʿād, held these two the strongest of the opinions on the hour.': 'ورجّح ابن القيم في زاد المعاد هذين القولين على سائر الأقوال في الساعة.',
      Mushaf: 'المصحف',
      Verses: 'الآيات',
      'Listen · Mishary al-ʿAfāsī': 'استمع · مشاري العفاسي',
      'I have read it': 'قرأتها',
      'Listen from here': 'استمع من هنا',
      'Downloading the recitation…': 'جارٍ تنزيل التلاوة…',
      'May Allah accept it. It counts for Jumuʿah from Maghrib on Thursday.': 'تقبّل الله. تُحسب للجمعة من مغرب الخميس.',
      'May Allah grant you light between the two Fridays': 'نوّر الله لك ما بين الجمعتين',
      Page: 'الصفحة',
      Juzʾ: 'الجزء',
      'Jumuʿah or Ẓuhr': 'الجمعة أو الظهر',
      to: 'إلى',
      'The last hour · Maghrib in': 'آخر ساعة · المغرب بعد',
      'The hour at the minbar': 'الساعة عند المنبر',
      'Listen in silence; ask when the imam sits, and in the prayer': 'أنصت، وادعُ حين يجلس الإمام وفي الصلاة',
      'The last hour begins at': 'تبدأ آخر ساعة',
      'Seek the hour of response with duʿāʾ before Maghrib': 'تحرَّ ساعة الإجابة بالدعاء قبل المغرب',
      'Ṣalāt al-Jumuʿah': 'صلاة الجمعة',
      'On a break from ṣalāh': 'في فترة انقطاع عن الصلاة',
      'Not required of women: pray it with the imam, or Ẓuhr at home': 'لا تجب على المرأة: صلّيها مع الإمام، أو صلّي الظهر في البيت',
      'Two rakʿahs after the khuṭbah, in congregation, in place of Ẓuhr': 'ركعتان بعد الخطبة في جماعة، بدل الظهر',
      'Who must attend Jumuʿah': 'على من تجب الجمعة',
      'The ruling, in summary': 'الحكم باختصار',
      'Required of every adult Muslim man who is resident and well; not required of a woman, a child, or one who is ill': 'تجب على كل مسلم بالغ مقيم صحيح، ولا تجب على المرأة ولا الصبي ولا المريض',
      'Abū Dāwūd 1067 · Ṣaḥīḥ (al-Albānī)': 'أبو داود ١٠٦٧ · صحيح (الألباني)',
      'A woman who prays Jumuʿah with the imam need not pray Ẓuhr; Ibn al-Mundhir reports the scholars agreed on this. A traveller and one who is ill pray Ẓuhr.': 'المرأة إذا صلّت الجمعة مع الإمام أجزأتها عن الظهر، ونقل ابن المنذر الإجماع على ذلك. والمسافر والمريض يصلّيان الظهر.',
      'Learn the Jumuʿah prayer': 'تعلّم صلاة الجمعة'
    });
})();
