/* Paper: the morning and evening adhkār as an A4 booklet, and a month's prayer timetable, white to the edge with
   every source. Shared by the phone (Print and PDF under You, printed through Android's own print service, which
   also saves a PDF) and the computer (its print page, through Windows' own print dialog or straight to a PDF). The
   paper is built into a block that only print shows (#paper), so the app stays on screen while it prints. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    $ = A.$,
    esc = A.esc,
    ic = A.icon,
    T = function (s) {
      return A.T(s);
    },
    L = function (en, ar) {
      return A.ar() ? ar : en;
    };
  /* ---------- Print and PDF ---------- */
  function sheetsFor(what, month) {
    if (what === 'times') return timetable(month || 0);
    var ids = what === 'both' ? ['morning', 'evening'] : [what];
    return ids.map(booklet).join('');
  }
  function booklet(cid) {
    var c = A.col(cid),
      items = A.items(cid),
      ar = A.ar(),
      showTr = !ar && S.prefs.tr !== false,
      showEn = !ar && S.prefs.en !== false;
    var rows = items
      .map(function (it, i) {
        var refs = (it.refs || [])
          .map(function (r) {
            return T(r.l);
          })
          .join(' · ');
        return (
          '<article class="pp-it"><div class="pp-ih"><span class="pp-n">' +
          A.fmtN(i + 1) +
          '</span><b>' +
          esc(T(it.title)) +
          '</b>' +
          (it.target > 1 ? '<span class="pp-x">×' + A.fmtN(it.target) + '</span>' : '') +
          '</div><p class="pp-ar" lang="ar" dir="rtl">' +
          esc(it.ar) +
          '</p>' +
          (showTr && it.tr ? '<p class="pp-tr">' + esc(it.tr) + '</p>' : '') +
          (showEn && it.en ? '<p class="pp-en"><span>' + esc(T('Translation')) + '</span>' + esc(it.en) + '</p>' : '') +
          (refs ? '<p class="pp-ref">' + esc(refs) + '</p>' : '') +
          '</article>'
        );
      })
      .join('');
    return (
      '<table class="pp-flow"><thead><tr><td><div class="pp-sp"></div></td></tr></thead><tfoot><tr><td><div class="pp-sp"></div></td></tr></tfoot><tbody><tr><td><div class="pp-sheet"><header class="pp-h"><div><small>' +
      esc(T('Adhkār')) +
      '</small><h2>' +
      esc(T(c.title)) +
      '</h2></div>' +
      (ar ? '' : '<p lang="ar" dir="rtl">' + esc(c.ar || '') + '</p>') +
      '</header>' +
      rows +
      '<footer class="pp-f">' +
      esc(
        L(
          'Arabic from Ḥiṣn al-Muslim; translations from sunnah.com and The Clear Quran. Free, from the Adhkār app.',
          'النصوص العربية من حصن المسلم والمصحف الشريف. مجانًا من تطبيق أذكار.'
        )
      ) +
      '</footer></div></td></tr></tbody></table>'
    );
  }
  function timetable(off) {
    var parts = A.parts(Date.now()),
      base = new Date(Date.UTC(parts.y, parts.m - 1 + (off || 0), 1)),
      y = base.getUTCFullYear(),
      m = base.getUTCMonth() + 1,
      days = new Date(Date.UTC(y, m, 0)).getUTCDate(),
      loc = A.ar() ? 'ar' : 'en-GB';
    if (!S.loc)
      return (
        '<div class="pp-page"><p>' +
        esc(L('Choose your place first, under Ṣalāh.', 'اختر مكانك أولًا من الصلاة.')) +
        '</p></div>'
      );
    var cols = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'],
      today = A.today();
    var body = '';
    for (var d = 1; d <= days; d++) {
      var key = window.Prayer.keyOf(y, m, d),
        t = A.pday(key),
        h = A.hijri(key),
        dow = A.dow(key),
        fri = dow === 5,
        wd = A.ar() ? A.T(A.DOW[dow]) : A.DOW[dow].slice(0, 3);
      body +=
        '<tr class="' +
        (fri ? 'fri' : '') +
        (key === today ? ' now' : '') +
        '"><td class="d"><b>' +
        A.fmtN(d) +
        '</b> ' +
        esc(wd) +
        '</td><td class="hj">' +
        A.fmtN(h.d) +
        '</td>' +
        cols
          .map(function (k) {
            return '<td>' + (t && isFinite(t[k]) ? esc(A.fmtTxt(t[k])) : '') + '</td>';
          })
          .join('') +
        '</tr>';
    }
    var place = (S.loc && (S.loc.name || S.loc.city)) || '',
      firstKey = window.Prayer.keyOf(y, m, 1),
      mTitle = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(loc, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      });
    return (
      '<div class="pp-page pp-tt"><header class="pp-h"><div><small>' +
      esc(T('Adhkār')) +
      ' · ' +
      esc(place) +
      '</small><h2>' +
      esc(mTitle) +
      '</h2></div><p>' +
      esc(A.hijriText ? A.hijriText(firstKey) : '') +
      '</p></header><table class="pp-times"><thead><tr><th>' +
      esc(T('Day')) +
      '</th><th>' +
      esc(L('Hijri', 'هجري')) +
      '</th><th>' +
      esc(T('Fajr')) +
      '</th><th>' +
      esc(T('Sunrise')) +
      '</th><th>' +
      esc(T('Dhuhr')) +
      '</th><th>' +
      esc(T('ʿAṣr')) +
      '</th><th>' +
      esc(T('Maghrib')) +
      '</th><th>' +
      esc(T('ʿIshāʾ')) +
      '</th></tr></thead><tbody>' +
      body +
      '</tbody></table><footer class="pp-f">' +
      esc(
        L(
          'Calculated for ' +
            place +
            '. Times may differ from your masjid by a few minutes. Free, from the Adhkār app.',
          'مواقيت ' + place + '. قد تختلف عن المسجد ببضع دقائق. مجانًا من تطبيق أذكار.'
        )
      ) +
      '</footer></div>'
    );
  }
  function fileName(what, month) {
    var parts = A.parts(Date.now()),
      base = new Date(Date.UTC(parts.y, parts.m - 1 + (month || 0), 15));
    return what === 'times'
      ? 'Prayer timetable ' +
          base.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC'
          })
      : what === 'both'
        ? 'Morning and evening adhkar'
        : what === 'morning'
          ? 'Morning adhkar'
          : 'Evening adhkar';
  }
  /* put the paper in place, then hand it to the device's own print dialog (a PDF is one of its printers) */
  function go(what, month, pdf) {
    var paper = document.getElementById('paper');
    if (!paper) {
      paper = document.createElement('div');
      paper.id = 'paper';
      paper.setAttribute('aria-hidden', 'true');
      document.body.appendChild(paper);
    }
    paper.innerHTML = sheetsFor(what, month);
    if (A.localize) A.localize(paper);
    var name = fileName(what, month),
      t = document.title;
    A.print._origTitle = t;
    document.title = name;
    document.documentElement.classList.add('printing');
    setTimeout(function () {
      if (pdf && window.DeskBridge) {
        window.DeskBridge.savePdf(name);
        return;
      }
      if (A.N.has) A.N.call('printPage', name);
      else window.print();
      setTimeout(function () {
        document.title = t;
        document.documentElement.classList.remove('printing');
      }, 400);
    }, 80);
  }
  A.print = { sheets: sheetsFor, name: fileName, go: go };

  /* ---------- the phone's page: choose, see the paper, print or save ---------- */
  var P = { what: 'morning', month: 0 };
  A.V.print = function () {
    var opts = [
      ['morning', 'Morning', 'sunrise'],
      ['evening', 'Evening', 'moon'],
      ['both', 'Both', 'book'],
      ['times', 'Timetable', 'mosque']
    ];
    var h =
      A.back('Back', '#/profile') +
      '<header class="top"><div class="tt"><div class="eyebrow">' +
      esc(T('On A4, with every source')) +
      '</div><h1>' +
      esc(T('Print and PDF')) +
      '</h1></div></header>' +
      '<div class="seg pr-seg" role="group" aria-label="' +
      esc(T('What to print')) +
      '">' +
      opts
        .map(function (o) {
          return (
            '<button type="button" data-a="pr-what" data-w="' +
            o[0] +
            '" aria-pressed="' +
            (P.what === o[0]) +
            '">' +
            ic(o[2], 's') +
            esc(T(o[1])) +
            '</button>'
          );
        })
        .join('') +
      '</div>';
    if (P.what === 'times')
      h +=
        '<div class="seg pr-seg sm">' +
        [0, 1, 2]
          .map(function (m) {
            var d = new Date();
            d.setMonth(d.getMonth() + m, 1);
            return (
              '<button type="button" data-a="pr-month" data-m="' +
              m +
              '" aria-pressed="' +
              (P.month === m) +
              '">' +
              esc(d.toLocaleDateString(A.ar() ? 'ar' : 'en-GB', { month: 'long' })) +
              '</button>'
            );
          })
          .join('') +
        '</div>';
    h +=
      '<div class="pr-prev" aria-hidden="true"><div class="pr-wrap">' +
      sheetsFor(P.what, P.month) +
      '</div></div>' +
      '<div class="pr-go"><button type="button" class="btn pri" data-a="pr-go">' +
      ic('download', 's') +
      '<span>' +
      esc(T('Print or save as PDF')) +
      '</span></button><p class="muted small">' +
      esc(T('Choose “Save as PDF” as the printer to keep a copy.')) +
      '</p></div>';
    return {
      html: h,
      title: T('Print and PDF'),
      tab: 4,
      mount: function (el) {
        var fit = function () {
          var box = $('.pr-prev', el),
            w = box && $('.pr-wrap', box);
          if (!w || !box.clientWidth) return;
          var z = (box.clientWidth - 24) / 794;
          w.style.transform = 'scale(' + z.toFixed(4) + ')';
          w.style.height = '';
          box.style.height = Math.ceil(w.scrollHeight * z + 24) + 'px';
        };
        fit();
        requestAnimationFrame(fit);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      }
    };
  };
  A.acts['pr-what'] = function (el) {
    P.what = el.dataset.w;
    A.rerender();
  };
  A.acts['pr-month'] = function (el) {
    P.month = +el.dataset.m;
    A.rerender();
  };
  A.acts['pr-go'] = function () {
    if (P.what === 'times' && !S.loc) {
      A.toast(T('Choose your place first, under Ṣalāh.'), 'pin');
      return;
    }
    go(P.what, P.month, false);
  };
  if (A.addAr)
    A.addAr({
      'On A4, with every source': 'على ورق A4، مع كل المصادر',
      'Print and PDF': 'الطباعة وPDF',
      'What to print': 'ماذا تطبع',
      Morning: 'الصباح',
      Evening: 'المساء',
      Both: 'كلاهما',
      Timetable: 'جدول المواقيت',
      'Print or save as PDF': 'اطبع أو احفظ PDF',
      'Choose “Save as PDF” as the printer to keep a copy.': 'اختر «حفظ بتنسيق PDF» طابعةً لتحتفظ بنسخة.',
      'Choose your place first, under Ṣalāh.': 'اختر مكانك أولًا من الصلاة.'
    });
})();
