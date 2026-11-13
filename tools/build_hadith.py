"""Verbatim hadith for the Virtues, Deeds and Answered pages.
Arabic and English come from fawazahmed0/hadith-api (the English editions are the sunnah.com translations), saved in
tools/src/hadith. Each entry is a slice of the source between two markers: nothing is retyped or paraphrased.
Muslim is matched by its ʿAbd al-Bāqī number (sunnah.com numbering), the others by hadith number.
One documented exception: Tirmidhī 3513 drops the word "karīm", which al-Albānī found is not established (the app
omits it everywhere).
Output: web/js/hadith.js (window.HADITH = { 'bukhari:1145': { ar, en, g } })."""
import io, json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src', 'hadith')
OUT = os.path.join(ROOT, '..', 'web', 'js', 'hadith.js')

# ref: (Arabic spec, English spec). A spec is 'q1'/'q2' (the nth quoted passage) or (start, end), end inclusive, None = to the end.
# A trailing '+' on a spec marks a cut mid-passage, shown with an ellipsis.
SPEC = {
    'bukhari:1145': ('q1', ('Our Lord, the Blessed', None)),
    'abudawud:521': ('q1', ('The supplication made between', None)),
    'tirmidhi:3499': (('قِيلَ يَا رَسُولَ', 'الْمَكْتُوبَاتِ'), ('It was said', None)),
    'abudawud:1048': (('يَوْمُ الْجُمُعَةِ', 'بَعْدَ الْعَصْرِ'), ('Friday is divided', None)),
    'bukhari:935': ('q1', ('There is an hour (opportune time)', 'meet his demand.')),
    'tirmidhi:3585': (('خَيْرُ الدُّعَاءِ', 'يَوْمِ عَرَفَةَ', '+'), ('The best of supplication is the supplication of the Day of `Arafah.', 'the Day of `Arafah.', '+')),
    'tirmidhi:3513': (('قُلْتُ يَا رَسُولَ', 'فَاعْفُ عَنِّي'), ('I said', None)),
    'muslim:482': ('q1', ('The nearest a servant', None)),
    'muslim:2732': ('q1', ('There is no believing servant', None)),
    'abudawud:1536': ('q1', ('Three supplications are answered', None)),
    'bukhari:1154': ('q1', ('Whoever gets up at night', None)),
    'abudawud:2540': ('q1', ('Two (prayers) are not rejected', 'grapple with each other.')),
    'bukhari:6405': ('q1', ("Whoever says, 'Subhan Allah wa bihamdihi,'", None)),
    'bukhari:6403': ('q1', ('Whoever says: "La ilaha', None)),
    'muslim:2698': ('q2', ('Is one amongst you powerless', None)),
    'bukhari:6406': ('q1', ('There are two expressions', None)),
    'muslim:408': ('q1', ('He who blesses me once', None)),
    'bukhari:5013': ('q1', ('By Him in Whose Hand', None)),
    'bukhari:2311': (('إِذَا أَوَيْتَ إِلَى فِرَاشِكَ فَاقْرَأْ آيَةَ الْكُرْسِيِّ', 'حَتَّى تُصْبِحَ'), ('Whenever you go to bed', 'till morning.')),
    'muslim:234': ('q2', ('If anyone amongst you performs the ablution', None)),
    'muslim:728': ('q1', ('A house will be built in Paradise', "twelve rak'ahs")),
    'muslim:656': ('q1', ('He who observed the', None)),
    'muslim:720': ('q1', ('In the morning charity is due', None)),
    'bukhari:614': ('q1', ('Whoever after listening to the Adhan', None)),
    'bukhari:1981': (('أَوْصَانِي', None), ('My friend (the Prophet', None)),
    'tirmidhi:1956': (('تَبَسُّمُكَ', 'لَكَ صَدَقَةٌ', '+'), ('Your smiling in the face of your brother is charity', 'is charity', '+')),
    'bukhari:652': ('q1', ('While a man was going on a way', 'forgave him for that.')),
    'muslim:2568': ('q1', ('The one who visits the sick', None)),
    'bukhari:1417': ('q1', ('Save yourself from Hell-fire', None)),
    'muslim:2626': ('q1', ("Don't consider anything", None)),
    'bukhari:6464': ('q1', ('Do good deeds properly', None)),
    'bukhari:1147': (('مَا كَانَ رَسُولُ اللَّهِ', 'إِحْدَى عَشْرَةَ رَكْعَةً'), ("Allah's Messenger (ﷺ) never exceeded", 'or in other months')),
    'bukhari:990': ('q1', ('The night prayer is offered', None)),
    'abudawud:1502': (('رَأَيْتُ رَسُولَ اللَّهِ', 'بِيَمِينِهِ'), ('I saw the Messenger of Allah', None)),
    'muslim:748': ('q1', ('The prayer of those who are penitent', None)),
    # Friday: its virtue, its Sunnahs, its hour, and the first verses of al-Kahf
    'abudawud:1047': (('إِنَّ مِنْ أَفْضَلِ أَيَّامِكُمْ', 'مَعْرُوضَةٌ عَلَىَّ', '+'), ('Among the most excellent of your days', 'will be submitted to me.', '+')),
    'bukhari:880': (('الْغُسْلُ يَوْمَ الْجُمُعَةِ', 'إِنْ وَجَدَ'), ('The taking of a bath on Friday', 'if it is available.')),
    'bukhari:881': (('مَنِ اغْتَسَلَ يَوْمَ الْجُمُعَةِ', 'يَسْتَمِعُونَ الذِّكْرَ'), ('Any person who takes a bath on Friday', None)),
    'bukhari:891': (('كَانَ النَّبِيُّ', None), ('The Prophet (ﷺ) used to recite', None)),
    'bukhari:934': (('إِذَا قُلْتَ لِصَاحِبِكَ', 'فَقَدْ لَغَوْتَ'), ('When the Imam is delivering the Khutba', None)),
    'muslim:853': (('هِيَ مَا بَيْنَ', None), ('It is between the time', None)),
    'muslim:809': (('مَنْ حَفِظَ', 'عُصِمَ مِنَ الدَّجَّالِ'), ('If anyone learns by heart', None)),
    # dress, ʿawrah, nifās, and making up fasts but not prayers
    'abudawud:4173': ('q1', ('If a woman uses perfume', None)),
    'bukhari:5885': (('لَعَنَ رَسُولُ اللَّهِ', 'بِالرِّجَالِ'), ("Allah's Messenger (ﷺ) cursed", None)),
    'abudawud:4031': ('q1', ('He who copies any people', None)),
    'abudawud:4029': ('q1', ('If anyone wears a garment', None)),
    'abudawud:641': ('q1', ('Allah does not accept the prayer', 'wears a veil.')),
    'bukhari:5787': ('q1', ('The part of an Izar', None)),
    'tirmidhi:2798': ('q1', ('Cover your thigh', None)),
    'abudawud:311': (('كَانَتِ النُّفَسَاءُ', 'أَرْبَعِينَ لَيْلَةً'), ('The woman having bleeding after delivery', 'forty nights')),
    'tirmidhi:994': ('q1', ('Wear the white among your garments', None)),
    'nasai:5144': ('q1', ('These two are forbidden', None)),
    'muslim:335#3': (('كَانَ يُصِيبُنَا ذَلِكَ', 'الصَّلاَةِ'), ('We passed through this', None)),
    # how to pray: the evidence behind each step of the Ṣalāh guide
    'bukhari:631': (('صَلُّوا كَمَا رَأَيْتُمُونِي أُصَلِّي', 'أُصَلِّي'), ('Pray as you have seen me praying', 'praying')),
    'bukhari:757': (('إِذَا قُمْتَ إِلَى الصَّلاَةِ', 'فِي صَلاَتِكَ كُلِّهَا'), ('When you stand for Prayer', None)),
    'muslim:498': (('كَانَ رَسُولُ اللَّهِ صلى الله عليه وسلم يَسْتَفْتِحُ', 'بِالتَّسْلِيمِ'), ('The Messenger of Allah (ﷺ) used to begin prayer', None)),
    'bukhari:739': (('كَانَ إِذَا دَخَلَ فِي الصَّلاَةِ', 'إِلَى نَبِيِّ اللَّهِ صلى الله عليه وسلم'), ('Whenever Ibn `Umar started', None)),
    'bukhari:740': (('كَانَ النَّاسُ يُؤْمَرُونَ', 'فِي الصَّلاَةِ'), ('The people were ordered', 'in the prayer')),
    'bukhari:756': ('q1', ('Whoever does not recite', None)),
    'bukhari:780': ('q1', ('Say Amin', 'will be forgiven')),
    'bukhari:812': ('q1', ('I have been ordered', None)),
    'bukhari:828': (('رَأَيْتُهُ إِذَا كَبَّرَ', 'وَقَعَدَ عَلَى مَقْعَدَتِهِ'), ('I saw him raising', None)),
    'bukhari:823': (('رَأَى النَّبِيَّ', 'قَاعِدًا'), ('I saw the Prophet', None)),
    'abudawud:996': (('كَانَ يُسَلِّمُ عَنْ يَمِينِهِ', 'خَدِّهِ'), ('The Prophet (ﷺ) used to give the salutation', 'was seen')),
    'bukhari:722': (('إِنَّمَا جُعِلَ الإِمَامُ', 'وَإِذَا سَجَدَ فَاسْجُدُوا'), ('The Imam is (appointed) to be followed', 'prostrate (after him)')),
    'bukhari:359': ('q1', ('None of you should offer', None)),
    'bukhari:1203': ('q1', ('The saying', 'for women.')),
    'muslim:440': ('q1', ('The best rows for men', None)),
    'abudawud:567': ('q1', ('Do not prevent', None)),
    # the Tracker's daily counts
    'muslim:2702': ('q1', ('There is (at times)', None)),
    'muslim:597': ('q1', ('If anyone extols Allah', None)),
    # sujūd as-sahw
    'bukhari:1224': (('صَلَّى لَنَا رَسُولُ اللَّهِ', 'ثُمَّ سَلَّمَ'), ("Allah's Messenger (ﷺ) once led us", None)),
    'bukhari:1226': (('صَلَّى الظُّهْرَ خَمْسًا', 'بَعْدَ مَا سَلَّمَ'), ("Once Allah's Messenger", None)),
    'bukhari:1229': (('فَصَلَّى رَكْعَتَيْنِ ثُمَّ سَلَّمَ ثُمَّ كَبَّرَ', None), ('So the Prophet (ﷺ) offered two more', None)),
    'bukhari:401': (('وَإِذَا شَكَّ أَحَدُكُمْ', 'سَجْدَتَيْنِ'), ('if anyone of you is doubtful', None)),
    'muslim:571': ('q1', ('When any one of you is in doubt', None)),
}
# typing errors in the source English, corrected (the sunnah.com page reads as fixed here)
FIX = {'abudawud:641': [('wears a veil', 'wears a khimār')],   # the hadith's own word, explained in NOTE below
       'muslim:571': [('does Dot know', 'does not know'), ("(rak'ahs). he should", "(rak'ahs), he should"), ('is sure of. then', 'is sure of, then')]}
