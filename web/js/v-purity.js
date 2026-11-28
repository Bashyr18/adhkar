/* Wuḍūʾ and ghusl, taught step by step in the same player as the prayer (web/js/v-learn.js). Reached from the Ṣalāh
   tab (each prayer, in order), Learn the prayer, the Ṣalāh checklist, the break cards and search. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    esc = A.esc,
    ic = A.icon;
  var lessons = {
    wudu: {
      title: ['Wuḍūʾ', 'الوضوء'],
      lead: [
        'Wuḍūʾ is ritual ablution for prayer. Renew it when it has been broken, for example after using the toilet or passing wind.',
        'الوضوء طهارة للصلاة. جدّده إذا انتقض، مثلًا بعد قضاء الحاجة أو خروج الريح.'
      ],
      note: [
        'The Qurʾān names the face, arms through the elbows, wiping the head and feet through the ankles. This walkthrough shows a fuller Sunnah sequence. Schools differ on some required details.',
        'ذكر القرآن الوجه واليدين إلى المرفقين ومسح الرأس والرجلين إلى الكعبين. يعرض الدليل صفةً من السنة، وتختلف المذاهب في بعض تفاصيل الواجب.'
      ],
      refs: ['quran:5/6', 'bukhari:159', 'bukhari:185', 'abudawud:135'],
      steps: [
        [
          'prepare',
          'Intend purification',
          'انوِ الطهارة',
          'Make the intention in your heart. Use clean water and remove anything that blocks it from reaching the areas you will wash.',
          'انوِ الطهارة في قلبك، واستعمل ماءً طهورًا وأزل ما يمنع وصوله إلى المواضع التي ستغسلها.'
        ],
        [
          'hands',
          'Wash both hands',
          'اغسل الكفين',
          'Wash your hands to the wrists, including between the fingers. In the reported sequence, wash them three times.',
          'اغسل كفّيك إلى الرسغين مع تخليل الأصابع. وفي الصفة المروية تغسلهما ثلاثًا.'
        ],
        [
          'rinse',
          'Rinse the mouth and nose',
          'تمضمض واستنشق',
          'Rinse your mouth and spit out the water. Draw a little water into your nose and blow it out gently. In this sequence, repeat three times.',
          'تمضمض ثم اطرح الماء، واستنشق قليلًا من الماء ثم استنثر برفق. كرّر ذلك ثلاثًا في هذه الصفة.'
        ],
        [
          'face',
          'Wash the face',
          'اغسل الوجه',
          'Wash from the usual hairline to the chin and from ear to ear. In this sequence, wash three times.',
          'اغسل وجهك من منابت الشعر المعتادة إلى الذقن، ومن الأذن إلى الأذن. اغسله ثلاثًا في هذه الصفة.'
        ],
        [
          'arms',
          'Wash the arms',
          'اغسل الذراعين',
          'Wash from the fingertips through the elbow, starting with the right arm, then the left. Include the elbows. In this sequence, wash each arm three times.',
          'اغسل من أطراف الأصابع إلى المرفق مع إدخاله في الغسل. ابدأ باليمنى ثم اليسرى، واغسل كل ذراع ثلاثًا في هذه الصفة.'
        ],
        [
          'wipe',
          'Wipe the head and ears',
          'امسح الرأس والأذنين',
          'With wet hands, wipe over your head from front to back and return to where you began. Wipe the inner and outer parts of your ears. Do this once.',
          'امسح رأسك بيدين مبللتين من مقدّمه إلى مؤخره، ثم ارجع إلى موضع البدء. وامسح باطن أذنيك وظاهرهما مرةً واحدة.'
        ],
        [
          'feet',
          'Wash the feet',
          'اغسل القدمين',
          'Wash the right foot, then the left, through the ankles. Check the heels and between the toes. In this sequence, wash each foot three times.',
          'اغسل القدم اليمنى ثم اليسرى مع الكعبين، وتحقّق من وصول الماء إلى العقبين وبين الأصابع. اغسل كل قدم ثلاثًا في هذه الصفة.'
        ]
      ]
    },
    ghusl: {
      title: ['Ghusl', 'الغسل'],
      lead: [
        'Ghusl is a full ritual wash. It is required after janābah (for example, after intercourse or emission of semen) and when menstruation or postpartum bleeding ends.',
        'الغسل طهارة تشمل البدن كله. يجب بعد الجنابة، مثل الجماع أو خروج المني، وعند انقطاع الحيض أو النفاس.'
      ],
      note: [
        'This guide teaches a Sunnah sequence where water reaches the whole body and the roots of the hair. Schools differ on required details such as rinsing the mouth and nose, whether intention is an obligation or an emphasized Sunnah, and whether rubbing the body is required. This walkthrough includes rinsing and thorough washing so it covers those differences cleanly.',
        'يعرض هذا الدليل صفةً من السنة يعمّ فيها الماء البدن كله وأصول الشعر. وتختلف المذاهب في بعض الواجبات، كالمضمضة والاستنشاق، وحكم النية بين الوجوب والسنة المؤكدة، ووجوب الدلك؛ ولذلك يجمع الدليل بينها احتياطًا ووضوحًا.'
      ],
      refs: ['quran:5/6', 'bukhari:248', 'bukhari:257', 'muslim:330a', 'muslim:332c'],
      steps: [
        [
          'prepare',
          'Prepare and intend',
          'استعدّ وانوِ',
          'Find a private place, prepare clean water and intend ritual purification in your heart. Remove anything that prevents water from reaching the skin.',
          'تهيّأ في مكان يستر عورتك، واستعمل ماءً طهورًا وانوِ الطهارة في قلبك. أزل ما يمنع وصول الماء إلى البشرة.'
        ],
        [
          'clean',
          'Wash hands and remove impurity',
          'اغسل يديك وأزل النجاسة',
          'Wash your hands. Clean the private area and any impurity on the body, then clean your hands again.',
          'اغسل يديك ثم اغسل موضع العورة وما على البدن من نجاسة، ونظّف يديك بعد ذلك.'
        ],
        [
          'rinse',
          'Perform wuḍūʾ',
          'توضّأ',
          'Perform wuḍūʾ as for prayer, including rinsing the mouth and nose. You can leave the feet until the end, as in the report from Maymūnah.',
          'توضّأ وضوءك للصلاة مع المضمضة والاستنشاق. ويمكن تأخير غسل القدمين إلى النهاية كما في حديث ميمونة رضي الله عنها.'
        ],
        [
          'roots',
          'Wet the scalp and hair',
          'أوصل الماء إلى أصول الشعر',
          'Work water through your hair to the scalp, then pour water over your head three times in this method. Make sure water reaches the roots.',
          'خلّل شعرك بالماء حتى يصل إلى فروة الرأس، ثم أفِض الماء على رأسك ثلاث مرات في هذه الصفة، وتحقّق من وصوله إلى الأصول.'
        ],
        [
          'body',
          'Wash the entire body',
          'عمّم البدن بالماء',
          'Let water reach the whole body, including the back, underarms, navel and skin folds. Do not leave a dry patch.',
          'عمّم البدن كله بالماء، بما في ذلك الظهر والإبطان والسرة وثنايا الجلد، ولا تترك موضعًا جافًا.'
        ],
        [
          'feet',
          'Finish with the feet',
          'أتمّ غسل القدمين',
          'If you deferred the feet, wash them now. Check the ankles and between the toes. Make a final check that water has reached the entire body.',
          'إن أخّرت غسل القدمين فاغسلهما الآن، وتحقّق من الكعبين وبين الأصابع ومن وصول الماء إلى كامل البدن.'
        ]
      ]
    }
  };
  var evidence = {
    'quran:5/6': [
      'The verse names what to wash or wipe for prayer and instructs purification after janābah.',
      'تذكر الآية أعضاء الوضوء وتأمر بالتطهّر من الجنابة.'
    ],
    'bukhari:159': [
      'ʿUthmān demonstrated wuḍūʾ, including rinsing, washing and wiping the head, as he saw the Prophet ﷺ do.',
      'بيّن عثمان رضي الله عنه وضوء النبي ﷺ، وفيه المضمضة والاستنشاق والغسل ومسح الرأس.'
    ],
    'bukhari:185': [
      'ʿAbdullāh ibn Zayd described wiping the head from front to back and then returning to the starting point.',
      'وصف عبد الله بن زيد رضي الله عنه مسح الرأس من مقدّمه إلى قفاه ثم الرجوع إلى موضع البدء.'
    ],
    'abudawud:135': [
      'This report describes wiping the inside of the ears with the index fingers and the outside with the thumbs.',
      'يصف الحديث مسح باطن الأذنين بالسبابتين وظاهرهما بالإبهامين.'
    ],
    'bukhari:248': [
      'ʿĀʾishah described washing the hands, doing wuḍūʾ, wetting the hair roots and washing the whole body.',
      'وصفت عائشة رضي الله عنها غسل اليدين والوضوء وتخليل أصول الشعر وتعميم البدن بالماء.'
    ],
    'bukhari:257': [
      'Maymūnah described washing away impurity before washing the body and washing the feet last.',
      'وصفت ميمونة رضي الله عنها إزالة النجاسة قبل غسل البدن وتأخير غسل القدمين.'
    ],
    'muslim:330a': [
      'Umm Salamah asked about braided hair for ghusl after janābah. The answer did not require undoing the braids.',
      'سألت أم سلمة رضي الله عنها عن ضفائرها في غسل الجنابة، فلم تُؤمر بنقضها.'
    ],
    'muslim:332c': [
      'The report describes washing after menstruation and using a scented cloth afterward.',
      'يصف الحديث غسل الحيض واستعمال قطعةٍ معطّرة بعده.'
    ]
  };
  function L(en, ar) {
    return A.ar() ? ar : en;
  }
  function pair(words) {
    return esc(L(words[0], words[1]));
  }
  function route(kind, step) {
    return '#/purity/' + kind + (step ? '/' + step : '');
  }
  function img(name) {
    return A.asset('img/purity/' + name + '.webp');
  }
  function reference(id) {
    var parts = id.split(':'),
      names = {
        quran: L('Qurʾān', 'القرآن'),
        bukhari: L('Bukhārī', 'البخاري'),
        muslim: L('Muslim', 'مسلم'),
        abudawud: L('Abū Dāwūd', 'أبو داود')
      };
    return (
      '<a data-a="ext" href="' +
      (parts[0] === 'quran' ? 'https://quran.com/' + parts[1] : 'https://sunnah.com/' + id) +
      '">' +
      ic('link', 'xs') +
      esc(names[parts[0]] + ' ' + (A.ar() ? A.arDigits(parts[1].replace('/', ':')) : parts[1].replace('/', ':'))) +
      '</a>'
    );
  }
  /* each lesson's art for the opening page, and a few words on when it is needed */
  var COVER = { wudu: 'hands', ghusl: 'prepare' };
  var WHEN = {
    wudu: ['Before the prayer', 'قبل الصلاة'],
    ghusl: ['The full wash', 'الطهارة الكبرى']
  };

  /* ---------------------------------------------------------------------------------------------------------------
     The lessons play exactly as the prayer is taught (web/js/v-learn.js): one full-screen player, its progress across
     the top, the figure on a stage, the words below, and a dock to step through (or swipe, or the arrow keys).
     Step 0 opens the lesson (when it is needed, the choice between wuḍūʾ and ghusl, the notes and evidence, every
     step to jump to); then each step; then the close. Switching lessons slides in place. */
  var K = 'wudu',
    idx = 0,
    front = 'a',
    keyH = null,
    lastKey = '',
    openerHref = null;
  function count() {
    return lessons[K].steps.length;
  }
  A.V.purity = function (a) {
    var actEl = document.activeElement && document.activeElement.closest && document.activeElement.closest('a[href]');
    if (actEl && actEl.getAttribute('href') && !/^#\/purity/.test(actEl.getAttribute('href')))
      openerHref = actEl.getAttribute('href');
    K = a[0] === 'ghusl' ? 'ghusl' : 'wudu';
    var n = count();
    idx = /^\d+$/.test(a[1] || '') ? Math.min(+a[1], n + 1) : 0;
    var h =
      '<div class="lp pu no-tr" id="lp"><header class="lp-top"><button type="button" class="ib ghost" data-a="pu-close" aria-label="' +
      L('Close', 'إغلاق') +
      '">' +
      ic('close', 's') +
      '</button><div class="lp-tt"><b id="puT"></b><span id="puR"></span></div><span class="pu-gap" aria-hidden="true"></span></header>' +
      '<div class="lp-prog" id="puP" role="progressbar" aria-label="' +
      L('Lesson progress', 'تقدّم الدرس') +
      '"></div>' +
      '<div class="lp-stage pu-stage" aria-hidden="true"><div class="lp-halo"></div><img class="lp-fig a" alt=""><img class="lp-fig b" alt=""></div>' +
      '<div class="lp-body" id="puB"></div>' +
      '<footer class="lp-dock"><button type="button" class="ib lp-prev" data-a="pu-prev" aria-label="' +
      L('Previous step', 'الخطوة السابقة') +
      '">' +
      ic('left', 's') +
      '</button><button type="button" class="btn pri lp-next" data-a="pu-next"></button></footer></div>';
    return {
      html: h,
      title: L(lessons[K].title[0], lessons[K].title[1]),
      bare: true,
      tab: 3,
      mount: mount,
      unmount: unmount
    };
  };
  function mount(app) {
    var lp = app.querySelector('#lp');
    if (!lp) return;
    Object.keys(lessons).forEach(function (k) {
      lessons[k].steps.forEach(function (x) {
        new Image().src = img(x[0]);
      });
    });
    var x0 = null,
      y0 = 0,
      t0 = 0;
    lp.addEventListener(
      'touchstart',
      function (e) {
        if (e.touches.length !== 1 || e.target.closest('.lp-dock, .lp-top, summary, .pu-pick')) {
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
      if (document.querySelector('.sheet:not(.out)')) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      var rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'ArrowRight') go(rtl ? -1 : 1);
      else if (e.key === 'ArrowLeft') go(rtl ? 1 : -1);
    };
    document.addEventListener('keydown', keyH);
    if (S.prefs.wake) A.N.keepAwake(true);
    front = 'a';
    /* drawn again on the same step (a theme change, midnight): the figure stays still instead of arriving again */
    var key = K + ':' + idx;
    lp.classList.toggle('no-anim', key === lastKey);
    lastKey = key;
    frame();
    paint(0);
  }
  function unmount() {
    if (keyH) document.removeEventListener('keydown', keyH);
    keyH = null;
    A.N.keepAwake(false);
  }
  /* the lesson's title and its progress bars, one per step */
  function frame() {
    var t = document.getElementById('puT'),
      p = document.getElementById('puP');
    if (!t || !p) return;
    t.textContent = L(lessons[K].title[0], lessons[K].title[1]);
    p.innerHTML = Array.apply(null, Array(count()))
      .map(function () {
        return '<i><b></b></i>';
      })
      .join('');
    document.title = t.textContent + ' · Adhkār';
  }
  function go(d) {
    var j = idx + d;
    if (j < 0 || j > count() + 1) return;
    idx = j;
    A.N.haptic('tick');
    paint(d);
  }
  function paint(dir) {
    var lp = document.getElementById('lp'),
      n = count(),
      lesson = lessons[K];
    if (!lp) return;
    if (dir) lp.classList.remove('no-anim');
    lastKey = K + ':' + idx;
    var done = idx === n + 1;
    A.$$('#puP i', lp).forEach(function (bar, i) {
      bar.firstChild.style.transform = 'scaleX(' + (idx >= i + 1 ? 1 : 0) + ')';
    });
    var pb = document.getElementById('puP');
    pb.setAttribute('aria-valuemin', 0);
    pb.setAttribute('aria-valuemax', n);
    pb.setAttribute('aria-valuenow', Math.min(idx, n));
    document.getElementById('puR').textContent = done
      ? L('Complete', 'تمّ')
      : idx
        ? L('Step ', 'الخطوة ') + A.fmtN(idx) + L(' of ', ' من ') + A.fmtN(n)
        : L('Before you begin', 'قبل أن تبدأ');
    /* the figure cross-fades only when the picture changes */
    var pic = done ? null : idx ? lesson.steps[idx - 1][0] : COVER[K],
      cur = lp.querySelector('.lp-fig.' + front);
    if (pic && cur.getAttribute('data-p') !== pic) {
      var back = lp.querySelector('.lp-fig.' + (front === 'a' ? 'b' : 'a'));
      back.src = img(pic);
      back.setAttribute('data-p', pic);
      back.classList.add('on');
      cur.classList.remove('on');
      front = front === 'a' ? 'b' : 'a';
    }
    lp.classList.toggle('is-done', done);
    var b = document.getElementById('puB');
    b.innerHTML = done ? doneHtml() : idx ? stepHtml(lesson.steps[idx - 1], idx, n) : introHtml();
    b.classList.remove('slide-l', 'slide-r');
    void b.offsetWidth;
    if (dir) b.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
    b.scrollTop = 0;
    lp.querySelector('.lp-prev').disabled = idx === 0;
    var nx = lp.querySelector('.lp-next');
    nx.innerHTML = done
      ? L('Finish', 'إنهاء')
      : idx === n
        ? L('Complete', 'إتمام') + ic('check', 's')
        : (idx ? L('Next', 'التالي') : L('Begin', 'ابدأ')) + ic('right', 's');
    nx.setAttribute('data-a', done ? 'pu-close' : 'pu-next');
    /* the address follows the step, so back and a reopened app land where you were */
    try {
      history.replaceState(null, '', route(K, idx));
    } catch (e) {}
    pb.setAttribute('aria-valuetext', document.getElementById('puR').textContent);
    /* the step's heading takes focus as the lesson opens and on each move, so a screen reader starts there */
    var hd = b.querySelector('h2');
    if (hd) {
      if (!hd.hasAttribute('tabindex')) hd.setAttribute('tabindex', '-1');
      hd.focus({ preventScroll: true });
    }
  }
  function introHtml() {
    var lesson = lessons[K];
    return (
      '<div class="lp-name"><h2 tabindex="-1">' +
      pair(lesson.title) +
      '</h2>' +
      (A.ar() ? '' : '<span class="ar" lang="ar">' + esc(lesson.title[1]) + '</span>') +
      '</div>' +
      /* the two lessons side by side; the chosen one is marked, the other slides in */
      '<div class="pu-pick" role="group" aria-label="' +
      L('Purification lessons', 'دروس الطهارة') +
      '">' +
      ['wudu', 'ghusl']
        .map(function (k) {
          return (
            '<button type="button" class="pu-k" data-a="pu-kind" data-k="' +
            k +
            '" aria-pressed="' +
            (k === K) +
            '"><img src="' +
            img(COVER[k]) +
            '" alt="" aria-hidden="true"><span class="grow"><b>' +
            pair(lessons[k].title) +
            '</b><span>' +
            pair(WHEN[k]) +
            ' · ' +
            L(lessons[k].steps.length + ' steps', A.fmtN(lessons[k].steps.length) + ' خطوات') +
            '</span></span></button>'
          );
        })
        .join('') +
      '</div>' +
      '<p class="pu-lead">' +
      pair(lesson.lead) +
      '</p>' +
      '<details class="lp-alt pu-notes"><summary>' +
      L('What to know before you begin', 'ما ينبغي معرفته قبل البدء') +
      '</summary><p>' +
      pair(lesson.note) +
      '</p><ol class="pu-evidence">' +
      lesson.refs
        .map(function (id) {
          return '<li><p>' + pair(evidence[id]) + '</p><div class="refs">' + reference(id) + '</div></li>';
        })
        .join('') +
      '</ol></details>' +
      '<section class="lp-do"><div class="eyebrow">' +
      L('The steps', 'الخطوات') +
      '</div>' +
      lesson.steps
        .map(function (x, i) {
          return (
            '<button type="button" class="lp-act" data-a="pu-to" data-i="' +
            (i + 1) +
            '"><span class="pu-num">' +
            A.fmtN(i + 1) +
            '</span><span class="grow">' +
            esc(L(x[1], x[2])) +
            '</span>' +
            ic('right', 'xs') +
            '</button>'
          );
        })
        .join('') +
      '</section>'
    );
  }
  function stepHtml(x, i, n) {
    return (
      '<div class="lp-name"><h2 tabindex="-1">' +
      esc(L(x[1], x[2])) +
      '</h2>' +
      (A.ar() ? '' : '<span class="ar" lang="ar">' + esc(x[2]) + '</span>') +
      '</div><section class="lp-do"><div class="eyebrow">' +
      L('What you do', 'ما تفعله') +
      '</div><p class="pu-text">' +
      esc(L(x[3], x[4])) +
      '</p></section>' +
      (K === 'ghusl' && x[0] === 'rinse'
        ? '<button type="button" class="btn sec sm pu-also" data-a="pu-kind" data-k="wudu">' +
          ic('check', 's') +
          L('Review wuḍūʾ', 'راجع الوضوء') +
          '</button>'
        : '') +
      (i === n
        ? '<p class="faint small pu-last">' +
          L('The last step. Complete when you are ready.', 'الخطوة الأخيرة. أتمّ حين تكون جاهزًا.') +
          '</p>'
        : '')
    );
  }
  function doneHtml() {
    var w = K === 'wudu';
    return (
      '<div class="lp-done"><div class="lp-seal">' +
      ic('check') +
      '</div><h2>' +
      L(w ? 'Wuḍūʾ complete' : 'Ghusl complete', w ? 'تمّ الوضوء' : 'تمّ الغسل') +
      '</h2><p class="muted">' +
      (w
        ? L('After wuḍūʾ, you can recite the testimony of faith.', 'بعد الوضوء يمكنك قول الشهادتين.')
        : L(
            'Recall the sequence: prepare, clean, perform wuḍūʾ, wash the head and body, then check the feet.',
            'تذكّر الخطوات: الاستعداد وإزالة النجاسة والوضوء وغسل الرأس والبدن ثم التحقق من القدمين.'
          )) +
      '</p>' +
      (w ? A.saidFold('muslim:234', '') : '') +
      '<div class="refs" style="justify-content:center">' +
      (w ? reference('muslim:234a') : reference('bukhari:248')) +
      '</div><a class="btn pri wide" href="' +
      (w ? '#/r/daily/1' : '#/learn') +
      '">' +
      ic(w ? 'book' : 'mosque', 's') +
      L(w ? 'Testimony after wuḍūʾ' : 'Learn the prayer', w ? 'الشهادة بعد الوضوء' : 'تعلّم الصلاة') +
      '</a>' +
      (w
        ? '<a class="btn sec wide" href="#/learn">' + ic('mosque', 's') + L('Then, the prayer', 'ثم الصلاة') + '</a>'
        : '') +
      '<button type="button" class="btn ghost wide" data-a="pu-again">' +
      L('Go through it again', 'أعد الدرس') +
      '</button></div>'
    );
  }
  A.acts['pu-next'] = function () {
    go(1);
  };
  A.acts['pu-prev'] = function () {
    go(-1);
  };
  A.acts['pu-to'] = function (el) {
    var j = +el.dataset.i;
    if (!(j >= 1 && j <= count())) return;
    var d = j - idx;
    idx = j;
    A.N.haptic('tick');
    paint(d);
  };
  A.acts['pu-again'] = function () {
    idx = 0;
    paint(-1);
  };
  A.acts['pu-close'] = function () {
    A.pendingFocus = openerHref || '#/purity/' + K;
    openerHref = null;
    A.goBack('#/learn');
  };
  /* the other lesson slides in, in place: its title, its progress and its opening page */
  A.acts['pu-kind'] = function (el) {
    var k = el.dataset.k;
    if (!lessons[k] || k === K) return;
    var dir = k === 'ghusl' ? 1 : -1;
    K = k;
    idx = 0;
    frame();
    A.N.haptic('tick');
    paint(dir);
  };
})();
