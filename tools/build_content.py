"""Generates web/js/data.js — the app's single source of religious text.

Arabic is never typed by hand here:
  * v9 morning/evening/quick/night/waking records come verbatim from tools/src/content-v9.json
  * new collections take Arabic verbatim from the Ḥiṣn al-Muslim API dumps in tools/src/hisn-ar*.json
    (hisnmuslim.com/api/ar/<chapter>.json); only bracketed instructions are moved out into notes,
    and combined records are split at exact substrings (asserted below).
Transliterations and English meanings for new records are the app's own concise renderings.
Run:  python tools/build_content.py
"""
import json, re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'src')
OUT = os.path.join(ROOT, 'web', 'js', 'data.js')

v9 = json.load(open(os.path.join(SRC, 'content-v9.json'), encoding='utf-8'))
H = {}
for f in glob.glob(os.path.join(SRC, 'hisn-ar*.json')):
    d = json.load(open(f, encoding='utf-8-sig'))
    for rec in d[list(d)[0]]:
        H[rec['ID']] = rec['ARABIC_TEXT']


def clean(s):
    s = s.replace('((', '').replace('))', '').replace('ـــــــــــ', '')
    s = re.sub(r'^\s*\(|\)\s*\.?\s*$', '', s.strip())
    s = re.sub(r'\s+', ' ', s).strip()
    return s.rstrip('.').strip()


MARKS = re.compile('[ً-ٰٟۖ-ۭـ]')


def loose_find(t, pat, start=0):
    """Find pat in t ignoring harakāt/tatweel (their order differs between sources).
    Returns (i, j) indices into the ORIGINAL text, j extended over trailing marks."""
    base, idx = [], []
    for k, ch in enumerate(t):
        if not MARKS.match(ch):
            base.append(ch); idx.append(k)
    b = ''.join(base); p = MARKS.sub('', pat)
    s0 = next((n for n, k in enumerate(idx) if k >= start), len(idx))
    m = b.find(p, s0)
    if m < 0:
        return None
    i = idx[m]; j = idx[m + len(p) - 1] + 1
    while j < len(t) and MARKS.match(t[j]):
        j += 1
    return i, j


def between(hid, start, end=None):
    t = H[hid]
    a = loose_find(t, start)
    assert a, (hid, start)
    if end is None:
        return clean(t[a[0]:])
    if end == start:  # just the phrase itself (first occurrence)
        return clean(t[a[0]:a[1]])
    b = loose_find(t, end, a[0])
    assert b, (hid, end)
    return clean(t[a[0]:b[1]])


def sunnah(label, path):
    return {'l': label, 'u': 'https://sunnah.com/' + path}


def hisn(n):
    return sunnah('Ḥiṣn al-Muslim %d' % n, 'hisn:%d' % n)


ITEMS = {}


def ref_v9(r):
    return [{'l': x['label'], 'u': x['url']} for x in r]


def add(uid, **kw):
    assert uid not in ITEMS, uid
    kw.setdefault('kind', 'fixed')
    ITEMS[uid] = kw


# ---------- v9 records (verbatim) ----------
TAG = {
    'kursi': 'Protection · Qurʾān', 'ikhlas': 'Protection · Qurʾān', 'falaq': 'Protection · Qurʾān', 'nas': 'Protection · Qurʾān',
    'sayyid': 'The master of forgiveness', 'health': 'Well-being', 'afiyah': 'Family and life', 'knowledge': 'Refuge from evil',
    'bismillah': 'Protection by His name', 'raditu': 'Contentment', 'hayyu': 'Mercy in all affairs', 'tahlil': 'Tawḥīd',
    'subhan': 'Glorification', 'kingdom': 'Sovereignty', 'byyou': 'Life and return', 'beneficial': 'After Fajr',
    'perfectwords': 'Seeking refuge', 'twoheavy': 'Heavy on the scale', 'hawqala': 'A treasure of Paradise', 'daily100': '100 in a day',
}
for s in v9['shared']:
    add(s['id'], title=s['name'], ar=s['ar'], tr=s['tr'], en=s['en'], refs=ref_v9(s['ref']), count=s['count'], tag=TAG.get(s['id'], ''))
for mode in ('morning', 'evening'):
    for s in v9['variants'][mode]:
        add(mode + ':' + s['id'], title=s['name'], ar=s['ar'], tr=s['tr'], en=s['en'], refs=ref_v9(s['ref']), count=s['count'], tag=TAG.get(s['id'], ''))
for s in v9['shortDhikr']:
    c = s.get('count') or None
    add(s['id'], title=s['name'], ar=s['ar'], tr=s['tr'], en=s['en'], refs=ref_v9(s['ref']), count=c, kind='fixed' if c else 'open', tag=TAG.get(s['id'], ''))
w = v9['generalWaking']
add('wake', title=w['name'], ar=w['ar'], tr=w['tr'], en=w['en'], refs=ref_v9(w['ref']), count=1, tag='On waking')
n = v9['nightAwakening']
add('nightdhikr', title=n['name'], ar=n['ar'], tr=n['tr'],
    en='None has the right to be worshipped except Allah alone, without partner. To Him belongs the dominion and all praise, and He has power over all things. All praise belongs to Allah. Glory be to Allah. None has the right to be worshipped except Allah. Allah is the Greatest. There is no power and no strength except through Allah. O Allah, forgive me.',
    note='Then make any duʿāʾ — it is answered. If you then make wuḍūʾ and pray, your prayer is accepted.',
    refs=ref_v9(n['ref']), count=1, tag='Bukhārī 1154')

# ---------- Within ṣalāh (Ḥiṣn 27–59): the words of each position, for the Ṣalāh guide ----------
# Each is the whole Ḥiṣn entry, so it takes the sunnah.com transliteration, translation and recording (set further down).
def inprayer(uid, n, title, tag, count=1, a=None, b=None, refs=()):
    add(uid, title=title, ar=between(n, a, b) if a else clean(H[n]), count=count, tr='', en='', refs=list(refs) + [hisn(n)], tag=tag)
add('p-fatiha', title='Al-Fātiḥah', ar='', count=1, en='',
    tr='Bismillāhir-Raḥmānir-Raḥīm. Al-ḥamdu lillāhi Rabbil-ʿālamīn. Ar-Raḥmānir-Raḥīm. Māliki yawmid-dīn. Iyyāka naʿbudu wa iyyāka nastaʿīn. Ihdinaṣ-ṣirāṭal-mustaqīm. Ṣirāṭal-ladhīna anʿamta ʿalayhim, ghayril-maghḍūbi ʿalayhim wa laḍ-ḍāllīn.', refs=[{'l': 'Qurʾān 1', 'u': 'https://quran.com/1'}, sunnah('Ṣaḥīḥ al-Bukhārī 756', 'bukhari:756')], tag='Every rakʿah')   # text and translation set with the Qurʾān passages
inprayer('p-open-baid', 27, 'Distance me from my sins', 'Opening', refs=[sunnah('Ṣaḥīḥ al-Bukhārī 744', 'bukhari:744')])
inprayer('p-open-subhanaka', 28, 'Subḥānaka Allāhumma', 'Opening', refs=[sunnah('Sunan Abī Dāwūd 775', 'abudawud:775')])
inprayer('p-ruku', 33, 'Subḥāna Rabbiyal-ʿAẓīm', 'Rukūʿ', 3, 'سُبْحانَ', 'الْعَظِيمِ', refs=[sunnah('Sunan Abī Dāwūd 871', 'abudawud:871')])
inprayer('p-subhanaka', 34, 'Subḥānaka Allāhumma Rabbanā', 'Rukūʿ · sujūd', refs=[sunnah('Ṣaḥīḥ al-Bukhārī 794', 'bukhari:794')])
inprayer('p-subbuh', 35, 'Subbūḥun Quddūs', 'Rukūʿ · sujūd', refs=[sunnah('Ṣaḥīḥ Muslim 487', 'muslim:487')])
inprayer('p-sami', 38, 'Samiʿallāhu liman ḥamidah', 'Rising', refs=[sunnah('Ṣaḥīḥ al-Bukhārī 789', 'bukhari:789')])
inprayer('p-rabbana', 39, 'Rabbanā wa lakal-ḥamd', 'Standing', refs=[sunnah('Ṣaḥīḥ al-Bukhārī 799', 'bukhari:799')])
inprayer('p-mil', 40, 'Filling the heavens', 'Standing', refs=[sunnah('Ṣaḥīḥ Muslim 477', 'muslim:477')])
inprayer('p-sujud', 41, 'Subḥāna Rabbiyal-Aʿlā', 'Sujūd', 3, 'سُبْحَانَ', 'الأَعْلَى', refs=[sunnah('Sunan Abī Dāwūd 871', 'abudawud:871')])
inprayer('p-dhanbi', 46, 'Forgive me all my sins', 'Sujūd', refs=[sunnah('Ṣaḥīḥ Muslim 483', 'muslim:483')])
inprayer('p-ridaka', 47, 'Refuge in Your pleasure', 'Sujūd', refs=[sunnah('Ṣaḥīḥ Muslim 486', 'muslim:486')])
inprayer('p-jalsah', 48, 'Rabbighfir lī', 'Between the prostrations', refs=[sunnah('Sunan Ibn Mājah 897', 'ibnmajah:897')])
inprayer('p-jalsah-long', 49, 'Forgive me, have mercy on me', 'Between the prostrations', refs=[sunnah('Jāmiʿ at-Tirmidhī 284', 'tirmidhi:284')])
inprayer('p-tashahhud', 52, 'At-Taḥiyyāt', 'Tashahhud', refs=[sunnah('Ṣaḥīḥ al-Bukhārī 831', 'bukhari:831')])
inprayer('p-refuge', 55, 'Refuge from four things', 'Before the salām', refs=[sunnah('Ṣaḥīḥ Muslim 588', 'muslim:588')])
inprayer('p-zalamtu', 57, 'I have greatly wronged myself', 'Before the salām', refs=[sunnah('Ṣaḥīḥ al-Bukhārī 834', 'bukhari:834')])
inprayer('p-ainni', 59, 'Help me to remember You', 'Before the salām', refs=[sunnah('Sunan Abī Dāwūd 1522', 'abudawud:1522')])

