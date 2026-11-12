/* Insights — trends and patterns across everything the user logs. All data stays on device. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    $$ = A.$$,
    esc = A.esc,
    ic = A.icon;
  var PERIODS = [
    [7, '7 days'],
    [30, '30 days'],
    [90, '90 days']
  ];
  var SERIES = [
    { key: 'morning', label: 'Morning', color: 'var(--c1)' },
    { key: 'evening', label: 'Evening', color: 'var(--c2)' },
    { key: 'salah', label: 'After ṣalāh', color: 'var(--c3)' },
    { key: 'sleep', label: 'Sleep', color: 'var(--c4)' }
  ];
  var period = 30,
    tables = {};

  function days(n, end) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) out.push(A.shift(end, -i));
    return out;
  }
  function shortLabel(k, n) {
    var a = k.split('-');
    return n <= 7 ? A.DOW[A.dow(k)].slice(0, 3) : +a[2] + ' ' + A.MONTHS[+a[1] - 1].slice(0, 3);
  }
  function sessionsOn(d) {
    var o = { morning: 0, evening: 0, salah: 0, sleep: 0 };
    ['morning', 'evening', 'sleep'].forEach(function (c) {
      if (S.done[d + '|' + c]) o[c] = 1;
    });
    A.PRAYERS.forEach(function (p) {
      if (S.done[d + '|salah-' + p]) o.salah++;
    });
    return o;
  }
  function delta(cur, prev) {
    if (!prev && !cur) return '<span class="dl">·</span>';
    if (!prev) return '<span class="dl up">new</span>';
    var pc = Math.round(((cur - prev) / prev) * 100);
    return (
      '<span class="dl ' +
      (pc > 0 ? 'up' : pc < 0 ? 'dn' : '') +
      '">' +
      (pc > 0 ? '▲ ' : pc < 0 ? '▼ ' : '') +
      Math.abs(pc) +
      '% vs previous</span>'
    );
  }

  function compute() {
    var end = A.today(),
      tot = A.totals(),
      cur = days(period, end),
      prev = days(period, A.shift(end, -period));
    var sum = function (list) {
      return list.reduce(function (a, d) {
        return a + (tot.byDay[d] || 0);
      }, 0);
    };
    var sess = function (list) {
      return list.reduce(function (a, d) {
        var o = sessionsOn(d);
        return a + o.morning + o.evening + o.salah + o.sleep;
      }, 0);
    };
    var active = function (list) {
      return list.filter(function (d) {
        return A.dayDone(d).score > 0 || tot.byDay[d];
      }).length;
    };
    return {
      end: end,
      tot: tot,
      cur: cur,
      prev: prev,
      dhikr: sum(cur),
      dhikrPrev: sum(prev),
      sess: sess(cur),
      sessPrev: sess(prev),
      act: active(cur),
      actPrev: active(prev)
    };
  }

  function insightsText(c) {
    var out = [],
      n = c.cur.length;
    var rate = SERIES.map(function (s) {
      var k = 0;
      c.cur.forEach(function (d) {
        var o = sessionsOn(d);
        k += s.key === 'salah' ? o.salah / 5 : o[s.key];
      });
      return [s.label, k / n];
    }).sort(function (a, b) {
      return b[1] - a[1];
    });
    if (rate[0][1] > 0)
      out.push([
        'star',
        'Most consistent: <b>' + esc(rate[0][0]) + '</b> on ' + Math.round(rate[0][1] * 100) + '% of days.'
      ]);
    var wd = [0, 0, 0, 0, 0, 0, 0],
      wc = [0, 0, 0, 0, 0, 0, 0];
    days(Math.max(period, 28), c.end).forEach(function (d) {
      var w = A.dow(d);
      wd[w] += c.tot.byDay[d] || 0;
      wc[w]++;
    });
    var best = 0;
    for (var i = 1; i < 7; i++) if (wd[i] / (wc[i] || 1) > wd[best] / (wc[best] || 1)) best = i;
    if (wd[best]) out.push(['cal', 'Your strongest day is <b>' + A.DOW[best] + '</b>.']);
    if (c.act)
      out.push([
        'chart',
        'On active days you average <b>' + A.fmtN(Math.round(c.dhikr / c.act)) + '</b> remembrances.'
      ]);
    var weakest = rate[rate.length - 1];
    if (rate[0][1] > 0 && weakest[1] < 0.5)
      out.push(['spark', 'A gentle aim: <b>' + esc(weakest[0]) + '</b>, even a little, consistently.']);
    var st = A.streaks();
    if (st.cur >= 3) out.push(['flame', 'You are on a <b>' + st.cur + '-day</b> streak. Keep going.']);
    return out.length
      ? '<div class="card col">' +
          out
            .map(function (x) {
              return (
                '<div class="row" style="align-items:flex-start"><span class="badge s h-gold">' +
                ic(x[0], 's') +
                '</span><div class="grow small" style="padding-top:8px">' +
                x[1] +
                '</div></div>'
              );
            })
            .join('') +
          '</div>'
      : '';
  }

  function heatmap(end) {
    var weeks = 18,
      start = A.shift(end, -(weeks - 1) * 7 - A.dow(end)),
      cells = '',
      months = [],
      lastM = -1;
    for (var i = 0; i < weeks * 7; i++) {
      var d = A.shift(start, i);
      if (i % 7 === 0) {
        var m = +d.slice(5, 7);
        months.push(m !== lastM ? A.MONTHS[m - 1].slice(0, 3) : '');
        lastM = m;
      }
      if (d > end) {
        cells += '<i class="fut"></i>';
        continue;
      }
      var s = A.dayDone(d).score,
        l = s >= 4 ? 4 : s >= 2.5 ? 3 : s >= 1.4 ? 2 : s > 0 ? 1 : 0;
      cells += '<i class="l' + l + '" data-d="' + d + '" role="button" tabindex="-1" aria-label="' + d + '"></i>';
    }
    var mrow =
      '<div class="months" style="display:grid;grid-template-columns:repeat(' +
      weeks +
      ',minmax(0,1fr));gap:3px">' +
      months
        .map(function (m) {
          return '<span style="white-space:nowrap;overflow:visible">' + m + '</span>';
        })
        .join('') +
      '</div>';
    return (
      mrow +
      '<div class="heatwrap"><div class="wd"><span></span><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span></div><div class="heat" id="heat">' +
      cells +
      '</div></div>' +
      '<div class="spread faint" style="font-size:11px;font-weight:700;margin-top:10px"><span id="heatInfo">Tap a day for details</span><span class="heat-leg">' +
      [0, 1, 2, 3, 4]
        .map(function (l) {
          return '<i class="l' + l + '"></i>';
        })
        .join('') +
      '</span></div>'
    );
  }
  function dayDetail(d) {
    var dd = A.dayDone(d),
      tot = A.totals(),
      parts = [];
    if (dd.morning) parts.push('Morning');
    if (dd.evening) parts.push('Evening');
    if (dd.salahN) parts.push(dd.salahN + '× after ṣalāh');
    if (dd.sleep) parts.push('Sleep');
    if (dd.duha) parts.push('Ḍuḥā');
    if (dd.night) parts.push('Qiyām');
    if (S.fasts[d]) parts.push('Fasted');
    return (
      A.fmtDate(d, 'short') +
      ' · ' +
      A.fmtN(tot.byDay[d] || 0) +
      ' counted' +
      (parts.length ? ' · ' + parts.join(', ') : '')
    );
  }

  function salahLog(end) {
    var ds = days(14, end),
      h =
        '<div class="sal"><span></span>' +
        ds
          .map(function (d) {
            return '<span style="text-align:center">' + A.DOW[A.dow(d)][0] + '</span>';
          })
          .join('');
    A.PRAYERS.forEach(function (p) {
      h +=
        '<span>' +
        P.NAMES[p] +
        '</span>' +
        ds
          .map(function (d) {
            var on = S.prayed[d] && S.prayed[d][p];
            return (
              '<i class="' +
              (on ? 'on' : A.isExcused(d) ? 'ex' : '') +
              '" title="' +
              P.NAMES[p] +
              ' ' +
              d +
              (on ? ' prayed' : '') +
              '"></i>'
            );
          })
          .join('');
    });
    return h + '</div>';
  }

  function timeOfDay() {
    var b = [
      ['Before Fajr', 0],
      ['Fajr–sunrise', 0],
      ['Forenoon', 0],
      ['Afternoon', 0],
      ['Evening', 0],
      ['Night', 0]
    ];
    var add = function (ms) {
      if (!S.loc) {
        var hh = new Date(ms).getHours();
        b[hh < 5 ? 0 : hh < 7 ? 1 : hh < 12 ? 2 : hh < 17 ? 3 : hh < 21 ? 4 : 5][1]++;
        return;
      }
      var k = A.keyAt(ms),
        t = A.pday(k);
      b[
        ms < t.fajr ? 0 : ms < t.sunrise ? 1 : ms < t.dhuhr ? 2 : ms < t.maghrib ? 3 : ms < t.isha + 3600000 ? 4 : 5
      ][1]++;
    };
    Object.keys(S.done).forEach(function (k) {
      var v = S.done[k];
      if (typeof v === 'number' && v > 1e12) add(v);
    });
    (S.tasbih.log || []).forEach(function (l) {
      add(l.t);
    });
    return b;
  }

  function topPhrases() {
    var names = {};
    window.DATA.tasbih.concat(S.tasbih.custom || []).forEach(function (p) {
      names[p.id] = p.tr;
    });
    var list = Object.keys(S.tasbih.per || {})
      .map(function (id) {
        return [names[id] || 'Removed phrase', S.tasbih.per[id]];
      })
      .filter(function (x) {
        return x[1] > 0;
      })
      .sort(function (a, b) {
        return b[1] - a[1];
      })
      .slice(0, 6);
    if (!list.length) return '<p class="faint small">Counts from the Tracker appear here.</p>';
    var max = list[0][1];
    return (
      '<div class="hbar">' +
      list
        .map(function (x) {
          return (
            '<span class="lb">' +
            esc(x[0]) +
            '</span><span class="vl">' +
            A.fmtN(x[1]) +
            '</span><span class="tr"><i style="width:' +
            ((x[1] / max) * 100).toFixed(1) +
            '%"></i></span>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function chartCard(id, title, aside, body) {
    return (
      '<section class="card col" id="sec-' +
      id +
      '"><div class="spread"><div class="grow"><div style="font:400 var(--fs-title)/1.2 var(--f-serif)">' +
      title +
      '</div>' +
      (aside ? '<div class="faint small">' + aside + '</div>' : '') +
      '</div><button type="button" class="ib ghost" data-a="ins-table" data-t="' +
      id +
      '" aria-label="Show ' +
      esc(title) +
      ' as a table">' +
      ic('table', 's') +
      '</button></div>' +
      body +
      '<div data-tbl="' +
      id +
      '" hidden></div></section>'
    );
  }

  A.V.insights = function (a) {
    var c = compute(),
      focus = a[0];
    var h =
      A.back('Profile', '#/profile') +
      '<header class="top"><div class="tt"><div class="eyebrow">Your progress</div><h1>Insights</h1></div></header>';
    h +=
      '<div class="seg" role="group" aria-label="Period">' +
      PERIODS.map(function (p) {
        return (
          '<button type="button" data-a="ins-period" data-v="' +
          p[0] +
          '" aria-pressed="' +
          (p[0] === period) +
          '">' +
          p[1] +
          '</button>'
        );
      }).join('') +
      '</div>';
    var st = A.streaks();
    h +=
      '<div class="kpis">' +
      '<div class="card kpi"><div class="k">Remembrances</div><div class="v">' +
      A.fmtN(c.dhikr) +
      '</div>' +
      delta(c.dhikr, c.dhikrPrev) +
      '</div>' +
      '<div class="card kpi"><div class="k">Sessions completed</div><div class="v">' +
      A.fmtN(c.sess) +
      '</div>' +
      delta(c.sess, c.sessPrev) +
      '</div>' +
      '<div class="card kpi"><div class="k">Active days</div><div class="v">' +
      c.act +
      '<span class="faint" style="font-size:16px"> / ' +
      period +
      '</span></div>' +
      delta(c.act, c.actPrev) +
      '</div>' +
      '<div class="card kpi"><div class="k">Streak</div><div class="v">' +
      st.cur +
      '</div><span class="dl">best ' +
      st.best +
      ' days</span></div></div>';
    h += insightsText(c);
    h += chartCard(
      'trend',
      'Remembrance per day',
      'Adhkār counts plus the tracker',
      '<div class="chart" id="chTrend"></div>'
    );
    h += chartCard(
      'sess',
      'Sessions completed',
      period > 30 ? 'Grouped by week' : 'By day',
      A.chart.legend(SERIES) + '<div class="chart" id="chSess"></div>'
    );
    if (S.prefs.trackPrayers)
      h += chartCard('salah', 'Ṣalāh log', 'Last 14 days · tap the circles on the Ṣalāh tab to log', salahLog(c.end));
    h += chartCard(
      'tod',
      'When you remember',
      'Completed sessions and tracker sessions by time of day',
      '<div class="chart" id="chTod"></div>'
    );
    h += chartCard('heat', 'Consistency', 'Last 18 weeks', heatmap(c.end));
    h += chartCard('phr', 'Tracker phrases', 'All time', topPhrases());
    return {
      html: h,
      title: 'Insights',
      tab: 4,
      mount: function (el) {
        draw(el, c);
        $('#heat', el).addEventListener('click', function (e) {
          var i = e.target.closest('[data-d]');
          if (!i) return;
          $$('.heat i.sel', el).forEach(function (x) {
            x.classList.remove('sel');
          });
          i.classList.add('sel');
          $('#heatInfo', el).textContent = dayDetail(i.dataset.d);
          A.N.haptic('tick');
        });
        var onR = A.debounce(function () {
          if (document.body.contains(el) && $('#chTrend', el)) draw(el, c);
        }, 150);
        window.addEventListener('resize', onR);
        this._r = onR;
        if (focus === 'tracker')
          setTimeout(function () {
            var s = $('#sec-phr', el);
            if (s) s.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }, 200);
      },
      unmount: function () {
        if (this._r) window.removeEventListener('resize', this._r);
      }
    };
  };

  function draw(el, c) {
    var tot = c.tot,
      n = c.cur.length;
    var trend = c.cur.map(function (d) {
      return { label: shortLabel(d, n), title: A.fmtDate(d, 'short'), v: tot.byDay[d] || 0 };
    });
    var known = trend.filter(function (x) {
      return x.v > 0;
    }).length;
    if (known < 14)
      A.chart.columns($('#chTrend', el), trend, {
        label: 'Remembrance per day',
        unit: 'Remembrances',
        color: 'var(--gold)'
      });
    else A.chart.area($('#chTrend', el), trend, { id: 'tr', label: 'Remembrance per day', unit: 'Remembrances' });
    tables.trend = A.chart.table(
      ['Day', 'Count'],
      c.cur
        .map(function (d) {
          return [A.fmtDate(d, 'short'), A.fmtN(tot.byDay[d] || 0)];
        })
        .reverse()
    );
    var rows = [];
    if (period > 30) {
      for (var i = 0; i < n; i += 7) {
        var wk = c.cur.slice(i, i + 7),
          v = { morning: 0, evening: 0, salah: 0, sleep: 0 };
        wk.forEach(function (d) {
          var o = sessionsOn(d);
          Object.keys(v).forEach(function (k) {
            v[k] += o[k];
          });
        });
        rows.push({ label: shortLabel(wk[0], 30), title: 'Week of ' + A.fmtDate(wk[0], 'short'), values: v });
      }
    } else
      rows = c.cur.map(function (d) {
        return { label: shortLabel(d, n), title: A.fmtDate(d, 'short'), values: sessionsOn(d) };
      });
    A.chart.stacked($('#chSess', el), rows, SERIES, { label: 'Sessions completed' });
    tables.sess = A.chart.table(
      ['Period', 'Morning', 'Evening', 'Ṣalāh', 'Sleep'],
      rows
        .map(function (r) {
          return [r.title, r.values.morning, r.values.evening, r.values.salah, r.values.sleep];
        })
        .reverse()
    );
    var tod = timeOfDay();
    A.chart.columns(
      $('#chTod', el),
      tod.map(function (b) {
        return { label: b[0].split(/[–\s]/)[0], title: b[0], v: b[1] };
      }),
      { unit: 'Sessions', label: 'When you remember' }
    );
    tables.tod = A.chart.table(
      ['Time of day', 'Sessions'],
      tod.map(function (b) {
        return [b[0], b[1]];
      })
    );
    tables.salah = A.chart.table(
      ['Prayer', 'Prayed (14 days)'],
      A.PRAYERS.map(function (p) {
        return [
          P.NAMES[p],
          days(14, c.end).filter(function (d) {
            return S.prayed[d] && S.prayed[d][p];
          }).length
        ];
      })
    );
    tables.heat = A.chart.table(
      ['Day', 'Summary'],
      days(28, c.end)
        .reverse()
        .map(function (d) {
          return [d, dayDetail(d).split(' · ').slice(1).join(' · ')];
        })
    );
    tables.phr = '';
  }
  A.acts['ins-period'] = function (el) {
    period = +el.dataset.v;
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['ins-table'] = function (el) {
    var box = document.querySelector('[data-tbl="' + el.dataset.t + '"]');
    if (!box) return;
    if (box.hidden) {
      box.innerHTML = tables[el.dataset.t] || '<p class="faint small">The values are listed above.</p>';
      box.hidden = false;
    } else box.hidden = true;
  };
})();
