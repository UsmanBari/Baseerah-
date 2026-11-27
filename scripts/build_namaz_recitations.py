"""Build data/namaz/recitations.json: what is said in each part of namaz.

Two kinds of text, kept apart on purpose:

1. QURAN (Al-Fatihah, Bismillah, Al-Ikhlas, Ibrahim 14:40-41) is never typed
   here. It is copied from the app's own sourced Quran files in data/surahs/
   (Arabic: Tanzil; Urdu: Muhammad Junagarhi; English: Saheeh International,
   via QuranEnc). Footnote markers are removed.

2. ADHKAR from the Sunnah (Takbeer, Thana, Ta'awwudh, tasbeeh, Tashahhud,
   Durood Ibrahimi, Salam) are written below in the common Hanafi form used
   in Pakistan, with full harakat, Urdu and English meaning, and the hadith
   reference. These were prepared for Baseerah and should be checked once
   by a scholar; the app shows the reference so anyone can verify.

Run after editing ADHKAR or STEPS:  python scripts/build_namaz_recitations.py
"""
import json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

ADHKAR = {
    "takbeer": {
        "titleEn": "Takbeer", "titleUr": "تکبیر",
        "ar": "اللَّهُ أَكْبَرُ",
        "ur": "اللہ سب سے بڑا ہے۔",
        "en": "Allah is the Greatest.",
        "ref": "Said when starting the prayer and when moving between positions (Bukhari 789)",
    },
    "thana": {
        "titleEn": "Thana", "titleUr": "ثناء",
        "ar": "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَىٰ جَدُّكَ، وَلَا إِلَٰهَ غَيْرُكَ",
        "ur": "اے اللہ! تو پاک ہے اور تیری ہی حمد ہے، تیرا نام بہت برکت والا ہے، تیری شان بہت بلند ہے، اور تیرے سوا کوئی معبود نہیں۔",
        "en": "Glory be to You, O Allah, and all praise is Yours. Blessed is Your name, exalted is Your majesty, and there is no god but You.",
        "ref": "Abu Dawud 775, Tirmidhi 242",
        "note": "Said quietly, once, after the first Takbeer.",
    },
    "taawwudh": {
        "titleEn": "Ta'awwudh", "titleUr": "تعوذ",
        "ar": "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
        "ur": "میں شیطان مردود سے اللہ کی پناہ مانگتا ہوں۔",
        "en": "I seek refuge in Allah from Satan, the rejected.",
        "ref": "Based on Quran 16:98",
        "note": "Said quietly in the first rak'ah, before Al-Fatihah.",
    },
    "aameen": {
        "titleEn": "Aameen", "titleUr": "آمین",
        "ar": "آمِين",
        "ur": "اے اللہ! قبول فرما۔",
        "en": "O Allah, accept.",
        "ref": "Bukhari 780",
        "note": "Said after finishing Al-Fatihah.",
    },
    "ruku": {
        "titleEn": "Tasbeeh in Ruku", "titleUr": "رکوع کی تسبیح",
        "ar": "سُبْحَانَ رَبِّيَ الْعَظِيمِ",
        "ur": "پاک ہے میرا رب جو بڑی عظمت والا ہے۔",
        "en": "Glory be to my Lord, the Most Great.",
        "repeat": 3,
        "ref": "Muslim 772, Abu Dawud 869",
    },
    "tasmee": {
        "titleEn": "Rising from Ruku", "titleUr": "رکوع سے اٹھتے ہوئے",
        "ar": "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ",
        "ur": "اللہ نے اُس کی سن لی جس نے اُس کی تعریف کی۔",
        "en": "Allah hears the one who praises Him.",
        "ref": "Bukhari 789",
        "note": "Said while rising (the imam, or when praying alone).",
    },
    "tahmeed": {
        "titleEn": "Standing after Ruku", "titleUr": "قومہ",
        "ar": "رَبَّنَا لَكَ الْحَمْدُ",
        "ur": "اے ہمارے رب! سب تعریفیں تیرے ہی لیے ہیں۔",
        "en": "Our Lord, all praise is Yours.",
        "ref": "Bukhari 722, 789",
        "note": "Said once standing straight.",
    },
    "sajdah": {
        "titleEn": "Tasbeeh in Sajdah", "titleUr": "سجدے کی تسبیح",
        "ar": "سُبْحَانَ رَبِّيَ الْأَعْلَىٰ",
        "ur": "پاک ہے میرا رب جو سب سے بلند ہے۔",
        "en": "Glory be to my Lord, the Most High.",
        "repeat": 3,
        "ref": "Muslim 772, Abu Dawud 869",
        "note": "Each rak'ah has two sajdahs; say this in both.",
    },
    "jalsa": {
        "titleEn": "Between the two Sajdahs", "titleUr": "دو سجدوں کے درمیان",
        "ar": "رَبِّ اغْفِرْ لِي",
        "ur": "اے میرے رب! مجھے بخش دے۔",
        "en": "My Lord, forgive me.",
        "ref": "Abu Dawud 874, Ibn Majah 897",
        "note": "Sit up briefly between the two sajdahs.",
    },
    "tashahhud": {
        "titleEn": "Tashahhud (Attahiyyat)", "titleUr": "تشہد (التحیات)",
        "ar": "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَىٰ عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
        "ur": "تمام قولی، بدنی اور مالی عبادتیں اللہ ہی کے لیے ہیں۔ اے نبی! آپ پر سلام ہو اور اللہ کی رحمت اور اس کی برکتیں۔ ہم پر اور اللہ کے نیک بندوں پر سلام ہو۔ میں گواہی دیتا ہوں کہ اللہ کے سوا کوئی معبود نہیں، اور میں گواہی دیتا ہوں کہ محمد ﷺ اس کے بندے اور رسول ہیں۔",
        "en": "All greetings, prayers and good things are for Allah. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and Messenger.",
        "ref": "Bukhari 831, Muslim 402 (narrated by Ibn Mas'ud)",
        "note": "Said in every sitting.",
    },
    "durood": {
        "titleEn": "Durood-e-Ibrahimi", "titleUr": "درود ابراہیمی",
        "ar": "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ. اللَّهُمَّ بَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
        "ur": "اے اللہ! محمد ﷺ اور آلِ محمد ﷺ پر رحمت نازل فرما، جیسے تو نے ابراہیمؑ اور آلِ ابراہیمؑ پر رحمت نازل فرمائی، بے شک تو تعریف والا، بزرگی والا ہے۔ اے اللہ! محمد ﷺ اور آلِ محمد ﷺ پر برکت نازل فرما، جیسے تو نے ابراہیمؑ اور آلِ ابراہیمؑ پر برکت نازل فرمائی، بے شک تو تعریف والا، بزرگی والا ہے۔",
        "en": "O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim; indeed You are Praiseworthy, Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim; indeed You are Praiseworthy, Glorious.",
        "ref": "Bukhari 3370 (narrated by Ka'b ibn 'Ujrah)",
        "note": "Said in the last sitting, after Tashahhud.",
    },
    "salam": {
        "titleEn": "Salam", "titleUr": "سلام",
        "ar": "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ",
        "ur": "تم پر سلامتی ہو اور اللہ کی رحمت۔",
        "en": "Peace be upon you and the mercy of Allah.",
        "ref": "Abu Dawud 996, Tirmidhi 295",
        "note": "Turn your face to the right and say it, then to the left and say it again.",
    },
}

