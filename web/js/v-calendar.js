/* Hijri calendar — Umm al-Qurā months, Islamic occasions, Sunnah fasting days and a fasting log. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    esc = A.esc,
    ic = A.icon;
  var cur = null; /* {y, m} hijri month being viewed */
  var FAST_TYPES = [
    ['sunnah', 'Sunnah fast'],
    ['ramadan', 'Ramaḍān'],
    ['qada', 'Make-up (qaḍāʾ)'],
    ['other', 'Voluntary / vow']
  ];

  /* occasions on a specific civil day */
  A.dayOcc = function (key) {
    var h = A.hijri(key),
      dw = A.dow(key),
      o = [];
    if (h.m === 9) o.push({ t: 'Ramaḍān', h: 'goldh' });
    if (h.m === 10 && h.d === 1) o.push({ t: 'ʿĪd al-Fiṭr', h: 'rose', nofast: true });
    if (h.m === 12 && h.d === 9) o.push({ t: 'Day of ʿArafah', h: 'goldh' });
    if (h.m === 12 && h.d >= 10 && h.d <= 13)
      o.push({ t: h.d === 10 ? 'ʿĪd al-Aḍḥā' : 'Days of Tashrīq', h: 'rose', nofast: true });
    else if (h.m === 12 && h.d <= 8) o.push({ t: 'First ten of Dhū al-Ḥijjah', h: 'goldh' });
    if (h.m === 1 && h.d === 10) o.push({ t: 'ʿĀshūrāʾ', h: 'teal' });
    if (h.m === 1 && h.d === 9) o.push({ t: 'Tāsūʿāʾ', h: 'teal' });
    if (h.m === 10 && h.d >= 2 && h.d <= 7) o.push({ t: 'Six of Shawwāl', h: 'sand' });
    if (h.d >= 13 && h.d <= 15 && h.m !== 9 && !(h.m === 12 && h.d === 13)) o.push({ t: 'White Day', h: 'sand' });
    if ((dw === 1 || dw === 4) && h.m !== 9)
      o.push({ t: dw === 1 ? 'Monday · Sunnah fast' : 'Thursday · Sunnah fast', h: 'sand', minor: true });
    if (dw === 5) o.push({ t: 'Jumuʿah', h: 'jade', minor: true });
    return o;
  };

  function firstOfMonth(y, m) {
    var t = A.today(),
      h = A.hijri(t),
      target = y * 12 + m;
    var k = A.shift(t, Math.round((target - (h.y * 12 + h.m)) * 29.53) - (h.d - 1));
    for (var i = 0; i < 8; i++) {
      var x = A.hijri(k),
        cm = x.y * 12 + x.m;
      if (cm === target) {
        if (x.d === 1) return k;
        k = A.shift(k, -(x.d - 1));
      } else if (cm < target) k = A.shift(k, 31 - x.d);
      else k = A.shift(k, -x.d);
    }
    return k;
  }
  function monthDays(y, m) {
    var k = firstOfMonth(y, m),
      out = [];
    for (var i = 0; i < 31; i++) {
      var d = A.shift(k, i),
        h = A.hijri(d);
      if (h.m !== m) break;
      out.push(d);
    }
    return out;
  }

  function upcoming(from) {
    var out = [],
      seen = {};
    for (var i = 1; i < 400 && out.length < 6; i++) {
      var d = A.shift(from, i);
      A.dayOcc(d).forEach(function (o) {
        if (o.minor || (o.t === 'Ramaḍān' && A.hijri(d).d !== 1) || (o.t === 'White Day' && A.hijri(d).d !== 13))
          return;
        var key = o.t + A.hijri(d).y;
        if (seen[key]) return;
        seen[key] = 1;
        out.push({ d: d, o: o, in: i });
      });
    }
    return out;
  }

  A.V.calendar = function (a) {
    var t = A.today(),
      th = A.hijri(t);
    if (!cur || a[0] === 'today') cur = { y: th.y, m: th.m };
    var ds = monthDays(cur.y, cur.m),
      first = ds[0],
      last = ds[ds.length - 1],
      lead = A.dow(first);
    var fasted = ds.filter(function (d) {
      return S.fasts[d];
    }).length;
    var h =
      '<header class="top"><div class="tt"><div class="eyebrow">' +
      esc(A.fmtDate(first, 'short') + ' to ' + A.fmtDate(last, 'short')) +
      '</div><h1' +
      (A.hijri(first).name.length > 12 ? ' class="long"' : '') +
      '><span class="nobr">' +
      esc(A.hijri(first).name) +
      '</span> <em>' +
      cur.y +
      '</em></h1></div><div class="acts"><button type="button" class="ib" data-a="cal-nav" data-d="-1" aria-label="Previous month">' +
      ic('left', 's') +
      '</button><button type="button" class="ib" data-a="cal-nav" data-d="1" aria-label="Next month">' +
      ic('right', 's') +
      '</button></div></header>';
    h +=
      '<div class="card col"><div class="spread"><span class="ar" style="font-size:22px;color:var(--gold2)">' +
      esc(A.hijri(first).ar) +
      '</span>' +
      (cur.y !== th.y || cur.m !== th.m
        ? '<button type="button" class="chip on" data-a="cal-today">Today</button>'
        : fasted
          ? '<span class="chip">' + fasted + ' fasted</span>'
          : '') +
      '</div>';
    h +=
      '<div class="calg">' +
      ['S', 'M', 'T', 'W', 'T', 'F', 'S']
        .map(function (x) {
          return '<span class="dw">' + x + '</span>';
        })
        .join('');
    for (var i = 0; i < lead; i++) h += '<span></span>';
    ds.forEach(function (d) {
      var hh = A.hijri(d),
        oc = A.dayOcc(d).filter(function (o) {
          return !o.minor;
        }),
        act = A.dayDone(d).score > 0;
      h +=
        '<button type="button" data-a="cal-day" data-k="' +
        d +
        '" class="' +
        (d === t ? 'today ' : '') +
        (oc.length ? 'occ h-' + oc[0].h + ' ' : '') +
        (S.fasts[d] ? 'fast' : S.fastPlan && S.fastPlan[d] && d >= t ? 'plan' : '') +
        '" aria-label="' +
        esc(
          hh.d +
            ' ' +
            hh.name +
            ', ' +
            A.fmtDate(d) +
            (oc.length ? ', ' + oc[0].t : '') +
            (S.fasts[d] ? ', fasted' : S.fastPlan && S.fastPlan[d] && d >= t ? ', planned fast' : '')
        ) +
        '"><b>' +
        hh.d +
        '</b><span>' +
        +d.slice(8) +
        (d.slice(8) === '01' || d === first ? ' ' + A.MONTHS[+d.slice(5, 7) - 1].slice(0, 3) : '') +
        '</span>' +
        (act ? '<i></i>' : '') +
        '</button>';
    });
    h +=
      '</div><div class="legend"><span><i style="background:color-mix(in srgb,var(--sand) 40%,var(--s2))"></i>Sunnah days</span><span><i style="background:color-mix(in srgb,var(--rose) 40%,var(--s2))"></i>ʿĪd</span><span><i style="background:var(--goldh);border-radius:50%"></i>Fasted</span><span><i style="border:1.5px dashed var(--goldh);border-radius:50%;background:none"></i>Planned</span><span><i style="background:var(--jade);border-radius:50%"></i>Remembrance</span></div></div>';
    var up = upcoming(t);
    h +=
      '<a class="card coll press h-gold" href="#/ramadan"><div class="badge">' +
      ic('moonstar') +
      '</div><div class="grow"><div class="t">Ramaḍān</div><div class="s">' +
      (A.ramadanInfo().on
        ? 'Day ' + A.ramadanInfo().day + ' · fasts, tarāwīḥ, khatm'
        : 'Begins in ' + A.plural(A.ramadanInfo().daysTo, 'day') + ' · khatm tracker all year') +
      '</div></div>' +
      ic('right', 's') +
      '</a>';
    h +=
      '<div class="sec"><h2>Coming up</h2></div><div class="card pad0"><div class="list fold3' +
      (up.length > 3 ? ' more' : '') +
      '">' +
      up
        .map(function (u) {
          var hh = A.hijri(u.d);
          return (
            '<button type="button" class="li h-' +
            u.o.h +
            '" data-a="cal-day" data-k="' +
            u.d +
            '"><span class="badge s">' +
            ic(u.o.h === 'rose' ? 'star' : u.o.h === 'teal' ? 'moon' : 'cal', 's') +
            '</span><div class="grow"><div class="t">' +
            esc(u.o.t) +
            '</div><div class="s">' +
            esc(hh.d + ' ' + hh.name + ' · ' + A.fmtDate(u.d, 'short')) +
            '</div></div><span class="x">' +
            (u.in === 1 ? 'Tomorrow' : 'in ' + u.in + ' days') +
            '</span></button>'
          );
        })
        .join('') +
      (up.length > 3
        ? '<button type="button" class="li showall" data-a="unfold">Show all ' + up.length + '</button>'
        : '') +
      '</div></div>';
    h +=
      '<div class="grid2"><div class="card stat h-gold">' +
      ic('fast', 's') +
      '<div class="v">' +
      Object.keys(S.fasts).length +
      '</div><div class="k">Days fasted, all time</div></div><div class="card stat h-sand">' +
      ic('cal', 's') +
      '<div class="v">' +
      fasted +
      '</div><div class="k">Fasted this month</div></div></div>';
    h +=
      '<p class="faint small" style="text-align:center;margin:0 10px">Dates follow the Umm al-Qurā calendar' +
      (S.prefs.hijriAdj ? ' (adjusted ' + (S.prefs.hijriAdj > 0 ? '+' : '') + S.prefs.hijriAdj + ')' : '') +
      '. Adjust in Settings → Appearance to match your local moon sighting.</p>';
    return { html: h, title: 'Calendar', tab: 0 };
  };
  A.acts['cal-nav'] = function (el) {
    var d = +el.dataset.d,
      m = cur.m + d,
      y = cur.y;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    cur = { y: y, m: m };
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['cal-today'] = function () {
    cur = null;
    A.rerender();
  };
  A.acts['cal-day'] = function (el) {
    var d = el.dataset.k,
      hh = A.hijri(d),
      oc = A.dayOcc(d),
      f = S.fasts[d],
      noFast = oc.some(function (o) {
        return o.nofast;
      }),
      t = A.pday(d);
    var body =
      '<div class="spread"><div><div class="ar" style="font-size:22px;color:var(--gold2)">' +
      esc(hh.ar) +
      '</div><div class="muted small">' +
      esc(A.fmtDate(d)) +
      '</div></div><div class="serif" style="font-size:40px;line-height:1">' +
      hh.d +
      '</div></div>';
    if (oc.length)
      body +=
        '<div class="refs">' +
        oc
          .map(function (o) {
            return '<span class="chip" style="--h:var(--' + o.h + ');color:var(--h)">' + esc(o.t) + '</span>';
          })
          .join('') +
        '</div>';
    if (t)
      body +=
        '<dl class="kv">' +
        P.ORDER.map(function (k) {
          return '<dt>' + (k === 'sunrise' ? 'Sunrise' : P.NAMES[k]) + '</dt><dd>' + A.fmtTxt(t[k]) + '</dd>';
        }).join('') +
        '</dl>';
    body += '<div class="divider"></div>';
    var future = d > A.today(),
      plan = (S.fastPlan = S.fastPlan || {})[d];
    if (noFast)
      body +=
        '<div class="rd-note">' +
        ic('info', 's') +
        '<div>Fasting is not permitted on the days of ʿĪd and Tashrīq.</div></div>';
    else if (future)
      body +=
        '<div class="eyebrow">Plan a fast</div><p class="muted small" style="margin:6px 0 12px">This day has not come yet, so it cannot be logged. Plan it, and you will be reminded at Maghrib the evening before, to make your intention and prepare for suhūr.</p><div class="col" style="gap:8px">' +
        FAST_TYPES.filter(function (x) {
          /* a Ramaḍān fast is planned only for a day of Ramaḍān, and any other only outside it */
          return (x[0] === 'ramadan') === !!(A.isRamadan && A.isRamadan(d));
        }).map(function (x) {
          return (
            '<button type="button" class="opt" data-plan="' +
            x[0] +
            '" aria-pressed="' +
            (plan === x[0]) +
            '"><span class="rad"></span><div class="grow"><div class="t">' +
            x[1] +
            '</div></div></button>'
          );
        }).join('') +
        (plan ? '<button type="button" class="btn ghost" data-plan="">Remove the plan</button>' : '') +
        '</div>';
    else
      body +=
        '<div class="eyebrow">Fasting</div><div class="col" style="gap:8px">' +
        FAST_TYPES.map(function (x) {
          return (
            '<button type="button" class="opt" data-fast="' +
            x[0] +
            '" aria-pressed="' +
            (f === x[0]) +
            '"><span class="rad"></span><div class="grow"><div class="t">' +
            x[1] +
            '</div></div></button>'
          );
        }).join('') +
        (f ? '<button type="button" class="btn ghost" data-fast="">Remove</button>' : '') +
        '</div>';
    A.sheet(hh.d + ' ' + hh.name + ' ' + hh.y, body, {
      mount: function (sh, o) {
        sh.addEventListener('click', function (e) {
          var pl = e.target.closest('[data-plan]');
          if (pl) {
            if (pl.dataset.plan) S.fastPlan[d] = pl.dataset.plan;
            else delete S.fastPlan[d];
            A.save();
            A.N.haptic('tick');
            o.close();
            A.rerender();
            if (pl.dataset.plan)
              A.toast(
                S.notif.enabled || window.ADHKAR_DESKTOP
                  ? 'Planned. A reminder comes at Maghrib the evening before'
                  : 'Planned. It shows on Today the evening before',
                'fast'
              );
            return;
          }
          var b = e.target.closest('[data-fast]');
          if (!b) return;
          if (d > A.today()) return;
          if (b.dataset.fast) delete S.fastPlan[d];
          if (b.dataset.fast) S.fasts[d] = b.dataset.fast;
          else delete S.fasts[d];
          A.save();
          A.N.haptic(b.dataset.fast ? 'success' : 'tick');
          o.close();
          A.rerender();
          if (b.dataset.fast) {
            var fr = A.checkBadges();
            A.toast(
              fr.length ? 'Achievement: ' + fr[0].name : 'May Allah accept your fast',
              fr.length ? 'trophy' : 'heart'
            );
          }
        });
      }
    });
  };
})();
