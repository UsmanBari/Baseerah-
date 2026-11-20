# Baseerah (بصيرة) — Data Sources, Licenses & Attributions

Every piece of Quranic text, word translation, and full ayah translation in Baseerah is sourced directly from authenticated, reputable databases with zero machine generation or manual alterations.

---

## 1. Tanzil Project (Ground Truth Arabic)
- **Source:** [Tanzil.net](https://tanzil.net)
- **Resource:** Tanzil Uthmani Text (`tanzil-uthmani.txt`)
- **Version:** Uthmani Text with aya numbers (downloaded 2026-11)
- **License:** Creative Commons Attribution 3.0 Unported License ([CC BY 3.0](https://creativecommons.org/licenses/by/3.0/))
- **Commercial Use:** Allowed under CC BY 3.0.
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
- **Attribution:** Quranic Universal Library by Tarteel AI & community contributors.
- **Commercial Policy:** See `docs/LICENSES_AUDIT.md`.

---

## 3. Indo-Pak Nastaleeq Font (`fonts/indopak-nastaleeq-qul.ttf`)
- **Font Full Name:** `AlQuran IndoPak by QuranWBW` (Version 2.100; November 26, 2022)
- **Copyright:** © Al Qalam, © Ghandhara, © KFGQPC, © Ayman Siddiqui. Credits: Abdul Majeed Khan, Arif Karim, Shakir-ul-Qadree, Jawad.
- **Developer / Designer:** Ayman Siddiqui ([QuranWBW.com](https://www.quranwbw.com))
- **Source:** [QUL Font Resource](https://qul.tarteel.ai/resources/font) / QuranWBW
- **License in Name Table:**
  > *"Made only for Sadaqa-e-Jaria purposes. No Copyright infringement intended. NOT FOR SALE, NOT FOR MODIFICATION, NOT FOR DISTRIBUTION OR NOT FOR DEVELOPMENT WITHOUT WRITTEN NOTICE BY QURANWBW.COM. E-mail: quranwbw@gmail.com"*
- **Compliance Status:** Written authorization requested from QuranWBW (`docs/permission_emails/01_quranwbw_font_permission.md`).

---

## 4. QuranEnc (King Fahd Glorious Quran Printing Complex)
- **Source:** [QuranEnc.com](https://quranenc.com)
- **Translations:**
  - **Urdu:** Maulana Muhammad Junagarhi (`urdu_junagarhi`)
  - **English:** Saheeh International (`english_saheeh`)
- **License / Terms of Use:**
  > Free distribution for non-profit Islamic education and community dissemination. Text must remain unaltered byte-for-byte with permanent attribution to QuranEnc and respective translators.

---

## 5. Surah Names & Quran Metadata
- **Source:** [Quran.com API v4 Chapters](https://api.quran.com/api/v4/chapters) & QUL Metadata
- **Date Retrieved:** November 2026
- **License:** Open Islamic Knowledge Base / Public Domain.
- **Rendering:** All 114 Surah names are verified against the Indo-Pak Nastaleeq font and standard Amiri typography.

---

## 6. Verification & Validation Summary
All built data is verified through an automated 6-step validation chain (`scripts/build_data.py`):
1. **Surah & Ayah Counts:** Exactly 114 surahs and 6,236 ayahs matching Tanzil's official counts.
2. **Full Translations:** 100% complete Urdu and English full ayah translations for all 6,236 ayahs.
3. **Uthmani Verification:** QUL Uthmani words joined match Tanzil ayah text across all 6,236 ayahs (normalized for comparison only; 3 known QUL 56 reference differences documented in `scripts/known_exceptions.json`).
4. **Indo-Pak Consistency:** QUL script 59 words joined match QUL script 89 ayah text byte-for-byte across all 6,236 ayahs.
5. **Word Key Alignment:** Word positions and keys strictly align across Uthmani, Indo-Pak, Urdu wbw, and English wbw.
6. **No Markers in Word Lists:** Ayah markers are cleanly separated and preserved at ayah level.
7. **Cryptographic Integrity:** SHA-256 hashes generated for every data asset in `data/manifest.sha256.json`.