# ---------- Worry and distress (Ḥiṣn 120–125, 139, 193): whole entries, so they take the sunnah.com wording ----------
inprayer('h-servant', 120, 'I am Your servant', 'Worry and grief', refs=[sunnah('Musnad Aḥmad 3712', 'ahmad:3712')])
inprayer('h-hamm', 121, 'Refuge from grief and sadness', 'Worry and grief', refs=[sunnah('Ṣaḥīḥ al-Bukhārī 6369', 'bukhari:6369')])
inprayer('h-karb', 122, 'The Mighty, the Forbearing', 'Distress', refs=[sunnah('Ṣaḥīḥ al-Bukhārī 6346', 'bukhari:6346'), sunnah('Ṣaḥīḥ Muslim 2730', 'muslim:2730')])
inprayer('h-rahmah', 123, 'I hope for Your mercy', 'Distress', refs=[sunnah('Sunan Abī Dāwūd 5090', 'abudawud:5090')])
inprayer('h-yunus', 124, 'The supplication of Yūnus', 'Distress', refs=[sunnah('Jāmiʿ at-Tirmidhī 3505', 'tirmidhi:3505')])
inprayer('h-rabbi', 125, 'Allah, Allah is my Lord', 'Distress', refs=[sunnah('Sunan Abī Dāwūd 1525', 'abudawud:1525')])
inprayer('h-sahl', 139, 'No ease but what You make easy', 'When something is difficult')
inprayer('h-anger', 193, 'When angry', 'Anger', refs=[sunnah('Ṣaḥīḥ al-Bukhārī 6115', 'bukhari:6115')])

# ---------- After ṣalāh (Ḥiṣn 66–73) ----------
add('s-istighfar', title='Seeking forgiveness', ar=between(66, 'أَسْتَغْفِرُ', 'اللَّهَ'), count=3,
    tr='Astaghfirullāh.', en='I seek the forgiveness of Allah.',
    refs=[sunnah('Ṣaḥīḥ Muslim 591', 'muslim:591'), hisn(66)], tag='Immediately after salām')
add('s-salam', title='Allāhumma antas-salām', ar=between(66, 'اللَّهُمَّ أَنْتَ السَّلاَمُ'), count=1,
    tr='Allāhumma antas-salām wa minkas-salām, tabārakta yā dhal-jalāli wal-ikrām.',
    en='O Allah, You are Peace and from You comes peace. Blessed are You, Possessor of majesty and honour.',
    refs=[sunnah('Ṣaḥīḥ Muslim 591', 'muslim:591'), hisn(66)], tag='Peace')
add('s-lamani', title='None can withhold what You give', ar=between(67, 'لاَ إِلَهَ').replace(' [ثلاثاً]', ''), count=1,
    tr='Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa Huwa ʿalā kulli shay’in qadīr. Allāhumma lā māniʿa limā aʿṭayt, wa lā muʿṭiya limā manaʿt, wa lā yanfaʿu dhal-jaddi minkal-jadd.',
    en='None has the right to be worshipped but Allah alone, without partner; His is the dominion and the praise, and He has power over all things. O Allah, none can withhold what You give, none can give what You withhold, and no one’s fortune avails him against You.',
    note='Ḥiṣn al-Muslim notes the first sentence may be said three times.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 844', 'bukhari:844'), sunnah('Ṣaḥīḥ Muslim 593', 'muslim:593'), hisn(67)], tag='Tawḥīd')
add('s-zubayr', title='We worship none but Him', ar=between(68, 'لَا إِلَهَ'), count=1,
    tr='Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa Huwa ʿalā kulli shay’in qadīr. Lā ḥawla wa lā quwwata illā billāh. Lā ilāha illallāhu wa lā naʿbudu illā iyyāh, lahun-niʿmatu wa lahul-faḍlu wa lahuth-thanā’ul-ḥasan. Lā ilāha illallāhu mukhliṣīna lahud-dīna wa law karihal-kāfirūn.',
    en='None has the right to be worshipped but Allah alone, without partner; His is the dominion and the praise, and He has power over all things. There is no might nor power except through Allah. None has the right to be worshipped but Allah, and we worship none but Him. His are all favour, all grace and the most beautiful praise. None has the right to be worshipped but Allah — we devote our religion sincerely to Him, even if the disbelievers dislike it.',
    refs=[sunnah('Ṣaḥīḥ Muslim 594', 'muslim:594'), hisn(68)], tag='Sincerity')
add('t-subhan', title='Subḥānallāh', ar=between(69, 'سُبْحَانَ اللَّهِ', 'سُبْحَانَ اللَّهِ'), count=33,
    tr='Subḥānallāh.', en='Glory be to Allah.', refs=[sunnah('Ṣaḥīḥ Muslim 597', 'muslim:597'), hisn(69)], tag='Glorification')
add('t-hamd', title='Al-ḥamdu lillāh', ar=between(69, 'الْحَمْدُ لِلَّهِ', 'الْحَمْدُ لِلَّهِ'), count=33,
    tr='Al-ḥamdu lillāh.', en='All praise is for Allah.', refs=[sunnah('Ṣaḥīḥ Muslim 597', 'muslim:597'), hisn(69)], tag='Taḥmīd')
add('t-akbar', title='Allāhu akbar', ar=between(69, 'اللَّهُ أَكْبَرُ', 'اللَّهُ أَكْبَرُ'), count=33,
    tr='Allāhu akbar.', en='Allah is the Greatest.', refs=[sunnah('Ṣaḥīḥ Muslim 597', 'muslim:597'), hisn(69)], tag='Takbīr')
add('t-hundred', title='Completing the hundred', ar=between(69, 'لاَ إِلَهَ'), count=1,
    tr='Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa Huwa ʿalā kulli shay’in qadīr.',
    en='None has the right to be worshipped but Allah alone, without partner; His is the dominion and the praise, and He has power over all things. Whoever completes the hundred this way is forgiven, even if his sins are like the foam of the sea.',
    refs=[sunnah('Ṣaḥīḥ Muslim 597', 'muslim:597'), hisn(69)], tag='The hundredth')
add('s-tahlil10', title='Tawḥīd ten times', ar=between(72, 'لاَ إِلَهَ', 'قَدِيرٌ'), count=10,
    tr='Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamd, yuḥyī wa yumītu wa Huwa ʿalā kulli shay’in qadīr.',
    en='None has the right to be worshipped but Allah alone, without partner; His is the dominion and the praise. He gives life and causes death, and He has power over all things.',
    note='After Fajr and Maghrib.', refs=[sunnah('Jāmiʿ at-Tirmidhī 3474', 'tirmidhi:3474'), hisn(72)], tag='Fajr & Maghrib')
add('s-ilman', title='Beneficial knowledge', ar=between(73, 'اللَّهُمَّ', 'مُتَقَبَّلاً'), count=1,
    tr='Allāhumma innī as’aluka ʿilman nāfiʿā, wa rizqan ṭayyibā, wa ʿamalan mutaqabbalā.',
    en='O Allah, I ask You for beneficial knowledge, good provision and accepted deeds.',
    note='After the salām of Fajr.', refs=[sunnah('Sunan Ibn Mājah 925', 'ibnmajah:925'), hisn(73)], tag='Fajr')

