/* Charts — small SVG chart kit rendered at the container's real pixel width (crisp text, no scaling).
   Specs (dataviz method): 2px lines, ~10% area wash, ≤24px columns with 4px rounded data-end,
   2px surface gaps between stacked segments, hairline recessive grid, crosshair + tooltip on line charts,
   per-mark tooltips on columns, legend for ≥2 series, and a table view for every chart. */
(function () {
  'use strict';
  var A = window.A,
    esc = A.esc;
  var NS = 'http://www.w3.org/2000/svg';
  A.chart = {};

  function niceMax(v) {
    if (v <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v))),
      m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  function compact(n) {
    return n >= 1e6
      ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M'
      : n >= 1000
        ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.0', '') + 'K'
        : String(Math.round(n));
  }
  A.chart.compact = compact;

  /* tooltip: text-only DOM (never innerHTML with data) */
  function tip(root) {
    var t = root.querySelector('.tip');
    if (!t) {
      t = document.createElement('div');
      t.className = 'tip';
      t.setAttribute('role', 'status');
      root.appendChild(t);
    }
    return {
      show: function (x, title, rows) {
        t.textContent = '';
        var d = document.createElement('div');
        d.className = 'd';
        d.textContent = title;
        t.appendChild(d);
        rows.forEach(function (r) {
          var row = document.createElement('div');
          row.className = 'r';
          var l = document.createElement('span');
          if (r.color) {
            var sw = document.createElement('i');
            sw.style.background = r.color;
            l.appendChild(sw);
          }
          l.appendChild(document.createTextNode(r.label));
          var v = document.createElement('b');
          v.textContent = r.value;
          row.appendChild(l);
          row.appendChild(v);
          t.appendChild(row);
        });
        var w = root.clientWidth,
          tw = t.offsetWidth || 140;
        t.style.left = Math.max(0, Math.min(w - tw, x - tw / 2)) + 'px';
        t.classList.add('on');
      },
      hide: function () {
        t.classList.remove('on');
      }
    };
  }
  function pointerX(e, el) {
    var r = el.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    return p.clientX - r.left;
  }

  /* Area/line: data [{label, v, sub?}] — single series, so no legend box; the card title names it. */
  A.chart.area = function (root, data, opt) {
    opt = opt || {};
    var W = Math.max(240, root.clientWidth),
      H = opt.h || 170,
      padL = 30,
      padR = 10,
      padT = 12,
      padB = 24;
    var max = niceMax(
      Math.max.apply(
        null,
        data
          .map(function (d) {
            return d.v;
          })
          .concat([1])
      )
    );
    var n = data.length,
      x = function (i) {
        return padL + (n === 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
      },
      y = function (v) {
        return padT + (1 - v / max) * (H - padT - padB);
      };
    var s =
      '<svg viewBox="0 0 ' +
      W +
      ' ' +
      H +
      '" width="' +
      W +
      '" height="' +
      H +
      '" role="img" aria-label="' +
      esc(opt.label || 'Chart') +
      '">';
    s +=
      '<defs><linearGradient id="ag' +
      (opt.id || '') +
      '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' +
      (opt.color || 'var(--gold)') +
      '" stop-opacity=".22"/><stop offset="1" stop-color="' +
      (opt.color || 'var(--gold)') +
      '" stop-opacity="0"/></linearGradient></defs>';
    [0, 0.5, 1].forEach(function (f) {
      var yy = y(max * f);
      s +=
        '<line class="gl" x1="' +
        padL +
        '" x2="' +
        (W - padR) +
        '" y1="' +
        yy +
        '" y2="' +
        yy +
        '"/><text class="ax" x="' +
        (padL - 6) +
        '" y="' +
        (yy + 3.5) +
        '" text-anchor="end">' +
        compact(max * f) +
        '</text>';
    });
    var step = Math.max(1, Math.ceil(n / (W < 340 ? 5 : 7)));
    data.forEach(function (d, i) {
      if (i % step === 0 || i === n - 1) {
        if (i !== n - 1 && n - 1 - i < step * 0.6) return;
        s +=
          '<text class="ax" x="' +
          x(i) +
          '" y="' +
          (H - 6) +
          '" text-anchor="' +
          (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') +
          '">' +
          esc(d.label) +
          '</text>';
      }
    });
    var line = data
      .map(function (d, i) {
        return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(d.v).toFixed(1);
      })
      .join('');
    s +=
      '<path d="' +
      line +
      'L' +
      x(n - 1).toFixed(1) +
      ' ' +
      y(0) +
      'L' +
      x(0).toFixed(1) +
      ' ' +
      y(0) +
      'Z" fill="url(#ag' +
      (opt.id || '') +
      ')"/>';
    s +=
      '<path d="' +
      line +
      '" fill="none" stroke="' +
      (opt.color || 'var(--gold)') +
      '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    var last = data[n - 1];
    s +=
      '<circle cx="' +
      x(n - 1) +
      '" cy="' +
      y(last.v) +
      '" r="4.5" fill="' +
      (opt.color || 'var(--gold)') +
      '" stroke="var(--s1)" stroke-width="2"/>';
    s +=
      '<line class="xh" x1="0" x2="0" y1="' +
      padT +
      '" y2="' +
      (H - padB) +
      '"/><circle class="xd" r="4.5" cx="0" cy="0" fill="' +
      (opt.color || 'var(--gold)') +
      '" stroke="var(--s1)" stroke-width="2"/>';
    s += '</svg>';
    root.innerHTML = s;
    var svg = root.querySelector('svg'),
      xh = svg.querySelector('.xh'),
      xd = svg.querySelector('.xd'),
      tt = tip(root);
    function move(e) {
      var px = pointerX(e, svg) * (W / svg.getBoundingClientRect().width),
        i = Math.round((px - padL) / ((W - padL - padR) / Math.max(1, n - 1)));
      i = Math.max(0, Math.min(n - 1, i));
      var d = data[i];
      xh.setAttribute('x1', x(i));
      xh.setAttribute('x2', x(i));
      xd.setAttribute('cx', x(i));
      xd.setAttribute('cy', y(d.v));
      root.classList.add('hot');
      tt.show(
        (x(i) * svg.getBoundingClientRect().width) / W,
        d.title || d.label,
        [{ label: opt.unit || 'Count', value: A.fmtN(d.v) }].concat(d.extra || [])
      );
    }
    function out() {
      root.classList.remove('hot');
      tt.hide();
    }
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', out);
    svg.addEventListener('touchend', function () {
      setTimeout(out, 1600);
    });
  };

  /* Stacked columns: rows [{label, title, values:{key:n}}], series [{key,label,color}] */
  A.chart.stacked = function (root, rows, series, opt) {
    opt = opt || {};
    var W = Math.max(240, root.clientWidth),
      H = opt.h || 180,
      padL = 26,
      padR = 6,
      padT = 12,
      padB = 24;
    var tot = rows.map(function (r) {
      return series.reduce(function (a, s) {
        return a + (r.values[s.key] || 0);
      }, 0);
    });
    var max = niceMax(Math.max.apply(null, tot.concat([1]))),
      n = rows.length;
    var band = (W - padL - padR) / n,
      bw = Math.min(24, Math.max(4, band * 0.62)),
      y = function (v) {
        return padT + (1 - v / max) * (H - padT - padB);
      };
    var s =
      '<svg viewBox="0 0 ' +
      W +
      ' ' +
      H +
      '" width="' +
      W +
      '" height="' +
      H +
      '" role="img" aria-label="' +
      esc(opt.label || 'Chart') +
      '">';
    [0, 0.5, 1].forEach(function (f) {
      var yy = y(max * f);
      s +=
        '<line class="gl" x1="' +
        padL +
        '" x2="' +
        (W - padR) +
        '" y1="' +
        yy +
        '" y2="' +
        yy +
        '"/><text class="ax" x="' +
        (padL - 6) +
        '" y="' +
        (yy + 3.5) +
        '" text-anchor="end">' +
        compact(max * f) +
        '</text>';
    });
    var step = Math.max(1, Math.ceil(n / (W < 340 ? 6 : 8)));
    rows.forEach(function (r, i) {
      var cx = padL + band * i + band / 2,
        base = y(0),
        segs = series.filter(function (sr) {
          return r.values[sr.key];
        });
      segs.forEach(function (sr, j) {
        var v = r.values[sr.key],
          h = base - y(v),
          top = base - h,
          isTop = j === segs.length - 1;
        var gap = j > 0 ? 2 : 0,
          hh = Math.max(1, h - gap);
        if (isTop) {
          var rr = Math.min(4, hh, bw / 2);
          s +=
            '<path d="M' +
            (cx - bw / 2) +
            ' ' +
            (top + hh) +
            'V' +
            (top + rr) +
            'Q' +
            (cx - bw / 2) +
            ' ' +
            top +
            ' ' +
            (cx - bw / 2 + rr) +
            ' ' +
            top +
            'H' +
            (cx + bw / 2 - rr) +
            'Q' +
            (cx + bw / 2) +
            ' ' +
            top +
            ' ' +
            (cx + bw / 2) +
            ' ' +
            (top + rr) +
            'V' +
            (top + hh) +
            'Z" fill="' +
            sr.color +
            '"/>';
        } else
          s +=
            '<rect x="' +
            (cx - bw / 2) +
            '" y="' +
            top +
            '" width="' +
            bw +
            '" height="' +
            hh +
            '" fill="' +
            sr.color +
            '"/>';
        base = top;
      });
      s +=
        '<rect class="hit" data-i="' +
        i +
        '" x="' +
        (padL + band * i) +
        '" y="' +
        padT +
        '" width="' +
        band +
        '" height="' +
        (H - padT - padB) +
        '" fill="transparent"/>';
      if (i % step === 0)
        s += '<text class="ax" x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(r.label) + '</text>';
    });
    s += '</svg>';
    root.innerHTML = s;
    var svg = root.querySelector('svg'),
      tt = tip(root),
      hideT;
    function show(e) {
      var h = e.target.closest('.hit');
      if (!h) return;
      var i = +h.dataset.i,
        r = rows[i],
        sc = svg.getBoundingClientRect().width / W;
      clearTimeout(hideT);
      tt.show(
        (padL + band * i + band / 2) * sc,
        r.title || r.label,
        series
          .map(function (sr) {
            return { label: sr.label, value: A.fmtN(r.values[sr.key] || 0), color: sr.color };
          })
          .concat([{ label: 'Total', value: A.fmtN(tot[i]) }])
      );
    }
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', function () {
      tt.hide();
    });
    svg.addEventListener('touchend', function () {
      hideT = setTimeout(tt.hide, 1800);
    });
  };

  /* Column chart for a single series (e.g. time of day). */
  A.chart.columns = function (root, rows, opt) {
    A.chart.stacked(
      root,
      rows.map(function (r) {
        return { label: r.label, title: r.title, values: { v: r.v } };
      }),
      [{ key: 'v', label: (opt && opt.unit) || 'Count', color: (opt && opt.color) || 'var(--gold)' }],
      opt
    );
  };

  A.chart.legend = function (series) {
    return (
      '<div class="legend">' +
      series
        .map(function (s) {
          return '<span><i style="background:' + s.color + '"></i>' + esc(s.label) + '</span>';
        })
        .join('') +
      '</div>'
    );
  };
  /* table view — the accessible twin of every chart */
  A.chart.table = function (head, rows) {
    return (
      '<table class="tview"><thead><tr>' +
      head
        .map(function (h) {
          return '<th>' + esc(h) + '</th>';
        })
        .join('') +
      '</tr></thead><tbody>' +
      rows
        .map(function (r) {
          return (
            '<tr>' +
            r
              .map(function (c) {
                return '<td>' + esc(c) + '</td>';
              })
              .join('') +
            '</tr>'
          );
        })
        .join('') +
      '</tbody></table>'
    );
  };
  void NS;
})();