# a word of explanation shown beneath a hadith, in English and Arabic
NOTE = {'abudawud:641': ('Khimār: the covering of the head, drawn down over the neck and chest (from khamara, to cover, as Ibn Kathīr explains on an-Nūr 24:31). With the rest of her clothing it conceals the hair, head, neck and body. Covering the ʿawrah is a condition for the prayer to be valid: if a grown woman prays with her hair, neck or body uncovered, her prayer is not valid and must be repeated. This holds even when she prays alone in her own room.',
                         'الخمار: غطاء الرأس يُسدل على العنق والصدر (من خمّر: غطّى، كما بيّنه ابن كثير في تفسير النور ٣١). ومع بقية ثيابها يستر الشعر والرأس والعنق والبدن. وستر العورة شرط لصحة الصلاة: فإن صلّت المرأة البالغة وقد ظهر شعرها أو عنقها أو بدنها لم تصح صلاتها ووجبت إعادتها، ولو كانت تصلي وحدها في غرفتها.')}
GRADE_BY = 'Al-Albani'


def load(lang, ref):
    book, n = ref.split(':')
    if book == 'muslim':
        full = json.load(io.open(os.path.join(SRC, lang + '-muslim-full.json'), encoding='utf-8'))['hadiths']
        eng = json.load(io.open(os.path.join(SRC, 'eng-muslim-full.json'), encoding='utf-8'))['hadiths']
        k = 1
        if '#' in n: n, k = n.split('#')[0], int(n.split('#')[1])   # muslim:335#3 = the third narration under 335
        hn = [h for h in eng if str(h.get('arabicnumber', '')).split('.')[0] == n][k - 1]['hadithnumber']
        return [h for h in full if h['hadithnumber'] == hn][0]
    p = os.path.join(SRC, '%s-%s-%s.json' % (lang, book, n))
    if not os.path.exists(p) and ref == 'tirmidhi:3513' and lang == 'ara': p = os.path.join(ROOT, 'src', 'tirmidhi-3513.json')
    return json.load(io.open(p, encoding='utf-8-sig'))['hadiths'][0]