# ---------- Before sleep (Ḥiṣn 99–111) ----------
add('z-quls', title='The three Quls, blown into the palms', ar='\n'.join(ITEMS[k]['ar'] for k in ('ikhlas', 'falaq', 'nas')), count=3,
    tr='\n'.join(ITEMS[k]['tr'] for k in ('ikhlas', 'falaq', 'nas')),
    en='Cup your hands, blow lightly into them and recite Al-Ikhlāṣ, Al-Falaq and An-Nās; then wipe over as much of your body as you can, beginning with the head, face and front. Do this three times.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 5017', 'bukhari:5017'), hisn(99)], tag='Protection')
add('z-baqarah', title='Last two verses of Al-Baqarah', ar=between(101, '﴿'), count=1,
    tr='Āmanar-rasūlu bimā unzila ilayhi mir-rabbihī wal-mu’minūn. Kullun āmana billāhi wa malā’ikatihī wa kutubihī wa rusulih, lā nufarriqu bayna aḥadim-mir-rusulih, wa qālū samiʿnā wa aṭaʿnā, ghufrānaka rabbanā wa ilaykal-maṣīr. Lā yukallifullāhu nafsan illā wusʿahā, lahā mā kasabat wa ʿalayhā mak-tasabat. Rabbanā lā tu’ākhidhnā in nasīnā aw akhṭa’nā. Rabbanā wa lā taḥmil ʿalaynā iṣran kamā ḥamaltahū ʿalal-ladhīna min qablinā. Rabbanā wa lā tuḥammilnā mā lā ṭāqata lanā bih, waʿfu ʿannā, waghfir lanā, warḥamnā, anta mawlānā fanṣurnā ʿalal-qawmil-kāfirīn.',
    en='The Messenger and the believers believe in what was sent down to him from his Lord — each believes in Allah, His angels, His books and His messengers, making no distinction between them — and they say: “We hear and obey; Your forgiveness, our Lord, and to You is the return.” Allah burdens no soul beyond its capacity… Our Lord, do not take us to task if we forget or err; do not lay on us a burden like those before us, nor what we cannot bear. Pardon us, forgive us and have mercy on us. You are our Protector, so grant us victory over the disbelievers.',
    note='Whoever recites them at night, they will suffice him.',
    refs=[{'l': 'Qurʾān 2:285–286', 'u': 'https://quran.com/2/285-286'}, sunnah('Ṣaḥīḥ al-Bukhārī 5009', 'bukhari:5009'), hisn(101)], tag='Qurʾān')
add('z-bismika-rabbi', title='In Your name, my Lord', ar=between(102, 'بِاسْمِكَ'), count=1,
    tr='Bismika rabbī waḍaʿtu janbī, wa bika arfaʿuh, fa in amsakta nafsī farḥamhā, wa in arsaltahā faḥfaẓhā bimā taḥfaẓu bihī ʿibādakaṣ-ṣāliḥīn.',
    en='In Your name, my Lord, I lay down my side, and by You I raise it. If You take my soul, have mercy on it; if You release it, protect it as You protect Your righteous servants.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 6320', 'bukhari:6320'), hisn(102)], tag='Lying down')
add('z-khalaqta', title='You created my soul', ar=between(103, 'اللَّهُمَّ'), count=1,
    tr='Allāhumma innaka khalaqta nafsī wa anta tawaffāhā, laka mamātuhā wa maḥyāhā. In aḥyaytahā faḥfaẓhā, wa in amattahā faghfir lahā. Allāhumma innī as’alukal-ʿāfiyah.',
    en='O Allah, You created my soul and You take it; its death and its life belong to You. If You keep it alive, protect it; if You cause it to die, forgive it. O Allah, I ask You for well-being.',
    refs=[sunnah('Ṣaḥīḥ Muslim 2712', 'muslim:2712'), hisn(103)], tag='Well-being')
add('z-qini', title='Protect me from Your punishment', ar=between(104, 'اللَّهُمَّ'), count=3,
    tr='Allāhumma qinī ʿadhābaka yawma tabʿathu ʿibādak.',
    en='O Allah, protect me from Your punishment on the Day You resurrect Your servants.',
    note='Said with the right hand beneath the cheek.', refs=[sunnah('Sunan Abī Dāwūd 5045', 'abudawud:5045'), hisn(104)], tag='The Day of Rising')
add('z-amutu', title='In Your name I die and live', ar=between(105, 'بِاسْمِكَ'), count=1,
    tr='Bismika Allāhumma amūtu wa aḥyā.', en='In Your name, O Allah, I die and I live.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 6324', 'bukhari:6324'), hisn(105)], tag='Sleep')
add('z-tsb-s', title='Subḥānallāh', ar=between(106, 'سُبْحَانَ', 'اللَّهِ'), count=33, tr='Subḥānallāh.', en='Glory be to Allah.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 3705', 'bukhari:3705'), sunnah('Ṣaḥīḥ Muslim 2727', 'muslim:2727'), hisn(106)], tag='Better than a servant')
add('z-tsb-h', title='Al-ḥamdu lillāh', ar=between(106, 'الْحَمْدُ', 'لِلَّهِ'), count=33, tr='Al-ḥamdu lillāh.', en='All praise is for Allah.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 3705', 'bukhari:3705'), hisn(106)], tag='Taḥmīd')
add('z-tsb-a', title='Allāhu akbar', ar=between(106, 'اللَّهُ أَكْبَرُ', 'أَكْبَرُ'), count=34, tr='Allāhu akbar.', en='Allah is the Greatest.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 3705', 'bukhari:3705'), hisn(106)], tag='Thirty-four')
add('z-rabbas', title='Lord of the seven heavens', ar=between(107, 'اللَّهُمَّ'), count=1,
    tr='Allāhumma rabbas-samāwātis-sabʿi wa rabbal-arḍ, wa rabbal-ʿarshil-ʿaẓīm, rabbanā wa rabba kulli shay’, fāliqal-ḥabbi wan-nawā, wa munzilat-tawrāti wal-injīli wal-furqān, aʿūdhu bika min sharri kulli shay’in anta ākhidhum bināṣiyatih. Allāhumma antal-awwalu falaysa qablaka shay’, wa antal-ākhiru falaysa baʿdaka shay’, wa antaẓ-ẓāhiru falaysa fawqaka shay’, wa antal-bāṭinu falaysa dūnaka shay’, iqḍi ʿannad-dayna wa aghninā minal-faqr.',
    en='O Allah, Lord of the seven heavens, the earth and the Mighty Throne, our Lord and Lord of all things, Splitter of the seed and the date-stone, Revealer of the Torah, the Gospel and the Criterion: I seek refuge in You from the evil of everything You hold by the forelock. You are the First — nothing is before You; the Last — nothing is after You; the Most High — nothing is above You; the Most Near — nothing is beyond You. Settle our debts and free us from poverty.',
    refs=[sunnah('Ṣaḥīḥ Muslim 2713', 'muslim:2713'), hisn(107)], tag='Debt and need')
add('z-atamana', title='Who fed us and sheltered us', ar=between(108, 'الْحَمْدُ'), count=1,
    tr='Al-ḥamdu lillāhil-ladhī aṭʿamanā wa saqānā, wa kafānā, wa āwānā, fakam mimman lā kāfiya lahū wa lā mu’wī.',
    en='All praise is for Allah, Who fed us and gave us drink, sufficed us and sheltered us — for how many have none to suffice them and none to shelter them.',
    refs=[sunnah('Ṣaḥīḥ Muslim 2715', 'muslim:2715'), hisn(108)], tag='Gratitude')
add('z-alim', title='Knower of the unseen', ar=between(109, 'اللَّهُمَّ'), count=1,
    tr='Allāhumma ʿālimal-ghaybi wash-shahādah, fāṭiras-samāwāti wal-arḍ, rabba kulli shay’in wa malīkah, ashhadu an lā ilāha illā ant, aʿūdhu bika min sharri nafsī, wa min sharrish-shayṭāni wa shirkih, wa an aqtarifa ʿalā nafsī sū’an aw ajurrahū ilā muslim.',
    en='O Allah, Knower of the unseen and the seen, Originator of the heavens and the earth, Lord and Sovereign of all things: I bear witness that none has the right to be worshipped but You. I seek refuge in You from the evil of my own soul, from the evil of Shayṭān and his call to shirk, and from bringing harm upon myself or upon any Muslim.',
    refs=[sunnah('Sunan Abī Dāwūd 5067', 'abudawud:5067'), hisn(109)], tag='Refuge')
