/* Arabic interface. English stays the source; in Arabic the page turns right-to-left, the formatters speak Arabic
   (times, dates, Hijri months, durations, counts, Arabic-Indic digits), and interface text is translated after each
   render from the dictionary below plus a few number patterns. Religious text keeps its verified source. */
(function () {
  'use strict';
  var A = window.A,
    S = A.S;
  A.ar = function () {
    return S.prefs.lang === 'ar';
  };
  var DIG = '٠١٢٣٤٥٦٧٨٩';
  var digits = function (s) {
    return String(s).replace(/[0-9]/g, function (d) {
      return DIG[+d];
    });
  };
  A.arDigits = digits;

  /* ---------- formatters ---------- */
  var MON = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر'
  ];
  var DOW = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var en = {
    fmtT: A.fmtT,
    fmtTxt: A.fmtTxt,
    fmtDur: A.fmtDur,
    fmtCountdown: A.fmtCountdown,
    fmtDate: A.fmtDate,
    hijri: A.hijri,
    hijriText: A.hijriText,
    plural: A.plural,
    fmtN: A.fmtN
  };
  A.fmtT = function (ms, opt) {
    if (!A.ar() || !isFinite(ms)) return en.fmtT(ms, opt);
    var p = A.parts(ms),
      h = p.h,
      m = String(p.min).padStart(2, '0');
    if (S.prefs.h24) return digits(String(h).padStart(2, '0') + ':' + m);
    var ap = h < 12 ? 'ص' : 'م';
    h = h % 12 || 12;
    return digits(h + ':' + m) + (opt === 'bare' ? '' : '<small class="ap"> ' + ap + '</small>');
  };
  A.fmtTxt = function (ms) {
    if (!isFinite(ms)) return '·';
    return A.ar() ? A.fmtT(ms, 'bare') + (S.prefs.h24 ? '' : A.parts(ms).h < 12 ? ' ص' : ' م') : en.fmtTxt(ms);
  };
  A.fmtDur = function (ms, long) {
    if (!A.ar()) return en.fmtDur(ms, long);
    var m = Math.max(0, Math.round(ms / 60000)),
      h = Math.floor(m / 60);
    m = m % 60;
    return digits(h ? h + ' س ' + (m ? m + ' د' : '') : m + ' د').trim();
  };
  A.fmtCountdown = function (ms) {
    if (!A.ar()) return en.fmtCountdown(ms);
    var s = Math.max(0, Math.floor(ms / 1000)),
      h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      ss = s % 60;
    return digits(
      h ? h + ' س ' + String(m).padStart(2, '0') + ' د' : m ? m + ' د ' + String(ss).padStart(2, '0') + ' ث' : ss + ' ث'
    );
  };
  A.fmtDate = function (key, style) {
    if (!A.ar()) return en.fmtDate(key, style);
    var a = key.split('-').map(Number),
      dw = DOW[A.dow(key)];
    return dw + '، ' + digits(a[2]) + ' ' + MON[a[1] - 1];
  };
  A.hijri = function (key) {
    var h = en.hijri(key);
    if (A.ar()) {
      h = Object.assign({}, h);
      h.name = h.ar;
    }
    return h;
  };
  A.hijriText = function (key) {
    if (!A.ar()) return en.hijriText(key);
    var h = A.hijri(key);
    return digits(h.d) + ' ' + h.ar + ' ' + digits(h.y) + ' هـ';
  };
  A.fmtN = function (n) {
    return A.ar() ? digits(en.fmtN(n)).replace(/,/g, '٬') : en.fmtN(n);
  };
  /* Arabic counts: 1 singular, 2 dual, 3 to 10 plural, 11 and above singular */
  var NOUN = {
    item: ['عنصر', 'عنصران', 'عناصر'],
    day: ['يوم', 'يومان', 'أيام'],
    prayer: ['صلاة', 'صلاتان', 'صلوات'],
    night: ['ليلة', 'ليلتان', 'ليال'],
    remembrance: ['ذكر', 'ذكران', 'أذكار'],
    duʿāʾ: ['دعاء', 'دعاءان', 'أدعية'],
    recording: ['تسجيل', 'تسجيلان', 'تسجيلات'],
    khatm: ['ختمة', 'ختمتان', 'ختمات'],
    rakʿah: ['ركعة', 'ركعتان', 'ركعات'],
    note: ['ملاحظة', 'ملاحظتان', 'ملاحظات'],
    session: ['جلسة', 'جلستان', 'جلسات'],
    time: ['مرة', 'مرتان', 'مرات'],
    week: ['أسبوع', 'أسبوعان', 'أسابيع'],
    fast: ['صيام', 'صيامان', 'أيام صيام'],
    rakʿah: ['ركعة', 'ركعتان', 'ركعات'],
    deed: ['عمل', 'عملان', 'أعمال']
  };
  A.plural = function (n, one, many) {
    var w = NOUN[one];
    if (!A.ar() || !w) return en.plural(n, one, many);
    return n === 1 ? w[0] : n === 2 ? w[1] : digits(n) + ' ' + (n >= 3 && n <= 10 ? w[2] : w[0]);
  };

  /* ---------- the dictionary ---------- */
  var D = {
    // navigation and shell
    'Count on your right hand; the circle keeps the pace.': 'اعدد بيمينك، والدائرة تضبط الوتيرة.',
    'Your record begins today': 'سجلك يبدأ اليوم',
    'Your streak, sessions and prayers appear here as you go.': 'تظهر هنا سلسلتك وجلساتك وصلواتك كلما تقدمت.',
    'Begin the adhkār': 'ابدأ الأذكار',
    'Log a prayer': 'سجّل صلاة',
    'Begins today': 'تبدأ اليوم',
    'Your first count': 'عدّك الأول',
    'Finish a collection': 'أتمّ مجموعة',
    'None yet': 'لا شيء بعد',
    'Could not download. Check your connection and try again.': 'تعذّر التنزيل. تحقّق من الاتصال وحاول مجددًا.',
    Copied: 'نُسخ',
    'Progress from the previous version was imported': 'استُورد تقدّمك من الإصدار السابق',
    'Progress reset': 'أُعيد ضبط التقدّم',
    'Mā shāʾ Allāh. Marked as known by heart.': 'ما شاء الله. سُجّل أنك تحفظه.',
    'Some remembrances are still open': 'بعض الأذكار لم تكتمل بعد',
    'Undone one count': 'أُلغي عدٌّ واحد',
    'Alḥamdulillāh. Recorded as answered.': 'الحمد لله. سُجّل أنه أُجيب.',
    'Backup downloaded': 'نُزّلت النسخة الاحتياطية',
    'Backup restored': 'استُعيدت النسخة الاحتياطية',
    'That file is not an Adhkār backup': 'هذا الملف ليس نسخة احتياطية من الأذكار',
    'That day is marked as a break': 'هذا اليوم مُعلَّم يومَ عذر',
    'Khatm complete. May Allah accept it from you.': 'تمّت الختمة. تقبّل الله منك.',
    'Reminders are on': 'التنبيهات مفعّلة',
    'Notifications are blocked. Allow them in system settings.': 'الإشعارات محظورة. اسمح بها من إعدادات النظام.',
    'Enter valid coordinates': 'أدخل إحداثيات صحيحة',
    'Session saved, counter reset': 'حُفظت الجلسة وأُعيد ضبط العدّاد',
    'Long-press your home screen → Widgets → Adhkār': 'اضغط مطوّلًا على الشاشة الرئيسية ← الأدوات ← الأذكار',
    'Hijri date': 'التاريخ الهجري',
    'Match your local moon sighting · ': 'وفق رؤية الهلال عندك · ',
    'Until Fajr': 'حتى الفجر',
    Then: 'ثم',
    'Opens tomorrow at': 'يبدأ غدًا الساعة',
    'The fasting log opens a month before Ramaḍān.': 'يُفتح سجل الصيام قبل رمضان بشهر.',
    Next: 'التالي',
    'your pace': 'وتيرتك',
    'Normal pace': 'الوتيرة المعتادة',
    'How counting works': 'كيف يعمل العدّ',
    'A short practice, under a minute': 'تدريب قصير، أقل من دقيقة',
    'How it works': 'كيف يعمل',
    'Counting on your fingers': 'العدّ على الأصابع',
    'New to counting on your fingers?': 'جديد على العدّ بالأصابع؟',
    'Count on your': 'اعدد على',
    fingers: 'أصابعك',
    'Count on your right hand': 'اعدد بيدك اليمنى',
    'The Prophet ﷺ counted tasbīḥ on the fingers of his right hand. Here the app keeps the pace and never counts for you.':
      'كان النبي ﷺ يعقد التسبيح بيمينه. والتطبيق هنا يضبط الوتيرة ولا يعدّ عنك أبدًا.',
    'Tap the circle to begin': 'اضغط الدائرة للبدء',
    'It fills at a natural pace, measured from real recitations. Count along on your fingers.':
      'تمتلئ بوتيرة طبيعية مقيسة من تلاوات حقيقية. اعدد معها على أصابعك.',
    'Finished one sooner? Tap': 'انتهيت أسرع؟ اضغط',
    'It moves straight on and follows your speed. Tap twice to try it.': 'تنتقل فورًا وتتبع سرعتك. اضغط مرتين لتجرّب.',
    'Hold to pause': 'اضغط مطوّلًا للإيقاف',
    'Press and hold the circle. Hold again to carry on, and the pace returns to normal.':
      'اضغط على الدائرة مطوّلًا. واضغط مطوّلًا مرة أخرى للمتابعة، فتعود الوتيرة إلى المعتاد.',
    'Paused. Hold again to carry on.': 'متوقف. اضغط مطوّلًا للمتابعة.',
    'Tap to confirm at the end': 'اضغط للتأكيد في النهاية',
    'Nothing is recorded until you say you have finished.': 'لا يُسجَّل شيء حتى تؤكد أنك انتهيت.',
    'That is all': 'هذا كل شيء',
    'Try it': 'جرّب',
    'Practise again': 'تدرّب مجددًا',
    'Start counting': 'ابدأ العدّ',
    Hold: 'الضغط المطوّل',
    'Last tap': 'الضغطة الأخيرة',
    'Finished one: move on': 'أنهيت واحدة: انتقل',
    'Pause, then carry on at the normal pace': 'إيقاف، ثم متابعة بالوتيرة المعتادة',
    'Confirm you are done': 'أكّد أنك انتهيت',
    'Add the tracker widget': 'أضف أداة العدّاد',
    'Your Sunnah numbers for today, on your home screen': 'أعداد السنة لليوم على شاشتك الرئيسية',
    'Count straight from your home screen': 'اعدد مباشرة من شاشتك الرئيسية',
    Today: 'اليوم',
    Adhkār: 'الأذكار',
    Tracker: 'العدّاد',
    Ṣalāh: 'الصلاة',
    You: 'أنت',
    Back: 'رجوع',
    Profile: 'الملف',
    Close: 'إغلاق',
    Save: 'حفظ',
    Edit: 'تعديل',
    Share: 'مشاركة',
    Previous: 'السابق',
    Increase: 'زيادة',
    Decrease: 'إنقاص',
    Search: 'بحث',
    Settings: 'الإعدادات',
    Sections: 'الأقسام',
    Library: 'المكتبة',
    Collections: 'المجموعات',
    Begin: 'ابدأ',
    Read: 'اقرأ',
    Open: 'فتح',
    Add: 'إضافة',
    Delete: 'حذف',
    Remove: 'إزالة',
    Cancel: 'إلغاء',
    Continue: 'متابعة',
    Skip: 'تخطٍّ',
    Done: 'تم',
    Now: 'الآن',
    All: 'الكل',
    Off: 'إيقاف',
    On: 'تشغيل',
    Some: 'بعضها',
    Half: 'نصفها',
    Test: 'تجربة',
    'Use current': 'استخدم الحالي',
    'Not set': 'غير محدد',
    Minutes: 'دقائق',
    Home: 'المنزل',
    Tools: 'أدوات',
    Mode: 'الوضع',
    Theme: 'المظهر',
    From: 'من',
    in: 'بعد',
    am: 'ص',
    pm: 'م',
    Saved: 'المحفوظات',
    'Nothing saved yet': 'لا محفوظات بعد',
    'Tap the bookmark in the reader to keep a duʿāʾ close.': 'اضغط علامة الحفظ في القارئ لتحفظ الدعاء.',
    'Search duʿāʾ, words, sources…': 'ابحث في الأدعية والكلمات والمصادر…',
    'Search titles, meanings, transliteration or Arabic.': 'ابحث في العناوين والمعاني والنص العربي.',
    'Try “sleep”, “forgive”, رب …': 'جرّب «النوم» أو «المغفرة» أو رب…',
    // greetings and Today
    'As-salāmu ʿalaykum': 'السلام عليكم',
    'That day has not come yet': 'لم يأتِ ذلك اليوم بعد',
    'Every recitation is on this computer': 'كل التلاوات على هذا الحاسوب',
    'Adhkār booklets and the prayer timetable': 'كتيّبات الأذكار وجدول مواقيت الصلاة',
    'Plan a fast': 'انوِ صيامًا',
    'This day has not come yet, so it cannot be logged. Plan it, and you will be reminded at Maghrib the evening before, to make your intention and prepare for suhūr.': 'لم يأتِ هذا اليوم بعد، فلا يُسجَّل. خطِّط له، وسيأتيك تذكير عند مغرب الليلة السابقة لتنوي وتستعد للسحور.',
    'Remove the plan': 'إزالة الخطة',
    'Planned. A reminder comes at Maghrib the evening before': 'تمّت الخطة. يأتيك تذكير عند مغرب الليلة السابقة',
    'Planned. It shows on Today the evening before': 'تمّت الخطة. تظهر في اليوم مساء الليلة السابقة',
    Planned: 'مخطط',
    'Tomorrow you plan to fast': 'غدًا تنوي الصيام',
    'Make your intention tonight, and eat suhūr before Fajr.': 'انوِ الليلة، وتسحّر قبل الفجر.',
    'Today you planned to fast': 'نويت صيام اليوم',
    'May Allah accept it. Tap a day in the calendar to log it.': 'تقبّل الله. اضغط على اليوم في التقويم لتسجيله.',
    'Yawm al-Jumuʿah': 'يوم الجمعة',
    'The night of Jumuʿah': 'ليلة الجمعة',
    'good morning': 'صباح الخير',
    'good afternoon': 'طاب يومك',
    'good evening': 'مساء الخير',
    'a peaceful night': 'ليلة هانئة',
    'Welcome back': 'أهلًا بعودتك',
    'Next prayer': 'الصلاة القادمة',
    'NEXT PRAYER': 'الصلاة القادمة',
    'Fajr ends at sunrise': 'ينتهي الفجر عند الشروق',
    'Tap to log prayers': 'اضغط لتسجيل الصلوات',
    counted: 'محسوبة',
    'day streak': 'أيام متتالية',
    Remembrance: 'الذكر',
    'Dhikr of the day': 'ذكر اليوم',
    'This week': 'هذا الأسبوع',
    remembrances: 'ذكرًا',
    'Morning & evening': 'الصباح والمساء',
    'Duʿāʾ is answered now': 'الدعاء مستجاب الآن',
    'Duʿāʾ times': 'أوقات الإجابة',
    'Small deeds': 'أعمال يسيرة',
    Qibla: 'القبلة',
    'Do it now': 'افعله الآن',
    'Coming up': 'قادم',
    'Shorten and combine your prayers': 'اقصر صلواتك واجمع',
    Travelling: 'مسافر',
    // prayers
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Shurūq: 'الشروق',
    Dhuhr: 'الظهر',
    ʿAṣr: 'العصر',
    Maghrib: 'المغرب',
    ʿIshāʾ: 'العشاء',
    ʿIshā: 'العشاء',
    Ḍuḥā: 'الضحى',
    Faj: 'فجر',
    Dhu: 'ظهر',
    ʿAṣ: 'عصر',
    Mag: 'مغرب',
    Magh: 'مغرب',
    ʿIs: 'عشاء',
    Ish: 'عشاء',
    Rise: 'شروق',
    'Prayer times': 'مواقيت الصلاة',
    Prayer: 'الصلاة',
    Prayed: 'صلّيت',
    'Prayers logged': 'الصلوات المسجلة',
    Timetable: 'الجدول',
    'Whole month': 'الشهر كاملًا',
    Location: 'الموقع',
    'Sunnah times': 'أوقات السنة',
    'Ḍuḥā window': 'وقت الضحى',
    'Last third begins': 'يبدأ الثلث الأخير',
    'Hijri calendar': 'التقويم الهجري',
    'Occasions · fasting': 'المناسبات · الصيام',
    'Make-up prayers': 'قضاء الصلوات',
    'Qaḍāʾ tracker': 'متابعة القضاء',
    Qaḍāʾ: 'القضاء',
    'My duʿāʾs': 'أدعيتي',
    'A private journal': 'دفتر خاص',
    'Turn on prayer reminders': 'فعّل تنبيهات الصلاة',
    'Gentle alerts for each prayer and your adhkār': 'تنبيهات لطيفة لكل صلاة ولأذكارك',
    '2 rakʿahs': 'ركعتان',
    'I live here now': 'أقيم هنا الآن',
    'Previous day': 'اليوم السابق',
    'Next day': 'اليوم التالي',
    'Previous month': 'الشهر السابق',
    'Next month': 'الشهر التالي',
    Iqāmah: 'الإقامة',
    // adhkār library and reader
    'Remembrance for every moment': 'ذكر لكل لحظة',
    Morning: 'الصباح',
    Evening: 'المساء',
    'Morning adhkār': 'أذكار الصباح',
    'Evening adhkār': 'أذكار المساء',
    'After Ṣalāh': 'بعد الصلاة',
    'After ṣalāh': 'بعد الصلاة',
    'Before Sleep': 'قبل النوم',
    'The Night': 'الليل',
    'Waking Up': 'الاستيقاظ',
    'The Adhān': 'الأذان',
    Ramaḍān: 'رمضان',
    Everyday: 'كل يوم',
    'Short Dhikr': 'أذكار قصيرة',
    Sleep: 'النوم',
    Night: 'الليل',
    continue: 'تابع',
    'Complete · mā shāʾ Allāh': 'اكتمل · ما شاء الله',
    Transliteration: 'النطق',
    Meaning: 'المعنى',
    Translation: 'الترجمة',
    Sources: 'المصادر',
    Memorise: 'احفظ',
    'Known by heart': 'محفوظ',
    'I know it by heart': 'أحفظه',
    'Known by heart · undo': 'محفوظ · تراجع',
    'Listen to the recitation': 'استمع إلى التلاوة',
    Reciting: 'يتلى الآن',
    'Your turn · repeat it': 'دورك · ردّده',
    Learn: 'تعلّم',
    'Mishary al-ʿAfāsī': 'مشاري العفاسي',
    'Ḥiṣn al-Muslim recording': 'تسجيل حصن المسلم',
    'This dhikr, or All for the collection': 'هذا الذكر، أو الكل للمجموعة',
    'Reading options': 'خيارات القراءة',
    'Share collection': 'مشاركة المجموعة',
    'Open the remembrance': 'افتح الذكر',
    'Finish and reset': 'إنهاء وإعادة',
    'Mark as done': 'تم',
    'Done · undo': 'تم · تراجع',
    'Your collection': 'مجموعتك',
    // tracker
    'Count your remembrance': 'عدّ ذكرك',
    Phrase: 'العبارة',
    'Target 33': 'الهدف ٣٣',
    'Tracker history': 'سجل العدّاد',
    'Tracker phrases': 'عبارات العدّاد',
    'This phrase, all time': 'هذه العبارة، كل الوقت',
    'All phrases, all time': 'كل العبارات، كل الوقت',
    'Counting on the fingers of the right hand is the Sunnah. Use the tracker when that is not practical.':
      'العدّ بأنامل اليد اليمنى هو السنة، واستعمل العدّاد عند الحاجة.',
    // profile and settings
    Achievements: 'الإنجازات',
    Insights: 'الإحصاءات',
    'Your progress': 'تقدّمك',
    'Edit profile': 'تعديل الملف',
    Appearance: 'المظهر',
    Reading: 'القراءة',
    Reminders: 'التنبيهات',
    'Widgets & device': 'الأدوات والجهاز',
    'Backup & data': 'النسخ والبيانات',
    About: 'حول',
    'About, sources & contact': 'حول التطبيق والمصادر والتواصل',
    'References, privacy, feedback': 'المراجع والخصوصية والملاحظات',
    'Theme, motion, clock, Hijri date': 'المظهر والحركة والساعة والتاريخ الهجري',
    'Arabic size, transliteration, counting': 'حجم الخط والنطق والعدّ',
    'Home-screen widgets, shortcuts, haptics': 'أدوات الشاشة والاختصارات والاهتزاز',
    'Export, import, reset': 'تصدير واستيراد ومسح',
    'Theme and accent': 'المظهر واللون',
    Motion: 'الحركة',
    'Animations and transitions': 'الحركات والانتقالات',
    '24-hour clock': 'نظام ٢٤ ساعة',
    'Hijri date adjustment': 'تعديل التاريخ الهجري',
    'Arabic size': 'حجم الخط العربي',
    'Tap the Arabic to count': 'اضغط النص للعدّ',
    'Auto-advance': 'الانتقال التلقائي',
    'Move to the next remembrance when a count is complete': 'انتقل إلى الذكر التالي عند اكتمال العدد',
    'Keep screen on': 'إبقاء الشاشة مضاءة',
    'While reading and counting': 'أثناء القراءة والعدّ',
    Haptics: 'الاهتزاز',
    'A gentle tick on every count': 'نقرة خفيفة مع كل عدّة',
    'Volume keys count': 'العدّ بأزرار الصوت',
    'In the reader and the tracker': 'في القارئ والعدّاد',
    Recitations: 'التلاوات',
    'Downloaded audio': 'الصوتيات المحمّلة',
    'Ḥiṣn al-Muslim recordings · Qurʾān by Mishary al-ʿAfāsī': 'تسجيلات حصن المسلم · القرآن بصوت مشاري العفاسي',
    'Choose method automatically': 'اختيار الطريقة تلقائيًا',
    'From your country': 'حسب بلدك',
    'Calculation method': 'طريقة الحساب',
    'Shadow length': 'طول الظل',
    'High latitudes': 'خطوط العرض العالية',
    'For places where twilight persists': 'للأماكن التي يستمر فيها الشفق',
    'Follow me when I travel': 'تابعني عند السفر',
    'Updates a GPS location when you are 25 km away': 'يحدّث الموقع عند ابتعادك ٢٥ كم',
    'Standard (×1)': 'الجمهور (×١)',
    'Ḥanafī (×2)': 'الحنفي (×٢)',
    Travel: 'السفر',
    'Travel reminders': 'تنبيهات السفر',
    'Shorten and combine when away': 'القصر والجمع عند السفر',
    'Distance from home': 'المسافة عن المنزل',
    'Scholars differ; many hold about 80 km': 'اختلف العلماء، وكثير منهم على نحو ٨٠ كم',
    'Iqāmah at your masjid': 'الإقامة في مسجدك',
    'Use iqāmah times': 'استخدام أوقات الإقامة',
    'Minutes after the adhān': 'دقائق بعد الأذان',
    'Fine-tune': 'ضبط دقيق',
    'Where your masjid differs, follow your masjid.': 'إن خالف مسجدك فاتبع مسجدك.',
    'Allow notifications to begin': 'اسمح بالإشعارات للبدء',
    Prayers: 'الصلوات',
    'Heads-up before each prayer': 'تنبيه قبل كل صلاة',
    'Minutes before': 'دقائق قبل',
    'Before sleep': 'قبل النوم',
    'Skip if already done': 'تخطَّ إن أُنجز',
    'No reminder for a session you have completed': 'لا تنبيه لما أتممته',
    'Morning time begins': 'بداية وقت الصباح',
    'Evening time begins': 'بداية وقت المساء',
    'Scholars differ': 'اختلف العلماء',
    'During ṣalāh': 'أثناء الصلاة',
    'Silence my phone': 'إسكات الهاتف',
    'From the iqāmah. Alarms still ring.': 'من الإقامة، ويبقى المنبّه يعمل.',
    'Allow Do Not Disturb access': 'اسمح بالوصول إلى «عدم الإزعاج»',
    'One-time permission': 'إذن لمرة واحدة',
    For: 'لمدة',
    'Minutes from the iqāmah': 'دقائق من الإقامة',
    'On Friday at Ḍhuhr': 'ظهر الجمعة',
    'Jumuʿah: khuṭbah and prayer': 'الجمعة: الخطبة والصلاة',
    Sunnah: 'السنة',
    'Ḍuḥā window opens': 'دخول وقت الضحى',
    'Last third of the night': 'الثلث الأخير من الليل',
    Jumuʿah: 'الجمعة',
    'Al-Kahf in the morning, the hour of response before Maghrib': 'الكهف صباحًا، وساعة الإجابة قبل المغرب',
    'Reminders may arrive a few minutes late.': 'قد تتأخر التنبيهات بضع دقائق.',
    Allow: 'سماح',
    'Battery saving may delay reminders.': 'قد يؤخّر توفير البطارية التنبيهات.',
    Fix: 'إصلاح',
    'Home screen': 'الشاشة الرئيسية',
    'Prayer widget': 'أداة الصلاة',
    'Tracker widget': 'أداة العدّاد',
    'Adhkār widget': 'أداة الأذكار',
    'Dhikr of the day widget': 'أداة ذكر اليوم',
    'Countdown and today’s times': 'العدّ التنازلي ومواقيت اليوم',
    'Count from your home screen': 'عُدّ من الشاشة الرئيسية',
    'Whichever is due, with progress': 'ما حان وقته، مع التقدّم',
    'Glows at the times duʿāʾ is answered': 'يتوهّج في أوقات الإجابة',
    Shortcuts: 'الاختصارات',
    'Quick settings tile': 'مربع الإعدادات السريعة',
    'App shortcuts': 'اختصارات التطبيق',
    Feedback: 'الملاحظات',
    'Test haptics': 'تجربة الاهتزاز',
    'Export backup': 'تصدير نسخة',
    'Save everything to a file': 'احفظ كل شيء في ملف',
    'Import backup': 'استيراد نسخة',
    'From a backup file': 'من ملف نسخة',
    'Erase all data': 'مسح كل البيانات',
    'Counts, logs, profile and settings': 'العدّ والسجلات والملف والإعدادات',
    Contact: 'تواصل',
    'Feedback and suggestions': 'ملاحظات واقتراحات',
    'Hadith references': 'مراجع الأحاديث',
    'Qurʾānic passages': 'المقاطع القرآنية',
    'Saʿīd al-Qaḥṭānī': 'سعيد القحطاني',
    'Ḥiṣn al-Muslim': 'حصن المسلم',
    'Please note': 'تنبيه',
    Privacy: 'الخصوصية',
    'Transliteration and meanings are aids. Learn the wording from a teacher.':
      'النطق والمعاني وسائل مساعدة، فتعلّم اللفظ من معلّم.',
    'No accounts, ads or tracking. Everything stays on your phone.':
      'بلا حسابات ولا إعلانات ولا تتبّع. كل شيء يبقى على هاتفك.',
    Language: 'اللغة',
    English: 'English',
    العربية: 'العربية',
    // journal
    Journal: 'الدفتر',
    'Add a duʿāʾ': 'أضف دعاءً',
    'Edit duʿāʾ': 'تعديل الدعاء',
    'What are you asking for?': 'ماذا تسأل الله؟',
    'In your own words, in any language': 'بكلماتك، وبأي لغة',
    Asking: 'أدعو بها',
    Answered: 'استُجيب',
    Alḥamdulillāh: 'الحمد لله',
    'The last third of the night': 'الثلث الأخير من الليل',
    'The last hour of Friday': 'آخر ساعة من يوم الجمعة',
    'Between adhān and iqāmah': 'بين الأذان والإقامة',
    'With one of your duʿāʾs': 'مع أحد أدعيتك',
    'Before Maghrib on Friday': 'قبل مغرب الجمعة',
    'Next answered time': 'وقت الإجابة القادم',
    'Write what you are asking for': 'اكتب ما تدعو به',
    'You will be reminded at the times duʿāʾ is answered.': 'سنذكّرك في أوقات الإجابة.',
    'When duʿāʾ is answered': 'متى يستجاب الدعاء',
    'The times and states from the authentic Sunnah': 'الأوقات والأحوال من السنة الصحيحة',
    'Reminders are off in Settings.': 'التنبيهات متوقفة في الإعدادات.',
    Myself: 'نفسي',
    Family: 'الأهل',
    Health: 'الصحة',
    Provision: 'الرزق',
    Guidance: 'الهداية',
    'The ummah': 'الأمة',
    'How it was answered (optional)': 'كيف استُجيب (اختياري)',
    // qaḍāʾ
    'By prayer': 'حسب الصلاة',
    'Add missed days': 'إضافة أيام فائتة',
    'Adds one of each prayer per day.': 'يضيف صلاة من كل فرض لكل يوم.',
    'None owed': 'لا قضاء',
    'Nothing recorded': 'لا شيء مسجل',
    'Clear the record': 'مسح السجل',
    'Add the prayers you missed, then log each one as you pray it.': 'أضف الصلوات الفائتة، ثم سجّل كل صلاة عند قضائها.',
    'All made up, alḥamdulillāh': 'تم القضاء كله، الحمد لله',
    // onboarding
    'Hearts find rest in the': 'ألا بذكر الله',
    'Bismillāh, let us begin': 'بسم الله، لنبدأ',
    'Restore a backup': 'استعادة نسخة',
    Name: 'الاسم',
    'About you': 'عنك',
    Ready: 'جاهز',
    'What should we': 'بماذا',
    'call you?': 'نناديك؟',
    'Your name': 'اسمك',
    'about you': 'عنك',
    'You can change this later.': 'يمكنك تغييره لاحقًا.',
    Brother: 'أخ',
    Sister: 'أخت',
    'Prayer tracking every day': 'متابعة الصلاة كل يوم',
    'Includes break days': 'يشمل أيام العذر',
    'Prefer not to say': 'أفضّل ألا أقول',
    'Where do you': 'أين',
    'pray?': 'تصلّي؟',
    'For prayer times and the qibla.': 'لمواقيت الصلاة والقبلة.',
    'Use my current location': 'استخدم موقعي الحالي',
    'Update to my current location': 'حدّث إلى موقعي الحالي',
    'Skip for now': 'تخطَّ الآن',
    Gentle: 'تنبيهات',
    reminders: 'لطيفة',
    'A nudge at the right moments, nothing more.': 'تذكير في الوقت المناسب، لا أكثر.',
    'Turn on reminders': 'فعّل التنبيهات',
    'Not now': 'ليس الآن',
    'All five prayers': 'الصلوات الخمس',
    'Paused automatically on break days': 'تتوقف تلقائيًا في أيام العذر',
    'Al-Kahf and ṣalawāt': 'الكهف والصلاة على النبي ﷺ',
    'All set': 'كل شيء جاهز',
    'Enter Adhkār': 'ادخل',
    'Reminders on': 'التنبيهات مفعّلة',
    'Reminders off': 'التنبيهات متوقفة',
    'Location not set': 'لم يحدد الموقع',
    'May Allah make remembrance light on your tongue and heavy on your scale.':
      'جعل الله الذكر خفيفًا على لسانك ثقيلًا في ميزانك.',
    'Allow exact timing': 'اسمح بالتوقيت الدقيق',
    'So reminders come at the minute': 'لتصل التنبيهات في وقتها',
    'Let reminders arrive on time': 'لتصل التنبيهات في وقتها',
    'Turn off battery saving for Adhkār': 'أوقف توفير البطارية للتطبيق',
    'Tracking and reminders paused.': 'المتابعة والتنبيهات متوقفة.',
    'Last 14 days': 'آخر ١٤ يومًا',
    'Remembrance per day': 'الذكر في اليوم',
    'Sessions completed': 'الجلسات المكتملة',
    'When you remember': 'متى تذكر',
    Consistency: 'الاستمرار',
    'Ṣalāh log': 'سجل الصلاة',
    Streak: 'التتابع',
    Virtues: 'الفضائل',
    'Little deeds, great rewards': 'أعمال يسيرة وأجور عظيمة',
    'Light acts, heavy rewards': 'أعمال خفيفة وأجور ثقيلة',
    'Live times from the Sunnah': 'أوقات حيّة من السنة',
    'The night': 'الليل',
    Version: 'الإصدار',
    'Morning, evening or sleep, whichever is due, with progress': 'الصباح أو المساء أو النوم، مع التقدّم',
    // headings split around an emphasised word
    My: 'أدعيتي',
    duʿāʾs: '',
    'A little': 'نبذة',
    // months, compass
    Jan: 'يناير',
    Feb: 'فبراير',
    Mar: 'مارس',
    Apr: 'أبريل',
    May: 'مايو',
    Jun: 'يونيو',
    Jul: 'يوليو',
    Aug: 'أغسطس',
    Sep: 'سبتمبر',
    Oct: 'أكتوبر',
    Nov: 'نوفمبر',
    Dec: 'ديسمبر',
    January: 'يناير',
    February: 'فبراير',
    March: 'مارس',
    April: 'أبريل',
    June: 'يونيو',
    July: 'يوليو',
    August: 'أغسطس',
    September: 'سبتمبر',
    October: 'أكتوبر',
    November: 'نوفمبر',
    December: 'ديسمبر',
    NE: 'شمال شرق',
    NW: 'شمال غرب',
    SE: 'جنوب شرق',
    SW: 'جنوب غرب',
    Bearing: 'الاتجاه',
    'True north': 'الشمال الحقيقي',
    Compass: 'البوصلة',
    'By the sun': 'بالشمس',
    'Sun now': 'الشمس الآن',
    'Distance to Makkah': 'المسافة إلى مكة',
    'Direction of the Kaʿbah': 'اتجاه الكعبة',
    'from north': 'من الشمال',
    'Calculation settings': 'إعدادات الحساب',
    'Angle-based': 'بحسب الزاوية',
    'Muslim World League': 'رابطة العالم الإسلامي',
    'Match system · gold': 'حسب النظام · ذهبي',
    'Click sound': 'صوت النقر',
    Small: 'صغير',
    // calendar and fasting
    Fasted: 'صُمت',
    'Not fasted': 'لم أصم',
    Fasting: 'الصيام',
    Fasts: 'الصيام',
    'Days fasted': 'أيام الصيام',
    'Days fasted, all time': 'أيام الصيام، كل الوقت',
    'Fasted this month': 'صيام هذا الشهر',
    'Sunnah days': 'أيام السنة',
    'Tap a day for details': 'اضغط يومًا للتفاصيل',
    'White Day': 'من الأيام البيض',
    'Six of Shawwāl': 'ست من شوال',
    'Day of ʿArafah': 'يوم عرفة',
    'The Day of ʿArafah': 'يوم عرفة',
    'ʿĪd al-Fiṭr': 'عيد الفطر',
    'ʿĪd al-Aḍḥā': 'عيد الأضحى',
    'First ten of Dhū al-Ḥijjah': 'عشر ذي الحجة',
    'The new month': 'الشهر الجديد',
    Mubārak: 'مبارك',
    Tonight: 'الليلة',
    Day: 'اليوم',
    'Fast three days each month': 'صيام ثلاثة أيام من كل شهر',
    'Days fill in on their own. Tap a day to change it.': 'تمتلئ الأيام تلقائيًا، واضغط يومًا لتغييره.',
    'Dates follow the Umm al-Qurā calendar. Adjust in Settings → Appearance to match your local moon sighting.':
      'التواريخ وفق تقويم أم القرى، ويمكن تعديلها من الإعدادات ← المظهر.',
    // night, ḍuḥā, ramaḍān
    'The night begins': 'يبدأ الليل',
    'Middle of the night': 'منتصف الليل',
    'Half of the night has passed': 'مضى نصف الليل',
    'Last third': 'الثلث الأخير',
    'Last third in': 'الثلث الأخير بعد',
    'The night ends': 'ينتهي الليل',
    'Length of the night': 'طول الليل',
    Witr: 'الوتر',
    Qiyām: 'القيام',
    'Night prayer': 'قيام الليل',
    'Tonight’s qiyām': 'قيام الليلة',
    'Tonight’s rakʿahs': 'ركعات الليلة',
    'Rakʿahs prayed': 'الركعات المصلّاة',
    'Nights of qiyām': 'ليالي القيام',
    'Wake for the last third': 'استيقظ للثلث الأخير',
    'Log a night prayer': 'سجّل قيام ليلة',
    'Make witr the last of your night prayer': 'اجعل آخر صلاتك بالليل وترًا',
    'Night prayer may follow ʿishāʾ': 'يبدأ قيام الليل بعد العشاء',
    'Last third, alarm and your night log': 'الثلث الأخير والمنبّه وسجل الليل',
    'Remembrance of the night': 'ذكر الليل',
    Forenoon: 'الضحى',
    'The forenoon prayer': 'صلاة الضحى',
    'Start after sunrise': 'تبدأ بعد الشروق',
    'End before Dhuhr': 'تنتهي قبل الظهر',
    'Best time · late forenoon': 'أفضل وقتها · آخر الضحى',
    'Remind me when it opens': 'ذكّرني عند دخوله',
    'Two rakʿahs of Ḍuḥā': 'ركعتا الضحى',
    Tarāwīḥ: 'التراويح',
    'Suhūr reminder': 'تنبيه السحور',
    'Ifṭār reminder': 'تنبيه الإفطار',
    Ifṭār: 'الإفطار',
    Suhūr: 'السحور',
    'Imsāk, minutes before Fajr': 'الإمساك، دقائق قبل الفجر',
    'Stop eating before Fajr': 'أمسك قبل الفجر',
    'Ramaḍān begins in': 'يبدأ رمضان بعد',
    'Qurʾān khatm': 'ختم القرآن',
    'The last ten nights': 'العشر الأواخر',
    'Ramaḍān duʿāʾs': 'أدعية رمضان',
    'The crescent, ifṭār and the last ten': 'الهلال والإفطار والعشر الأواخر',
    'The crescent · ifṭār · the last ten': 'الهلال · الإفطار · العشر الأواخر',
    'The duʿāʾ of Laylat al-Qadr': 'دعاء ليلة القدر',
    'At Maghrib, with the duʿāʾ': 'عند المغرب مع الدعاء',
    // insights and achievements
    'Active days': 'أيام النشاط',
    'All time': 'كل الوقت',
    'By day': 'حسب اليوم',
    Period: 'المدة',
    Remembrances: 'الأذكار',
    'Adhkār counts plus the tracker': 'أذكار القارئ مع العدّاد',
    'Times through the year': 'عبر العام',
    'Completed sessions and tracker sessions by time of day': 'الجلسات المكتملة حسب وقت اليوم',
    'Counts from the Tracker appear here.': 'تظهر هنا أعداد العدّاد.',
    Afternoon: 'العصر',
    'First Light': 'أول النور',
    'Evening Calm': 'سكينة المساء',
    'Five Pillars': 'الخمس',
    'Night Riser': 'قائم الليل',
    'Peaceful Rest': 'نوم هانئ',
    Patient: 'صابر',
    Steadfast: 'ثابت',
    Devoted: 'مداوم',
    Unwavering: 'لا يتزعزع',
    'A Thousand': 'الألف',
    'Ten Thousand': 'عشرة آلاف',
    'A Hundred Sittings': 'مئة مجلس',
    'Ḍuḥā Keeper': 'محافظ على الضحى',
    'Complete the morning adhkār': 'أتمّ أذكار الصباح',
    'Complete the evening adhkār': 'أتمّ أذكار المساء',
    'After-ṣalāh adhkār for all five prayers in a day': 'أذكار الصلوات الخمس في يوم',
    'Sleep adhkār 7 times': 'أذكار النوم ٧ مرات',
    'Log 7 days of fasting': 'سجّل ٧ أيام صيام',
    'A 7-day streak': '٧ أيام متتالية',
    'A 30-day streak': '٣٠ يومًا متتالية',
    'A 100-day streak': '١٠٠ يوم متتالية',
    '1,000 glorifications': '١٠٠٠ تسبيحة',
    '10,000 glorifications': '١٠٠٠٠ تسبيحة',
    '100 completed sessions': '١٠٠ جلسة مكتملة',
    'Pray Ḍuḥā on 7 days': 'صلِّ الضحى ٧ أيام',
    // tracker
    'Begin with one': 'ابدأ بواحدة',
    'Your own': 'ذكرك',
    'Thirty-four': 'أربع وثلاثون',
    'The hundredth': 'تمام المئة',
    Glorification: 'التسبيح',
    Taḥmīd: 'التحميد',
    Takbīr: 'التكبير',
    Tawḥīd: 'التوحيد',
    'Completing the hundred': 'تمام المئة',
    // tags and subtitles
    Protection: 'الحفظ',
    Refuge: 'الاستعاذة',
    'Refuge from evil': 'الاستعاذة من الشر',
    'Seeking refuge': 'الاستعاذة',
    Sovereignty: 'الملك',
    Sincerity: 'الإخلاص',
    Gratitude: 'الشكر',
    Contentment: 'الرضا',
    Peace: 'السلام',
    'Well-being': 'العافية',
    Patience: 'الصبر',
    Intercession: 'الشفاعة',
    Character: 'الخلق',
    Hospitality: 'الضيافة',
    'Debt and need': 'الدين والحاجة',
    'Family and life': 'الأهل والحياة',
    'Life and return': 'الحياة والمآب',
    'Mercy in all affairs': 'الرحمة في كل شأن',
    'Heavy on the scale': 'ثقيلة في الميزان',
    'Protection by His name': 'الحفظ باسمه',
    'Protection · Qurʾān': 'الحفظ · القرآن',
    Qurʾān: 'القرآن',
    Before: 'قبل',
    'Lying down': 'عند الاضطجاع',
    'Turning in sleep': 'عند التقلّب',
    'On waking': 'عند الاستيقاظ',
    'On waking in the night': 'عند الاستيقاظ ليلًا',
    'Woke and remembered Allah': 'استيقظ وذكر الله',
    'The first words of the day': 'أول كلمات اليوم',
    'The last words': 'آخر الكلمات',
    'In prostration': 'في السجود',
    'Immediately after salām': 'بعد السلام مباشرة',
    'After the obligatory prayers': 'بعد الصلوات المكتوبة',
    'Following each obligatory prayer': 'بعد كل صلاة مكتوبة',
    'As you lie down to rest': 'عند النوم',
    'On waking · turning in sleep · after witr': 'عند الاستيقاظ · التقلّب · بعد الوتر',
    'Waking in the night · after witr': 'الاستيقاظ ليلًا · بعد الوتر',
    'After the witr': 'بعد الوتر',
    'After the shahādah': 'بعد الشهادة',
    'Answering the call to prayer': 'إجابة المؤذن',
    'At the call to prayer': 'عند الأذان',
    'During the call': 'أثناء الأذان',
    'Between the adhān and the iqāmah': 'بين الأذان والإقامة',
    'The duʿāʾ after the adhān': 'الدعاء بعد الأذان',
    'Light on the tongue, any time': 'خفيفة على اللسان',
    'Wuḍūʾ · home · masjid': 'الوضوء · المنزل · المسجد',
    Wuḍūʾ: 'الوضوء',
    Masjid: 'المسجد',
    'Blessings on the Prophet ﷺ': 'الصلاة على النبي ﷺ',
    'Send ṣalawāt on the Prophet ﷺ': 'صلِّ على النبي ﷺ',
    'The testimony after wuḍūʾ': 'الشهادة بعد الوضوء',
    'For a brother in his absence': 'لأخيك بظهر الغيب',
    'Beneficial knowledge': 'العلم النافع',
    'Beneficial knowledge and provision': 'العلم النافع والرزق',
    'The master of forgiveness': 'سيد الاستغفار',
    'Better than a servant': 'خير من خادم',
    'From the Sunnah': 'من السنة',
    'At any moment': 'في أي وقت',
    'After Fajr': 'بعد الفجر',
    'After Fajr until sunrise': 'من الفجر إلى الشروق',
    'After ʿAṣr until Maghrib': 'من العصر إلى المغرب',
    'Fajr & Maghrib · Fajr & Maghrib only': 'الفجر والمغرب فقط',
    'The final hour of Friday': 'آخر ساعة من الجمعة',
    'The Day of Rising': 'يوم القيامة',
    'The most virtuous time to pray and call upon Him': 'أفضل أوقات الصلاة والدعاء',
    'While you are fasting': 'وأنت صائم',
    'The oppressed, the traveller, a parent for a child': 'المظلوم والمسافر والوالد لولده',
    'Visit someone who is ill': 'عُد مريضًا',
    'Smile at your brother or sister': 'تبسّم في وجه أخيك',
    'Remove something harmful from the path': 'أمط الأذى عن الطريق',
    'Give charity, even half a date': 'تصدّق ولو بشق تمرة',
    'Never belittle a good deed': 'لا تحقرنّ من المعروف شيئًا',
    'Twelve voluntary rakʿahs a day': 'اثنتا عشرة ركعة تطوعًا كل يوم',
    'ʿIshāʾ and Fajr in congregation': 'العشاء والفجر في جماعة',
    'Recite Sūrat al-Ikhlāṣ': 'اقرأ سورة الإخلاص',
    'Two words light on the tongue': 'كلمتان خفيفتان على اللسان',
    'Āyat al-Kursī before sleep': 'آية الكرسي قبل النوم',
    'Set a real alarm in your clock app (available in the Android app)': 'اضبط منبّهًا في تطبيق الساعة',
    'Available in the Android app': 'متاح في تطبيق أندرويد',
    'Home-screen widgets, quick-settings tile, app shortcuts, volume-key counting and native reminders come with the installed app.':
      'الأدوات والاختصارات والتنبيهات تأتي مع التطبيق المثبّت.',
    'Morning and evening adhkār, remembrance after prayer and before sleep, prayer times, qibla, the night and Ḍuḥā, beautifully, privately, offline.':
      'أذكار الصباح والمساء، وأذكار الصلاة والنوم، ومواقيت الصلاة والقبلة، والليل والضحى.',
    'Tick a deed when you do it. Beloved deeds are those done consistently, even if small.':
      'علّم العمل إذا فعلته، وأحبّ الأعمال أدومها وإن قلّ.',
    'Remind me with a notification': 'ذكّرني بإشعار',
    'Lā ilāha illallāhu waḥdah… 100 times': 'لا إله إلا الله وحده… ١٠٠ مرة',
    'Allāhumma innaka ʿafuwwun…': 'اللهم إنك عفو…',
    'Lay the phone flat and keep it away from metal, magnets and speakers. If the reading drifts, wave the phone in a figure-eight to calibrate. On cloudless days the sun mode needs no compass at all.':
      'ضع الهاتف مستويًا بعيدًا عن المعادن والمغانط. إن اضطربت القراءة فحرّكه على شكل ٨ للمعايرة. وفي الأيام الصافية يغني وضع الشمس عن البوصلة.',
    Ṣalāt: 'الصلاة',
    'al-Layl': 'الليل',
    'al-Ḍuḥā': 'الضحى',
    Break: 'العذر',
    'Your days may begin tomorrow': 'قد تبدأ عادتكِ غدًا',
    'Your days may begin today': 'قد تبدأ عادتكِ اليوم',
    'Your days may have begun': 'لعل عادتكِ قد بدأت',
    'When they do, start your break': 'إذا بدأت فابدئي العذر',
    'Not yet': 'ليس بعد',
    'Start break': 'ابدئي العذر',
    'Start your break': 'ابدئي العذر',
    'Since yesterday': 'منذ أمس',
    'From today': 'من اليوم',
    'End break': 'إنهاء العذر',
    'End your break?': 'إنهاء العذر؟',
    'Prayer tracking and reminders pause. Your streak is protected.': 'تتوقف متابعة الصلاة والتنبيهات، ويُحفظ تتابعكِ.',
    'Look for the signs of purity': 'تحرّي علامات الطهر',
    'I am pure': 'طهرت',
    'When you see them, take ghusl and pray the prayer whose time you are in.':
      'فإذا رأيتِها فاغتسلي وصلّي الصلاة التي أنتِ في وقتها.',
    'Bleeding well past your habit may be istiḥāḍah, when prayer continues. Ask a scholar.':
      'الدم الزائد كثيرًا عن العادة قد يكون استحاضة تستمر معها الصلاة، فاسألي أهل العلم.',
    'usual days': 'أيام العادة',
    'day cycle': 'طول الدورة',
    'next expected': 'المتوقع التالي',
    'next after this': 'التالي بعد هذه',
    'Your usual days': 'أيام عادتكِ',
    'Until the app learns from two cycles': 'حتى يتعلّم التطبيق من دورتين',
    'Usually every': 'تتكرر كل',
    'From one start to the next': 'من بداية إلى التي تليها',
    'Private reminder': 'تذكير خاص',
    'A discreet note when your days may begin or end': 'تنبيه خفي عند بداية العادة أو انتهائها',
    'No ṣalāh or fasting': 'لا صلاة ولا صيام',
    'Fasts are made up, ṣalāh is not · Muslim 335': 'يُقضى الصوم لا الصلاة · مسلم ٣٣٥',
    'Dhikr and duʿāʾ continue': 'الذكر والدعاء مستمران',
    'Break days': 'أيام العذر',
    Private: 'خاص',
    Recent: 'الأخيرة',
    'Recent cycles': 'الدورات الأخيرة',
    'Ramaḍān make-up fasts': 'قضاء صيام رمضان',
    'Break from ṣalāh': 'العذر عن الصلاة',
    'Your remembrance continues': 'ذكركِ مستمر',
    'Welcome back. Prayer tracking has resumed.': 'أهلًا بعودتكِ، عادت متابعة الصلاة.',
    'Break started. Your remembrance continues.': 'بدأ العذر، وذكركِ مستمر.',
    'Waking in the night': 'الاستيقاظ ليلًا',
    'after witr': 'بعد الوتر',
    'turning in sleep': 'التقلّب',
    refuge: 'الاستعاذة',
    glorification: 'التسبيح',
    testimony: 'الشهادة',
    'the repentant': 'التوّابين',
    timing: 'التوقيت',
    'On-screen dhikr': 'ذكر على الشاشة',
    'A gentle reminder while the app is open': 'تذكير لطيف أثناء فتح التطبيق',
    'A short dhikr slides up; tap to count it': 'يظهر ذكر قصير، اضغط لعدّه',
    Every: 'كل',
    'Show one now': 'أظهر واحدًا الآن',
    Counted: 'تم العدّ',
    'Open the Tracker': 'افتح العدّاد',
    Dismiss: 'إخفاء',
    'The last third': 'الثلث الأخير',
    'It lasts until Fajr. Choose when to wake.': 'يمتد إلى الفجر، فاختر وقت استيقاظك.',
    '30 min before': 'قبله بنصف ساعة',
    'At its start': 'عند بدايته',
    '30 min in': 'بعد بدايته بنصف ساعة',
    '1 hr in': 'بعد بدايته بساعة',
    Notification: 'إشعار',
    'Also over other apps': 'وفوق التطبيقات الأخرى',
    'From Fajr until an hour after ʿIshāʾ': 'من الفجر إلى ساعة بعد العشاء',
    'Allow “Display over other apps” to start': 'اسمح بالظهور فوق التطبيقات للبدء',
    'Tap the circle to count · swipe for the next': 'اضغط الدائرة للعدّ · اسحب للتالي',
    'Tap a prayer once you have prayed it': 'اضغط الصلاة بعد أدائها',
    'The volume keys count too': 'أزرار الصوت تعدّ أيضًا',
    'Share image': 'مشاركة صورة',
    'Share text': 'مشاركة نص',
    'Copy the Arabic': 'نسخ النص العربي',
    Status: 'حالة',
    Post: 'منشور',
    'Share as your status': 'شارك حالتك',
    'Arabic copied': 'نُسخ النص العربي',
    'Today’s prayers': 'صلوات اليوم',
    prayed: 'صلّيت',
    today: 'اليوم',
    'Remind me': 'ذكّرني',
    Arabic: 'العربية',
    Aṣr: 'عصر',
    'Shift by a day to match your local moon sighting': 'قدّم أو أخّر يومًا ليوافق رؤية الهلال عندك',
    'Next time of acceptance': 'وقت الإجابة القادم',
    'Learn the prayer': 'تعلّم الصلاة',
    'As the Prophet ﷺ prayed': 'كما صلّى النبي ﷺ',
    'Choose a prayer': 'اختر صلاة',
    'Behind an imam': 'خلف إمام',
    'Alone, or leading': 'منفردًا أو إمامًا',
    'Follow him; say only Rabbanā wa lakal-ḥamd': 'تابعه، وقل: ربنا ولك الحمد فقط',
    'Shortened for travel': 'قصر السفر',
    'In full': 'تامة',
    Illustrations: 'الرسوم',
    'Before you begin': 'قبل أن تبدأ',
    'Purity for the prayer': 'الطهارة للصلاة',
    'The time': 'الوقت',
    'After ʿIshāʾ until Fajr': 'بعد العشاء إلى الفجر',
    'The time has begun': 'دخل الوقت',
    'Not yet time': 'لم يدخل الوقت',
    'Facing the qibla': 'استقبال القبلة',
    'Set your location to find it': 'حدّد موقعك لمعرفتها',
    Covered: 'ستر العورة',
    'All but the face and hands; many scholars include the feet':
      'كل البدن إلا الوجه والكفين، وكثير من العلماء يُدخل القدمين',
    'From the navel to the knee, and the shoulders': 'من السرة إلى الركبة، مع ستر العاتقين',
    Clean: 'الطهارة من النجاسة',
    'The body, the clothes and the place': 'البدن والثوب والمكان',
    'For sisters': 'للأخوات',
    'For brothers': 'للإخوة',
    'What the labels mean': 'معاني الوسوم',
    Pillar: 'ركن',
    Obligatory: 'واجب',
    'Left out, the prayer is not complete until it is done': 'إذا تُرك لم تتم الصلاة حتى يُؤتى به',
    'Forgotten, it is made up by sujūd as-sahw': 'إذا نُسي جُبر بسجود السهو',
    'Rewarded, and the prayer is valid without it': 'يُثاب عليه، والصلاة صحيحة بدونه',
    'A mistake in prayer': 'خطأ في الصلاة',
    'Sujūd as-sahw': 'سجود السهو',
    'Practise the words': 'تدرّب على الأذكار',
    'Listen and memorise': 'استمع واحفظ',
    'Step by step': 'خطوة بخطوة',
    'As the Prophet ﷺ prayed, with the evidence': 'كما صلّى النبي ﷺ، مع الدليل',
    'Within Ṣalāh': 'أذكار الصلاة',
    'Opening takbīr': 'تكبيرة الإحرام',
    Rukūʿ: 'الركوع',
    Rising: 'الرفع من الركوع',
    Sujūd: 'السجود',
    'Second sujūd': 'السجدة الثانية',
    'Between the prostrations': 'الجلسة بين السجدتين',
    'First tashahhud': 'التشهد الأول',
    'Final tashahhud': 'التشهد الأخير',
    Taslīm: 'التسليم',
    Complete: 'تمّت',
    Aloud: 'جهرًا',
    Quietly: 'سرًّا',
    'Listen to the imam': 'أنصت للإمام',
    'What you do': 'ما تفعله',
    'Another authentic wording': 'صيغة أخرى صحيحة',
    'The hadith': 'الحديث',
    'The evidence': 'الدليل',
    Finish: 'إنهاء',
    'Previous step': 'الخطوة السابقة',
    'Adhkār after the prayer': 'أذكار بعد الصلاة',
    'Go through it again': 'أعدها من جديد',
    'From the opening takbīr to the salām.': 'من تكبيرة الإحرام إلى التسليم.',
    'May Allah accept it.': 'تقبّل الله منك.',
    'Stand facing the qibla': 'قم مستقبل القبلة',
    'Say Allāhu akbar to enter the prayer': 'قل: الله أكبر للدخول في الصلاة',
    'Raise the hands to the shoulders as you say it': 'ارفع يديك حذو منكبيك عند قولها',
    'The intention is in the heart. Nothing is said for it.': 'النية محلها القلب، ولا يُتلفّظ بها.',
    'A brief sitting before you rise': 'جلسة خفيفة قبل القيام',
    'Rise saying Allāhu akbar': 'قم قائلًا: الله أكبر',
    'Raise the hands as you stand from the tashahhud': 'ارفع يديك عند القيام من التشهد',
    'Right hand over the left': 'اليد اليمنى على اليسرى',
    'Seek refuge in Allah and say the basmalah, quietly': 'استعذ بالله وبسمل سرًّا',
    'Recite al-Fātiḥah': 'اقرأ الفاتحة',
    'Say Āmīn after it': 'قل: آمين بعدها',
    'Then recite more of the Qurʾān': 'ثم اقرأ ما تيسر من القرآن',
    'Aloud only where no man outside your family can hear.': 'تجهرين حيث لا يسمعك رجل أجنبي.',
    'Listen to the imam. Scholars differ on reciting al-Fātiḥah behind him when he recites aloud; Ibn Bāz held you recite it in his pauses.':
      'أنصت للإمام. اختلف العلماء في قراءة الفاتحة خلفه في الجهرية، ورأى ابن باز أن تُقرأ في سكتاته.',
    'Go down saying Allāhu akbar': 'انزل قائلًا: الله أكبر',
    'Raise the hands before bowing': 'ارفع يديك قبل الركوع',
    'Bow with the back level, hands firm on the knees': 'اركع مستوي الظهر، ممكّنًا يديك من ركبتيك',
    'Be still before rising': 'اطمئن قبل الرفع',
    'Once is required; three times is the sunnah.': 'الواجب مرة، والسنة ثلاث.',
    'Raise the hands as you rise': 'ارفع يديك عند الرفع',
    'Stand fully straight': 'اعتدل قائمًا',
    'Behind an imam, say only Rabbanā wa lakal-ḥamd': 'خلف الإمام قل: ربنا ولك الحمد فقط',
    'On seven bones: forehead with the nose, both hands, both knees, the toes':
      'على سبعة أعظم: الجبهة مع الأنف، واليدين، والركبتين، وأطراف القدمين',
    'Arms away from the sides, toes towards the qibla': 'جافِ عضديك عن جنبيك، وأطراف أصابع القدمين إلى القبلة',
    'Be still': 'اطمئن',
    'Allāhu akbar, then prostrate again': 'الله أكبر، ثم اسجد ثانية',
    'As the first, with stillness': 'كالأولى، مع الطمأنينة',
    'The nearest you are to your Lord. Make much duʿāʾ here.': 'أقرب ما تكون من ربك، فأكثر الدعاء.',
    'Sit on the left foot, the right foot upright': 'اجلس على رجلك اليسرى وانصب اليمنى',
    'Sit still': 'اجلس مطمئنًا',
    'Sit after the second rakʿah, saying Allāhu akbar': 'اجلس بعد الركعة الثانية قائلًا: الله أكبر',
    'Sit for the final tashahhud': 'اجلس للتشهد الأخير',
    'Left foot forward, sitting on the floor (tawarruk)': 'قدّم رجلك اليسرى واقعد على مقعدتك (التورك)',
    'Ask Allah for whatever you wish before the salām': 'سل الله ما شئت قبل السلام',
    'Turn your face to the right': 'التفت عن يمينك',
    'Then to the left': 'ثم عن يسارك',
    'The Ḥanbalīs count both as pillars; most scholars hold the second is sunnah.':
      'يعدّ الحنابلة التسليمتين ركنين، ويرى أكثر العلماء أن الثانية سنة.',
    'I added something': 'زدت شيئًا',
    'An extra rakʿah, rukūʿ or sujūd': 'ركعة أو ركوعًا أو سجودًا زائدًا',
    'I missed the first tashahhud': 'نسيت التشهد الأول',
    'And stood up for the third rakʿah': 'وقمت للركعة الثالثة',
    'Had you stood up fully?': 'هل استتممت قائمًا؟',
    Yes: 'نعم',
    No: 'لا',
    'I missed a pillar': 'تركت ركنًا',
    'Such as a rukūʿ or a sujūd': 'كالركوع أو السجود',
    'I gave salām too early': 'سلّمت قبل التمام',
    'Before the prayer was complete': 'قبل تمام الصلاة',
    'I am unsure how many I prayed': 'شككت في عدد الركعات',
    'Three or four?': 'ثلاثًا أم أربعًا؟',
    'Does one number feel more likely?': 'هل يترجّح عندك عدد؟',
    'Before the salām': 'قبل السلام',
    'After the salām': 'بعد السلام',
    'No sujūd needed': 'لا سجود',
    'Two prostrations, like those of the prayer, with Allāhu akbar going down and rising.':
      'سجدتان كسجود الصلاة، يكبّر عند الهوي والرفع.',
    'If you realise during it, return at once. Complete the prayer, give salām, then prostrate twice and give salām again.':
      'إن تذكّرت أثناءها فارجع فورًا. أتمّ صلاتك وسلّم، ثم اسجد سجدتين وسلّم.',
    'Carry on and do not sit back down. Prostrate twice before the salām.':
      'امضِ ولا ترجع للجلوس، واسجد سجدتين قبل السلام.',
    'Sit back down, recite the tashahhud and complete the prayer.': 'ارجع فاجلس، وتشهّد، وأتمّ صلاتك.',
    'If you reach the same position in the next rakʿah, that rakʿah takes its place. If not, go back and do it, and what follows it. Prostrate twice after the salām. A missed opening takbīr means the prayer never began: start again.':
      'إن بلغت موضعه من الركعة التالية قامت مقامها، وإلا فارجع فأتِ به وبما بعده، واسجد سجدتين بعد السلام. ومن ترك تكبيرة الإحرام لم تنعقد صلاته فليستأنف.',
    'If you remember soon after, stand, complete what is left and give salām. Then prostrate twice and give salām again.':
      'إن تذكّرت قريبًا فقم فأتمّ ما بقي وسلّم، ثم اسجد سجدتين وسلّم.',
    'Act on what you think most likely. Complete the prayer, give salām, then prostrate twice.':
      'اعمل بما ترجّح عندك، وأتمّ صلاتك وسلّم، ثم اسجد سجدتين.',
    'Build on the lower number, which is certain. Complete the prayer and prostrate twice before the salām.':
      'ابنِ على الأقل لأنه اليقين، وأتمّ صلاتك واسجد سجدتين قبل السلام.',
    'Behind an imam, follow him: if he prostrates for forgetfulness, prostrate with him. Doubts after the prayer has ended, or that come all the time, are set aside.':
      'خلف الإمام تابعه، فإن سجد للسهو فاسجد معه. والشك بعد الفراغ من الصلاة، أو كثرة الشكوك، لا يُلتفت إليه.',
    'Covered in ṣalāh: all but the face and hands': 'في الصلاة: يُستر كل البدن إلا الوجه والكفين',
    'Your prayer at home is better for you, and the masjid is not barred to you':
      'صلاتك في بيتك خير لك، ولا تُمنعين المسجد',
    'Behind an imam, alert him by clapping': 'خلف الإمام نبّهيه بالتصفيق',
    'In congregation, the best rows for women are the last': 'خير صفوف النساء آخرها',
    'Keep the shoulders covered': 'استر عاتقيك',
    'Behind an imam, alert him by saying Subḥānallāh': 'خلف الإمام نبّهه بقول: سبحان الله',
    'The best rows for men are the first': 'خير صفوف الرجال أولها',
    'Jumuʿah is not required of women. Prayed with the congregation, it takes the place of Dhuhr.':
      'لا تجب الجمعة على المرأة، وإن صلّتها مع الجماعة أجزأتها عن الظهر.',
    'Jumuʿah is prayed in congregation after the khuṭbah. Missed, pray Dhuhr instead.':
      'تُصلّى الجمعة جماعة بعد الخطبة، ومن فاتته صلّى ظهرًا.',
    'Learning is still rewarded, and there is nothing to make up.': 'التعلّم مأجور، ولا قضاء عليك.',
    'Adhān at prayer time': 'الأذان عند دخول الوقت',
    'Allāhu akbar, Allāhu akbar · Madinah': 'الله أكبر، الله أكبر · المدينة',
    'A soft tap': 'نقرة هادئة',
    'Hear it': 'استمع',
    Paused: 'متوقف',
    'Tap when done': 'اضغط عند الانتهاء',
    Counting: 'العدّ',
    'On your fingers, as the Sunnah teaches; the app keeps the pace': 'على الأصابع كما في السنة، والتطبيق يضبط الإيقاع',
    'Tap to count each one': 'اضغط لعدّ كل مرة',
    Fingers: 'الأصابع',
    Tap: 'الضغط',
    Pace: 'الإيقاع',
    'How long each recitation takes': 'مدة كل ترديد',
    Calm: 'هادئ',
    Steady: 'معتدل',
    Brisk: 'سريع',
    'Begin counting on your fingers': 'ابدأ العدّ على أصابعك',
    'Confirm you have finished': 'أكّد أنك انتهيت',
    'Count on the fingers of your right hand. The circle keeps the pace, then tap it to confirm.':
      'اعقد التسبيح بأصابع يمينك. الدائرة تضبط الإيقاع، ثم اضغطها للتأكيد.',
    'Recite it again?': 'أتعيده؟',
    'Its count for today goes back to zero.': 'يعود عدد اليوم إلى الصفر.',
    Again: 'أعد',
    'Remembrance through the day': 'الذكر طوال اليوم',
    'a day': 'في اليوم',
    'After each prayer': 'بعد كل صلاة',
    'No set number': 'بلا عدد محدد',
    Round: 'الجولة',
    'Count on the fingers of your right hand. The circle keeps the pace; tap it when you have finished the round.':
      'اعقد التسبيح بأصابع يمينك. الدائرة تضبط الإيقاع، فاضغطها إذا أتممت الجولة.',
    Target: 'الهدف',
    'No target': 'بلا هدف',
    'in all': 'إجمالًا',
    'This phrase today': 'هذا الذكر اليوم',
    'A hundred a day: a thousand good deeds written': 'مئة في اليوم: تُكتب ألف حسنة',
    'A hundred a day: sins wiped away': 'مئة في اليوم: تُحطّ الخطايا',
    'The Prophet ﷺ sought forgiveness a hundred times a day': 'كان النبي ﷺ يستغفر في اليوم مئة مرة',
    'Thirty-three after each prayer': 'ثلاثًا وثلاثين بعد كل صلاة',
    'Allah blesses you ten times for each': 'يصلي الله عليك بها عشرًا',
    Downloading: 'جارٍ التنزيل',
    'No separate recording of these exact words': 'لا يوجد تسجيل مستقل لهذا اللفظ بعينه',
    'This one now, or All': 'هذا الآن، أو الكل',
    Āyah: 'آية',
    'Every recitation is on your phone': 'كل التلاوات على جهازك',
    'Download every recitation?': 'تنزيل كل التلاوات؟',
    'they then play offline': 'ثم تعمل دون اتصال',
    'Recitations downloaded': 'نُزّلت التلاوات',
    'Best on Wi-Fi': 'يُفضّل عبر الواي فاي',
    'Download all': 'تنزيل الكل',
    Later: 'لاحقًا',
    'Hear every dhikr': 'استمع إلى كل ذكر',
    'Download the recitations once and they play offline, with Learn mode to repeat after them.':
      'نزّل التلاوات مرة واحدة لتعمل دون اتصال، مع وضع التعلّم لتردّد خلفها.',
    'Could not play. Check your connection and try again.': 'تعذّر التشغيل. تحقق من الاتصال وحاول مجددًا.',
    'The morning adhkār are from Fajr until ʿAṣr. It is evening now.':
      'أذكار الصباح من الفجر إلى العصر، والوقت الآن مساء.',
    'Continue learning the prayer': 'تابع تعلّم الصلاة',
    'Test yourself': 'اختبر نفسك',
    'The prayer': 'الصلاة',
    Correct: 'إجابة صحيحة',
    'Not quite': 'ليس تمامًا',
    'Next question': 'السؤال التالي',
    'See how you did': 'اعرض نتيجتك',
    'Every answer right. Mā shāʾ Allāh': 'كل الإجابات صحيحة، ما شاء الله',
    'Well done': 'أحسنت',
    'Keep going': 'واصل',
    Mastery: 'الإتقان',
    'To review': 'للمراجعة',
    'Another round': 'جولة أخرى',
    'Back to the prayer': 'العودة إلى الصلاة',
    mastered: 'متقن',
    'A mixed round': 'جولة منوّعة',
    'Ten questions, weakest first': 'عشرة أسئلة، الأضعف أولًا',
    'Test yourself on sujūd as-sahw': 'اختبر نفسك في سجود السهو',
    Required: 'الواجب',
    once: 'مرة',
    times: 'مرات',
    'The Ḥanbalīs count both salāms as pillars; most scholars hold the second is sunnah.':
      'يعدّ الحنابلة التسليمتين ركنين، ويرى أكثر العلماء أن الثانية سنة.',
    'Search duʿāʾ, hadith, the app': 'ابحث في الأدعية والأحاديث والتطبيق',
    'Best match': 'الأقرب',
    Hadith: 'الحديث',
    'In the app': 'في التطبيق',
    Try: 'جرّب',
    'Exact phrase': 'عبارة مطابقة',
    'Leave a word out': 'استبعاد كلمة',
    'Arabic, with or without ḥarakāt': 'بالعربية، بالتشكيل أو دونه',
    'Nothing found': 'لا نتائج',
    'Try fewer words, or another spelling.': 'جرّب كلمات أقل أو تهجئة أخرى.',
    App: 'التطبيق',
    'Worry & Distress': 'الهم والكرب',
    'Grief · distress · difficulty · anger': 'الحزن · الكرب · العسر · الغضب',
    'Opening · rukūʿ · sujūd · tashahhud': 'الاستفتاح · الركوع · السجود · التشهد',
    'I am Your servant': 'اللهم إني عبدك',
    'Refuge from grief and sadness': 'الاستعاذة من الهم والحزن',
    'The Mighty, the Forbearing': 'العظيم الحليم',
    'I hope for Your mercy': 'رحمتك أرجو',
    'The supplication of Yūnus': 'دعوة ذي النون',
    'Allah, Allah is my Lord': 'الله الله ربي',
    'No ease but what You make easy': 'لا سهل إلا ما جعلته سهلًا',
    'When angry': 'عند الغضب',
    'Worry and grief': 'الهم والحزن',
    Distress: 'الكرب',
    'When something is difficult': 'إذا استصعب أمر',
    Anger: 'الغضب',
    'Subḥānaka Allāhumma': 'سبحانك اللهم',
    'Subḥāna Rabbiyal-ʿAẓīm': 'سبحان ربي العظيم',
    'Subḥānaka Allāhumma Rabbanā': 'سبحانك اللهم ربنا',
    'Subbūḥun Quddūs': 'سبوح قدوس',
    'Samiʿallāhu liman ḥamidah': 'سمع الله لمن حمده',
    'Rabbanā wa lakal-ḥamd': 'ربنا ولك الحمد',
    'Filling the heavens': 'ملء السماوات',
    'Subḥāna Rabbiyal-Aʿlā': 'سبحان ربي الأعلى',
    'Forgive me all my sins': 'اغفر لي ذنبي كله',
    'Refuge in Your pleasure': 'أعوذ برضاك',
    'Rabbighfir lī': 'رب اغفر لي',
    'Forgive me, have mercy on me': 'اغفر لي وارحمني',
    'At-Taḥiyyāt': 'التحيات',
    'Refuge from four things': 'الاستعاذة من أربع',
    'I have greatly wronged myself': 'ظلمت نفسي ظلمًا كثيرًا',
    'Help me to remember You': 'أعني على ذكرك',
    'Al-Fātiḥah': 'الفاتحة',
    Opening: 'الاستفتاح',
    'Rukūʿ · sujūd': 'الركوع · السجود',
    Standing: 'القيام',
    Tashahhud: 'التشهد',
    'Every rakʿah': 'كل ركعة',
    of: 'من',
    Explanation: 'الشرح',
    Accuracy: 'الدقة',
    Strongest: 'الأقوى',
    'Work on': 'يحتاج عملًا',
    'Start with sujūd as-sahw: the mistakes that happen to everyone.': 'ابدأ بسجود السهو: أخطاء تقع لكل أحد.',
    strong: 'متقن',
    'Review mistakes': 'راجع الأخطاء',
    'Your mistakes': 'أخطاؤك',
    'Nothing to review. Mā shāʾ Allāh': 'لا شيء للمراجعة، ما شاء الله',
    'Paused · hold to resume': 'متوقف · اضغط مطولًا للمتابعة',
    'Tap the circle as you finish each one to move ahead. Hold it to pause.':
      'اضغط الدائرة كلما أتممت مرة لتنتقل، واضغط مطولًا للإيقاف.',
    'Questions done': 'أسئلة مُجابة',
    'Your turn · tap when you have said it': 'دورك · اضغط حين تنتهي',
    Listen: 'استمع',
    round: 'الجولة',
    'Three rounds. Mā shāʾ Allāh': 'ثلاث جولات، ما شاء الله',
    'How well do you know the prayer?': 'ما مدى معرفتك بالصلاة؟',
    'questions, each with its evidence. About three minutes a round.': 'سؤالًا، لكلٍّ دليله. نحو ثلاث دقائق للجولة.',
    'Start with sujūd as-sahw': 'ابدأ بسجود السهو',
    'Last round': 'آخر جولة',
    'work on this': 'يحتاج مراجعة',
    Mixed: 'منوّعة',
    'Dress & ʿawrah': 'اللباس والعورة',
    'From the Qurʾān and Sunnah': 'من القرآن والسنة',
    Sisters: 'الأخوات',
    Brothers: 'الإخوة',
    'The conditions of the jilbāb': 'شروط الجلباب',
    'As gathered by al-Albānī in Jilbāb al-Marʾah al-Muslimah.': 'كما جمعها الألباني في «جلباب المرأة المسلمة».',
    'The whole body is covered, except the face and hands': 'ستر البدن كله إلا الوجه والكفين',
    'Scholars differ on the face: al-Albānī held it may show and covering it is better; Ibn Bāz and Ibn ʿUthaymīn held it is covered too.':
      'اختلف العلماء في الوجه: فرأى الألباني جواز كشفه وأن ستره أفضل، ورأى ابن باز وابن عثيمين وجوب ستره.',
    'Not an adornment in itself': 'ألا يكون زينة في نفسه',
    'The covering itself does not draw attention.': 'لا يلفت الأنظار بذاته.',
    'Thick, not transparent': 'صفيقًا لا يشف',
    'Nothing beneath it shows through.': 'لا يظهر ما تحته.',
    'Loose, not tight': 'فضفاضًا غير ضيق',
    'It does not describe the shape of the body.': 'لا يصف شكل البدن.',
    'Not perfumed outside the home': 'غير مطيّب خارج البيت',
    'Not resembling the dress of men': 'ألا يشبه لباس الرجال',
    'Not resembling the dress particular to non-Muslims': 'ألا يشبه لباس الكافرات',
    'Not worn for fame': 'ألا يكون لباس شهرة',
    'In ṣalāh': 'في الصلاة',
    'Cover all but the face and hands': 'ستر ما عدا الوجه والكفين',
    'Many scholars include the feet.': 'وكثير من العلماء يدخلون القدمين.',
    'The ʿawrah is from the navel to the knee': 'العورة من السرة إلى الركبة',
    'The thigh is part of it.': 'والفخذ منها.',
    'The garment stays above the ankles': 'الثوب فوق الكعبين',
    'No silk and no gold': 'لا حرير ولا ذهب',
    'Not resembling the dress of women': 'ألا يشبه لباس النساء',
    'White is among the best of garments': 'البياض من خير الثياب',
    'My period': 'العادة الشهرية',
    'After childbirth': 'بعد الولادة',
    'After childbirth · day': 'بعد الولادة · اليوم',
    'Forty days have passed': 'مضت أربعون يومًا',
    'Take ghusl and pray, even if bleeding continues.': 'اغتسلي وصلّي وإن استمر الدم.',
    'Add to make-up prayers': 'أضيفيها إلى القضاء',
    'Ḥiṣn al-Muslim · the full entry': 'حصن المسلم · الذكر كاملًا',
    Recitation: 'التلاوة',
    deeds: 'أعمال',
    answered: 'مستجاب',
    'When duʿāʾ is': 'متى يستجاب',
    'Adhkār needs JavaScript.': 'يحتاج التطبيق إلى جافاسكربت.',
    London: 'لندن'
  };
  /* collection, item and tag titles get their Arabic from the content itself */
  var dataReady = false;
  function fromData() {
    if (dataReady || !window.DATA) return;
    dataReady = true;
    window.DATA.collections.forEach(function (c) {
      if (c.ar && !D[c.title]) D[c.title] = c.ar;
    });
    (window.DATA.tasbih || []).forEach(function (t) {
      if (t.tr && t.ar && !D[t.tr]) D[t.tr] = t.ar;
    });
    Object.keys(window.DATA.items).forEach(function (k) {
      var it = window.DATA.items[k];
      if (!it.title || D[it.title]) return;
      var words = it.ar
        .replace(/\n/g, ' ')
        .replace(/[۝][٠-٩]+/g, '')
        .trim()
        .split(/\s+/);
      D[it.title] = words.slice(0, Math.min(4, words.length)).join(' ') + (words.length > 4 ? '…' : '');
    });
    Object.assign(D, {
      'Āyat al-Kursī': 'آية الكرسي',
      'Sayyid al-Istighfār': 'سيد الاستغفار',
      'Sūrah Al-Ikhlāṣ': 'سورة الإخلاص',
      'Sūrah Al-Falaq': 'سورة الفلق',
      'Sūrah An-Nās': 'سورة الناس',
      'Last two verses of Al-Baqarah': 'خواتيم سورة البقرة',
      'Closing verses of Āl ʿImrān': 'خواتيم سورة آل عمران',
      'Ṣalawāt Ibrāhīmiyyah': 'الصلاة الإبراهيمية',
      'Laylat al-Qadr': 'ليلة القدر'
    });
  }
  var BOOK = [
    [/^Ṣaḥīḥ al-Bukhārī (\d+)$/, 'صحيح البخاري '],
    [/^Ṣaḥīḥ Muslim (\d+)$/, 'صحيح مسلم '],
    [/^Bukhārī (\d+)$/, 'البخاري '],
    [/^Muslim (\d+)$/, 'مسلم '],
    [/^Abū Dāwūd (\d+)$/, 'أبو داود '],
    [/^Tirmidhī (\d+)$/, 'الترمذي '],
    [/^at-Tirmidhī (\d+)$/, 'الترمذي '],
    [/^an-Nasāʾī (\d+)$/, 'النسائي '],
    [/^Ibn Mājah (\d+)$/, 'ابن ماجه '],
    [/^Hisn al-Muslim (\d+)$/, 'حصن المسلم '],
    [/^Ḥiṣn al-Muslim (\d+)$/, 'حصن المسلم ']
  ];
  var PAT = [
    [
      /^(\d+) times$/,
      function (m) {
        return m[1] + ' مرة';
      }
    ],
    [
      /^Qur'an (\d+)\/(\d+)$/,
      function (m) {
        return 'القرآن ' + m[1] + '/' + m[2];
      }
    ],
    [
      /^āyah (\d+)$/,
      function (m) {
        return 'الآية ' + m[1];
      }
    ],
    [
      /^about (\d+) min$/,
      function (m) {
        return 'نحو ' + m[1] + ' د';
      }
    ],
    [
      /^(\d+) remembrances$/,
      function (m) {
        return m[1] + ' ذكرًا';
      }
    ],
    [
      /^in (.+)$/,
      function (m) {
        return 'بعد ' + T(m[1]);
      }
    ],
    [
      /^Had you prayed (.+)\?$/,
      function (m) {
        return 'هل صلّيتِ ' + T(m[1]) + '؟';
      }
    ],
    [
      /^(.+) added to make-up prayers$/,
      function (m) {
        return 'أضيفت ' + T(m[1]) + ' إلى القضاء';
      }
    ],
    [
      /^After childbirth · day (\d+)$/,
      function (m) {
        return 'بعد الولادة · اليوم ' + m[1];
      }
    ],
    [
      /^Alarm (.+)$/,
      function (m) {
        return 'منبّه ' + m[1];
      }
    ],
    [
      /^(.+) begins at (.+)$/,
      function (m) {
        return 'تبدأ ' + T(m[1]) + ' في ' + m[2];
      }
    ],
    [
      /^\+([\d,]+) from your widget$/,
      function (m) {
        return '+' + m[1] + ' من الأداة';
      }
    ],
    [
      /^\+([\d,]+) from the reminder$/,
      function (m) {
        return '+' + m[1] + ' من التذكير';
      }
    ],
    [
      /^Striving since (\S+) (\d{4})(?: · (.+))?$/,
      function (m) {
        return 'نسعى منذ ' + T(m[1]) + ' ' + m[2] + (m[3] ? ' · ' + T(m[3]) : '');
      }
    ],
    [
      /^Rakʿah (\d+) of (\d+)$/,
      function (m) {
        return 'الركعة ' + m[1] + ' من ' + m[2];
      }
    ],
    [
      /^Rakʿah (\d+)$/,
      function (m) {
        return 'الركعة ' + m[1];
      }
    ],
    [
      /^Step (\d+) of (\d+)$/,
      function (m) {
        return 'الخطوة ' + m[1] + ' من ' + m[2];
      }
    ],
    [
      /^Continue (.+)$/,
      function (m) {
        return 'تابع ' + T(m[1]);
      }
    ],
    [
      /^Begin · (.+), (.+)$/,
      function (m) {
        return 'ابدأ · ' + T(m[1]) + '، ' + T(m[2]);
      }
    ],
    [
      /^(.+) is complete$/,
      function (m) {
        return 'تمّت ' + T(m[1]);
      }
    ],
    [
      /^(.+) began at (.+)$/,
      function (m) {
        return 'دخل ' + T(m[1]) + ' الساعة ' + m[2];
      }
    ],
    [
      /^I prayed (.+)$/,
      function (m) {
        return 'صلّيت ' + T(m[1]);
      }
    ],
    [
      /^(.+) logged$/,
      function (m) {
        return 'سُجّلت ' + T(m[1]);
      }
    ],
    [
      /^(\d+) other authentic wordings$/,
      function (m) {
        return m[1] + ' صيغ أخرى صحيحة';
      }
    ],
    [
      /^(.+) with the evidence$/,
      function (m) {
        return T(m[1]) + ' مع الأدلة';
      }
    ],
    [
      /^(\d+) days?$/,
      function (m) {
        return A.plural(+m[1], 'day');
      }
    ],
    [
      /^(\d+) nights?$/,
      function (m) {
        return A.plural(+m[1], 'night');
      }
    ],
    [
      /^(.+) begins at (.+)\. These are said after the prayer\.$/,
      function (m) {
        return 'تبدأ ' + T(m[1]) + ' في ' + m[2] + '. وتُقال هذه بعد الصلاة.';
      }
    ],
    [
      /^The morning adhkār begin at Fajr, (.+)\.$/,
      function (m) {
        return 'تبدأ أذكار الصباح عند الفجر، ' + m[1] + '.';
      }
    ],
    [
      /^The evening adhkār begin at ʿAṣr, (.+)\.$/,
      function (m) {
        return 'تبدأ أذكار المساء عند العصر، ' + m[1] + '.';
      }
    ],
    [
      /^(\d+) of (\d+) downloaded\. Try again for the rest\.$/,
      function (m) {
        return 'نُزّل ' + m[1] + ' من ' + m[2] + '. حاول مجددًا للباقي.';
      }
    ],
    [
      /^(.+): a hundred today\. Mā shāʾ Allāh$/,
      function (m) {
        return T(m[1]) + ': مئة اليوم، ما شاء الله';
      }
    ],
    [
      /^(\d+)% mastered$/,
      function (m) {
        return m[1] + '٪ متقن';
      }
    ],
    [
      /^Mastery (\d+)%$/,
      function (m) {
        return 'الإتقان ' + m[1] + '٪';
      }
    ],
    [
      /^Round (\d+)$/,
      function (m) {
        return 'الجولة ' + m[1];
      }
    ],
    [
      /^Show all (\d+)$/,
      function (m) {
        return 'عرض الكل (' + m[1] + ')';
      }
    ],
    [
      /^your usual is (\d+)$/,
      function (m) {
        return 'عادتكِ ' + m[1];
      }
    ],
    [
      /^day (\d+)$/,
      function (m) {
        return 'اليوم ' + m[1];
      }
    ],
    [
      /^After (\d+) days?\.(.*)$/,
      function (m) {
        return 'بعد ' + m[1] + ' أيام.' + (m[2] ? T(m[2].trim()) : '');
      }
    ],
    [
      /^Day (\d+)$/,
      function (m) {
        return 'اليوم ' + m[1];
      }
    ],
    [
      /^Night (\d+)$/,
      function (m) {
        return 'الليلة ' + m[1];
      }
    ],
    [
      /^Juzʾ (\d+)$/,
      function (m) {
        return 'الجزء ' + m[1];
      }
    ],
    [
      /^(\d+) adhkār$/,
      function (m) {
        return m[1] + ' ذكرًا';
      }
    ],
    [
      /^(\d+) items?$/,
      function (m) {
        return A.plural(+m[1], 'item');
      }
    ],
    [
      /^~(\d+) min$/,
      function (m) {
        return '≈ ' + m[1] + ' د';
      }
    ],
    [
      /^(\d+) min$/,
      function (m) {
        return m[1] + ' د';
      }
    ],
    [
      /^([\d,]+) km$/,
      function (m) {
        return m[1] + ' كم';
      }
    ],
    [
      /^of (\d+)$/,
      function (m) {
        return 'من ' + m[1];
      }
    ],
    [
      /^OF (\d+)$/,
      function (m) {
        return 'من ' + m[1];
      }
    ],
    [
      /^(\d+)\/(\d+) done$/,
      function (m) {
        return m[1] + '/' + m[2] + ' تم';
      }
    ],
    [
      /^(.+) notification$/,
      function (m) {
        return 'تنبيه ' + T(m[1]);
      }
    ],
    [
      /^(.+) adjustment$/,
      function (m) {
        return 'تعديل ' + T(m[1]);
      }
    ],
    [
      /^Mark (.+) prayed$/,
      function (m) {
        return 'سجّل ' + T(m[1]);
      }
    ],
    [
      /^One more (.+) owed$/,
      function (m) {
        return 'زد قضاء ' + T(m[1]);
      }
    ],
    [
      /^One fewer (.+) owed$/,
      function (m) {
        return 'أنقص قضاء ' + T(m[1]);
      }
    ],
    [
      /^Show (.+) as a table$/,
      function (m) {
        return 'عرض «' + T(m[1]) + '» جدولًا';
      }
    ],
    [
      /^Mark (.+) done$/,
      function (m) {
        return 'تم: ' + T(m[1]);
      }
    ],
    [
      /^(.+), locked\. (.+)$/,
      function (m) {
        return T(m[1]) + '، مقفل. ' + T(m[2]);
      }
    ],
    [
      /^Travelling$/,
      function () {
        return 'مسافر';
      }
    ],
    [
      /^Iqāmah (.+)$/,
      function (m) {
        return 'الإقامة ' + m[1];
      }
    ],
    [
      /^Since (.+)$/,
      function (m) {
        return 'منذ ' + m[1];
      }
    ],
    [
      /^Answered (.+)$/,
      function (m) {
        return 'استجيب ' + m[1];
      }
    ],
    [
      /^Version (.+)$/,
      function (m) {
        return 'الإصدار ' + m[1];
      }
    ],
    [
      /^Evening of (.+)$/,
      function (m) {
        return 'مساء ' + m[1];
      }
    ],
    [
      /^After the adhān of (.+)$/,
      function (m) {
        return 'بعد أذان ' + T(m[1]);
      }
    ],
    [
      /^Count\. (\d+) of (\d+)$/,
      function (m) {
        return 'العدد ' + m[1] + ' من ' + m[2];
      }
    ],
    [
      /^Assalāmu ʿalaykum(, )?(.*)$/,
      function (m) {
        return 'السلام عليكم' + (m[2] ? '، ' + m[2] : '');
      }
    ],
    [
      /^Bismillāh, (.+)$/,
      function (m) {
        return 'بسم الله، ' + m[1];
      }
    ],
    [
      /^Time for ʿAṣr(.*)$/,
      function (m) {
        return 'حان وقت العصر' + (m[1] ? ' في' + m[1].replace(/^ in/, '') : '');
      }
    ],
    [
      /^(.+) km from (.+)$/,
      function (m) {
        return m[1] + ' كم من ' + m[2];
      }
    ],
    [
      /^Home set to (.+)$/,
      function (m) {
        return 'تم تعيين المنزل: ' + m[1];
      }
    ],
    [
      /^Location set to (.+)$/,
      function (m) {
        return 'تم تحديد الموقع: ' + m[1];
      }
    ]
  ];
  function T(s) {
    if (!s) return s;
    fromData();
    var t = s.trim();
    if (!t) return s;
    var out = D[t];
    if (out == null) {
      for (var i = 0; i < BOOK.length && out == null; i++) {
        var b = t.match(BOOK[i][0]);
        if (b) out = BOOK[i][1] + b[1];
      }
      for (var j = 0; j < PAT.length && out == null; j++) {
        var m = t.match(PAT[j][0]);
        if (m) out = PAT[j][1](m);
      }
      if (out == null && t.indexOf(' · ') > 0) {
        var parts = t.split(' · '),
          tr = parts.map(T);
        if (
          tr.some(function (x, k) {
            return x !== parts[k];
          })
        )
          out = tr.join(' · ');
      }
      if (out == null && /^[^,]+(, [^,]+)+$/.test(t)) {
        var cp = t.split(', '),
          ct = cp.map(T);
        if (
          ct.some(function (x, k) {
            return x !== cp[k];
          })
        )
          out = ct.join('، ');
      }
    }
    if (out == null) out = t;
    return s.replace(t, out);
  }
  A.T = function (s) {
    return A.ar() ? digits(T(s)) : s;
  };
  /* a feature module brings its own Arabic strings; an entry already here wins */
  A.addAr = function (o) {
    for (var k in o) if (o.hasOwnProperty(k) && D[k] == null) D[k] = o[k];
  };
  A.toAr = function (s) {
    var t = T(s);
    return t !== s ? t : '';
  }; /* the Arabic name, in either language (for search) */

  /* ---------- applying it to the page ---------- */
  var SKIP =
    '.tx-t, .rd-tr, .rd-en, .en, .tr, :not(html)[lang="ar"], .ar, script, style, input, textarea, .jr-text, .no-tr';
  A.localize = function (root) {
    if (!A.ar() || !root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        return p && p.closest(SKIP)
          ? NodeFilter.FILTER_REJECT
          : /[A-Za-z0-9]/.test(n.nodeValue)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
      }
    });
    var list = [];
    while (walker.nextNode()) list.push(walker.currentNode);
    list.forEach(function (n) {
      var v = digits(T(n.nodeValue));
      if (v !== n.nodeValue) n.nodeValue = v;
      if (/[A-Za-z]{3,}.*[A-Za-z]{3,}/.test(v) && v.length > 24 && n.parentElement)
        n.parentElement.setAttribute('dir', 'auto');
    });
    var withAttrs = Array.prototype.slice.call(root.querySelectorAll('[aria-label],[placeholder],[title]'));
    if (root.nodeType === 1) withAttrs.push(root);
    withAttrs.forEach(function (e) {
      ['aria-label', 'placeholder', 'title'].forEach(function (a) {
        var v = e.getAttribute(a);
        if (v && /[A-Za-z0-9]/.test(v)) e.setAttribute(a, digits(T(v)));
      });
    });
  };
  A.applyLang = function () {
    var r = document.documentElement,
      ar = A.ar();
    r.setAttribute('lang', ar ? 'ar' : 'en');
    r.setAttribute('dir', ar ? 'rtl' : 'ltr');
  };
  /* everything that appears on the page is localized as it appears: views, the reader, sheets, live countdowns */
  var pending = [],
    queued = false;
  function flush() {
    queued = false;
    var list = pending;
    pending = [];
    list.forEach(function (n) {
      if (n.isConnected) A.localize(n.nodeType === 3 ? n.parentElement : n);
    });
  }
  var mo =
    window.MutationObserver &&
    new MutationObserver(function (muts) {
      if (!A.ar()) return;
      muts.forEach(function (m) {
        if (m.type === 'characterData') pending.push(m.target);
        else
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType === 1 || n.nodeType === 3) pending.push(n);
          });
      });
      if (!queued && pending.length) {
        queued = true;
        Promise.resolve().then(flush);
      }
    });
  if (mo) mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  var render = A.render;
  A.render = function (o) {
    render(o);
    if (!A.ar()) return;
    var app = document.getElementById('app'),
      nav = document.getElementById('nav');
    A.localize(app);
    A.localize(nav);
    /* the page and the nav are done; anything else this render added (the reader, a sheet) still goes through the observer */
    if (mo)
      mo.takeRecords().forEach(function (m) {
        var t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (!t || app.contains(t) || nav.contains(t)) return;
        if (m.type === 'characterData') pending.push(m.target);
        else
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType === 1 || n.nodeType === 3) pending.push(n);
          });
      });
    if (pending.length && !queued) {
      queued = true;
      Promise.resolve().then(flush);
    }
  };
  var toast = A.toast;
  A.toast = function (msg, icon) {
    return toast(A.ar() ? A.T(msg) : msg, icon);
  };
  var confirm = A.confirm;
  A.confirm = function (t, m, ok, cb, danger) {
    return confirm(A.T(t), A.T(m), A.T(ok), cb, danger);
  };
  A.setLang = function (lang) {
    S.prefs.lang = lang;
    /* Arabic readers read the dhikr itself; transliteration and English meanings can be turned back on */
    if (lang === 'ar') {
      S.prefs.tr = false;
      S.prefs.en = false;
    } else {
      S.prefs.tr = true;
      S.prefs.en = true;
    }
    A.save(true);
    A.N.sync();
    location.reload();
  };
  A.acts.lang = function (el) {
    A.N.haptic('tick');
    A.setLang(el.dataset.v);
  };
  /* first run on an Arabic phone starts in Arabic */
  if (S.prefs.lang == null) {
    S.prefs.lang = /^ar/i.test(navigator.language || '') ? 'ar' : 'en';
    if (S.prefs.lang === 'ar') {
      S.prefs.tr = false;
      S.prefs.en = false;
    }
  }
  A.applyLang();
})();
