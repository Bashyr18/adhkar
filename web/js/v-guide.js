/* Dress and ʿawrah: what the Qurʾān and Sunnah set out, for sisters and brothers. Each point carries the Prophet's ﷺ
   words verbatim (hadith.js) and its grade; where scholars differ, both positions are named. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    esc = A.esc,
    ic = A.icon;
  var SN = function (k) {
    return 'https://sunnah.com/' + k;
  };
  var LABEL = { abudawud: 'Abū Dāwūd', bukhari: 'Bukhārī', muslim: 'Muslim', tirmidhi: 'Tirmidhī', nasai: 'an-Nasāʾī' };
  function ref(k) {
    var p = k.split(':'),
      g = A.grade ? A.grade(k) : '';
    return (
      '<a href="' +
      SN(k) +
      '" data-a="ext">' +
      ic('link', 'xs') +
      esc(LABEL[p[0]] + ' ' + p[1]) +
      (g ? ' · ' + esc(g) : '') +
      '</a>'
    );
  }
  function point(icon, title, note, key, extra) {
    return (
      '<div class="gd-pt"><span class="badge s">' +
      ic(icon, 's') +
      '</span><div class="grow"><div class="t">' +
      esc(title) +
      '</div>' +
      (note ? '<div class="s">' + esc(note) + '</div>' : '') +
      (extra || '') +
      (key ? A.saidFold(key, '') + '<div class="refs">' + ref(key) + '</div>' : '') +
      '</div></div>'
    );
  }
  var SISTERS = [
    [
      'user',
      'The whole body is covered, except the face and hands',
      'Scholars differ on the face: al-Albānī held it may show and covering it is better; Ibn Bāz and Ibn ʿUthaymīn held it is covered too.',
      null,
      '<div class="refs"><a href="https://quran.com/24/31" data-a="ext">' +
        ic('link', 'xs') +
        'Qurʾān 24:31</a><a href="https://quran.com/33/59" data-a="ext">' +
        ic('link', 'xs') +
        'Qurʾān 33:59</a></div>'
    ],
    ['spark', 'Not an adornment in itself', 'The covering itself does not draw attention.', null],
    ['shield', 'Thick, not transparent', 'Nothing beneath it shows through.', null],
    ['heart', 'Loose, not tight', 'It does not describe the shape of the body.', null],
    ['leaf', 'Not perfumed outside the home', null, 'abudawud:4173'],
    ['user', 'Not resembling the dress of men', null, 'bukhari:5885'],
    ['globe', 'Not resembling the dress particular to non-Muslims', null, 'abudawud:4031'],
    ['star', 'Not worn for fame', null, 'abudawud:4029']
  ];
  var BROTHERS = [
    ['user', 'The ʿawrah is from the navel to the knee', 'The thigh is part of it.', 'tirmidhi:2798'],
    ['shield', 'The garment stays above the ankles', null, 'bukhari:5787'],
    ['star', 'No silk and no gold', null, 'nasai:5144'],
    ['user', 'Not resembling the dress of women', null, 'bukhari:5885'],
    ['globe', 'Not resembling the dress particular to non-Muslims', null, 'abudawud:4031'],
    ['heart', 'Not worn for fame', null, 'abudawud:4029'],
    ['sun', 'White is among the best of garments', null, 'tirmidhi:994']
  ];
  var tab = null;
  A.V.modesty = function () {
    if (!tab) tab = S.profile.gender === 'm' ? 'b' : 's';
    var list = tab === 's' ? SISTERS : BROTHERS;
    var h =
      '<header class="top"><div class="tt"><div class="eyebrow">From the Qurʾān and Sunnah</div><h1>Dress &amp; <em>ʿawrah</em></h1></div><div class="acts"><button type="button" class="chip' +
      (showAr ? ' on' : '') +
      '" data-a="gd-ar" aria-pressed="' +
      showAr +
      '">Arabic</button></div></header>';
    h +=
      '<div class="seg gd-seg"><button type="button" data-a="gd-tab" data-v="s" aria-pressed="' +
      (tab === 's') +
      '">Sisters</button><button type="button" data-a="gd-tab" data-v="b" aria-pressed="' +
      (tab === 'b') +
      '">Brothers</button></div>';
    if (tab === 's')
      h +=
        '<div class="card col gd-lead h-rose"><div class="eyebrow" style="color:var(--rose)">The conditions of the jilbāb</div><p class="muted small">As gathered by al-Albānī in Jilbāb al-Marʾah al-Muslimah.</p></div>';
    h +=
      '<div class="card pad0 gd-list">' +
      list
        .map(function (x) {
          return point(x[0], x[1], x[2], x[3], x[4]);
        })
        .join('') +
      '</div>';
    if (tab === 's')
      h +=
        '<div class="sec"><h2>In ṣalāh</h2></div><div class="card col">' +
        point('mosque', 'Cover all but the face and hands', 'Many scholars include the feet.', 'abudawud:641') +
        '</div>';
    if (tab === 's')
      h +=
        '<div class="card col gd-q">' +
        A.said('quran:33:59') +
        '<div class="refs"><a href="https://quran.com/33/59" data-a="ext">' +
        ic('link', 'xs') +
        'Qurʾān 33:59</a></div></div>';
    h +=
      '<div class="card col gd-q">' +
      A.said('quran:7:26') +
      '<div class="refs"><a href="https://quran.com/7/26" data-a="ext">' +
      ic('link', 'xs') +
      'Qurʾān 7:26</a></div></div>';
    return {
      html: h,
      title: 'Dress & ʿawrah',
      tab: 4,
      mount: function (el) {
        var v = A.$('.view', el);
        if (v) v.classList.add('gd-page');
        A.$$('details.hd-fold', el).forEach(function (d) {
          d.open = showAr;
        });
      }
    };
  };
  /* one switch shows or hides the Arabic of every point on the page */
  var showAr = false;
  A.acts['gd-ar'] = function () {
    showAr = !showAr;
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['gd-tab'] = function (el) {
    tab = el.dataset.v;
    A.N.haptic('tick');
    A.rerender();
  };
})();