add('z-mulk', title='Sūrat as-Sajdah and Sūrat al-Mulk', ar=clean(H[110]).replace(' ِ،', 'ِ،'), count=1, kind='flag',
    tr='Recite Sūrat as-Sajdah (32) and Sūrat al-Mulk (67).',
    en='The Prophet ﷺ would not sleep until he had recited Alif-Lām-Mīm Tanzīl (as-Sajdah) and Tabārak (al-Mulk).',
    refs=[sunnah('Jāmiʿ at-Tirmidhī 3404', 'tirmidhi:3404'), {'l': 'Read al-Mulk', 'u': 'https://quran.com/67'}, hisn(110)], tag='Recitation')
add('z-aslamtu', title='I submit myself to You', ar=between(111, 'اللَّهُمَّ'), count=1,
    tr='Allāhumma aslamtu nafsī ilayk, wa fawwaḍtu amrī ilayk, wa wajjahtu wajhī ilayk, wa alja’tu ẓahrī ilayk, raghbatan wa rahbatan ilayk. Lā maljā’a wa lā manjā minka illā ilayk. Āmantu bikitābikal-ladhī anzalt, wa binabiyyikal-ladhī arsalt.',
    en='O Allah, I submit myself to You, entrust my affairs to You, turn my face to You and lean my back upon You, in hope of You and in awe of You. There is no refuge and no escape from You except to You. I believe in Your Book which You revealed and in Your Prophet whom You sent.',
    note='Make it the last thing you say, lying on your right side after wuḍūʾ.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 247', 'bukhari:247'), hisn(111)], tag='The last words')

# ---------- Waking, the night, witr ----------
add('w-afani', title='Who restored my soul', ar=between(3, 'الْحَمْدُ'), count=1,
    tr='Al-ḥamdu lillāhil-ladhī ʿāfānī fī jasadī, wa radda ʿalayya rūḥī, wa adhina lī bidhikrih.',
    en='All praise is for Allah, Who granted my body well-being, returned my soul to me and permitted me to remember Him.',
    refs=[sunnah('Jāmiʿ at-Tirmidhī 3401', 'tirmidhi:3401'), hisn(3)], tag='On waking')
add('w-imran', title='Closing verses of Āl ʿImrān', ar=clean(H[4]), count=1, kind='flag', long=True,
    tr='Recite Āl ʿImrān 3:190–200.',
    en='On rising for the night prayer, the Prophet ﷺ looked up at the sky and recited the closing verses of Āl ʿImrān, beginning: “Indeed, in the creation of the heavens and the earth and the alternation of night and day are signs for people of understanding…”',
    refs=[{'l': 'Qurʾān 3:190–200', 'u': 'https://quran.com/3/190-200'}, sunnah('Ṣaḥīḥ al-Bukhārī 4569', 'bukhari:4569'), hisn(4)], tag='Night prayer')
add('n-stir', title='When turning over in the night', ar=between(112, 'لاَ إِلَهَ'), count=1,
    tr='Lā ilāha illallāhul-wāḥidul-qahhār, rabbus-samāwāti wal-arḍi wa mā baynahumal-ʿazīzul-ghaffār.',
    en='None has the right to be worshipped but Allah, the One, the Irresistible, Lord of the heavens and the earth and all between them, the Almighty, the Oft-Forgiving.',
    refs=[hisn(112)], tag='Turning in sleep')
add('n-witr', title='After the witr', ar=between(119, 'سُبْحَانَ', 'القُدُّوسِ'), count=3,
    tr='Subḥānal-malikil-quddūs.', en='Glory be to the King, the Most Holy.',
    note='On the third, raise and draw out the voice, adding: رَبِّ الْمَلاَئِكَةِ وَالرُّوحِ — Lord of the angels and the Spirit.',
    refs=[sunnah('Sunan an-Nasāʾī 1732', 'nasai:1732'), hisn(119)], tag='Witr')

# ---------- The adhān ----------
add('a-repeat', title='Repeat after the muʾadhdhin', ar=between(22, 'لاَ حَوْلَ', 'بِاللَّهِ'), count=1, kind='flag',
    tr='Lā ḥawla wa lā quwwata illā billāh.',
    en='Repeat each phrase of the adhān after the muʾadhdhin — except at “ḥayya ʿalaṣ-ṣalāh” and “ḥayya ʿalal-falāḥ”, where you say: there is no might nor power except through Allah.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 611', 'bukhari:611'), sunnah('Ṣaḥīḥ Muslim 385', 'muslim:385'), hisn(22)], tag='During the call')
add('a-radina', title='Pleased with Allah as Lord', ar=between(23, 'وَأَنَا', 'دِينَاً'), count=1,
    tr='Wa ana ashhadu an lā ilāha illallāhu waḥdahū lā sharīka lah, wa anna Muḥammadan ʿabduhū wa rasūluh. Raḍītu billāhi rabbā, wa bi-Muḥammadin rasūlā, wa bil-islāmi dīnā.',
    en='And I too bear witness that none has the right to be worshipped but Allah alone, without partner, and that Muhammad is His servant and Messenger. I am pleased with Allah as Lord, with Muhammad as Messenger and with Islam as religion.',
    note='Said after the muʾadhdhin’s testimony of faith.', refs=[sunnah('Ṣaḥīḥ Muslim 386', 'muslim:386'), hisn(23)], tag='After the shahādah')
add('a-salawat', title='Ṣalawāt Ibrāhīmiyyah', ar=between(53, 'اللَّهُمَّ'), count=1,
    tr='Allāhumma ṣalli ʿalā Muḥammad, wa ʿalā āli Muḥammad, kamā ṣallayta ʿalā Ibrāhīm, wa ʿalā āli Ibrāhīm, innaka Ḥamīdum-Majīd. Allāhumma bārik ʿalā Muḥammad, wa ʿalā āli Muḥammad, kamā bārakta ʿalā Ibrāhīm, wa ʿalā āli Ibrāhīm, innaka Ḥamīdum-Majīd.',
    en='O Allah, send Your prayers upon Muhammad and the family of Muhammad as You sent them upon Ibrāhīm and the family of Ibrāhīm; You are Praiseworthy, Glorious. O Allah, bless Muhammad and the family of Muhammad as You blessed Ibrāhīm and the family of Ibrāhīm; You are Praiseworthy, Glorious.',
    note='Send ṣalawāt on the Prophet ﷺ once the adhān ends.', refs=[sunnah('Ṣaḥīḥ al-Bukhārī 3370', 'bukhari:3370'), hisn(53), hisn(24)], tag='Blessings on the Prophet ﷺ')
add('a-wasilah', title='Lord of this perfect call', ar=between(25, 'اللَّهُمَّ', 'وَعَدْتَهُ'), count=1,
    tr='Allāhumma rabba hādhihid-daʿwatit-tāmmah, waṣ-ṣalātil-qā’imah, āti Muḥammadanil-wasīlata wal-faḍīlah, wabʿath-hu maqāmam-maḥmūdanil-ladhī waʿadtah.',
    en='O Allah, Lord of this perfect call and of the prayer about to be established, grant Muhammad al-Wasīlah and pre-eminence, and raise him to the praised station You have promised him. His intercession becomes due for whoever says this.',
    note='Then make duʿāʾ for yourself; between the adhān and the iqāmah it is not rejected. The ending “innaka lā tukhliful-mīʿād” is not established in the authentic narrations.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 614', 'bukhari:614'), hisn(25), hisn(26)], tag='Intercession')

# ---------- Everyday ----------
add('d-wudu-pre', title='Before wuḍūʾ', ar=clean(H[12]), count=1, tr='Bismillāh.', en='In the name of Allah.',
    refs=[sunnah('Sunan Abī Dāwūd 101', 'abudawud:101'), hisn(12)], tag='Wuḍūʾ')
add('d-wudu-shahada', title='After wuḍūʾ · testimony', ar=clean(H[13]).rstrip('.'), count=1,
    tr='Ashhadu an lā ilāha illallāhu waḥdahū lā sharīka lah, wa ashhadu anna Muḥammadan ʿabduhū wa rasūluh.',
    en='I bear witness that none has the right to be worshipped but Allah alone, without partner, and I bear witness that Muhammad is His servant and Messenger. The eight gates of Paradise are opened for whoever says it.',
    refs=[sunnah('Ṣaḥīḥ Muslim 234', 'muslim:234'), hisn(13)], tag='Wuḍūʾ')
add('d-wudu-tawwabin', title='After wuḍūʾ · the repentant', ar=clean(H[14]), count=1,
    tr='Allāhummajʿalnī minat-tawwābīna wajʿalnī minal-mutaṭahhirīn.',
    en='O Allah, make me among those who repent often and make me among those who purify themselves.',
    refs=[sunnah('Jāmiʿ at-Tirmidhī 55', 'tirmidhi:55'), hisn(14)], tag='Wuḍūʾ')
