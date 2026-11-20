/*
 * SAMPLE DATA ONLY — typed by hand for the mockup, NOT verified.
 * Replace with the merged dataset built from:
 *   Arabic text   -> Tanzil (Uthmani, CC BY 3.0, keep unmodified)
 *   Word-by-word  -> QUL (qul.tarteel.ai) Urdu + English wbw
 *   Full ayah     -> QuranEnc (urdu_junagarhi, english_saheeh)
 * Shape stays the same, so app.js does not need to change.
 */
window.QURAN_DATA = {
  surahs: [
    {
      number: 1,
      nameAr: "سُورَةُ ٱلْفَاتِحَة",
      nameEn: "Al-Fatiha",
      ayahs: [
        {
          number: 1,
          ur: "شروع کرتا ہوں اللہ تعالیٰ کے نام سے جو بڑا مہربان نہایت رحم والا ہے",
          en: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
          words: [
            { ar: "بِسْمِ", ur: "نام سے", en: "In (the) name" },
            { ar: "ٱللَّهِ", ur: "اللہ کے", en: "(of) Allah" },
            { ar: "ٱلرَّحْمَٰنِ", ur: "جو بہت مہربان", en: "the Most Gracious" },
            { ar: "ٱلرَّحِيمِ", ur: "نہایت رحم والا", en: "the Most Merciful" }
          ]
        },
        {
          number: 2,
          ur: "سب تعریف اللہ تعالیٰ کے لئے ہے جو تمام جہانوں کا پالنے والا ہے",
          en: "All praise is due to Allah, Lord of the worlds.",
          words: [
            { ar: "ٱلْحَمْدُ", ur: "سب تعریف", en: "All praise" },
            { ar: "لِلَّهِ", ur: "اللہ کے لیے", en: "(is) for Allah" },
            { ar: "رَبِّ", ur: "رب", en: "(the) Lord" },
            { ar: "ٱلْعَٰلَمِينَ", ur: "تمام جہانوں کا", en: "(of) the worlds" }
          ]
        },
        {
          number: 3,
          ur: "بڑا مہربان نہایت رحم کرنے والا",
          en: "The Entirely Merciful, the Especially Merciful.",
          words: [
            { ar: "ٱلرَّحْمَٰنِ", ur: "بہت مہربان", en: "The Most Gracious" },
            { ar: "ٱلرَّحِيمِ", ur: "نہایت رحم والا", en: "the Most Merciful" }
          ]
        }
      ]
    }
  ]
};
