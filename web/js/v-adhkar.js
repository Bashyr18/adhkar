/* Adhkār library · collections · search · saved · reader · share card. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    $$ = A.$$,
    esc = A.esc,
    ic = A.icon;

  function defaultPrayer() {
    var n = A.now();
    return n.cur && A.PRAYERS.indexOf(n.cur) >= 0 ? n.cur : 'fajr';
  }

  /* ================= library ================= */
  /* Feature-card scene. viewBox 180×200, horizon at y=116; the card anchors it to the bottom (xMidYMax slice) */
  var HZ = 116;
  function mosque(cx, b) {
    var d =
      'M' + (cx - 40) + ' ' + b + 'v-9h10v-3a7 7 0 0 1 14 0v3h' + 2 + 'v-6h' + 28 + 'v6h2v-3a7 7 0 0 1 14 0v3h10v9z';
    d += 'M' + (cx - 14) + ' ' + (b - 15) + 'c0-13 7-20 14-25 7 5 14 12 14 25z';
    d += 'M' + (cx - 0.7) + ' ' + (b - 40) + 'v-6h1.4v6z';
    [cx - 31, cx + 31].forEach(function (x) {
      d +=
        'M' + (x - 2.6) + ' ' + b + 'v-42h-1.4v-2.4h8v2.4h-1.4v42zM' + (x - 2.6) + ' ' + (b - 44.4) + 'l2.6-9 2.6 9z';
    });
    return d;
  }
  function roofs(seed, b) {
    var d = 'M0 ' + b,
      x = 0,
      r = seed;
    while (x < 180) {
      r = (r * 9301 + 49297) % 233280;
      var w = 7 + (r % 13),
        ht = 4 + ((r >> 4) % 12);
      d += 'V' + (b - ht) + 'H' + Math.min(180, x + w);
      x += w;
    }
    return d + 'V' + b + 'z';
  }
  function scene(id, dawn) {
    var g = 'fx' + id,
      sx = dawn ? 132 : 44,
      sy = dawn ? HZ - 60 : HZ + 6,
      mx = dawn ? 70 : 112;
    var sky = dawn
      ? [
          ['0', '#3f86cf'],
          ['.5', '#86bfea'],
          ['.84', '#f3e2bd'],
          ['1', '#ffd79c']
        ]
      : [
          ['0', '#060923'],
          ['.5', '#211a52'],
          ['.8', '#6a3064'],
          ['1', '#e0715a']
        ];
    var disc = dawn ? ['#ffffff', '#fff3c9', '#ffd889'] : ['#ffeede', '#ffae86', '#e2654f'];
    var s =
      '<svg class="scene" viewBox="0 0 180 ' + (HZ + 10) + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>' +
      '<linearGradient id="' +
      g +
      's" x1="0" y1="0" x2="0" y2="1">' +
      sky
        .map(function (q) {
          return '<stop offset="' + q[0] + '" stop-color="' + q[1] + '"/>';
        })
        .join('') +
      '</linearGradient>' +
      '<radialGradient id="' +
      g +
      'd"><stop offset="0" stop-color="' +
      disc[0] +
      '"/><stop offset=".6" stop-color="' +
      disc[1] +
      '"/><stop offset="1" stop-color="' +
      disc[2] +
      '"/></radialGradient>' +
      '<radialGradient id="' +
      g +
      'h"><stop offset="0" stop-color="' +
      disc[1] +
      '" stop-opacity=".75"/><stop offset=".35" stop-color="' +
      disc[2] +
      '" stop-opacity=".28"/><stop offset="1" stop-color="' +
      disc[2] +
      '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' +
      g +
      'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' +
      (dawn ? '#25395c' : '#1a1230') +
      '"/><stop offset="1" stop-color="#09081a"/></linearGradient>' +
      '<radialGradient id="' +
      g +
      'r" gradientUnits="userSpaceOnUse" cx="' +
      sx +
      '" cy="' +
      sy +
      '" r="92"><stop offset=".1" stop-color="#fff3da" stop-opacity=".55"/><stop offset="1" stop-color="#fff3da" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' +
      g +
      'l" gradientUnits="userSpaceOnUse" x1="' +
      (sx - 70) +
      '" x2="' +
      (sx + 70) +
      '"><stop offset="0" stop-color="' +
      disc[1] +
      '" stop-opacity="0"/><stop offset=".5" stop-color="' +
      disc[0] +
      '"/><stop offset="1" stop-color="' +
      disc[1] +
      '" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="' +
      g +
      'c"><rect width="180" height="' +
      HZ +
      '"/></clipPath>' +
      (dawn
        ? ''
        : '<radialGradient id="' +
          g +
          'n"><stop offset=".3" stop-color="#fde9c8" stop-opacity=".22"/><stop offset="1" stop-color="#fde9c8" stop-opacity="0"/></radialGradient><mask id="' +
          g +
          'm"><circle cx="112" cy="46" r="10" fill="#fff"/><circle cx="116.5" cy="42.5" r="8.6" fill="#000"/></mask>') +
      '</defs>';
    s += '<rect width="180" height="' + HZ + '" fill="url(#' + g + 's)"/>';
    if (!dawn)
      s +=
        '<g class="stars">' +
        [
          [20, 58],
          [48, 70],
          [78, 52],
          [30, 86],
          [150, 64],
          [64, 90],
          [166, 88],
          [138, 80],
          [12, 74]
        ]
          .map(function (q, n) {
            return (
              '<circle cx="' +
              q[0] +
              '" cy="' +
              q[1] +
              '" r="' +
              (n % 3 ? 0.7 : 1.1) +
              '" style="animation-delay:' +
              (-n * 0.7).toFixed(1) +
              's"/>'
            );
          })
          .join('') +
        '</g>' +
        '<g class="moon"><circle cx="112" cy="46" r="26" fill="url(#' +
        g +
        'n)"/><rect x="96" y="30" width="32" height="32" fill="#fdf0d4" mask="url(#' +
        g +
        'm)"/></g>';
    else
      s +=
        '<g class="clouds" fill="#fff"><g class="cl1"><ellipse cx="26" cy="86" rx="18" ry="5"/><ellipse cx="35" cy="81" rx="11" ry="6"/><ellipse cx="18" cy="83" rx="8" ry="4.5"/></g><g class="cl2"><ellipse cx="160" cy="92" rx="15" ry="4"/><ellipse cx="166" cy="88" rx="8" ry="4.5"/></g></g><g class="birds" fill="none" stroke="#2f4466" stroke-width="1.1" stroke-linecap="round"><path d="M98 62q3-3 6 0q3-3 6 0"/><path d="M114 72q2-2 4 0q2-2 4 0"/></g>';
    s +=
      '<g clip-path="url(#' +
      g +
      'c)"><g class="orb"><g class="rise">' +
      '<circle cx="' +
      sx +
      '" cy="' +
      sy +
      '" r="70" fill="url(#' +
      g +
      'h)"/>' +
      (dawn
        ? '<g class="rays" fill="url(#' +
          g +
          'r)" style="transform-origin:' +
          sx +
          'px ' +
          sy +
          'px">' +
          Array.apply(null, Array(12))
            .map(function (_, n) {
              var a = (n * 30 * Math.PI) / 180,
                a2 = a + 0.12;
              return (
                '<path d="M' +
                sx +
                ' ' +
                sy +
                'L' +
                (sx + 90 * Math.cos(a)).toFixed(1) +
                ' ' +
                (sy + 90 * Math.sin(a)).toFixed(1) +
                'L' +
                (sx + 90 * Math.cos(a2)).toFixed(1) +
                ' ' +
                (sy + 90 * Math.sin(a2)).toFixed(1) +
                'z"/>'
              );
            })
            .join('') +
          '</g>'
        : '') +
      '<circle cx="' +
      sx +
      '" cy="' +
      sy +
      '" r="16" fill="url(#' +
      g +
      'd)"/></g></g></g>';
    s += '<path class="far" d="' + roofs(dawn ? 7 : 31, HZ) + '"/>';
    s += '<rect y="' + HZ + '" width="180" height="' + (200 - HZ) + '" fill="url(#' + g + 'g)"/>';
    s += '<rect class="glint" x="0" y="' + (HZ - 0.4) + '" width="180" height="1.2" fill="url(#' + g + 'l)"/>';
    s += '<path class="near" d="' + mosque(mx, HZ + 0.5) + '"/>';
    return s + '</svg>';
  }
  var introDone = false; /* the sunrise and sunset play once a session, not on every visit */
  A.V.adhkar = function () {
    setTimeout(function () {
      introDone = true;
    }, 0);
    var k = A.today(),
      h =
        '<header class="top"><div class="tt"><div class="eyebrow">Remembrance for every moment</div><h1>Adhkār</h1></div><div class="acts"><a class="ib" href="#/saved" aria-label="Saved">' +
        ic('bookmark', 's') +
        (S.saved.length ? '<i class="dot"></i>' : '') +
        '</a></div></header>';
    h += '<a class="search" href="#/search">' + ic('search', 's') + '<span>Search duʿāʾ, hadith, the app</span></a>';
    var last = S.last;
    if (last && last.d === k && A.col(last.c)) {
      var lp = A.progress(k, last.c, last.p);
      if (!lp.complete && lp.started) {
        var lc = A.col(last.c);
        h +=
          '<a class="card focus press h-' +
          lc.hue +
          '" href="#/r/' +
          last.c +
          '/' +
          A.firstOpen(k, last.c, last.p) +
          (last.p ? '/' + last.p : '') +
          '">' +
          A.ring(lp.frac, 50, Math.round(lp.frac * 100) + '%', 'var(--h)', 3.6) +
          '<div class="grow"><div class="eyebrow" style="color:var(--h)">Continue</div><div class="ttl">' +
          esc(lc.title + (last.p ? ' · ' + P.NAMES[last.p] : '')) +
          '</div><div class="sub">' +
          lp.done +
          ' of ' +
          lp.total +
          ' complete</div></div><span class="go">' +
          ic('play', 's fill') +
          '</span></a>';
      }
    }
    /* Morning and Evening: an illustrated scene (sky, sun or moon, mosque skyline) above a dark ground the text sits on */
    h +=
      '<div class="grid2">' +
      ['morning', 'evening']
        .map(function (id) {
          var c = A.col(id),
            p = A.progress(k, id),
            dawn = id === 'morning';
          return (
            '<a class="feature ' +
            (dawn ? 'dawn' : 'dusk') +
            (introDone ? '' : ' intro') +
            (p.complete ? ' complete' : '') +
            (A.sessionNow() === id ? ' now' : '') +
            '" href="#/c/' +
            id +
            '">' +
            scene(id, dawn) +
            '<div class="top2">' +
            (A.sessionNow() === id && !p.complete ? '<span class="fnow"><i></i>Now</span>' : '<span></span>') +
            '<span class="fpct">' +
            (p.complete ? ic('check', 'xs') : Math.round(p.frac * 100) + '%') +
            '</span></div>' +
            '<div class="fbody"><div class="arT" lang="ar">' +
            c.ar +
            '</div><div class="t">' +
            c.title +
            '</div><div class="s">' +
            (p.complete
              ? 'Complete · mā shāʾ Allāh'
              : p.started
                ? p.done + ' of ' + p.total + ' · continue'
                : p.total + ' adhkār · ~' + A.estimate(id) + ' min') +
            '</div><div class="fbar"><i style="width:' +
            (p.frac * 100).toFixed(1) +
            '%"></i></div></div></a>'
          );
        })
        .join('') +
      '</div>';
    h += '<div class="sec"><h2>Collections</h2></div><div class="col">';
    A.COLS.forEach(function (c) {
      if (c.id === 'morning' || c.id === 'evening') return;
      var pr = c.perPrayer ? defaultPrayer() : null,
        p = A.progress(k, c.id, pr),
        dd = A.dayDone(k);
      /* progress sits under the title (five dots for the prayers, a slim bar for a session); every row ends in a chevron */
      var prog = c.perPrayer
        ? '<div class="dots5" aria-label="' +
          A.PRAYERS.filter(function (x) {
            return dd.salah[x];
          }).length +
          ' of 5 today">' +
          A.PRAYERS.map(function (x) {
            return '<i class="' + (dd.salah[x] ? 'on' : '') + '"></i>';
          }).join('') +
          '</div>'
        : c.track && p.done
          ? '<div class="cbar' +
            (p.complete ? ' done' : '') +
            '"><i style="width:' +
            (p.frac * 100).toFixed(0) +
            '%"></i></div>'
          : '';
      h +=
        '<a class="card coll press h-' +
        c.hue +
        '" href="#/c/' +
        c.id +
        (pr ? '/' + pr : '') +
        '"><div class="badge">' +
        ic(p.complete && c.track ? 'check' : c.icon) +
        '</div><div class="grow"><div class="t">' +
        esc(c.title) +
        '</div><div class="s">' +
        esc(c.sub) +
        ' · ' +
        A.items(c.id, pr).length +
        '</div>' +
        prog +
        '</div><span class="faint">' +
        ic('right', 's') +
        '</span></a>';
    });
    h += '</div>';
    h +=
      '<div class="sec"><h2>Virtues</h2></div><div class="grid2"><a class="card vcard press h-night" href="#/answered"><span class="badge">' +
      ic('hands') +
      '</span><div><div class="t">When duʿāʾ is answered</div><div class="s">Live times from the Sunnah</div></div></a><a class="card vcard press h-rose" href="#/deeds"><span class="badge">' +
      ic('heart') +
      '</span><div><div class="t">Small deeds</div><div class="s">Light acts, heavy rewards</div></div></a></div>';
    return { html: h, title: 'Adhkār', tab: 1 };
  };

  /* ================= collection ================= */
  A.V.c = function (a) {
    var cid = a[0],
      c = A.col(cid);
    if (!c) return { redirect: '#/adhkar' };
    var prayer = c.perPrayer ? (A.PRAYERS.indexOf(a[1]) >= 0 ? a[1] : defaultPrayer()) : null;
    var k = A.today(),
      p = A.progress(k, cid, prayer),
      ck = p.ck,
      items = p.items;
    var h = A.back('Adhkār', '#/adhkar');
    h +=
      '<section class="chead h-' +
      c.hue +
      '"><div class="arT">' +
      c.ar +
      '</div><h1>' +
      esc(c.title) +
      '</h1><div class="s">' +
      esc(c.sub) +
      '</div>';
    h +=
      '<div class="stats"><span>' +
      A.plural(items.length, 'item') +
      '</span><span>~' +
      A.estimate(cid, prayer) +
      ' min</span>' +
      (c.track ? '<span>' + p.done + '/' + p.total + ' done</span>' : '') +
      (function () {
        var m = items.filter(function (it) {
          return S.memo[it.uid];
        }).length;
        return m ? '<span>' + m + ' known by heart</span>' : '';
      })() +
      '</div>';
    if (c.track) h += '<div class="bar"><i style="width:' + (p.frac * 100).toFixed(1) + '%"></i></div>';
    h += '</section>';
    var when = A.timeNote(cid, prayer);
    if (when) h += '<div class="rd-note when-note">' + ic('clock', 's') + '<div>' + esc(when) + '</div></div>';
    if (c.perPrayer) {
      var dd = A.dayDone(k);
      h +=
        '<div class="seg" role="group" aria-label="Prayer">' +
        A.PRAYERS.map(function (x) {
          return (
            '<button type="button" data-a="nav" data-href="#/c/salah/' +
            x +
            '" aria-pressed="' +
            (x === prayer) +
            '">' +
            (dd.salah[x] ? '<i class="ok"></i>' : '') +
            P.NAMES[x] +
            '</button>'
          );
        }).join('') +
        '</div>';
    }
    var first = A.firstOpen(k, cid, prayer);
    h +=
      '<div class="row"><a class="btn pri grow" href="#/r/' +
      cid +
      '/' +
      first +
      (prayer ? '/' + prayer : '') +
      '">' +
      ic('play', 's fill') +
      (p.complete ? 'Read again' : p.started ? 'Continue' : 'Begin') +
      '</a><button type="button" class="ib" data-a="col-share" data-c="' +
      cid +
      '" data-p="' +
      (prayer || '') +
      '" aria-label="Share collection" style="width:50px;height:50px">' +
      ic('share', 's') +
      '</button>' +
      (p.started
        ? '<button type="button" class="ib" data-a="col-reset" data-c="' +
          cid +
          '" data-p="' +
          (prayer || '') +
          '" aria-label="Reset today" style="width:50px;height:50px">' +
          ic('reset', 's') +
          '</button>'
        : '') +
      '</div>';
    h +=
      '<div class="card pad0 h-' +
      c.hue +
      '"><div class="list">' +
      items
        .map(function (it, i) {
          var n = A.cnt(k, ck, it.id),
            done = it.kind !== 'open' && n >= it.target;
          var x =
            it.kind === 'flag'
              ? done
                ? ic('check', 's')
                : ''
              : it.kind === 'open'
                ? n
                  ? A.fmtN(n)
                  : '∞'
                : (n && !done ? n + '/' : '') + '×' + it.target;
          return (
            '<a class="li' +
            (done ? ' done' : '') +
            '" href="#/r/' +
            cid +
            '/' +
            i +
            (prayer ? '/' + prayer : '') +
            '"><span class="n">' +
            (done ? ic('check', 'xs') : i + 1) +
            '</span><div class="grow"><div class="t clamp1">' +
            esc(it.title) +
            '</div><div class="s clamp1">' +
            esc(it.tag || '') +
            (it.only
              ? ' · ' +
                it.only
                  .map(function (o) {
                    return P.NAMES[o];
                  })
                  .join(' & ') +
                ' only'
              : '') +
            '</div></div><span class="x">' +
            x +
            '</span></a>'
          );
        })
        .join('') +
      '</div></div>';
    if (cid === 'night')
      h +=
        '<a class="card coll press h-night" href="#/night"><div class="badge">' +
        ic('moon') +
        '</div><div class="grow"><div class="t">Tonight’s qiyām</div><div class="s">Last third, alarm and your night log</div></div>' +
        ic('right', 's') +
        '</a>';
    return { html: h, title: c.title, tab: 1 };
  };
  A.acts.nav = function (el) {
    A.N.haptic('tick');
    A.go(el.dataset.href, true);
  };
  A.acts['col-reset'] = function (el) {
    var cid = el.dataset.c,
      pr = el.dataset.p || null,
      ck = A.colKey(cid, pr),
      k = A.today();
    A.confirm(
      'Reset today’s progress?',
      'Counts for ' + A.col(cid).title + (pr ? ' · ' + P.NAMES[pr] : '') + ' today will be cleared.',
      'Reset',
      function () {
        A.items(cid, pr).forEach(function (it) {
          delete S.counts[k + '|' + ck + '|' + it.id];
        });
        delete S.done[k + '|' + ck];
        A.save();
        A.rerender();
        A.toast('Progress reset');
      },
      true
    );
  };
  A.acts['col-share'] = function (el) {
    var cid = el.dataset.c,
      pr = el.dataset.p || null,
      c = A.col(cid);
    A.N.share(shareText(A.items(cid, pr), c.title + (pr ? ' · after ' + P.NAMES[pr] : '')));
  };

  /* ================= saved ================= */
  A.V.saved = function () {
    var h =
      A.back('Adhkār', '#/adhkar') +
      '<header class="top"><div class="tt"><div class="eyebrow">Your collection</div><h1>Saved</h1></div></header>';
    var rows = S.saved
      .map(function (key) {
        var p = key.split('|'),
          c = A.col(p[0]);
        if (!c) return '';
        var items = A.items(c.id, 'fajr'),
          i = items.findIndex(function (x) {
            return x.id === p[1];
          });
        if (i < 0) return '';
        return (
          '<a class="li h-' +
          c.hue +
          '" href="#/r/' +
          c.id +
          '/' +
          i +
          (c.perPrayer ? '/fajr' : '') +
          '"><span class="badge s">' +
          ic(c.icon, 's') +
          '</span><div class="grow"><div class="t clamp1">' +
          esc(items[i].title) +
          '</div><div class="s clamp1">' +
          esc(c.title) +
          '</div></div>' +
          ic('right', 's') +
          '</a>'
        );
      })
      .filter(Boolean);
    h += rows.length
      ? '<div class="card pad0"><div class="list">' + rows.join('') + '</div></div>'
      : '<div class="empty"><div class="badge h-gold">' +
        ic('bookmark') +
        '</div><h3>Nothing saved yet</h3><p>Tap the bookmark in the reader to keep a duʿāʾ close.</p></div>';
    return { html: h, title: 'Saved', tab: 1 };
  };

  /* ================= share ================= */
  function shareText(items, heading) {
    var head = (heading ? '*' + heading + '*' : '') + (heading ? ' · ' + A.hijriText(A.today()) : '');
    var body = items
      .map(function (x, i) {
        var parts = [
          (items.length > 1 ? i + 1 + '. ' : '') + x.title + (x.target > 1 ? '  (×' + x.target + ')' : ''),
          x.ar
        ];
        if (S.prefs.tr && x.tr) parts.push('_' + x.tr + '_');
        if (x.en) parts.push('“' + x.en + '”');
        if (x.refs && x.refs.length)
          parts.push(
            'Source: ' +
              x.refs
                .map(function (r) {
                  return r.l;
                })
                .join(' · ')
          );
        return parts.join('\n\n');
      })
      .join('\n\n───\n\n');
    return (head ? head + '\n\n' : '') + body + '\n\nShared from Adhkār';
  }
  A.shareText = shareText;

  /* Share image. fmt 'status' = 1080×1920 (WhatsApp status), 'post' = 1080×1350. The Arabic is sized to fill its
     space evenly, then the translation; the block is centred between a quiet header and footer. */
  A.shareCard = function (it, colTitle, hue, fmt) {
    var W = 1080,
      H = fmt === 'post' ? 1350 : 1920,
      cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var g = cv.getContext('2d'),
      c = A.HUES[hue === 'gold' ? 'goldh' : hue] || A.HUES.gold,
      gold = '#f1d59e';
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0d1b');
    bg.addColorStop(0.55, '#10142a');
    bg.addColorStop(1, '#171328');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    var gl = g.createRadialGradient(W / 2, H * 0.18, 0, W / 2, H * 0.18, W * 0.95);
    gl.addColorStop(0, hexA(c[1], 0.32));
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(241,213,158,.05)';
    g.lineWidth = 1.4;
    for (var y = -40; y < H + 60; y += 96)
      for (var x = -40; x < W + 60; x += 96) {
        star(g, x, y, 34, 25);
        g.stroke();
      }
    var M = 56;
    g.strokeStyle = hexA(c[0], 0.35);
    g.lineWidth = 2;
    roundRect(g, M, M, W - 2 * M, H - 2 * M, 48);
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    /* header: an eight-point star, the collection, today's date */
    var hy = fmt === 'post' ? 150 : 210;
    g.fillStyle = hexA(c[0], 0.9);
    star(g, W / 2, hy - 64, 18, 13);
    g.fill();
    g.font = '700 28px Quicksand';
    g.fillStyle = hexA(c[0], 0.95);
    g.fillText(
      String(colTitle || 'Adhkār')
        .toUpperCase()
        .split('')
        .join(String.fromCharCode(8202)),
      W / 2,
      hy
    );
    g.font = '600 26px Quicksand';
    g.fillStyle = 'rgba(245,240,231,.5)';
    g.fillText(A.hijriText(A.today()), W / 2, hy + 46);
    /* body: fit the Arabic, then the translation, into the space between header and footer */
    var top = hy + 110,
      bottom = H - (fmt === 'post' ? 210 : 290),
      area = bottom - top,
      tw = W - 2 * M - 120;
    var ar = it.ar.replace(/\n/g, ' '),
      en = it.en || '',
      af = it.quran ? '"Amiri Quran"' : 'Amiri',
      aS,
      aL,
      eS,
      eL;
    g.direction = 'rtl';
    for (aS = 92; aS >= 34; aS -= 2) {
      g.font = '400 ' + aS + 'px ' + af;
      aL = wrap(g, ar, tw);
      if (aL.length * aS * 1.85 <= area * (en ? 0.6 : 0.9)) break;
    }
    g.direction = 'ltr';
    var left = area - aL.length * aS * 1.85 - 90;
    for (eS = 38; eS >= 24; eS -= 2) {
      g.font = '500 ' + eS + 'px Quicksand';
      eL = en ? wrap(g, '“' + en + '”', tw) : [];
      if (eL.length * eS * 1.5 <= left) break;
    }
    var maxE = Math.max(0, Math.floor(left / (eS * 1.5)));
    if (eL.length > maxE) {
      eL = eL.slice(0, maxE);
      if (eL.length) eL[eL.length - 1] = eL[eL.length - 1].replace(/\s*\S*$/, '…');
    }
    var block = aL.length * aS * 1.85 + (eL.length ? 90 + eL.length * eS * 1.5 : 0),
      y0 = top + (area - block) / 2;
    g.direction = 'rtl';
    g.font = '400 ' + aS + 'px ' + af;
    g.fillStyle = '#f7f1e6';
    aL.forEach(function (l, i) {
      g.fillText(l, W / 2, y0 + i * aS * 1.85 + aS * 1.25);
    });
    g.direction = 'ltr';
    if (eL.length) {
      var oy = y0 + aL.length * aS * 1.85 + 40;
      g.strokeStyle = hexA(c[0], 0.55);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(W / 2 - 90, oy);
      g.lineTo(W / 2 - 16, oy);
      g.moveTo(W / 2 + 16, oy);
      g.lineTo(W / 2 + 90, oy);
      g.stroke();
      g.fillStyle = hexA(c[0], 0.85);
      g.beginPath();
      g.moveTo(W / 2, oy - 8);
      g.lineTo(W / 2 + 8, oy);
      g.lineTo(W / 2, oy + 8);
      g.lineTo(W / 2 - 8, oy);
      g.closePath();
      g.fill();
      g.font = '500 ' + eS + 'px Quicksand';
      g.fillStyle = 'rgba(245,240,231,.82)';
      eL.forEach(function (l, i) {
        g.fillText(l, W / 2, oy + 50 + i * eS * 1.5 + eS * 0.8);
      });
    }
    /* footer: source and a quiet signature */
    var fy = H - (fmt === 'post' ? 140 : 200);
    if (it.refs && it.refs[0]) {
      g.font = '700 26px Quicksand';
      g.fillStyle = hexA(c[0], 0.9);
      g.fillText(it.refs[0].l + (it.target > 1 ? '  ·  ×' + it.target : ''), W / 2, fy);
    }
    g.font = '700 22px Quicksand';
    g.fillStyle = 'rgba(245,240,231,.4)';
    g.fillText('ADHKĀR'.split('').join(String.fromCharCode(8202)), W / 2, fy + 52);
    return cv.toDataURL('image/png');
  };
  /* the share sheet: status or post, image or text */
  A.openShare = function (it, c) {
    var fmt = 'status',
      url = null;
    A.sheet(
      'Share',
      '<div class="seg sm sh-fmt"><button type="button" data-fmt="status" aria-pressed="true">Status</button><button type="button" data-fmt="post" aria-pressed="false">Post</button></div><div class="shareprev"><img id="shc" alt=""></div><div class="grid2"><button type="button" class="btn pri" data-sh="img">' +
        ic('share', 's') +
        'Share image</button><button type="button" class="btn sec" data-sh="txt">' +
        ic('copy', 's') +
        'Share text</button></div><button type="button" class="btn ghost" data-sh="ar">Copy the Arabic</button>',
      {
        mount: function (sh, o) {
          var draw = function () {
            document.fonts.ready.then(function () {
              url = A.shareCard(it, c.title, c.hue, fmt);
              var im = $('#shc', sh);
              if (im) {
                im.src = url;
                im.className = fmt;
              }
            });
          };
          draw();
          sh.addEventListener('click', function (e) {
            var f = e.target.closest('[data-fmt]');
            if (f) {
              fmt = f.dataset.fmt;
              Array.prototype.forEach.call(sh.querySelectorAll('[data-fmt]'), function (x) {
                x.setAttribute('aria-pressed', x === f);
              });
              A.N.haptic('tick');
              draw();
              return;
            }
            var b = e.target.closest('[data-sh]');
            if (!b) return;
            if (b.dataset.sh === 'img') {
              if (url) A.N.shareImage(url, it.title);
            } else if (b.dataset.sh === 'txt') A.N.share(shareText([it], c.title));
            else {
              A.copy(it.ar);
              A.toast('Arabic copied', 'copy');
            }
            o.close();
          });
        }
      }
    );
  };
  function hexA(h, a) {
    var r = parseInt(h.slice(1, 3), 16),
      g = parseInt(h.slice(3, 5), 16),
      b = parseInt(h.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function star(g, cx, cy, R, r) {
    g.beginPath();
    for (var i = 0; i < 16; i++) {
      var a = (Math.PI / 8) * i - Math.PI / 2,
        rr = i % 2 ? r : R;
      g[i ? 'lineTo' : 'moveTo'](cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    g.closePath();
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function wrap(g, text, max) {
    var words = text.split(/\s+/),
      lines = [],
      line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > max && line) {
        lines.push(line);
        line = w;
      } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }

  /* Qurʾān passage in Muṣḥaf style: Bismillah as its own header line, āyāt flowing with numbered end-markers. */
  var AD = '٠١٢٣٤٥٦٧٨٩';
  A.mushaf = function (segs, tap) {
    return (
      '<div class="mushaf' +
      (tap ? ' tapzone' : '') +
      '" lang="ar" dir="rtl"' +
      (tap ? ' data-a="rd-tap"' : '') +
      '>' +
      segs
        .map(function (g) {
          return (
            (g.bsm ? '<div class="bsm">' + esc(window.DATA.basmala) + '</div>' : '') +
            '<p class="ayat">' +
            g.v
              .map(function (v) {
                return (
                  '<span class="ay">' +
                  esc(v[1]) +
                  '</span> <span class="am" aria-label="āyah ' +
                  v[0] +
                  '">۝' +
                  String(v[0])
                    .split('')
                    .map(function (d) {
                      return AD[+d];
                    })
                    .join('') +
                  '</span> '
                );
              })
              .join('') +
            '</p>'
          );
        })
        .join('<div class="sura-gap"></div>') +
      '</div>'
    );
  };

  /* ================= reader ================= */
  var R = null;
  A.readerOpen = function () {
    return !!R;
  };
  A.openReader = function (cid, idx, prayer) {
    var c = A.col(cid);
    if (!c) return;
    prayer = c.perPrayer ? (A.PRAYERS.indexOf(prayer) >= 0 ? prayer : 'fajr') : null;
    var dir = 0;
    /* a reader left open past midnight starts afresh, so counts land on the new day */
    if (R && R.cid === cid && R.prayer === prayer && R.date === A.today()) {
      if (S.prefs.wake) A.N.keepAwake(true);
      if (S.prefs.volKeys && !A.pace.on()) A.N.volumeKeys(true);
      dir = idx > R.idx ? 1 : idx < R.idx ? -1 : 0;
      R.idx = A.clamp(idx, 0, R.items.length - 1);
      R.finished = false;
      paintPage(dir);
      return;
    }
    if (R) A.closeReader(true);
    var items = A.items(cid, prayer);
    R = {
      cid: cid,
      c: c,
      prayer: prayer,
      items: items,
      ck: A.colKey(cid, prayer),
      date: A.today(),
      idx: A.clamp(idx, 0, items.length - 1),
      t0: Date.now()
    };
    S.last = { c: cid, p: prayer, d: R.date };
    A.save();
    var el = document.createElement('div');
    el.className = 'reader h-' + c.hue;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', c.title);
    el.innerHTML =
      '<div class="rd-top"><button type="button" class="ib ghost" data-a="rd-close" aria-label="Close">' +
      ic('close') +
      '</button><div class="ttl" id="rdT"></div><button type="button" class="ib ghost" data-a="rd-menu" aria-label="Reading options">' +
      ic('text') +
      '</button></div><div class="stories" id="rdS"></div><div class="rd-body" id="rdB"></div><div class="rd-dock" id="rdD"></div>';
    document.body.appendChild(el);
    R.el = el;
    document.body.style.overflow = 'hidden';
    $('.nav').classList.add('hide');
    if (S.prefs.wake) A.N.keepAwake(true);
    if (S.prefs.volKeys && !A.pace.on()) A.N.volumeKeys(true);
    bindGestures(el);
    paintPage(0);
  };
  A.closeReader = function (instant) {
    if (!R) return;
    var el = R.el;
    R = null;
    document.body.style.overflow = '';
    var v = A.cur();
    if (!v || !v.bare) $('.nav').classList.remove('hide');
    A.N.keepAwake(false);
    A.N.volumeKeys(false);
    if (A.audio) A.audio.stop();
    if (instant) el.remove();
    else {
      el.classList.add('out');
      setTimeout(function () {
        el.remove();
      }, 280);
    }
  };
  A.acts['rd-close'] = function () {
    A.goBack('#/c/' + R.cid + (R.prayer ? '/' + R.prayer : ''));
  };

  function stories() {
    return R.items
      .map(function (it, i) {
        var n = A.cnt(R.date, R.ck, it.id),
          f = it.kind === 'open' ? (n ? 1 : 0) : Math.min(1, n / it.target);
        return '<i class="' + (i === R.idx ? 'cur' : '') + '"><b style="--p:' + f.toFixed(3) + '"></b></i>';
      })
      .join('');
  }
  function paintPage(dir) {
    if (A.pace) A.pace.stop();
    var it = R.items[R.idx],
      n = A.cnt(R.date, R.ck, it.id);
    $('#rdT').innerHTML =
      esc(R.c.title + (R.prayer ? ' · ' + P.NAMES[R.prayer] : '')) +
      ' <span class="faint">· ' +
      (R.idx + 1) +
      '/' +
      R.items.length +
      '</span>';
    $('#rdS').innerHTML = stories();
    var saved = A.isSaved(R.cid, it.id);
    var h = '<div class="rd-page' + (dir > 0 ? ' slide-l' : dir < 0 ? ' slide-r' : '') + '">';
    h +=
      '<div class="rd-head"><div class="grow"><div class="k">' +
      esc(it.tag || R.c.title) +
      (it.target > 1 ? ' · ×' + it.target : '') +
      '</div><h2>' +
      esc(it.title) +
      '</h2></div><button type="button" class="ib" data-a="rd-save" aria-pressed="' +
      saved +
      '" aria-label="Save">' +
      (saved
        ? '<svg class="ic s" viewBox="0 0 24 24"><path d="M6.5 3.5h11v17L12 16.5l-5.5 4z" fill="currentColor" stroke="currentColor"/></svg>'
        : ic('bookmark', 's')) +
      '</button><button type="button" class="ib" data-a="rd-share" aria-label="Share">' +
      ic('share', 's') +
      '</button>' +
      (it.kind !== 'flag' && it.ar && it.ar.length > 12
        ? '<button type="button" class="ib' +
          (R.memo || R.memoOpen ? ' on' : '') +
          '" data-a="memo-open" aria-pressed="' +
          !!(R.memo || R.memoOpen) +
          '" aria-label="Memorise">' +
          ic('eye', 's') +
          '</button>'
        : '') +
      '</div>';
    var tap = S.prefs.tapText && !A.pace.on() && it.kind !== 'flag' && !R.memo;
    var learnable = it.kind !== 'flag' && it.ar && it.ar.length > 12;
    if (learnable && (R.memo || R.memoOpen))
      h +=
        '<div class="memo-bar"><span class="faint small">' +
        (S.memo[it.uid] ? ic('check', 'xs') + 'Known by heart' : 'Memorise') +
        '</span><div class="seg sm">' +
        ['Off', 'Some', 'Half', 'All']
          .map(function (l, i) {
            return (
              '<button type="button" data-a="memo" data-v="' +
              i +
              '" aria-pressed="' +
              ((R.memo || 0) === i) +
              '">' +
              l +
              '</button>'
            );
          })
          .join('') +
        '</div></div>';
    h +=
      R.memo && learnable
        ? memoText(it, R.memo)
        : it.qs
          ? A.mushaf(it.qs, tap)
          : '<div class="rd-ar ar' +
            (it.long ? ' long' : '') +
            (tap ? ' tapzone' : '') +
            '" lang="ar"' +
            (tap ? ' data-a="rd-tap"' : '') +
            '>' +
            esc(it.ar) +
            '</div>';
    if (A.audio) {
      A.audio.attach(it);
      h += A.audio.bar(it, R.cid);
    }
    if (it.note) h += '<div class="rd-note">' + ic('info', 's') + '<div>' + esc(it.note) + '</div></div>';
    h += A.txSections(it);
    if (it.refs && it.refs.length)
      h +=
        '<div class="rd-sec"><div class="eyebrow">Sources</div><div class="refs">' +
        it.refs
          .map(function (r) {
            return '<a href="' + esc(r.u) + '" data-a="ext">' + ic('link', 'xs') + esc(r.l) + '</a>';
          })
          .join('') +
        '</div></div>';
    h += '<div style="height:12px"></div></div>';
    var body = $('#rdB');
    body.innerHTML = h;
    body.scrollTop = 0;
    paintDock(it, n);
  }
  /* memorise: words fade in three steps; tap a hidden word to peek */
  function memoText(it, lv) {
    var w = 0,
      out = it.ar
        .split(/(\s+)/)
        .map(function (tok) {
          if (!tok.trim()) return tok;
          var mark = /[۝٠-٩0-9]/.test(tok) || tok.length < 2,
            i = w++;
          var hide = !mark && (lv === 3 || (lv === 2 && i % 2 === 1) || (lv === 1 && i % 3 === 1));
          return hide
            ? '<span class="mw" data-a="memo-peek" role="button" aria-label="Hidden word, tap to reveal">' +
                esc(tok) +
                '</span>'
            : esc(tok);
        })
        .join('');
    return (
      '<div class="rd-ar ar memo" lang="ar">' +
      out.replace(/\n/g, '<br>') +
      '</div>' +
      (lv === 3
        ? '<button type="button" class="btn ' +
          (S.memo[it.uid] ? 'sec' : 'pri') +
          ' wide memo-done" data-a="memo-known">' +
          ic('check', 's') +
          (S.memo[it.uid] ? 'Known by heart · undo' : 'I know it by heart') +
          '</button>'
        : '')
    );
  }
  A.acts.memo = function (el) {
    R.memo = +el.dataset.v;
    if (!R.memo) R.memoOpen = false;
    A.N.haptic('tick');
    paintPage(0);
  };
  A.acts['memo-open'] = function () {
    R.memoOpen = !(R.memo || R.memoOpen);
    if (!R.memoOpen) R.memo = 0;
    A.N.haptic('tick');
    paintPage(0);
  };
  A.acts['memo-peek'] = function (el) {
    el.classList.add('seen');
    A.N.haptic('tick');
  };
  A.acts['memo-known'] = function () {
    var it = R.items[R.idx];
    if (S.memo[it.uid]) delete S.memo[it.uid];
    else {
      S.memo[it.uid] = A.today();
      A.fx.done();
      A.N.haptic('success');
      A.toast('Mā shāʾ Allāh. Marked as known by heart.', 'check');
    }
    A.save();
    paintPage(0);
  };
  function paintDock(it, n) {
    if (A.pace.on())
      A.hint(
        'fingers',
        'Count on the fingers of your right hand. The circle keeps the pace, then tap it to confirm.',
        'hands'
      );
    else A.hint('reader', 'Tap the circle to count · swipe for the next', 'hands');
    var d = $('#rdD'),
      h =
        '<button type="button" class="ib" data-a="rd-prev" aria-label="Previous"' +
        (R.idx === 0 ? ' disabled style="opacity:.35"' : '') +
        '>' +
        ic('left') +
        '</button>';
    if (it.kind === 'flag') {
      var on = n >= 1;
      h +=
        '<button type="button" class="btn ' +
        (on ? 'sec' : 'pri') +
        ' flagbtn" data-a="rd-flag">' +
        ic('check', 's') +
        (on ? 'Done · undo' : 'Mark as done') +
        '</button>';
    } else if (A.pace.on()) {
      var pt = it.target || 1;
      h += A.pace.button(it, pt, n >= pt);
    } else {
      var t = it.target,
        f = t ? Math.min(1, n / t) : n ? 1 : 0,
        r = 57,
        c = 2 * Math.PI * r,
        done = t && n >= t,
        ticks = '';
      for (var q = 0; q < 48; q++) {
        var an = (q * Math.PI) / 24 - Math.PI / 2,
          lit = q / 48 < f;
        ticks +=
          '<line class="tick' +
          (lit ? ' on' : '') +
          '" x1="' +
          (62 + 60.5 * Math.cos(an)).toFixed(2) +
          '" y1="' +
          (62 + 60.5 * Math.sin(an)).toFixed(2) +
          '" x2="' +
          (62 + (q % 4 ? 62.5 : 63.5) * Math.cos(an)).toFixed(2) +
          '" y2="' +
          (62 + (q % 4 ? 62.5 : 63.5) * Math.sin(an)).toFixed(2) +
          '"/>';
      }
      h +=
        '<button type="button" class="counter' +
        (done ? ' done' : '') +
        '" data-a="rd-count" aria-label="Count. ' +
        n +
        (t ? ' of ' + t : '') +
        '"><i class="halo" aria-hidden="true"></i><svg viewBox="0 0 124 124" aria-hidden="true"><defs><linearGradient id="ctrG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--h)" stop-opacity=".55"/><stop offset="1" stop-color="var(--h)"/></linearGradient></defs>' +
        ticks +
        '<circle class="tr" cx="62" cy="62" r="' +
        r +
        '" fill="none" stroke-width="2.5"/><circle class="pr" cx="62" cy="62" r="' +
        r +
        '" fill="none" stroke="url(#ctrG)" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="' +
        c.toFixed(1) +
        '" stroke-dashoffset="' +
        (c * (1 - f)).toFixed(1) +
        '"/></svg><i class="rip"></i><div class="face"><div class="c num">' +
        (done
          ? '<svg class="ic l" viewBox="0 0 24 24" style="width:40px;height:40px;stroke-width:2"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
          : n) +
        '</div><div class="of">' +
        (t ? (done ? 'DONE' : 'OF ' + t) : 'TAP') +
        '</div></div></button>';
    }
    h += '<button type="button" class="ib" data-a="rd-next" aria-label="Next">' + ic('right') + '</button>';
    d.innerHTML = h;
    var pb = $('.pace', d);
    if (pb) {
      A.pace.bind(pb, {
        it: it,
        n: it.target || 1,
        onDone: function () {
          complete(it);
        },
        onUndo: function () {
          A.confirm('Recite it again?', 'Its count for today goes back to zero.', 'Again', function () {
            A.setCnt(R.date, R.ck, it.id, 0);
            $('#rdS').innerHTML = stories();
            paintDock(it, 0);
          });
        }
      });
      A.pace.longPress(pb);
      A.knob(pb);
    } else {
      bindLongPress($('.counter', d));
      A.knob($('.counter', d));
    }
    A.knob($('.flagbtn', d));
  }
  function bump(delta) {
    if (!R || R.finished) return;
    var it = R.items[R.idx];
    if (it.kind === 'flag' && delta > 0) return;
    var n = A.cnt(R.date, R.ck, it.id),
      t = it.target;
    if (delta > 0 && t && n >= t) {
      next();
      return;
    }
    var m = Math.max(0, n + delta);
    if (t) m = Math.min(m, t);
    var res = A.setCnt(R.date, R.ck, it.id, m);
    if (delta > 0) {
      var rip = $('.counter .rip', R.el);
      if (rip) {
        rip.classList.remove('go');
        void rip.offsetWidth;
        rip.classList.add('go');
      }
    }
    var reached = t && m >= t && n < t;
    if (reached)
      setTimeout(function () {
        var cb = $('.counter', R && R.el);
        if (cb) cb.classList.add('burst');
      }, 10);
    /* haptic rhythm: a tick per count, a firmer beat at every 33 on long counts, a flourish on completion */
    A.N.haptic(reached ? 'success' : delta > 0 && t >= 99 && m % 33 === 0 ? 'click' : delta > 0 ? 'tick' : 'click');
    if (reached) A.fx.done();
    else if (delta > 0) A.fx.click();
    $('#rdS').innerHTML = stories();
    paintDock(it, m);
    if (res.completed) {
      setTimeout(finish, 520);
      return;
    }
    if (reached && S.prefs.autoNext) {
      var idx = R.idx;
      setTimeout(function () {
        if (R && R.idx === idx) next();
      }, 480);
    }
  }
  /* counted on the fingers and confirmed: the whole count is recorded at once */
  function complete(it) {
    if (!R || R.finished) return;
    var t = it.target || 1,
      res = A.setCnt(R.date, R.ck, it.id, t);
    A.fx.done();
    $('#rdS').innerHTML = stories();
    paintDock(it, t);
    var cb = $('.counter', R.el);
    if (cb) cb.classList.add('burst');
    if (res.completed) {
      setTimeout(finish, 520);
      return;
    }
    if (S.prefs.autoNext) {
      var idx = R.idx;
      setTimeout(function () {
        if (R && R.idx === idx) next();
      }, 520);
    }
  }
  function next() {
    if (!R || R.finished) return;
    if (R.idx < R.items.length - 1) {
      A.N.haptic('tick');
      A.go(hashFor(R.idx + 1), true);
    } else if (A.progress(R.date, R.cid, R.prayer).complete || !R.c.track) finish();
    else {
      var fo = A.firstOpen(R.date, R.cid, R.prayer);
      A.toast('Some remembrances are still open');
      A.go(hashFor(fo), true);
    }
  }
  function prev() {
    if (R && R.idx > 0) {
      A.N.haptic('tick');
      A.go(hashFor(R.idx - 1), true);
    }
  }
  function hashFor(i) {
    return '#/r/' + R.cid + '/' + i + (R.prayer ? '/' + R.prayer : '');
  }
  A.acts['rd-count'] = function () {
    if (R && R.longFired) {
      R.longFired = false;
      return;
    }
    bump(1);
  };
  A.acts['rd-tap'] = function () {
    if (!A.pace.on()) bump(1);
  };
  A.acts['rd-next'] = next;
  A.acts['rd-prev'] = prev;
  A.acts['rd-flag'] = function () {
    var it = R.items[R.idx],
      n = A.cnt(R.date, R.ck, it.id),
      res = A.setCnt(R.date, R.ck, it.id, n ? 0 : 1);
    A.N.haptic(n ? 'click' : 'success');
    $('#rdS').innerHTML = stories();
    paintDock(it, n ? 0 : 1);
    if (res.completed) setTimeout(finish, 450);
    else if (!n && S.prefs.autoNext)
      setTimeout(function () {
        if (R && R.items[R.idx] === it) next();
      }, 450);
  };
  A.acts['rd-log'] = function (el) {
    var d = el.dataset.d,
      p = el.dataset.p;
    if (!A.canLog(d, p)) {
      A.notYet(d, p);
      return;
    }
    var o = (S.prayed[d] = S.prayed[d] || {});
    o[p] = Date.now();
    A.save();
    A.N.sync();
    A.N.haptic('success');
    A.toast(P.NAMES[p] + ' logged', 'check');
    el.remove();
  };
  A.acts['rd-save'] = function (el) {
    var it = R.items[R.idx],
      on = A.toggleSaved(R.cid, it.id);
    A.N.haptic('click');
    A.toast(on ? 'Saved' : 'Removed from saved', on ? 'bookmark' : null);
    paintPage(0);
  };
  A.acts['rd-share'] = function () {
    A.openShare(R.items[R.idx], R.c);
  };
  /* a short dhikr from this session, a different one each day */
  A.acts['rd-status'] = function () {
    var l = R.items.filter(function (x) {
        return x.en && x.ar.length < 260 && x.kind !== 'flag';
      }),
      k = A.today(),
      h = 0;
    for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    if (l.length) A.openShare(l[h % l.length], R.c);
  };

  A.acts.ext = function (el, e) {
    e.preventDefault();
    A.N.open(el.getAttribute('href'));
  };
  A.acts['rd-menu'] = function () {
    readingSheet();
  };
  A.readingSheet = function () {
    A.closeSheets();
    readingSheet();
  };
  function readingSheet() {
    var p = S.prefs;
    var row = function (t, s, on, key) {
      return (
        '<div class="set" style="padding:10px 0"><div class="grow"><div class="t">' +
        t +
        '</div>' +
        (s ? '<div class="s">' + s + '</div>' : '') +
        '</div>' +
        A.sw(on, 'pref', ' data-k="' + key + '"') +
        '</div>'
      );
    };
    var html =
      '<div class="set" style="padding:6px 0"><div class="grow"><div class="t">Arabic size</div><div class="s ar" style="font-size:20px;color:var(--t2)">بِسْمِ اللَّهِ</div></div>' +
      A.stepper(p.ar, 'ar-size') +
      '</div><div class="divider"></div>' +
      row('Transliteration', '', p.tr, 'tr') +
      row('Translation', '', p.en, 'en') +
      '<div class="divider"></div>' +
      A.countingRows() +
      '<div class="divider"></div>' +
      (p.count === 'tap'
        ? row('Tap the Arabic to count', 'Count by tapping the text as well as the button', p.tapText, 'tapText')
        : '') +
      row('Auto-advance', 'Move on when a count is complete', p.autoNext, 'autoNext') +
      row('Sound', 'A soft click on each count, a gentle tap when complete', p.sound, 'sound') +
      row('Keep screen on', '', p.wake, 'wake') +
      (A.N.has ? row('Volume keys count', 'Press volume up or down to count', p.volKeys, 'volKeys') : '');
    A.sheet('Reading', html, {
      onClose: function () {
        if (R) paintPage(0);
      }
    });
  }
  A.acts.pref = function (el) {
    var k = el.dataset.k,
      v = !S.prefs[k];
    S.prefs[k] = v;
    el.setAttribute('aria-checked', v);
    A.N.haptic('tick');
    A.save();
    if (k === 'wake' && R) A.N.keepAwake(v);
    if (k === 'volKeys' && R) A.N.volumeKeys(v);
    if (k === 'motion' || k === 'h24') A.applyTheme();
    if (k === 'haptics' && v) A.N.haptic('click');
    if (k === 'sound' && v) A.fx.click();
  };
  A.acts['ar-size'] = function (el) {
    S.prefs.ar = A.clamp(S.prefs.ar + +el.dataset.d * 2, 22, 52);
    A.applyTheme();
    A.save();
    var b = el.parentNode.querySelector('b');
    if (b) b.textContent = S.prefs.ar;
    A.N.haptic('tick');
  };
  window.__native.onVolume = function (d) {
    if (R) {
      if (A.pace.on()) return false;
      bump(1);
      return true;
    }
    if (A.trkVolume) return A.trkVolume();
    return false;
  };

  function finish() {
    if (!R || R.finished) return;
    R.finished = true;
    var mins = Math.max(1, Math.round((Date.now() - R.t0) / 60000)),
      st = A.streaks(),
      fresh = A.checkBadges();
    A.N.haptic('heavy');
    $('#rdS').innerHTML = stories();
    var c = R.c,
      b = $('#rdB');
    b.innerHTML =
      '<div class="finish"><div class="medal">' +
      A.rosette(168) +
      '</div><div class="eyebrow" style="color:var(--h)">Completed</div><h2>' +
      esc(c.title) +
      (R.prayer ? ' · ' + P.NAMES[R.prayer] : '') +
      '</h2><p>May Allah accept it from you and make it a light for you.</p><div class="stats"><div><b class="num">' +
      R.items.length +
      '</b><span>Adhkār</span></div><div><b class="num">' +
      mins +
      '</b><span>Minutes</span></div><div><b class="num">' +
      st.cur +
      '</b><span>Streak</span></div></div>' +
      (fresh.length
        ? '<div class="card flat row" style="text-align:left;max-width:340px">' +
          A.medal(fresh[0], true, 46) +
          '<div><div class="eyebrow" style="color:var(--gold2)">New achievement</div><div style="font-weight:800">' +
          esc(fresh[0].name) +
          '</div></div></div>'
        : '') +
      '</div>';
    if (
      R.cid === 'salah' &&
      R.prayer &&
      S.prefs.trackPrayers &&
      S.loc &&
      !A.isExcused(R.date) &&
      !(S.prayed[R.date] || {})[R.prayer] &&
      A.canLog(R.date, R.prayer)
    )
      b.querySelector('.finish').insertAdjacentHTML(
        'beforeend',
        '<button type="button" class="btn pri sh-status" data-a="rd-log" data-p="' +
          R.prayer +
          '" data-d="' +
          R.date +
          '">' +
          ic('check', 's') +
          'I prayed ' +
          esc(P.NAMES[R.prayer]) +
          '</button>'
      );
    if (R.cid === 'morning' || R.cid === 'evening')
      b.querySelector('.finish').insertAdjacentHTML(
        'beforeend',
        '<button type="button" class="btn sec sh-status" data-a="rd-status">' +
          ic('share', 's') +
          'Share as your status</button>'
      );
    $('#rdD').innerHTML =
      '<span></span><button type="button" class="btn pri" data-a="rd-close" style="justify-self:center;min-width:200px">Done</button><span></span>';
    $('#rdD').style.gridTemplateColumns = '1fr auto 1fr';
    $('#rdT').innerHTML = esc(c.title);
  }

  /* gestures: horizontal swipe on body to move; long-press counter to undo */
  function bindGestures(el) {
    var b = $('#rdB', el),
      x0 = null,
      y0 = 0,
      t0 = 0;
    b.addEventListener(
      'touchstart',
      function (e) {
        if (e.touches.length !== 1) return;
        x0 = e.touches[0].clientX;
        y0 = e.touches[0].clientY;
        t0 = Date.now();
      },
      { passive: true }
    );
    b.addEventListener('touchend', function (e) {
      if (x0 == null || !R || R.finished) return;
      var dx = e.changedTouches[0].clientX - x0,
        dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - t0 < 600) {
        R.swiped = Date.now();
        if (A.ar && A.ar() ? dx > 0 : dx < 0) next();
        else prev();
      }
    });
  }
  function bindLongPress(btn) {
    if (!btn) return;
    var t = null;
    var start = function () {
      t = setTimeout(function () {
        if (!R) return;
        R.longFired = true;
        bump(-1);
        A.toast('Undone one count');
      }, 550);
    };
    var cancel = function () {
      clearTimeout(t);
    };
    btn.addEventListener('touchstart', start, { passive: true });
    btn.addEventListener('touchend', cancel);
    btn.addEventListener('touchmove', cancel, { passive: true });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', cancel);
    btn.addEventListener('mouseleave', cancel);
  }
  /* rd-tap ignores the tap that ended a swipe */
  var origTap = A.acts['rd-tap'];
  A.acts['rd-tap'] = function (el, e) {
    if (R && R.swiped && Date.now() - R.swiped < 400) return;
    origTap(el, e);
  };
})();