add('d-wudu-kaffarah', title='After wuḍūʾ · glorification', ar=clean(H[15]), count=1,
    tr='Subḥānaka Allāhumma wa biḥamdik, ashhadu an lā ilāha illā ant, astaghfiruka wa atūbu ilayk.',
    en='Glory and praise be to You, O Allah. I bear witness that none has the right to be worshipped but You; I seek Your forgiveness and turn to You in repentance.',
    refs=[hisn(15)], tag='Wuḍūʾ')
add('d-out-tawakkul', title='Leaving home', ar=clean(H[16]), count=1,
    tr='Bismillāh, tawakkaltu ʿalallāh, wa lā ḥawla wa lā quwwata illā billāh.',
    en='In the name of Allah; I place my trust in Allah; there is no might nor power except through Allah. It is said to him: you are guided, sufficed and protected.',
    refs=[sunnah('Sunan Abī Dāwūd 5095', 'abudawud:5095'), sunnah('Jāmiʿ at-Tirmidhī 3426', 'tirmidhi:3426'), hisn(16)], tag='Home')
add('d-out-dalal', title='Leaving home · refuge', ar=clean(H[17]), count=1,
    tr='Allāhumma innī aʿūdhu bika an aḍilla aw uḍall, aw azilla aw uzall, aw aẓlima aw uẓlam, aw ajhala aw yujhala ʿalayy.',
    en='O Allah, I seek refuge in You from going astray or being led astray, from slipping or being made to slip, from wronging or being wronged, and from behaving foolishly or being treated foolishly.',
    refs=[sunnah('Sunan Abī Dāwūd 5094', 'abudawud:5094'), hisn(17)], tag='Home')
add('d-in', title='Entering home', ar=between(18, 'بِسْمِ', 'تَوَكَّلْنَا'), count=1,
    tr='Bismillāhi walajnā, wa bismillāhi kharajnā, wa ʿalallāhi rabbinā tawakkalnā.',
    en='In the name of Allah we enter, in the name of Allah we leave, and upon Allah our Lord we rely.',
    note='Then greet your household with salām.', refs=[sunnah('Sunan Abī Dāwūd 5096', 'abudawud:5096'), hisn(18)], tag='Home')
add('d-masjid-in', title='Entering the masjid',
    ar=between(20, 'أَعُوذُ', 'الرَّجِيمِ') + '، ' + between(20, 'بِسْمِ اللَّهِ', 'وَالصَّلَاةُ') + ' ' + between(20, 'وَالسَّلَامُ', 'رَسُولِ اللَّهِ') + '، ' + between(20, 'اللَّهُمَّ افْتَحْ', 'رَحْمَتِكَ'),
    count=1,
    tr='Aʿūdhu billāhil-ʿaẓīm, wa biwajhihil-karīm, wa sulṭānihil-qadīm, minash-shayṭānir-rajīm. Bismillāh, waṣ-ṣalātu was-salāmu ʿalā rasūlillāh. Allāhummaftaḥ lī abwāba raḥmatik.',
    en='I seek refuge in Allah the Magnificent, in His noble Face and His eternal authority, from Shayṭān the outcast. In the name of Allah, and prayers and peace upon the Messenger of Allah. O Allah, open for me the gates of Your mercy.',
    note='Enter with the right foot.', refs=[sunnah('Sunan Abī Dāwūd 466', 'abudawud:466'), sunnah('Ṣaḥīḥ Muslim 713', 'muslim:713'), hisn(20)], tag='Masjid')
add('d-masjid-out', title='Leaving the masjid', ar=between(21, 'بِسْمِ', 'الرَّجِيمِ'), count=1,
    tr='Bismillāh, waṣ-ṣalātu was-salāmu ʿalā rasūlillāh. Allāhumma innī as’aluka min faḍlik. Allāhummaʿṣimnī minash-shayṭānir-rajīm.',
    en='In the name of Allah, and prayers and peace upon the Messenger of Allah. O Allah, I ask You of Your bounty. O Allah, protect me from Shayṭān the outcast.',
    note='Leave with the left foot.', refs=[sunnah('Ṣaḥīḥ Muslim 713', 'muslim:713'), sunnah('Sunan Ibn Mājah 773', 'ibnmajah:773'), hisn(21)], tag='Masjid')

# ---------- Ramaḍān (Ḥiṣn 175–186, Tirmidhī 3513) ----------
_t = json.load(open(os.path.join(SRC, 'tirmidhi-3513.json'), encoding='utf-8'))['hadiths'][0]['text']
_m1 = loose_find(_t, 'اللَّهُمَّ إِنَّكَ'); _m2 = loose_find(_t, 'فَاعْفُ عَنِّي')
QADR_AR = _t[_m1[0]:_m2[1]].strip().replace(' كَرِيمٌ', '')  # 'karīm' is not established (al-Albānī)
add('r-moon', title='On sighting the new crescent', ar=between(175, 'اللَّهُ أَكْبَرُ'), count=1,
    tr='Allāhu akbar. Allāhumma ahillahū ʿalaynā bil-amni wal-īmān, was-salāmati wal-islām, wat-tawfīqi limā tuḥibbu rabbanā wa tarḍā. Rabbunā wa rabbukallāh.',
    en='Allah is the Greatest. O Allah, bring it upon us with security and faith, safety and Islam, and success in what You love and are pleased with, our Lord. Our Lord and your Lord is Allah.',
    refs=[hisn(175)], tag='The new month')
add('r-iftar', title='On breaking the fast', ar=between(176, 'ذَهَبَ'), count=1,
    tr='Dhahabaẓ-ẓama’u wabtallatil-ʿurūq, wa thabatal-ajru in shā’ Allāh.',
    en='The thirst has gone, the veins are moistened, and the reward is certain, if Allah wills.',
    refs=[sunnah('Sunan Abī Dāwūd 2357', 'abudawud:2357'), hisn(176)], tag='Ifṭār')
add('r-iftar2', title='Asking by His mercy', ar=between(177, 'اللَّهُمَّ'), count=1,
    tr='Allāhumma innī as’aluka biraḥmatikal-latī wasiʿat kulla shay’in an taghfira lī.',
    en='O Allah, I ask You by Your mercy, which encompasses all things, to forgive me.',
    refs=[sunnah('Sunan Ibn Mājah 1753', 'ibnmajah:1753'), hisn(177)], tag='Ifṭār')
add('r-host', title='For those who host your ifṭār', ar=between(184, 'أَفْطَرَ'), count=1,
    tr='Afṭara ʿindakumuṣ-ṣā’imūn, wa akala ṭaʿāmakumul-abrār, wa ṣallat ʿalaykumul-malā’ikah.',
    en='May fasting people break their fast with you, the righteous eat your food, and the angels pray for you.',
    refs=[sunnah('Sunan Abī Dāwūd 3854', 'abudawud:3854'), hisn(184)], tag='Hospitality')
add('r-rude', title='When provoked while fasting', ar=between(186, 'إِنِّي'), count=1,
    tr='Innī ṣā’im, innī ṣā’im.', en='I am fasting, I am fasting.',
    note='Said when someone insults or argues with you while you fast.',
    refs=[sunnah('Ṣaḥīḥ al-Bukhārī 1894', 'bukhari:1894'), hisn(186)], tag='Patience')
add('r-qadr', title='Laylat al-Qadr', ar=QADR_AR, count=1,
    tr='Allāhumma innaka ʿafuwwun tuḥibbul-ʿafwa faʿfu ʿannī.',
    en='O Allah, You are Pardoning and You love to pardon, so pardon me.',
    note='Taught for the night of Qadr. Seek it in the odd nights of the last ten. The word karīm, found in some printed copies, is not established in the authentic narrations.',
    refs=[sunnah('Jāmiʿ at-Tirmidhī 3513', 'tirmidhi:3513')], tag='The last ten nights')

# ---------- tasbīḥ presets (Arabic taken from records above) ----------
def first_clause(uid, upto):
    a = ITEMS[uid]['ar']; m = loose_find(a, upto); assert m, (uid, upto)
    return a[:m[1]]

