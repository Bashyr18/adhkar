/* Ṣalāh — times, tracking, qibla, month table, night (qiyām), Ḍuḥā, location. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    esc = A.esc,
    ic = A.icon;
  var MIN = 60000;

  function needLoc(title, tab) {
    return {
      html:
        '<header class="top"><div class="tt"><h1>' +
        title +
        '</h1></div></header><div class="empty card"><div class="badge h-gold">' +
        ic('pin') +
        '</div><h3>Where are you?</h3><p>Prayer times, qibla and the night thirds are calculated on your device from your location, nothing is sent anywhere.</p><a class="btn pri" href="#/location">' +
        ic('locate', 's') +
        'Set location</a></div>',
      title: title,
      tab: tab
    };
  }

  /* ================= ṣalāh ================= */
  A.V.salah = function (a) {
    if (!S.loc) return needLoc('Ṣalāh', 3);
    var today = A.today(),
      key = a[0] && /^\d{4}-\d{2}-\d{2}$/.test(a[0]) ? a[0] : today,
      t = A.pday(key),
      n = A.now(),
      isToday = key === today;
    /* "current" only when the running prayer belongs to this civil day (after midnight it is still last night's ʿishāʾ) */
    var curK = isToday && n.prev.key === key ? n.cur : null;
    var h =
      '<header class="top"><div class="tt"><div class="eyebrow clamp1">' +
      esc(P.METHODS[S.calc.method].name) +
      ' · ' +
      (S.calc.asr === 'hanafi' ? 'Ḥanafī ʿaṣr' : 'Standard ʿaṣr') +
      '</div><h1>Ṣalāh</h1></div><div class="acts"><a class="ib" href="#/settings/prayer" aria-label="Calculation settings">' +
      ic('gear', 's') +
      '</a></div></header>';
    h +=
      '<div class="card row" style="padding:8px"><button type="button" class="ib ghost" data-a="nav" data-href="#/salah/' +
      A.shift(key, -1) +
      '" aria-label="Previous day">' +
      ic('left', 's') +
      '</button><div class="grow" style="text-align:center"><div style="font-weight:800">' +
      (isToday ? 'Today · ' : '') +
      esc(A.fmtDate(key, 'short')) +
      '</div><div class="faint small" style="font-weight:700">' +
      esc(A.hijriText(key)) +
      '</div></div><button type="button" class="ib ghost" data-a="nav" data-href="#/salah/' +
      A.shift(key, 1) +
      '" aria-label="Next day">' +
      ic('right', 's') +
      '</button></div>';
    if (isToday) {
      var span = n.next.at - n.prev.at,
        f = span > 0 ? (n.now - n.prev.at) / span : 0;
      h +=
        '<div class="card"><div class="spread" style="align-items:flex-start"><div class="grow"><div class="eyebrow">' +
        (n.next.k === 'sunrise' ? 'Fajr ends at sunrise' : 'Next · ' + P.NAMES[n.next.k]) +
        '</div><div class="serif num" style="font-size:clamp(32px,10vw,40px);line-height:1.05;margin-top:6px" data-cd>' +
        A.fmtCountdown(n.next.at - n.now) +
        '</div></div><div style="text-align:right;flex:none"><div class="ar" style="font-size:26px;color:var(--gold2)">' +
        P.AR[n.next.k] +
        '</div><div class="muted" style="font-weight:800">' +
        A.fmtTxt(n.next.at) +
        '</div></div></div><div class="bar" style="margin-top:14px"><i data-bar style="width:' +
        (f * 100).toFixed(1) +
        '%"></i></div><div class="spread faint" style="font-size:11.5px;font-weight:700;margin-top:6px;flex-wrap:wrap"><span>' +
        (n.prev.k === 'sunrise' ? 'Sunrise' : P.NAMES[n.prev.k]) +
        ' ' +
        A.fmtTxt(n.prev.at) +
        '</span><span>' +
        (n.next.k === 'sunrise' ? 'Sunrise' : P.NAMES[n.next.k]) +
        ' ' +
        A.fmtTxt(n.next.at) +
        '</span></div></div>';
    }
    var pr = S.prayed[key] || {},
      exc = A.isExcused(key),
      trv = A.travelling();
    if (trv)
      h +=
        '<div class="card col trv-card"><div class="row"><span class="badge s h-teal">' +
        ic('compass', 's') +
        '</span><div class="grow"><div style="font-weight:700">Travelling</div><div class="faint small">' +
        A.fmtN(trv.km) +
        ' km from ' +
        esc(trv.from) +
        '</div></div><button type="button" class="chip" data-a="travel-home">I live here now</button></div><div class="trv-rules"><span>' +
        ic('check', 'xs') +
        'Ẓuhr, ʿAṣr, ʿIshāʾ: 2 rakʿahs</span><span>' +
        ic('check', 'xs') +
        'Combining is allowed</span><span>' +
        ic('check', 'xs') +
        'Keep Fajr’s sunnah and witr</span></div></div>';
    if (exc)
      h +=
        '<div class="occ h-rose"><div class="badge s" style="--h:var(--rose)">' +
        ic('moonstar', 's') +
        '</div><div class="grow"><div class="t">On a break from ṣalāh</div><div class="d">Tracking and reminders paused.</div></div></div>';
    h +=
      '<div class="card pad0">' +
      P.ORDER.map(function (k) {
        var isP = k !== 'sunrise',
          past = isToday ? t[k] <= n.now : key < today,
          cur = curK === k,
          notif = isP && S.notif.enabled && S.notif.prayers[k];
        var chk =
          isP && S.prefs.trackPrayers && !exc && (past || cur)
            ? '<button type="button" class="chk' +
              (pr[k] ? ' on' : '') +
              '" data-a="prayed" data-k="' +
              k +
              '" data-d="' +
              key +
              '" aria-label="Mark ' +
              A.pName(k, key) +
              ' prayed" aria-pressed="' +
              !!pr[k] +
              '">' +
              ic('check', 'xs') +
              '</button>'
            : '<span style="width:30px;flex:none;display:grid;place-items:center" class="faint">' +
              (k === 'sunrise' ? ic('sunrise', 's') : '') +
              '</span>';
        return (
          '<div class="pt' +
          (cur ? ' cur' : past ? ' past' : '') +
          '">' +
          chk +
          '<div class="grow"><div class="nm">' +
          (k === 'sunrise' ? 'Sunrise' : A.pName(k, key)) +
          '</div><div class="arn ar">' +
          A.pAr(k, key) +
          '</div>' +
          (isP && S.iqama.on ? '<div class="iqm">Iqāmah ' + A.fmtT(t[k] + S.iqama[k] * 60000) + '</div>' : '') +
          (trv && A.SHORT[k] ? '<div class="iqm trv">2 rakʿahs</div>' : '') +
          '</div><div class="tm">' +
          A.fmtT(t[k]) +
          '</div>' +
          (isP
            ? '<button type="button" class="bell' +
              (notif ? ' on' : '') +
              '" data-a="bell" data-k="' +
              k +
              '" aria-label="' +
              P.NAMES[k] +
              ' notification" aria-pressed="' +
              !!notif +
              '">' +
              ic(notif ? 'bell' : 'belloff', 's') +
              '</button>'
            : '<span style="width:38px;flex:none"></span>') +
          '</div>'
        );
      }).join('') +
      '</div>';
    h +=
      '<a class="card lp-entry press" href="#/learn"><img src="' +
      A.asset('img/pose/' + (S.profile.gender === 'f' ? 'f' : 'm') + '/ruku.webp') +
      '" alt="" aria-hidden="true"><div class="grow"><div class="eyebrow">Step by step</div><div class="t">Learn the prayer</div><div class="s">As the Prophet ﷺ prayed, with the evidence</div></div>' +
      ic('right', 's') +
      '</a>';
    h += '<div class="sec"><h2>Sunnah times</h2></div><div class="grid2">';
    h +=
      '<a class="card tile press h-gold" href="#/duha"><div class="badge s">' +
      ic('sun', 's') +
      '</div><div><div class="k">Ḍuḥā window</div><div style="font-weight:800;margin-top:3px;font-size:14px">' +
      A.fmtTxt(t.duhaStart) +
      '<span class="faint"> → </span>' +
      A.fmtTxt(t.duhaEnd) +
      '</div></div></a>';
    h +=
      '<a class="card tile press h-night" href="#/night"><div class="badge s">' +
      ic('moon', 's') +
      '</div><div><div class="k">The last third</div><div style="font-weight:800;margin-top:3px;font-size:14px">' +
      A.thirdRange(t) +
      '</div></div></a>';
    h += '</div><div class="sec"><h2>Tools</h2></div><div class="grid2">';
    h +=
      '<a class="card coll press h-jade" href="#/qibla"><div class="badge s">' +
      ic('compass', 's') +
      '</div><div class="grow"><div class="t">Qibla</div><div class="s">' +
      Math.round(P.qibla(S.loc.lat, S.loc.lng)) +
      '° from north</div></div></a>';
    h +=
      '<a class="card coll press h-teal" href="#/month"><div class="badge s">' +
      ic('cal', 's') +
      '</div><div class="grow"><div class="t">Timetable</div><div class="s">Whole month</div></div></a>';
    h +=
      '<a class="card coll press h-sand" href="#/calendar"><div class="badge s">' +
      ic('moonstar', 's') +
      '</div><div class="grow"><div class="t">Hijri calendar</div><div class="s">Occasions · fasting</div></div></a>';
    h +=
      '<a class="card coll press h-rose" href="#/location"><div class="badge s">' +
      ic('pin', 's') +
      '</div><div class="grow"><div class="t">Location</div><div class="s clamp1">' +
      esc(S.loc.name) +
      '</div></div></a>';
    var qo = A.qadaTotal(),
      jo = S.journal.items.filter(function (d) {
        return !d.done;
      }).length;
    h +=
      '<a class="card coll press h-gold" href="#/journal"><div class="badge s">' +
      ic('hands', 's') +
      '</div><div class="grow"><div class="t">My duʿāʾs</div><div class="s">' +
      (jo ? A.plural(jo, 'duʿāʾ') + ' open' : 'A private journal') +
      '</div></div></a>';
    h +=
      '<a class="card coll press h-indigo" href="#/qada"><div class="badge s">' +
      ic('mosque', 's') +
      '</div><div class="grow"><div class="t">Make-up prayers</div><div class="s">' +
      (qo ? A.plural(qo, 'prayer') + ' owed' : 'Qaḍāʾ tracker') +
      '</div></div></a>';
    h += '</div>';
    if (S.profile.gender === 'f' && isToday)
      h += S.excused.on
        ? '<button type="button" class="card coll press h-rose" data-a="break-off"><div class="badge">' +
          ic('moonstar') +
          '</div><div class="grow"><div class="t">End your break</div><div class="s">Day ' +
          A.excusedDay() +
          ' · resume prayer tracking</div></div>' +
          ic('right', 's') +
          '</button>'
        : '<button type="button" class="card coll press h-rose" data-a="break-on"><div class="badge">' +
          ic('moonstar') +
          '</div><div class="grow"><div class="t">Not praying today?</div><div class="s">Start a break. Your streak stays safe.</div></div>' +
          ic('right', 's') +
          '</button>';
    if (!S.notif.enabled)
      h +=
        '<button type="button" class="card coll press h-gold" data-a="go-notif"><div class="badge">' +
        ic('bell') +
        '</div><div class="grow"><div class="t">Turn on prayer reminders</div><div class="s">Gentle alerts for each prayer and your adhkār</div></div>' +
        ic('right', 's') +
        '</button>';
    return {
      html: h,
      title: 'Ṣalāh',
      tab: 3,
      tick: function (el) {
        if (!isToday) return;
        var nn = A.now(),
          cd = $('[data-cd]', el),
          b = $('[data-bar]', el);
        if (nn.next.at !== n.next.at) {
          A.rerender();
          return;
        }
        if (cd) cd.textContent = A.fmtCountdown(nn.next.at - nn.now);
        if (b) b.style.width = (((nn.now - nn.prev.at) / (nn.next.at - nn.prev.at)) * 100).toFixed(1) + '%';
      }
    };
  };
  A.acts['third-off'] = function (el) {
    S.notif.night.off = +el.dataset.v;
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts.prayed = function (el) {
    var d = el.dataset.d,
      k = el.dataset.k;
    if (!(S.prayed[d] || {})[k] && !A.canLog(d, k)) {
      A.notYet(d, k);
      return;
    }
    var o = (S.prayed[d] = S.prayed[d] || {});
    if (o[k]) delete o[k];
    else o[k] = Date.now();
    var on = !!o[k];
    if (!Object.keys(o).length) delete S.prayed[d];
    A.save();
    A.N.haptic(on ? 'success' : 'tick');
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', on);
    if (on && d === A.today() && !A.progress(d, 'salah', k).complete)
      A.toast('Next: the adhkār after ' + A.pName(k, d), 'mosque');
  };
  A.acts.bell = function (el) {
    var k = el.dataset.k;
    if (!S.notif.enabled) {
      A.enableNotifs(function (ok) {
        if (ok) {
          S.notif.prayers[k] = true;
          A.save();
          A.rerender();
        }
      });
      return;
    }
    S.notif.prayers[k] = !S.notif.prayers[k];
    A.save();
    A.N.haptic('tick');
    A.toast(
      P.NAMES[k] + (S.notif.prayers[k] ? ' reminder on' : ' reminder off'),
      S.notif.prayers[k] ? 'bell' : 'belloff'
    );
    A.rerender();
  };
  A.acts['go-notif'] = function () {
    A.enableNotifs(function (ok) {
      if (ok) A.go('#/settings/notifications');
    });
  };
  A.enableNotifs = function (cb) {
    var r = A.N.notifPermission();
    var done = function (ok) {
      if (ok) {
        S.notif.enabled = true;
        A.save(true);
        A.toast('Reminders are on', 'bell');
      } else A.toast('Notifications are blocked. Allow them in system settings.');
      cb && cb(ok);
    };
    if (A.N.has) {
      window.__native.onPermission = function (kind, ok) {
        if (kind === 'notifications') done(!!ok);
      };
      if (r === true) done(true);
      return;
    }
    if (r && r.then)
      r.then(function (p) {
        done(p === 'granted');
      });
    else done(true);
  };

  /* ================= qibla ================= */
  var Q = {
    mode: 'compass',
    q: 0,
    target: null,
    shown: null,
    raf: 0,
    aligned: false,
    lastTick: null,
    acc: null,
    tilt: [0, 0],
    label: ''
  };
  function pt(r, deg) {
    var a = ((deg - 90) * Math.PI) / 180;
    return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
  }
  function rose(q, sun) {
    var s =
      '<defs><radialGradient id="qdisk" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="var(--s3)"/><stop offset="1" stop-color="var(--s1)"/></radialGradient><linearGradient id="qline" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--gold2)"/><stop offset="1" stop-color="var(--gold)" stop-opacity="0"/></linearGradient></defs>';
    /* subtle khātam in the face */
    s +=
      '<path d="' +
      A.starPath(100, 100, 62, 50) +
      '" fill="none" stroke="var(--gold)" stroke-opacity=".10" stroke-width=".8"/><path d="' +
      A.starPath(100, 100, 42, 33) +
      '" fill="none" stroke="var(--gold)" stroke-opacity=".08" stroke-width=".8"/>';
    for (var d = 0; d < 360; d += 2) {
      var big = d % 30 === 0,
        mid = d % 10 === 0,
        r1 = big ? 83 : mid ? 86 : 88.5,
        a = pt(r1, d),
        b = pt(92, d);
      s +=
        '<line x1="' +
        a[0].toFixed(2) +
        '" y1="' +
        a[1].toFixed(2) +
        '" x2="' +
        b[0].toFixed(2) +
        '" y2="' +
        b[1].toFixed(2) +
        '" stroke="' +
        (big ? 'var(--t1)' : mid ? 'var(--t2)' : 'var(--t3)') +
        '" stroke-opacity="' +
        (big ? 0.9 : mid ? 0.6 : 0.35) +
        '" stroke-width="' +
        (big ? 1.2 : 0.7) +
        '"/>';
    }
    for (var n = 30; n < 360; n += 30) {
      if (n % 90 === 0) continue;
      var p = pt(74, n);
      s +=
        '<text x="' +
        p[0].toFixed(1) +
        '" y="' +
        (p[1] + 2.6).toFixed(1) +
        '" text-anchor="middle" font-size="7" font-weight="700" font-family="Quicksand" fill="var(--t3)" transform="rotate(' +
        n +
        ' ' +
        p[0].toFixed(1) +
        ' ' +
        p[1].toFixed(1) +
        ')">' +
        n +
        '</text>';
    }
    [
      ['N', 0],
      ['E', 90],
      ['S', 180],
      ['W', 270]
    ].forEach(function (c) {
      var p = pt(72, c[1]);
      s +=
        '<text x="' +
        p[0].toFixed(1) +
        '" y="' +
        (p[1] + 4.2).toFixed(1) +
        '" text-anchor="middle" font-size="12" font-weight="800" font-family="Quicksand" fill="' +
        (c[0] === 'N' ? '#f08a78' : 'var(--t1)') +
        '" transform="rotate(' +
        c[1] +
        ' ' +
        p[0].toFixed(1) +
        ' ' +
        p[1].toFixed(1) +
        ')">' +
        c[0] +
        '</text>';
    });
    [
      ['NE', 45],
      ['SE', 135],
      ['SW', 225],
      ['NW', 315]
    ].forEach(function (c) {
      var p = pt(74, c[1]);
      s +=
        '<text x="' +
        p[0].toFixed(1) +
        '" y="' +
        (p[1] + 2.4).toFixed(1) +
        '" text-anchor="middle" font-size="6.5" font-weight="800" font-family="Quicksand" fill="var(--t3)" transform="rotate(' +
        c[1] +
        ' ' +
        p[0].toFixed(1) +
        ' ' +
        p[1].toFixed(1) +
        ')">' +
        c[0] +
        '</text>';
    });
    /* qibla: golden band on the ring, a ray, and the Kaʿbah */
    var a0 = pt(92, q - 4),
      a1 = pt(92, q + 4);
    s +=
      '<path d="M' +
      a0[0].toFixed(2) +
      ' ' +
      a0[1].toFixed(2) +
      'A92 92 0 0 1 ' +
      a1[0].toFixed(2) +
      ' ' +
      a1[1].toFixed(2) +
      '" fill="none" stroke="var(--gold)" stroke-width="4" stroke-linecap="round"/>';
    var r0 = pt(36, q),
      r2 = pt(78, q),
      kb = pt(101, q);
    s +=
      '<line x1="' +
      r0[0].toFixed(2) +
      '" y1="' +
      r0[1].toFixed(2) +
      '" x2="' +
      r2[0].toFixed(2) +
      '" y2="' +
      r2[1].toFixed(2) +
      '" stroke="var(--gold)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1 3.5"/>';
    s +=
      '<g transform="translate(' +
      kb[0].toFixed(2) +
      ' ' +
      kb[1].toFixed(2) +
      ') rotate(' +
      q.toFixed(1) +
      ')"><circle r="9.5" fill="var(--bg)" stroke="var(--gold)" stroke-width="1.2"/><rect x="-5" y="-5" width="10" height="10" rx="1.2" fill="#15130f" stroke="var(--gold2)" stroke-width=".7"/><rect x="-5" y="-2.4" width="10" height="1.6" fill="var(--gold)"/></g>';
    if (sun && sun.alt > -1) {
      var sp = pt(58, sun.az);
      s +=
        '<g transform="translate(' +
        sp[0].toFixed(2) +
        ' ' +
        sp[1].toFixed(2) +
        ')"><circle r="5.5" fill="#ffd27a" fill-opacity=".25"/><circle r="3.2" fill="#ffcf6a"/></g>';
    }
    return '<svg viewBox="-14 -14 228 228" aria-hidden="true">' + s + '</svg>';
  }
  function glass() {
    return '<svg viewBox="-14 -14 228 228" aria-hidden="true"><path id="qdev" d="" fill="none" stroke="var(--gold)" stroke-opacity=".55" stroke-width="6" stroke-linecap="round"/><path d="M100 -9 106.5 3H93.5z" fill="var(--gold2)" stroke="var(--bg)" stroke-width="1"/><line x1="100" y1="3" x2="100" y2="14" stroke="var(--gold2)" stroke-width="1.4"/></svg>';
  }
  function devPath(diff) {
    if (Math.abs(diff) < 1) return '';
    var s = pt(97, 0),
      e = pt(97, diff);
    return (
      'M' +
      s[0].toFixed(2) +
      ' ' +
      s[1].toFixed(2) +
      'A97 97 0 ' +
      (Math.abs(diff) > 180 ? 1 : 0) +
      ' ' +
      (diff > 0 ? 1 : 0) +
      ' ' +
      e[0].toFixed(2) +
      ' ' +
      e[1].toFixed(2)
    );
  }
  A.V.qibla = function () {
    if (!S.loc) return needLoc('Qibla', 3);
    var q = P.qibla(S.loc.lat, S.loc.lng),
      km = P.distanceKm(S.loc.lat, S.loc.lng),
      sun = P.sunAzAlt(Date.now(), S.loc.lat, S.loc.lng);
    var sunUp = sun.alt > -1,
      sunTurn = ((q - sun.az + 540) % 360) - 180;
    var h =
      A.back('Ṣalāh', '#/salah') +
      '<header class="top"><div class="tt"><div class="eyebrow">Direction of the Kaʿbah</div><h1>Qibla</h1></div></header>';
    h +=
      '<div class="seg qmodes" role="group" aria-label="Mode"><button type="button" data-a="q-mode" data-v="compass" aria-pressed="' +
      (Q.mode === 'compass') +
      '">' +
      ic('compass', 'xs') +
      'Compass</button><button type="button" data-a="q-mode" data-v="sun" aria-pressed="' +
      (Q.mode === 'sun') +
      '">' +
      ic('sun', 'xs') +
      'By the sun</button></div>';
    h +=
      '<div class="qb"><div class="compass" id="cmp"><div class="bezel"></div><div class="rose" id="rose">' +
      rose(q, sun) +
      '</div><div class="glass">' +
      glass() +
      '</div><div class="pulse"></div><div class="hub"><b class="num" id="qdeg">' +
      Math.round(q) +
      '°</b><span id="qlbl">from north</span></div><i class="bubble" id="bub"></i></div>';
    h += '<div class="qstatus" id="qchips"></div><div class="qmsg" id="qmsg" aria-live="polite"></div></div>';
    h +=
      '<div class="card"><dl class="kv"><dt>Bearing</dt><dd>' +
      q.toFixed(1) +
      '° ' +
      compassPt(q) +
      '</dd><dt>Distance to Makkah</dt><dd>' +
      A.fmtN(Math.round(km)) +
      ' km</dd>' +
      (sunUp
        ? '<dt>Sun now</dt><dd>' +
          Math.round(sun.az) +
          '° · qibla is ' +
          Math.abs(Math.round(sunTurn)) +
          '° ' +
          (sunTurn >= 0 ? 'right' : 'left') +
          ' of it</dd>'
        : '<dt>Sun</dt><dd>Below the horizon</dd>') +
      '<dt>From</dt><dd class="clamp1">' +
      esc(S.loc.name) +
      '</dd></dl></div>';
    h +=
      '<div class="card col"><div class="row" style="align-items:flex-start"><span class="badge s h-jade">' +
      ic('info', 's') +
      '</span><div class="grow small muted">Lay the phone flat and keep it away from metal, magnets and speakers. If the reading drifts, wave the phone in a figure-eight to calibrate. On cloudless days the sun mode needs no compass at all.</div></div></div>';
    return {
      html: h,
      title: 'Qibla',
      tab: 3,
      mount: function () {
        Q.q = q;
        Q.sun = sun;
        Q.aligned = false;
        Q.shown = null;
        Q.target = null;
        startCompass();
        paintMode();
      },
      unmount: stopCompass
    };
  };
  function compassPt(d) {
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8];
  }
  function chips() {
    var el = $('#qchips');
    if (!el) return;
    var acc = Q.acc,
      accTxt =
        acc == null ? '' : acc >= 3 ? 'High accuracy' : acc === 2 ? 'Medium accuracy' : 'Low accuracy, calibrate';
    el.innerHTML =
      Q.mode === 'sun'
        ? '<span class="chip on">' + ic('sun', 'xs') + 'Sun-referenced · no sensors</span>'
        : '<span class="chip">' +
          ic('compass', 'xs') +
          'True north</span>' +
          (accTxt ? '<span class="chip' + (acc < 2 ? ' on' : '') + '">' + esc(accTxt) + '</span>' : '');
  }
  function paintMode() {
    chips();
    var msg = $('#qmsg');
    if (Q.mode === 'sun') {
      if (Q.sun.alt <= -1) {
        if (msg) msg.textContent = 'The sun is below the horizon. Switch to compass mode.';
        render(0, true);
        return;
      }
      var turn = ((Q.q - Q.sun.az + 540) % 360) - 180;
      if (msg)
        msg.textContent =
          'Point the top of your phone at the sun, then turn ' +
          Math.abs(Math.round(turn)) +
          '° to the ' +
          (turn >= 0 ? 'right' : 'left') +
          '.';
      Q.target = Q.sun.az;
      Q.shown = Q.sun.az;
      render(Q.sun.az, true);
    } else if (msg)
      msg.textContent =
        A.N.has || window.DeviceOrientationEvent
          ? 'Turn until the Kaʿbah reaches the gold pointer.'
          : 'Face ' + Math.round(Q.q) + '° clockwise from true north.';
  }
  /* render the rose for a heading; static text/arc updates only when the integer value changes (no layout thrash) */
  function render(heading, staticMode) {
    var r = $('#rose');
    if (!r) return;
    r.style.transform = 'rotate(' + (-heading).toFixed(2) + 'deg) translateZ(0)';
    var diff = ((Q.q - heading + 540) % 360) - 180,
      ad = Math.abs(diff),
      al = !staticMode && ad < 3;
    var dev = document.getElementById('qdev');
    if (dev) {
      dev.setAttribute('d', devPath(diff));
      dev.setAttribute('stroke', al ? 'var(--jade)' : 'var(--gold)');
    }
    var label = staticMode
      ? Q.mode === 'sun'
        ? 'sun at top'
        : 'from north'
      : al
        ? 'facing qibla'
        : diff > 0
          ? 'turn right'
          : 'turn left';
    var deg = staticMode ? Math.round(Q.mode === 'sun' ? ad : Q.q) + '°' : al ? '✓' : Math.round(ad) + '°';
    var b = $('#qdeg'),
      l = $('#qlbl');
    if (b && b.textContent !== deg) b.textContent = deg;
    if (l && Q.label !== label) {
      l.textContent = label;
      Q.label = label;
    }
    var c = $('#cmp');
    if (c && c.classList.contains('aligned') !== al) c.classList.toggle('aligned', al);
    if (!staticMode) {
      if (al && !Q.aligned) A.N.haptic('success');
      var bucket = Math.round(ad / 5);
      if (!al && ad < 30 && Q.lastTick !== null && bucket !== Q.lastTick) A.N.haptic('tick');
      Q.lastTick = bucket;
      Q.aligned = al;
      var m = $('#qmsg');
      if (m) {
        var t = al
          ? 'You are facing the qibla.'
          : Q.acc != null && Q.acc < 2
            ? 'Low compass accuracy. Wave the phone in a figure-eight.'
            : 'Turn until the Kaʿbah reaches the gold pointer.';
        if (m.textContent !== t) m.textContent = t;
      }
    }
  }
  function frame() {
    Q.raf = 0;
    if (Q.mode !== 'compass' || Q.target == null) return;
    if (Q.shown == null) Q.shown = Q.target;
    var d = ((Q.target - Q.shown + 540) % 360) - 180;
    Q.shown = (Q.shown + d * 0.22 + 360) % 360;
    render(Q.shown, false);
    var bub = $('#bub');
    if (bub)
      bub.style.transform =
        'translate(' +
        (A.clamp(Q.tilt[1], -30, 30) * 1.4).toFixed(1) +
        'px,' +
        (A.clamp(-Q.tilt[0], -30, 30) * 1.4).toFixed(1) +
        'px)';
    if (Math.abs(d) > 0.2) Q.raf = requestAnimationFrame(frame);
  }
  function onHeading(hd, acc, pitch, roll) {
    if (Q.mode !== 'compass') return;
    Q.target = +hd;
    if (acc != null && acc !== Q.acc) {
      Q.acc = acc;
      chips();
    }
    if (pitch != null) Q.tilt = [+pitch, +roll];
    if (!Q.raf) Q.raf = requestAnimationFrame(frame);
  }
  var webHandler = null;
  function startCompass() {
    window.__native.onHeading = onHeading;
    if (A.N.has) {
      A.N.compass(true);
      return;
    }
    webHandler = function (e) {
      var hd =
        e.webkitCompassHeading != null ? e.webkitCompassHeading : e.absolute && e.alpha != null ? 360 - e.alpha : null;
      if (hd != null) onHeading(hd, null, e.beta, e.gamma);
    };
    window.addEventListener('deviceorientationabsolute', webHandler);
    window.addEventListener('deviceorientation', webHandler);
  }
  function stopCompass() {
    if (A.N.has) A.N.compass(false);
    if (Q.raf) cancelAnimationFrame(Q.raf);
    Q.raf = 0;
    if (webHandler) {
      window.removeEventListener('deviceorientationabsolute', webHandler);
      window.removeEventListener('deviceorientation', webHandler);
      webHandler = null;
    }
  }
  A.acts['q-mode'] = function (el) {
    Q.mode = el.dataset.v;
    A.N.haptic('tick');
    document.querySelectorAll('.qmodes button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.v === Q.mode);
    });
    Q.shown = null;
    Q.label = '';
    paintMode();
  };

  /* ================= month ================= */
  A.V.month = function (a) {
    if (!S.loc) return needLoc('Timetable', 3);
    var today = A.today(),
      ym = a[0] && /^\d{4}-\d{2}$/.test(a[0]) ? a[0] : today.slice(0, 7),
      y = +ym.slice(0, 4),
      m = +ym.slice(5, 7);
    var prev = m === 1 ? y - 1 + '-12' : y + '-' + String(m - 1).padStart(2, '0'),
      next = m === 12 ? y + 1 + '-01' : y + '-' + String(m + 1).padStart(2, '0');
    var days = new Date(Date.UTC(y, m, 0)).getUTCDate(),
      rows = '';
    for (var d = 1; d <= days; d++) {
      var k = P.keyOf(y, m, d),
        t = A.pday(k),
        hj = A.hijri(k),
        isT = k === today;
      rows +=
        '<tr' +
        (isT ? ' class="cur"' : '') +
        '><td><b>' +
        d +
        '</b><span>' +
        A.DOW[A.dow(k)].slice(0, 2) +
        ' · ' +
        hj.d +
        '</span></td>' +
        P.ORDER.map(function (p) {
          return '<td>' + A.fmtT(t[p], 'bare') + '</td>';
        }).join('') +
        '</tr>';
    }
    var h =
      A.back('Ṣalāh', '#/salah') +
      '<header class="top"><div class="tt"><div class="eyebrow clamp1">' +
      esc(S.loc.name) +
      '</div><h1>' +
      A.MONTHS[m - 1] +
      ' <em>' +
      y +
      '</em></h1></div><div class="acts"><button type="button" class="ib" data-a="nav" data-href="#/month/' +
      prev +
      '" aria-label="Previous month">' +
      ic('left', 's') +
      '</button><button type="button" class="ib" data-a="nav" data-href="#/month/' +
      next +
      '" aria-label="Next month">' +
      ic('right', 's') +
      '</button></div></header>';
    h +=
      '<style>.mt{width:100%;border-collapse:collapse;font-size:clamp(11px,3.4vw,12.5px);font-variant-numeric:tabular-nums;table-layout:fixed}.mt th{font:800 9.5px/1 var(--f-ui);letter-spacing:.04em;text-transform:uppercase;color:var(--t3);padding:12px 1px;text-align:center}.mt th:first-child{width:21%}.mt td{padding:9px 1px;text-align:center;border-top:1px solid var(--line);font-weight:700;color:var(--t2);white-space:nowrap}.mt td:first-child{text-align:left;padding-left:12px}.mt td b{display:block;color:var(--t1);font-size:13.5px}.mt td span{font-size:9.5px;color:var(--t3)}.mt tr.cur td{background:var(--gold-soft);color:var(--gold2)}</style>';
    h +=
      '<div class="card pad0 mt-card"><table class="mt"><thead><tr><th style="text-align:left;padding-left:12px">Day</th><th>Fajr</th><th>Rise</th><th>Dhuhr</th><th>ʿAṣr</th><th>Magh</th><th>ʿIshā</th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div>';
    h +=
      '<p class="faint small" style="text-align:center">' +
      esc(P.METHODS[S.calc.method].name) +
      (S.prefs.h24 ? '' : ' · 12-hour times') +
      '</p>';
    return {
      html: h,
      title: 'Timetable',
      tab: 3,
      mount: function (el) {
        var c = $('tr.cur', el);
        if (c)
          setTimeout(function () {
            c.scrollIntoView({ block: 'center' });
          }, 60);
      }
    };
  };

  /* ================= night (qiyām) ================= */
  A.V.night = function () {
    if (!S.loc) return needLoc('The Night', 3);
    var n = A.now(),
      nk = n.nightKey,
      t = A.pday(nk),
      rec = S.nights[nk] || {},
      now = n.now;
    var span = t.nextFajr - t.maghrib;
    var h =
      A.back('Ṣalāh', '#/salah') +
      '<header class="top"><div class="tt"><div class="eyebrow">' +
      esc(A.fmtDate(nk, 'short')) +
      ' → ' +
      esc(A.fmtDate(A.shift(nk, 1), 'short')) +
      '</div><h1>Qiyām <em>al-Layl</em></h1></div></header>';
    var st = [
      ['Maghrib', 'The night begins', t.maghrib],
      ['ʿIshāʾ', 'Night prayer may follow ʿishāʾ', t.isha],
      ['Middle of the night', 'Half of the night has passed', t.midnight],
      ['Last third', 'The most virtuous time to pray and call upon Him', t.lastThird, 1],
      ['Fajr', 'The night ends', t.nextFajr]
    ];
    h +=
      '<div class="card"><div class="ntl" id="ntl">' +
      st
        .map(function (x) {
          return (
            '<div class="st' +
            (x[3] ? ' key' : '') +
            '" data-at="' +
            x[2] +
            '"><div class="grow"><b>' +
            x[0] +
            '</b><span>' +
            x[1] +
            '</span></div><time class="num"' +
            (x[3] ? ' style="color:var(--night)"' : '') +
            '>' +
            A.fmtTxt(x[2]) +
            '</time></div>'
          );
        })
        .join('') +
      (now >= t.maghrib && now < t.nextFajr ? '<i class="now" id="nnow" aria-hidden="true"></i>' : '') +
      '</div><div class="ntl-sum"><span>' +
      A.T('The night') +
      ' <b class="num">' +
      A.fmtDur(span, true) +
      '</b></span>' +
      (now < t.lastThird
        ? '<span>' + A.T('Last third in') + ' <b class="num">' + A.fmtDur(t.lastThird - now, true) + '</b></span>'
        : now < t.nextFajr
          ? '<span>' + A.T('Until Fajr') + ' <b class="num">' + A.fmtDur(t.nextFajr - now, true) + '</b></span>'
          : '') +
      '</div></div>';
    var wake = A.thirdWake(t),
      lp = A.parts(wake),
      off = S.notif.night.off || 0;
    h +=
      '<div class="card col h-night third-card"><div class="row" style="align-items:flex-start"><div class="badge">' +
      ic('alarm') +
      '</div><div class="grow"><div style="font-weight:800">The last third</div><div class="third-range">' +
      A.thirdRange(t) +
      '</div><div class="muted small">It lasts until Fajr. Choose when to wake.</div></div></div>' +
      '<div class="seg sm third-off">' +
      [
        [-30, '30 min before'],
        [0, 'At its start'],
        [30, '30 min in'],
        [60, '1 hr in']
      ]
        .map(function (x) {
          return (
            '<button type="button" data-a="third-off" data-v="' +
            x[0] +
            '" aria-pressed="' +
            (off === x[0]) +
            '">' +
            x[1] +
            '</button>'
          );
        })
        .join('') +
      '</div>' +
      '<div class="third-act"><button type="button" class="btn pri sm" data-a="alarm" data-h="' +
      lp.h +
      '" data-m="' +
      lp.min +
      '">' +
      ic('alarm', 's') +
      'Alarm ' +
      A.fmtTxt(wake) +
      '</button>' +
      '<label class="third-notif"><span>Remind me</span>' +
      A.sw(S.notif.enabled && S.notif.night.on, 'notif-toggle', ' data-k="night"') +
      '</label></div></div>';
    h += '<div class="sec"><h2>Tonight</h2></div><div class="card col">';
    h +=
      '<button type="button" class="set" style="padding:0" data-a="night-flag" data-k="dhikr"><div class="badge s h-night">' +
      ic('spark', 's') +
      '</div><div class="grow"><div class="t">Woke and remembered Allah</div><div class="s">The waking dhikr of Bukhārī 1154</div></div><span class="chk' +
      (rec.dhikr ? ' on' : '') +
      '" aria-hidden="true">' +
      ic('check', 'xs') +
      '</span></button>';
    h +=
      '<div class="divider"></div><div class="eyebrow">Rakʿahs prayed</div><div class="rak h-night">' +
      [2, 4, 6, 8, 10, 12]
        .map(function (r) {
          return (
            '<button type="button" data-a="night-rak" data-v="' +
            r +
            '" aria-pressed="' +
            (rec.rak === r) +
            '">' +
            r +
            '</button>'
          );
        })
        .join('') +
      '</div>';
    h +=
      '<button type="button" class="set" style="padding:4px 0 0" data-a="night-flag" data-k="witr" aria-pressed="' +
      !!rec.witr +
      '"><div class="grow"><div class="t">Witr</div><div class="s">Make witr the last of your night prayer</div></div><span class="sw" aria-checked="' +
      !!rec.witr +
      '" aria-hidden="true"></span></button>';
    h += '</div>';
    h +=
      '<a class="card coll press h-indigo" href="#/r/night/0"><div class="badge">' +
      ic('book') +
      '</div><div class="grow"><div class="t">Remembrance of the night</div><div class="s">On waking · turning in sleep · after witr</div></div>' +
      ic('right', 's') +
      '</a>';
    h +=
      '<div class="card">' +
      A.said('bukhari:1145') +
      A.said('bukhari:990') +
      '<div class="refs" style="margin-top:12px"><a href="https://sunnah.com/bukhari:1145" data-a="ext">' +
      ic('link', 'xs') +
      'Bukhārī 1145</a><a href="https://sunnah.com/bukhari:990" data-a="ext">' +
      ic('link', 'xs') +
      'Bukhārī 990</a></div></div>';
    return {
      html: h,
      title: 'The Night',
      tab: 3,
      mount: function (el) {
        /* place the "now" marker between the two stations it falls between */
        var dot = $('#nnow', el);
        if (!dot) return;
        var rows = Array.prototype.slice.call(el.querySelectorAll('#ntl .st')),
          base = $('#ntl', el).getBoundingClientRect().top;
        for (var i = 0; i < rows.length - 1; i++) {
          var a0 = +rows[i].dataset.at,
            a1 = +rows[i + 1].dataset.at;
          if (now >= a0 && now < a1) {
            var y0 = rows[i].getBoundingClientRect().top - base + 19,
              y1 = rows[i + 1].getBoundingClientRect().top - base + 19;
            dot.style.top = (y0 + ((y1 - y0) * (now - a0)) / (a1 - a0)).toFixed(1) + 'px';
            break;
          }
        }
      }
    };
  };
  function nightRec() {
    var nk = A.now().nightKey;
    return (S.nights[nk] = S.nights[nk] || { dhikr: false, pray: false, rak: 0, witr: false });
  }
  function nightClean() {
    var nk = A.now().nightKey,
      r = S.nights[nk];
    if (r && !r.dhikr && !r.pray && !r.witr) delete S.nights[nk];
  }
  A.acts['night-flag'] = function (el) {
    var r = nightRec(),
      k = el.dataset.k;
    r[k] = !r[k];
    nightClean();
    A.save();
    A.N.haptic(r[k] ? 'success' : 'tick');
    A.checkBadges();
    A.rerender();
  };
  A.acts['night-rak'] = function (el) {
    var r = nightRec(),
      v = +el.dataset.v;
    if (r.rak === v) {
      r.rak = 0;
      r.pray = false;
    } else {
      r.rak = v;
      r.pray = true;
    }
    nightClean();
    A.save();
    A.N.haptic('success');
    var f = A.checkBadges();
    if (f.length) A.toast('Achievement: ' + f[0].name, 'trophy');
    A.rerender();
  };
  A.acts.noop = function () {};
  A.acts.alarm = function (el) {
    var ok = A.N.alarm(+el.dataset.h, +el.dataset.m, 'Qiyām · the last third');
    A.toast(
      ok
        ? 'Alarm set for ' + String(el.dataset.h).padStart(2, '0') + ':' + String(el.dataset.m).padStart(2, '0')
        : 'Open your clock app to set this alarm',
      'alarm'
    );
  };

  /* ================= ḍuḥā ================= */
  A.V.duha = function () {
    if (!S.loc) return needLoc('Ḍuḥā', 3);
    var k = A.today(),
      t = A.pday(k),
      now = Date.now(),
      rak = S.duha[k] || 0;
    var span = t.dhuhr - t.sunrise,
      X = function (ms) {
        return A.clamp(((ms - t.sunrise) / span) * 100, 0, 100).toFixed(2);
      };
    var state =
      now < t.duhaStart
        ? 'Opens in ' + A.fmtDur(t.duhaStart - now, true)
        : now < t.duhaEnd
          ? 'Open now · ' + A.fmtDur(t.duhaEnd - now, true) + ' left'
          : A.T('Opens tomorrow at') + ' ' + A.fmtTxt(A.pday(A.shift(k, 1)).duhaStart);
    var h =
      A.back('Ṣalāh', '#/salah') +
      '<header class="top"><div class="tt"><div class="eyebrow">The forenoon prayer</div><h1>Ṣalāt <em>al-Ḍuḥā</em></h1></div></header>';
    h +=
      '<div class="card col h-gold"><div class="spread" style="flex-wrap:wrap"><div style="font-weight:800">' +
      state +
      '</div><span class="chip on">' +
      A.fmtTxt(t.duhaStart) +
      ' to ' +
      A.fmtTxt(t.duhaEnd) +
      '</span></div>';
    h +=
      '<div class="window"><i style="left:' +
      X(t.duhaStart) +
      '%;width:' +
      (X(t.duhaEnd) - X(t.duhaStart)).toFixed(2) +
      '%"></i>' +
      (now > t.sunrise && now < t.dhuhr ? '<b style="left:' + X(now) + '%"></b>' : '') +
      '</div>';
    h +=
      '<div class="spread faint" style="font-size:11.5px;font-weight:700"><span>Sunrise ' +
      A.fmtTxt(t.sunrise) +
      '</span><span>Dhuhr ' +
      A.fmtTxt(t.dhuhr) +
      '</span></div>';
    h +=
      '<dl class="kv"><dt>Begins (sunrise + ' +
      S.offsets.ds +
      ' min)</dt><dd>' +
      A.fmtTxt(t.duhaStart) +
      '</dd><dt>Best time · late forenoon</dt><dd>' +
      A.fmtTxt(t.duhaBest) +
      '</dd><dt>Ends (' +
      S.offsets.de +
      ' min before Dhuhr)</dt><dd>' +
      A.fmtTxt(t.duhaEnd) +
      '</dd></dl></div>';
    h +=
      '<div class="sec"><h2>Today</h2></div><div class="card col"><div class="eyebrow">Rakʿahs prayed</div><div class="rak h-gold">' +
      [2, 4, 6, 8]
        .map(function (r) {
          return (
            '<button type="button" data-a="duha-rak" data-v="' +
            r +
            '" aria-pressed="' +
            (rak === r) +
            '">' +
            r +
            '</button>'
          );
        })
        .join('') +
      '</div><p class="faint small">Prayed in sets of two. Two suffice; the Prophet ﷺ is reported to have prayed four, and eight on the day of the Conquest.</p></div>';
    h +=
      '<div class="card pad0"><div class="list"><div class="set"><div class="grow"><div class="t">Remind me when it opens</div></div><div class="ctl">' +
      A.sw(S.notif.enabled && S.notif.duha.on, 'notif-toggle', ' data-k="duha"') +
      '</div></div><div class="set"><div class="grow"><div class="t">Start after sunrise</div><div class="s">Minutes</div></div><div class="ctl">' +
      A.stepper(S.offsets.ds, 'offset', ' data-k="ds"') +
      '</div></div><div class="set"><div class="grow"><div class="t">End before Dhuhr</div><div class="s">Minutes</div></div><div class="ctl">' +
      A.stepper(S.offsets.de, 'offset', ' data-k="de"') +
      '</div></div></div></div>';
    h +=
      '<div class="card">' +
      A.said('muslim:720') +
      A.said('muslim:748') +
      '<div class="refs" style="margin-top:12px"><a href="https://sunnah.com/muslim:720" data-a="ext">' +
      ic('link', 'xs') +
      'Ṣaḥīḥ Muslim 720</a><a href="https://sunnah.com/muslim:748a" data-a="ext">' +
      ic('link', 'xs') +
      'Muslim 748</a><a href="https://islamqa.info/en/answers/22389" data-a="ext">' +
      ic('link', 'xs') +
      'IslamQA 22389 · timing</a></div></div>';
    return { html: h, title: 'Ḍuḥā', tab: 3 };
  };
  A.acts['duha-rak'] = function (el) {
    var k = A.today(),
      v = +el.dataset.v;
    if (S.duha[k] === v) delete S.duha[k];
    else S.duha[k] = v;
    A.save();
    A.N.haptic('success');
    var f = A.checkBadges();
    if (f.length) A.toast('Achievement: ' + f[0].name, 'trophy');
    A.rerender();
  };
  A.acts.offset = function (el) {
    var k = el.dataset.k;
    S.offsets[k] = A.clamp(S.offsets[k] + +el.dataset.d * 5, 0, 60);
    A.save();
    A.rerender();
  };
  A.acts['notif-toggle'] = function (el) {
    var k = el.dataset.k;
    if (!S.notif.enabled) {
      A.enableNotifs(function (ok) {
        if (ok) {
          if (S.notif[k]) S.notif[k].on = true;
          A.save();
          A.rerender();
        }
      });
      return;
    }
    var o = S.notif[k];
    if (o && typeof o === 'object') o.on = !o.on;
    A.save();
    A.rerender();
  };

  /* ================= location ================= */
  A.setLocation = function (loc, quiet) {
    S.loc = loc;
    if (!S.travel.home) S.travel.home = { name: loc.name, lat: loc.lat, lng: loc.lng };
    if (S.calc.auto && loc.cc) {
      S.calc.method = P.methodFor(loc.cc);
      S.calc.asr =
        ['PK', 'IN', 'BD', 'AF', 'TR', 'AZ', 'UZ', 'TJ', 'KZ', 'KG', 'TM'].indexOf(loc.cc) >= 0 ? 'hanafi' : 'std';
    }
    A.save(true);
    if (!quiet) A.toast('Location set to ' + loc.name, 'pin');
  };
  /* travel: far enough from home that ẓuhr, ʿaṣr and ʿishāʾ are shortened (the distance is the user's choice; scholars differ) */
  A.travelling = function () {
    var t = S.travel,
      h = t && t.home;
    if (!t || !t.on || !h || !S.loc) return null;
    var km = distKm(h.lat, h.lng, S.loc);
    return km >= t.km ? { km: Math.round(km), from: h.name } : null;
  };
  A.SHORT = { dhuhr: 1, asr: 1, isha: 1 };
  function distKm(lat, lng, c) {
    var dLat = ((c.lat - lat) * Math.PI) / 180,
      dLng = ((c.lng - lng) * Math.PI) / 180,
      a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) * Math.cos((c.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 12742 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  /* Place names: a listed city within 30 km wins ("Ilorin", not the geocoder's "Ilorin town");
     otherwise administrative suffixes are trimmed from the geocoder's name. */
  var SUFFIX =
    /\s+(city|town|municipality|metropolitan municipality|metropolis|local government area|lga|district|urban|municipal council|city council)$/i;
  A.placeName = function (raw, lat, lng) {
    var nb = nearest(lat, lng);
    if (nb.c && nb.km < 30) return nb.c.name;
    var n = String(raw || '')
        .replace(/^city of\s+/i, '')
        .trim(),
      t = n.replace(SUFFIX, '').trim();
    if (t) n = t;
    return n || (nb.km < 40 ? nb.c.name : lat.toFixed(3) + ', ' + lng.toFixed(3));
  };
  function nearest(lat, lng) {
    var best = null,
      bd = 1e9;
    window.CITIES.forEach(function (c) {
      var d = distKm(lat, lng, c);
      if (d < bd) {
        bd = d;
        best = c;
      }
    });
    return { c: best, km: bd };
  }
  A.locateMe = function (cb) {
    var finish = function (r) {
      if (!r || r.error) {
        A.toast(
          r && r.error === 'denied'
            ? 'Location permission was denied'
            : r && r.error === 'off'
              ? 'Turn on location services and try again'
              : 'Could not get your location',
          'pin'
        );
        cb && cb(false);
        return;
      }
      var nb = nearest(r.lat, r.lng);
      var name = A.placeName(r.name, r.lat, r.lng);
      A.setLocation({
        name: name,
        country: r.country || (nb.km < 400 ? nb.c.country : ''),
        cc: r.cc || (nb.km < 400 ? nb.c.cc : ''),
        lat: +r.lat.toFixed(5),
        lng: +r.lng.toFixed(5),
        tz: '',
        src: 'gps'
      });
      cb && cb(true);
    };
    window.__native.onLocation = function (json) {
      var r;
      try {
        r = typeof json === 'string' ? JSON.parse(json) : json;
      } catch (e) {
        r = null;
      }
      finish(r);
    };
    if (A.N.location()) return;
    if (!navigator.geolocation) {
      finish(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (p) {
        finish({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      function (e) {
        finish({ error: e.code === 1 ? 'denied' : 'fail' });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
    );
  };
  /* Travel: when the location came from GPS, quietly re-check it on open (at most every 30 min) and move it if you are 25 km away or more. */
  A.autoLocate = function () {
    if (!A.N.has || !S.loc || S.loc.src !== 'gps' || !S.prefs.autoLoc) return;
    if (Date.now() - (S.loc.checked || 0) < 30 * MIN) return;
    var prev = window.__native.onLocation;
    window.__native.onLocation = function (json) {
      window.__native.onLocation = prev;
      var r;
      try {
        r = typeof json === 'string' ? JSON.parse(json) : json;
      } catch (e) {
        r = null;
      }
      if (!r || r.error) return;
      S.loc.checked = Date.now();
      var km = distKm(S.loc.lat, S.loc.lng, { lat: r.lat, lng: r.lng });
      if (km < 25) {
        A.save();
        return;
      }
      var nb = nearest(r.lat, r.lng),
        name = A.placeName(r.name, r.lat, r.lng);
      A.setLocation(
        {
          name: name,
          country: r.country || (nb.km < 400 ? nb.c.country : ''),
          cc: r.cc || (nb.km < 400 ? nb.c.cc : ''),
          lat: +r.lat.toFixed(5),
          lng: +r.lng.toFixed(5),
          tz: '',
          src: 'gps',
          checked: Date.now()
        },
        true
      );
      A.toast('You are in ' + name + '. Prayer times updated.', 'pin');
      A.rerender();
    };
    if (A.N.call('locateQuiet') !== true) window.__native.onLocation = prev;
  };

  /* Complete list grouped by country (sticky headers); search folds accents ("malmo" → Malmö). */
  var SORTED = null;
  function sorted() {
    if (!SORTED)
      SORTED = window.CITIES.map(function (c, i) {
        c.i = i;
        c.f = A.fold(c.name + ' ' + c.country);
        return c;
      })
        .slice()
        .sort(function (a, b) {
          return a.country.localeCompare(b.country) || a.name.localeCompare(b.name);
        });
    return SORTED;
  }
  function row(c, ob, extra) {
    return (
      '<button type="button" class="li" data-a="pick-city" data-i="' +
      c.i +
      '"' +
      (ob ? ' data-ob="1"' : '') +
      '><span class="badge s h-sand">' +
      ic('pin', 's') +
      '</span><div class="grow"><div class="t">' +
      esc(c.name) +
      '</div><div class="s">' +
      esc(extra || c.country) +
      '</div></div></button>'
    );
  }
  var cityTok = 0;
  A.cityList = function (q, onboarding) {
    var f = A.fold((q || '').trim()),
      list = sorted().filter(function (c) {
        return !f || c.f.indexOf(f) >= 0;
      }),
      h = '',
      last = '';
    if (!list.length)
      return '<div class="empty"><p>No match. Try a nearby major city, use your current location, or enter coordinates.</p></div>';
    if (!f && S.loc) {
      var near = sorted()
        .map(function (c) {
          return [c, distKm(S.loc.lat, S.loc.lng, c)];
        })
        .sort(function (a, b) {
          return a[1] - b[1];
        })
        .slice(0, 4);
      h +=
        '<div class="lhead">Nearby</div>' +
        near
          .map(function (x) {
            return row(x[0], onboarding, x[0].country + ' · ' + A.fmtN(Math.round(x[1])) + ' km');
          })
          .join('');
    }
    /* the first screenful paints at once; the rest follows a frame later so typing and opening stay instant */
    var rest = '',
      n = 0;
    list.forEach(function (c) {
      var x = '';
      if (c.country !== last) {
        x += '<div class="lhead">' + esc(c.country) + '</div>';
        last = c.country;
      }
      x += row(c, onboarding);
      if (n++ < 60) h += x;
      else rest += x;
    });
    if (rest) {
      var tok = 'lm' + ++cityTok;
      h += '<div class="lmore" id="' + tok + '"></div>';
      setTimeout(function () {
        var m = document.getElementById(tok);
        if (m) m.outerHTML = rest;
      }, 80);
    }
    return h;
  };
  A.V.location = function () {
    var h =
      (S.profile.onboarded ? A.back('Back') : '') +
      '<header class="top"><div class="tt"><div class="eyebrow">For prayer times & qibla</div><h1>Location</h1></div></header>';
    if (S.loc)
      h +=
        '<div class="card row"><div class="badge h-gold">' +
        ic('pin') +
        '</div><div class="grow"><div style="font-weight:800">' +
        esc(S.loc.name) +
        '</div><div class="faint small">' +
        (S.loc.country ? esc(S.loc.country) + ' · ' : '') +
        S.loc.lat.toFixed(3) +
        ', ' +
        S.loc.lng.toFixed(3) +
        (S.loc.src === 'gps' ? ' · GPS' : '') +
        '</div></div></div>';
    h +=
      '<button type="button" class="btn pri wide" data-a="locate">' +
      ic('locate', 's') +
      'Use my current location</button>';
    h +=
      '<label class="search">' +
      ic('search', 's') +
      '<input id="cq" type="search" placeholder="Search ' +
      window.CITIES.length +
      ' cities or countries" autocomplete="off" aria-label="Search cities"></label><div class="card pad0" style="overflow:visible"><div class="list" id="cl">' +
      A.cityList('') +
      '</div></div>';
    h += '<button type="button" class="btn ghost" data-a="coords">Enter coordinates manually</button>';
    return {
      html: h,
      title: 'Location',
      tab: S.profile.onboarded ? 3 : -1,
      bare: !S.profile.onboarded,
      mount: function (el) {
        var q = $('#cq', el);
        q.addEventListener(
          'input',
          A.debounce(function () {
            $('#cl', el).innerHTML = A.cityList(q.value);
          }, 120)
        );
      }
    };
  };
  A.acts.locate = function (el) {
    el.innerHTML = '<span class="spin"></span>Locating…';
    el.disabled = true;
    A.locateMe(function (ok) {
      if (ok) {
        if (A.route().name === 'location') A.goBack('#/salah');
        else A.rerender();
      } else {
        el.disabled = false;
        el.innerHTML = ic('locate', 's') + 'Try again';
      }
    });
  };
  A.acts['pick-city'] = function (el) {
    var c = window.CITIES[+el.dataset.i];
    if (!c) return;
    A.setLocation(
      { name: c.name, country: c.country, cc: c.cc, lat: c.lat, lng: c.lng, tz: c.tz, src: 'city' },
      !!el.dataset.ob
    );
    A.N.haptic('success');
    if (el.dataset.ob) {
      A.obNext && A.obNext();
      return;
    }
    A.goBack('#/salah');
  };
  A.acts.coords = function () {
    A.sheet(
      'Coordinates',
      '<div class="grid2"><div class="field"><label for="la">Latitude</label><input class="input" id="la" inputmode="decimal" placeholder="21.4225"></div><div class="field"><label for="lo">Longitude</label><input class="input" id="lo" inputmode="decimal" placeholder="39.8262"></div></div><div class="field"><label for="ln">Name</label><input class="input" id="ln" placeholder="Home"></div><button type="button" class="btn pri wide" id="lok">Save</button>',
      {
        mount: function (el, o) {
          $('#lok', el).addEventListener('click', function () {
            var la = parseFloat($('#la', el).value),
              lo = parseFloat($('#lo', el).value);
            if (!(la >= -90 && la <= 90 && lo >= -180 && lo <= 180)) {
              A.toast('Enter valid coordinates');
              return;
            }
            var nb = nearest(la, lo);
            A.setLocation({
              name: $('#ln', el).value.trim() || (nb.km < 40 ? nb.c.name : la.toFixed(3) + ', ' + lo.toFixed(3)),
              country: nb.km < 400 ? nb.c.country : '',
              cc: nb.km < 400 ? nb.c.cc : '',
              lat: la,
              lng: lo,
              tz: '',
              src: 'manual'
            });
            o.close();
            A.rerender();
          });
        }
      }
    );
  };
  if (S.loc && S.loc.src === 'gps' && isFinite(S.loc.lat)) {
    var nm = A.placeName(S.loc.name, S.loc.lat, S.loc.lng);
    if (nm !== S.loc.name) {
      S.loc.name = nm;
      A.save();
    }
  }

  /* ================= make-up prayers (qaḍāʾ) =================
     A private count of prayers owed. Praying one lowers the count; no streaks, no pressure. */
  var QK = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  A.qadaTotal = function () {
    var q = S.qada;
    return QK.reduce(function (a, k) {
      return a + (q[k] || 0);
    }, 0);
  };
  A.V.qada = function () {
    var q = S.qada,
      owed = A.qadaTotal(),
      made = q.made || 0,
      all = owed + made,
      f = all ? made / all : 0;
    var h =
      A.back('Ṣalāh', '#/salah') +
      '<header class="top"><div class="tt"><div class="eyebrow">Qaḍāʾ</div><h1>Make-up prayers</h1></div></header>';
    h +=
      '<div class="card col qd-hero"><div class="row" style="gap:16px">' +
      A.ring(f, 84, owed ? '<b class="num">' + A.fmtN(owed) + '</b><span>owed</span>' : ic('check')) +
      '<div class="grow"><div style="font-weight:700;font-size:17px">' +
      (owed ? A.plural(owed, 'prayer') + ' to make up' : all ? 'All made up, alḥamdulillāh' : 'Nothing recorded') +
      '</div><div class="muted small" style="margin-top:4px">' +
      (made ? A.fmtN(made) + ' made up so far.' : 'Add the prayers you missed, then log each one as you pray it.') +
      '</div></div></div></div>';
    h +=
      '<div class="sec"><h2>By prayer</h2></div><div class="card pad0"><div class="list">' +
      QK.map(function (k) {
        return (
          '<div class="set qd-row"><div class="grow"><div class="t">' +
          P.NAMES[k] +
          '</div><div class="s">' +
          (q[k] ? A.fmtN(q[k]) + ' owed' : 'None owed') +
          '</div></div><div class="ctl qd-ctl"><button type="button" class="ib ghost" data-a="qd-add" data-k="' +
          k +
          '" data-n="-1" aria-label="One fewer ' +
          P.NAMES[k] +
          ' owed"' +
          (q[k] ? '' : ' disabled') +
          '>' +
          ic('minus', 's') +
          '</button><span class="num">' +
          (q[k] || 0) +
          '</span><button type="button" class="ib ghost" data-a="qd-add" data-k="' +
          k +
          '" data-n="1" aria-label="One more ' +
          P.NAMES[k] +
          ' owed">' +
          ic('plus', 's') +
          '</button>' +
          (q[k] ? '<button type="button" class="btn sec sm" data-a="qd-pray" data-k="' + k + '">Prayed</button>' : '') +
          '</div></div>'
        );
      }).join('') +
      '</div></div>';
    h +=
      '<div class="sec"><h2>Add missed days</h2></div><div class="card col"><p class="muted small">Adds one of each prayer per day.</p><div class="row" style="gap:8px;flex-wrap:wrap">' +
      [1, 7, 30, 365]
        .map(function (d) {
          return (
            '<button type="button" class="chip" data-a="qd-days" data-d="' +
            d +
            '">+ ' +
            (d === 365 ? '1 year' : A.plural(d, 'day')) +
            '</button>'
          );
        })
        .join('') +
      '</div></div>';
    h += '';
    if (all) h += '<button type="button" class="btn ghost wide" data-a="qd-reset">Clear the record</button>';
    return { html: h, title: 'Make-up prayers', tab: 3 };
  };
  A.acts['qd-add'] = function (el) {
    var k = el.dataset.k;
    S.qada[k] = Math.max(0, (S.qada[k] || 0) + +el.dataset.n);
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['qd-pray'] = function (el) {
    var k = el.dataset.k;
    if (!S.qada[k]) return;
    S.qada[k]--;
    S.qada.made = (S.qada.made || 0) + 1;
    A.save();
    A.N.haptic('success');
    A.fx.click();
    A.toast(P.NAMES[k] + ' made up. May Allah accept it.', 'check');
    A.rerender();
  };
  A.acts['qd-days'] = function (el) {
    var d = +el.dataset.d;
    QK.forEach(function (k) {
      S.qada[k] = (S.qada[k] || 0) + d;
    });
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['qd-reset'] = function () {
    A.confirm(
      'Clear the record?',
      'Owed and made-up counts return to zero.',
      'Clear',
      function () {
        S.qada = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, made: 0 };
        A.save();
        A.rerender();
      },
      true
    );
  };
  if (S.loc && !S.travel.home) {
    S.travel.home = { name: S.loc.name, lat: S.loc.lat, lng: S.loc.lng };
    A.save();
  }
})();
