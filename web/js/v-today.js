/* Today — the living dashboard. Every block reacts to the time of day and to progress. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    esc = A.esc,
    ic = A.icon;
  var MIN = 60000;

  /* What deserves attention right now — in priority order. */
  A.suggest = function (n) {
    var k = n.key,
      out = [];
    function sess(cid, prayer, why) {
      var p = A.progress(k, cid, prayer),
        c = A.col(cid);
      if (p.complete) return;
      out.push({
        t: prayer ? 'After ' + P.NAMES[prayer] : c.title + (cid === 'sleep' || cid === 'waking' ? '' : ' adhkār'),
        sub:
          why ||
          (p.started
            ? p.done + ' of ' + p.total + ' · continue where you left off'
            : A.plural(p.total, 'remembrance') + ' · about ' + A.estimate(cid, prayer) + ' min'),
        href: '#/r/' + cid + '/' + A.firstOpen(k, cid, prayer) + (prayer ? '/' + prayer : ''),
        hue: c.hue,
        icon: c.icon,
        frac: p.frac
      });
    }
    if (!n.t) {
      sess(A.parts().h < 12 ? 'morning' : 'evening');
      return out[0] || null;
    }
    var t = n.t,
      now = n.now;
    if (!A.isExcused(k) && n.cur && n.prev.key === k && now - t[n.cur] < 40 * MIN && now - t[n.cur] > 4 * MIN)
      sess('salah', n.cur, 'The remembrance after the obligatory prayer');
    if (now >= t.fajr && now < t.dhuhr)
      sess('morning', null, now < t.sunrise ? 'The best time is now, before sunrise at ' + A.fmtTxt(t.sunrise) : null);
    if (now >= t.duhaStart && now < t.duhaEnd && !S.duha[k])
      out.push({
        t: 'Ṣalāt al-Ḍuḥā',
        sub: 'Open until ' + A.fmtTxt(t.duhaEnd) + ' · two rakʿahs or more',
        href: '#/duha',
        hue: 'gold',
        icon: 'sun',
        frac: 0
      });
    if (now >= t.asr && now < t.isha)
      sess('evening', null, now < t.maghrib ? 'Before sunset, ' + A.fmtDur(t.maghrib - now, true) + ' left' : null);
    var nk = n.nightKey,
      nn = n.night;
    if (nn && now >= nn.lastThird && now < nn.nextFajr && !(S.nights[nk] && S.nights[nk].dhikr))
      out.push({
        t: 'The last third of the night',
        sub: 'Our Lord descends and asks: who is calling upon Me?',
        href: '#/night',
        hue: 'night',
        icon: 'moon',
        frac: 0
      });
    if (now >= t.isha + 30 * MIN || now < t.fajr - 60 * MIN) sess('sleep', null, 'Close the day with remembrance');
    return out[0] || null;
  };

  /* between the times of remembrance: what opens next, so Today always has one clear lead */
  function upNext(n) {
    var t = n.t,
      now = n.now,
      k = n.key;
    if (!t) return null;
    var open = function (cid, at, hue, icon, href) {
      var p = A.progress(k, cid);
      if (p.complete) return null;
      var c = A.col(cid);
      return {
        t: c.title + (cid === 'sleep' ? '' : ' adhkār'),
        sub: A.T('From') + ' ' + A.fmtTxt(at) + ' · ' + A.T('in') + ' ' + A.fmtDur(at - now, true),
        hue: hue,
        icon: icon,
        href: href || '#/c/' + cid
      };
    };
    if (now >= t.dhuhr && now < t.asr) return open('evening', t.asr, 'dusk', 'sunset');
    if (now >= t.isha && now < t.isha + 30 * MIN) return open('sleep', t.isha + 30 * MIN, 'night', 'bed');
    if (now < t.fajr && now >= t.fajr - 60 * MIN) return open('morning', t.fajr, 'dawn', 'sunrise');
    return null;
  }

  function journey(k, n) {
    var d = A.dayDone(k),
      pr = A.progress,
      m = pr(k, 'morning'),
      e = pr(k, 'evening'),
      sl = pr(k, 'sleep');
    var sal = d.salahN,
      lastP = n.cur && A.PRAYERS.indexOf(n.cur) >= 0 && n.prev.key === k ? n.cur : 'fajr';
    var pct = function (p) {
      return p.complete ? ic('check', 's') : Math.round(p.frac * 100) + '%';
    };
    var ring = function (href, hue, frac, inner, label, done) {
      return (
        '<a class="jr h-' +
        hue +
        (done ? ' done' : '') +
        '" href="' +
        href +
        '">' +
        A.ring(frac, 46, inner, null, 3.4) +
        '<span>' +
        label +
        '</span></a>'
      );
    };
    var tog = function (href, hue, on, icon, label) {
      return (
        '<a class="jp h-' +
        hue +
        (on ? ' done' : '') +
        '" href="' +
        href +
        '">' +
        ic(on ? 'check' : icon, 's') +
        '<span>' +
        label +
        '</span></a>'
      );
    };
    var rings = [ring('#/c/morning', 'dawn', m.frac, pct(m), 'Morning', m.complete)];
    if (!A.isExcused(k))
      rings.push(
        ring('#/c/salah/' + lastP, 'jade', sal / 5, sal === 5 ? ic('check', 's') : sal + '/5', 'After ṣalāh', sal === 5)
      );
    rings.push(
      ring('#/c/evening', 'dusk', e.frac, pct(e), 'Evening', e.complete),
      ring('#/c/sleep', 'indigo', sl.frac, pct(sl), 'Sleep', sl.complete)
    );
    return (
      '<div class="card journey2"><div class="jg" style="--n:' +
      rings.length +
      '">' +
      rings.join('') +
      '</div><div class="jt">' +
      tog('#/duha', 'gold', d.duha, 'sun', 'Ḍuḥā') +
      tog('#/night', 'night', d.night, 'moon', 'Qiyām') +
      tog('#/calendar', 'sand', !!S.fasts[k], 'fast', 'Fasting') +
      '</div></div>'
    );
  }

  function cycleNudge() {
    if (S.profile.gender !== 'f' || S.excused.on) return '';
    var c = A.cycle();
    if (!c.due) return '';
    return (
      '<div class="card col h-rose cyc-nudge"><div class="row"><span class="badge s">' +
      ic('moonstar', 's') +
      '</span><div class="grow"><div style="font-weight:700">' +
      (c.inDays > 0
        ? 'Your days may begin tomorrow'
        : c.inDays === 0
          ? 'Your days may begin today'
          : 'Your days may have begun') +
      '</div><div class="faint small">When they do, start your break</div></div></div><div class="grid2"><button type="button" class="btn ghost sm" data-a="cyc-later">Not yet</button><button type="button" class="btn pri sm" data-a="break-on">Start break</button></div></div>'
    );
  }
  function breakCard() {
    if (!S.excused.on) return '';
    var d = A.excusedDay(),
      c = A.cycle();
    if (c.nifas)
      return (
        '<div class="card col h-rose glowcard"><div class="row" style="align-items:flex-start"><span class="badge">' +
        ic('heart') +
        '</span><div class="grow"><div class="eyebrow" style="color:var(--h)">After childbirth · day ' +
        d +
        '</div><div style="font-weight:700;font-size:16px;margin-top:4px">' +
        (c.usualDone ? 'Forty days have passed' : 'Your remembrance continues') +
        '</div>' +
        (c.usualDone
          ? '<div class="muted small" style="margin-top:3px">Take ghusl and pray, even if bleeding continues.</div>'
          : '') +
        A.said('abudawud:311', '', true) +
        '</div></div><div class="grid2"><a class="btn sec sm" href="#/answered">Times of duʿāʾ</a><button type="button" class="btn pri sm" data-a="break-off">I am pure</button></div></div>'
      );
    if (c.usualDone)
      return (
        '<div class="card col h-rose glowcard"><div class="row" style="align-items:flex-start"><span class="badge">' +
        ic('moonstar') +
        '</span><div class="grow"><div class="eyebrow" style="color:var(--h)">Day ' +
        d +
        ' · your usual is ' +
        c.len +
        '</div><div style="font-weight:700;font-size:16px;margin-top:4px">Look for the signs of purity</div><div class="muted small" style="margin-top:3px">' +
        (c.long
          ? 'Bleeding well past your habit may be istiḥāḍah, when prayer continues. Ask a scholar.'
          : 'When you see them, take ghusl and pray the prayer whose time you are in.') +
        '</div></div></div><div class="grid2"><button type="button" class="btn sec sm" data-a="cyc-later">Not yet</button><button type="button" class="btn pri sm" data-a="break-off">I am pure</button></div></div>'
      );
    return (
      '<div class="card col h-rose glowcard"><div class="row" style="align-items:flex-start"><span class="badge">' +
      ic('moonstar') +
      '</span><div class="grow"><div class="eyebrow" style="color:var(--h)">Break from ṣalāh · day ' +
      d +
      '</div><div style="font-weight:700;font-size:16px;margin-top:4px">Your remembrance continues</div><div class="muted small" style="margin-top:3px">Adhkār, duʿāʾ and dhikr are all still yours. Prayer tracking and prayer reminders are paused, and your streak is protected.</div></div></div><div class="grid2"><a class="btn sec sm" href="#/answered">Times of duʿāʾ</a><button type="button" class="btn pri sm" data-a="break-off">End break</button></div></div>'
    );
  }
  /* One panel: today's progress ring, tap-to-log prayers, and the day's key numbers. */
  function dash(k, n, st) {
    var d = A.dayDone(k),
      exc = A.isExcused(k),
      pr = S.prayed[k] || {};
    var goals = [d.morning, d.evening, d.sleep].concat(
      exc
        ? []
        : A.PRAYERS.map(function (p) {
            return d.salah[p];
          })
    );
    var done = goals.filter(Boolean).length,
      trk = S.tasbih.days[k] || 0;
    var track = S.loc && S.prefs.trackPrayers && !exc,
      np = A.PRAYERS.filter(function (p) {
        return pr[p];
      }).length;
    var h =
      '<section class="card" id="dash"><div class="dash">' +
      (track
        ? A.ring(np / 5, 86, '<b>' + np + '<i>/5</i></b><small>prayed</small>', 'var(--gold)', 5)
        : A.ring(
            done / goals.length,
            86,
            '<b>' + done + '<i>/' + goals.length + '</i></b><small>today</small>',
            'var(--gold)',
            5
          )) +
      '<div>';
    if (S.loc && S.prefs.trackPrayers && !exc) {
      h +=
        '<div class="eyebrow" style="margin-bottom:10px">Today’s prayers</div><div class="pdots">' +
        A.PRAYERS.map(function (p) {
          var due = n.t && n.t[p] <= n.now,
            on = !!pr[p];
          return (
            '<button type="button" class="pdot' +
            (on ? ' on' : due ? ' due' : ' later') +
            '" data-a="dash-pray" data-p="' +
            p +
            '" aria-pressed="' +
            on +
            '" aria-label="' +
            P.NAMES[p] +
            (on ? ' prayed' : '') +
            '"><b>' +
            ic('check', 'xs') +
            '</b><span>' +
            P.NAMES[p] +
            '</span></button>'
          );
        }).join('') +
        '</div>';
    } else {
      h +=
        '<div style="font-weight:700;font-size:16px">' +
        (done === goals.length ? 'All done today' : 'Today’s sessions') +
        '</div><div class="muted small">' +
        (exc ? 'Prayer tracking is paused during your break.' : 'Morning, evening and sleep adhkār.') +
        '</div>';
    }
    /* only figures that mean something yet */
    h +=
      '<div class="meta">' +
      (trk ? '<span><b>' + A.fmtN(trk) + '</b> counted</span>' : '') +
      (st.cur ? '<span><b>' + st.cur + '</b> day streak</span>' : '') +
      (S.loc ? '<span>Qibla <b>' + Math.round(P.qibla(S.loc.lat, S.loc.lng)) + '°</b></span>' : '') +
      '</div></div></div></section>';
    return h;
  }
  A.acts['dod-share'] = function () {
    var x = A.dailyDhikr(A.today());
    if (x) A.openShare(x.it, { title: 'Dhikr of the day', hue: x.c.hue });
  };
  A.acts['dash-pray'] = function (el) {
    var k = A.today(),
      p = el.dataset.p;
    if (!(S.prayed[k] || {})[p] && !A.canLog(k, p)) {
      A.notYet(k, p);
      return;
    }
    var o = (S.prayed[k] = S.prayed[k] || {});
    if (o[p]) delete o[p];
    else o[p] = Date.now();
    var on = !!o[p];
    if (!Object.keys(o).length) delete S.prayed[k];
    A.save();
    A.N.haptic(on ? 'success' : 'tick');
    if (on) A.fx.click();
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', on);
    if (on && !A.progress(k, 'salah', p).complete) A.toast('Next: the adhkār after ' + P.NAMES[p], 'mosque');
  };
  function quick() {
    var items = [
      ['#/tracker', 'tracker', 'teal', 'Tracker'],
      ['#/qibla', 'compass', 'jade', 'Qibla'],
      ['#/answered', 'hands', 'night', 'Duʿāʾ times'],
      ['#/deeds', 'heart', 'rose', 'Small deeds']
    ];
    return (
      '<div class="qa">' +
      items
        .map(function (x) {
          return (
            '<a href="' + x[0] + '" class="h-' + x[2] + '"><span class="badge">' + ic(x[1]) + '</span>' + x[3] + '</a>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function week(k) {
    var h = '';
    for (var i = 6; i >= 0; i--) {
      var d = A.shift(k, -i),
        dd = A.dayDone(d),
        both = dd.morning && dd.evening,
        one = dd.morning || dd.evening || dd.salahN || dd.sleep;
      h +=
        '<div class="' +
        (i === 0 ? 'today' : '') +
        '">' +
        A.DOW[A.dow(d)].slice(0, 1) +
        '<b class="' +
        (both ? 'full' : one ? 'half' : '') +
        '">' +
        +d.slice(8) +
        '</b></div>';
    }
    return '<div class="week">' + h + '</div>';
  }

  function dhikrOfDay(k) {
    var x = A.dailyDhikr(k);
    if (!x) return '';
    return (
      '<div class="card dod h-' +
      x.c.hue +
      '"><div class="spread"><div class="eyebrow" style="color:var(--h)">Dhikr of the day</div><span class="faint small">' +
      esc(x.c.id === 'morning' ? 'Morning & evening' : x.c.title) +
      '</span></div><div class="ar" lang="ar">' +
      esc(x.it.ar) +
      '</div><div class="en">' +
      esc(x.it.en) +
      '</div><div class="foot"><span class="faint small clamp1" style="flex:1">' +
      esc(x.it.refs && x.it.refs[0] ? x.it.refs[0].l : '') +
      '</span><button type="button" class="ib ghost sm" data-a="dod-share" aria-label="Share">' +
      ic('share', 's') +
      '</button><a class="btn sec sm" href="#/r/' +
      x.c.id +
      '/' +
      x.i +
      (x.c.perPrayer ? '/fajr' : '') +
      '">Read' +
      ic('right', 'xs') +
      '</a></div></div>'
    );
  }

  function lanterns() {
    var one = function (x, len, sc) {
      return (
        '<svg width="' +
        34 * sc +
        '" height="' +
        (len + 70 * sc) +
        '" viewBox="0 0 34 ' +
        (len + 70 * sc) / sc +
        '" style="left:' +
        x +
        'px"><line x1="17" y1="0" x2="17" y2="' +
        len / sc +
        '" stroke="#c9a35c" stroke-width="1"/><g transform="translate(0 ' +
        len / sc +
        ')"><path d="M12 0h10l3 6H9z" fill="#c9933c"/><path d="M8 6h18l-2 30H10z" fill="#2a1c08" stroke="#e9b65a" stroke-width="1.2"/><path d="M12 10h10l-1 22h-8z" fill="#ffcf73" class="flame" opacity=".9"/><path d="M17 10v22M12.5 20h9" stroke="#c9933c" stroke-width=".8"/><path d="M10 36h14l-3 6h-8z" fill="#c9933c"/><circle cx="17" cy="45" r="1.8" fill="#e9b65a"/></g></svg>'
      );
    };
    return (
      '<div class="lanterns" aria-hidden="true">' + one(10, 30, 0.9) + one(58, 62, 1.1) + one(108, 18, 0.8) + '</div>'
    );
  }

  A.V.today = function () {
    var n = A.now(),
      k = n.key,
      st = A.streaks(),
      tot = A.totals(),
      sug = A.suggest(n),
      occ = A.occasion(k, !!(n.t && n.now >= n.t.maghrib && n.now < n.t.nextFajr && n.key === k));
    var name = (S.profile.name || '').split(' ')[0];
    var rm = A.ramadanInfo ? A.ramadanInfo() : { on: false };
    var h =
      (rm.on ? lanterns() : '') +
      '<header class="top"><div class="tt"><div class="eyebrow">' +
      (rm.on ? 'Ramaḍān Mubārak · day ' + rm.day : 'As-salāmu ʿalaykum') +
      '</div><h1>' +
      (name ? esc(name) : 'Welcome <em>back</em>') +
      '</h1></div><div class="acts"><a class="ib ghost" href="#/search" aria-label="Search">' +
      ic('search', 's') +
      '</a><button type="button" class="ib ghost" data-a="theme" aria-label="Theme">' +
      ic('palette', 's') +
      '</button><a href="#/profile" aria-label="Profile">' +
      A.avatar(42) +
      '</a></div></header>';
    if (rm.on) h += A.ramadanCard();
    h += A.skyHTML(n);
    var nx = sug ? null : upNext(n);
    if (nx)
      h +=
        '<a class="card focus soon press h-' +
        nx.hue +
        '" href="' +
        nx.href +
        '"><span class="badge s">' +
        ic(nx.icon, 's') +
        '</span><div class="grow"><div class="eyebrow" style="color:var(--h)">Next</div><div class="ttl">' +
        esc(nx.t) +
        '</div><div class="sub">' +
        esc(nx.sub) +
        '</div></div>' +
        ic('right', 's') +
        '</a>';
    if (sug)
      h +=
        '<a class="card focus press h-' +
        sug.hue +
        '" href="' +
        sug.href +
        '">' +
        A.ring(sug.frac, 52, ic(sug.icon, 's'), 'var(--h)', 3.6) +
        '<div class="grow"><div class="eyebrow" style="color:var(--h)">Now</div><div class="ttl">' +
        esc(sug.t) +
        '</div><div class="sub">' +
        esc(sug.sub) +
        '</div></div><span class="go">' +
        ic('play', 's fill') +
        '</span></a>';
    h += breakCard();
    var ll = S.learn && S.learn.last;
    if (ll && ll.i > 0 && Date.now() - ll.at < 12 * 3600000)
      h +=
        '<a class="occ slim press h-gold" href="#/learn/' +
        ll.p +
        '"><div class="badge s">' +
        ic('mosque', 's') +
        '</div><div class="grow"><div class="t">' +
        esc(A.T('Continue learning the prayer')) +
        '</div><div class="d">' +
        esc(A.T('Step') + ' ' + (ll.i + 1) + ' ' + A.T('of') + ' ' + ll.n) +
        '</div></div>' +
        ic('right', 's') +
        '</a>';
    if (!rm.on && A.ramadanCard) h += A.ramadanCard();
    h += dash(k, n, st);
    h += A.answeredCard ? A.answeredCard() : '';
    h += quick();
    h += '<div class="sec"><h2>Remembrance</h2><a href="#/adhkar">Library</a></div>' + journey(k, n);
    A.hint('today', 'Tap a prayer once you have prayed it', 'mosque');
    h += cycleNudge();
    var ans = A.answerNow && A.answerNow(),
      trv = A.travelling && A.travelling();
    if (trv)
      h +=
        '<a class="occ slim press h-teal" href="#/salah"><div class="badge s" style="--h:var(--teal)">' +
        ic('compass', 's') +
        '</div><div class="grow"><div class="t">Travelling · ' +
        A.fmtN(trv.km) +
        ' km</div><div class="d">Shorten and combine your prayers</div></div>' +
        ic('right', 's') +
        '</a>';
    if (ans)
      h +=
        '<a class="occ slim press h-gold ans-now" href="#/journal"><div class="badge s" style="--h:var(--gold2)">' +
        ic('hands', 's') +
        '</div><div class="grow"><div class="t">' +
        esc(ans.t) +
        '</div><div class="d">Duʿāʾ is answered now</div></div>' +
        ic('right', 's') +
        '</a>';
    if (occ.length)
      h +=
        '<a class="occ slim press h-' +
        occ[0].h +
        '" href="#/calendar"><div class="badge s" style="--h:var(--' +
        occ[0].h +
        ')">' +
        ic(occ[0].ic, 's') +
        '</div><div class="grow"><div class="t">' +
        esc(occ[0].t) +
        '</div><div class="d">' +
        esc(occ[0].d) +
        '</div></div><span class="faint">' +
        ic('right', 's') +
        '</span></a>';
    h += dhikrOfDay(k);
    h +=
      '<div class="sec"><h2>This week</h2><a href="#/insights">' +
      A.fmtN(tot.dhikr) +
      ' remembrances</a></div><a class="card press" href="#/insights">' +
      week(k) +
      '</a>';
    return {
      html: h,
      title: 'Today',
      tab: 0,
      tick: function (el) {
        var nn = A.now();
        A.skyTick(el, nn);
        if (A.ramadanTick) A.ramadanTick(el);
        if (n.t && nn.next.at !== n.next.at) A.rerender();
      }
    };
  };
})();