TASBIH = [
    {'id': 'subhanallah', 'ar': ITEMS['t-subhan']['ar'], 'tr': 'Subḥānallāh', 'en': 'Glory be to Allah', 'n': 33},
    {'id': 'alhamdulillah', 'ar': ITEMS['t-hamd']['ar'], 'tr': 'Al-ḥamdu lillāh', 'en': 'All praise is for Allah', 'n': 33},
    {'id': 'allahuakbar', 'ar': ITEMS['t-akbar']['ar'], 'tr': 'Allāhu akbar', 'en': 'Allah is the Greatest', 'n': 33},
    {'id': 'lailaha', 'ar': first_clause('tahlil', 'إِلَّا اللَّهُ'), 'tr': 'Lā ilāha illallāh', 'en': 'None is worthy of worship but Allah', 'n': 100},
    {'id': 'astaghfirullah', 'ar': ITEMS['s-istighfar']['ar'], 'tr': 'Astaghfirullāh', 'en': 'I seek Allah’s forgiveness', 'n': 100},
    {'id': 'subhanbihamdih', 'ar': ITEMS['subhan']['ar'], 'tr': 'Subḥānallāhi wa biḥamdih', 'en': 'Glory and praise be to Allah', 'n': 100},
    {'id': 'hawqala', 'ar': ITEMS['hawqala']['ar'], 'tr': 'Lā ḥawla wa lā quwwata illā billāh', 'en': 'No might nor power except through Allah', 'n': 100},
    {'id': 'salawat', 'ar': first_clause('a-salawat', 'مُحَمَّدٍ'), 'tr': 'Allāhumma ṣalli ʿalā Muḥammad', 'en': 'O Allah, send prayers upon Muhammad', 'n': 100},
]

# ---------- collections ----------
def S(uid, **kw):
    kw['u'] = uid
    return kw

SEQ = ['kursi', 'ikhlas', 'falaq', 'nas', 'v:kingdom', 'v:byyou', 'sayyid', 'health', 'afiyah', 'knowledge', 'bismillah', 'raditu', 'hayyu', 'tahlil', 'v:*', 'subhan']
def session(mode):
    out = []
    for p in SEQ:
        if p == 'v:*':
            out.append(S(mode + ':' + ('beneficial' if mode == 'morning' else 'perfectwords')))
        elif p.startswith('v:'):
            out.append(S(mode + ':' + p[2:]))
        else:
            out.append(S(p))
    return out

COLLECTIONS = [
    {'id': 'morning', 'title': 'Morning', 'ar': 'أذكار الصباح', 'sub': 'After Fajr until sunrise', 'hue': 'dawn', 'icon': 'sunrise', 'track': True, 'items': session('morning')},
    {'id': 'evening', 'title': 'Evening', 'ar': 'أذكار المساء', 'sub': 'After ʿAṣr until Maghrib', 'hue': 'dusk', 'icon': 'sunset', 'track': True, 'items': session('evening')},
    {'id': 'salah', 'title': 'After Ṣalāh', 'ar': 'أذكار بعد الصلاة', 'sub': 'Following each obligatory prayer', 'hue': 'jade', 'icon': 'mosque', 'track': True, 'perPrayer': True,
     'items': [S('s-istighfar'), S('s-salam'), S('s-lamani'), S('s-zubayr'), S('t-subhan'), S('t-hamd'), S('t-akbar'), S('t-hundred'),
               S('ikhlas', n=1), S('falaq', n=1), S('nas', n=1), S('kursi'), S('s-tahlil10', only=['fajr', 'maghrib']), S('s-ilman', only=['fajr'])]},
    {'id': 'sleep', 'title': 'Before Sleep', 'ar': 'أذكار النوم', 'sub': 'As you lie down to rest', 'hue': 'night', 'icon': 'bed', 'track': True,
     'items': [S('z-quls'), S('kursi'), S('z-baqarah'), S('z-bismika-rabbi'), S('z-khalaqta'), S('z-qini'), S('z-amutu'), S('z-tsb-s'), S('z-tsb-h'), S('z-tsb-a'),
               S('z-rabbas'), S('z-atamana'), S('z-alim'), S('z-mulk'), S('z-aslamtu')]},
    {'id': 'night', 'title': 'The Night', 'ar': 'قيام الليل', 'sub': 'Waking in the night · after witr', 'hue': 'indigo', 'icon': 'moon', 'track': False,
     'items': [S('nightdhikr'), S('n-stir'), S('w-imran'), S('n-witr')]},
    {'id': 'waking', 'title': 'Waking Up', 'ar': 'أذكار الاستيقاظ', 'sub': 'The first words of the day', 'hue': 'gold', 'icon': 'sun', 'track': True,
     'items': [S('wake'), S('w-afani'), S('w-imran')]},
    {'id': 'adhan', 'title': 'The Adhān', 'ar': 'أذكار الأذان', 'sub': 'Answering the call to prayer', 'hue': 'teal', 'icon': 'bell', 'track': False,
     'items': [S('a-repeat'), S('a-radina'), S('a-salawat'), S('a-wasilah')]},
    {'id': 'ramadan', 'title': 'Ramaḍān', 'ar': 'أدعية رمضان', 'sub': 'The crescent · ifṭār · the last ten', 'hue': 'gold', 'icon': 'moonstar', 'track': False,
     'items': [S('r-moon'), S('r-iftar'), S('r-host'), S('r-rude'), S('r-qadr')]},
    {'id': 'daily', 'title': 'Everyday', 'ar': 'أذكار اليوم', 'sub': 'Wuḍūʾ · home · masjid', 'hue': 'sand', 'icon': 'compass', 'track': False,
     'items': [S('d-wudu-pre'), S('d-wudu-shahada'), S('d-wudu-tawwabin'), S('d-wudu-kaffarah'), S('d-out-tawakkul'), S('d-out-dalal'), S('d-in'), S('d-masjid-in'), S('d-masjid-out')]},
    {'id': 'inprayer', 'title': 'Within Ṣalāh', 'ar': 'أذكار الصلاة', 'sub': 'Opening · rukūʿ · sujūd · tashahhud', 'hue': 'jade', 'icon': 'mosque', 'track': False,
     'items': [S('p-open-baid'), S('p-open-subhanaka'), S('p-fatiha'), S('p-ruku'), S('p-subhanaka'), S('p-subbuh'), S('p-sami'), S('p-rabbana'), S('p-mil'), S('p-sujud'), S('p-dhanbi'), S('p-ridaka'),
               S('p-jalsah'), S('p-jalsah-long'), S('p-tashahhud'), S('a-salawat'), S('p-refuge'), S('p-zalamtu'), S('p-ainni')]},
    {'id': 'hardship', 'title': 'Worry & Distress', 'ar': 'الهم والكرب', 'sub': 'Grief · distress · difficulty · anger', 'hue': 'rose', 'icon': 'heart', 'track': False,
     'items': [S('h-servant'), S('h-hamm'), S('h-karb'), S('h-rahmah'), S('h-yunus'), S('h-rabbi'), S('h-sahl'), S('h-anger')]},
    {'id': 'quick', 'title': 'Short Dhikr', 'ar': 'أذكار مطلقة', 'sub': 'Light on the tongue, any time', 'hue': 'rose', 'icon': 'spark', 'track': False,
     'items': [S('twoheavy'), S('hawqala'), S('daily100')]},
]

for c in COLLECTIONS:
    for e in c['items']:
        assert e['u'] in ITEMS, e['u']

# ---------- Qurʾān passages: Uthmani text (Madani Muṣḥaf), Bismillah as a header, numbered āyāt ----------
Q = {}
for ch in (1, 2, 3, 13, 112, 113, 114):
    for v in json.load(open(os.path.join(SRC, 'quran-%d.json' % ch), encoding='utf-8'))['verses']:
        Q[v['verse_key']] = v['text_uthmani'].strip()
BASMALA = Q['1:1']
AR_DIG = '٠١٢٣٤٥٦٧٨٩'
def anum(n): return ''.join(AR_DIG[int(x)] for x in str(n))
TRANS = {}
_tp = os.path.join(SRC, 'quran-translation.json')  # optional licensed translation: {"2:255": "...", ...}
if os.path.exists(_tp): TRANS = json.load(open(_tp, encoding='utf-8'))
def seg(sura, a, b, bsm): return {'s': sura, 'bsm': bsm, 'v': [[i, Q['%d:%d' % (sura, i)]] for i in range(a, b + 1)]}
def flat(segs):
    out = []
    for g in segs:
        if g['bsm']: out.append(BASMALA)
        out.append(' '.join(t + ' ۝' + anum(i) for i, t in g['v']))
    return chr(10).join(out)
def translation(segs):
    keys = ['%d:%d' % (g['s'], i) for g in segs for i, _ in g['v']]
    if not TRANS or not all(k in TRANS for k in keys): return None
    if len(keys) == 1: return TRANS[keys[0]].strip()
    # each sūrah opens with the basmalah, as in the Arabic: The Clear Quran's own rendering of it (1:1)
    out = []
    for g in segs:
        if g['bsm'] and '1:1' in TRANS: out.append(TRANS['1:1'].strip())
        out += ['(%d) %s' % (i, TRANS['%d:%d' % (g['s'], i)].strip()) for i, _ in g['v']]
    return chr(10).join(out)
QMAP = {'p-fatiha': [seg(1, 1, 7, False)], 'kursi': [seg(2, 255, 255, False)], 'ikhlas': [seg(112, 1, 4, True)], 'falaq': [seg(113, 1, 5, True)], 'nas': [seg(114, 1, 6, True)],
        'z-baqarah': [seg(2, 285, 286, False)], 'w-imran': [seg(3, 190, 200, False)]}