def clean(t):
    t = t.replace('‏', '').replace('‎', '')
    t = re.sub(r'\s+', ' ', t)
    return t.strip()


def strip_marks(s):
    s = s.replace('"', '').replace('“', '').replace('”', '').replace('{', '﴿').replace('}', '﴾')
    s = re.sub(r'\s+', ' ', s).strip().strip("'‘’ :")
    return s.rstrip(' .').strip() + ('' if s.endswith(('?', '!', '…')) else '.')


MARK = re.compile('[ً-ْٰـ]')


def find(text, pat, start=0):
    """Index of pat in text, ignoring the order of Arabic diacritics (sources differ, e.g. shadda before ḍamma).
    Returns (i, j) into the original text; the slice itself is always the source's own characters."""
    if pat in text[start:]:
        i = text.index(pat, start); return i, i + len(pat)
    key = lambda s: [c for c in s if not MARK.match(c)]
    base, idx = [], []
    for k, ch in enumerate(text):
        if not MARK.match(ch): base.append(ch); idx.append(k)
    p = ''.join(key(pat)); b = ''.join(base)
    m = b.find(p, len([k for k in idx if k < start]))
    if m < 0: raise ValueError('marker not found: ' + pat)
    i, j = idx[m], idx[m + len(p) - 1] + 1
    while j < len(text) and MARK.match(text[j]): j += 1
    return i, j


