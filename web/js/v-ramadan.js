/* Ramaḍān mode: suhūr and ifṭār countdowns, self-filling fast log, taraweeh, khatm, the last ten nights. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    esc = A.esc,
    ic = A.icon;
  var MIN = 60000;
  function R() {
    var r = (S.ramadan = S.ramadan || {});
    r.skip = r.skip || {};
    r.taraweeh = r.taraweeh || {};
    r.khatm = r.khatm || { juz: {}, done: 0 };
    return r;
  }

  A.isRamadan = function (key) {
    return A.hijri(key).m === 9;
  };
  /* first civil day of this year's Ramaḍān (or the next one) and its length */
  function bounds(fromKey) {
    var k = fromKey,
      h = A.hijri(k),
      guard = 0;
    if (h.m !== 9) {
      while (A.hijri(k).m !== 9 && guard++ < 400) k = A.shift(k, 1);
    } else {
      while (A.hijri(A.shift(k, -1)).m === 9 && guard++ < 40) k = A.shift(k, -1);
    }
    var start = k,
      len = 0;
    while (A.hijri(A.shift(start, len)).m === 9 && len < 31) len++;
    return { start: start, len: len };
  }
  A.ramadanInfo = function () {
    var k = A.today(),
      on = A.isRamadan(k),
      b = bounds(k),
      day = 0,
      d;
    if (on) {
      d = b.start;
      while (d < k && day < 40) {
        d = A.shift(d, 1);
        day++;
      }
    } else {
      d = k;
      while (d < b.start && day < 400) {
        d = A.shift(d, 1);
        day++;
      }
    }
    return { on: on, start: b.start, len: b.len, day: on ? day + 1 : 0, daysTo: on ? 0 : day };
  };
  /* fasts fill themselves in for every Ramaḍān day up to today, except break days and days marked not fasted */
  A.ramadanAutofill = function () {
    var info = A.ramadanInfo();
    if (!info.on) return;
    var r = R(),
      k = info.start,
      today = A.today(),
      t = A.pday(today),
      changed = false;
    while (k <= today) {
      var started = k < today || !t || Date.now() >= t.fajr;
      if (started && !S.fasts[k] && !r.skip[k] && !A.isExcused(k)) {
        S.fasts[k] = 'ramadan';
        changed = true;
      }
      k = A.shift(k, 1);
    }
    if (changed) A.save();
  };
  function imsak(t) {
    return t.fajr - (S.prefs.imsak || 0) * MIN;
  }
  function phase() {
    var k = A.today(),
      t = A.pday(k),
      now = Date.now();
    if (!t) return null;
    if (now < imsak(t))
      return { label: 'Suhūr ends', at: imsak(t), from: A.pday(A.shift(k, -1)).maghrib, kind: 'suhur' };
    if (now < t.maghrib) return { label: 'Ifṭār', at: t.maghrib, from: t.fajr, kind: 'iftar' };
    var tm = A.pday(A.shift(k, 1));
    return { label: A.isRamadan(A.shift(k, 1)) ? 'Suhūr ends' : 'Fajr', at: imsak(tm), from: t.maghrib, kind: 'suhur' };
  }

  /* Today card */
  A.ramadanCard = function () {
    var info = A.ramadanInfo();
    if (!info.on)
      return info.daysTo > 0 && info.daysTo <= 30
        ? '<a class="occ slim press h-gold" href="#/ramadan"><div class="badge s" style="--h:var(--goldh)">' +
            ic('moonstar', 's') +
            '</div><div class="grow"><div class="t">Ramaḍān in ' +
            A.plural(info.daysTo, 'day') +
            '</div></div><span class="faint">' +
            ic('right', 's') +
            '</span></a>'
        : '';
    A.ramadanAutofill();
    var k = A.today(),
      ph = phase(),
      fasting = !!S.fasts[k],
      exc = A.isExcused(k),
      now = Date.now();
    var h =
      '<a class="card col h-gold glowcard rm-hero" href="#/ramadan">' +
      (A.lanterns ? A.lanterns() : '') +
      '<div class="spread"><div><div class="eyebrow" style="color:var(--goldh)">Ramaḍān · day ' +
      info.day +
      ' of ' +
      info.len +
      '</div><div class="ar" style="font-size:20px;color:var(--gold2);margin-top:2px">رمضان مبارك</div></div>' +
      A.ring(info.day / info.len, 46, info.day, 'var(--goldh)', 3.5) +
      '</div>';
    if (ph) {
      var f = A.clamp((now - ph.from) / (ph.at - ph.from), 0, 1);
      h +=
        '<div class="spread" style="align-items:flex-end"><div><div class="muted small">' +
        ph.label +
        ' at ' +
        A.fmtTxt(ph.at) +
        '</div><div class="num" style="font-size:clamp(30px,9vw,38px);font-weight:700;line-height:1.1" data-rm-cd>' +
        A.fmtCountdown(ph.at - now) +
        '</div></div><span class="chip' +
        (fasting ? ' on' : '') +
        '">' +
        (exc ? 'On a break' : fasting ? ic('check', 'xs') + 'Fasting' : 'Not fasting') +
        '</span></div><div class="bar"><i data-rm-bar style="width:' +
        (f * 100).toFixed(1) +
        '%"></i></div>';
    }
    return h + '</a>';
  };
  A.ramadanTick = function (el) {
    var cd = $('[data-rm-cd]', el);
    if (!cd) return;
    var ph = phase();
    if (!ph) return;
    cd.textContent = A.fmtCountdown(ph.at - Date.now());
    var b = $('[data-rm-bar]', el);
    if (b) b.style.width = (A.clamp((Date.now() - ph.from) / (ph.at - ph.from), 0, 1) * 100).toFixed(1) + '%';
  };

  /* full page */
  A.V.ramadan = function () {
    var info = A.ramadanInfo(),
      r = R(),
      k = A.today();
    A.ramadanAutofill();
    var h =
      A.back('Back', '#/') +
      '<header class="top"><div class="tt"><div class="eyebrow">' +
      (info.on ? 'Day ' + info.day + ' of ' + info.len : 'Begins ' + esc(A.fmtDate(info.start, 'short'))) +
      '</div><h1>Ramaḍān' +
      (info.on ? ' <em>Mubārak</em>' : '') +
      '</h1></div></header>';
    if (info.on)
      h += A.ramadanCard()
        .replace(
          '<a class="card col h-gold glowcard rm-hero" href="#/ramadan">',
          '<div class="card col h-gold glowcard rm-hero">'
        )
        .replace(/<\/a>$/, '</div>');
    else
      h +=
        '<div class="card col h-gold"><div class="spread"><div><div class="eyebrow">Ramaḍān begins in</div><div class="num" style="font-size:clamp(34px,10vw,44px);font-weight:700">' +
        A.plural(info.daysTo, 'day') +
        '</div><div class="muted small">' +
        esc(A.fmtDate(info.start)) +
        ', by the Umm al-Qurā calendar. Local moon sighting may differ by a day.</div></div><span class="badge">' +
        ic('moonstar') +
        '</span></div></div>';
    /* fasting grid */
    var fasted = 0,
      cells = '';
    for (var i = 0; i < info.len; i++) {
      var d = A.shift(info.start, i),
        st = S.fasts[d] ? 'on' : A.isExcused(d) ? 'ex' : r.skip[d] ? 'off' : d > k ? 'fut' : '';
      if (S.fasts[d]) fasted++;
      cells +=
        '<button type="button" class="rmd ' +
        st +
        (d === k ? ' today' : '') +
        '" data-a="rm-day" data-k="' +
        d +
        '"' +
        (d > k ? ' disabled' : '') +
        ' aria-label="Day ' +
        (i + 1) +
        (st === 'on' ? ', fasted' : st === 'ex' ? ', break' : '') +
        '">' +
        (i + 1) +
        '</button>';
    }
    if (!info.on && info.daysTo > 30)
      h +=
        '<div class="sec"><h2>Fasts</h2></div><div class="card row h-gold" style="gap:12px"><span class="badge s">' +
        ic('cal', 's') +
        '</span><div class="grow muted small">The fasting log opens a month before Ramaḍān.</div></div>';
    else
      h +=
        '<div class="sec"><h2>Fasts</h2><span class="aside">' +
        fasted +
        ' of ' +
        info.len +
        '</span></div><div class="card col"><div class="rmgrid">' +
        cells +
        '</div><div class="legend"><span><i style="background:var(--goldh)"></i>Fasted</span><span><i style="background:color-mix(in srgb,var(--rose) 45%,var(--s3))"></i>Break</span><span><i style="background:var(--s3)"></i>Not fasted</span></div><p class="faint small">Days fill in on their own. Tap a day to change it.</p></div>';
    /* taraweeh */
    var nk = A.now().nightKey,
      tw = r.taraweeh[nk] || 0,
      nights = Object.keys(r.taraweeh).filter(function (x) {
        return x >= A.shift(info.start, -1) && r.taraweeh[x];
      }).length;
    h +=
      '<div class="sec"><h2>Tarāwīḥ</h2><span class="aside">' +
      nights +
      ' nights</span></div><div class="card col"><div class="eyebrow">Tonight’s rakʿahs</div>' +
      A.said('bukhari:1147', '', true) +
      '<div class="refs"><a href="https://sunnah.com/bukhari:1147" data-a="ext">' +
      ic('link', 'xs') +
      'Bukhārī 1147</a></div><div class="rak h-gold">' +
      [11, 13, 8, 20, 23]
        .map(function (n) {
          return (
            '<button type="button" data-a="rm-tw" data-v="' +
            n +
            '" aria-pressed="' +
            (tw === n) +
            '">' +
            n +
            '</button>'
          );
        })
        .join('') +
      '</div></div>';
    /* khatm */
    var jz = r.khatm.juz,
      read = Object.keys(jz).length,
      grid = '';
    for (var j = 1; j <= 30; j++)
      grid +=
        '<button type="button" class="rmd' +
        (jz[j] ? ' on' : '') +
        '" data-a="rm-juz" data-v="' +
        j +
        '" aria-pressed="' +
        !!jz[j] +
        '" aria-label="Juzʾ ' +
        j +
        '">' +
        j +
        '</button>';
    h +=
      '<div class="sec"><h2>Qurʾān khatm</h2><span class="aside">' +
      read +
      ' of 30 · ' +
      A.plural(r.khatm.done || 0, 'khatm') +
      '</span></div><div class="card col"><div class="rmgrid">' +
      grid +
      '</div><div class="bar"><i style="width:' +
      ((read / 30) * 100).toFixed(1) +
      '%"></i></div></div>';
    /* last ten */
    if (info.len) {
      var ten = '';
      for (var n = 21; n <= info.len; n += 2) {
        var eve = A.shift(info.start, n - 2),
          past = A.shift(eve, 1) <= k;
        ten +=
          '<div class="li"><span class="badge s h-indigo">' +
          ic('moonstar', 's') +
          '</span><div class="grow"><div class="t">Night ' +
          n +
          '</div><div class="s">Evening of ' +
          esc(A.fmtDate(eve, 'short')) +
          '</div></div>' +
          (past ? '<span class="faint small">Passed</span>' : '') +
          '</div>';
      }
      h +=
        '<div class="sec"><h2>The last ten nights</h2></div><div class="card pad0"><div class="list">' +
        ten +
        '<a class="li" href="#/r/ramadan/5"><span class="badge s h-gold">' +
        ic('hands', 's') +
        '</span><div class="grow"><div class="t">The duʿāʾ of Laylat al-Qadr</div><div class="s">Allāhumma innaka ʿafuwwun…</div></div>' +
        ic('right', 's') +
        '</a></div></div>';
    }
    h +=
      '<a class="card coll press h-gold" href="#/c/ramadan"><div class="badge">' +
      ic('book') +
      '</div><div class="grow"><div class="t">Ramaḍān duʿāʾs</div><div class="s">The crescent, ifṭār and the last ten</div></div>' +
      ic('right', 's') +
      '</a>';
    var N = S.notif.ramadan;
    h +=
      '<div class="sec"><h2>Settings</h2></div><div class="card pad0"><div class="list">' +
      '<div class="set"><div class="grow"><div class="t">Stop eating before Fajr</div><div class="s">Imsāk, minutes before Fajr</div></div><div class="ctl">' +
      A.stepper(S.prefs.imsak || 0, 'rm-imsak') +
      '</div></div>' +
      '<div class="set"><div class="grow"><div class="t">Suhūr reminder</div><div class="s">' +
      N.suhoorMin +
      ' min before Fajr</div></div><div class="ctl">' +
      A.stepper(N.suhoorMin, 'rm-sm') +
      A.sw(S.notif.enabled && N.suhoor, 'rm-n', ' data-k="suhoor"') +
      '</div></div>' +
      '<div class="set"><div class="grow"><div class="t">Ifṭār reminder</div><div class="s">At Maghrib, with the duʿāʾ</div></div><div class="ctl">' +
      A.sw(S.notif.enabled && N.iftar, 'rm-n', ' data-k="iftar"') +
      '</div></div></div></div>';
    return {
      html: h,
      title: 'Ramaḍān',
      tab: 0,
      tick: function (el) {
        A.ramadanTick(el);
      }
    };
  };
  A.acts['rm-day'] = function (el) {
    var d = el.dataset.k,
      r = R();
    if (A.isExcused(d)) {
      A.toast('That day is marked as a break');
      return;
    }
    if (d > A.today()) {
      A.toast('That day has not come yet', 'clock');
      return;
    }
    if (S.fasts[d]) {
      delete S.fasts[d];
      r.skip[d] = 1;
    } else {
      S.fasts[d] = 'ramadan';
      delete r.skip[d];
    }
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['rm-tw'] = function (el) {
    var r = R(),
      nk = A.now().nightKey,
      v = +el.dataset.v;
    if (r.taraweeh[nk] === v) delete r.taraweeh[nk];
    else r.taraweeh[nk] = v;
    A.save();
    A.N.haptic('success');
    A.rerender();
  };
  A.acts['rm-juz'] = function (el) {
    var r = R(),
      j = +el.dataset.v,
      z = r.khatm.juz;
    if (z[j]) delete z[j];
    else z[j] = Date.now();
    if (Object.keys(z).length === 30) {
      r.khatm.done = (r.khatm.done || 0) + 1;
      r.khatm.juz = {};
      A.N.haptic('heavy');
      A.fx.done();
      A.toast('Khatm complete. May Allah accept it from you.', 'book');
    } else A.N.haptic('tick');
    A.save();
    A.rerender();
  };
  A.acts['rm-imsak'] = function (el) {
    S.prefs.imsak = A.clamp((S.prefs.imsak || 0) + +el.dataset.d * 5, 0, 20);
    A.save();
    A.rerender();
  };
  A.acts['rm-sm'] = function (el) {
    var N = S.notif.ramadan;
    N.suhoorMin = A.clamp(N.suhoorMin + +el.dataset.d * 15, 15, 120);
    A.save();
    A.rerender();
  };
  A.acts['rm-n'] = function (el) {
    var k = el.dataset.k,
      N = S.notif.ramadan;
    if (!S.notif.enabled) {
      A.enableNotifs(function (ok) {
        if (ok) {
          N[k] = true;
          A.save();
          A.rerender();
        }
      });
      return;
    }
    N[k] = !N[k];
    A.save();
    A.rerender();
  };
})();