QMAP['z-quls'] = QMAP['ikhlas'] + QMAP['falaq'] + QMAP['nas']
for k, segs in QMAP.items():
    it = ITEMS[k]; it['qs'] = segs; it['ar'] = flat(segs); it['quran'] = True
    t = translation(segs)
    if t:
        if k == 'z-quls': it['note'] = it['en']
        it['en'] = t
for it in ITEMS.values():
    if it.get('tr'): it['tr'] = it['tr'].replace('Bismillāhir-Raḥmānir-Raḥīm. ', 'Bismillāhir-Raḥmānir-Raḥīm.' + chr(10))
# ---------- transliteration of Qurʾān passages: numbered by āyah, like the Arabic and the translation ----------
IMRAN_TR = [   # 3:190–200, in the app's transliteration style
    'Inna fī khalqis-samāwāti wal-arḍi wakhtilāfil-layli wan-nahāri la’āyātil li’ulil-albāb.',
    'Alladhīna yadhkurūnallāha qiyāmaw-wa quʿūdaw-wa ʿalā junūbihim wa yatafakkarūna fī khalqis-samāwāti wal-arḍ, rabbanā mā khalaqta hādhā bāṭilā, subḥānaka fa qinā ʿadhāban-nār.',
    'Rabbanā innaka man tudkhilin-nāra faqad akhzaytah, wa mā liẓ-ẓālimīna min anṣār.',
    'Rabbanā innanā samiʿnā munādiyay-yunādī lil-īmāni an āminū birabbikum fa’āmannā, rabbanā faghfir lanā dhunūbanā wa kaffir ʿannā sayyi’ātinā wa tawaffanā maʿal-abrār.',
    'Rabbanā wa ātinā mā waʿattanā ʿalā rusulika wa lā tukhzinā yawmal-qiyāmah, innaka lā tukhliful-mīʿād.',
    'Fastajāba lahum rabbuhum annī lā uḍīʿu ʿamala ʿāmilim-minkum min dhakarin aw unthā, baʿḍukum mim baʿḍ, falladhīna hājarū wa ukhrijū min diyārihim wa ūdhū fī sabīlī wa qātalū wa qutilū la’ukaffiranna ʿanhum sayyi’ātihim wa la’udkhilannahum jannātin tajrī min taḥtihal-anhāru thawābam-min ʿindillāh, wallāhu ʿindahū ḥusnuth-thawāb.',
    'Lā yaghurrannaka taqallubul-ladhīna kafarū fil-bilād.',
    'Matāʿun qalīlun thumma ma’wāhum jahannam, wa bi’sal-mihād.',
    'Lākinil-ladhīnat-taqaw rabbahum lahum jannātun tajrī min taḥtihal-anhāru khālidīna fīhā nuzulam-min ʿindillāh, wa mā ʿindallāhi khayrul-lil-abrār.',
    'Wa inna min ahlil-kitābi lamay-yu’minu billāhi wa mā unzila ilaykum wa mā unzila ilayhim khāshiʿīna lillāhi lā yashtarūna bi’āyātillāhi thamanan qalīlā, ulā’ika lahum ajruhum ʿinda rabbihim, innallāha sarīʿul-ḥisāb.',
    'Yā ayyuhal-ladhīna āmanuṣ-birū wa ṣābirū wa rābiṭū wattaqullāha laʿallakum tufliḥūn.',
]
QSPLIT = {'z-baqarah': ['Lā yukallifullāhu']}   # where an āyah begins mid-sentence group
def number_tr(uid, it):
    segs, tr = it['qs'], it.get('tr') or ''
    if uid == 'w-imran': verses = [IMRAN_TR]
    else:
        lines = [l for l in tr.split(chr(10)) if l.strip() and l.strip() != 'Bismillāhir-Raḥmānir-Raḥīm.']
        assert len(lines) == len(segs), (uid, len(lines), len(segs))
        verses = []
        for g, line in zip(segs, lines):
            if len(g['v']) == 1: parts = [line.strip()]
            elif uid in QSPLIT:
                parts, rest = [], line
                for m in QSPLIT[uid]: i = rest.index(m); parts.append(rest[:i].strip()); rest = rest[i:]
                parts.append(rest.strip())
            else:
                parts = [x.strip() + '.' for x in line.rstrip('.').split('. ')]
            if not g['bsm'] and g['s'] == 1: parts = ['Bismillāhir-Raḥmānir-Raḥīm.'] + parts   # al-Fātiḥah counts the basmalah as its first āyah
            assert len(parts) == len(g['v']), (uid, g['s'], len(parts), len(g['v']), parts)
            verses.append(parts)
    out = []
    for g, parts in zip(segs, verses):
        if g['bsm']: out.append('Bismillāhir-Raḥmānir-Raḥīm.')
        out.append(parts[0] if len(g['v']) == 1 and len(segs) == 1 else chr(10).join('(%d) %s' % (v[0], t) for v, t in zip(g['v'], parts)))
    return chr(10).join(out)
for uid, it in ITEMS.items():
    if it.get('qs'):
        if uid == 'p-fatiha': it['tr'] = it['tr'].replace('Bismillāhir-Raḥmānir-Raḥīm.' + chr(10), '')
        it['tr'] = number_tr(uid, it)

_w = Q['13:28']; _m = loose_find(_w, 'أَلَا بِذِكْرِ')
WELCOME = {'ar': _w[_m[0]:].strip() if _m else _w, 'ref': '13:28'}

# ---------- recitation length, for counting on the fingers at a natural pace ----------
# letters spoken (no ḥarakāt, no āyah numbers). The app turns this into time with a rate calibrated from 104
# measured recordings (tools/src/audio-durations.json): about 4.8 letters a second at the reciters' teaching pace.
def letters(t): return len(re.findall('[ء-ي]', re.sub('[ً-ٰٟ۝٠-٩]', '', t)))
for it in ITEMS.values(): it['lt'] = letters(it['ar'])


# ---------- house style: no em dashes in any displayed English ----------
def tidy(x):
    if not isinstance(x, str): return x
    x = x.replace(' — ', ', ').replace(' —', ',').replace('— ', '').replace('—', ', ')
    return x.replace(' – ', ' to ')
for it in ITEMS.values():
    for f in ('title', 'tr', 'en', 'note', 'tag'):
        if f in it: it[f] = tidy(it[f])
for c in COLLECTIONS:
    c['title'] = tidy(c['title']); c['sub'] = tidy(c['sub'])
for t in TASBIH:
    t['en'] = tidy(t['en']); t['tr'] = tidy(t['tr'])

