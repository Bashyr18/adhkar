/* My duʿāʾs: a private journal of what you are asking Allah for, gentle reminders at the authentic times of
   answered duʿāʾ, and a record of what was answered. Also iqāmah helpers used across the app. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    P = window.Prayer,
    $ = A.$,
    esc = A.esc,
    ic = A.icon;
  var MIN = 60000;

  /* ---------- iqāmah ---------- */
  A.iqamaAt = function (key, k) {
    var t = A.pday(key);
    return t[k] + (S.iqama && S.iqama[k] != null ? S.iqama[k] : 15) * MIN;
  };

  /* ---------- the authentic times of answered duʿāʾ, now ---------- */
  A.answerNow = function () {
    if (!S.loc) return null;
    var k = A.today(),
      t = A.pday(k),
      y = A.pday(A.shift(k, -1)),
      now = Date.now();
    if ((now >= y.lastThird && now < t.fajr) || now >= t.lastThird)
      return {
        t: 'The last third of the night',
        d: 'Our Lord descends and says: who is calling upon Me, that I may answer him? (al-Bukhārī 1145)'
      };
    if (A.dow(k) === 5 && now >= t.maghrib - 60 * MIN && now < t.maghrib)
      return {
        t: 'The last hour of Friday',
        d: 'There is an hour on Friday in which a Muslim asks Allah for good and is given it. Seek it in the last hour after ʿAṣr. (Abū Dāwūd 1048)'
      };
    for (var i = 0; i < A.PRAYERS.length; i++) {
      var p = A.PRAYERS[i],
        end = S.iqama && S.iqama.on ? A.iqamaAt(k, p) : t[p] + 20 * MIN;
      if (now >= t[p] && now < end)
        return {
          t: 'Between adhān and iqāmah',
          d: 'The duʿāʾ between the adhān and the iqāmah is not rejected. (Abū Dāwūd 521, at-Tirmidhī 212)',
          p: p
        };
    }
    return null;
  };
  function nextAnswer() {
    if (!S.loc) return null;
    var k = A.today(),
      t = A.pday(k),
      now = Date.now(),
      c = [];
    A.PRAYERS.forEach(function (p) {
      if (t[p] > now) c.push({ at: t[p], t: 'After the adhān of ' + P.NAMES[p] });
    });
    if (t.lastThird > now) c.push({ at: t.lastThird, t: 'The last third of the night' });
    if (A.dow(k) === 5 && t.maghrib - 60 * MIN > now)
      c.push({ at: t.maghrib - 60 * MIN, t: 'The last hour of Friday' });
    if (!c.length) {
      var tm = A.pday(A.shift(k, 1));
      c.push({ at: tm.fajr, t: 'After the adhān of Fajr' });
    }
    return c.sort(function (a, b) {
      return a.at - b.at;
    })[0];
  }

  /* ---------- journal ---------- */
  var TAGS = ['Myself', 'Family', 'Health', 'Provision', 'Guidance', 'The ummah'];
  function J() {
    return S.journal;
  }
  A.duaPick = function (key) {
    var open = J().items.filter(function (d) {
      return !d.done;
    });
    if (!open.length) return null;
    var h = 0;
    for (var j = 0; j < key.length; j++) h = (h * 31 + key.charCodeAt(j)) >>> 0;
    return open[h % open.length];
  };
  A.V.journal = function () {
    var j = J(),
      open = j.items.filter(function (d) {
        return !d.done;
      }),
      done = j.items.filter(function (d) {
        return d.done;
      }),
      now = A.answerNow(),
      nx = nextAnswer();
    var h =
      A.back('Back') +
      '<header class="top"><div class="tt"><div class="eyebrow">Journal</div><h1>My <em>duʿāʾs</em></h1></div><div class="acts"><button type="button" class="ib ghost" data-a="dua-add" aria-label="Add a duʿāʾ">' +
      ic('plus', 's') +
      '</button></div></header>';
    h += now
      ? '<div class="card col jr-now glowcard"><div class="eyebrow">' +
        ic('spark', 'xs') +
        ' Now · a time of answered duʿāʾ</div><div class="jr-t">' +
        esc(now.t) +
        '</div><p class="muted small">' +
        esc(now.d) +
        '</p>' +
        '' +
        '</div>'
      : nx
        ? '<div class="card row jr-next"><span class="badge s h-indigo">' +
          ic('clock', 's') +
          '</span><div class="grow"><div class="faint small">Next answered time</div><div style="font-weight:700">' +
          esc(nx.t) +
          '</div></div><div class="num" style="font-weight:700">' +
          A.fmtT(nx.at) +
          '</div></div>'
        : '';
    if (!j.items.length)
      h +=
        '<div class="empty card col" style="align-items:center;text-align:center;padding:26px 18px"><div class="badge h-gold" style="width:56px;height:56px">' +
        ic('hands') +
        '</div><h3>Write what you are asking for</h3><p class="muted small">You will be reminded at the times duʿāʾ is answered.</p><button type="button" class="btn pri" data-a="dua-add">' +
        ic('plus', 's') +
        'Add a duʿāʾ</button></div>';
    if (open.length)
      h +=
        '<div class="sec"><h2>Asking</h2><span class="aside">' +
        open.length +
        '</span></div><div class="col" style="gap:10px">' +
        open.map(card).join('') +
        '</div>';
    if (done.length)
      h +=
        '<div class="sec"><h2>Answered</h2><span class="aside">Alḥamdulillāh</span></div><div class="col" style="gap:10px">' +
        done.map(card).join('') +
        '</div>';
    var N = j.nudge;
    h +=
      '<div class="sec"><h2>Remind me</h2></div><div class="card pad0"><div class="list">' +
      row('The last third of the night', 'With one of your duʿāʾs', A.sw(N.night, 'dua-nudge', ' data-k="night"')) +
      row('The last hour of Friday', 'Before Maghrib on Friday', A.sw(N.friday, 'dua-nudge', ' data-k="friday"')) +
      row(
        'Between adhān and iqāmah',
        N.adhan ? 'At ' + P.NAMES[N.adhan] : 'Off',
        '<button type="button" class="chip on" data-a="dua-adhan-pick">' +
          (N.adhan ? P.NAMES[N.adhan] : 'Off') +
          ic('down', 'xs') +
          '</button>'
      ) +
      '</div></div>';
    if (!S.notif.enabled) h += '<p class="faint small" style="margin:4px 6px">Reminders are off in Settings.</p>';
    h +=
      '<a class="card coll press h-indigo" href="#/answered"><div class="badge s">' +
      ic('book', 's') +
      '</div><div class="grow"><div class="t">When duʿāʾ is answered</div><div class="s">The times and states from the authentic Sunnah</div></div>' +
      ic('right', 's') +
      '</a>';
    return { html: h, title: 'My duʿāʾs', tab: 3 };
  };
  function row(t, s, right) {
    return (
      '<div class="set"><div class="grow"><div class="t">' +
      t +
      '</div>' +
      (s ? '<div class="s">' + s + '</div>' : '') +
      '</div><div class="ctl">' +
      right +
      '</div></div>'
    );
  }
  function card(d) {
    return (
      '<div class="card col jr-card' +
      (d.done ? ' done' : '') +
      '"><div class="jr-text">' +
      esc(d.text).replace(/\n/g, '<br>') +
      '</div>' +
      '<div class="spread"><div class="faint small">' +
      (d.tag ? esc(d.tag) + ' · ' : '') +
      (d.done ? 'Answered ' + esc(A.fmtDate(d.done, 'short')) : 'Since ' + esc(A.fmtDate(d.since, 'short'))) +
      '</div><div class="row" style="gap:6px">' +
      (d.done
        ? ''
        : '<button type="button" class="chip" data-a="dua-done" data-id="' +
          d.id +
          '">' +
          ic('check', 'xs') +
          'Answered</button>') +
      '<button type="button" class="ib ghost sm" data-a="dua-edit" data-id="' +
      d.id +
      '" aria-label="Edit">' +
      ic('edit', 's') +
      '</button></div></div>' +
      (d.note ? '<div class="jr-note">' + esc(d.note) + '</div>' : '') +
      '</div>'
    );
  }
  function find(id) {
    return J().items.filter(function (d) {
      return d.id === id;
    })[0];
  }
  function editor(d) {
    var isNew = !d;
    d = d || { text: '', tag: '' };
    var sh = A.sheet(
      isNew ? 'Add a duʿāʾ' : 'Edit duʿāʾ',
      '<div class="field"><label>What are you asking for?</label><textarea class="input" id="duT" rows="4" maxlength="600" placeholder="In your own words, in any language">' +
        esc(d.text) +
        '</textarea></div>' +
        '<div class="field"><label>About</label><div class="row" style="flex-wrap:wrap;gap:8px" id="duG">' +
        TAGS.map(function (t) {
          return (
            '<button type="button" class="chip" data-t="' +
            esc(t) +
            '" aria-pressed="' +
            (d.tag === t) +
            '">' +
            esc(t) +
            '</button>'
          );
        }).join('') +
        '</div></div>' +
        (d.done
          ? '<div class="field"><label>How it was answered (optional)</label><input class="input" id="duN" maxlength="200" value="' +
            esc(d.note || '') +
            '"></div>'
          : '') +
        '<button type="button" class="btn pri wide" id="duOk">' +
        (isNew ? 'Add' : 'Save') +
        '</button>' +
        (isNew
          ? ''
          : '<button type="button" class="btn ghost wide" id="duDel" style="color:var(--bad)">Delete</button>'),
      {
        mount: function (el) {
          var tag = d.tag;
          $('#duG', el).addEventListener('click', function (e) {
            var b = e.target.closest('[data-t]');
            if (!b) return;
            tag = tag === b.dataset.t ? '' : b.dataset.t;
            Array.prototype.forEach.call($('#duG', el).children, function (c) {
              c.setAttribute('aria-pressed', c.dataset.t === tag);
            });
          });
          setTimeout(function () {
            $('#duT', el).focus();
          }, 250);
          $('#duOk', el).addEventListener('click', function () {
            var text = $('#duT', el).value.trim();
            if (!text) {
              $('#duT', el).focus();
              return;
            }
            if (isNew) J().items.unshift({ id: Date.now().toString(36), text: text, tag: tag, since: A.today() });
            else {
              d.text = text;
              d.tag = tag;
              var n = $('#duN', el);
              if (n) d.note = n.value.trim();
            }
            A.save();
            A.N.haptic('success');
            sh.close();
            A.rerender();
          });
          var del = $('#duDel', el);
          if (del)
            del.addEventListener('click', function () {
              sh.close();
              A.confirm(
                'Delete this duʿāʾ?',
                'It will be removed from your journal.',
                'Delete',
                function () {
                  J().items = J().items.filter(function (x) {
                    return x !== d;
                  });
                  A.save();
                  A.rerender();
                },
                true
              );
            });
        }
      }
    );
  }
  A.acts['dua-add'] = function () {
    editor(null);
  };
  A.acts['dua-edit'] = function (el) {
    var d = find(el.dataset.id);
    if (d) editor(d);
  };
  A.acts['dua-done'] = function (el) {
    var d = find(el.dataset.id);
    if (!d) return;
    d.done = A.today();
    A.save();
    A.N.haptic('success');
    A.fx.done();
    A.toast('Alḥamdulillāh. Recorded as answered.', 'heart');
    A.rerender();
  };
  A.acts['dua-nudge'] = function (el) {
    var N = J().nudge;
    N[el.dataset.k] = !N[el.dataset.k];
    el.setAttribute('aria-checked', N[el.dataset.k]);
    A.save();
    A.N.haptic('tick');
  };
  A.acts['dua-adhan'] = function (el) {
    J().nudge.adhan = el.dataset.v;
    A.save();
    A.N.haptic('tick');
    A.rerender();
  };
  A.acts['dua-adhan-pick'] = function () {
    A.options(
      'Between adhān and iqāmah',
      [{ v: '', t: 'Off' }].concat(
        A.PRAYERS.map(function (p) {
          return { v: p, t: P.NAMES[p], s: 'A reminder when the adhān of ' + P.NAMES[p] + ' is called' };
        })
      ),
      J().nudge.adhan || '',
      function (v) {
        J().nudge.adhan = v;
        A.save();
        A.rerender();
      }
    );
  };
})();
