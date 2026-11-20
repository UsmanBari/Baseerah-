# Baseerah (بصيرة) — Quran Board & Hafiz Review Protocol

Under the **Punjab Holy Quran (Printing and Recording) Act 2011** (amended 2021) and equivalent regulations in other provinces of Pakistan, digital copies of the Holy Quran must be subjected to formal proofreading and certification by certified Huffaz and Islamic scholars.

This document outlines the protocol, materials, and verification tools provided with Baseerah v1.0.0 for official Quran Board submission.

---

## 1. Review Deliverables Provided

Baseerah includes two dedicated verification interfaces created specifically for the Quran Board:

1. **`review.html` (Interactive Proofing Suite):**
   - Renders spot-check ayahs in authentic high-resolution Indo-Pak Nastaleeq font:
     - Surah Al-Fatihah (1:1–7)
     - Ayat al-Kursi (2:255)
     - Surah Ya-Sin (36:1–12)
     - Surah Al-Ikhlas (112:1–4)
     - Surah An-Nas (114:1–6)
   - Features the **3 Documented Reference Exceptions** (Surah 5:52, 11:13, 80:25) flagged with red `"Hafiz check required"` notices.
   - Provides full word-by-word alignment tables (Arabic, Urdu, English) alongside the translations of Maulana Muhammad Junagarhi and Saheeh International.

2. **`export/board_review_quran.html` (A4 Print-Ready Full Proof Copy):**
   - Generated via `scripts/export_for_board.py`.
   - Formatted in A4 page proportions with margins and high-contrast Nastaleeq typography.
   - Contains all 114 Surahs and 6,236 Ayahs with end-of-ayah markers and Urdu translation below every ayah.

---

## 2. Review Protocol for Certified Huffaz

Reviewing scholars should verify the following five criteria:

### Criteria A: Ayah-by-Ayah Rasm and Aerab (اعجاز الرسم والاعراب)
- Verify that every diacritical mark (zer, zabar, pesh, jazm/sukun, tashdeed, tanween) is clearly placed and mapped correctly to its respective consonant.
- Confirm that South Asian Nastaleeq calligraphic ligatures (such as "وَلْيَتَلَطَّفْ" in 18:19) are rendered in proper Nastaleeq style without glyph distortion.

### Criteria B: The 3 Reference Exceptions in QUL 56
Scholars must review `scripts/known_exceptions.json`:
- **5:52:** In the shipped Indo-Pak text (QUL 59), word 12 is `'دَآىِٕرَةٌ ؕ'` (properly connected letters). Verify that no unwanted space exists between the letters of the word.
- **11:13:** Tanzil encodes with Alef Wasla and Dagger Alef (`ٱفْتَرَىٰهُ`), while shipped Indo-Pak uses authentic South Asian rasm (`افْتَرَاهُ ؕ`). Confirm correctness.
- **80:25:** Shipped Indo-Pak uses `اَنَّا`. Confirm vocalization and grammatical validity.

### Criteria C: Word-by-Word Alignment
- Verify that each Arabic word tile corresponds exactly to its designated Urdu meaning (Translation 93) and English meaning (Translation 92).

### Criteria D: Full Translations
- Confirm that Urdu translations are strictly from Maulana Muhammad Junagarhi without editorial changes.
- Confirm that English translations are strictly from Saheeh International.

### Criteria E: Namaz Content
- Verify that `data/namaz/*.json` steps, rakats, and essential duas conform to mainstream Hanafi jurisprudence as taught across Pakistani mosques.

---

## 3. Formal Certification Sign-Off Template

```text
========================================================================
CERTIFICATE OF ACCURACY & PROOFREADING — HOLY QURAN ELECTRONIC COPY
========================================================================

Name of Reviewer: ____________________________________________________
Sanad / Certificate No: ______________________________________________
Institution / Jamia: _________________________________________________
Date of Review: ______________________________________________________

I, the undersigned Hafiz-ul-Quran / Certified Scholar, hereby declare
that I have inspected and verified the electronic text of the Holy Quran
as rendered in Baseerah (بصيرة) v1.0.0 across all 114 Surahs (6,236 Ayahs)
in authentic Indo-Pak Nastaleeq script.

Findings:
[  ] Text is 100% accurate and free from textual errors.
[  ] Diacritics and ayah markers align with standard Pakistani Mushaf.
[  ] Word-by-word Urdu and English translations are accurate.

Signature: ___________________________    Stamp: _______________________
```