# ---------- recited audio (optional download in the app) ----------
# Qurʾān passages: verse by verse (Mishary al-ʿAfāsī). Other adhkār: the Ḥiṣn al-Muslim recording for that number,
# kept only when its text is the same dhikr (so an item never plays a longer or different recording).
def _bare(t):
    return re.sub(r'[^ء-ي]', '', MARKS.sub('', t).replace('ٱ', 'ا').replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ى', 'ي').replace('ة', 'ه'))
import difflib
HISN_OF = {'wake': 1, 'nightdhikr': 2, 'daily100': 93}
NO_PART = {'evening:kingdom', 'evening:byyou', 'a-wasilah'}   # morning wording, or an addition the app leaves out
def _spoken(t):
    """the words of a Ḥiṣn entry without its instructions: ((text)) (three times) -> text"""
    t = t.replace('((', '').replace('))', '')
    inner = re.findall('(.*?)', t)
    if inner: return ' '.join(inner)
    u = re.sub(r'\([^()]*\)', '', t).strip()
    return u if len(u) > 10 else t.replace('(', '').replace(')', '')
AUDIO_MISS = []; AUDIO_LOG = []
for uid, it in ITEMS.items():
    if it.get('qs'):
        it['au'] = {'q': [x for seg in it['qs'] for x in ([[1, 1]] if seg.get('bsm') else []) + [[seg['s'], v[0]] for v in seg['v']]]}
        continue
    hid = next((int(m.group(1)) for r in it.get('refs', []) for m in [re.search(r'hisn:(\d+)', r.get('u', ''))] if m), None)
    if hid is None: hid = HISN_OF.get(uid)   # the same dhikr in Ḥiṣn al-Muslim, for items referenced elsewhere
    if hid is None: continue
    if hid not in H: AUDIO_MISS.append(hid); continue
    a_, b_ = _bare(it['ar']), _bare(_spoken(H[hid]))
    _r = difflib.SequenceMatcher(None, a_, b_).ratio() if a_ and b_ else 0
    AUDIO_LOG.append((uid, hid, round(_r, 3), round(len(a_) / max(1, len(b_)), 2)))
    if a_ and b_ and .92 < len(a_) / len(b_) < 1.08 and _r > .9:
        it['au'] = {'h': hid}
    # a phrase that is only part of a longer entry gets no audio: the recording must be exactly what is on screen
_own = os.path.join(ROOT, 'web', 'audio')
for uid, it in ITEMS.items():
    f = uid.replace(':', '-') + '.mp3'
    if os.path.exists(os.path.join(_own, f)): it['au'] = {'own': f}
for _l in sorted(AUDIO_LOG, key=lambda x: x[2]): print('  au', *_l) if os.environ.get('AUDIO_LOG') else None
print('audio: %d items, missing Hisn texts for %s' % (sum(1 for i in ITEMS.values() if 'au' in i), sorted(set(AUDIO_MISS))))

# ---------- translations: verbatim from sunnah.com (Ḥiṣn al-Muslim) ----------
# Items whose Arabic is the Ḥiṣn entry word for word take its translation and transliteration whole; items that are
# part of an entry take a verbatim slice; the evening forms follow the book's own footnotes. Only footnote numbers and
# counting instructions (shown separately in the app) are removed.
HEN = json.load(open(os.path.join(SRC, 'hisn-en.json'), encoding='utf-8'))
def hclean(t):
    t = re.sub(r'\s*\[[^\]]*\]', '', t)                                    # [Recite three times ...]
    t = re.sub(r'\s*\([^()]*\b(?:[Rr]ecite|times)\b[^()]*\)\.?', '', t)    # (Recite one hundred times in Arabic)
    t = re.sub(r'(?<=[A-Za-z.,;:!?\'"’])\d{1,2}(?=\s|$|[.,;])', '', t)  # footnote numbers: "outcast.1"
    t = re.sub(r'(?<=[a-z]) \d(?= [a-z])', '', t)                          # "a new day 1 and"
    t = t.replace(' ,', ',').replace(' .', '.').replace('[', '').replace(']', '')
    return re.sub(r'\s+', ' ', t).strip()
def hslice(n, a=None, b=None):
    t = hclean(HEN[str(n)]['en'])
    i = t.index(a) if a else 0
    j = t.index(b, i) + len(b) if b else len(t)
    out = t[i:j].strip()
    out = out[0].upper() + out[1:]
    return out if out[-1] in '.!?”"' else out + '.'
EVE77_1 = "We have ended another day and with it, all dominion is Allah's."   # sunnah.com hisn:77, footnote 1
EVE77_2 = "I ask You for the good things of this night and of the nights that come after it and I seek refuge in You from the evil of this night and of the nights that come after it."   # footnote 2
TR_SPEC = {
    's-istighfar': (66, 'I seek the forgiveness of Allah', 'of Allah'), 's-salam': (66, 'O Allah, You are Peace', None),
    't-subhan': (69, 'Glory is to Allah', 'Glory is to Allah'), 't-hamd': (69, 'praise is to Allah', 'praise is to Allah'),
    't-akbar': (69, 'Allah is the Most Great', 'Allah is the Most Great'), 't-hundred': (69, 'None has the right', None),
    'z-tsb-s': (106, 'Glory is to Allah', 'Glory is to Allah'), 'z-tsb-h': (106, 'Praise is to Allah', 'Praise is to Allah'), 'z-tsb-a': (106, 'Allah is the Most Great', 'Allah is the Most Great'),
    'a-repeat': (22, None, None), 'a-radina': (23, 'I bear witness', 'my religion.'), 'a-wasilah': (25, 'O Allah', 'promised him'),
    'd-in': (18, 'In the Name of Allah we enter', 'we depend'), 'd-masjid-in': (20, None, None), 'd-masjid-out': (21, None, None),
    'morning:byyou': (78, 'O Allah, by You we enter the morning', 'Final Return.'), 'evening:byyou': (78, 'O Allah, You bring us the end of the day', 'our fate.'),
    'n-witr': (119, 'Glory is to the King, the Holy.', 'the Holy.'), 'wake': (1, None, None), 'nightdhikr': (2, None, None), 'daily100': (93, None, None),
    'hawqala': (260, 'There is no power and no might except by Allah', 'except by Allah'),
}
TR_DONE = []
for uid, it in ITEMS.items():
    if it.get('qs'): continue
    if uid == 'evening:kingdom':
        it['en'] = ' '.join([EVE77_1, hslice(77, 'Praise is to Allah.', 'all things.'), 'My Lord, ' + EVE77_2, hslice(77, 'My Lord, I seek refuge in You from laziness', 'grave.')]); TR_DONE.append(uid); continue
    if uid == 'twoheavy':   # the app's order follows al-Bukhārī 6406; each phrase is sunnah.com's own wording
        it['en'] = hslice(256, 'Glorified is Allah the Most Great', 'the Most Great') + ', ' + hslice(256, 'Glorified is Allah and praised is He', 'praised is He').lower()[0] + hslice(256, 'Glorified is Allah and praised is He', 'praised is He')[1:] + '.'; TR_DONE.append(uid); continue
    if uid == 'r-qadr':
        q = json.load(open(os.path.join(SRC, 'hadith', 'eng-tirmidhi-3513.json'), encoding='utf-8'))['hadiths'][0]['text']
        q = q[q.index('O Allah, indeed You are Pardoning'):]; q = q[:q.index('pardon me') + len('pardon me')]
        it['en'] = q.replace('[Generous,] ', '') + '.'; TR_DONE.append(uid); continue
    if uid in TR_SPEC:
        n, a_, b_ = TR_SPEC[uid]; it['en'] = hslice(n, a_, b_); TR_DONE.append(uid); continue
    if it.get('au', {}).get('h'):
        h = HEN.get(str(it['au']['h']))
        if h and h['en']:
            it['en'] = hclean(h['en'])
            if h['tr'] and h['tr'] != '--': it['tr'] = re.sub(r'\s+', ' ', h['tr']).strip().replace('`', 'ʿ')   # sunnah.com writes ʿayn as a backtick
            TR_DONE.append(uid)
# the Tracker's phrases take the same sunnah.com wording
TSB_EN = {'subhanallah': (69, 'Glory is to Allah', 'Glory is to Allah'), 'alhamdulillah': (106, 'Praise is to Allah', 'Praise is to Allah'), 'allahuakbar': (69, 'Allah is the Most Great', 'Allah is the Most Great'),
          'lailaha': (264, 'There is none worthy of worship but Allah', 'but Allah'), 'astaghfirullah': (66, 'I seek the forgiveness of Allah', 'of Allah'), 'subhanbihamdih': (91, None, None),
          'hawqala': (260, 'There is no power and no might except by Allah', 'except by Allah'), 'salawat': (53, 'O Allah, bestow Your favor on Muhammad', 'on Muhammad')}
for t in TASBIH:
    if t['id'] in TSB_EN: n, a_, b_ = TSB_EN[t['id']]; t['en'] = hslice(n, a_, b_)
for uid in TR_DONE:
    ITEMS[uid]['en'] = tidy(ITEMS[uid]['en'])
print('translations from sunnah.com: %d items; own wording left: %s' % (len(TR_DONE), sorted(k for k, v in ITEMS.items() if k not in TR_DONE and not v.get('qs') and v.get('en'))))

# the recited length of each text, from the measured recordings (tools/src/audio-durations.json): the Qurʾān verse by verse,
# a Ḥiṣn entry less the silence around it. Kept only when the pace is plausible for one recitation (2.4 to 7 letters a second).
_DUR = json.load(open(os.path.join(SRC, 'audio-durations.json'), encoding='utf-8'))
for uid, it in ITEMS.items():
    a = it.get('au') or {}; rd = None
    if a.get('q'): rd = sum(_DUR.get('q%03d%03d' % (x[0], x[1]), 0) for x in a['q'])
    elif a.get('h') and ('h%d' % a['h']) in _DUR: d = _DUR['h%d' % a['h']]; rd = d - min(3.0, d * .25)
    if rd and it.get('lt') and 2.4 <= it['lt'] / rd <= 7: it['rd'] = round(rd, 1)
# the app reads one thing from meta: the size of every recording, so it can say exactly how much a download is.
# Provenance notes belong in the README, not in the shipped data.
meta = {'ausz': json.load(open(os.path.join(SRC, 'audio-sizes.json'), encoding='utf-8'))}
data = {'items': ITEMS, 'collections': COLLECTIONS, 'tasbih': TASBIH, 'welcome': WELCOME, 'basmala': BASMALA, 'meta': meta}
js = '/* Generated by tools/build_content.py — do not edit by hand. */\nwindow.DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(OUT, 'w', encoding='utf-8').write(js)
print('items', len(ITEMS), 'collections', len(COLLECTIONS), 'bytes', len(js.encode('utf-8')))
