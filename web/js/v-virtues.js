/* Times when duʿāʾ is answered (live, from prayer times) and small deeds with great rewards (daily log).
   Narrations are paraphrased; each links to its source. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    esc = A.esc,
    ic = A.icon;
  var MIN = 60000;
  function sn(l, p) {
    return { l: l, u: 'https://sunnah.com/' + p };
  }
  /* The Prophet's ﷺ words, verbatim: Arabic from the hadith collections and the sunnah.com English (tools/build_hadith.py).
     compact: the translation alone (or the Arabic alone in Arabic). */
  A.said = function (key, fallback, compact) {
    var H = window.HADITH && window.HADITH[key];
    if (!H) return fallback ? '<p class="hd-en">' + esc(fallback) + '</p>' : '';
    var cls = 'hd-ar' + (key.indexOf('quran:') === 0 ? ' hd-quran' : '');
    var note = H.x
      ? '<div class="hd-note">' +
        (A.ar && A.ar() ? '<span lang="ar">' + esc(H.xa) + '</span>' : '<b>Explanation</b> ' + esc(H.x)) +
        '</div>'
      : '';
    if (A.ar && A.ar()) return '<p class="' + cls + '" lang="ar">' + esc(H.ar) + '</p>' + note;
    return (
      (compact ? '' : '<p class="' + cls + '" lang="ar">' + esc(H.ar) + '</p>') +
      '<p class="hd-en no-tr">' +
      esc(H.en) +
      '</p>' +
      note
    );
  };
  A.saidFold = function (key, fallback) {
    var H = window.HADITH && window.HADITH[key];
    if (!H || (A.ar && A.ar())) return A.said(key, fallback, true);
    return (
      '<p class="hd-en no-tr">' +
      esc(H.en) +
      '</p>' +
      (H.x ? '<div class="hd-note"><b>Explanation</b> ' + esc(H.x) + '</div>' : '') +
      '<details class="hd-fold"><summary>Arabic</summary><p class="hd-ar' +
      (key.indexOf('quran:') === 0 ? ' hd-quran' : '') +
      '" lang="ar">' +
      esc(H.ar) +
      '</p></details>'
    );
  };
  /* the reward in a line, with the hadith itself folded beneath it (long narrations no longer fill the screen) */
  A.saidMore = function (key, summary) {
    var H = window.HADITH && window.HADITH[key];
    if (!H || (A.ar && A.ar())) return A.said(key, summary, true);
    return (
      '<p class="deed-r">' +
      esc(summary) +
      '</p><details class="hd-fold more"><summary>' +
      A.T('The hadith') +
      '</summary>' +
      A.said(key, '', true) +
      '<p class="hd-ar' +
      (key.indexOf('quran:') === 0 ? ' hd-quran' : '') +
      '" lang="ar">' +
      esc(H.ar) +
      '</p></details>'
    );
  };
  A.grade = function (key) {
    var H = window.HADITH && window.HADITH[key];
    return H && H.g ? H.g : '';
  };
  function keyOf(x) {
    var r = x.refs && x.refs[0];
    return r && r.u ? r.u.replace('https://sunnah.com/', '') : '';
  }

  /* ---------- answered times ---------- */
  var TIMED = [
    {
      id: 'third',
      t: 'The last third of the night',
      d: 'Our Lord descends to the nearest heaven and asks who is calling upon Him, that He may answer.',
      ic: 'moon',
      h: 'night',
      refs: [sn('Bukhārī 1145', 'bukhari:1145')]
    },
    {
      id: 'iqamah',
      t: 'Between the adhān and the iqāmah',
      d: 'A duʿāʾ made between the call and the iqāmah is not turned away.',
      ic: 'bell',
      h: 'teal',
      refs: [sn('Abū Dāwūd 521', 'abudawud:521'), sn('Tirmidhī 212', 'tirmidhi:212')]
    },
    {
      id: 'after',
      t: 'After the obligatory prayers',
      d: 'Asked which duʿāʾ is most heard, the Prophet ﷺ said: in the last part of the night and after the obligatory prayers.',
      ic: 'mosque',
      h: 'jade',
      refs: [sn('Tirmidhī 3499', 'tirmidhi:3499')]
    },
    {
      id: 'friday',
      t: 'The final hour of Friday',
      d: 'On Friday there is an hour in which a Muslim asks Allah for good and is given it. Seek it in the last hour after ʿAṣr.',
      ic: 'star',
      h: 'gold',
      refs: [sn('Abū Dāwūd 1048', 'abudawud:1048'), sn('Bukhārī 935', 'bukhari:935')]
    },
    {
      id: 'fasting',
      t: 'While you are fasting',
      d: 'Three supplications are answered: of the fasting person, the oppressed and the traveller.',
      ic: 'fast',
      h: 'sand',
      refs: [{ l: 'al-Bayhaqī, graded ṣaḥīḥ by al-Albānī', u: '' }]
    },
    {
      id: 'arafah',
      t: 'The Day of ʿArafah',
      d: 'The best duʿāʾ is the duʿāʾ on the Day of ʿArafah.',
      ic: 'sun',
      h: 'goldh',
      refs: [sn('Tirmidhī 3585', 'tirmidhi:3585')]
    },
    {
      id: 'qadr',
      t: 'Laylat al-Qadr',
      d: 'Better than a thousand months. Seek it in the odd nights of the last ten of Ramaḍān and ask: Allāhumma innaka ʿafuwwun tuḥibbul-ʿafwa faʿfu ʿannī.',
      ic: 'moonstar',
      h: 'indigo',
      refs: [{ l: 'Qurʾān 97', u: 'https://quran.com/97' }, sn('Tirmidhī 3513', 'tirmidhi:3513')]
    }
  ];
  var ANYTIME = [
    {
      t: 'In prostration',
      d: 'The servant is closest to his Lord while prostrating, so make plenty of duʿāʾ.',
      ic: 'hands',
      refs: [sn('Muslim 482', 'muslim:482')]
    },
    {
      t: 'For a brother in his absence',
      d: 'An angel replies: and for you the same.',
      ic: 'heart',
      refs: [sn('Muslim 2732', 'muslim:2732')]
    },
    {
      t: 'The oppressed, the traveller, a parent for a child',
      d: 'Three duʿāʾs are answered without doubt.',
      ic: 'shield',
      refs: [sn('Abū Dāwūd 1536', 'abudawud:1536')]
    },
    {
      t: 'On waking in the night',
      d: 'Whoever wakes, says the remembrance of the night and then asks, is answered.',
      ic: 'spark',
      refs: [sn('Bukhārī 1154', 'bukhari:1154')],
      href: '#/r/night/0'
    },
    {
      t: 'At the call to prayer',
      d: 'Two are seldom rejected: duʿāʾ at the call to prayer and in the thick of battle.',
      ic: 'bell',
      refs: [sn('Abū Dāwūd 2540', 'abudawud:2540')],
      href: '#/r/adhan/0'
    }
  ];
  /* windows for one civil day: [{id, from, to}] */
  function windowsFor(key) {
    var t = A.pday(key),
      out = [],
      h = A.hijri(key),
      dow = A.dow(key);
    if (!t) return out;
    out.push({ id: 'third', from: A.pday(A.shift(key, -1)).lastThird, to: t.fajr });
    A.PRAYERS.forEach(function (p) {
      out.push({ id: 'iqamah', from: t[p], to: t[p] + 20 * MIN, p: p });
      out.push({ id: 'after', from: t[p] + 20 * MIN, to: t[p] + 45 * MIN, p: p });
    });
    if (dow === 5) out.push({ id: 'friday', from: t.maghrib - 60 * MIN, to: t.maghrib });
    if (S.fasts[key]) out.push({ id: 'fasting', from: t.fajr, to: t.maghrib });
    if (h.m === 12 && h.d === 9) out.push({ id: 'arafah', from: t.fajr, to: t.maghrib });
    var hn = A.hijri(A.shift(key, 1));
    if (hn.m === 9 && hn.d >= 21 && hn.d % 2 === 1)
      out.push({ id: 'qadr', from: t.maghrib, to: A.pday(A.shift(key, 1)).fajr });
    return out;
  }
  A.answered = function (now) {
    now = now || Date.now();
    if (!S.loc) return { open: [], next: null };
    var k = A.today(),
      all = windowsFor(A.shift(k, -1)).concat(windowsFor(k), windowsFor(A.shift(k, 1)));
    var open = all.filter(function (w) {
      return w.from <= now && now < w.to;
    });
    var seen = {};
    open = open.filter(function (w) {
      if (seen[w.id]) return false;
      seen[w.id] = 1;
      return true;
    });
    var next =
      all
        .filter(function (w) {
          return w.from > now;
        })
        .sort(function (a, b) {
          return a.from - b.from;
        })[0] || null;
    return { open: open, next: next };
  };
  A.answeredInfo = function (id) {
    return TIMED.filter(function (x) {
      return x.id === id;
    })[0];
  };
  function label(w) {
    var i = A.answeredInfo(w.id);
    return i.t + (w.p ? ' · ' + P.NAMES[w.p] : '');
  }

  /* Today card */
  A.answeredCard = function () {
    var a = A.answered();
    if (!S.loc) return '';
    var now = Date.now();
    if (a.open.length) {
      var w = a.open[0],
        i = A.answeredInfo(w.id);
      return (
        '<a class="card focus press h-' +
        i.h +
        ' glowcard" href="#/answered"><span class="badge" style="--h:var(--' +
        i.h +
        ')">' +
        ic(i.ic) +
        '</span><div class="grow"><div class="eyebrow" style="color:var(--h)">Duʿāʾ is answered now</div><div class="ttl">' +
        esc(label(w)) +
        '</div><div class="sub" data-ans-cd>Open for ' +
        A.fmtDur(w.to - now, true) +
        (a.open.length > 1 ? ' · ' + (a.open.length - 1) + ' more' : '') +
        '</div></div><span class="faint">' +
        ic('right', 's') +
        '</span></a>'
      );
    }
    if (!a.next) return '';
    var n = A.answeredInfo(a.next.id);
    return (
      '<a class="card focus press h-' +
      n.h +
      '" href="#/answered"><span class="badge" style="--h:var(--' +
      n.h +
      ')">' +
      ic(n.ic) +
      '</span><div class="grow"><div class="eyebrow">Next time of acceptance</div><div class="ttl">' +
      esc(label(a.next)) +
      '</div><div class="sub">' +
      A.fmtTxt(a.next.from) +
      ' · in ' +
      A.fmtDur(a.next.from - now, true) +
      '</div></div><span class="faint">' +
      ic('right', 's') +
      '</span></a>'
    );
  };

  A.V.answered = function () {
    var a = A.answered(),
      now = Date.now(),
      k = A.today();
    var h =
      A.back('Today', '#/') +
      '<header class="top"><div class="tt"><div class="eyebrow">From the Sunnah</div><h1>When duʿāʾ is <em>answered</em></h1></div></header>';
    if (!S.loc)
      h +=
        '<div class="card col"><p class="muted small">Set your location to see these times live.</p><a class="btn pri sm" href="#/location">Set location</a></div>';
    if (a.open.length)
      h +=
        '<div class="sec"><h2>Open now</h2></div><div class="col">' +
        a.open
          .map(function (w) {
            var i = A.answeredInfo(w.id);
            return card(i, '<span class="chip on">' + ic('clock', 'xs') + 'until ' + A.fmtTxt(w.to) + '</span>', true);
          })
          .join('') +
        '</div>';
    if (S.loc) {
      var all = windowsFor(k)
        .concat(windowsFor(A.shift(k, 1)))
        .filter(function (w) {
          return w.from > now && w.id !== 'after';
        })
        .sort(function (x, y) {
          return x.from - y.from;
        });
      /* the next of each kind, and the later ones of the same kind named beneath it */
      var seen = {},
        up = [];
      all.forEach(function (w) {
        if (seen[w.id]) {
          if (w.p && seen[w.id].later.length < 4) seen[w.id].later.push(w);
          return;
        }
        seen[w.id] = { w: w, later: [] };
        up.push(seen[w.id]);
      });
      up = up.slice(0, 5).map(function (x) {
        x.w.later = x.later;
        return x.w;
      });
      h +=
        '<div class="sec"><h2>Coming up</h2></div><div class="card pad0"><div class="list">' +
        up
          .map(function (w) {
            var i = A.answeredInfo(w.id);
            return (
              '<div class="li h-' +
              i.h +
              '"><span class="badge s">' +
              ic(i.ic, 's') +
              '</span><div class="grow"><div class="t">' +
              esc(label(w)) +
              '</div><div class="s">' +
              (A.keyAt(w.from) === k ? 'Today' : 'Tomorrow') +
              ' · ' +
              A.fmtTxt(w.from) +
              ' to ' +
              A.fmtTxt(w.to) +
              '</div>' +
              (w.later && w.later.length
                ? '<div class="s later">' +
                  A.T('Then') +
                  ' ' +
                  w.later
                    .map(function (x) {
                      return P.NAMES[x.p] + ' ' + A.fmtTxt(x.from);
                    })
                    .join(' · ') +
                  '</div>'
                : '') +
              '</div><span class="x">in ' +
              A.fmtDur(w.from - now) +
              '</span></div>'
            );
          })
          .join('') +
        '</div></div>';
    }
    h +=
      '<div class="sec"><h2>Times through the year</h2></div><div class="col">' +
      TIMED.filter(function (i) {
        return !a.open.some(function (w) {
          return w.id === i.id;
        });
      })
        .map(function (i) {
          return card(i, '');
        })
        .join('') +
      '</div>';
    h +=
      '<div class="sec"><h2>At any moment</h2></div><div class="col">' +
      ANYTIME.map(function (i) {
        return card(
          i,
          i.href ? '<a class="chip on" href="' + i.href + '">Open the remembrance' + ic('right', 'xs') + '</a>' : ''
        );
      }).join('') +
      '</div>';
    return { html: h, title: 'Answered duʿāʾ', tab: 0 };
  };
  function card(i, extra, live) {
    return (
      '<div class="card col h-' +
      (i.h || 'gold') +
      (live ? ' glowcard' : '') +
      '"><div class="row" style="align-items:flex-start"><span class="badge s">' +
      ic(i.ic, 's') +
      '</span><div class="grow"><div style="font-weight:700;font-size:15px">' +
      esc(i.t) +
      '</div>' +
      A.saidFold(keyOf(i), i.d) +
      '</div></div>' +
      (extra ? '<div class="refs">' + extra + '</div>' : '') +
      '<div class="refs">' +
      i.refs
        .map(function (r, n) {
          var g = n === 0 ? A.grade(keyOf(i)) : '';
          return r.u
            ? '<a href="' +
                esc(r.u) +
                '" data-a="ext">' +
                ic('link', 'xs') +
                esc(r.l) +
                (g ? ' · ' + esc(g) : '') +
                '</a>'
            : '<a>' + esc(r.l) + '</a>';
        })
        .join('') +
      '</div></div>'
    );
  }

  /* ---------- small deeds, big rewards ---------- */
  var DEEDS = [
    {
      id: 'subhan100',
      g: 'Remembrance',
      t: 'Subḥānallāhi wa biḥamdih, 100 times',
      r: 'Sins are wiped away, even if they are like the foam of the sea.',
      refs: [sn('Bukhārī 6405', 'bukhari:6405')],
      go: '#/tracker'
    },
    {
      id: 'tahlil100',
      g: 'Remembrance',
      t: 'Lā ilāha illallāhu waḥdah… 100 times',
      r: 'Like freeing ten slaves, a hundred good deeds written, a hundred sins erased, and protection from Shayṭān until evening.',
      refs: [sn('Bukhārī 6403', 'bukhari:6403')],
      go: '#/r/quick/2'
    },
    {
      id: 'tasbih100',
      g: 'Remembrance',
      t: 'Subḥānallāh, 100 times',
      r: 'A thousand good deeds are written or a thousand sins removed.',
      refs: [sn('Muslim 2698', 'muslim:2698')],
      go: '#/tracker'
    },
    {
      id: 'twowords',
      g: 'Remembrance',
      t: 'Two words light on the tongue',
      r: 'Subḥānallāhi wa biḥamdih, subḥānallāhil-ʿaẓīm: heavy on the scale and beloved to the Most Merciful.',
      refs: [sn('Bukhārī 6406', 'bukhari:6406')],
      go: '#/r/quick/0'
    },
    {
      id: 'salawat',
      g: 'Remembrance',
      t: 'Send ṣalawāt on the Prophet ﷺ',
      r: 'Whoever sends one, Allah sends ten upon him.',
      refs: [sn('Muslim 408', 'muslim:408')],
      go: '#/tracker'
    },
    {
      id: 'ikhlas',
      g: 'Qurʾān',
      t: 'Recite Sūrat al-Ikhlāṣ',
      r: 'It is equal to a third of the Qurʾān.',
      refs: [sn('Bukhārī 5013', 'bukhari:5013')]
    },
    {
      id: 'kursi',
      g: 'Qurʾān',
      t: 'Āyat al-Kursī before sleep',
      r: 'A guardian from Allah stays with you and no devil comes near until morning.',
      refs: [sn('Bukhārī 2311', 'bukhari:2311')],
      go: '#/r/sleep/1'
    },
    {
      id: 'wudu',
      g: 'Prayer',
      t: 'The testimony after wuḍūʾ',
      r: 'The eight gates of Paradise are opened; enter by whichever you wish.',
      refs: [sn('Muslim 234', 'muslim:234')],
      go: '#/r/daily/1'
    },
    {
      id: 'rawatib',
      g: 'Prayer',
      t: 'Twelve voluntary rakʿahs a day',
      r: 'A house is built for you in Paradise.',
      refs: [sn('Muslim 728', 'muslim:728')]
    },
    {
      id: 'jamaah',
      g: 'Prayer',
      t: 'ʿIshāʾ and Fajr in congregation',
      r: 'ʿIshāʾ is like praying half the night; with Fajr, like praying the whole night.',
      refs: [sn('Muslim 656', 'muslim:656')]
    },
    {
      id: 'duha',
      g: 'Prayer',
      t: 'Two rakʿahs of Ḍuḥā',
      r: 'They suffice for the charity due on every joint of your body.',
      refs: [sn('Muslim 720', 'muslim:720')],
      go: '#/duha'
    },
    {
      id: 'adhan',
      g: 'Prayer',
      t: 'The duʿāʾ after the adhān',
      r: 'The Prophet’s ﷺ intercession becomes due for you.',
      refs: [sn('Bukhārī 614', 'bukhari:614')],
      go: '#/r/adhan/3'
    },
    {
      id: 'three',
      g: 'Fasting',
      t: 'Fast three days each month',
      r: 'Like fasting the whole year.',
      refs: [sn('Bukhārī 1981', 'bukhari:1981')],
      go: '#/calendar'
    },
    {
      id: 'smile',
      g: 'Character',
      t: 'Smile at your brother or sister',
      r: 'Your smile is charity.',
      refs: [sn('Tirmidhī 1956', 'tirmidhi:1956')]
    },
    {
      id: 'path',
      g: 'Character',
      t: 'Remove something harmful from the path',
      r: 'A man was forgiven for moving a thorny branch off the road.',
      refs: [sn('Bukhārī 652', 'bukhari:652')]
    },
    {
      id: 'sick',
      g: 'Character',
      t: 'Visit someone who is ill',
      r: 'You remain in the harvest of Paradise until you return.',
      refs: [sn('Muslim 2568', 'muslim:2568')]
    },
    {
      id: 'date',
      g: 'Character',
      t: 'Give charity, even half a date',
      r: 'Shield yourself from the Fire, even with half a date.',
      refs: [sn('Bukhārī 1417', 'bukhari:1417')]
    },
    {
      id: 'small',
      g: 'Character',
      t: 'Never belittle a good deed',
      r: 'Even meeting your brother with a cheerful face.',
      refs: [sn('Muslim 2626', 'muslim:2626')]
    }
  ];
  A.DEEDS = DEEDS;
  function doneToday() {
    return (S.deeds || {})[A.today()] || {};
  }
  A.V.deeds = function () {
    S.deeds = S.deeds || {};
    var d = doneToday(),
      n = Object.keys(d).length,
      groups = [],
      last = '';
    var streak = 0,
      k = A.today();
    if (!S.deeds[k]) k = A.shift(k, -1);
    while (S.deeds[k] && streak < 999) {
      streak++;
      k = A.shift(k, -1);
    }
    var h =
      A.back('Adhkār', '#/adhkar') +
      '<header class="top"><div class="tt"><div class="eyebrow">Little deeds, great rewards</div><h1>Small <em>deeds</em></h1></div></header>';
    h +=
      '<div class="card row h-rose" style="gap:16px">' +
      A.ring(n / DEEDS.length, 64, '<b style="font-size:16px;color:var(--t1)">' + n + '</b>', 'var(--rose)', 4) +
      '<div class="grow"><div style="font-weight:700;font-size:16px">' +
      (n ? n + ' done today' : 'Begin with one') +
      '</div><div class="muted small">' +
      (streak > 1 ? streak + ' days in a row · ' : '') +
      'Tick a deed when you do it. Beloved deeds are those done consistently, even if small.</div></div></div>';
    DEEDS.forEach(function (x) {
      if (x.g !== last) {
        groups.push('<div class="sec"><h2>' + esc(x.g) + '</h2></div><div class="card pad0"><div class="list">');
        last = x.g;
      }
      groups[groups.length - 1] += deedRow(x, !!d[x.id]);
    });
    h += groups
      .map(function (g) {
        return g + '</div></div>';
      })
      .join('');
    h +=
      '<div class="card col hd-card">' +
      A.said('bukhari:6464') +
      '<div class="refs"><a href="https://sunnah.com/bukhari:6464" data-a="ext">' +
      ic('link', 'xs') +
      'Bukhārī 6464 · Ṣaḥīḥ</a></div></div>';
    return { html: h, title: 'Small deeds', tab: 1 };
  };
  function deedRow(x, on) {
    return (
      '<div class="li"><button type="button" class="chk' +
      (on ? ' on' : '') +
      '" data-a="deed" data-id="' +
      x.id +
      '" aria-pressed="' +
      on +
      '" aria-label="Mark ' +
      esc(x.t) +
      ' done">' +
      ic('check', 'xs') +
      '</button><div class="grow"><div class="t">' +
      esc(x.t) +
      '</div>' +
      A.saidMore(keyOf(x), x.r) +
      '<div class="refs" style="margin-top:6px">' +
      x.refs
        .map(function (r) {
          return (
            '<a href="' +
            esc(r.u) +
            '" data-a="ext" style="min-height:26px;padding:3px 10px;font-size:11px">' +
            esc(r.l) +
            '</a>'
          );
        })
        .join('') +
      (x.go
        ? '<a href="' +
          x.go +
          '" style="min-height:26px;padding:3px 10px;font-size:11px;color:var(--gold2)">Do it now' +
          ic('right', 'xs') +
          '</a>'
        : '') +
      '</div></div></div>'
    );
  }
  A.acts.deed = function (el) {
    S.deeds = S.deeds || {};
    var k = A.today(),
      o = (S.deeds[k] = S.deeds[k] || {}),
      id = el.dataset.id;
    if (o[id]) delete o[id];
    else o[id] = Date.now();
    if (!Object.keys(o).length) delete S.deeds[k];
    A.save();
    A.N.haptic(o[id] ? 'success' : 'tick');
    A.rerender();
  };
})();
