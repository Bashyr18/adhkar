/* Ramaḍān mode: suhūr and ifṭār countdowns, fast log, taraweeh, khatm, the last ten nights. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    esc = A.esc,
    ic = A.icon;
  var MIN = 60000;
  if (A.addAr)
    A.addAr({
      'Ifṭār in': 'الإفطار بعد',
      'Ramaḍān Mubārak': 'رمضان مبارك',
      'The month of the Qurʾān. May Allah accept your fasting and prayers.': 'شهر القرآن. تقبّل الله صيامكم وقيامكم.',
      'Suḥūr ends in': 'ينتهي السحور بعد',
      'Suḥūr ended': 'انتهى السحور',
      'Suḥūr ends': 'ينتهي السحور',
      'On a break': 'في فترة العذر',
      'Not fasting': 'لست صائمًا',
      'Fast logged': 'سُجّل الصيام',
      Unlogged: 'غير مسجّل',
      unlogged: 'غير مسجّل',
      'Tap a day to log whether you fasted.': 'اضغط على يوم لتسجّل هل صمته.',
      'Fasting record': 'سجلّ الصيام',
      'Not fasted': 'لم أصم',
      'Save khatm': 'احفظ الختمة',
      'Save this khatm and start a new reading record?': 'أتحفظ هذه الختمة وتبدأ سجلّ قراءة جديدًا؟',
      'Suḥūr is in the last third of the night, when duʿāʾ is answered':
        'السحور في الثلث الأخير من الليل، وقتِ إجابة الدعاء',
      'The duʿāʾ for breaking the fast': 'دعاء الإفطار',
      fasted: 'صيام',
      'on a break': 'عذر',
      missed: 'فائت',
      'to come': 'قادم',
      Missed: 'فائت',
      'Make-up fasts': 'قضاء الصيام',
      'Make-up fasts are kept after ʿĪd, before the next Ramaḍān.': 'يُقضى الصيام بعد العيد، قبل رمضان القادم.',
      'Fasted today': 'صمتُ اليوم',
      'Maghrib in': 'المغرب بعد',
      'Fajr in': 'الفجر بعد',
      'Tonight’s tarāwīḥ is logged after ʿIshāʾ': 'تُسجَّل تراويح الليلة بعد العشاء',
      'End your break': 'إنهاء العذر',
      'Set your location for suḥūr and ifṭār times': 'حدّد موقعك لمواقيت السحور والإفطار',
      'Not during Ramaḍān': 'ليس في رمضان',
      'Not a day to fast': 'لا يُصام هذا اليوم',
      'On a break today': 'في العذر اليوم',
      'Already logged': 'مسجّل مسبقًا',
      'Fasting is not done on this day': 'لا يُصام هذا اليوم',
      'You are on a break today': 'أنتِ في فترة العذر اليوم',
      'Today is already logged as a fast. Change it in the calendar.': 'اليوم مسجّل صيامًا بالفعل. غيّره من التقويم.',
      'Tarāwīḥ is prayed on the nights of Ramaḍān': 'تُصلّى التراويح في ليالي رمضان',
      'The last night of Ramaḍān.': 'آخر ليلة من رمضان.',
      'Logged for today': 'سُجّل لليوم',
      'Plan in calendar': 'خطّط في التقويم',
      'The Sunnah of the night prayer': 'السنة في قيام الليل',
      'Khatm complete': 'تمّت الختمة',
      'Tap each juzʾ as you finish it.': 'اضغط كل جزء حين تتمّه.',
      'Seek Laylat al-Qadr in the odd nights of the last ten.': 'تحرَّ ليلة القدر في الوتر من العشر الأواخر.',
      'The last ten nights have passed': 'مضت العشر الأواخر',
      'May Allah accept your nights.': 'تقبّل الله قيامك.',
      'An odd night. Seek Laylat al-Qadr until Fajr.': 'ليلة وتر. تحرَّ ليلة القدر حتى الفجر.',
      'An odd night. It begins at Maghrib.': 'ليلة وتر، تبدأ عند المغرب.',
      'Make-up fast removed for today': 'أُزيل صيام القضاء لليوم',
      'Make-up fast logged. May Allah accept it.': 'سُجّل صيام القضاء. تقبّله الله.',
      'Share card': 'شارك البطاقة',
      'Daily cards · Day 1 to Shawwāl': 'بطاقات رمضان · من اليوم ١ إلى شوال',
      'Authentic daily reminders from Day 1 to the last ten nights, ʿĪd al-Fiṭr and Shawwāl':
        'تذكيرات نبوية صحيحة من اليوم الأول إلى العشر الأواخر وعيد الفطر وشوال',
      'Browse cards': 'تصفّح البطاقات',
      'Day 1': 'اليوم ١',
      'Last 10': 'العشر الأواخر',
      'Night 27': 'ليلة ٢٧',
      ʿĪd: 'العيد',
      'ʿĪd Mubārak': 'عيد مبارك',
      'ʿĪd Mubārak · 1 Shawwāl': 'عيد مبارك · ١ شوال',
      'Six of Shawwāl': 'ستٌّ من شوال',
      'Previous card': 'البطاقة السابقة',
      'Next card': 'البطاقة التالية'
    });
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
    if (now < t.maghrib) return { label: 'Ifṭār', at: t.maghrib, from: imsak(t), kind: 'iftar' };
    var tm = A.pday(A.shift(k, 1));
    /* the evening after the last fast: no suḥūr tomorrow, only Fajr */
    if (!A.isRamadan(A.shift(k, 1))) return { label: 'Fajr', at: tm.fajr, from: t.maghrib, kind: 'eid' };
    return { label: 'Suhūr ends', at: imsak(tm), from: t.maghrib, kind: 'suhur' };
  }

  /* ---------- shared pieces ---------- */
  /* dynamic lines carry their own Arabic: the numbers sit inside them in a different order */
  function tx(en, ar) {
    return A.ar() ? ar : en;
  }
  function dg(n) {
    return A.ar() ? A.arDigits(String(n)) : String(n);
  }
  /* 3:38:12, the hours unpadded */
  function clock(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)),
      h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      ss = s % 60;
    return dg(h + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0'));
  }
  /* where each Ramaḍān day stands: fasted, on a break, missed, still to come */
  function dayState(d, today) {
    var r = R();
    return d > today ? 'fut' : A.isExcused(d) ? 'ex' : S.fasts[d] ? 'on' : r.skip[d] ? 'off' : 'unlogged';
  }
  /* the night running now (Maghrib to Fajr) or coming tonight, as its Ramaḍān number: night n precedes day n */
  function nightNo(info) {
    var nk = A.now().nightKey || A.today();
    return A.daysBetween(info.start, nk) + 2;
  }
  function nightIsOn() {
    if (!S.loc) return false;
    var t = A.pday(A.today()),
      now = Date.now();
    return now < t.fajr || now >= t.maghrib;
  }
  /* the fast's arc: a shallow sky from suḥūr to ifṭār (by night, ifṭār to suḥūr), with a sun or a moon riding it */
  var ARC = { x0: 14, x1: 306, y: 62, cy: -6 };
  function arcPt(f) {
    var u = 1 - f,
      cx = (ARC.x0 + ARC.x1) / 2;
    return [u * u * ARC.x0 + 2 * u * f * cx + f * f * ARC.x1, u * u * ARC.y + 2 * u * f * ARC.cy + f * f * ARC.y];
  }
  function arcSvg(ph, f) {
    var d = 'M' + ARC.x0 + ' ' + ARC.y + 'Q' + (ARC.x0 + ARC.x1) / 2 + ' ' + ARC.cy + ' ' + ARC.x1 + ' ' + ARC.y,
      p = arcPt(f),
      night = ph.kind !== 'iftar';
    return (
      '<svg class="rm-arc' +
      (night ? ' night' : '') +
      '" viewBox="0 0 320 72" aria-hidden="true">' +
      '<path class="trk" d="' +
      d +
      '" pathLength="100"/><path class="fil" data-rm-fil d="' +
      d +
      '" pathLength="100" style="stroke-dashoffset:' +
      (100 - f * 100).toFixed(2) +
      '"/><circle class="end" cx="' +
      ARC.x0 +
      '" cy="' +
      ARC.y +
      '" r="3.5"/><circle class="end" cx="' +
      ARC.x1 +
      '" cy="' +
      ARC.y +
      '" r="3.5"/><g data-rm-orb transform="translate(' +
      p[0].toFixed(1) +
      ' ' +
      p[1].toFixed(1) +
      ')"><circle class="halo" r="15"/>' +
      (night
        ? '<path class="orb" d="M2.5-7.5a7.5 7.5 0 1 0 5 13A6 6 0 1 1 2.5-7.5z"/>'
        : '<circle class="orb" r="6.5"/>') +
      '</g></svg>'
    );
  }
  /* the month at a glance, one pill a day */
  function strip(info) {
    var k = A.today(),
      h = '';
    for (var i = 0; i < info.len; i++) {
      var d = A.shift(info.start, i);
      h += '<i class="' + (dayState(d, k) || 'nf') + (d === k ? ' today' : '') + '" style="--i:' + i + '"></i>';
    }
    return '<div class="rm-strip" aria-hidden="true">' + h + '</div>';
  }
  function note(link, href, icon, text) {
    var inner = ic(icon, 'xs') + '<span class="grow">' + text + '</span>';
    return link
      ? '<a class="rm-note press" href="' + href + '">' + inner + ic('right', 'xs') + '</a>'
      : '<div class="rm-note">' + inner + '</div>';
  }
  /* the one line the card may carry: suḥūr in the last third of the night, ifṭār close, or no location yet */
  function noteFor(ph) {
    if (!S.loc) return ['#/location', 'pin', 'Set your location for suḥūr and ifṭār times'];
    if (!ph) return null;
    var k = A.today(),
      y = A.pday(A.shift(k, -1)),
      t = A.pday(k),
      now = Date.now(),
      third = (now < t.fajr && now >= y.lastThird) || now >= t.lastThird;
    if (ph.kind === 'suhur' && third)
      return ['#/journal', 'moon', 'Suḥūr is in the last third of the night, when duʿāʾ is answered'];
    if (ph.kind === 'iftar' && ph.at - now < 30 * MIN)
      return ['#/r/ramadan/1', 'hands', 'The duʿāʾ for breaking the fast'];
    return null;
  }
  /* what the card shows depends on these; when one changes (Fajr, Maghrib, a note), the page is drawn again */
  function heroKey(ph) {
    var t = S.loc ? A.pday(A.today()) : null,
      n = noteFor(ph);
    return (
      (ph ? ph.kind : '') +
      '|' +
      (t && Date.now() >= t.fajr ? 1 : 0) +
      '|' +
      (n ? n[0] : '') +
      '|' +
      (nightIsOn() ? 1 : 0)
    );
  }
  function heroHtml(inPage) {
    var info = A.ramadanInfo(),
      k = A.today(),
      ph = phase(),
      fasting = !!S.fasts[k],
      exc = A.isExcused(k),
      now = Date.now(),
      tag = inPage ? 'div' : 'a';
    var h =
      '<' +
      tag +
      ' class="card col h-gold glowcard rm-hero"' +
      (inPage ? '' : ' href="#/ramadan"') +
      ' data-rm-kind="' +
      heroKey(ph) +
      '">' +
      (A.lanterns ? A.lanterns() : '') +
      '<div class="rm-top"><div class="eyebrow">Ramaḍān · day ' +
      info.day +
      ' of ' +
      info.len +
      '</div><div class="ar rm-greet" lang="ar">رمضان مبارك</div></div>';
    if (ph) {
      var f = A.clamp((now - ph.from) / (ph.at - ph.from), 0, 1);
      h +=
        '<div class="spread rm-cdrow"><div class="grow"><div class="rm-cdl">' +
        (ph.kind === 'iftar' ? (exc ? 'Maghrib in' : 'Ifṭār in') : ph.kind === 'eid' ? 'Fajr in' : 'Suḥūr ends in') +
        '</div><div class="num rm-cd" data-rm-cd>' +
        clock(ph.at - now) +
        '</div></div><span class="chip' +
        (fasting ? ' on' : '') +
        '">' +
        (exc ? 'On a break' : fasting ? ic('check', 'xs') + 'Fast logged' : R().skip[k] ? 'Not fasting' : 'Unlogged') +
        '</span></div>' +
        arcSvg(ph, f) +
        '<div class="rm-ends"><span><b class="num">' +
        A.fmtTxt(ph.from) +
        '</b><em>' +
        (ph.kind === 'iftar' ? 'Suḥūr ended' : 'Ifṭār') +
        '</em></span><span><b class="num">' +
        A.fmtTxt(ph.at) +
        '</b><em>' +
        (ph.kind === 'iftar' ? 'Ifṭār' : ph.kind === 'eid' ? 'Fajr' : 'Suḥūr ends') +
        '</em></span></div>';
    }
    h += strip(info);
    var nt = noteFor(ph);
    if (nt) h += note(inPage, nt[0], nt[1], nt[2]);
    return h + '</' + tag + '>';
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
    return heroHtml(false);
  };
  A.ramadanTick = function (el) {
    var hero = $('.rm-hero', el);
    if (!hero) return;
    var ph = phase();
    /* Fajr or Maghrib came, or a note is due: the page is drawn again for the new part of the day */
    if (hero.getAttribute('data-rm-kind') !== heroKey(ph)) {
      A.rerender();
      return;
    }
    if (!ph) return;
    var cd = $('[data-rm-cd]', hero);
    if (cd) cd.textContent = clock(ph.at - Date.now());
    var f = A.clamp((Date.now() - ph.from) / (ph.at - ph.from), 0, 1),
      fil = $('[data-rm-fil]', hero),
      orb = $('[data-rm-orb]', hero),
      p = arcPt(f);
    if (fil) fil.style.strokeDashoffset = (100 - f * 100).toFixed(2);
    if (orb) orb.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')');
  };

  /* ---------- the page's cards ---------- */
  function fastsCard(info, k) {
    var n = { on: 0, ex: 0, off: 0, unlogged: 0 },
      cells = '';
    for (var i = 0; i < info.len; i++) {
      var d = A.shift(info.start, i),
        st = dayState(d, k);
      if (n[st] != null) n[st]++;
      cells +=
        '<button type="button" class="rmd ' +
        st +
        (d === k ? ' today' : '') +
        '" style="--i:' +
        i +
        '" data-a="rm-day" data-k="' +
        d +
        '"' +
        (d > k ? ' disabled' : st === 'ex' ? ' aria-disabled="true"' : ' aria-pressed="' + (st === 'on') + '"') +
        (d === k ? ' aria-current="date"' : '') +
        ' aria-label="' +
        tx(
          'Day ' +
            (i + 1) +
            (st === 'on'
              ? ', fasted'
              : st === 'ex'
                ? ', break'
                : st === 'off'
                  ? ', not fasted'
                  : st === 'unlogged'
                    ? ', unlogged'
                    : ''),
          'اليوم ' +
            dg(i + 1) +
            (st === 'on'
              ? '، صيام'
              : st === 'ex'
                ? '، عذر'
                : st === 'off'
                  ? '، لم يُصَم'
                  : st === 'unlogged'
                    ? '، غير مسجّل'
                    : '')
        ) +
        '">' +
        dg(i + 1) +
        '</button>';
    }
    var stat = function (v, cls, label) {
      return (
        '<span class="rm-stat ' +
        cls +
        '"><b class="num" data-n="' +
        v +
        '">' +
        dg(v) +
        '</b><span>' +
        label +
        '</span></span>'
      );
    };
    return (
      '<div class="sec"><h2>Fasts</h2><span class="aside">' +
      tx(n.on + ' of ' + info.len, dg(n.on) + ' من ' + dg(info.len)) +
      '</span></div><div class="card col rm-fasts"><div class="rm-stats">' +
      stat(n.on, 'on', 'fasted') +
      (n.ex ? stat(n.ex, 'ex', 'on a break') : '') +
      stat(n.off, 'off', 'missed') +
      (n.unlogged ? stat(n.unlogged, 'unlogged', 'unlogged') : '') +
      stat(Math.max(0, info.len - info.day), 'fut', 'to come') +
      '</div><div class="rmgrid">' +
      cells +
      '</div><div class="legend"><span><i class="lg-on"></i>Fasted</span><span><i class="lg-ex"></i>Break</span><span><i class="lg-off"></i>Missed</span><span><i class="lg-today"></i>Today</span></div><p class="faint small">Tap a day to log whether you fasted.</p></div>'
    );
  }
  function qadaCard(info) {
    var q = A.qadaOwed();
    if (!q.missed) return '';
    var dots = '';
    for (var i = 0; i < Math.min(q.missed, 30); i++)
      dots +=
        '<i class="' +
        (i < q.made ? 'on' : '') +
        '" style="--i:' +
        i +
        '">' +
        (i < q.made ? ic('check', 'xs') : '') +
        '</i>';
    var k = A.today(),
      logged = S.fasts[k] === 'qada',
      why = [];
    if (q.brk) why.push(tx(A.plural(q.brk, 'day') + ' on a break', A.plural(q.brk, 'day') + ' من العذر'));
    if (q.skipped) why.push(tx(q.skipped + ' missed', dg(q.skipped) + ' فائتة'));
    /* the button logs today as a make-up fast, and stays (pressed) once it has, so a slip can be undone here */
    var why0 = qadaBlock(k),
      foot = info.on
        ? '<p class="faint small">Make-up fasts are kept after ʿĪd, before the next Ramaḍān.</p>'
        : q.owed || logged
          ? '<div class="grid2"><button type="button" class="btn ' +
            (logged || why0 ? 'sec' : 'pri') +
            ' sm" data-a="rm-qada" aria-pressed="' +
            logged +
            '"' +
            (why0 && !logged ? ' aria-disabled="true"' : '') +
            '>' +
            ic('check', 's') +
            (logged ? 'Logged for today' : why0 ? why0[1] : 'Fasted today') +
            '</button><a class="btn sec sm" href="#/calendar">' +
            ic('cal', 's') +
            'Plan in calendar</a></div>'
          : '';
    return (
      '<div class="sec"><h2>Make-up fasts</h2><span class="aside">Qaḍāʾ</span></div><div class="card col rm-qada">' +
      '<div class="row" style="gap:16px;align-items:center">' +
      A.ring(
        q.made / q.missed,
        72,
        '<b class="num" data-n="' + q.owed + '">' + dg(q.owed) + '</b>',
        'var(--goldh)',
        6
      ) +
      '<div class="grow"><div class="rm-qt">' +
      (q.owed
        ? tx(q.owed + (q.owed === 1 ? ' fast' : ' fasts') + ' to make up', 'باقٍ للقضاء ' + A.plural(q.owed, 'fast'))
        : tx('All made up · alḥamdulillāh', 'قُضيت كلها · الحمد لله')) +
      '</div><div class="faint small">' +
      tx(q.made + ' of ' + q.missed + ' made up', 'قُضي ' + dg(q.made) + ' من ' + dg(q.missed)) +
      (why.length ? ' · ' + why.join(' · ') : '') +
      '</div></div></div><div class="rm-dots" aria-hidden="true">' +
      dots +
      '</div>' +
      foot +
      '</div>'
    );
  }
  /* why today cannot be logged as a make-up fast: [toast, button label], or null */
  function qadaBlock(k) {
    if (S.fasts[k] === 'qada') return null;
    if (A.isRamadan(k)) return ['Make-up fasts are kept after ʿĪd, before the next Ramaḍān.', 'Not during Ramaḍān'];
    if (
      A.dayOcc &&
      A.dayOcc(k).some(function (o) {
        return o.nofast;
      })
    )
      return ['Fasting is not done on this day', 'Not a day to fast'];
    if (A.isExcused(k)) return ['You are on a break today', 'On a break today'];
    if (S.fasts[k]) return ['Today is already logged as a fast. Change it in the calendar.', 'Already logged'];
    return null;
  }
  /* tarāwīḥ belongs to the nights of Ramaḍān: the evening before day 1 through the evening before the last day */
  function twOn() {
    var nk = A.now().nightKey || A.today();
    return A.isRamadan(A.shift(nk, 1));
  }
  function taraweehCard(info) {
    var r = R(),
      nk = A.now().nightKey || A.today(),
      tw = r.taraweeh[nk] || 0,
      cur = A.clamp(nightNo(info), 1, info.len),
      prayed = 0,
      dots = '';
    for (var n = 1; n <= info.len; n++) {
      var did = !!r.taraweeh[A.shift(info.start, n - 2)];
      if (did && n <= cur) prayed++;
      dots += '<i class="' + (did ? 'on' : n > cur ? 'fut' : '') + (n === cur ? ' now' : '') + '"></i>';
    }
    return (
      '<div class="sec"><h2>Tarāwīḥ</h2><span class="aside">' +
      tx(prayed + ' of ' + cur + ' nights', dg(prayed) + ' من ' + A.plural(cur, 'night')) +
      '</span></div><div class="card col rm-tw"><div class="row rm-twrow" style="gap:16px;align-items:center">' +
      A.ring(prayed / cur, 72, '<b class="num" data-n="' + prayed + '">' + dg(prayed) + '</b>', 'var(--goldh)', 6) +
      (twOn()
        ? '<div class="grow col" style="gap:9px"><div class="eyebrow">' +
          tx('Tonight · night ' + cur, 'الليلة · الليلة ' + dg(cur)) +
          '</div><div class="rak h-gold">' +
          [8, 11, 13, 20, 23]
            .map(function (v) {
              return (
                '<button type="button" data-a="rm-tw" data-v="' +
                v +
                '" aria-pressed="' +
                (tw === v) +
                '" aria-label="' +
                tx('Log ' + v + ' rakʿahs', 'سجّل ' + dg(v) + ' ركعة') +
                '">' +
                dg(v) +
                '</button>'
              );
            })
            .join('') +
          '</div></div>'
        : '<div class="grow"><div class="rm-pace">' +
          tx(prayed + ' nights of tarāwīḥ', A.plural(prayed, 'night') + ' من التراويح') +
          '</div><div class="faint small">May Allah accept your nights.</div></div>') +
      '</div><div class="rm-nights" aria-hidden="true">' +
      dots +
      '</div><details class="hd-fold"><summary>The Sunnah of the night prayer</summary>' +
      A.said('bukhari:1147', '', true) +
      '<div class="refs"><a href="https://sunnah.com/bukhari:1147" data-a="ext">' +
      ic('link', 'xs') +
      'Bukhārī 1147</a></div></details></div>'
    );
  }
  function juzGap(n) {
    return n === 1 ? 'جزء واحد' : n === 2 ? 'جزأين' : dg(n) + (n <= 10 ? ' أجزاء' : ' جزءًا');
  }
  function khatmCard(info) {
    var r = R(),
      jz = r.khatm.juz,
      read = Array.from({ length: 30 }, function (_, i) {
        return jz[i + 1];
      }).filter(Boolean).length,
      grid = '';
    for (var j = 1; j <= 30; j++)
      grid +=
        '<button type="button" class="rmd' +
        (jz[j] ? ' on' : '') +
        '" style="--i:' +
        (j - 1) +
        '" data-a="rm-juz" data-v="' +
        j +
        '" aria-pressed="' +
        !!jz[j] +
        '" aria-label="Juzʾ ' +
        j +
        '">' +
        dg(j) +
        '</button>';
    /* the pace that finishes by the last night, and how far ahead or behind that is today */
    var pace;
    if (info.on && read > 0 && read < 30) {
      var left = Math.max(1, info.len - info.day + 1),
        per = Math.round(((30 - read) / left) * 10) / 10,
        gap = Math.round((info.day / info.len) * 30 - read);
      pace =
        '<div class="rm-pace' +
        (gap > 0 ? ' behind' : ' ahead') +
        '">' +
        (gap > 0
          ? tx(gap + ' juzʾ behind', 'متأخر ' + juzGap(gap))
          : gap < 0
            ? tx(-gap + ' juzʾ ahead', 'متقدم ' + juzGap(-gap))
            : tx('On pace', 'على الوتيرة')) +
        '</div><div class="faint small">' +
        tx(
          'About ' + per + ' juzʾ a day finishes before Ramaḍān ends',
          'نحو ' + dg(per) + ' جزء يوميًا يُتمّ الختمة قبل نهاية رمضان'
        ) +
        '</div>';
    } else if (read === 30)
      pace =
        '<div class="rm-pace ahead">Khatm complete</div><button type="button" class="btn sec sm" data-a="rm-khatm-save">Save khatm</button>';
    else if (!read)
      pace =
        '<div class="rm-pace">' +
        tx('One juzʾ a night', 'جزء كل ليلة') +
        '</div><div class="faint small">Tap each juzʾ as you finish it.</div>';
    else pace = '<div class="rm-pace">' + tx(read + ' juzʾ read', 'قرأت ' + dg(read) + ' جزءًا') + '</div>';
    return (
      '<div class="sec"><h2>Qurʾān khatm</h2><span class="aside">' +
      tx(read + ' of 30', dg(read) + ' من ' + dg(30)) +
      (r.khatm.done ? ' · ' + A.plural(r.khatm.done, 'khatm') : '') +
      '</span></div><div class="card col rm-kh"><div class="row" style="gap:16px;align-items:center">' +
      A.ring(read / 30, 72, '<b class="num" data-n="' + read + '">' + dg(read) + '</b>', 'var(--goldh)', 6) +
      '<div class="grow">' +
      pace +
      '</div></div><div class="rmgrid">' +
      grid +
      '</div></div>'
    );
  }
  function nightsCard(info) {
    if (!info.len) return '';
    var cur = nightNo(info),
      live = nightIsOn(),
      k = A.today(),
      sky = '';
    for (var n = 21; n <= info.len; n++) {
      var odd = n % 2 === 1,
        st = n < cur ? 'past' : n === cur ? 'now' : 'fut';
      sky +=
        '<span class="rn ' +
        (odd ? 'odd ' : '') +
        st +
        '" style="--i:' +
        (n - 21) +
        '"><i>' +
        (odd
          ? '<svg viewBox="-12 -12 24 24"><path d="M0-11L2.6-2.6 11 0 2.6 2.6 0 11-2.6 2.6-11 0-2.6-2.6Z"/></svg>'
          : '') +
        '</i><b class="num">' +
        dg(n) +
        '</b></span>';
    }
    /* what to say about tonight */
    var head, sub;
    if (cur < 21) {
      var inD = Math.max(1, A.daysBetween(k, A.shift(info.start, 19)));
      head = tx('The last ten begin in ' + A.plural(inD, 'day'), 'تبدأ العشر الأواخر بعد ' + A.plural(inD, 'day'));
      sub = 'Seek Laylat al-Qadr in the odd nights of the last ten.';
    } else if (cur > info.len) {
      head = 'The last ten nights have passed';
      sub = 'May Allah accept your nights.';
    } else {
      var oddNow = cur % 2 === 1;
      head = live
        ? tx('Night ' + cur + ' is now', 'نحن في الليلة ' + dg(cur))
        : tx('Tonight is night ' + cur, 'الليلة هي الليلة ' + dg(cur));
      if (oddNow) sub = live ? 'An odd night. Seek Laylat al-Qadr until Fajr.' : 'An odd night. It begins at Maghrib.';
      else if (cur + 1 <= info.len)
        sub = tx('The next odd night is ' + (cur + 1) + '.', 'الليلة الوتر القادمة هي ' + dg(cur + 1) + '.');
      else sub = 'The last night of Ramaḍān.';
    }
    var it = window.DATA && window.DATA.items['r-qadr'],
      g = A.grade ? A.grade('tirmidhi:3513') : '';
    return (
      '<div class="sec"><h2>The last ten nights</h2></div><div class="card col rm-ten"><div class="rm-sky">' +
      sky +
      '</div><div class="rm-tn"><div class="rm-tt">' +
      head +
      '</div><div class="faint small">' +
      sub +
      '</div></div>' +
      (it
        ? '<a class="rm-dua press" href="#/r/ramadan/4"><div class="eyebrow">The duʿāʾ of Laylat al-Qadr</div><p class="ar" lang="ar">' +
          esc(it.ar) +
          '</p>' +
          (A.ar()
            ? ''
            : '<p class="rm-tr no-tr">' + esc(it.tr) + '</p><p class="rm-en no-tr">“' + esc(it.en) + '”</p>') +
          '<div class="faint small rm-ref">' +
          (A.ar()
            ? 'جامع الترمذي ' + dg(3513) + ' · صحيح (الألباني)'
            : esc((it.refs && it.refs[0] && it.refs[0].l) || '') + (g ? ' · ' + esc(g) : '')) +
          '</div></a>'
        : '') +
      '</div>'
    );
  }

  /* full page */
  A.V.ramadan = function () {
    var info = A.ramadanInfo(),
      k = A.today();
    var h =
      A.back('Back', '#/') +
      '<header class="top"><div class="tt"><div class="eyebrow">' +
      (info.on ? esc(A.hijriText(k)) : 'Begins ' + esc(A.fmtDate(info.start, 'short'))) +
      '</div><h1>Ramaḍān' +
      (info.on ? ' <em>Mubārak</em>' : '') +
      '</h1></div></header>';
    if (info.on) {
      h += heroHtml(true);
      if (A.ramadanDailyCard) h += A.ramadanDailyCard(true);
      if (A.answeredCard) h += A.answeredCard();
    } else
      h +=
        '<div class="card col h-gold rm-soon"><div class="spread"><div><div class="eyebrow">Ramaḍān begins in</div><div class="num rm-cd">' +
        A.plural(info.daysTo, 'day') +
        '</div><div class="muted small">' +
        esc(A.fmtDate(info.start)) +
        ', by the Umm al-Qurā calendar. Local moon sighting may differ by a day.</div></div><span class="badge">' +
        ic('moonstar') +
        '</span></div></div>' +
        (A.ramadanDailyCard ? A.ramadanDailyCard(true) : '');
    h += qadaCard(info);
    if (!info.on && info.daysTo > 30)
      h +=
        '<div class="sec"><h2>Fasts</h2></div><div class="card row h-gold" style="gap:12px"><span class="badge s">' +
        ic('cal', 's') +
        '</span><div class="grow muted small">The fasting log opens a month before Ramaḍān.</div></div>';
    else h += fastsCard(info, k);
    h += (info.on || twOn() ? taraweehCard(info) : '') + khatmCard(info) + nightsCard(info);
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
      A.sw(A.remindersOn() && N.suhoor, 'rm-n', ' data-k="suhoor"') +
      '</div></div>' +
      '<div class="set"><div class="grow"><div class="t">Ifṭār reminder</div><div class="s">At Maghrib, with the duʿāʾ</div></div><div class="ctl">' +
      A.sw(A.remindersOn() && N.iftar, 'rm-n', ' data-k="iftar"') +
      '</div></div></div></div>';
    return {
      html: h,
      title: 'Ramaḍān',
      tab: 0,
      mount: function (el) {
        if (A.countUp) A.countUp(el);
      },
      tick: function (el) {
        A.ramadanTick(el);
      }
    };
  };
  A.acts['rm-qada'] = function () {
    var k = A.today(),
      why = qadaBlock(k);
    if (why) {
      A.toast(why[0]);
      return;
    }
    if (S.fasts[k] === 'qada') {
      delete S.fasts[k];
      A.toast('Make-up fast removed for today');
    } else {
      S.fasts[k] = 'qada';
      A.N.haptic('success');
      A.toast('Make-up fast logged. May Allah accept it.', 'check');
    }
    A.save();
    A.rerender();
  };
  A.acts['rm-day'] = function (el) {
    var d = el.dataset.k,
      r = R();
    if (!A.isRamadan(d) || d > A.today() || A.isExcused(d)) return;
    A.options(
      'Fasting record',
      [
        { v: 'fasted', t: 'Fasted' },
        { v: 'missed', t: 'Not fasted' },
        { v: '', t: 'Unlogged' }
      ],
      S.fasts[d] ? 'fasted' : r.skip[d] ? 'missed' : '',
      function (v) {
        if (v === 'fasted') S.fasts[d] = S.fasts[d] || 'ramadan';
        else delete S.fasts[d];
        if (v === 'missed') r.skip[d] = 1;
        else delete r.skip[d];
        if (v) delete S.fastPlan[d];
        A.save();
        A.rerender();
      }
    );
  };
  A.acts['rm-tw'] = function (el) {
    var r = R(),
      nk = A.now().nightKey || A.today(),
      v = +el.dataset.v;
    if (!twOn()) {
      A.toast('Tarāwīḥ is prayed on the nights of Ramaḍān');
      return;
    }
    /* tonight's prayer is logged once tonight has come: from ʿIshāʾ until Fajr */
    var tt = S.loc ? A.pday(A.today()) : null;
    if (tt && Date.now() >= tt.fajr && Date.now() < tt.isha) {
      A.toast('Tonight’s tarāwīḥ is logged after ʿIshāʾ', 'clock');
      return;
    }
    if (r.taraweeh[nk] === v) delete r.taraweeh[nk];
    else r.taraweeh[nk] = v;
    A.save();
    A.N.haptic('success');
    A.rerender();
  };
  function khatmComplete(juz) {
    return Array.from({ length: 30 }, function (_, i) {
      return !!juz[i + 1];
    }).every(Boolean);
  }
  A.acts['rm-juz'] = function (el) {
    var j = +el.dataset.v,
      z = R().khatm.juz;
    if (!Number.isInteger(j) || j < 1 || j > 30) return;
    if (z[j]) delete z[j];
    else z[j] = Date.now();
    A.N.haptic('tick');
    A.save();
    A.rerender();
  };
  A.acts['rm-khatm-save'] = function () {
    A.confirm('Save khatm', 'Save this khatm and start a new reading record?', 'Save khatm', function () {
      var kh = R().khatm;
      if (!khatmComplete(kh.juz)) return;
      kh.done++;
      kh.juz = {};
      A.save(true);
      A.rerender();
      A.N.haptic('heavy');
      A.fx.done();
      A.toast('Khatm complete. May Allah accept it from you.', 'book');
    });
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
  /* ---------- Day 1 to Day 30, the Last Ten Nights, ʿĪd al-Fiṭr & Shawwāl shareable cards ---------- */
  /* Every narration is read verbatim from window.HADITH (tools/build_hadith.py) or window.DATA.items. */
  var RM_CARDS = [
    {
      id: 1,
      p: 'start',
      k: 'muslim:1079',
      t: 'The gates of mercy open',
      ta: 'تُفتح أبواب الرحمة',
      r: 'Ṣaḥīḥ Muslim 1079',
      ra: 'صحيح مسلم ١٠٧٩',
      n: 'Welcome the month with sincere intention and gratitude.',
      na: 'استقبل الشهر بنيّة صادقة وشكر لله.'
    },
    {
      id: 2,
      p: 'start',
      k: 'muslim:1080',
      t: 'Sighting the new crescent',
      ta: 'رؤية هلال رمضان',
      r: 'Ṣaḥīḥ Muslim 1080',
      ra: 'صحيح مسلم ١٠٨٠'
    },
    {
      id: 3,
      p: 'start',
      k: 'muslim:760',
      t: 'Fasting with faith and hope',
      ta: 'صيامًا إيمانًا واحتسابًا',
      r: 'Ṣaḥīḥ Muslim 760',
      ra: 'صحيح مسلم ٧٦٠'
    },
    {
      id: 4,
      p: 'start',
      k: 'muslim:1095',
      t: 'The blessing in suḥūr',
      ta: 'البركة في السحور',
      r: 'Ṣaḥīḥ Muslim 1095',
      ra: 'صحيح مسلم ١٠٩٥'
    },
    {
      id: 5,
      p: 'start',
      k: 'item:r-iftar',
      t: 'On breaking the fast',
      ta: 'دعاء الإفطار',
      r: 'Sunan Abī Dāwūd 2357',
      ra: 'سنن أبي داود ٢٣٥٧',
      g: 'Ḥasan (al-Albānī)',
      ga: 'حسن (الألباني)'
    },
    {
      id: 6,
      p: 'start',
      k: 'muslim:1098',
      t: 'Hastening the ifṭār',
      ta: 'تعجيل الفطر',
      r: 'Ṣaḥīḥ Muslim 1098',
      ra: 'صحيح مسلم ١٠٩٨'
    },
    {
      id: 7,
      p: 'start',
      k: 'muslim:759',
      t: 'Standing in the nights of Ramaḍān',
      ta: 'قيام ليالي رمضان',
      r: 'Ṣaḥīḥ Muslim 759',
      ra: 'صحيح مسلم ٧٥٩'
    },
    {
      id: 8,
      p: 'start',
      k: 'muslim:1151',
      t: 'Two joys for the one who fasts',
      ta: 'للصائم فرحتان',
      r: 'Ṣaḥīḥ Muslim 1151',
      ra: 'صحيح مسلم ١١٥١'
    },
    {
      id: 9,
      p: 'start',
      k: 'muslim:1150',
      t: 'Saying “I am fasting”',
      ta: 'قول: إني صائم',
      r: 'Ṣaḥīḥ Muslim 1150',
      ra: 'صحيح مسلم ١١٥٠'
    },
    {
      id: 10,
      p: 'start',
      k: 'muslim:1152',
      t: 'Ar-Rayyān, the gate of the fasting',
      ta: 'باب الريان للصائمين',
      r: 'Ṣaḥīḥ Muslim 1152',
      ra: 'صحيح مسلم ١١٥٢'
    },
    {
      id: 11,
      p: 'mid',
      k: 'muslim:804',
      t: 'The Qurʾān intercedes',
      ta: 'شفاعة القرآن لأصحابه',
      r: 'Ṣaḥīḥ Muslim 804',
      ra: 'صحيح مسلم ٨٠٤'
    },
    {
      id: 12,
      p: 'mid',
      k: 'muslim:2308',
      t: 'Generosity with the Qurʾān',
      ta: 'الجود بالخير في رمضان',
      r: 'Ṣaḥīḥ Muslim 2308',
      ra: 'صحيح مسلم ٢٣٠٨'
    },
    {
      id: 13,
      p: 'mid',
      k: 'muslim:1153',
      t: 'A shield from the Fire',
      ta: 'وقاية الصيام من النار',
      r: 'Ṣaḥīḥ Muslim 1153',
      ra: 'صحيح مسلم ١١٥٣'
    },
    {
      id: 14,
      p: 'mid',
      k: 'muslim:2626',
      t: 'Do not belittle any good deed',
      ta: 'لا تحقرنّ من المعروف شيئًا',
      r: 'Ṣaḥīḥ Muslim 2626',
      ra: 'صحيح مسلم ٢٦٢٦'
    },
    {
      id: 15,
      p: 'mid',
      k: 'bukhari:1145',
      t: 'The last third of the night',
      ta: 'الثلث الأخير من الليل',
      r: 'Ṣaḥīḥ al-Bukhārī 1145',
      ra: 'صحيح البخاري ١١٤٥'
    },
    {
      id: 16,
      p: 'mid',
      k: 'bukhari:1417',
      t: 'Even half a date in charity',
      ta: 'اتقوا النار ولو بشق تمرة',
      r: 'Ṣaḥīḥ al-Bukhārī 1417',
      ra: 'صحيح البخاري ١٤١٧'
    },
    {
      id: 17,
      p: 'mid',
      k: 'muslim:482',
      t: 'Nearest to your Lord in sujūd',
      ta: 'أقرب ما يكون العبد ساجدًا',
      r: 'Ṣaḥīḥ Muslim 482',
      ra: 'صحيح مسلم ٤٨٢'
    },
    {
      id: 18,
      p: 'mid',
      k: 'muslim:2732',
      t: 'Duʿāʾ in your brother’s absence',
      ta: 'الدعاء بظهر الغيب',
      r: 'Ṣaḥīḥ Muslim 2732',
      ra: 'صحيح مسلم ٢٧٣٢'
    },
    {
      id: 19,
      p: 'mid',
      k: 'bukhari:1147',
      t: 'The Prophet’s night prayer',
      ta: 'صلاة النبي ﷺ بالليل',
      r: 'Ṣaḥīḥ al-Bukhārī 1147',
      ra: 'صحيح البخاري ١١٤٧'
    },
    {
      id: 20,
      p: 'mid',
      k: 'bukhari:6464',
      t: 'Steadiness before the last ten',
      ta: 'أحب الأعمال أدومها',
      r: 'Ṣaḥīḥ al-Bukhārī 6464',
      ra: 'صحيح البخاري ٦٤٦٤',
      n: 'The last ten nights begin at Maghrib tonight.',
      na: 'تبدأ العشر الأواخر عند مغرب هذه الليلة.'
    },
    {
      id: 21,
      p: 'odd',
      k: 'muslim:1174',
      t: 'Reviving the last ten nights',
      ta: 'إحياء ليالي العشر الأواخر',
      r: 'Ṣaḥīḥ Muslim 1174',
      ra: 'صحيح مسلم ١١٧٤',
      n: 'First odd night of the last ten. Seek Laylat al-Qadr.',
      na: 'أول ليلة وتر في العشر الأواخر. تحرَّ ليلة القدر.'
    },
    {
      id: 22,
      p: 'last10',
      k: 'muslim:1175',
      t: 'Striving beyond any other time',
      ta: 'الاجتهاد في العشر الأواخر',
      r: 'Ṣaḥīḥ Muslim 1175',
      ra: 'صحيح مسلم ١١٧٥',
      n: 'Every night of the last ten carries hope and mercy.',
      na: 'كل ليلة في العشر الأواخر محلّ رجاء ورحمة.'
    },
    {
      id: 23,
      p: 'odd',
      k: 'muslim:1169',
      t: 'Seek Laylat al-Qadr',
      ta: 'تحرَّ ليلة القدر',
      r: 'Ṣaḥīḥ Muslim 1169',
      ra: 'صحيح مسلم ١١٦٩',
      n: 'Odd night 23. Keep your tongue moist with duʿāʾ and dhikr.',
      na: 'ليلة ٢٣ الوترية. أكثر من الدعاء والذكر.'
    },
    {
      id: 24,
      p: 'last10',
      k: 'muslim:1172',
      t: 'Devotion and iʿtikāf',
      ta: 'الاعتكاف في العشر الأواخر',
      r: 'Ṣaḥīḥ Muslim 1172',
      ra: 'صحيح مسلم ١١٧٢',
      n: 'Even at home, carve out quiet hours solely for Allah.',
      na: 'وإن كنت في بيتك، فاجعل ساعات هادئة خالصة لله.'
    },
    {
      id: 25,
      p: 'odd',
      k: 'muslim:1165',
      t: 'Seek it in the last seven',
      ta: 'تحرّوها في السبع الأواخر',
      r: 'Ṣaḥīḥ Muslim 1165',
      ra: 'صحيح مسلم ١١٦٥',
      n: 'Odd night 25. The last seven nights draw near.',
      na: 'ليلة ٢٥ الوترية. دخلت السبع الأواخر.'
    },
    {
      id: 26,
      p: 'last10',
      k: 'muslim:2702',
      t: 'Abundant istighfār',
      ta: 'كثرة الاستغفار',
      r: 'Ṣaḥīḥ Muslim 2702',
      ra: 'صحيح مسلم ٢٧٠٢',
      n: 'Ask for pardon tonight and prepare your heart for night 27.',
      na: 'أكثر من الاستغفار الليلة، وهيّئ قلبك لليلة ٢٧.'
    },
    {
      id: 27,
      p: 'odd',
      k: 'item:r-qadr',
      t: 'The duʿāʾ of Laylat al-Qadr',
      ta: 'دعاء ليلة القدر',
      r: 'Jāmiʿ at-Tirmidhī 3513',
      ra: 'جامع الترمذي ٣٥١٣',
      g: 'Ṣaḥīḥ (al-Albānī)',
      ga: 'صحيح (الألباني)',
      n: 'Odd night 27. Repeat this prophetic duʿāʾ throughout the night.',
      na: 'ليلة ٢٧ الوترية. ردّد هذا الدعاء النبوي طوال الليل.'
    },
    {
      id: 28,
      p: 'last10',
      k: 'muslim:984',
      t: 'Zakāt al-Fiṭr is prescribed',
      ta: 'فرض زكاة الفطر',
      r: 'Ṣaḥīḥ Muslim 984',
      ra: 'صحيح مسلم ٩٨٤',
      n: 'Prepare Zakāt al-Fiṭr for yourself and those you support.',
      na: 'هيّئ زكاة الفطر عنك وعمن تعول.'
    },
    {
      id: 29,
      p: 'odd',
      k: 'muslim:1170',
      t: 'The waning moon of the last nights',
      ta: 'قمر العشر الأواخر وليلة القدر',
      r: 'Ṣaḥīḥ Muslim 1170',
      ra: 'صحيح مسلم ١١٧٠',
      n: 'Final odd night of Ramaḍān. End the month strong.',
      na: 'آخر ليلة وتر في رمضان. أحسن الختام.'
    },
    {
      id: 30,
      p: 'last10',
      k: 'muslim:986',
      t: 'Give Zakāt al-Fiṭr before the prayer',
      ta: 'أداء زكاة الفطر قبل صلاة العيد',
      r: 'Ṣaḥīḥ Muslim 986',
      ra: 'صحيح مسلم ٩٨٦',
      n: 'Complete Zakāt al-Fiṭr before going out to the ʿĪd prayer.',
      na: 'أدِّ زكاة الفطر قبل الخروج إلى صلاة العيد.'
    },
    {
      id: 'eid',
      p: 'eid',
      k: 'muslim:890',
      t: 'ʿĪd al-Fiṭr · Takbīr together',
      ta: 'عيد الفطر · التكبير معًا',
      r: 'Ṣaḥīḥ Muslim 890',
      ra: 'صحيح مسلم ٨٩٠',
      n: 'Taqabbal Allāhu minnā wa minkum. May Allah accept from us and from you.',
      na: 'تقبّل الله منّا ومنكم.'
    },
    {
      id: 'shawwal',
      p: 'eid',
      k: 'muslim:1164',
      t: 'Six days of Shawwāl',
      ta: 'صيام ستٍّ من شوال',
      r: 'Ṣaḥīḥ Muslim 1164',
      ra: 'صحيح مسلم ١١٦٤',
      n: 'After ʿĪd, six fasts in Shawwāl bring the reward of fasting perpetually.',
      na: 'بعد العيد، صيام ستٍّ من شوال يُتمّ أجر صيام الدهر.'
    }
  ];

  function rmResolve(entry) {
    if (!entry) return null;
    var ar = '',
      en = '',
      g = '';
    if (entry.k.indexOf('item:') === 0) {
      var it = window.DATA && window.DATA.items[entry.k.slice(5)];
      if (it) {
        ar = it.ar || '';
        en = it.en || '';
        g =
          entry.g ||
          it.grade ||
          (A.grade && it.refs && it.refs[0] && it.refs[0].u ? A.grade(it.refs[0].u.split('/').pop()) : '') ||
          '';
      }
    } else {
      var h = window.HADITH && window.HADITH[entry.k];
      if (h) {
        ar = h.ar || '';
        en = h.en || '';
        g = entry.g || h.g || '';
      }
    }
    var ga = entry.ga || '';
    return {
      entry: entry,
      ar: ar,
      en: en,
      g: g,
      ga: ga,
      title: tx(entry.t, entry.ta),
      ref: tx(entry.r, entry.ra),
      note: entry.n ? tx(entry.n, entry.na) : ''
    };
  }
  function rmRefLine(d, sep) {
    var s = sep || ' · ';
    if (A.ar()) return d.ref + (d.ga ? s + d.ga : '');
    if (!d.g) return d.ref;
    if (d.g === 'Ṣaḥīḥ' && /^Ṣaḥīḥ\s/.test(d.ref)) return d.ref;
    return d.ref + s + d.g;
  }
  function rmBadge(entry, len) {
    if (entry.id === 'eid') return tx('ʿĪd al-Fiṭr · 1 Shawwāl', 'عيد الفطر المبارك · ١ شوال');
    if (entry.id === 'shawwal') return tx('Shawwāl · After Ramaḍān', 'شوال · بعد رمضان');
    var n = entry.id,
      tot = len || 30;
    if (entry.p === 'odd') return tx('Last ten · Odd night ' + n, 'العشر الأواخر · ليلة ' + dg(n) + ' الوترية');
    if (entry.p === 'last10')
      return tx('Last ten · Day ' + n + ' of ' + tot, 'العشر الأواخر · اليوم ' + dg(n) + ' من ' + dg(tot));
    return tx('Ramaḍān · Day ' + n + ' of ' + tot, 'رمضان · اليوم ' + dg(n) + ' من ' + dg(tot));
  }
  function rmShortLabel(entry) {
    if (entry.id === 'eid') return tx('ʿĪd al-Fiṭr', 'عيد الفطر');
    if (entry.id === 'shawwal') return tx('Six of Shawwāl', 'ستٌّ من شوال');
    if (entry.p === 'odd') return tx('Night ' + entry.id + ' · Odd', 'ليلة ' + dg(entry.id) + ' · وتر');
    return tx('Day ' + entry.id, 'اليوم ' + dg(entry.id));
  }
  A.ramadanCardCount = function () {
    return RM_CARDS.length;
  };
  A.ramadanDayEntry = function (idx) {
    var i = A.clamp(Math.floor(Number(idx) || 0), 0, RM_CARDS.length - 1);
    return rmResolve(RM_CARDS[i]);
  };
  /* Which card belongs to right now: Day 1..30 during Ramaḍān (advancing to Night 21..30 at Maghrib, and ʿĪd on the final evening after Maghrib), ʿĪd on 1 Shawwāl, Shawwāl on 2–7 Shawwāl, or Day 1 outside. */
  A.ramadanTodayIdx = function () {
    var k = A.today(),
      h = A.hijri(k),
      info = A.ramadanInfo();
    if (h.m === 10 && h.d === 1) return 30; /* ʿĪd al-Fiṭr */
    if (h.m === 10 && h.d >= 2 && h.d <= 7) return 31; /* Six of Shawwāl */
    if (!info.on) return 0;
    var ph = phase();
    if (ph && ph.kind === 'eid') return 30; /* Evening after the last fast = ʿĪd Eve */
    /* During the last ten, once Maghrib falls the next Islamic night (nightNo) has begun */
    if (S.loc && nightIsOn()) {
      var t = A.pday(k),
        now = Date.now(),
        nn = nightNo(info);
      if (t && now >= t.maghrib && nn >= 21 && nn <= 30) return nn - 1;
    }
    return A.clamp(info.day - 1, 0, 29);
  };
  A.isEidFitr = function (key) {
    var h = A.hijri(key || A.today());
    return h.m === 10 && h.d === 1;
  };

  /* Homepage & Ramaḍān page daily shareable card */
  A.ramadanDailyCard = function (inPage) {
    var k = A.today(),
      info = A.ramadanInfo(),
      eid = A.isEidFitr(k);
    if (!info.on && !eid) {
      if (!inPage) return '';
      return (
        '<div class="card row h-gold rm-daily-cta"><span class="badge s">' +
        ic('share', 's') +
        '</span><div class="grow"><div class="t">Daily cards · Day 1 to Shawwāl</div><div class="faint small">Authentic daily reminders from Day 1 to the last ten nights, ʿĪd al-Fiṭr and Shawwāl</div></div><button type="button" class="btn sec sm" data-a="rm-share" data-i="0">Browse cards</button></div>'
      );
    }
    var idx = A.ramadanTodayIdx(),
      d = A.ramadanDayEntry(idx);
    if (!d || !d.ar) return '';
    var e = d.entry,
      cls = e.p === 'odd' ? ' is-odd' : e.p === 'eid' ? ' is-eid' : e.p === 'last10' ? ' is-l10' : '';
    return (
      '<section class="card col h-gold rm-daily' +
      cls +
      '"><div class="spread rm-daily-hd"><span class="eyebrow rm-pill">' +
      esc(rmBadge(e, info.on ? info.len : 30)) +
      '</span><span class="faint small">' +
      esc(d.title) +
      '</span></div><p class="ar rm-daily-ar" lang="ar">' +
      esc(d.ar) +
      '</p>' +
      (A.ar() || !d.en ? '' : '<p class="en rm-daily-en">“' + esc(d.en) + '”</p>') +
      (d.note ? '<p class="rm-daily-note">' + esc(d.note) + '</p>' : '') +
      '<div class="foot"><span class="faint small clamp1" style="flex:1">' +
      esc(rmRefLine(d)) +
      '</span><button type="button" class="btn sec sm" data-a="rm-share" data-i="' +
      idx +
      '">' +
      ic('share', 'xs') +
      'Share card</button></div></section>'
    );
  };

  /* Canvas helpers for bespoke Ramaḍān / Last Ten / ʿĪd dual-image share cards (1080×1920 Status & 1080×1350 Post) */
  function rmRoundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function rmStar(g, cx, cy, R, r) {
    g.beginPath();
    for (var i = 0; i < 16; i++) {
      var a = (Math.PI / 8) * i - Math.PI / 2,
        rr = i % 2 ? r : R;
      g[i ? 'lineTo' : 'moveTo'](cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    g.closePath();
  }
  /* Exact two-circle intersection crescent so both tips meet at razor-sharp cusps with zero flat cut */
  function rmCrescent(g, cx, cy, r) {
    var dx = r * 0.44,
      dy = -r * 0.14,
      d = Math.hypot(dx, dy),
      r2 = r * 0.84,
      phi = Math.atan2(dy, dx),
      a1 = Math.acos((r * r + d * d - r2 * r2) / (2 * r * d)),
      a2 = Math.acos((r2 * r2 + d * d - r * r) / (2 * r2 * d)),
      psi = phi + Math.PI;
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, phi + a1, phi - a1, false);
    g.arc(cx + dx, cy + dy, r2, psi + a2, psi - a2, true);
    g.closePath();
    g.fill();
    g.restore();
  }
  /* Minimalist hanging fānūs silhouette for Ramaḍān Days 1–20 cards */
  function rmLantern(g, x, topY, chainLen, scale, accent) {
    var s = scale || 1,
      y = topY + chainLen;
    g.save();
    g.strokeStyle = 'rgba(244, 220, 164, 0.34)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x, topY);
    g.lineTo(x, y);
    g.stroke();
    /* soft lantern glow */
    var gl = g.createRadialGradient(x, y + 36 * s, 0, x, y + 36 * s, 54 * s);
    gl.addColorStop(0, 'rgba(248, 212, 134, 0.28)');
    gl.addColorStop(1, 'rgba(248, 212, 134, 0)');
    g.fillStyle = gl;
    g.beginPath();
    g.arc(x, y + 36 * s, 54 * s, 0, Math.PI * 2);
    g.fill();
    /* dome + lantern body + finial */
    g.strokeStyle = accent;
    g.fillStyle = 'rgba(244, 220, 164, 0.14)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 12 * s, y + 6 * s, x + 13 * s, y + 16 * s);
    g.lineTo(x + 17 * s, y + 26 * s);
    g.lineTo(x + 13 * s, y + 54 * s);
    g.lineTo(x + 6 * s, y + 62 * s);
    g.lineTo(x - 6 * s, y + 62 * s);
    g.lineTo(x - 13 * s, y + 54 * s);
    g.lineTo(x - 17 * s, y + 26 * s);
    g.lineTo(x - 13 * s, y + 16 * s);
    g.quadraticCurveTo(x - 12 * s, y + 6 * s, x, y);
    g.closePath();
    g.fill();
    g.stroke();
    /* inner flame */
    g.fillStyle = 'rgba(255, 236, 182, 0.85)';
    g.beginPath();
    g.ellipse(x, y + 38 * s, 3.2 * s, 7.5 * s, 0, 0, Math.PI * 2);
    g.fill();
    /* tassel */
    g.strokeStyle = 'rgba(244, 220, 164, 0.48)';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(x, y + 62 * s);
    g.lineTo(x, y + 76 * s);
    g.stroke();
    g.restore();
  }
  function rmWrap(g, text, max) {
    var lines = [];
    String(text || '')
      .split('\n')
      .forEach(function (para) {
        var line = '';
        para
          .split(/\s+/)
          .filter(Boolean)
          .forEach(function (w) {
            var t = line ? line + ' ' + w : w;
            if (g.measureText(t).width > max && line) {
              lines.push(line);
              line = w;
            } else line = t;
          });
        if (line) lines.push(line);
      });
    return lines;
  }

  A.ramadanShareCard = function (idx, fmt) {
    var d = A.ramadanDayEntry(idx);
    if (!d) return '';
    var e = d.entry,
      isAr = A.ar(),
      W = 1080,
      H = fmt === 'post' ? 1350 : 1920,
      cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var g = cv.getContext('2d');
    if (!g) return '';

    /* Phase-tailored celestial palette */
    var pal =
      e.p === 'eid'
        ? {
            c0: '#06151c',
            c1: '#0d252e',
            c2: '#151c30',
            accent: '#f4dca4',
            glow: 'rgba(94, 214, 188, 0.24)',
            pillBg: 'rgba(244, 220, 164, 0.14)'
          }
        : e.p === 'odd'
          ? {
              c0: '#060618',
              c1: '#121036',
              c2: '#1d143b',
              accent: '#f7db98',
              glow: 'rgba(247, 219, 152, 0.28)',
              pillBg: 'rgba(247, 219, 152, 0.16)'
            }
          : e.p === 'last10'
            ? {
                c0: '#070a1c',
                c1: '#101536',
                c2: '#1a1533',
                accent: '#f1d292',
                glow: 'rgba(176, 156, 255, 0.22)',
                pillBg: 'rgba(241, 210, 146, 0.13)'
              }
            : {
                c0: '#080c1c',
                c1: '#111731',
                c2: '#19142b',
                accent: '#eecd86',
                glow: 'rgba(238, 205, 134, 0.24)',
                pillBg: 'rgba(238, 205, 134, 0.12)'
              };

    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, pal.c0);
    bg.addColorStop(0.52, pal.c1);
    bg.addColorStop(1, pal.c2);
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    /* Soft celestial halo */
    var gl = g.createRadialGradient(W / 2, H * 0.16, 0, W / 2, H * 0.16, W * 0.92);
    gl.addColorStop(0, pal.glow);
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, W, H);

    /* Subtle geometric lattice */
    g.strokeStyle = 'rgba(244, 220, 164, 0.045)';
    g.lineWidth = 1.3;
    for (var sy = -40; sy < H + 60; sy += 96)
      for (var sx = -40; sx < W + 60; sx += 96) {
        rmStar(g, sx, sy, 32, 23);
        g.stroke();
      }

    /* Fine ambient stars near upper sky */
    var starPts = [
      [190, 155, 3.2],
      [260, 210, 2.0],
      [340, 132, 2.4],
      [740, 138, 2.5],
      [820, 205, 2.0],
      [890, 158, 3.0],
      [155, 310, 1.8],
      [925, 295, 1.8],
      [415, 175, 1.6],
      [665, 172, 1.6]
    ];
    g.fillStyle = 'rgba(247, 232, 195, 0.55)';
    starPts.forEach(function (pt) {
      g.beginPath();
      g.arc(pt[0], pt[1], pt[2], 0, Math.PI * 2);
      g.fill();
    });

    /* Double architectural frame + unique pointed Ramaḍān mihrāb arch crest */
    var M = 52;
    g.strokeStyle = 'rgba(244, 220, 164, 0.34)';
    g.lineWidth = 2;
    rmRoundRect(g, M, M, W - 2 * M, H - 2 * M, 44);
    g.stroke();
    g.strokeStyle = 'rgba(244, 220, 164, 0.14)';
    g.lineWidth = 1.2;
    rmRoundRect(g, M + 12, M + 12, W - 2 * (M + 12), H - 2 * (M + 12), 34);
    g.stroke();

    /* Delicate pointed arch along upper frame — distinct Ramaḍān & ʿĪd signature */
    var archY = fmt === 'post' ? 210 : 254,
      archTop = M + 26;
    g.save();
    g.strokeStyle = 'rgba(244, 220, 164, 0.22)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(M + 26, archY);
    g.quadraticCurveTo(M + 26, archTop + 34, W / 2, archTop);
    g.quadraticCurveTo(W - M - 26, archTop + 34, W - M - 26, archY);
    g.stroke();
    g.restore();

    /* Phase-distinct top ornaments: flanking lanterns (Days 1–20), constellation (Last Ten), starlight rays (Odd Nights), twin stars (ʿĪd) */
    var topY = fmt === 'post' ? 164 : 206;
    if (e.p === 'start' || e.p === 'mid') {
      rmLantern(g, 136, M + 12, fmt === 'post' ? 30 : 48, 0.92, pal.accent);
      rmLantern(g, W - 136, M + 12, fmt === 'post' ? 30 : 48, 0.92, pal.accent);
    } else if (e.p === 'last10' || e.p === 'odd') {
      var rayCy = topY - 46;
      if (e.p === 'odd') {
        g.save();
        var rayGl = g.createRadialGradient(W / 2, rayCy, 0, W / 2, rayCy, 150);
        rayGl.addColorStop(0, 'rgba(247, 219, 152, 0.26)');
        rayGl.addColorStop(1, 'rgba(247, 219, 152, 0)');
        g.fillStyle = rayGl;
        g.beginPath();
        g.arc(W / 2, rayCy, 150, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      /* 10 delicate stars flanking the crest for the last ten nights */
      for (var si = 0; si < 5; si++) {
        var frac = (si + 1) / 6,
          dxS = 115 + si * 58,
          dyS = 8 + frac * frac * 54,
          isOddStar = si % 2 === 0;
        g.fillStyle = isOddStar ? 'rgba(247, 219, 152, 0.72)' : 'rgba(247, 219, 152, 0.34)';
        rmStar(g, W / 2 - dxS, rayCy + dyS, isOddStar ? 6.5 : 4.2, isOddStar ? 2.6 : 1.8);
        g.fill();
        rmStar(g, W / 2 + dxS, rayCy + dyS, isOddStar ? 6.5 : 4.2, isOddStar ? 2.6 : 1.8);
        g.fill();
      }
    }

    /* Header emblem: razor-sharp mathematical crescent + radiant star(s) */
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillStyle = pal.accent;
    rmCrescent(g, W / 2 - (e.p === 'odd' ? 14 : 6), topY - 46, 24);
    rmStar(g, W / 2 + 26, topY - 56, e.p === 'odd' ? 16 : 11, e.p === 'odd' ? 6.5 : 4.8);
    g.fill();
    if (e.p === 'eid') {
      rmStar(g, W / 2 - 48, topY - 54, 10, 4.4);
      g.fill();
    }

    /* Phase pill badge */
    var info = A.ramadanInfo(),
      tot = info.on ? info.len : 30,
      badgeTxt = rmBadge(e, tot);
    if (!isAr) badgeTxt = badgeTxt.toUpperCase();
    g.direction = isAr ? 'rtl' : 'ltr';
    g.font = isAr ? '700 30px Amiri, serif' : '700 26px Quicksand, sans-serif';
    var bw = Math.min(W - 180, g.measureText(badgeTxt).width + 68),
      bh = 54,
      by = topY + 6;
    g.fillStyle = pal.pillBg;
    rmRoundRect(g, (W - bw) / 2, by, bw, bh, 27);
    g.fill();
    g.strokeStyle = 'rgba(244, 220, 164, 0.38)';
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = pal.accent;
    g.fillText(badgeTxt, W / 2, by + 36);

    /* Concise title */
    var titleY = by + 104;
    g.font = isAr ? '700 44px Amiri, serif' : '700 38px Quicksand, sans-serif';
    g.fillStyle = '#faf5eb';
    g.fillText(d.title, W / 2, titleY);

    /* Main narration body: generous real-estate usage for effortless readability on mobile */
    var bodyTop = titleY + (fmt === 'post' ? 32 : 46),
      hasNote = !!d.note,
      bodyBottom = H - (fmt === 'post' ? (hasNote ? 228 : 186) : hasNote ? 296 : 246),
      area = bodyBottom - bodyTop,
      tw = W - 2 * M - 94,
      showEn = !isAr && !!d.en;

    var aS,
      aL,
      eS = 42,
      eL = [];
    g.direction = 'rtl';
    for (aS = isAr ? 98 : 92; aS >= 36; aS -= 2) {
      g.font = '400 ' + aS + 'px Amiri, serif';
      aL = rmWrap(g, d.ar, tw);
      if (aL.length * aS * 1.8 <= area * (showEn ? 0.56 : 0.88)) break;
    }
    if (showEn) {
      g.direction = 'ltr';
      var rem = area - aL.length * aS * 1.8 - 76;
      for (eS = 42; eS >= 27; eS -= 2) {
        g.font = '500 ' + eS + 'px Quicksand, sans-serif';
        eL = rmWrap(g, '“' + d.en + '”', tw);
        if (eL.length * eS * 1.46 <= rem) break;
      }
      var maxE = Math.max(0, Math.floor(rem / (eS * 1.46)));
      if (eL.length > maxE) {
        eL = eL.slice(0, maxE);
        if (eL.length) eL[eL.length - 1] = eL[eL.length - 1].replace(/\s*\S*$/, '…');
      }
    }

    var blockH = aL.length * aS * 1.8 + (eL.length ? 76 + eL.length * eS * 1.46 : 0),
      y0 = bodyTop + Math.max(0, (area - blockH) / 2);

    g.direction = 'rtl';
    g.font = '400 ' + aS + 'px Amiri, serif';
    g.fillStyle = '#fbf6ec';
    aL.forEach(function (line, i) {
      g.fillText(line, W / 2, y0 + i * aS * 1.8 + aS * 1.18);
    });

    if (eL.length) {
      g.direction = 'ltr';
      var oy = y0 + aL.length * aS * 1.8 + 34;
      g.strokeStyle = 'rgba(244, 220, 164, 0.52)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(W / 2 - 104, oy);
      g.lineTo(W / 2 - 16, oy);
      g.moveTo(W / 2 + 16, oy);
      g.lineTo(W / 2 + 104, oy);
      g.stroke();
      g.fillStyle = pal.accent;
      g.beginPath();
      g.moveTo(W / 2, oy - 7.5);
      g.lineTo(W / 2 + 7.5, oy);
      g.lineTo(W / 2, oy + 7.5);
      g.lineTo(W / 2 - 7.5, oy);
      g.closePath();
      g.fill();
      g.font = '500 ' + eS + 'px Quicksand, sans-serif';
      g.fillStyle = 'rgba(248, 243, 234, 0.9)';
      eL.forEach(function (line, i) {
        g.fillText(line, W / 2, oy + 44 + i * eS * 1.46 + eS * 0.78);
      });
    }

    /* Optional subtle phase nuance line */
    var footY = H - (fmt === 'post' ? 136 : 186);
    if (d.note) {
      g.direction = isAr ? 'rtl' : 'ltr';
      g.font = isAr ? '400 30px Amiri, serif' : '600 26px Quicksand, sans-serif';
      g.fillStyle = 'rgba(244, 220, 164, 0.88)';
      var nl = rmWrap(g, d.note, tw).slice(0, 2);
      var ny = footY - 48 - (nl.length - 1) * 34;
      nl.forEach(function (line, i) {
        g.fillText(line, W / 2, ny + i * 34);
      });
    }

    /* Footer: authenticated reference & clean minimalist app wordmark */
    g.direction = isAr ? 'rtl' : 'ltr';
    g.font = isAr ? '700 29px Amiri, serif' : '700 28px Quicksand, sans-serif';
    g.fillStyle = pal.accent;
    g.fillText(rmRefLine(d, '  ·  '), W / 2, footY);

    var sigY = footY + 50,
      sigTxt = isAr ? 'تطبيق الأذكار' : 'ADHKĀR · أذكار';
    g.direction = isAr ? 'rtl' : 'ltr';
    g.font = isAr ? '700 25px Amiri, serif' : '700 24px Quicksand, sans-serif';
    g.fillStyle = 'rgba(248, 243, 234, 0.58)';
    g.fillText(sigTxt, W / 2, sigY);
    var sw = g.measureText(sigTxt).width / 2;
    g.strokeStyle = 'rgba(244, 220, 164, 0.32)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(W / 2 - sw - 46, sigY - 8);
    g.lineTo(W / 2 - sw - 16, sigY - 8);
    g.moveTo(W / 2 + sw + 16, sigY - 8);
    g.lineTo(W / 2 + sw + 46, sigY - 8);
    g.stroke();

    return cv.toDataURL('image/png');
  };

  function rmShareText(idx) {
    var d = A.ramadanDayEntry(idx);
    if (!d) return '';
    var info = A.ramadanInfo(),
      tot = info.on ? info.len : 30,
      parts = [rmBadge(d.entry, tot) + ' · ' + d.title, d.ar];
    if (!A.ar() && d.en) parts.push('“' + d.en + '”');
    if (d.note) parts.push(d.note);
    parts.push(rmRefLine(d));
    parts.push(tx('Shared from Adhkār', 'مشاركة من تطبيق الأذكار'));
    return parts.join('\n\n');
  }

  A.openRamadanShare = function (initialIdx) {
    var curIdx = A.clamp(initialIdx != null ? Number(initialIdx) : A.ramadanTodayIdx(), 0, RM_CARDS.length - 1),
      fmt = 'status',
      url = null;
    var jumps = [
      [0, 'Day 1'],
      [20, 'Last 10'],
      [26, 'Night 27'],
      [30, 'ʿĪd']
    ];
    A.sheet(
      'Share card',
      '<div class="rm-sh-nav"><button type="button" class="ib ghost sm" data-rm-step="-1" aria-label="Previous card">' +
        ic('left', 's') +
        '</button><div class="rm-sh-lbl" id="rm-sh-lbl"></div><button type="button" class="ib ghost sm" data-rm-step="1" aria-label="Next card">' +
        ic('right', 's') +
        '</button></div><div class="rm-sh-chips">' +
        jumps
          .map(function (j) {
            return '<button type="button" class="chip sm" data-rm-jump="' + j[0] + '">' + esc(A.T(j[1])) + '</button>';
          })
          .join('') +
        '</div><div class="seg sm sh-fmt"><button type="button" data-fmt="status" aria-pressed="true">Status</button><button type="button" data-fmt="post" aria-pressed="false">Post</button></div><div class="shareprev"><img id="rm-shc" alt=""></div><div class="grid2"><button type="button" class="btn pri" data-sh="img">' +
        ic('share', 's') +
        'Share image</button><button type="button" class="btn sec" data-sh="txt">' +
        ic('copy', 's') +
        'Share text</button></div><button type="button" class="btn ghost" data-sh="ar">Copy the Arabic</button>',
      {
        mount: function (sh, o) {
          var draw = function () {
            var d = A.ramadanDayEntry(curIdx);
            var lbl = $('#rm-sh-lbl', sh);
            if (lbl && d) lbl.innerHTML = '<b>' + esc(rmShortLabel(d.entry)) + '</b><span>' + esc(d.title) + '</span>';
            Array.prototype.forEach.call(sh.querySelectorAll('[data-rm-jump]'), function (c) {
              c.classList.toggle('on', Number(c.dataset.rmJump) === curIdx);
            });
            var prev = $('[data-rm-step="-1"]', sh),
              next = $('[data-rm-step="1"]', sh);
            if (prev) prev.disabled = curIdx <= 0;
            if (next) next.disabled = curIdx >= RM_CARDS.length - 1;
            var run = function () {
              url = A.ramadanShareCard(curIdx, fmt);
              var im = $('#rm-shc', sh);
              if (im) {
                im.src = url;
                im.className = fmt;
              }
            };
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
            else run();
          };
          draw();
          sh.addEventListener('click', function (ev) {
            var st = ev.target.closest('[data-rm-step]');
            if (st) {
              curIdx = A.clamp(curIdx + Number(st.dataset.rmStep), 0, RM_CARDS.length - 1);
              A.N.haptic('tick');
              draw();
              return;
            }
            var jp = ev.target.closest('[data-rm-jump]');
            if (jp) {
              curIdx = A.clamp(Number(jp.dataset.rmJump), 0, RM_CARDS.length - 1);
              A.N.haptic('tick');
              draw();
              return;
            }
            var f = ev.target.closest('[data-fmt]');
            if (f) {
              fmt = f.dataset.fmt;
              Array.prototype.forEach.call(sh.querySelectorAll('[data-fmt]'), function (x) {
                x.setAttribute('aria-pressed', x === f);
              });
              A.N.haptic('tick');
              draw();
              return;
            }
            var b = ev.target.closest('[data-sh]');
            if (!b) return;
            var d = A.ramadanDayEntry(curIdx);
            if (b.dataset.sh === 'img') {
              if (url) A.N.shareImage(url, d ? d.title : 'Ramaḍān');
            } else if (b.dataset.sh === 'txt') {
              A.N.share(rmShareText(curIdx));
            } else if (d) {
              A.copy(d.ar);
              A.toast('Arabic copied', 'copy');
            }
            o.close();
          });
        }
      }
    );
  };

  A.acts['rm-share'] = function (el) {
    var idx = el && el.dataset && el.dataset.i != null ? Number(el.dataset.i) : A.ramadanTodayIdx();
    A.openRamadanShare(idx);
  };
  A.acts['rm-n'] = function (el) {
    var k = el.dataset.k,
      N = S.notif.ramadan;
    if (!A.remindersOn()) {
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
