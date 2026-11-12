/* Test yourself: scenario questions on the prayer, above all sujūd as-sahw. Rulings follow the guide (the Ḥanbalī
   ordering taught by Ibn Bāz and Ibn ʿUthaymīn); where an answer rests on a hadith, its verbatim text opens beneath.
   Every question has a box from 0 to 4: a right answer moves it up, a wrong one sends it back to 0, and sessions draw
   first on what is new or weakest, so mastery is earned and revisited. State: S.learn.quiz = { id: { b, n, at } }. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S,
    $ = A.$,
    esc = A.esc,
    ic = A.icon;

  var TOPICS = {
    sahw: ['Sujūd as-sahw', 'سجود السهو'],
    pillars: ['Pillars and obligations', 'الأركان والواجبات'],
    sunan: ['Sunnahs of the prayer', 'سنن الصلاة'],
    cond: ['Conditions', 'شروط الصلاة']
  };
  /* [id, topic, question, options (first is right; shown shuffled), why, hadith] — each text is [en, ar] */
  var Q = [
    [
      's1',
      'sahw',
      [
        'You are unsure whether you prayed three rakʿahs or four, and neither feels more likely.',
        'شككت: صليت ثلاثًا أم أربعًا، ولم يترجح عندك شيء.'
      ],
      [
        [
          'Build on three, complete the prayer, then two prostrations before the salām',
          'ابنِ على ثلاث، وأتمّ، ثم اسجد سجدتين قبل السلام'
        ],
        ['Assume four and finish without sujūd', 'افترض أربعًا وأتمّ بلا سجود'],
        ['Stop and restart the prayer', 'اقطع الصلاة وابدأ من جديد'],
        ['Give salām, then prostrate twice', 'سلّم ثم اسجد سجدتين']
      ],
      [
        'The lower number is certain, so you build on it; this doubt is made up before the salām.',
        'الأقل هو اليقين فتبني عليه، ويُجبر هذا الشك قبل السلام.'
      ],
      'muslim:571'
    ],
    [
      's2',
      'sahw',
      ['Unsure between three and four, but four feels more likely.', 'شككت بين ثلاث وأربع، والأربع أرجح عندك.'],
      [
        ['Act on four, complete, give salām, then prostrate twice', 'اعمل بالأربع، وأتمّ وسلّم، ثم اسجد سجدتين'],
        ['Build on three and prostrate before the salām', 'ابنِ على ثلاث واسجد قبل السلام'],
        ['Restart the prayer', 'أعد الصلاة'],
        ['Finish without sujūd as-sahw', 'أتمّ بلا سجود سهو']
      ],
      [
        'When one side is more likely, you act on it and prostrate after the salām.',
        'إذا ترجح أحد الأمرين عملت به وسجدت بعد السلام.'
      ],
      'bukhari:401'
    ],
    [
      's3',
      'sahw',
      ['After the salām you realise you prayed five rakʿahs of Dhuhr.', 'بعد السلام تبيّن أنك صليت الظهر خمسًا.'],
      [
        ['Prostrate twice, then give salām again', 'اسجد سجدتين ثم سلّم'],
        ['The prayer is invalid; repeat it', 'الصلاة باطلة فأعدها'],
        ['Nothing; the extra rakʿah is voluntary', 'لا شيء، والزائدة نافلة'],
        ['Pray one more rakʿah', 'صلِّ ركعة أخرى']
      ],
      [
        'An addition made by mistake is made up after the salām, as the Prophet ﷺ did.',
        'الزيادة سهوًا تُجبر بعد السلام كما فعل النبي ﷺ.'
      ],
      'bukhari:1226'
    ],
    [
      's4',
      'sahw',
      ['You stand for a fifth rakʿah and realise it while standing.', 'قمت إلى ركعة خامسة وتذكرت وأنت قائم.'],
      [
        ['Sit down at once, finish, and prostrate twice after the salām', 'اجلس فورًا، وأتمّ، واسجد سجدتين بعد السلام'],
        ['Complete the fifth rakʿah, then prostrate', 'أكمل الخامسة ثم اسجد'],
        ['Restart the prayer', 'أعد الصلاة'],
        ['Continue and add a sixth to make it even', 'أكمل وأضف سادسة']
      ],
      [
        'You return the moment you know; the addition is then made up after the salām.',
        'ترجع حين تتذكر، ثم تجبر الزيادة بعد السلام.'
      ],
      'bukhari:1226'
    ],
    [
      's5',
      'sahw',
      [
        'You forget the first tashahhud and are already standing fully for the third rakʿah.',
        'نسيت التشهد الأول واستتممت قائمًا للثالثة.'
      ],
      [
        ['Carry on, and prostrate twice before the salām', 'امضِ، واسجد سجدتين قبل السلام'],
        ['Sit back down for the tashahhud', 'ارجع فاجلس للتشهد'],
        ['Restart the prayer', 'أعد الصلاة'],
        ['Carry on; nothing is needed', 'امضِ ولا شيء عليك']
      ],
      [
        'Once standing, you do not go back; the forgotten obligation is made up before the salām.',
        'إذا استتممت قائمًا لم ترجع، وتجبر الواجب المتروك قبل السلام.'
      ],
      'bukhari:1224'
    ],
    [
      's6',
      'sahw',
      [
        'You begin to rise for the third rakʿah and remember the first tashahhud before you are fully up.',
        'بدأت تنهض للثالثة وتذكرت التشهد الأول قبل أن تستتم قائمًا.'
      ],
      [
        ['Return, sit and recite the tashahhud', 'ارجع واجلس وتشهّد'],
        ['Keep rising and prostrate later', 'أكمل القيام واسجد لاحقًا'],
        ['Restart the prayer', 'أعد الصلاة'],
        ['Ignore it', 'لا تلتفت إليه']
      ],
      [
        'Before you stand fully, you return to the tashahhud and complete the prayer.',
        'قبل أن تستتم قائمًا ترجع إلى التشهد وتتم صلاتك.'
      ],
      null
    ],
    [
      's7',
      'sahw',
      [
        'You give salām after two rakʿahs of ʿAṣr, and are reminded straight away.',
        'سلّمت من ركعتين في العصر، وذُكّرت فورًا.'
      ],
      [
        [
          'Stand, pray the remaining two, give salām, prostrate twice, then salām',
          'قم فصلِّ الركعتين الباقيتين، وسلّم، واسجد سجدتين، ثم سلّم'
        ],
        ['Pray ʿAṣr again from the start', 'أعد العصر من أولها'],
        ['Prostrate twice only', 'اسجد سجدتين فقط'],
        ['Nothing; two rakʿahs suffice', 'لا شيء، وتكفي ركعتان']
      ],
      [
        'The Prophet ﷺ completed what was left, gave salām, then made the two prostrations of forgetfulness.',
        'أتمّ النبي ﷺ ما بقي وسلّم، ثم سجد سجدتي السهو.'
      ],
      'bukhari:1229'
    ],
    [
      's8',
      'sahw',
      [
        'You missed the rukūʿ of the first rakʿah, and remember only when bowing in the second.',
        'نسيت ركوع الركعة الأولى، ولم تتذكر إلا وأنت راكع في الثانية.'
      ],
      [
        [
          'The second rakʿah takes the place of the first; prostrate twice after the salām',
          'تقوم الثانية مقام الأولى، واسجد سجدتين بعد السلام'
        ],
        ['Go back to the first rakʿah', 'ارجع إلى الركعة الأولى'],
        ['The prayer is invalid', 'الصلاة باطلة'],
        ['Only prostrate at the end', 'اسجد في آخرها فقط']
      ],
      [
        'Having reached the same pillar in the next rakʿah, that rakʿah replaces the incomplete one.',
        'إذا بلغت موضع الركن من الركعة التالية قامت مقام الناقصة.'
      ],
      null
    ],
    [
      's9',
      'sahw',
      ['Behind an imam, he makes the two prostrations of forgetfulness.', 'خلف إمام، سجد للسهو.'],
      [
        ['Prostrate with him', 'اسجد معه'],
        ['Stay seated and wait', 'ابقَ جالسًا وانتظر'],
        ['Prostrate on your own after the salām', 'اسجد وحدك بعد السلام'],
        ['Repeat the prayer', 'أعد الصلاة']
      ],
      ['The imam is followed: you do not differ from him.', 'الإمام يُؤتمّ به فلا تختلف عليه.'],
      'bukhari:722'
    ],
    [
      's10',
      'sahw',
      [
        'In one prayer you forget the first tashahhud and also doubt the count.',
        'في صلاة واحدة نسيت التشهد الأول وشككت في العدد.'
      ],
      [
        ['One set of two prostrations', 'سجدتان فقط'],
        ['Two sets, one for each mistake', 'سجدتان لكل خطأ'],
        ['A prostration for each mistake', 'سجدة لكل خطأ'],
        ['The prayer is invalid', 'الصلاة باطلة']
      ],
      ['Several lapses are made up by one pair of prostrations.', 'تكفي سجدتان عن السهو المتعدد.'],
      null
    ],
    [
      's11',
      'sahw',
      [
        'After the prayer is over, you doubt whether you prayed three or four.',
        'بعد الفراغ من الصلاة شككت: ثلاثًا صليت أم أربعًا.'
      ],
      [
        ['Set the doubt aside, unless you are certain', 'لا تلتفت إلى الشك إلا أن تتيقن'],
        ['Repeat the prayer', 'أعد الصلاة'],
        ['Prostrate twice now', 'اسجد سجدتين الآن'],
        ['Pray one more rakʿah', 'صلِّ ركعة']
      ],
      [
        'A doubt that comes after the prayer has ended does not count, unless it becomes certainty.',
        'الشك بعد الفراغ لا يُلتفت إليه إلا إن صار يقينًا.'
      ],
      null
    ],
    [
      's12',
      'sahw',
      ['How are the prostrations of forgetfulness made?', 'كيف يُسجد للسهو؟'],
      [
        [
          'Two prostrations like those of the prayer, with Allāhu akbar going down and rising',
          'سجدتان كسجود الصلاة، يكبّر عند الهوي والرفع'
        ],
        ['One long prostration', 'سجدة واحدة طويلة'],
        ['Two prostrations with no takbīr', 'سجدتان بلا تكبير'],
        ['A full extra rakʿah', 'ركعة كاملة زائدة']
      ],
      [
        'He ﷺ said Allāhu akbar and prostrated as in his prayer, then rose with takbīr, twice.',
        'كبّر ﷺ وسجد مثل سجوده، ثم رفع وكبّر، مرتين.'
      ],
      'bukhari:1229'
    ],
    [
      'p1',
      'pillars',
      ['What is al-Fātiḥah in every rakʿah?', 'ما حكم الفاتحة في كل ركعة؟'],
      [
        ['A pillar', 'ركن'],
        ['An obligation made up by sujūd as-sahw', 'واجب يُجبر بالسجود'],
        ['A sunnah', 'سنة'],
        ['Only for the imam', 'للإمام فقط']
      ],
      ['There is no prayer for one who does not recite it.', 'لا صلاة لمن لم يقرأ بها.'],
      'bukhari:756'
    ],
    [
      'p2',
      'pillars',
      ['Someone bows and prostrates without ever becoming still.', 'رجل يركع ويسجد ولا يطمئن.'],
      [
        ['The prayer is not valid; stillness is a pillar', 'لا تصح صلاته، فالطمأنينة ركن'],
        ['Valid but disliked', 'صحيحة مع الكراهة'],
        ['Sujūd as-sahw makes it good', 'يجبرها سجود السهو'],
        ['Only the last rakʿah is affected', 'تتأثر الأخيرة فقط']
      ],
      [
        'The Prophet ﷺ told the man who prayed this way: go back and pray, for you have not prayed.',
        'قال النبي ﷺ لمن صلى هكذا: ارجع فصلِّ فإنك لم تصلِّ.'
      ],
      'bukhari:757'
    ],
    [
      'p3',
      'pillars',
      ['Which are the seven bones of prostration?', 'ما الأعظم السبعة في السجود؟'],
      [
        [
          'Forehead with the nose, both hands, both knees, the toes of both feet',
          'الجبهة مع الأنف، واليدان، والركبتان، وأطراف القدمين'
        ],
        ['Forehead, elbows, knees, feet', 'الجبهة، والمرفقان، والركبتان، والقدمان'],
        ['Face, chest, hands, knees', 'الوجه، والصدر، واليدان، والركبتان'],
        ['Forehead, hands, shins', 'الجبهة، واليدان، والساقان']
      ],
      [
        'As the Prophet ﷺ was commanded, pointing to his nose with the forehead.',
        'كما أُمر النبي ﷺ، وأشار إلى أنفه مع الجبهة.'
      ],
      'bukhari:812'
    ],
    [
      'p4',
      'pillars',
      ['Who says Samiʿallāhu liman ḥamidah?', 'من يقول: سمع الله لمن حمده؟'],
      [
        ['The imam and one praying alone', 'الإمام والمنفرد'],
        ['Everyone, the follower too', 'الجميع، والمأموم أيضًا'],
        ['Only the follower', 'المأموم فقط'],
        ['No one; it is optional', 'لا أحد، وهو اختياري']
      ],
      [
        'When the imam says it, those behind him say: Rabbanā wa lakal-ḥamd.',
        'إذا قالها الإمام قال من خلفه: ربنا ولك الحمد.'
      ],
      'bukhari:722'
    ],
    [
      'p5',
      'pillars',
      ['What ends the prayer?', 'بمَ تُختم الصلاة؟'],
      [
        ['The taslīm', 'التسليم'],
        ['The final tashahhud', 'التشهد الأخير'],
        ['Saying Āmīn', 'قول آمين'],
        ['A last prostration', 'سجدة أخيرة']
      ],
      ['He ﷺ would close the prayer with the taslīm.', 'كان ﷺ يختم الصلاة بالتسليم.'],
      'muslim:498'
    ],
    [
      'p6',
      'pillars',
      ['Someone deliberately leaves out the first tashahhud.', 'رجل ترك التشهد الأول عمدًا.'],
      [
        ['The prayer is not valid', 'لا تصح صلاته'],
        ['Sujūd as-sahw makes it good', 'يجبرها سجود السهو'],
        ['Valid; it is a sunnah', 'صحيحة، فهو سنة'],
        ['Valid but disliked', 'صحيحة مع الكراهة']
      ],
      [
        'An obligation is made up by sujūd only when it is forgotten; left on purpose, the prayer is lost.',
        'يُجبر الواجب بالسجود إذا نُسي، أما عمدًا فتبطل الصلاة.'
      ],
      null
    ],
    [
      'p7',
      'pillars',
      ['What is the least that is said between the two prostrations?', 'ما أقل ما يقال بين السجدتين؟'],
      [
        ['Rabbighfir lī, once', 'ربّ اغفر لي، مرة'],
        ['Nothing at all', 'لا شيء'],
        ['Subḥāna Rabbiyal-Aʿlā', 'سبحان ربي الأعلى'],
        ['Al-Fātiḥah', 'الفاتحة']
      ],
      ['Saying it once is obligatory; more is sunnah.', 'قولها مرة واجب، والزيادة سنة.'],
      null
    ],
    [
      'p8',
      'pillars',
      [
        'You forget the first tashahhud. What is it, in the ordering of the prayer?',
        'نسيت التشهد الأول. ما مرتبته في الصلاة؟'
      ],
      [
        ['An obligation: forgotten, it is made up by sujūd as-sahw', 'واجب: إذا نُسي جُبر بسجود السهو'],
        ['A pillar: the prayer must be repeated', 'ركن: تُعاد الصلاة'],
        ['A sunnah: nothing is needed', 'سنة: لا شيء'],
        ['A condition', 'شرط']
      ],
      [
        'The Prophet ﷺ left it in forgetfulness and prostrated twice before the salām.',
        'تركه النبي ﷺ ناسيًا فسجد سجدتين قبل السلام.'
      ],
      'bukhari:1224'
    ],
    [
      'n1',
      'sunan',
      ['Where are the hands raised in the prayer?', 'أين تُرفع اليدان في الصلاة؟'],
      [
        [
          'At the opening takbīr, before rukūʿ, on rising from it, and on standing from the first tashahhud',
          'عند تكبيرة الإحرام، وقبل الركوع، وعند الرفع منه، وعند القيام من التشهد الأول'
        ],
        ['Only at the opening takbīr', 'عند تكبيرة الإحرام فقط'],
        ['Before and after every prostration', 'قبل كل سجود وبعده'],
        ['Only in the first rakʿah', 'في الركعة الأولى فقط']
      ],
      ['As Ibn ʿUmar described the Prophet’s ﷺ prayer.', 'كما وصف ابن عمر صلاة النبي ﷺ.'],
      'bukhari:739'
    ],
    [
      'n2',
      'sunan',
      [
        'How do you sit for the final tashahhud of Maghrib or a four-rakʿah prayer?',
        'كيف تجلس للتشهد الأخير في المغرب أو الرباعية؟'
      ],
      [
        ['Tawarruk: the left foot forward, sitting on the floor', 'التورك: تقدّم الرجل اليسرى وتقعد على الأرض'],
        ['On the left foot, the right upright', 'على اليسرى وتنصب اليمنى'],
        ['Cross-legged', 'متربعًا'],
        ['There is no sunnah way', 'لا هيئة مسنونة']
      ],
      ['Abū Ḥumayd described this sitting in the last rakʿah.', 'وصف أبو حميد هذه الجلسة في الركعة الأخيرة.'],
      'bukhari:828'
    ],
    [
      'n3',
      'sunan',
      ['What virtue is in saying Āmīn with the imam?', 'ما فضل التأمين مع الإمام؟'],
      [
        [
          'Whoever’s Āmīn meets the angels’ has his past sins forgiven',
          'من وافق تأمينه تأمين الملائكة غُفر له ما تقدم من ذنبه'
        ],
        ['It replaces al-Fātiḥah', 'يغني عن الفاتحة'],
        ['It doubles the rakʿah', 'يضاعف الركعة'],
        ['It is only a custom', 'مجرد عادة']
      ],
      ['Said aloud in the prayers recited aloud.', 'يُجهر به في الصلاة الجهرية.'],
      'bukhari:780'
    ],
    [
      'n4',
      'sunan',
      ['You forget the opening supplication.', 'نسيت دعاء الاستفتاح.'],
      [
        ['Nothing; the prayer is valid', 'لا شيء، وصلاتك صحيحة'],
        ['Prostrate twice for forgetfulness', 'اسجد للسهو'],
        ['Restart the prayer', 'أعد الصلاة'],
        ['Say it in the second rakʿah', 'قله في الثانية']
      ],
      [
        'It is a sunnah: rewarded when said, and the prayer is complete without it.',
        'سنة: يُثاب عليها، والصلاة تامة بدونها.'
      ],
      null
    ],
    [
      'n5',
      'sunan',
      ['Where does the right hand go while standing?', 'أين توضع اليد اليمنى في القيام؟'],
      [
        ['On the left forearm', 'على الذراع اليسرى'],
        ['By the side', 'على الجنب'],
        ['On the right thigh', 'على الفخذ الأيمن'],
        ['Behind the back', 'خلف الظهر']
      ],
      [
        'The people were commanded to place the right hand on the left forearm.',
        'كان الناس يُؤمرون أن يضع الرجل اليد اليمنى على ذراعه اليسرى.'
      ],
      'bukhari:740'
    ],
    [
      'c1',
      'cond',
      ['Where is the intention for the prayer?', 'أين محل النية في الصلاة؟'],
      [
        ['In the heart; nothing is said for it', 'في القلب، ولا يُتلفّظ بها'],
        ['Said aloud before the takbīr', 'تُقال جهرًا قبل التكبير'],
        ['Said quietly in Arabic', 'تُقال سرًّا بالعربية'],
        ['It is not needed', 'لا تُشترط']
      ],
      [
        'The intention is the resolve of the heart; it was not spoken by the Prophet ﷺ or his companions.',
        'النية عزم القلب، ولم يتلفظ بها النبي ﷺ ولا أصحابه.'
      ],
      null
    ],
    [
      'c2',
      'cond',
      ['Someone knowingly prays Dhuhr before its time begins.', 'رجل صلى الظهر عالمًا قبل دخول وقتها.'],
      [
        ['It does not count; he prays it when the time begins', 'لا تُجزئ، ويصليها إذا دخل الوقت'],
        ['Valid but disliked', 'صحيحة مع الكراهة'],
        ['Valid if his intention was good', 'صحيحة إن حسنت نيته'],
        ['It becomes the next prayer', 'تصير الصلاة التالية']
      ],
      [
        'The time is a condition: a prayer before its time is not that prayer.',
        'الوقت شرط، فالصلاة قبل وقتها لا تُجزئ.'
      ],
      null
    ],
    [
      'c3',
      'cond',
      ['What must a grown woman cover in the prayer?', 'ما الذي يجب على المرأة البالغة ستره في الصلاة؟'],
      [
        [
          'All but the face and hands; many scholars include the feet',
          'كل البدن إلا الوجه والكفين، وكثير من العلماء يُدخل القدمين'
        ],
        ['Only the hair', 'الشعر فقط'],
        ['Navel to knee', 'من السرة إلى الركبة'],
        ['Only what she covers at home', 'ما تستره في بيتها فقط']
      ],
      [
        'Allah does not accept the prayer of a woman who has come of age without a khimār: the head covering drawn over the neck and chest. Uncovered, her prayer is not valid, even when she prays alone.',
        'لا يقبل الله صلاة حائض إلا بخمار، وهو غطاء الرأس يُسدل على العنق والصدر. فإن انكشف لم تصح صلاتها ولو صلّت وحدها.'
      ],
      'abudawud:641'
    ],
    [
      'c4',
      'cond',
      ['A man’s ʿawrah in the prayer is…', 'عورة الرجل في الصلاة…'],
      [
        [
          'From the navel to the knee, with the shoulders covered when he can',
          'من السرة إلى الركبة، مع ستر العاتقين إن استطاع'
        ],
        ['Only the private parts', 'السوأتان فقط'],
        ['The whole body', 'كل البدن'],
        ['Shoulders to ankles', 'من العاتقين إلى الكعبين']
      ],
      [
        'None of you should pray in one garment with nothing over his shoulders.',
        'لا يصلي أحدكم في الثوب الواحد ليس على عاتقيه شيء.'
      ],
      'bukhari:359'
    ],
    [
      'c5',
      'cond',
      ['During the prayer you learn you are facing the wrong direction.', 'في أثناء الصلاة علمت أنك على غير القبلة.'],
      [
        ['Turn to the qibla and continue', 'استدر إلى القبلة وأكمل'],
        ['Restart the prayer', 'أعد الصلاة'],
        ['Finish as you are', 'أكمل كما أنت'],
        ['Prostrate twice for it', 'اسجد للسهو']
      ],
      [
        'The people of Qubāʾ turned towards the Kaʿbah in the middle of their prayer when told of the change.',
        'استدار أهل قباء إلى الكعبة في أثناء صلاتهم لما بلغهم التحويل.'
      ],
      null
    ],
    [
      'c6',
      'cond',
      ['Your wuḍūʾ breaks during the prayer.', 'انتقض وضوؤك في الصلاة.'],
      [
        ['The prayer is broken: purify and pray again', 'بطلت الصلاة: تطهّر وأعد'],
        ['Carry on', 'أكمل'],
        ['Prostrate twice for it', 'اسجد للسهو'],
        ['Repeat only the current rakʿah', 'أعد الركعة الحالية فقط']
      ],
      ['Purity is a condition throughout the prayer.', 'الطهارة شرط في الصلاة كلها.'],
      null
    ]
  ];
  var BY = {};
  Q.forEach(function (q) {
    BY[q[0]] = q;
  });
  function L(x) {
    return A.ar() ? x[1] : x[0];
  }
  function st() {
    S.learn.quiz = S.learn.quiz || {};
    return S.learn.quiz;
  }
  function box(id) {
    var r = st()[id];
    return r ? r.b : -1;
  }
  /* mastery of a topic: each question 0..4, unseen counts as 0 */
  A.quizMastery = function (topic) {
    var list = Q.filter(function (q) {
      return !topic || q[1] === topic;
    });
    return (
      list.reduce(function (s, q) {
        return s + Math.max(0, box(q[0]));
      }, 0) /
      (list.length * 4)
    );
  };
  A.quizTopics = TOPICS;
  A.quizStats = function (topic) {
    var list = Q.filter(function (q) {
        return !topic || q[1] === topic;
      }),
      o = { total: list.length, seen: 0, strong: 0, review: 0, right: 0, wrong: 0 };
    list.forEach(function (q) {
      var r = st()[q[0]];
      if (!r) return;
      o.seen++;
      o.right += r.r || 0;
      o.wrong += r.w || 0;
      if (r.b >= 3) o.strong++;
      if (r.b === 0) o.review++;
    });
    o.acc = o.right + o.wrong ? o.right / (o.right + o.wrong) : 0;
    o.mastery = A.quizMastery(topic);
    return o;
  };
  /* the questions you got wrong and have not yet put right */
  function reviewIds() {
    return Q.filter(function (q) {
      var r = st()[q[0]];
      return r && r.b === 0;
    }).map(function (q) {
      return q[0];
    });
  }
  /* a session: new and weakest first, then the oldest seen; never the same question twice */
  function pick(topic, n) {
    var now = Date.now();
    var pool = Q.filter(function (q) {
      return !topic || q[1] === topic;
    }).map(function (q) {
      var r = st()[q[0]];
      return { q: q, k: r ? r.b * 10 - Math.min(9, (now - r.at) / 86400000) : -20 + Math.random() };
    });
    pool.sort(function (a, b) {
      return a.k - b.k;
    });
    return pool
      .slice(0, n)
      .map(function (x) {
        return x.q[0];
      })
      .sort(function () {
        return Math.random() - 0.5;
      });
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)),
        t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  var Z = null; /* the running session: { topic, ids, i, order, picked, right, wrong: [] } */
  A.quizStart = function (topic) {
    if (topic === 'review') {
      var ids = reviewIds();
      if (!ids.length) {
        A.toast('Nothing to review. Mā shāʾ Allāh', 'check');
        return;
      }
      Z = { topic: 'review', ids: ids.slice(0, 10), i: 0, right: 0, wrong: [], m0: A.quizMastery() };
      Z.order = shuffle([0, 1, 2, 3]);
      A.go('#/learn/quiz/review');
      return;
    }
    Z = { topic: topic || null, ids: pick(topic, topic ? 8 : 10), i: 0, right: 0, wrong: [], m0: A.quizMastery(topic) };
    Z.order = shuffle([0, 1, 2, 3]);
    A.go('#/learn/quiz' + (topic ? '/' + topic : ''), !!(A.cur() && /^learn\/quiz/.test(A.cur().key)));
  };

  A.V.learnQuiz = function (topic) {
    if (topic === 'review' && (!Z || Z.topic !== 'review')) {
      var rv = reviewIds();
      Z = { topic: 'review', ids: rv.slice(0, 10), i: 0, right: 0, wrong: [], m0: A.quizMastery() };
      Z.order = shuffle([0, 1, 2, 3]);
      if (!rv.length) return { redirect: '#/learn' };
    }
    if (!Z || (Z.topic || null) !== (topic || null)) {
      Z = {
        topic: topic || null,
        ids: pick(topic, topic ? 8 : 10),
        i: 0,
        right: 0,
        wrong: [],
        m0: A.quizMastery(topic)
      };
      Z.order = shuffle([0, 1, 2, 3]);
    }
    var h =
      '<header class="top"><div class="tt"><div class="eyebrow">' +
      esc(A.T('Test yourself')) +
      '</div><h1>' +
      esc(topic === 'review' ? A.T('Your mistakes') : topic ? L(TOPICS[topic]) : A.T('The prayer')) +
      '</h1></div></header>';
    if (Z.i >= Z.ids.length) return { html: h + result(), title: A.T('Test yourself'), tab: 3 };
    var q = BY[Z.ids[Z.i]],
      sel = Z.picked;
    h +=
      '<div class="qz-prog" aria-label="Question ' +
      (Z.i + 1) +
      ' of ' +
      Z.ids.length +
      '">' +
      Z.ids
        .map(function (id, i) {
          return '<i class="' + (i < Z.i ? 'on' : i === Z.i ? 'cur' : '') + '"></i>';
        })
        .join('') +
      '</div>';
    h +=
      '<div class="card col qz-card"><div class="qz-meta"><span class="lp-tag k-s">' +
      esc(L(TOPICS[q[1]])) +
      '</span><span class="faint small">' +
      A.fmtN(Z.i + 1) +
      ' / ' +
      A.fmtN(Z.ids.length) +
      '</span></div><div class="qz-q">' +
      esc(L(q[2])) +
      '</div>';
    h +=
      '<div class="qz-opts">' +
      Z.order
        .map(function (o) {
          var cls = sel == null ? '' : o === 0 ? ' right' : o === sel ? ' wrong' : ' dim';
          return (
            '<button type="button" class="qz-opt' +
            cls +
            '" data-a="qz-pick" data-o="' +
            o +
            '"' +
            (sel != null ? ' disabled' : '') +
            '><span class="qz-mk">' +
            (sel != null && o === 0 ? ic('check', 'xs') : sel === o ? ic('close', 'xs') : '') +
            '</span><span class="grow">' +
            esc(L(q[3][o])) +
            '</span></button>'
          );
        })
        .join('') +
      '</div>';
    if (sel != null) {
      h +=
        '<div class="qz-why ' +
        (sel === 0 ? 'ok' : 'no') +
        '"><b>' +
        esc(sel === 0 ? A.T('Correct') : A.T('Not quite')) +
        '</b><p>' +
        esc(L(q[4])) +
        '</p>' +
        (q[5] && window.HADITH[q[5]]
          ? A.saidFold(q[5], '') +
            '<div class="refs"><a href="https://sunnah.com/' +
            q[5] +
            '" data-a="ext">' +
            ic('link', 'xs') +
            esc(A.refLabel(q[5])) +
            '</a></div>'
          : '') +
        '</div>';
      h +=
        '<button type="button" class="btn pri wide" data-a="qz-next">' +
        esc(Z.i + 1 < Z.ids.length ? A.T('Next question') : A.T('See how you did')) +
        ic('right', 's') +
        '</button>';
    }
    h += '</div>';
    return { html: h, title: A.T('Test yourself'), tab: 3 };
  };
  function result() {
    if (!Z.logged) {
      Z.logged = true;
      S.learn.qlog = (S.learn.qlog || [])
        .concat([{ t: Date.now(), n: Z.ids.length, r: Z.right, k: Z.topic || '' }])
        .slice(-20);
      A.save();
    }
    var n = Z.ids.length,
      f = Z.right / n,
      tp = Z.topic === 'review' ? null : Z.topic,
      m = A.quizMastery(tp),
      dm = Math.round((m - (Z.m0 || 0)) * 100);
    var h =
      '<div class="card col qz-res"><div class="qz-score">' +
      A.ring(f, 96, '<b>' + A.fmtN(Z.right) + '<i>/' + A.fmtN(n) + '</i></b>', 'var(--gold)', 6) +
      '<div class="grow"><div class="t">' +
      esc(f === 1 ? A.T('Every answer right. Mā shāʾ Allāh') : f >= 0.7 ? A.T('Well done') : A.T('Keep going')) +
      '</div><div class="s">' +
      esc(A.T('Mastery')) +
      ' ' +
      A.fmtN(Math.round(m * 100)) +
      '%' +
      (dm ? ' <b class="qz-dm' + (dm < 0 ? ' neg' : '') + '">' + (dm > 0 ? '+' : '') + A.fmtN(dm) + '%</b>' : '') +
      '</div></div></div>';
    if (Z.wrong.length)
      h +=
        '<div class="eyebrow" style="margin-top:6px">' +
        esc(A.T('To review')) +
        '</div>' +
        Z.wrong
          .map(function (id) {
            var q = BY[id];
            return (
              '<div class="qz-rev"><div class="t">' +
              esc(L(q[2])) +
              '</div><div class="s">' +
              ic('check', 'xs') +
              esc(L(q[3][0])) +
              '</div></div>'
            );
          })
          .join('');
    h +=
      '<button type="button" class="btn pri wide" data-a="qz-again" data-t="' +
      (Z.topic === 'review' ? '' : Z.topic || '') +
      '">' +
      ic('reset', 's') +
      esc(A.T('Another round')) +
      '</button><a class="btn ghost wide" href="#/learn">' +
      esc(A.T('Back to the prayer')) +
      '</a></div>';
    return h;
  }
  A.acts['qz-pick'] = function (el) {
    if (!Z || Z.picked != null) return;
    var o = +el.dataset.o,
      id = Z.ids[Z.i],
      r = st()[id] || { b: 0, n: 0 };
    Z.picked = o;
    r.n++;
    r.at = Date.now();
    if (o === 0) {
      r.b = Math.min(4, (r.b || 0) + 1);
      r.r = (r.r || 0) + 1;
      Z.right++;
      A.N.haptic('success');
    } else {
      r.b = 0;
      r.w = (r.w || 0) + 1;
      Z.wrong.push(id);
      A.N.haptic('heavy');
    }
    st()[id] = r;
    A.save();
    A.rerender();
  };
  A.acts['qz-next'] = function () {
    if (!Z) return;
    Z.i++;
    Z.picked = null;
    Z.order = shuffle([0, 1, 2, 3]);
    A.N.haptic('tick');
    A.rerender();
    window.scrollTo(0, 0);
  };
  A.acts['qz-again'] = function (el) {
    var t = el.dataset.t || null;
    Z = null;
    A.quizStart(t);
    A.rerender();
  };
  A.acts['qz-start'] = function (el) {
    Z = null;
    A.quizStart(el.dataset.t || null);
  };
})();
