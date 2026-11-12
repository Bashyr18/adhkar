/* Learn the prayer: an immersive, step-by-step guide to ṣalāh as the Prophet ﷺ prayed it.
   One engine (plan) builds every prayer from its shape: the rakʿahs, where the recitation is aloud, where the
   tashahhuds fall and how one sits in each. The words of every position are the verified Within Ṣalāh items
   (data.js) and the evidence is verbatim hadith (hadith.js). Gender changes the illustrations and the guidance that
   differs (ʿawrah, voice, rows, alerting the imam), never the form: one prayer was taught to all.
   Categories follow the Ḥanbalī ordering taught by Ibn Bāz and Ibn ʿUthaymīn: pillar, obligatory, sunnah. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    esc = A.esc,
    ic = A.icon,
    D = window.DATA;
  var H = function (k) {
    return window.HADITH && window.HADITH[k];
  };

  /* ================= the prayers ================= */
  var PR = {
    fajr: { n: 2, loud: true },
    dhuhr: { n: 4, short: true },
    asr: { n: 4, short: true },
    maghrib: { n: 3, loud: true },
    isha: { n: 4, loud: true, short: true },
    jumuah: { n: 2, loud: true, t: 'Jumuʿah', time: 'dhuhr' },
    nafl: { n: 2, t: 'Sunnah', s: 'Sunnah or voluntary' },
    witr: { n: 1, loud: true, t: 'Witr', s: 'After ʿIshāʾ, before Fajr' }
  };
  var ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah', 'nafl', 'witr'];
  var KIND = { r: 'Pillar', w: 'Obligatory', s: 'Sunnah' };
  var POSE = {
    takbir: 'takbir',
    stand: 'qiyam',
    ruku: 'ruku',
    rise: 'itidal',
    sujud: 'sujud',
    jalsah: 'julus',
    tash: 'julus',
    final: 'julus',
    salamR: 'taslim-right',
    salamL: 'taslim-left',
    done: 'julus'
  };
  function pname(p) {
    return PR[p].t || P.NAMES[p];
  }
  function count(o) {
    var pr = PR[o.p];
    return o.short && pr.short ? 2 : pr.n;
  }

  /* ================= the engine ================= */
  /* o = { p, imam, short, g }. A step: { k, r, t, arT, say: [[id, kind, alts]], acts: [[kind, text, hadith]], voice, tip } */
  function plan(o) {
    var pr = PR[o.p],
      n = count(o),
      out = [],
      fem = o.g === 'f';
    var voiceOf = function (r) {
      return o.imam ? (pr.loud && r <= 2 ? 'listen' : 'quiet') : pr.loud && r <= 2 ? 'aloud' : 'quiet';
    };
    out.push({
      k: 'takbir',
      r: 1,
      t: 'Opening takbīr',
      arT: 'تكبيرة الإحرام',
      say: [['t-akbar', 'r']],
      acts: [
        ['r', 'Stand facing the qibla'],
        ['r', 'Say Allāhu akbar to enter the prayer', 'muslim:498'],
        ['s', 'Raise the hands to the shoulders as you say it', 'bukhari:828']
      ],
      tip: 'The intention is in the heart. Nothing is said for it.'
    });
    for (var r = 1; r <= n; r++) {
      var st = {
        k: 'stand',
        r: r,
        t: r === 1 ? 'Recitation' : 'Rakʿah ' + r,
        arT: 'القيام',
        voice: voiceOf(r),
        say: [],
        acts: []
      };
      if (r > 1) {
        if (r === 2 || r === 4) st.acts.push(['s', 'A brief sitting before you rise', 'bukhari:823']);
        st.acts.push(['w', 'Rise saying Allāhu akbar']);
        if (r === 3) st.acts.push(['s', 'Raise the hands as you stand from the tashahhud', 'bukhari:739']);
      } else {
        st.acts.push(['s', 'Right hand over the left', 'bukhari:740']);
        st.say.push(['p-open-subhanaka', 's', ['p-open-baid']]);
        st.acts.push(['s', 'Seek refuge in Allah and say the basmalah, quietly']);
      }
      st.say.push(['p-fatiha', 'r']);
      st.acts.push(['r', 'Recite al-Fātiḥah', 'bukhari:756']);
      if (pr.loud && r <= 2) st.acts.push(['s', 'Say Āmīn after it', 'bukhari:780']);
      if (r <= 2) st.acts.push(['s', 'Then recite more of the Qurʾān']);
      if (o.imam && pr.loud && r <= 2)
        st.tip =
          'Listen to the imam. Scholars differ on reciting al-Fātiḥah behind him when he recites aloud; Ibn Bāz held you recite it in his pauses.';
      else if (fem && st.voice === 'aloud') st.tip = 'Aloud only where no man outside your family can hear.';
      out.push(st);
      out.push({
        k: 'ruku',
        r: r,
        t: 'Rukūʿ',
        arT: 'الركوع',
        say: [['p-ruku', 'w', ['p-subhanaka', 'p-subbuh']]],
        acts: [
          ['w', 'Go down saying Allāhu akbar'],
          ['s', 'Raise the hands before bowing', 'bukhari:739'],
          ['r', 'Bow with the back level, hands firm on the knees', 'bukhari:828'],
          ['r', 'Be still before rising', 'bukhari:757']
        ]
      });
      out.push({
        k: 'rise',
        r: r,
        t: 'Rising',
        arT: 'الاعتدال',
        say: o.imam
          ? [['p-rabbana', 'w', ['p-mil']]]
          : [
              ['p-sami', 'w'],
              ['p-rabbana', 'w', ['p-mil']]
            ],
        acts: [
          ['s', 'Raise the hands as you rise', 'bukhari:739'],
          ['r', 'Stand fully straight', 'bukhari:828']
        ].concat(o.imam ? [['w', 'Behind an imam, say only Rabbanā wa lakal-ḥamd', 'bukhari:722']] : [])
      });
      for (var j = 1; j <= 2; j++) {
        out.push({
          k: 'sujud',
          r: r,
          t: j === 1 ? 'Sujūd' : 'Second sujūd',
          arT: 'السجود',
          say: [['p-sujud', 'w', ['p-subhanaka', 'p-subbuh', 'p-dhanbi', 'p-ridaka']]],
          acts:
            j === 1
              ? [
                  ['w', 'Go down saying Allāhu akbar'],
                  ['r', 'On seven bones: forehead with the nose, both hands, both knees, the toes', 'bukhari:812'],
                  ['s', 'Arms away from the sides, toes towards the qibla', 'bukhari:828'],
                  ['r', 'Be still', 'bukhari:757']
                ]
              : [
                  ['w', 'Allāhu akbar, then prostrate again'],
                  ['r', 'As the first, with stillness', 'bukhari:757']
                ],
          tip: j === 1 ? 'The nearest you are to your Lord. Make much duʿāʾ here.' : null,
          tipKey: j === 1 ? 'muslim:482' : null
        });
        if (j === 1)
          out.push({
            k: 'jalsah',
            r: r,
            t: 'Between the prostrations',
            arT: 'الجلسة بين السجدتين',
            say: [['p-jalsah', 'w', ['p-jalsah-long']]],
            acts: [
              ['w', 'Rise saying Allāhu akbar'],
              ['s', 'Sit on the left foot, the right foot upright', 'bukhari:828'],
              ['r', 'Sit still', 'bukhari:757']
            ]
          });
      }
      if (r === 2 && n > 2)
        out.push({
          k: 'tash',
          r: r,
          t: 'First tashahhud',
          arT: 'التشهد الأول',
          say: [['p-tashahhud', 'w']],
          acts: [
            ['w', 'Sit after the second rakʿah, saying Allāhu akbar'],
            ['s', 'Sit on the left foot, the right foot upright', 'bukhari:828'],
            ['w', 'Forgotten, it is made up by sujūd as-sahw', 'bukhari:1224']
          ]
        });
    }
    out.push({
      k: 'final',
      r: n,
      t: 'Final tashahhud',
      arT: 'التشهد الأخير',
      say: [
        ['p-tashahhud', 'r'],
        ['a-salawat', 'r'],
        ['p-refuge', 's', ['p-zalamtu', 'p-ainni']]
      ],
      acts: [
        ['r', 'Sit for the final tashahhud'],
        n > 2
          ? ['s', 'Left foot forward, sitting on the floor (tawarruk)', 'bukhari:828']
          : ['s', 'Sit on the left foot, the right foot upright', 'bukhari:828'],
        ['s', 'Ask Allah for whatever you wish before the salām']
      ]
    });
    out.push({
      k: 'salamR',
      r: n,
      t: 'Taslīm',
      arT: 'التسليم',
      say: [['say:taslim', 'r']],
      acts: [['r', 'Turn your face to the right', 'abudawud:996']]
    });
    out.push({
      k: 'salamL',
      r: n,
      t: 'Taslīm',
      arT: 'التسليم',
      say: [['say:taslim', 'r']],
      acts: [['r', 'Then to the left', 'abudawud:996']],
      tip: 'The Ḥanbalīs count both salāms as pillars; most scholars hold the second is sunnah.'
    });
    out.push({ k: 'done', r: n, t: 'Complete', arT: '' });
    return out;
  }
  A.salahPlan = plan; /* exposed for tests */

  /* the words for a step, from the verified sources */
  function word(id) {
    if (id === 'say:taslim') {
      var h = H('say:taslim');
      return h
        ? {
            uid: id,
            ar: h.ar,
            tr: 'As-salāmu ʿalaykum wa raḥmatullāh.',
            en: h.en + '.',
            refs: [{ l: 'Sunan Abī Dāwūd 996', u: 'https://sunnah.com/abudawud:996' }]
          }
        : null;
    }
    var it = D.items[id];
    if (!it) return null;
    return {
      uid: id,
      id: id,
      qs: it.qs,
      au: it.au,
      lt: it.lt || 0,
      rd: it.rd || 0,
      quran: !!it.quran,
      title: it.title,
      ar: it.ar,
      tr: it.tr,
      en: it.en,
      refs: it.refs,
      target: id === 'p-ruku' || id === 'p-sujud' ? 3 : 1,
      kind: 'fixed'
    };
  }

  /* ================= state ================= */
  var O = { p: null, imam: false, short: null, g: null },
    steps = [],
    idx = 0;
  function gender() {
    return O.g || (S.profile.gender === 'f' ? 'f' : 'm');
  }
  function defaultPrayer() {
    var n = A.now();
    return n.cur && PR[n.cur] ? n.cur : n.next && PR[n.next.k] ? n.next.k : 'dhuhr';
  }
  function shortDefault(p) {
    return !!(PR[p].short && A.travelling && A.travelling());
  }
  function img(pose) {
    return A.asset('img/pose/' + gender() + '/' + pose + '.webp');
  }

  /* ================= setup ================= */
  A.V.learn = function (a) {
    if (a[0] === 'quiz' && A.V.learnQuiz)
      return A.V.learnQuiz(a[1] === 'review' ? 'review' : a[1] && A.quizTopics[a[1]] ? a[1] : null);
    if (a[0] && PR[a[0]]) return player(a[0]);
    if (!O.p) O.p = defaultPrayer();
    if (O.short == null) O.short = shortDefault(O.p);
    var p = O.p,
      g = gender(),
      n = count(O),
      last = S.learn.last,
      h = '';
    h +=
      '<header class="top"><div class="tt"><div class="eyebrow">As the Prophet ﷺ prayed</div><h1>Learn the <em>prayer</em></h1></div></header>';
    h +=
      '<div class="card col lp-lead"><img class="lp-lead-fig" src="' +
      img('takbir') +
      '" alt="" aria-hidden="true">' +
      A.saidFold('bukhari:631', '') +
      '<div class="refs"><a href="https://sunnah.com/bukhari:631" data-a="ext">' +
      ic('link', 'xs') +
      'Bukhārī 631</a></div></div>';
    if (last && last.i > 0 && Date.now() - last.at < 12 * 3600000 && PR[last.p])
      h +=
        '<button type="button" class="card coll press lp-resume" data-a="lp-resume"><span class="badge s">' +
        ic('play', 's') +
        '</span><div class="grow"><div class="t">Continue ' +
        esc(pname(last.p)) +
        '</div><div class="s">Step ' +
        (last.i + 1) +
        ' of ' +
        last.n +
        '</div></div>' +
        ic('right', 's') +
        '</button>';
    if (g === 'f' && A.isExcused(A.today()))
      h +=
        '<div class="occ h-rose"><div class="badge s" style="--h:var(--rose)">' +
        ic('moonstar', 's') +
        '</div><div class="grow"><div class="t">On a break from ṣalāh</div><div class="d">Learning is still rewarded, and there is nothing to make up.</div></div></div>';
    h +=
      '<div class="sec"><h2>Choose a prayer</h2></div><div class="lp-grid">' +
      ORDER.map(function (k) {
        var pr = PR[k],
          on = k === p,
          rk = k === p ? n : pr.n;
        return (
          '<button type="button" class="lp-pick' +
          (on ? ' on' : '') +
          '" data-a="lp-pick" data-p="' +
          k +
          '" aria-pressed="' +
          on +
          '"><b>' +
          esc(pname(k)) +
          '</b><span>' +
          A.plural(rk, 'rakʿah', 'rakʿahs') +
          '</span></button>'
        );
      }).join('') +
      '</div>';
    var rows = [
      row(
        'Behind an imam',
        O.imam ? 'Follow him; say only Rabbanā wa lakal-ḥamd' : 'Alone, or leading',
        A.sw(O.imam, 'lp-imam')
      )
    ];
    if (PR[p].short)
      rows.push(row('Shortened for travel', O.short ? '2 rakʿahs' : 'In full', A.sw(O.short, 'lp-short')));
    rows.push(
      row(
        'Illustrations',
        '',
        '<div class="seg sm">' +
          [
            ['m', 'Brother'],
            ['f', 'Sister']
          ]
            .map(function (x) {
              return (
                '<button type="button" data-a="lp-g" data-v="' +
                x[0] +
                '" aria-pressed="' +
                (g === x[0]) +
                '">' +
                x[1] +
                '</button>'
              );
            })
            .join('') +
          '</div>'
      )
    );
    h += '<div class="card pad0 lp-opts">' + rows.join('') + '</div>';
    h +=
      '<div class="sec"><h2>Before you begin</h2></div><div class="card pad0 lp-ready">' +
      ready(p, g).join('') +
      '</div>';
    h +=
      '<button type="button" class="btn pri wide lp-go" data-a="lp-start">' +
      ic('play', 's') +
      'Begin · ' +
      esc(pname(p)) +
      ', ' +
      A.plural(n, 'rakʿah', 'rakʿahs') +
      '</button>';
    var nt = notes(g, p);
    h +=
      '<details class="card pad0 lp-notes"><summary><span class="badge s">' +
      ic(g === 'f' ? 'heart' : 'user', 's') +
      '</span><span class="grow"><b>' +
      (g === 'f' ? 'For sisters' : 'For brothers') +
      '</b><span>' +
      A.plural(nt.length, 'note', 'notes') +
      ' with the evidence</span></span></summary><div class="gd-list">' +
      nt.join('') +
      '</div></details>';
    h +=
      '<div class="sec"><h2>What the labels mean</h2></div><div class="card col lp-legend">' +
      legend('r', 'Left out, the prayer is not complete until it is done') +
      legend('w', 'Forgotten, it is made up by sujūd as-sahw') +
      legend('s', 'Rewarded, and the prayer is valid without it') +
      '</div>';
    /* how well you know it. New: a short invitation. Returning: mastery, accuracy, the last rounds, each topic,
       and one next step (review what you missed, or the weakest topic) */
    if (A.quizStats) {
      var all = A.quizStats(),
        keys = ['sahw', 'pillars', 'sunan', 'cond'],
        log = (S.learn.qlog || []).slice(-8);
      var nm = function (k) {
        return A.ar() ? A.quizTopics[k][1] : A.quizTopics[k][0];
      };
      var stats = keys.map(function (k) {
        return [k, A.quizStats(k)];
      });
      h +=
        '<div class="sec"><h2>Test yourself</h2>' +
        (all.seen
          ? '<span class="aside">' + A.fmtN(Math.round(all.mastery * 100)) + '% ' + A.T('mastered') + '</span>'
          : '') +
        '</div>';
      if (!all.seen) {
        h +=
          '<div class="card qz-dash qz-new"><div class="qz-new-h"><span class="badge s">' +
          ic('spark', 's') +
          '</span><div class="grow"><div class="t">' +
          A.T('How well do you know the prayer?') +
          '</div><div class="s">' +
          A.fmtN(all.total) +
          ' ' +
          A.T('questions, each with its evidence. About three minutes a round.') +
          '</div></div></div>' +
          '<div class="qz-acts"><button type="button" class="btn pri sm" data-a="qz-start" data-t="sahw">' +
          A.T('Start with sujūd as-sahw') +
          ic('right', 's') +
          '</button><button type="button" class="chip" data-a="qz-start" data-t="">' +
          A.T('A mixed round') +
          '</button></div></div>';
      } else {
        var weak = stats.slice().sort(function (a, b) {
          return a[1].mastery - b[1].mastery;
        })[0][0];
        h += '<div class="card qz-dash">';
        h +=
          '<div class="qz-hero">' +
          A.ring(all.mastery, 76, '<b>' + A.fmtN(Math.round(all.mastery * 100)) + '<i>%</i></b>', 'var(--gold)', 5) +
          '<div class="qz-kpis"><div><b class="num">' +
          A.fmtN(all.seen) +
          '<i>/' +
          A.fmtN(all.total) +
          '</i></b><span>' +
          A.T('Questions done') +
          '</span></div><div><b class="num">' +
          A.fmtN(Math.round(all.acc * 100)) +
          '<i>%</i></b><span>' +
          A.T('Accuracy') +
          '</span></div><div' +
          (all.review ? ' class="due"' : '') +
          '><b class="num">' +
          A.fmtN(all.review) +
          '</b><span>' +
          A.T('To review') +
          '</span></div></div></div>';
        if (log.length)
          h +=
            '<div class="qz-hist" aria-label="Your last rounds">' +
            log
              .map(function (x) {
                var f = x.n ? x.r / x.n : 0;
                return '<i style="--f:' + f.toFixed(2) + '" title="' + x.r + '/' + x.n + '"></i>';
              })
              .join('') +
            '<span>' +
            A.T('Last round') +
            ' <b>' +
            A.fmtN(log[log.length - 1].r) +
            '/' +
            A.fmtN(log[log.length - 1].n) +
            '</b></span></div>';
        h +=
          '<div class="qz-topics">' +
          stats
            .map(function (x) {
              var k = x[0],
                t = x[1];
              return (
                '<button type="button" class="qz-topic' +
                (k === weak ? ' weak' : '') +
                '" data-a="qz-start" data-t="' +
                k +
                '"><div class="qz-tt"><span class="t">' +
                esc(nm(k)) +
                '</span><span class="s">' +
                A.fmtN(t.strong) +
                '/' +
                A.fmtN(t.total) +
                ' ' +
                A.T('strong') +
                (k === weak ? ' · ' + A.T('work on this') : '') +
                '</span></div><div class="qz-bar"><i style="width:' +
                Math.round(t.mastery * 100) +
                '%"></i></div><span class="qz-pct num">' +
                A.fmtN(Math.round(t.mastery * 100)) +
                '%</span></button>'
              );
            })
            .join('') +
          '</div>';
        h +=
          '<div class="qz-acts">' +
          (all.review
            ? '<button type="button" class="btn pri sm" data-a="qz-start" data-t="review">' +
              ic('reset', 's') +
              A.T('Review mistakes') +
              ' · ' +
              A.fmtN(all.review) +
              '</button>'
            : '<button type="button" class="btn pri sm" data-a="qz-start" data-t="' +
              weak +
              '">' +
              A.T('Continue') +
              ': ' +
              esc(nm(weak)) +
              '</button>') +
          '<button type="button" class="chip" data-a="qz-start" data-t="">' +
          ic('spark', 'xs') +
          A.T('Mixed') +
          '</button></div></div>';
      }
    }
    h +=
      '<div class="grid2 lp-tools"><button type="button" class="card coll press" data-a="lp-sahw"><span class="badge s">' +
      ic('info', 's') +
      '</span><div class="grow"><div class="t">A mistake in prayer</div><div class="s">Sujūd as-sahw</div></div></button>' +
      '<a class="card coll press" href="#/c/inprayer"><span class="badge s">' +
      ic('book', 's') +
      '</span><div class="grow"><div class="t">Practise the words</div><div class="s">Listen and memorise</div></div></a></div>';
    return { html: h, title: 'Learn the prayer', tab: 3 };
  };
  function row(t, s, ctl) {
    return (
      '<div class="set"><div class="grow"><div class="t">' +
      esc(t) +
      '</div>' +
      (s ? '<div class="s">' + esc(s) + '</div>' : '') +
      '</div><div class="ctl">' +
      ctl +
      '</div></div>'
    );
  }
  function legend(k, d) {
    return (
      '<div class="lp-lg"><span class="lp-tag k-' +
      k +
      '">' +
      KIND[k] +
      '</span><span class="small muted">' +
      esc(d) +
      '</span></div>'
    );
  }
  function check(state, icon, t, s, href) {
    var tag = href ? 'a href="' + href + '"' : 'div';
    return (
      '<' +
      tag +
      ' class="set lp-chk ' +
      state +
      '"><span class="lp-dot">' +
      ic(state === 'wait' ? 'clock' : icon, 'xs') +
      '</span><div class="grow"><div class="t">' +
      esc(t) +
      '</div>' +
      (s ? '<div class="s">' + esc(s) + '</div>' : '') +
      '</div>' +
      (href ? ic('right', 's') : '') +
      '</' +
      (href ? 'a' : 'div') +
      '>'
    );
  }
  /* the conditions of the prayer, with what the app already knows filled in */
  function ready(p, g) {
    var out = [check('ok', 'check', 'Wuḍūʾ', 'Purity for the prayer', '#/c/daily')];
    if (S.loc) {
      var tk = PR[p].time || p,
        t = P.NAMES[tk] ? A.pday(A.today())[tk] : null;
      if (p === 'witr') out.push(check('ok', 'check', 'The time', 'After ʿIshāʾ until Fajr'));
      else if (t)
        out.push(
          t <= Date.now()
            ? check('ok', 'check', 'The time has begun', P.NAMES[tk] + ' began at ' + A.fmtTxt(t))
            : check('wait', 'clock', 'Not yet time', P.NAMES[tk] + ' begins at ' + A.fmtTxt(t))
        );
      out.push(
        check(
          'ok',
          'compass',
          'Facing the qibla',
          Math.round(P.qibla(S.loc.lat, S.loc.lng)) + '° from north',
          '#/qibla'
        )
      );
    } else out.push(check('ok', 'compass', 'Facing the qibla', 'Set your location to find it', '#/location'));
    out.push(
      check(
        'ok',
        'user',
        'Covered',
        g === 'f'
          ? 'All but the face and hands; many scholars include the feet'
          : 'From the navel to the knee, and the shoulders',
        '#/modesty'
      )
    );
    out.push(check('ok', 'leaf', 'Clean', 'The body, the clothes and the place'));
    return out;
  }
  function note(icon, t, key) {
    return (
      '<div class="gd-pt"><span class="badge s">' +
      ic(icon, 's') +
      '</span><div class="grow"><div class="t">' +
      esc(t) +
      '</div>' +
      (key
        ? A.saidFold(key, '') +
          '<div class="refs"><a href="https://sunnah.com/' +
          key +
          '" data-a="ext">' +
          ic('link', 'xs') +
          esc(A.refLabel(key)) +
          '</a></div>'
        : '') +
      '</div></div>'
    );
  }
  function notes(g, p) {
    var out =
      g === 'f'
        ? [
            note('user', 'Covered in ṣalāh: all but the face and hands', 'abudawud:641'),
            note(
              'mosque',
              'Your prayer at home is better for you, and the masjid is not barred to you',
              'abudawud:567'
            ),
            note('hands', 'Behind an imam, alert him by clapping', 'bukhari:1203'),
            note('star', 'In congregation, the best rows for women are the last', 'muslim:440')
          ]
        : [
            note('user', 'Keep the shoulders covered', 'bukhari:359'),
            note('hands', 'Behind an imam, alert him by saying Subḥānallāh', 'bukhari:1203'),
            note('star', 'The best rows for men are the first', 'muslim:440')
          ];
    if (p === 'jumuah')
      out.unshift(
        note(
          'cal',
          g === 'f'
            ? 'Jumuʿah is not required of women. Prayed with the congregation, it takes the place of Dhuhr.'
            : 'Jumuʿah is prayed in congregation after the khuṭbah. Missed, pray Dhuhr instead.'
        )
      );
    return out;
  }
  A.refLabel = function (k) {
    var p = k.split(':'),
      L = {
        abudawud: 'Abū Dāwūd',
        bukhari: 'Bukhārī',
        muslim: 'Muslim',
        tirmidhi: 'Tirmidhī',
        nasai: 'an-Nasāʾī',
        ibnmajah: 'Ibn Mājah'
      };
    return (L[p[0]] || p[0]) + ' ' + p[1];
  };

  A.acts['lp-pick'] = function (el) {
    O.p = el.dataset.p;
    O.short = shortDefault(O.p);
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['lp-imam'] = function () {
    O.imam = !O.imam;
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['lp-short'] = function () {
    O.short = !O.short;
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['lp-g'] = function (el) {
    O.g = el.dataset.v;
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['lp-start'] = function () {
    idx = 0;
    steps = [];
    A.go('#/learn/' + O.p);
  };
  A.acts['lp-resume'] = function () {
    var l = S.learn.last;
    O.p = l.p;
    O.imam = !!l.imam;
    O.short = !!l.short;
    steps = [];
    idx = l.i;
    A.go('#/learn/' + l.p);
  };

  /* ================= the player ================= */
  function player(p) {
    if (O.p !== p || !steps.length) {
      var l = S.learn.last;
      if (!steps.length && l && l.p === p) {
        O.p = p;
        O.imam = !!l.imam;
        O.short = !!l.short;
        idx = l.i;
      } /* a cold start resumes */
      else if (O.p !== p) {
        O.p = p;
        O.short = shortDefault(p);
        idx = 0;
      }
      steps = plan({ p: p, imam: O.imam, short: O.short, g: gender() });
    }
    idx = Math.max(0, Math.min(idx, steps.length - 1));
    var n = count(O);
    var h =
      '<div class="lp" id="lp"><header class="lp-top"><button type="button" class="ib ghost" data-a="lp-close" aria-label="Close">' +
      ic('close', 's') +
      '</button>' +
      '<div class="lp-tt"><b>' +
      esc(pname(p)) +
      '</b><span id="lpR"></span></div><button type="button" class="ib ghost" data-a="lp-sahw" aria-label="A mistake in prayer">' +
      ic('info', 's') +
      '</button></header>' +
      '<div class="lp-prog" role="progressbar" aria-label="Progress">' +
      Array.apply(null, Array(n))
        .map(function () {
          return '<i><b></b></i>';
        })
        .join('') +
      '</div>' +
      '<div class="lp-stage" aria-hidden="true"><div class="lp-halo"></div><img class="lp-fig a" alt=""><img class="lp-fig b" alt=""></div>' +
      '<div class="lp-body" id="lpB"></div>' +
      '<footer class="lp-dock"><button type="button" class="ib lp-prev" data-a="lp-prev" aria-label="Previous step">' +
      ic('left', 's') +
      '</button><button type="button" class="btn pri lp-next" data-a="lp-next"></button></footer></div>';
    return { html: h, title: pname(p), bare: true, tab: 3, mount: mount, unmount: unmount };
  }
  var front = 'a',
    keyH = null;
  function mount(app) {
    var lp = $('#lp', app);
    if (!lp) return;
    /* preload every posture so steps never wait */
    ['takbir', 'qiyam', 'ruku', 'itidal', 'sujud', 'julus', 'taslim-right', 'taslim-left'].forEach(function (x) {
      var i = new Image();
      i.src = img(x);
    });
    /* swipe between steps; it may start anywhere but the dock, the header and the audio bar */
    var x0 = null,
      y0 = 0,
      t0 = 0;
    lp.addEventListener(
      'touchstart',
      function (e) {
        if (e.touches.length !== 1 || e.target.closest('.au, .lp-dock, .lp-top, summary')) {
          x0 = null;
          return;
        }
        x0 = e.touches[0].clientX;
        y0 = e.touches[0].clientY;
        t0 = Date.now();
      },
      { passive: true }
    );
    lp.addEventListener(
      'touchend',
      function (e) {
        if (x0 == null) return;
        var dx = e.changedTouches[0].clientX - x0,
          dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - t0 < 700) {
          var fwd = dx < 0 !== (document.documentElement.dir === 'rtl');
          go(fwd ? 1 : -1);
        }
      },
      { passive: true }
    );
    keyH = function (e) {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', keyH);
    if (S.prefs.wake) A.N.keepAwake(true);
    front = 'a';
    paint(0);
  }
  function unmount() {
    if (keyH) document.removeEventListener('keydown', keyH);
    keyH = null;
    if (A.audio) A.audio.stop();
    A.N.keepAwake(false);
  }
  function go(d) {
    var j = idx + d;
    if (j < 0 || j >= steps.length) return;
    idx = j;
    A.N.haptic('tick');
    paint(d);
  }
  function paint(dir) {
    var s = steps[idx],
      n = count(O),
      lp = $('#lp');
    if (!lp || !s) return;
    if (A.audio) A.audio.stop();
    /* progress: one bar per rakʿah, filled through the current step */
    var per = {};
    steps.forEach(function (x, i) {
      (per[x.r] = per[x.r] || []).push(i);
    });
    A.$$('.lp-prog i', lp).forEach(function (bar, i) {
      var list = per[i + 1] || [],
        a = list[0],
        b = list[list.length - 1],
        f = idx >= b ? 1 : idx < a ? 0 : (idx - a + 1) / list.length;
      bar.firstChild.style.transform = 'scaleX(' + f + ')';
    });
    $('#lpR').textContent = s.k === 'done' ? 'Complete' : 'Rakʿah ' + s.r + ' of ' + n;
    /* the figure cross-fades only when the posture changes */
    var pose = POSE[s.k],
      cur = $('.lp-fig.' + front, lp);
    if (cur.getAttribute('data-p') !== pose) {
      var back = $('.lp-fig.' + (front === 'a' ? 'b' : 'a'), lp);
      back.src = img(pose);
      back.setAttribute('data-p', pose);
      back.classList.add('on');
      cur.classList.remove('on');
      front = front === 'a' ? 'b' : 'a';
    }
    lp.classList.toggle('is-done', s.k === 'done');
    var b = $('#lpB');
    b.innerHTML = s.k === 'done' ? doneHtml() : stepHtml(s);
    b.classList.remove('slide-l', 'slide-r');
    void b.offsetWidth;
    if (dir) b.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
    b.scrollTop = 0;
    $('.lp-prev', lp).disabled = idx === 0;
    var nx = $('.lp-next', lp);
    nx.innerHTML =
      s.k === 'done'
        ? 'Finish'
        : idx === steps.length - 2
          ? 'Complete' + ic('check', 's')
          : (idx === 0 ? 'Begin' : 'Next') + ic('right', 's');
    nx.setAttribute('data-a', s.k === 'done' ? 'lp-close' : 'lp-next');
    /* resume where you left off; a finished prayer is remembered */
    if (s.k === 'done') {
      S.learn.last = null;
      S.learn.done[O.p] = A.today();
    } else S.learn.last = { p: O.p, imam: O.imam, short: O.short, i: idx, n: steps.length, at: Date.now() };
    A.save();
  }
  var VOICE = { aloud: 'Aloud', quiet: 'Quietly', listen: 'Listen to the imam' };
  function stepHtml(s) {
    var h =
      '<div class="lp-name"><h2>' +
      esc(s.t) +
      '</h2>' +
      (s.arT && !A.ar() ? '<span class="ar" lang="ar">' + s.arT + '</span>' : '') +
      (s.voice ? '<span class="lp-voice v-' + s.voice + '">' + VOICE[s.voice] + '</span>' : '') +
      '</div>';
    (s.say || []).forEach(function (x, i) {
      var it = word(x[0]);
      if (!it) return;
      h +=
        '<section class="lp-say"><div class="lp-say-h"><span class="lp-tag k-' +
        x[1] +
        '">' +
        KIND[x[1]] +
        '</span><span class="t">' +
        esc(it.title || 'Say') +
        '</span>' +
        '</div>' +
        (it.target > 1
          ? '<div class="lp-cnts"><span class="lp-cnt"><b>' +
            A.T('Required') +
            '</b> ' +
            A.T('once') +
            '</span><span class="lp-cnt s"><b>' +
            A.T('Sunnah') +
            '</b> ' +
            A.fmtN(it.target) +
            ' ' +
            A.T('times') +
            '</span></div>'
          : '');
      h += it.qs ? A.mushaf(it.qs, false) : '<div class="rd-ar ar" lang="ar">' + esc(it.ar) + '</div>';
      h += A.txSections(it, true);
      if (A.audio && it.au && i === 0) {
        A.audio.attach(it);
        h += A.audio.bar(it, 'inprayer');
      }
      if (x[2] && x[2].length)
        h +=
          '<details class="lp-alt"><summary>' +
          (x[2].length === 1 ? 'Another authentic wording' : x[2].length + ' other authentic wordings') +
          '</summary>' +
          x[2]
            .map(function (id) {
              var a = word(id);
              return a
                ? '<div class="lp-alt-i"><div class="t">' +
                    esc(a.title) +
                    '</div><div class="rd-ar ar" lang="ar">' +
                    esc(a.ar) +
                    '</div>' +
                    A.txSections(a, true) +
                    '</div>'
                : '';
            })
            .join('') +
          '</details>';
      h += '</section>';
    });
    if (s.acts && s.acts.length)
      h +=
        '<section class="lp-do"><div class="eyebrow">What you do</div>' +
        s.acts
          .map(function (x) {
            return (
              '<button type="button" class="lp-act"' +
              (x[2] ? ' data-a="lp-why" data-k="' + x[2] + '"' : ' disabled') +
              '><span class="lp-tag k-' +
              x[0] +
              '">' +
              KIND[x[0]] +
              '</span><span class="grow">' +
              esc(x[1]) +
              '</span>' +
              (x[2] ? '<span class="lp-why">' + ic('info', 'xs') + '</span>' : '') +
              '</button>'
            );
          })
          .join('') +
        '</section>';
    if (s.tip)
      h +=
        '<div class="rd-note lp-tip">' +
        ic('spark', 's') +
        '<div>' +
        esc(s.tip) +
        (s.tipKey
          ? ' <button type="button" class="gold" data-a="lp-why" data-k="' + s.tipKey + '">The hadith</button>'
          : '') +
        '</div></div>';
    return h;
  }
  function doneHtml() {
    var p = O.p,
      fard = !!P.NAMES[p] && p !== 'jumuah',
      tk = PR[p].time || p;
    var canLog =
      fard &&
      S.prefs.trackPrayers &&
      S.loc &&
      !A.isExcused(A.today()) &&
      A.canLog(A.today(), tk) &&
      !(S.prayed[A.today()] || {})[tk];
    var h =
      '<div class="lp-done"><div class="lp-seal">' +
      ic('check') +
      '</div><h2>' +
      esc(pname(p)) +
      ' is complete</h2><p class="muted">From the opening takbīr to the salām. ' +
      (S.learn.done[p] ? 'May Allah accept it.' : '') +
      '</p>';
    h +=
      '<a class="btn pri wide" href="' +
      (fard || p === 'jumuah' ? '#/r/salah/0/' + tk : '#/c/salah') +
      '">' +
      ic('mosque', 's') +
      'Adhkār after the prayer</a>';
    if (canLog)
      h +=
        '<button type="button" class="btn sec wide" data-a="lp-log">' +
        ic('check', 's') +
        'I prayed ' +
        esc(P.NAMES[tk]) +
        '</button>';
    h += '<button type="button" class="btn ghost wide" data-a="lp-again">Go through it again</button></div>';
    return h;
  }
  A.acts['lp-next'] = function () {
    go(1);
  };
  A.acts['lp-prev'] = function () {
    go(-1);
  };
  A.acts['lp-close'] = function () {
    A.goBack('#/learn');
  };
  A.acts['lp-again'] = function () {
    idx = 0;
    front = 'a';
    paint(-1);
  };
  A.acts['lp-log'] = function (el) {
    var tk = PR[O.p].time || O.p,
      d = A.today(),
      o = (S.prayed[d] = S.prayed[d] || {});
    if (!A.canLog(d, tk)) {
      A.notYet(d, tk);
      return;
    }
    o[tk] = Date.now();
    A.save();
    A.N.sync();
    A.N.haptic('success');
    A.toast(P.NAMES[tk] + ' logged', 'check');
    el.remove();
  };
  A.acts['lp-why'] = function (el) {
    var k = el.dataset.k,
      hd = H(k);
    if (!hd) return;
    A.sheet(
      'The evidence',
      A.said(k, '', true) +
        '<div class="refs" style="margin-top:12px"><a href="https://sunnah.com/' +
        k +
        '" data-a="ext">' +
        ic('link', 'xs') +
        esc(A.refLabel(k)) +
        (hd.g ? ' · ' + esc(hd.g) : '') +
        '</a></div>'
    );
  };

  /* ================= sujūd as-sahw ================= */
  /* a short decision guide; rulings as summarised by Ibn ʿUthaymīn in his treatise on sujūd as-sahw */
  var SAHW = [
    {
      id: 'add',
      t: 'I added something',
      d: 'An extra rakʿah, rukūʿ or sujūd',
      when: 'after',
      how: 'If you realise during it, return at once. Complete the prayer, give salām, then prostrate twice and give salām again.',
      key: 'bukhari:1226'
    },
    {
      id: 'tash',
      t: 'I missed the first tashahhud',
      d: 'And stood up for the third rakʿah',
      q: 'Had you stood up fully?',
      a: [
        {
          t: 'Yes',
          when: 'before',
          how: 'Carry on and do not sit back down. Prostrate twice before the salām.',
          key: 'bukhari:1224'
        },
        { t: 'Not yet', when: null, how: 'Sit back down, recite the tashahhud and complete the prayer.' }
      ]
    },
    {
      id: 'pillar',
      t: 'I missed a pillar',
      d: 'Such as a rukūʿ or a sujūd',
      when: 'after',
      how: 'If you reach the same position in the next rakʿah, that rakʿah takes its place. If not, go back and do it, and what follows it. Prostrate twice after the salām. A missed opening takbīr means the prayer never began: start again.'
    },
    {
      id: 'early',
      t: 'I gave salām too early',
      d: 'Before the prayer was complete',
      when: 'after',
      how: 'If you remember soon after, stand, complete what is left and give salām. Then prostrate twice and give salām again.',
      key: 'bukhari:1229'
    },
    {
      id: 'doubt',
      t: 'I am unsure how many I prayed',
      d: 'Three or four?',
      q: 'Does one number feel more likely?',
      a: [
        {
          t: 'Yes',
          when: 'after',
          how: 'Act on what you think most likely. Complete the prayer, give salām, then prostrate twice.',
          key: 'bukhari:401'
        },
        {
          t: 'No',
          when: 'before',
          how: 'Build on the lower number, which is certain. Complete the prayer and prostrate twice before the salām.',
          key: 'muslim:571'
        }
      ]
    }
  ];
  function sahwBody(st) {
    var h =
      '<p class="muted small lp-sahw-lead">Two prostrations, like those of the prayer, with Allāhu akbar going down and rising.</p><div class="lp-sahw-list">';
    h +=
      SAHW.map(function (c) {
        return (
          '<button type="button" class="lp-case' +
          (st.c === c.id ? ' on' : '') +
          '" data-c="' +
          c.id +
          '"><b>' +
          esc(c.t) +
          '</b><span>' +
          esc(c.d) +
          '</span></button>'
        );
      }).join('') + '</div>';
    var c = SAHW.filter(function (x) {
      return x.id === st.c;
    })[0];
    if (c) {
      var r = c;
      if (c.q) {
        h +=
          '<div class="lp-q"><span>' +
          esc(c.q) +
          '</span><div class="seg sm">' +
          c.a
            .map(function (x, i) {
              return (
                '<button type="button" data-ans="' + i + '" aria-pressed="' + (st.a === i) + '">' + x.t + '</button>'
              );
            })
            .join('') +
          '</div></div>';
        r = st.a != null ? c.a[st.a] : null;
      }
      if (r) {
        h +=
          '<div class="lp-ans">' +
          (r.when
            ? '<span class="lp-when w-' +
              r.when +
              '">' +
              (r.when === 'before' ? 'Before the salām' : 'After the salām') +
              '</span>'
            : '<span class="lp-when">No sujūd needed</span>') +
          '<p>' +
          esc(r.how) +
          '</p>';
        if (r.key && H(r.key))
          h +=
            A.saidFold(r.key, '') +
            '<div class="refs"><a href="https://sunnah.com/' +
            r.key +
            '" data-a="ext">' +
            ic('link', 'xs') +
            esc(A.refLabel(r.key)) +
            '</a></div>';
        h += '</div>';
      }
    }
    h +=
      '<p class="faint small lp-sahw-foot">Behind an imam, follow him: if he prostrates for forgetfulness, prostrate with him. Doubts after the prayer has ended, or that come all the time, are set aside.</p>';
    if (A.quizStart)
      h +=
        '<button type="button" class="btn sec wide lp-sahw-quiz" data-a="lp-sahw-quiz">' +
        ic('spark', 's') +
        A.T('Test yourself on sujūd as-sahw') +
        ' · ' +
        A.fmtN(Math.round(A.quizMastery('sahw') * 100)) +
        '%</button>';
    return h;
  }
  A.acts['lp-sahw-quiz'] = function () {
    A.closeSheets();
    A.quizStart('sahw');
  };
  A.acts['lp-sahw'] = function () {
    var st = { c: null, a: null };
    A.sheet('A mistake in prayer', sahwBody(st), {
      mount: function (sh) {
        sh.addEventListener('click', function (e) {
          var c = e.target.closest('[data-c]'),
            an = e.target.closest('[data-ans]');
          if (c) {
            st.c = st.c === c.dataset.c ? null : c.dataset.c;
            st.a = null;
          } else if (an) st.a = +an.dataset.ans;
          else return;
          A.N.haptic('tick');
          $('.sh-b', sh).innerHTML = sahwBody(st);
          if (A.nameSwitches) A.nameSwitches(sh);
        });
      }
    });
  };
})();