# Quran passages, copied from data/surahs at build time
QURAN = {
    "tasmiyah": {"titleEn": "Bismillah", "titleUr": "بسم اللہ", "surah": 1, "from": 1, "to": 1,
                 "note": "Said quietly before Al-Fatihah in every rak'ah."},
    "fatihah": {"titleEn": "Surah Al-Fatihah", "titleUr": "سورۃ الفاتحہ", "surah": 1, "from": 2, "to": 7,
                "note": "Recited in every rak'ah."},
    "ikhlas": {"titleEn": "Another surah, e.g. Al-Ikhlas", "titleUr": "کوئی سورت، مثلاً سورۃ الاخلاص", "surah": 112, "from": 1, "to": 4,
               "note": "In the first two rak'ahs (and every rak'ah of Sunnah and Witr), recite any surah or at least three short ayahs after Al-Fatihah."},
    "dua_masura": {"titleEn": "Dua before Salam", "titleUr": "سلام سے پہلے دعا", "surah": 14, "from": 40, "to": 41,
                   "note": "Said in the last sitting, after Durood. This dua is from the Quran (Surah Ibrahim)."},
}

STEPS = {
    "takbeer": ["takbeer"],
    "qiyam": ["thana", "taawwudh", "tasmiyah", "fatihah", "aameen", "ikhlas"],
    "ruku": ["takbeer", "ruku", "tasmee", "tahmeed"],
    "sajdah": ["takbeer", "sajdah", "jalsa"],
    "tashahhud": ["tashahhud", "durood", "dua_masura"],
    "salam": ["salam"],
}

PRIVATE_USE = re.compile(r"[-]")
FOOTNOTE = re.compile(r"\s*\[\d+\]")


def load_surah(n):
    raw = (ROOT / f"data/surahs/{n:03d}.js").read_text(encoding="utf-8")
    return json.loads(re.sub(r"^window\.BASEERAH_SURAH\s*=\s*", "", raw).rstrip().rstrip(";"))


def quran_item(key, spec):
    s = load_surah(spec["surah"])
    ayahs = [a for a in s["ayahs"] if spec["from"] <= a["number"] <= spec["to"]]
    assert len(ayahs) == spec["to"] - spec["from"] + 1, key
    clean = lambda t: FOOTNOTE.sub("", t or "").strip()
    return {
        "id": key, "kind": "quran", "provenance": "quran-data",
        "titleEn": spec["titleEn"], "titleUr": spec["titleUr"],
        "ar": " ".join(PRIVATE_USE.sub("", a["arFull"]).strip() for a in ayahs),
        "ur": " ".join(clean(a["ur"]) for a in ayahs),
        "en": " ".join(clean(a["en"]) for a in ayahs),
        "ref": f"Quran {spec['surah']}:{spec['from']}" + (f"-{spec['to']}" if spec["to"] != spec["from"] else "") + f" ({s['nameEn']})",
        "note": spec.get("note"),
    }


items = {}
for k, v in ADHKAR.items():
    items[k] = {"id": k, "kind": "dhikr", "provenance": "baseerah-draft-with-hadith-reference", **v}
for k, v in QURAN.items():
    items[k] = quran_item(k, v)

out = {
    "version": 1,
    # Honest record of review state (not shown as a banner in the app):
    # Quran items are verified against data/surahs at build time; the adhkar
    # were drafted for Baseerah and still need one scholar check.
    "status": "draft",
    "reviewed_by": "pending-scholar-review",
    "madhab": "Hanafi",
    "sources": {
        "quran": "Arabic: Tanzil; Urdu: Muhammad Junagarhi; English: Saheeh International (via QuranEnc)",
        "adhkar": "Standard wording from the Sunnah with hadith references; Urdu and English meaning prepared for Baseerah",
    },
    "items": items,
    "steps": STEPS,
    "order": ["takbeer", "qiyam", "ruku", "sajdah", "tashahhud", "salam"],
}
(ROOT / "data/namaz/recitations.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("wrote", len(items), "recitations for", len(STEPS), "steps")