def take(text, spec):
    more = False
    if spec in ('q1', 'q2'):
        quoted = re.findall(r'"([^"]+)"', text)
        quoted = [q for q in quoted if len(q.strip()) > 3]
        s = quoted[int(spec[1]) - 1]
    else:
        a, b = spec[0], spec[1]; more = len(spec) > 2
        i, _ = find(text, a)
        if b is None: s = text[i:]
        else: _, j = find(text, b, i); s = text[i:j]
    assert s in text
    out = strip_marks(s)
    return out[:-1] + '…' if more and out.endswith('.') else out + ('…' if more and not out.endswith('…') else '')


H = {}
for ref, (sa, se) in SPEC.items():
    ar_src, en_src = load('ara', ref), load('eng', ref)
    ar_t, en_t = clean(ar_src['text']), clean(en_src['text'])
    try: ar, en = take(ar_t, sa), take(en_t, se)
    except Exception as e: raise SystemExit("%s: %s | %s" % (ref, e, (ar_t[:300], en_t[:300])))
    if ref == 'tirmidhi:3513':
        ar = ar.replace(' كَرِيمٌ', '')
        en = en.replace('[Generous,] ', '').replace(' [Karīmun]', '')
    g = ''
    if ref.split(':')[0] in ('bukhari', 'muslim'): g = 'Ṣaḥīḥ'
    else:
        gr = [x['grade'] for x in en_src.get('grades', []) if x['name'] == GRADE_BY]
        g = (gr[0] + ' (al-Albānī)') if gr else ''
    for x, y in FIX.get(ref, []): en = en.replace(x, y)
    en = en[0].upper() + en[1:]
    H[ref.split('#')[0]] = {'ar': ar, 'en': en, 'g': g.replace('Sahih', 'Ṣaḥīḥ').replace('Hasan', 'Ḥasan')}
    if ref in NOTE: H[ref]['x'], H[ref]['xa'] = NOTE[ref]

# the words of the taslīm, as the narration quotes them (once; it is said to the right, then to the left)
_t = clean(load('ara', 'abudawud:996')['text']); _q = take(_t, 'q1').rstrip('.'); _i, _j = find(_q, 'وَرَحْمَةُ اللَّهِ')
H['say:taslim'] = {'ar': _q[:_j], 'en': 'Peace be upon you, and mercy of Allah', 'g': ''}
# Qurʾān verses quoted on the same pages: Uthmani text and The Clear Quran (tools/src/quran-extra.json)
QX = json.load(io.open(os.path.join(ROOT, 'src', 'quran-extra.json'), encoding='utf-8'))
for k, v in QX.items():
    H['quran:' + k] = {'ar': v['ar'], 'en': v['en'].replace(' — ', ', ').replace('—', ', '), 'g': ''}

io.open(OUT, 'w', encoding='utf-8').write('/* Generated by tools/build_hadith.py from verified sources; do not edit by hand. */\nwindow.HADITH=' + json.dumps(H, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('hadith:', len(H))
