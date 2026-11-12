/* Profile · settings · data · about · onboarding. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    $$ = A.$$,
    esc = A.esc,
    ic = A.icon;

  function sinceText() {
    var a = S.profile.since.split('-');
    return A.MONTHS[+a[1] - 1] + ' ' + a[0];
  }
  /* 14-day sparkline for the Insights preview */
  function spark(tot) {
    var k = A.today(),
      vals = [],
      max = 1,
      W = 120,
      H = 36;
    for (var i = 13; i >= 0; i--) {
      var v = tot.byDay[A.shift(k, -i)] || 0;
      vals.push(v);
      max = Math.max(max, v);
    }
    var pts = vals.map(function (v, i) {
      return ((i * W) / 13).toFixed(1) + ',' + (H - 3 - (v / max) * (H - 8)).toFixed(1);
    });
    return (
      '<svg viewBox="0 0 ' +
      W +
      ' ' +
      H +
      '" width="' +
      W +
      '" height="' +
      H +
      '" aria-hidden="true" style="flex:none;overflow:visible"><polyline points="' +
      pts.join(' ') +
      '" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' +
      pts[13].split(',')[0] +
      '" cy="' +
      pts[13].split(',')[1] +
      '" r="3.5" fill="var(--gold)" stroke="var(--s1)" stroke-width="2"/></svg>'
    );
  }

  A.V.profile = function () {
    var st = A.streaks(),
      tot = A.totals(),
      earned = A.BADGES.filter(function (b) {
        return S.badges[b.id];
      }).length;
    var h =
      '<div class="phead">' +
      A.avatar(96) +
      '<h1>' +
      esc(S.profile.name || 'Your profile') +
      '</h1><div class="s">Striving since ' +
      sinceText() +
      (S.loc ? ' · ' + esc(S.loc.name) : '') +
      '</div><div class="row" style="justify-content:center;margin-top:6px"><button type="button" class="btn sec sm" data-a="edit-profile">' +
      ic('edit', 's') +
      'Edit profile</button><button type="button" class="btn sec sm" data-a="theme">' +
      ic('palette', 's') +
      'Theme</button></div></div>';
    /* a figure that is still zero says how it begins, instead of showing a wall of noughts */
    var stat = function (hue, icon, n, shown, label, hint) {
      return (
        '<div class="card stat h-' +
        hue +
        (n ? '' : ' zero') +
        '">' +
        (icon ? ic(icon, 's') : '') +
        '<div class="v">' +
        (n ? shown : '<span class="hint">' + hint + '</span>') +
        '</div><div class="k">' +
        label +
        '</div></div>'
      );
    };
    if (!tot.dhikr && !tot.sessions && !tot.prayed && !st.days) {
      var due =
        ['asr', 'maghrib', 'isha'].indexOf(A.now().cur) >= 0
          ? 'evening'
          : 'morning'; /* the adhkār of this part of the day */
      h +=
        '<div class="card col first-week h-gold"><span class="badge s">' +
        ic('spark', 's') +
        '</span><div class="t">Your record begins today</div><div class="s">Your streak, sessions and prayers appear here as you go.</div><div class="row" style="gap:8px;flex-wrap:wrap"><a class="chip" href="#/c/' +
        due +
        '">' +
        ic('book', 'xs') +
        'Begin the adhkār</a><a class="chip" href="#/salah">' +
        ic('mosque', 'xs') +
        'Log a prayer</a></div></div>';
    } else {
      h +=
        '<div class="grid2">' +
        stat('gold', 'flame', st.cur, st.cur, 'Day streak' + (st.best ? ' · best ' + st.best : ''), 'Begins today') +
        stat('teal', 'tracker', tot.dhikr, A.chart.compact(tot.dhikr), 'Remembrances', 'Your first count') +
        stat('jade', 'check', tot.sessions, A.fmtN(tot.sessions), 'Sessions completed', 'Finish a collection') +
        stat('rose', 'cal', st.days, A.fmtN(st.days), 'Active days', 'Begins today') +
        '</div>';
      h +=
        '<div class="grid3 r2">' +
        stat('jade', '', tot.prayed, A.fmtN(tot.prayed), 'Prayers logged', 'None yet') +
        stat('night', '', tot.nights, tot.nights, 'Nights of qiyām', 'None yet') +
        stat('sand', '', tot.fasts, tot.fasts, 'Days fasted', 'None yet') +
        '</div>';
    }
    h +=
      '<a class="card press row" href="#/insights" style="gap:14px"><span class="badge h-gold">' +
      ic('insights') +
      '</span><div class="grow"><div style="font:400 var(--fs-title)/1.2 var(--f-serif)">Insights</div><div class="faint small">Last 14 days</div></div>' +
      spark(tot) +
      '</a>';
    h += cycleCard();
    h +=
      '<div class="sec"><h2>Achievements</h2><span class="aside">' +
      earned +
      ' of ' +
      A.BADGES.length +
      '</span></div><div class="medals">' +
      A.BADGES.map(function (b) {
        var on = !!S.badges[b.id];
        return (
          '<div class="card medal-c' +
          (on ? '' : ' locked') +
          '" aria-label="' +
          esc(b.name + (on ? ', earned' : ', locked') + '. ' + b.d) +
          '">' +
          A.medal(b, on) +
          '<b>' +
          esc(b.name) +
          '</b><span>' +
          esc(b.d) +
          '</span></div>'
        );
      }).join('') +
      '</div>';
    h +=
      '<div class="sec"><h2>Settings</h2></div><div class="card pad0"><div class="list">' +
      [
        ['appearance', 'palette', 'gold', 'Appearance', 'Theme, motion, clock, Hijri date'],
        ['reading', 'text', 'dawn', 'Reading', 'Arabic size, transliteration, counting'],
        ['prayer', 'mosque', 'jade', 'Prayer times', P.METHODS[S.calc.method].name],
        ['notifications', 'bell', 'rose', 'Reminders', S.notif.enabled ? 'On' : 'Off'],
        ['device', 'widget', 'teal', 'Widgets & device', 'Home-screen widgets, shortcuts, haptics'],
        ['data', 'shield', 'sand', 'Backup & data', 'Export, import, reset'],
        ['modesty', 'shield', 'rose', 'Dress & ʿawrah', 'From the Qurʾān and Sunnah'],
        ['about', 'info', 'indigo', 'About, sources & contact', 'References, privacy, feedback']
      ]
        .map(function (r) {
          return (
            '<a class="set h-' +
            r[2] +
            '" href="' +
            (r[0] === 'modesty' ? '#/modesty' : '#/settings/' + r[0]) +
            '"><span class="badge">' +
            ic(r[1], 's') +
            '</span><div class="grow"><div class="t">' +
            r[3] +
            '</div><div class="s clamp1">' +
            esc(r[4]) +
            '</div></div><span class="faint">' +
            ic('right', 's') +
            '</span></a>'
          );
        })
        .join('') +
      '</div></div>';
    return {
      html: h,
      title: 'Profile',
      tab: 4,
      mount: function () {
        var f = A.checkBadges();
        if (f.length) {
          A.toast('Achievement unlocked: ' + f[0].name, 'trophy');
          setTimeout(A.rerender, 50);
        }
      }
    };
  };
  A.acts['edit-profile'] = function () {
    var hues = Object.keys(A.HUES);
    var sh = A.sheet(
      'Edit profile',
      '<div style="display:grid;place-items:center" id="epA">' +
        A.avatar(84) +
        '</div><div class="field"><label>Your name</label><input class="input" id="epN" maxlength="40" value="' +
        esc(S.profile.name) +
        '" autocomplete="given-name"></div><div class="field"><label>Colour</label><div class="row" style="flex-wrap:wrap;gap:10px">' +
        hues
          .map(function (h) {
            return (
              '<button type="button" data-h="' +
              h +
              '" aria-pressed="' +
              (S.profile.hue === h) +
              '" style="border-radius:50%;padding:3px;border:2px solid ' +
              (S.profile.hue === h ? 'var(--gold)' : 'transparent') +
              '">' +
              A.avatar(38, '', h) +
              '</button>'
            );
          })
          .join('') +
        '</div></div><div class="field"><label>About you</label><div class="seg" id="epG">' +
        [
          ['m', 'Brother'],
          ['f', 'Sister'],
          ['', 'Not set']
        ]
          .map(function (x) {
            return (
              '<button type="button" data-g="' +
              x[0] +
              '" aria-pressed="' +
              (S.profile.gender === x[0]) +
              '">' +
              x[1] +
              '</button>'
            );
          })
          .join('') +
        '</div></div><button type="button" class="btn pri wide" id="epOk">Save</button>',
      {
        mount: function (el, o) {
          var hue = S.profile.hue,
            gen = S.profile.gender || '';
          $('#epG', el).addEventListener('click', function (e) {
            var b = e.target.closest('[data-g]');
            if (!b) return;
            gen = b.dataset.g;
            Array.prototype.forEach.call(el.querySelectorAll('[data-g]'), function (x) {
              x.setAttribute('aria-pressed', x.dataset.g === gen);
            });
          });
          el.addEventListener('click', function (e) {
            var b = e.target.closest('[data-h]');
            if (!b) return;
            hue = b.dataset.h;
            Array.prototype.forEach.call(el.querySelectorAll('[data-h]'), function (x) {
              x.style.borderColor = x.dataset.h === hue ? 'var(--gold)' : 'transparent';
            });
            $('#epA', el).innerHTML = A.avatar(84, $('#epN', el).value, hue);
          });
          $('#epN', el).addEventListener('input', function () {
            $('#epA', el).innerHTML = A.avatar(84, this.value, hue);
          });
          $('#epOk', el).addEventListener('click', function () {
            S.profile.name = $('#epN', el).value.trim().slice(0, 40);
            S.profile.hue = hue;
            S.profile.gender = gen;
            if (gen !== 'f' && S.excused.on) A.setExcused(false);
            A.save(true);
            o.close();
            A.rerender();
          });
        }
      }
    );
    void sh;
  };

  /* ================= settings ================= */
  function row(t, s, right, extra) {
    return (
      '<div class="set"' +
      (extra || '') +
      '><div class="grow"><div class="t">' +
      t +
      '</div>' +
      (s ? '<div class="s">' + s + '</div>' : '') +
      '</div>' +
      (right ? '<div class="ctl">' + right + '</div>' : '') +
      '</div>'
    );
  }
  function swPref(k) {
    return A.sw(S.prefs[k], 'pref', ' data-k="' + k + '"');
  }
  function pick(act, label) {
    return (
      '<button type="button" class="v" data-a="' +
      act +
      '" style="display:inline-flex;align-items:center;gap:4px;color:var(--gold2)">' +
      esc(label) +
      ic('down', 'xs') +
      '</button>'
    );
  }
  function group(title, rows) {
    return (
      (title ? '<div class="sec"><h2 style="font-size:18px">' + title + '</h2></div>' : '') +
      '<div class="card pad0"><div class="list">' +
      rows.join('') +
      '</div></div>'
    );
  }
  var THEMES = [
    { v: 'auto', t: 'Match system' },
    { v: 'dark', t: 'Layl · dark' },
    { v: 'light', t: 'Nahār · light' }
  ];
  var HIGHLAT = [
    { v: 'angle', t: 'Angle-based', s: 'Recommended' },
    { v: 'mid', t: 'Middle of the night' },
    { v: 'seventh', t: 'One-seventh of the night' },
    { v: 'none', t: 'None' }
  ];

  var SECTIONS = (A.settingSections = {
    appearance: function () {
      return [
        'Appearance',
        group('', [
          row(
            'Language',
            '',
            '<div class="seg sm"><button type="button" data-a="lang" data-v="en" aria-pressed="' +
              !A.ar() +
              '">English</button><button type="button" data-a="lang" data-v="ar" aria-pressed="' +
              A.ar() +
              '" class="no-tr">العربية</button></div>'
          ),
          '<button type="button" class="set" data-a="theme"><div class="grow"><div class="t">Theme and accent</div><div class="s">' +
            THEMES.filter(function (x) {
              return x.v === S.prefs.theme;
            })[0].t +
            ' · ' +
            (S.prefs.accent || 'gold') +
            '</div></div><span class="faint">' +
            ic('right', 's') +
            '</span></button>',
          row('Motion', 'Animations and transitions', swPref('motion')),
          row('24-hour clock', '', swPref('h24')),
          row(
            'Hijri date',
            'Match your local moon sighting · ' + esc(A.hijriText(A.today())),
            A.stepper((S.prefs.hijriAdj > 0 ? '+' : '') + S.prefs.hijriAdj, 'hijri-adj')
          )
        ])
      ];
    },
    reading: function () {
      return [
        'Reading',
        group(
          '',
          [
            row(
              'Arabic size',
              '<span class="ar" style="font-size:' + Math.min(30, S.prefs.ar) + 'px;color:var(--t2)">سُبْحَانَ اللَّهِ</span>',
              A.stepper(S.prefs.ar, 'ar-size')
            ),
            row('Transliteration', '', swPref('tr')),
            row('Translation', '', swPref('en')),
            A.countingRows ? A.countingRows() : '',
            S.prefs.count === 'tap' ? row('Tap the Arabic to count', '', swPref('tapText')) : '',
            row('Auto-advance', 'Move to the next remembrance when a count is complete', swPref('autoNext')),
            row('Keep screen on', 'While reading and counting', swPref('wake')),
            row('Haptics', 'A gentle tick on every count', swPref('haptics')),
            A.N.has && S.prefs.count === 'tap'
              ? row('Volume keys count', 'In the reader and the tracker', swPref('volKeys'))
              : ''
          ].filter(Boolean)
        ) +
          (A.audio && A.audio.ok() && !A.audio.web
            ? group('Recitations', [
                (function () {
                  var m = A.audio.missing();
                  return m.length
                    ? '<div class="set"><div class="grow"><div class="t">' +
                        A.T('Download all') +
                        '</div><div class="s">' +
                        A.plural(m.length, 'recording') +
                        ' · ' +
                        A.audio.mb(A.audio.bytes(m)) +
                        '</div><div class="au-dl" data-au-all style="margin-top:8px"><i></i></div><div class="faint small" data-au-all-t></div></div><div class="ctl"><button type="button" class="btn pri sm" data-a="au-get-all">' +
                        ic('download', 's') +
                        '</button></div></div>'
                    : row(A.T('Every recitation is on your phone'), '', ic('check', 's'));
                })(),
                row(
                  'Downloaded audio',
                  (function () {
                    var b = A.audio.usage();
                    return b ? (b / 1048576).toFixed(1) + ' MB' : 'None yet';
                  })(),
                  A.audio.usage() ? '<button type="button" class="btn sec sm" data-a="au-clear">Remove</button>' : ''
                ),
                '<p class="faint" style="font-size:12px;line-height:1.55;margin:4px 6px">Ḥiṣn al-Muslim recordings · Qurʾān by Mishary al-ʿAfāsī</p>'
              ])
            : '')
      ];
    },
    prayer: function () {
      var adj = A.PRAYERS.slice(0, 1)
        .concat(['sunrise'])
        .concat(A.PRAYERS.slice(1))
        .map(function (k) {
          return row(
            (k === 'sunrise' ? 'Sunrise' : P.NAMES[k]) + ' adjustment',
            'Minutes',
            A.stepper((S.calc.adj[k] > 0 ? '+' : '') + S.calc.adj[k], 'adj', ' data-k="' + k + '"')
          );
        });
      return [
        'Prayer times',
        group('', [
          '<a class="set" href="#/location"><div class="grow"><div class="t">Location</div><div class="s">' +
            (S.loc ? esc(S.loc.name) : 'Not set') +
            '</div></div>' +
            ic('right', 's') +
            '</a>',
          row('Choose method automatically', 'From your country', A.sw(S.calc.auto, 'calc-auto')),
          row('Calculation method', '', pick('pick-method', P.METHODS[S.calc.method].name)),
          row('ʿAṣr', 'Shadow length', pick('pick-asr', S.calc.asr === 'hanafi' ? 'Ḥanafī (×2)' : 'Standard (×1)')),
          row(
            'High latitudes',
            'For places where twilight persists',
            pick(
              'pick-highlat',
              HIGHLAT.filter(function (x) {
                return x.v === S.calc.highLat;
              })[0].t
            )
          ),
          row(
            'Follow me when I travel',
            'Updates a GPS location when you are 25 km away',
            A.sw(S.prefs.autoLoc, 'pref', ' data-k="autoLoc"')
          )
        ]) +
          group(
            'Travel',
            [
              row(
                'Home',
                S.travel.home ? esc(S.travel.home.name) : 'Not set',
                S.loc ? '<button type="button" class="btn sec sm" data-a="travel-home">Use current</button>' : ''
              ),
              row('Travel reminders', 'Shorten and combine when away', A.sw(S.travel.on, 'travel-on'))
            ].concat(
              S.travel.on
                ? [
                    row(
                      'Distance from home',
                      'Scholars differ; many hold about 80 km',
                      A.stepper(S.travel.km + ' km', 'travel-km')
                    )
                  ]
                : []
            )
          ) +
          group(
            'Iqāmah at your masjid',
            [row('Use iqāmah times', '', A.sw(S.iqama.on, 'iqama-on'))].concat(
              S.iqama.on
                ? A.PRAYERS.map(function (k) {
                    return row(
                      P.NAMES[k],
                      'Minutes after the adhān',
                      A.stepper(S.iqama[k], 'iqama-step', ' data-k="' + k + '"')
                    );
                  })
                : []
            )
          ) +
          group('Fine-tune', adj) +
          '<p class="faint" style="font-size:12px;line-height:1.55;margin:4px 6px">Where your masjid differs, follow your masjid.</p>'
      ];
    },
    notifications: function () {
      var N = S.notif,
        en = N.enabled,
        ns = A.N.notifState();
      var warn =
        ns && ns.exact === false
          ? '<div class="rd-note">' +
            ic('info', 's') +
            '<div>Reminders may arrive a few minutes late. <button type="button" class="gold" style="font-weight:800" data-a="os-settings" data-w="exact">Allow</button></div></div>'
          : '';
      var rows = [row('Reminders', en ? 'On' : 'Allow notifications to begin', A.sw(en, 'notif-master'))];
      if (en && A.N.call('batteryOk') === false)
        warn +=
          '<div class="rd-note">' +
          ic('alarm', 's') +
          '<div>Battery saving may delay reminders. <button type="button" class="gold" style="font-weight:800" data-a="ob-battery">Fix</button></div></div>';
      if (!en) return ['Reminders', group('', rows) + warn];
      var pr = A.PRAYERS.map(function (k) {
        return row(P.NAMES[k], '', A.sw(N.prayers[k], 'notif-prayer', ' data-k="' + k + '"'));
      });
      pr.unshift(
        row(
          'Adhān at prayer time',
          N.adhan ? 'Allāhu akbar, Allāhu akbar · Madinah' : 'A soft tap',
          (A.N.has
            ? '<button type="button" class="ib ghost sm" data-a="adhan-hear" aria-label="Hear it">' +
              ic('play', 's') +
              '</button>'
            : '') + A.sw(N.adhan, 'notif-adhan')
        )
      );
      pr.push(row('Heads-up before each prayer', 'Minutes before', pick('pick-pre', N.pre ? N.pre + ' min' : 'Off')));
      return [
        'Reminders',
        group('', rows) +
          warn +
          group('Prayers', pr) +
          group('Adhkār', [
            row(
              'Morning adhkār',
              N.morning.after + ' min after ' + (N.morning.from === 'sunrise' ? 'sunrise' : 'Fajr'),
              A.stepper(N.morning.after, 'notif-after', ' data-k="morning"') +
                A.sw(N.morning.on, 'notif-on', ' data-k="morning"')
            ),
            row(
              'Evening adhkār',
              N.evening.after + ' min after ' + (N.evening.from === 'maghrib' ? 'Maghrib' : 'ʿAṣr'),
              A.stepper(N.evening.after, 'notif-after', ' data-k="evening"') +
                A.sw(N.evening.on, 'notif-on', ' data-k="evening"')
            ),
            row(
              'Before sleep',
              'At ' + N.sleep.at,
              '<input type="time" class="input time" value="' +
                N.sleep.at +
                '" data-sleep-at aria-label="Sleep reminder time">' +
                A.sw(N.sleep.on, 'notif-on', ' data-k="sleep"')
            ),
            row(
              'Morning time begins',
              'Scholars differ',
              '<div class="seg sm">' +
                [
                  ['fajr', 'Fajr'],
                  ['sunrise', 'Sunrise']
                ]
                  .map(function (x) {
                    return (
                      '<button type="button" data-a="notif-from" data-k="morning" data-v="' +
                      x[0] +
                      '" aria-pressed="' +
                      ((N.morning.from || 'fajr') === x[0]) +
                      '">' +
                      x[1] +
                      '</button>'
                    );
                  })
                  .join('') +
                '</div>'
            ),
            row(
              'Evening time begins',
              'Scholars differ',
              '<div class="seg sm">' +
                [
                  ['asr', 'ʿAṣr'],
                  ['maghrib', 'Maghrib']
                ]
                  .map(function (x) {
                    return (
                      '<button type="button" data-a="notif-from" data-k="evening" data-v="' +
                      x[0] +
                      '" aria-pressed="' +
                      ((N.evening.from || 'asr') === x[0]) +
                      '">' +
                      x[1] +
                      '</button>'
                    );
                  })
                  .join('') +
                '</div>'
            ),
            row('Skip if already done', 'No reminder for a session you have completed', A.sw(N.smart, 'notif-smart'))
          ]) +
          group(
            'On-screen dhikr',
            [
              row(
                'A gentle reminder while the app is open',
                'A short dhikr slides up; tap to count it',
                A.sw(S.prefs.nudge.on, 'nudge-on')
              )
            ].concat(
              S.prefs.nudge.on
                ? [
                    row(
                      'Every',
                      '',
                      '<div class="seg sm">' +
                        [10, 20, 30, 60]
                          .map(function (m) {
                            return (
                              '<button type="button" data-a="nudge-every" data-v="' +
                              m +
                              '" aria-pressed="' +
                              (S.prefs.nudge.every === m) +
                              '">' +
                              m +
                              ' min</button>'
                            );
                          })
                          .join('') +
                        '</div>'
                    ),
                    '<button type="button" class="set" data-a="nudge-test"><div class="grow"><div class="t">Show one now</div></div>' +
                      ic('right', 's') +
                      '</button>'
                  ].concat(
                    A.N.has
                      ? [
                          row(
                            'Also over other apps',
                            A.N.call('overlayOk') === false && S.prefs.nudge.over
                              ? 'Allow “Display over other apps” to start'
                              : 'From Fajr until an hour after ʿIshāʾ',
                            A.sw(S.prefs.nudge.over, 'nudge-over')
                          )
                        ]
                      : []
                  )
                : []
            )
          ) +
          group(
            'During ṣalāh',
            A.N.has
              ? [
                  row('Silence my phone', 'From the iqāmah. Alarms still ring.', A.sw(S.silence.on, 'silence-on'))
                ].concat(
                  S.silence.on
                    ? [
                        A.N.call('dndOk') === false
                          ? '<button type="button" class="set" data-a="dnd-access"><span class="badge h-sand">' +
                            ic('shield', 's') +
                            '</span><div class="grow"><div class="t">Allow Do Not Disturb access</div><div class="s">One-time permission</div></div>' +
                            ic('right', 's') +
                            '</button>'
                          : '',
                        row('For', 'Minutes from the iqāmah', A.stepper(S.silence.min, 'silence-min')),
                        row(
                          'On Friday at Ḍhuhr',
                          'Jumuʿah: khuṭbah and prayer',
                          A.stepper(S.silence.jumuah, 'silence-jum')
                        )
                      ].filter(Boolean)
                    : []
                )
              : [row('Silence my phone', 'Available in the Android app', '')]
          ) +
          group('Sunnah', [
            row('Ḍuḥā window opens', '', A.sw(N.duha.on, 'notif-on', ' data-k="duha"')),
            row(
              'Last third of the night',
              S.loc ? 'At ' + A.fmtTxt(A.thirdWake(A.pday(A.today()))) + ' · change on the Night page' : '',
              A.sw(N.night.on, 'notif-on', ' data-k="night"')
            ),
            row(
              'Jumuʿah',
              'Al-Kahf in the morning, the hour of response before Maghrib',
              A.sw(N.friday.on, 'notif-on', ' data-k="friday"')
            )
          ])
      ];
    },
    device: function () {
      if (!A.N.has)
        return [
          'Widgets & device',
          '<div class="empty card"><div class="badge h-teal">' +
            ic('widget') +
            '</div><h3>Available in the Android app</h3><p>Home-screen widgets, quick-settings tile, app shortcuts, volume-key counting and native reminders come with the installed app.</p></div>'
        ];
      return [
        'Widgets & device',
        group('Home screen', [
          '<button type="button" class="set" data-a="pin-widget" data-w="prayer"><span class="badge h-jade">' +
            ic('mosque', 's') +
            '</span><div class="grow"><div class="t">Prayer widget</div><div class="s">Countdown and today’s times</div></div>' +
            ic('plus', 's') +
            '</button>',
          '<button type="button" class="set" data-a="pin-widget" data-w="tasbih"><span class="badge h-teal">' +
            ic('tracker', 's') +
            '</span><div class="grow"><div class="t">Tracker widget</div><div class="s">Count from your home screen</div></div>' +
            ic('plus', 's') +
            '</button>',
          '<button type="button" class="set" data-a="pin-widget" data-w="adhkar"><span class="badge h-gold">' +
            ic('sun', 's') +
            '</span><div class="grow"><div class="t">Adhkār widget</div><div class="s">Whichever is due, with progress</div></div>' +
            ic('plus', 's') +
            '</button>',
          '<button type="button" class="set" data-a="pin-widget" data-w="dhikr"><span class="badge h-indigo">' +
            ic('spark', 's') +
            '</span><div class="grow"><div class="t">Dhikr of the day widget</div><div class="s">Glows at the times duʿāʾ is answered</div></div>' +
            ic('plus', 's') +
            '</button>'
        ]) +
          group('Shortcuts', [
            row('Quick settings tile', 'Swipe down twice → edit tiles → add “Tracker”', ''),
            row('App shortcuts', 'Long-press the app icon for Morning, Evening, Tracker and Qibla', '')
          ]) +
          group('Feedback', [
            row('Haptics', '', swPref('haptics')),
            row('Volume keys count', '', swPref('volKeys')),
            '<button type="button" class="set" data-a="haptic-test"><div class="grow"><div class="t">Test haptics</div></div>' +
              ic('vib', 's') +
              '</button>'
          ])
      ];
    },
    data: function () {
      return [
        'Backup & data',
        group('', [
          '<button type="button" class="set" data-a="export"><span class="badge h-jade">' +
            ic('download', 's') +
            '</span><div class="grow"><div class="t">Export backup</div><div class="s">Save everything to a file</div></div></button>',
          '<button type="button" class="set" data-a="import"><span class="badge h-teal">' +
            ic('upload', 's') +
            '</span><div class="grow"><div class="t">Import backup</div><div class="s">From a backup file</div></div></button>',
          '<button type="button" class="set" data-a="wipe"><span class="badge" style="--h:var(--bad)">' +
            ic('trash', 's') +
            '</span><div class="grow"><div class="t" style="color:var(--bad)">Erase all data</div><div class="s">Counts, logs, profile and settings</div></div></button>'
        ]) +
          '' +
          (A.storageOk
            ? ''
            : '<div class="rd-note">' +
              ic('info', 's') +
              '<div>Storage is blocked here, so progress will be lost when the page closes.</div></div>')
      ];
    },
    about: function () {
      var m = window.DATA.meta;
      return [
        'About',
        '<div class="card col" style="align-items:center;text-align:center;padding:24px">' +
          A.rosette(88) +
          '<div class="serif" style="font-size:30px">Adhkār</div><div class="faint" style="font-size:12px;font-weight:700">Version ' +
          esc(A.N.has ? A.N.version() : (window.APP_VERSION || 'dev') + ' · web') +
          '</div><p class="muted" style="font-size:13.5px;line-height:1.6">Morning and evening adhkār, remembrance after prayer and before sleep, prayer times, qibla, the night and Ḍuḥā, beautifully, privately, offline.</p></div>' +
          group('Contact', [
            '<a class="set" href="mailto:bashyr18@gmail.com?subject=' +
              encodeURIComponent('Adhkār feedback (v' + (A.N.has ? A.N.version() : 'web') + ')') +
              '" data-a="ext"><span class="badge h-gold">' +
              ic('mail', 's') +
              '</span><div class="grow"><div class="t">Feedback and suggestions</div><div class="s">bashyr18@gmail.com</div></div>' +
              ic('link', 's') +
              '</a>'
          ]) +
          group('Sources', [
            '<a class="set" href="https://hisnmuslim.com" data-a="ext"><div class="grow"><div class="t">Ḥiṣn al-Muslim</div><div class="s">Saʿīd al-Qaḥṭānī</div></div>' +
              ic('link', 's') +
              '</a>',
            '<a class="set" href="https://sunnah.com" data-a="ext"><div class="grow"><div class="t">Sunnah.com</div><div class="s">Hadith references</div></div>' +
              ic('link', 's') +
              '</a>',
            '<a class="set" href="https://quran.com" data-a="ext"><div class="grow"><div class="t">Quran.com</div><div class="s">Qurʾānic passages</div></div>' +
              ic('link', 's') +
              '</a>'
          ]) +
          '<div class="card"><div class="eyebrow">Please note</div><p class="muted small" style="margin-top:8px">Transliteration and meanings are aids. Learn the wording from a teacher.</p></div>' +
          '<div class="card col"><div class="eyebrow">Privacy</div><p class="muted small">No accounts, ads or tracking. Everything stays on your phone.</p></div>'
      ];
    }
  });
  A.V.settings = function (a) {
    var sec = SECTIONS[a[0]] ? a[0] : 'appearance',
      r = SECTIONS[sec]();
    return {
      html:
        A.back('Profile', '#/profile') +
        '<header class="top"><div class="tt"><h1>' +
        r[0] +
        '</h1></div></header>' +
        r[1],
      title: r[0],
      tab: 4,
      mount: function (el) {
        var t = $('[data-sleep-at]', el);
        if (t)
          t.addEventListener('change', function () {
            if (/^\d{2}:\d{2}$/.test(t.value)) {
              S.notif.sleep.at = t.value;
              A.save();
              A.rerender();
            }
          });
      }
    };
  };
  A.acts['pick-theme'] = function () {
    A.options('Theme', THEMES, S.prefs.theme, function (v) {
      S.prefs.theme = v;
      A.save();
      A.applyTheme();
      A.rerender();
    });
  };
  A.acts['pick-method'] = function () {
    A.options(
      'Calculation method',
      Object.keys(P.METHODS).map(function (k) {
        var m = P.METHODS[k];
        return {
          v: k,
          t: m.name,
          s: 'Fajr ' + m.fajr + '° · ʿIshāʾ ' + (m.ishaMin ? m.ishaMin + ' min' : m.isha + '°')
        };
      }),
      S.calc.method,
      function (v) {
        S.calc.method = v;
        S.calc.auto = false;
        A.save(true);
        A.rerender();
      }
    );
  };
  A.acts['pick-asr'] = function () {
    A.options(
      'ʿAṣr',
      [
        { v: 'std', t: 'Standard', s: 'Shāfiʿī, Mālikī, Ḥanbalī: shadow equals the object' },
        { v: 'hanafi', t: 'Ḥanafī', s: 'Shadow twice the object' }
      ],
      S.calc.asr,
      function (v) {
        S.calc.asr = v;
        S.calc.auto = false;
        A.save(true);
        A.rerender();
      }
    );
  };
  A.acts['pick-highlat'] = function () {
    A.options('High latitudes', HIGHLAT, S.calc.highLat, function (v) {
      S.calc.highLat = v;
      A.save(true);
      A.rerender();
    });
  };
  A.acts['calc-auto'] = function () {
    S.calc.auto = !S.calc.auto;
    if (S.calc.auto && S.loc) A.setLocation(S.loc, true);
    A.save(true);
    A.rerender();
  };
  A.acts.adj = function (el) {
    var k = el.dataset.k;
    S.calc.adj[k] = A.clamp((S.calc.adj[k] | 0) + +el.dataset.d, -30, 30);
    A.save();
    A.rerender();
  };
  A.acts['hijri-adj'] = function (el) {
    S.prefs.hijriAdj = A.clamp(S.prefs.hijriAdj + +el.dataset.d, -2, 2);
    A.save();
    A.rerender();
  };
  A.acts['notif-master'] = function () {
    if (S.notif.enabled) {
      S.notif.enabled = false;
      A.save(true);
      A.rerender();
    } else
      A.enableNotifs(function () {
        A.rerender();
      });
  };
  A.acts['notif-adhan'] = function () {
    S.notif.adhan = !S.notif.adhan;
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['adhan-hear'] = function (el) {
    var on = A.N.call('previewAdhan') === true;
    el.innerHTML = ic(on ? 'pause' : 'play', 's');
    window.__native = window.__native || {};
    __native.onAdhanEnd = function () {
      var b = document.querySelector('[data-a="adhan-hear"]');
      if (b) b.innerHTML = ic('play', 's');
    };
  };
  A.acts['notif-prayer'] = function (el) {
    var k = el.dataset.k;
    S.notif.prayers[k] = !S.notif.prayers[k];
    A.save();
    el.setAttribute('aria-checked', S.notif.prayers[k]);
    A.N.haptic('tick');
  };
  A.acts['notif-on'] = function (el) {
    var o = S.notif[el.dataset.k];
    o.on = !o.on;
    A.save();
    el.setAttribute('aria-checked', o.on);
    A.N.haptic('tick');
  };
  A.acts['notif-smart'] = function (el) {
    S.notif.smart = !S.notif.smart;
    A.save();
    el.setAttribute('aria-checked', S.notif.smart);
  };
  A.acts['notif-after'] = function (el) {
    var o = S.notif[el.dataset.k];
    o.after = A.clamp(o.after + +el.dataset.d * 5, 0, 180);
    A.save();
    A.rerender();
  };
  A.acts['pick-pre'] = function () {
    A.options(
      'Heads-up before prayer',
      [0, 5, 10, 15, 20, 30].map(function (m) {
        return { v: m, t: m ? m + ' minutes before' : 'Off' };
      }),
      S.notif.pre,
      function (v) {
        S.notif.pre = +v;
        A.save();
        A.rerender();
      }
    );
  };
  A.acts['os-settings'] = function (el) {
    A.N.openSettings(el.dataset.w);
  };
  A.acts['haptic-test'] = function () {
    A.N.haptic('tick');
    setTimeout(function () {
      A.N.haptic('click');
    }, 300);
    setTimeout(function () {
      A.N.haptic('success');
    }, 700);
  };
  A.acts.export = function () {
    var d = A.today();
    A.N.exportFile('adhkar-backup-' + d + '.json', A.exportJSON());
    if (!A.N.has) A.toast('Backup downloaded', 'download');
  };
  A.acts.import = function () {
    A.N.importFile();
  };
  window.__native.onImport = function (text) {
    try {
      A.importJSON(text);
      S.profile.onboarded = true;
      A.save(true);
      A.applyTheme();
      if (A.applyLang) A.applyLang();
      A.toast('Backup restored', 'check');
      A.go('#/profile');
      A.rerender();
    } catch (e) {
      A.toast('That file is not an Adhkār backup');
    }
  };
  window.__native.onExported = function (ok) {
    A.toast(ok ? 'Backup saved' : 'Backup not saved', ok ? 'download' : null);
  };
  A.acts.wipe = function () {
    A.confirm(
      'Erase everything?',
      'All counts, logs, saved items, your profile and settings on this device will be erased. This cannot be undone.',
      'Erase',
      function () {
        A.reset();
        A.applyTheme();
        A.go('#/welcome');
      },
      true
    );
  };

  /* ================= onboarding =================
     Calm scenes: welcome, name, about you, location, reminders, a short practice of counting on the fingers,
     recitations, ready. Each scene has its own glow,
     content enters in a gentle stagger, and the name step compacts above the keyboard. */
  var ob = { step: 0 },
    OB_STEPS = ['Name', 'About you', 'Location', 'Reminders', 'Counting', 'Recitations', 'Ready'],
    OB_GLOW = ['gold', 'gold', 'rose', 'jade', 'sapphire', 'jade', 'gold', 'gold'];
  /* the recitations step is only offered where audio can be downloaded (the app, not a browser) */
  var obSkip = function (n) {
    return n === 6 && !(A.audio && A.audio.ok() && !A.audio.web);
  };
  A.obNext = function () {
    ob.step = Math.min(7, ob.step + 1);
    if (obSkip(ob.step)) ob.step++;
    A.N.haptic('tick');
    A.rerender();
  };
  function obHead(n, icon, title, lead) {
    return (
      '<div class="ob-top"><button type="button" class="back" data-a="ob-back">' +
      ic('left', 's') +
      'Back</button><div class="steps" aria-label="Step ' +
      n +
      ' of ' +
      OB_STEPS.length +
      '">' +
      OB_STEPS.map(function (l, i) {
        return '<i class="' + (i < n ? 'on' : '') + (i === n - 1 ? ' cur' : '') + '"></i>';
      }).join('') +
      '</div></div>' +
      '<div class="ob-medal" aria-hidden="true"><i class="ring"></i>' +
      ic(icon) +
      '</div><div class="eyebrow">' +
      OB_STEPS[n - 1] +
      '</div><h1>' +
      title +
      '</h1>' +
      (lead ? '<p class="lead">' + lead + '</p>' : '')
    );
  }
  function greet(name) {
    var n = (name || '').trim().split(/\s+/)[0];
    return 'Assalāmu ʿalaykum' + (n ? ', <b>' + esc(n) + '</b>' : '');
  }
  function batteryCard() {
    var ns = A.N.notifState(),
      st = A.N.call('batteryOk'),
      h = '';
    if (ns && ns.exact === false)
      h +=
        '<button type="button" class="card row ob-batt" data-a="os-settings" data-w="exact"><span class="badge h-gold">' +
        ic('clock', 's') +
        '</span><div class="grow"><div style="font-weight:700">Allow exact timing</div><div class="muted small">So reminders come at the minute</div></div>' +
        ic('right', 's') +
        '</button>';
    if (st !== false) return h;
    return h + batteryRow();
  }
  function batteryRow() {
    return (
      '<button type="button" class="card row ob-batt" data-a="ob-battery"><span class="badge h-sand">' +
      ic('alarm', 's') +
      '</span><div class="grow"><div style="font-weight:700">Let reminders arrive on time</div><div class="muted small">Turn off battery saving for Adhkār</div></div>' +
      ic('right', 's') +
      '</button>'
    );
  }
  A.V.welcome = function () {
    if (S.profile.onboarded) return { redirect: '#/' };
    var st = ob.step,
      h = '',
      W = window.DATA.welcome;
    var bg = '<div class="ob-bg g-' + OB_GLOW[st] + '" aria-hidden="true"><i></i><i></i><i></i></div>';
    if (st === 0) {
      h =
        '<div class="ob ob-hero">' +
        bg +
        '<div class="ob-lang"><button type="button" class="chip no-tr" data-a="lang" data-v="' +
        (A.ar() ? 'en' : 'ar') +
        '">' +
        (A.ar() ? 'English' : 'العربية') +
        '</button></div><div class="hero"><div class="logo">' +
        A.rosette(150) +
        '</div><div class="mushaf" style="padding:0"><p class="ayat ob-ayah"><span class="ay">' +
        esc(W.ar) +
        '</span></p></div><h1>Hearts find rest in the <em>remembrance</em> of Allah</h1><p class="faint small">Ar-Raʿd 13:28</p><div class="ob-pills"><span class="chip">' +
        ic('book', 'xs') +
        'Adhkār</span><span class="chip">' +
        ic('mosque', 'xs') +
        'Prayer times</span><span class="chip">' +
        ic('compass', 'xs') +
        'Qibla</span><span class="chip">' +
        ic('shield', 'xs') +
        'Private</span></div></div><div class="foot"><button type="button" class="btn pri wide" data-a="ob-next">Bismillāh, let us begin</button><button type="button" class="btn ghost" data-a="import">Restore a backup</button></div></div>';
    } else if (st === 1) {
      h =
        '<div class="ob">' +
        bg +
        obHead(1, 'user', 'What should we <em>call you?</em>', '') +
        '<div class="ob-name"><div class="ob-preview"><span class="ob-ini" id="obIni">' +
        esc(((S.profile.name || '').trim()[0] || '').toUpperCase()) +
        '</span><span id="obHi">' +
        greet(S.profile.name) +
        '</span></div>' +
        '<label class="obfield"><input id="obName" maxlength="40" placeholder=" " value="' +
        esc(S.profile.name) +
        '" autocomplete="given-name" autocapitalize="words" enterkeyhint="next"><span>Your name</span></label></div>' +
        '<div class="foot"><button type="button" class="btn pri wide" data-a="ob-name">Continue</button><button type="button" class="btn ghost" data-a="ob-next">Skip</button></div></div>';
    } else if (st === 2) {
      var g = S.profile.gender;
      h =
        '<div class="ob">' +
        bg +
        obHead(2, 'heart', 'A little <em>about you</em>', 'You can change this later.') +
        '<div class="col" style="gap:12px">' +
        '<div class="grid2"><button type="button" class="choice' +
        (g === 'm' ? ' on' : '') +
        '" data-a="ob-gender" data-v="m" aria-pressed="' +
        (g === 'm') +
        '"><span class="badge h-jade">' +
        ic('user') +
        '</span><b>Brother</b><span>Prayer tracking every day</span><i class="tick">' +
        ic('check', 'xs') +
        '</i></button><button type="button" class="choice' +
        (g === 'f' ? ' on' : '') +
        '" data-a="ob-gender" data-v="f" aria-pressed="' +
        (g === 'f') +
        '"><span class="badge h-rose">' +
        ic('user') +
        '</span><b>Sister</b><span>Includes break days</span><i class="tick">' +
        ic('check', 'xs') +
        '</i></button></div>' +
        (g === 'f'
          ? '<div class="card col h-rose glowcard ob-reveal"><div class="row"><span class="badge s">' +
            ic('moonstar', 's') +
            '</span><div class="grow"><div style="font-weight:700">Break from ṣalāh</div><div class="muted small">For the days you are not praying. Switch it on from Today or the Ṣalāh tab.</div></div></div><div class="ob-list"><div>' +
            ic('check', 'xs') +
            'Prayer tracking and prayer reminders pause</div><div>' +
            ic('check', 'xs') +
            'Your streak is protected, never broken</div><div>' +
            ic('check', 'xs') +
            'Adhkār, duʿāʾ and dhikr continue as normal</div><div>' +
            ic('check', 'xs') +
            'Missed Ramaḍān fasts are counted for making up</div></div></div>'
          : '') +
        '</div><div class="foot"><button type="button" class="btn pri wide" data-a="ob-next"' +
        (g ? '' : ' disabled') +
        '>Continue</button><button type="button" class="btn ghost" data-a="ob-gender" data-v="x">Prefer not to say</button></div></div>';
    } else if (st === 3) {
      var t = S.loc ? A.pday(A.today()) : null;
      h =
        '<div class="ob">' +
        bg +
        obHead(3, 'pin', 'Where do you <em>pray?</em>', 'For prayer times and the qibla.') +
        '<div class="col" style="gap:14px">' +
        (S.loc
          ? '<div class="card col ob-place ob-reveal"><div class="row"><div class="badge h-jade">' +
            ic('check') +
            '</div><div class="grow"><div style="font-weight:700">' +
            esc(S.loc.name) +
            '</div><div class="faint small">' +
            esc(P.METHODS[S.calc.method].name) +
            '</div></div></div>' +
            (t
              ? '<div class="ob-times">' +
                [
                  ['Fajr', t.fajr],
                  ['Ḍhuhr', t.dhuhr],
                  ['ʿAṣr', t.asr],
                  ['Maghrib', t.maghrib],
                  ['ʿIshāʾ', t.isha]
                ]
                  .map(function (x) {
                    return '<div><span>' + x[0] + '</span><b>' + A.fmtT(x[1]) + '</b></div>';
                  })
                  .join('') +
                '</div>'
              : '') +
            '</div>'
          : '') +
        '<button type="button" class="btn ' +
        (S.loc ? 'sec' : 'pri') +
        ' wide" data-a="ob-locate">' +
        ic('locate', 's') +
        (S.loc ? 'Update to my current location' : 'Use my current location') +
        '</button><label class="search">' +
        ic('search', 's') +
        '<input id="obq" type="search" placeholder="Or search ' +
        window.CITIES.length +
        ' cities" aria-label="Search cities" enterkeyhint="search"></label><div class="card pad0 cities"><div class="list" id="obl">' +
        A.cityList('', true) +
        '</div></div></div><div class="foot"><button type="button" class="btn ' +
        (S.loc ? 'pri' : 'ghost') +
        ' wide" data-a="ob-next">' +
        (S.loc ? 'Continue' : 'Skip for now') +
        '</button></div></div>';
    } else if (st === 4) {
      var N = S.notif;
      h =
        '<div class="ob">' +
        bg +
        obHead(4, 'bell', 'Gentle <em>reminders</em>', 'A nudge at the right moments, nothing more.') +
        '<div class="col" style="gap:12px"><div class="ob-notif" aria-hidden="true"><span class="badge s h-gold">' +
        ic('mosque', 's') +
        '</span><div class="grow"><b>ʿAṣr</b><span>Time for ʿAṣr' +
        (S.loc ? ' in ' + esc(S.loc.name) : '') +
        '</span></div><span class="faint small">now</span></div><div class="card pad0"><div class="list">' +
        row(
          'Prayer times',
          S.profile.gender === 'f' ? 'Paused automatically on break days' : 'All five prayers',
          A.sw(true, 'noop')
        ) +
        row('Morning adhkār', N.morning.after + ' min after Fajr', A.sw(N.morning.on, 'ob-tog', ' data-k="morning"')) +
        row('Evening adhkār', N.evening.after + ' min after ʿAṣr', A.sw(N.evening.on, 'ob-tog', ' data-k="evening"')) +
        row('Jumuʿah', 'Al-Kahf and ṣalawāt', A.sw(N.friday.on, 'ob-tog', ' data-k="friday"')) +
        '</div></div>' +
        (S.notif.enabled ? batteryCard() : '') +
        '</div><div class="foot">' +
        (S.notif.enabled
          ? '<button type="button" class="btn pri wide" data-a="ob-next">Continue</button>'
          : '<button type="button" class="btn pri wide" data-a="ob-notif">' +
            ic('bell', 's') +
            'Turn on reminders</button><button type="button" class="btn ghost" data-a="ob-next">Not now</button>') +
        '</div></div>';
    } else if (st === 5) {
      /* counting on the fingers, practised once with the real circle */
      h =
        '<div class="ob ob-count">' +
        bg +
        obHead(5, 'hands', 'Count on your <em>fingers</em>', '') +
        A.pace.tourHtml(true) +
        '<div class="foot"><button type="button" class="btn ghost wide" data-a="ob-next">' +
        A.T(S.hints.countTut ? 'Continue' : 'Skip for now') +
        '</button></div></div>';
    } else if (st === 6) {
      var miss = A.audio.missing(),
        all = A.audio.all();
      h =
        '<div class="ob">' +
        bg +
        obHead(
          6,
          'play',
          'Hear every dhikr',
          'Download the recitations once and they play offline, with Learn mode to repeat after them.'
        ) +
        '<div class="col" style="gap:12px">' +
        '<div class="card col ob-au"><div class="row"><span class="badge s h-gold">' +
        ic('download', 's') +
        '</span><div class="grow"><div style="font-weight:700">' +
        (miss.length
          ? A.plural(miss.length, 'recording') + ' · ' + A.audio.mb(A.audio.bytes(miss))
          : A.T('Every recitation is on your phone')) +
        '</div><div class="muted small">Ḥiṣn al-Muslim recordings · Qurʾān by Mishary al-ʿAfāsī</div></div>' +
        (miss.length ? '' : ic('check', 's')) +
        '</div>' +
        '<div class="au-dl ob-au-bar" data-au-all><i style="width:' +
        Math.round(((all.length - miss.length) / Math.max(1, all.length)) * 100) +
        '%"></i></div><div class="faint small" data-au-all-t>' +
        (miss.length ? A.T('Best on Wi-Fi') : '') +
        '</div></div></div>' +
        '<div class="foot">' +
        (miss.length
          ? '<button type="button" class="btn pri wide" data-a="ob-audio">' +
            ic('download', 's') +
            A.T('Download all') +
            '</button><button type="button" class="btn ghost" data-a="ob-next">' +
            A.T('Later') +
            '</button>'
          : '<button type="button" class="btn pri wide" data-a="ob-next">Continue</button>') +
        '</div></div>';
    } else {
      var nm = (S.profile.name || '').trim().split(/\s+/)[0];
      h =
        '<div class="ob ob-ready">' +
        bg +
        '<div class="hero"><div class="logo">' +
        A.rosette(132) +
        '</div><div class="eyebrow">All set</div><h1>' +
        (nm ? 'Bismillāh, <em>' + esc(nm) + '</em>' : '<em>Bismillāh</em>') +
        '</h1><p class="lead">May Allah make remembrance light on your tongue and heavy on your scale.</p>' +
        '<div class="ob-sum">' +
        [
          ['pin', S.loc ? S.loc.name : 'Location not set'],
          ['mosque', P.METHODS[S.calc.method].name],
          ['bell', S.notif.enabled ? 'Reminders on' : 'Reminders off']
        ]
          .map(function (x, i) {
            return '<div style="--i:' + i + '">' + ic(x[0], 's') + '<span>' + esc(x[1]) + '</span></div>';
          })
          .join('') +
        '</div></div>' +
        '<div class="foot"><button type="button" class="btn pri wide" data-a="ob-done">Enter Adhkār</button></div></div>';
    }
    return {
      html: h,
      title: 'Welcome',
      bare: true,
      mount: function (el) {
        /* the glow lives on the page itself so nothing clips it; it carries over between scenes */
        var glow = $('.ob-bg', el),
          old = document.querySelector('body > .ob-bg');
        if (glow) {
          if (old) {
            old.className = glow.className;
            glow.remove();
          } else document.body.appendChild(glow);
        }
        var q = $('#obq', el);
        if (q)
          q.addEventListener(
            'input',
            A.debounce(function () {
              $('#obl', el).innerHTML = A.cityList(q.value, true);
            }, 100)
          );
        var nm = $('#obName', el),
          box = $('.ob', el);
        if (nm) {
          var live = function () {
            var v = nm.value;
            $('#obHi', el).innerHTML = greet(v);
            $('#obIni', el).textContent = (v.trim()[0] || '').toUpperCase();
            box.classList.toggle('named', !!v.trim());
          };
          nm.addEventListener('input', live);
          live();
          nm.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              A.acts['ob-name']();
            }
          });
        }
        /* keyboard: compact the scene so the field and Continue stay in view */
        $$('input', el).forEach(function (i) {
          i.addEventListener('focus', function () {
            box.classList.add('kb');
            setTimeout(function () {
              i.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 320);
          });
          i.addEventListener('blur', function () {
            setTimeout(function () {
              if (!el.contains(document.activeElement) || document.activeElement.tagName !== 'INPUT')
                box.classList.remove('kb');
            }, 120);
          });
        });
        if (nm && !nm.value)
          setTimeout(function () {
            nm.focus();
          }, 450);
        if ($('.ct', el)) A.pace.tourMount(el, A.obNext, 'Continue');
      }
    };
  };
  A.acts['ob-next'] = function () {
    A.obNext();
  };
  A.acts['ob-back'] = function () {
    ob.step = Math.max(0, ob.step - 1);
    if (obSkip(ob.step)) ob.step--;
    A.rerender();
  };
  /* downloads carry on in the background; you can continue at once */
  A.acts['ob-audio'] = function (el) {
    el.disabled = true;
    el.innerHTML = '<span class="spin"></span>' + A.T('Downloading');
    var g = el.nextElementSibling;
    if (g) g.textContent = A.T('Continue');
    A.audio.getAll(function () {
      if (ob.step === 6 && document.querySelector('.ob-au')) A.rerender();
    });
  };
  A.acts['ob-name'] = function () {
    var i = $('#obName');
    S.profile.name = ((i && i.value) || '').trim().slice(0, 40);
    A.save();
    if (i) i.blur();
    A.obNext();
  };
  A.acts['ob-gender'] = function (el) {
    S.profile.gender = el.dataset.v === 'x' ? '' : el.dataset.v;
    A.save();
    A.N.haptic('tick');
    if (el.dataset.v === 'x') A.obNext();
    else A.rerender();
  };
  A.acts['ob-locate'] = function (el) {
    el.innerHTML = '<span class="spin"></span>Locating…';
    A.locateMe(function () {
      A.rerender();
    });
  };
  A.acts['ob-tog'] = function (el) {
    var o = S.notif[el.dataset.k];
    o.on = !o.on;
    el.setAttribute('aria-checked', o.on);
    A.N.haptic('tick');
  };
  A.acts['silence-on'] = function () {
    S.silence.on = !S.silence.on;
    A.save();
    A.N.haptic('tick');
    if (S.silence.on && A.N.call('dndOk') === false) A.N.call('openDndAccess');
    A.rerender();
  };
  A.acts['dnd-access'] = function () {
    A.N.call('openDndAccess');
  };
  A.acts['silence-min'] = function (el) {
    S.silence.min = A.clamp(S.silence.min + +el.dataset.d * 5, 5, 90);
    A.save();
    A.rerender();
  };
  A.acts['silence-jum'] = function (el) {
    S.silence.jumuah = A.clamp(S.silence.jumuah + +el.dataset.d * 5, 15, 120);
    A.save();
    A.rerender();
  };
  A.acts['travel-home'] = function () {
    if (!S.loc) return;
    S.travel.home = { name: S.loc.name, lat: S.loc.lat, lng: S.loc.lng };
    A.save();
    A.N.haptic('success');
    A.toast('Home set to ' + S.loc.name, 'pin');
    A.rerender();
  };
  A.acts['travel-on'] = function () {
    S.travel.on = !S.travel.on;
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['travel-km'] = function (el) {
    S.travel.km = A.clamp(S.travel.km + +el.dataset.d * 5, 40, 200);
    A.save();
    A.rerender();
  };
  A.acts['nudge-on'] = function () {
    S.prefs.nudge.on = !S.prefs.nudge.on;
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['nudge-every'] = function (el) {
    S.prefs.nudge.every = +el.dataset.v;
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['nudge-over'] = function () {
    S.prefs.nudge.over = !S.prefs.nudge.over;
    A.save(true);
    A.N.haptic('tick');
    if (S.prefs.nudge.over && A.N.call('overlayOk') === false) A.N.call('openOverlay');
    A.rerender();
  };
  A.acts['nudge-test'] = function () {
    A.go('#/');
    setTimeout(A.nudgeNow, 500);
  };
  A.acts['iqama-on'] = function () {
    S.iqama.on = !S.iqama.on;
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['iqama-step'] = function (el) {
    var k = el.dataset.k;
    S.iqama[k] = A.clamp(S.iqama[k] + +el.dataset.d, 0, 60);
    A.save();
    A.rerender();
  };
  A.acts['notif-from'] = function (el) {
    S.notif[el.dataset.k].from = el.dataset.v;
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['ob-battery'] = function () {
    A.N.call('openBattery');
  };
  function obFinish() {
    S.profile.onboarded = true;
    ob.step = 0;
    A.save(true);
    A.go('#/', true);
    setTimeout(function () {
      A.toast(
        'Welcome' + (S.profile.name ? ', ' + S.profile.name.split(' ')[0] : '') + '. May Allah make it easy.',
        'heart'
      );
    }, 400);
  }
  A.acts['ob-notif'] = function () {
    A.enableNotifs(function () {
      A.rerender();
    });
  };
  A.acts['ob-done'] = obFinish;

  /* ================= break from ṣalāh ================= */
  A.acts['break-on'] = function () {
    var kind = 'hayd';
    var sh = A.sheet(
      'Start your break',
      '<div class="seg brk-kind"><button type="button" data-kind="hayd" aria-pressed="true">My period</button><button type="button" data-kind="nifas" aria-pressed="false">After childbirth</button></div><p class="muted small" style="margin:0 2px 4px">Prayer tracking and reminders pause. Your streak is protected.</p><div class="grid2"><button type="button" class="btn sec" data-from="y">Since yesterday</button><button type="button" class="btn pri" data-from="t">From today</button></div>',
      {
        mount: function (el) {
          el.addEventListener('click', function (e) {
            var kb = e.target.closest('[data-kind]');
            if (kb) {
              kind = kb.dataset.kind;
              Array.prototype.forEach.call(el.querySelectorAll('[data-kind]'), function (x) {
                x.setAttribute('aria-pressed', x === kb);
              });
              return;
            }
            var b = e.target.closest('[data-from]');
            if (!b) return;
            S.excused.kind = kind;
            A.setExcused(true, b.dataset.from === 'y' ? A.shift(A.today(), -1) : null);
            sh.close();
            A.N.haptic('success');
            A.rerender();
            afterStart(kind);
          });
        }
      }
    );
  };
  /* a prayer whose time began before the bleeding, and was not prayed, is made up after purity */
  function afterStart(kind) {
    var n = A.now(),
      k = A.today(),
      p = n && n.cur && A.PRAYERS.indexOf(n.cur) >= 0 && n.prev.key === k ? n.cur : null,
      cy = (S.excused.cycles || []).slice(-1)[0];
    var gap = cy && kind === 'hayd' ? A.daysBetween(cy.to, S.excused.since) : 99;
    if (p && !(S.prayed[k] || {})[p]) {
      A.confirm(
        'Had you prayed ' + P.NAMES[p] + '?',
        'Its time had begun before your ' +
          (kind === 'nifas' ? 'bleeding' : 'period') +
          '. If you had not prayed it, it is made up when you are pure.',
        'Add to make-up prayers',
        function () {
          S.qada[p] = (S.qada[p] || 0) + 1;
          A.save();
          A.toast(P.NAMES[p] + ' added to make-up prayers', 'check');
        }
      );
    } else if (gap < 13)
      A.toast(
        'Only ' + gap + ' days since your last period. Ask a scholar whether this is a period or istiḥāḍah.',
        'info'
      );
    else A.toast('Break started. Your remembrance continues.', 'moonstar');
  }
  A.acts['cyc-later'] = function () {
    S.excused.snooze = A.today();
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['cyc-habit'] = function (el) {
    var h = (S.excused.habit = S.excused.habit || { len: 7, gap: 28 }),
      k = el.dataset.k;
    h[k] = A.clamp((h[k] || (k === 'len' ? 7 : 28)) + +el.dataset.d, k === 'len' ? 1 : 15, k === 'len' ? 15 : 60);
    A.save();
    A.rerender();
  };
  A.acts['cyc-remind'] = function () {
    S.excused.remind = !S.excused.remind;
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['break-off'] = function () {
    var d = A.excusedDay();
    var n = A.now(),
      cur = n && n.cur && A.PRAYERS.indexOf(n.cur) >= 0 ? n.cur : null;
    var also = cur === 'asr' ? 'dhuhr' : cur === 'isha' ? 'maghrib' : null;
    A.confirm(
      'End your break?',
      'After ' +
        A.plural(d, 'day') +
        '.' +
        (cur
          ? ' After ghusl, pray ' +
            P.NAMES[cur] +
            ': its time is in.' +
            (also ? ' Many scholars, including Ibn Bāz, say to pray ' + P.NAMES[also] + ' with it.' : '')
          : ''),
      'End break',
      function () {
        A.setExcused(false);
        A.N.haptic('success');
        A.toast('Welcome back. Prayer tracking has resumed.', 'mosque');
        A.rerender();
      }
    );
  };
  function spanDays(c) {
    var n = 1,
      d = c.from;
    while (d < c.to && n < 60) {
      d = A.shift(d, 1);
      n++;
    }
    return n;
  }
  function cycleCard() {
    if (S.profile.gender !== 'f') return '';
    var e = S.excused,
      q = A.qadaOwed(),
      cy = (e.cycles || []).slice(-3).reverse();
    var avg =
      e.cycles && e.cycles.length
        ? Math.round(
            e.cycles.reduce(function (a, c) {
              return a + spanDays(c);
            }, 0) / e.cycles.length
          )
        : 0;
    var h =
      '<div class="sec"><h2>Break days</h2><span class="aside">Private</span></div><div class="card col h-rose' +
      (e.on ? ' glowcard' : '') +
      '">';
    h +=
      '<div class="set" style="padding:0"><span class="badge">' +
      ic('moonstar') +
      '</span><div class="grow"><div class="t">' +
      (e.on ? 'On a break · day ' + A.excusedDay() : 'Break from ṣalāh') +
      '</div><div class="s">' +
      (e.on
        ? 'Since ' + esc(A.fmtDate(e.since, 'short'))
        : 'Pauses prayer tracking and reminders, protects your streak') +
      '</div></div><div class="ctl">' +
      A.sw(e.on, e.on ? 'break-off' : 'break-on') +
      '</div></div>';
    var c = A.cycle(),
      hist = (e.cycles || []).slice(-6);
    h +=
      '<div class="divider"></div><div class="cyc-stats"><div><b class="num">' +
      (c.len || '·') +
      '</b><span>usual days</span></div><div><b class="num">' +
      (c.gap || '·') +
      '</b><span>day cycle</span></div><div><b>' +
      (c.next ? esc(A.fmtDate(c.next, 'short')) : '·') +
      '</b><span>' +
      (e.on ? 'next after this' : 'next expected') +
      '</span></div></div>';
    if (hist.length)
      h +=
        '<div class="cyc-strip" aria-label="Recent cycles">' +
        hist
          .map(function (x) {
            var l = spanDays(x);
            return '<i style="--l:' + Math.min(15, l) + '" title="' + l + '"><b>' + l + '</b></i>';
          })
          .join('') +
        (c.next && !e.on ? '<i class="pred" style="--l:' + (c.len || 7) + '"><b>?</b></i>' : '') +
        '</div>';
    if (!c.learned)
      h +=
        '<div class="set" style="padding:0"><div class="grow"><div class="t">Your usual days</div><div class="s">Until the app learns from two cycles</div></div><div class="ctl">' +
        A.stepper(((e.habit || {}).len || 7) + ' d', 'cyc-habit', ' data-k="len"') +
        '</div></div><div class="set" style="padding:0"><div class="grow"><div class="t">Usually every</div><div class="s">From one start to the next</div></div><div class="ctl">' +
        A.stepper(((e.habit || {}).gap || 28) + ' d', 'cyc-habit', ' data-k="gap"') +
        '</div></div>';
    h +=
      '<div class="set" style="padding:0"><div class="grow"><div class="t">Private reminder</div><div class="s">A discreet note when your days may begin or end</div></div><div class="ctl">' +
      A.sw(!!e.remind, 'cyc-remind') +
      '</div></div>';
    h +=
      '<div class="cyc-rules"><span>No ṣalāh or fasting</span><span>Fasts are made up, ṣalāh is not · Muslim 335</span><span>Dhikr and duʿāʾ continue</span></div>';
    if (cy.length)
      h +=
        '<div class="divider"></div><div class="eyebrow">Recent</div><dl class="kv">' +
        cy
          .map(function (c) {
            return (
              '<dt>' +
              esc(A.fmtDate(c.from, 'short')) +
              ' to ' +
              esc(A.fmtDate(c.to, 'short')) +
              '</dt><dd>' +
              A.plural(spanDays(c), 'day') +
              '</dd>'
            );
          })
          .join('') +
        (avg ? '<dt>Average</dt><dd>' + A.plural(avg, 'day') + '</dd>' : '') +
        '</dl>';
    h +=
      '<div class="divider"></div><div class="spread"><div class="grow"><div style="font-weight:700">Ramaḍān make-up fasts</div><div class="faint small">' +
      (q.missed ? q.made + ' of ' + q.missed + ' made up' : 'Days of Ramaḍān on a break are counted here') +
      '</div></div><div class="num" style="font-size:var(--fs-num);font-weight:700;color:var(--rose)">' +
      q.owed +
      '</div></div>' +
      (q.owed ? '<a class="btn sec sm" href="#/calendar">' + ic('cal', 's') + 'Log a make-up fast</a>' : '');
    return h + '</div>';
  }
})();
