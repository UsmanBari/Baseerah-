# Baseerah (بصيرة) — Data Sources, Licenses & Attributions

Every piece of Quranic text, word translation, and full ayah translation in Baseerah is sourced directly from authenticated, reputable databases with zero machine generation or manual alterations.

---

## 1. Tanzil Project (Ground Truth Arabic)
- **Source:** [Tanzil.net](https://tanzil.net)
- **Resource:** Tanzil Uthmani Text (`tanzil-uthmani.txt`)
- **Version:** Uthmani Text with aya numbers (downloaded 2026-11)
- **License:** Creative Commons Attribution 3.0 Unported License (CC BY 3.0)
- **Attribution Text:**
  > Tanzil Quran Text Copyright © 2007-2024 Tanzil Project.
  > License: Creative Commons Attribution 3.0 Unported (CC BY 3.0).
  > Any use of the text must be accompanied by an attribution to Tanzil.net.

---

## 2. Quranic Universal Library (QUL) by Tarteel AI
- **Source:** [QUL Resources](https://qul.tarteel.ai)
- **Resources:**
  - **Script 59:** Indo-Pak Nastaleeq Script (Word by Word) — Display script for word cards (`words[].ar`).
  - **Script 89:** Indo-Pak Nastaleeq Script (Ayah by Ayah) — Full ayah Arabic text (`arFull`).
  - **Script 56:** Uthmani Script (Word by Word) — Used for Uthmani verification against Tanzil.
  - **Translation 93:** Urdu Word-by-Word Meanings (`words[].ur`).
  - **Translation 92:** English Word-by-Word Meanings (`words[].en`).
  - **Font:** Indo-Pak Nastaleeq font (`fonts/font.ttf`) matching QUL script 59 & 89 glyph definitions and PUA ligature codes.
- **License:** Open Quran Resources / Attribution to Tarteel AI & QUL contributors.

---

## 3. QuranEnc (King Fahd Glorious Quran Printing Complex)
- **Source:** [QuranEnc.com](https://quranenc.com)
- **Translations:**
  - **Urdu:** Maulana Muhammad Junagarhi (`urdu_junagarhi`)
  - **English:** Saheeh International (`english_saheeh`)
- **License / Terms of Use:**
  > Free distribution for non-profit Islamic education. Text must remain unaltered byte-for-byte with attribution to QuranEnc and respective translators.

---

## 4. Verification & Validation Summary
All built data is verified through an automated 6-step validation chain (`scripts/build_data.py`):
1. **Surah & Ayah Counts:** Exactly 114 surahs and 6,236 ayahs matching Tanzil's official counts.
2. **Full Translations:** 100% complete Urdu and English full ayah translations for all 6,236 ayahs.
3. **Uthmani Verification:** QUL Uthmani words joined match Tanzil ayah text byte-for-byte across all 6,236 ayahs (normalized for comparison only).
4. **Indo-Pak Consistency:** QUL script 59 words joined match QUL script 89 ayah text byte-for-byte across all 6,236 ayahs.
5. **Word Key Alignment:** Word positions and keys strictly align across Uthmani, Indo-Pak, Urdu wbw, and English wbw.
6. **No Markers in Word Lists:** Ayah markers are cleanly separated and preserved at ayah level.
