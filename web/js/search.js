/* Search everything in the app: adhkār (Arabic, transliteration, translation, sources), verbatim hadith and Qurʾān,
   app pages and individual settings. Queries understand "an exact phrase", -excluded words, Arabic with or without
   ḥarakāt, near spellings and a few synonyms (forgive → istighfār). Results are ranked by where they match. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    $ = A.$,
    esc = A.esc,
    ic = A.icon,
    D = window.DATA;

  /* ---------- normalising ---------- */
  var AR = /[؀-ۿ]/;
  function nar(s) {
    /* Arabic: no ḥarakāt or tatweel, one form of alif, yāʾ and tāʾ marbūṭah */
    return String(s || '')
      .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي');
  }
  function nen(s) {
    return A.fold(s)
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function norm(s) {
    return AR.test(s) ? nar(s) : nen(s);
  }

  /* a few words people search for, and the words the texts use */
  var SYN = {
    forgive: ['forgiveness', 'istighfar', 'ghfir', 'pardon'],
    forgiveness: ['forgive', 'istighfar'],
    sleep: ['bed', 'lying down', 'night'],
    morning: ['asbahna', 'sabah'],
    evening: ['amsayna', 'masa'],
    protection: ['refuge', 'protect', 'audhu'],
    protect: ['refuge', 'protection'],
    anxiety: ['worry', 'grief', 'sadness', 'distress'],
    worry: ['grief', 'sadness', 'distress'],
    sad: ['sadness', 'grief', 'distress'],
    stress: ['distress', 'grief'],
    depressed: ['sadness', 'grief', 'distress'],
    anger: ['angry', 'satan'],
    angry: ['anger', 'satan'],
    hard: ['difficult', 'ease'],
    difficult: ['ease', 'difficulty'],
    debt: ['debt'],
    fear: ['refuge', 'protection'],
    travel: ['journey', 'shorten', 'safar'],
    prayer: ['salah', 'salat'],
    salah: ['prayer'],
    pray: ['prayer', 'salah'],
    kaaba: ['qibla'],
    direction: ['qibla'],
    fasting: ['fast', 'sawm', 'ramadan', 'iftar', 'suhur'],
    fast: ['fasting', 'iftar'],
    ablution: ['wudu'],
    wudu: ['ablution'],
    mosque: ['masjid'],
    masjid: ['mosque'],
    paradise: ['jannah'],
    hell: ['fire'],
    death: ['grave', 'die'],
    knowledge: ['ilm'],
    thanks: ['gratitude', 'shukr', 'praise'],
    period: ['break', 'menses'],
    menses: ['break', 'period'],
    hijab: ['dress', 'awrah', 'jilbab'],
    dress: ['awrah', 'clothing'],
    adhan: ['call to prayer', 'muadhdhin'],
    call: ['adhan'],
    mistake: ['sahw', 'forget'],
    forget: ['sahw', 'mistake'],
    sahw: ['mistake', 'forget'],
    how: ['learn'],
    teach: ['learn'],
    quran: ['qur an', 'surah', 'ayah']
  };

  /* ---------- the index (built on first use) ---------- */
  var IDX = null,
    IDXLANG = null;
  function field(t, w) {
    return { n: norm(t), w: w };
  }
  function build() {
    var docs = [],
      seen = {};
    D.collections.forEach(function (c) {
      A.items(c.id, 'fajr').forEach(function (it, i) {
        if (seen[it.uid]) {
          seen[it.uid].also.push(c.title);
          return;
        }
        var d = {
          k: 'dhikr',
          t: it.title,
          s: c.title + (it.tag ? ' · ' + it.tag : ''),
          icon: c.icon,
          href: '#/r/' + c.id + '/' + i + (c.perPrayer ? '/fajr' : ''),
          also: [],
          it: it,
          f: [
            field(it.title, 6),
            field(it.tag || '', 3),
            field(c.title, 2),
            field(it.tr || '', 2),
            field(it.en || '', 2.5),
            field(
              (it.refs || [])
                .map(function (r) {
                  return r.l;
                })
                .join(' '),
              1.5
            ),
            { n: nar(it.ar), w: 3, ar: true }
          ]
        };
        seen[it.uid] = d;
        docs.push(d);
      });
    });
    var H = window.HADITH || {};
    Object.keys(H).forEach(function (k) {
      if (k.indexOf('say:') === 0) return;
      var q = k.indexOf('quran:') === 0,
        label = q ? 'Qurʾān ' + k.slice(6) : A.refLabel(k);
      docs.push({
        k: q ? 'quran' : 'hadith',
        t: label,
        s: q ? 'The Clear Quran' : H[k].g || 'Hadith',
        icon: q ? 'book' : 'text',
        key: k,
        en: H[k].en,
        f: [field(label, 4), field(H[k].en, 2.5), { n: nar(H[k].ar), w: 2.5, ar: true }]
      });
    });
    PAGES.forEach(function (p) {
      docs.push({
        k: 'page',
        t: p[0],
        s: p[3],
        icon: p[2],
        href: p[1],
        act: p[5],
        f: [field(p[0], 6), field(A.toAr ? A.toAr(p[0]) : '', 5), field(p[4] || '', 3), field(p[3], 1.5)]
      });
    });
    /* every settings row, found by its own label */
    if (A.settingSections)
      Object.keys(A.settingSections).forEach(function (sec) {
        var r;
        try {
          r = A.settingSections[sec]();
        } catch (e) {
          return;
        }
        var box = document.createElement('div');
        box.innerHTML = r[1];
        A.$$('.set', box).forEach(function (row) {
          var t = row.querySelector('.t'),
            s = row.querySelector('.s');
          if (!t || !t.textContent.trim()) return;
          var tt = t.textContent.trim();
          if (
            PAGES.some(function (p) {
              return p[0] === tt;
            })
          )
            return; /* already listed */
          docs.push({
            k: 'setting',
            t: tt,
            s: r[0] + (s && s.textContent.trim() ? ' · ' + s.textContent.trim() : ''),
            icon: 'gear',
            href: '#/settings/' + sec,
            flash: tt,
            f: [field(tt, 5), field(A.toAr ? A.toAr(tt) : '', 4), field(r[0], 1.5), field(s ? s.textContent : '', 1)]
          });
        });
      });
    IDX = docs;
    IDXLANG = S.prefs.lang;
  }
  /* destinations: [title, route, icon, where, more words, action] */
  var PAGES = [
    ['Prayer times', '#/salah', 'mosque', 'Ṣalāh', 'fajr dhuhr asr maghrib isha times today'],
    ['Qibla', '#/qibla', 'compass', 'Ṣalāh', 'direction kaaba makkah compass'],
    [
      'Learn the prayer',
      '#/learn',
      'mosque',
      'Ṣalāh',
      'how to pray step by step ruku sujud tashahhud takbir teach new muslim'
    ],
    ['A mistake in prayer', null, 'info', 'Learn the prayer', 'sujud as sahw forgot doubt extra rakah', 'lp-sahw'],
    ['Timetable', '#/month', 'cal', 'Ṣalāh', 'month prayer times table'],
    ['Hijri calendar', '#/calendar', 'moonstar', 'Ṣalāh', 'islamic dates eid ramadan arafah ashura white days fasting'],
    ['The last third of the night', '#/night', 'moon', 'Ṣalāh', 'tahajjud qiyam witr night prayer'],
    ['Ḍuḥā', '#/duha', 'sun', 'Ṣalāh', 'forenoon duha prayer'],
    ['Location', '#/location', 'pin', 'Ṣalāh', 'city place travel'],
    ['My duʿāʾs', '#/journal', 'hands', 'Ṣalāh', 'journal dua requests answered'],
    ['Make-up prayers', '#/qada', 'reset', 'Ṣalāh', 'qada missed prayers'],
    ['Dress & ʿawrah', '#/modesty', 'user', 'From the Qurʾān and Sunnah', 'hijab jilbab clothing awrah cover'],
    ['Duʿāʾ times', '#/answered', 'hands', 'Today', 'when dua is answered accepted'],
    ['Small deeds', '#/deeds', 'heart', 'Today', 'good deeds charity smile'],
    ['Tracker', '#/tracker', 'tracker', 'Tasbīḥ', 'tasbih counter dhikr count beads'],
    ['Insights', '#/insights', 'insights', 'You', 'stats streak history chart'],
    ['Saved', '#/saved', 'bookmark', 'Adhkār', 'bookmarks favourites'],
    ['Ramaḍān', '#/ramadan', 'moonstar', 'Today', 'fasting suhur iftar taraweeh khatm last ten'],
    ['Adhkār library', '#/adhkar', 'book', 'Adhkār', 'collections morning evening sleep'],
    /* settings that only show once reminders are on, so they are listed here too */
    [
      'Reminders',
      '#/settings/notifications',
      'bell',
      'Settings',
      'notifications prayer reminder heads up morning evening sleep'
    ],
    [
      'Adhān at prayer time',
      '#/settings/notifications',
      'bell',
      'Settings · Reminders',
      'adhan sound takbir allahu akbar madinah notification tone'
    ],
    [
      'Silence my phone',
      '#/settings/notifications',
      'belloff',
      'Settings · Reminders',
      'silent mute do not disturb dnd during salah iqamah'
    ],
    [
      'On-screen dhikr',
      '#/settings/notifications',
      'spark',
      'Settings · Reminders',
      'gentle reminder nudge overlay floating'
    ],
    ['Iqāmah times', '#/settings/prayer', 'clock', 'Settings · Prayer times', 'iqama congregation masjid'],
    ['Theme and accent', null, 'palette', 'Settings · Appearance', 'dark light colour color accent', 'theme'],
    ['Language', '#/settings/appearance', 'globe', 'Settings · Appearance', 'arabic english عربي'],
    ['Recitations', '#/settings/reading', 'play', 'Settings · Reading', 'audio download listen recitation afasy'],
    ['Home-screen widgets', '#/settings/device', 'widget', 'Settings · Widgets & device', 'widget home screen'],
    ['Backup & data', '#/settings/data', 'shield', 'Settings', 'export import backup restore erase']
  ];

  /* ---------- the query ---------- */
  function parse(raw) {
    var q = { phrases: [], terms: [], not: [] },
      s = String(raw || '');
    s = s.replace(/["“”«»]([^"“”«»]+)["“”«»]?/g, function (_, p) {
      var n = norm(p);
      if (n) q.phrases.push(n);
      return ' ';
    });
    s.split(/\s+/).forEach(function (w) {
      if (!w) return;
      if (w.charAt(0) === '-' && w.length > 2) {
        var x = norm(w.slice(1));
        if (x) q.not.push(x);
        return;
      }
      var n = norm(w);
      if (n)
        n.split(' ').forEach(function (t) {
          if (t) q.terms.push(t);
        });
    });
    return q;
  }
  function lev1(a, b) {
    /* true when a and b differ by at most one edit */
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0,
      j = 0,
      e = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        i++;
        j++;
        continue;
      }
      if (++e > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else {
        i++;
        j++;
      }
    }
    return e + (a.length - i) + (b.length - j) <= 1;
  }
  /* how well one term matches a field: whole word 1, word start .8, inside .5, one typo .4 */
  function hit(fn, t) {
    var i = fn.indexOf(t);
    if (i < 0) {
      if (t.length < 5) return 0;
      var ws = fn.split(' ');
      for (var k = 0; k < ws.length; k++) if (ws[k].length > 3 && lev1(ws[k], t)) return 0.4;
      return 0;
    }
    var pre = i === 0 || fn.charAt(i - 1) === ' ',
      post = i + t.length === fn.length || fn.charAt(i + t.length) === ' ';
    if (t.length < 3)
      return fn.indexOf(' ' + t + ' ') >= 0 ||
        fn === t ||
        fn.indexOf(t + ' ') === 0 ||
        (fn.length > t.length && fn.slice(-t.length - 1) === ' ' + t)
        ? 1
        : 0; /* short words: whole words only */
    return pre && post ? 1 : pre ? 0.8 : 0.5;
  }
  function score(d, q) {
    var total = 0;
    for (var p = 0; p < q.phrases.length; p++) {
      var best = 0;
      d.f.forEach(function (f) {
        if (f.n && f.n.indexOf(q.phrases[p]) >= 0) best = Math.max(best, f.w * 2);
      });
      if (!best) return 0;
      total += best;
    }
    for (var t = 0; t < q.terms.length; t++) {
      var term = q.terms[t],
        b = 0;
      d.f.forEach(function (f) {
        if (f.n) b = Math.max(b, hit(f.n, term) * f.w);
      });
      if (!b && SYN[term])
        SYN[term].forEach(function (sy) {
          var ns = norm(sy);
          d.f.forEach(function (f) {
            if (f.n && f.n.indexOf(ns) >= 0) b = Math.max(b, 0.6 * f.w);
          });
        });
      if (!b) return 0;
      total += b;
    }
    for (var n = 0; n < q.not.length; n++)
      if (
        d.f.some(function (f) {
          return f.n && f.n.indexOf(q.not[n]) >= 0;
        })
      )
        return 0;
    return total + (d.k === 'page' || d.k === 'setting' ? 0.5 : 0);
  }
  A.searchAll = function (raw) {
    var q = parse(raw);
    if (!q.phrases.length && !q.terms.length) return { q: q, list: [] };
    if (!IDX || IDXLANG !== S.prefs.lang) build();
    var list = [];
    IDX.forEach(function (d) {
      var s = score(d, q);
      if (s > 0) list.push({ d: d, s: s });
    });
    list.sort(function (a, b) {
      return b.s - a.s || a.d.t.length - b.d.t.length;
    });
    return { q: q, list: list };
  };
  A.searchReset = function () {
    IDX = null;
  };

  /* ---------- showing results ---------- */
  function words(q) {
    return q.phrases.concat(q.terms).filter(function (w) {
      return w.length > 1;
    });
  }
  /* mark the matched words inside text, mapping the folded match back onto the original characters */
  function mark(text, q) {
    var src = String(text || ''),
      ar = AR.test(src),
      W = words(q).filter(function (w) {
        return AR.test(w) === ar;
      });
    if (!W.length) return esc(src);
    var base = '',
      map = [];
    for (var i = 0; i < src.length; i++) {
      var n = ar ? nar(src[i]) : nen(src[i]) || (src[i] === ' ' ? ' ' : '');
      for (var j = 0; j < n.length; j++) {
        base += n[j];
        map.push(i);
      }
    }
    base = base.toLowerCase();
    var marks = [];
    var edge = function (k) {
        return k <= 0 || !/[a-z0-9ء-ي]/.test(base[k - 1]);
      },
      tail = function (k) {
        return k >= base.length || !/[a-z0-9ء-ي]/.test(base[k]);
      };
    W.forEach(function (w) {
      var at = 0,
        k;
      while ((k = base.indexOf(w, at)) >= 0) {
        if ((edge(k) || ar) && (w.length > 2 || tail(k + w.length))) marks.push([map[k], map[k + w.length - 1] + 1]);
        at = k + w.length;
      }
    });
    if (!marks.length) return esc(src);
    marks.sort(function (a, b) {
      return a[0] - b[0];
    });
    var out = '',
      last = 0;
    marks.forEach(function (m) {
      if (m[0] < last) return;
      var end = m[1];
      while (end < src.length && /[ً-ٰٟ]/.test(src[end])) end++;
      out += esc(src.slice(last, m[0])) + '<mark>' + esc(src.slice(m[0], end)) + '</mark>';
      last = end;
    });
    return out + esc(src.slice(last));
  }
  /* a short window of text around the first match */
  function snippet(text, q, len) {
    var src = String(text || '').replace(/\s+/g, ' ');
    len = len || 110;
    var lw = norm(src),
      w = words(q).filter(function (x) {
        return AR.test(x) === AR.test(src);
      })[0];
    var at = w ? lw.indexOf(w) : -1;
    if (at < 0 || src.length <= len) return src.length > len ? src.slice(0, len).replace(/\s\S*$/, '') + '…' : src;
    var ratio = src.length / Math.max(1, lw.length),
      c = Math.round(at * ratio),
      a = Math.max(0, c - Math.round(len / 3));
    var piece = src.slice(a, a + len);
    if (a > 0) piece = '…' + piece.replace(/^\S*\s/, '');
    if (a + len < src.length) piece = piece.replace(/\s\S*$/, '') + '…';
    return piece;
  }
  var GROUP = { dhikr: 'Adhkār', hadith: 'Hadith', quran: 'Qurʾān', page: 'In the app', setting: 'Settings' };
  var FILTER = [
    ['all', 'All'],
    ['dhikr', 'Adhkār'],
    ['hadith', 'Hadith'],
    ['page', 'App']
  ];
  function inFilter(k, f) {
    return f === 'all' || k === f || (f === 'hadith' && k === 'quran') || (f === 'page' && k === 'setting');
  }
  function row(x, q, i) {
    var d = x.d,
      arMatch = words(q).some(function (w) {
        return AR.test(w);
      });
    var body =
      d.k === 'dhikr'
        ? arMatch
          ? '<div class="sr-ar ar" lang="ar">' + mark(snippet(d.it.ar, q, 90), q) + '</div>'
          : d.it.en
            ? '<div class="sr-x">' + mark(snippet(d.it.en, q), q) + '</div>'
            : ''
        : d.en
          ? '<div class="sr-x">' + mark(snippet(d.en, q), q) + '</div>'
          : '';
    var attrs = d.href ? 'href="' + d.href + '"' : 'href="#"';
    return (
      '<a class="sr-row" ' +
      attrs +
      ' data-a="sr-open" data-i="' +
      i +
      '"><span class="badge s">' +
      ic(d.icon, 's') +
      '</span><div class="grow"><div class="t">' +
      mark(d.t, q) +
      '</div><div class="s clamp1">' +
      esc(d.s) +
      (d.also && d.also.length ? ' · also ' + esc(d.also.join(', ')) : '') +
      '</div>' +
      body +
      '</div></a>'
    );
  }

  var ST = { q: '', f: 'all', res: null };
  A.V.search = function (a) {
    if (a && a[0]) ST.q = a[0];
    var h =
      '<div class="sr-bar"><label class="search sr-field">' +
      ic('search', 's') +
      '<input id="q" type="search" placeholder="Search duʿāʾ, hadith, the app" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search" value="' +
      esc(ST.q) +
      '"><button type="button" class="ib ghost sm sr-clear" data-a="sr-clear" aria-label="Clear">' +
      ic('close', 's') +
      '</button></label>' +
      '<div class="sr-chips" role="tablist">' +
      FILTER.map(function (x) {
        return (
          '<button type="button" class="chip" data-a="sr-f" data-f="' +
          x[0] +
          '" aria-pressed="' +
          (ST.f === x[0]) +
          '">' +
          x[1] +
          '<b data-n="' +
          x[0] +
          '"></b></button>'
        );
      }).join('') +
      '</div></div><div id="qr" class="sr-out"></div>';
    return { html: h, title: 'Search', tab: -1, mount: mount };
  };
  function mount(el) {
    var q = $('#q', el);
    var run = function () {
      ST.q = q.value;
      el.classList.toggle('sr-has', !!q.value);
      paint();
    };
    q.addEventListener('input', A.debounce(run, 110));
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var f = $('.sr-row', el);
        if (f) {
          e.preventDefault();
          f.click();
        }
      }
    });
    run();
    setTimeout(function () {
      q.focus();
      try {
        q.setSelectionRange(q.value.length, q.value.length);
      } catch (e) {}
    }, 260);
  }
  function paint() {
    var out = $('#qr');
    if (!out) return;
    var raw = ST.q.trim();
    if (!raw) {
      ST.res = null;
      A.$$('[data-n]').forEach(function (b) {
        b.textContent = '';
      });
      out.innerHTML = idle();
      return;
    }
    var r = (ST.res = A.searchAll(raw)),
      counts = { all: 0, dhikr: 0, hadith: 0, page: 0 };
    r.list.forEach(function (x) {
      counts.all++;
      FILTER.forEach(function (f) {
        if (f[0] !== 'all' && inFilter(x.d.k, f[0])) counts[f[0]]++;
      });
    });
    A.$$('[data-n]').forEach(function (b) {
      var n = counts[b.dataset.n];
      b.textContent = n ? A.fmtN(n) : '';
    });
    var shown = r.list.filter(function (x) {
      return inFilter(x.d.k, ST.f);
    });
    if (!shown.length) {
      out.innerHTML =
        '<div class="empty sr-none"><div class="badge h-gold">' +
        ic('search') +
        '</div><h3>Nothing found</h3><p>Try fewer words, or another spelling.</p></div>';
      return;
    }
    var h = '',
      group = null,
      n = 0;
    /* the best match leads; the rest are grouped by kind */
    var top = shown[0],
      rest = shown.slice(1, 60);
    h +=
      '<div class="sec sr-sec"><h2>Best match</h2></div><div class="card pad0 sr-list">' +
      row(top, r.q, r.list.indexOf(top)) +
      '</div>';
    ['page', 'setting', 'dhikr', 'quran', 'hadith'].forEach(function (k) {
      var g = rest.filter(function (x) {
        return x.d.k === k;
      });
      if (!g.length) return;
      h +=
        '<div class="sec sr-sec"><h2>' +
        GROUP[k] +
        '</h2><span class="aside">' +
        A.fmtN(g.length) +
        '</span></div><div class="card pad0 sr-list">' +
        g
          .map(function (x) {
            return row(x, r.q, r.list.indexOf(x));
          })
          .join('') +
        '</div>';
    });
    out.innerHTML = h;
  }
  function idle() {
    var rec = (S.recent || []).slice(0, 6);
    var h = rec.length
      ? '<div class="sec sr-sec"><h2>Recent</h2><button type="button" class="aside gold" data-a="sr-forget">Clear</button></div><div class="sr-sugg">' +
        rec
          .map(function (x) {
            return (
              '<button type="button" class="chip" data-a="sr-try" data-q="' +
              esc(x) +
              '">' +
              ic('clock', 'xs') +
              esc(x) +
              '</button>'
            );
          })
          .join('') +
        '</div>'
      : '';
    h +=
      '<div class="sec sr-sec"><h2>Try</h2></div><div class="sr-sugg">' +
      ['forgiveness', 'before sleep', 'anxiety', 'travel', 'tashahhud', 'qibla', '"seek refuge"', 'سبحان']
        .map(function (x) {
          return '<button type="button" class="chip" data-a="sr-try" data-q="' + esc(x) + '">' + esc(x) + '</button>';
        })
        .join('') +
      '</div>';
    h +=
      '<div class="card col sr-tips"><div class="sr-tip"><code>"seek refuge"</code><span>Exact phrase</span></div><div class="sr-tip"><code>sleep -quran</code><span>Leave a word out</span></div><div class="sr-tip"><code dir="rtl">رب اغفر</code><span>Arabic, with or without ḥarakāt</span></div></div>';
    return h;
  }
  function remember(q) {
    q = String(q || '').trim();
    if (q.length < 2) return;
    S.recent = [q]
      .concat(
        (S.recent || []).filter(function (x) {
          return x !== q;
        })
      )
      .slice(0, 8);
    A.save();
  }
  A.acts['sr-f'] = function (el) {
    ST.f = el.dataset.f;
    A.$$('[data-a="sr-f"]').forEach(function (b) {
      b.setAttribute('aria-pressed', b === el);
    });
    A.N.haptic('tick');
    paint();
  };
  A.acts['sr-try'] = function (el) {
    var q = $('#q');
    if (!q) return;
    q.value = el.dataset.q;
    q.dispatchEvent(new Event('input'));
    ST.q = q.value;
    paint();
    q.focus();
  };
  A.acts['sr-clear'] = function () {
    var q = $('#q');
    if (!q) return;
    q.value = '';
    ST.q = '';
    $('#app').classList.remove('sr-has');
    paint();
    q.focus();
  };
  A.acts['sr-forget'] = function () {
    S.recent = [];
    A.save();
    paint();
  };
  A.acts['sr-open'] = function (el, e) {
    var x = ST.res && ST.res.list[+el.dataset.i];
    if (!x) return;
    remember(ST.q);
    var d = x.d;
    if (d.k === 'hadith' || d.k === 'quran') {
      if (e) e.preventDefault();
      A.sheet(
        d.t,
        A.said(d.key, '', true) +
          '<div class="refs" style="margin-top:12px"><a href="' +
          (d.k === 'quran' ? 'https://quran.com/' + d.key.slice(6).replace(':', '/') : 'https://sunnah.com/' + d.key) +
          '" data-a="ext">' +
          ic('link', 'xs') +
          esc(d.t) +
          (window.HADITH[d.key].g ? ' · ' + esc(window.HADITH[d.key].g) : '') +
          '</a></div>'
      );
      return;
    }
    if (d.act) {
      if (e) e.preventDefault();
      A.acts[d.act]();
      return;
    }
    if (d.flash)
      setTimeout(function () {
        /* land on the setting itself */
        var t = A.$$('.set .t').filter(function (n) {
            return n.textContent.trim() === d.flash;
          })[0],
          s = t && t.closest('.set');
        if (s) {
          s.scrollIntoView({ block: 'center', behavior: 'smooth' });
          s.classList.add('sr-flash');
          setTimeout(function () {
            s.classList.remove('sr-flash');
          }, 1800);
        }
      }, 380);
  };
})();
