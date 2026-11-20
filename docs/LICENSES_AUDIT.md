# Baseerah (بصيرة) — Commercial License & Content Asset Audit

**Document Version:** 1.1.0  
**Audit Date:** 2026-11-20  
**Auditor:** Baseerah Engineering (Acme One)  
**Verification Standard:** Verbatim quotes verified from live publisher endpoints on 2026-11-20. Any source that could not be verified or lacks explicit commercial terms is marked **UNKNOWN**.

---

## 1. Master Content Asset Audit Table

| Asset / Content | Original Author / Publisher | License / Terms Verbatim Quote | Commercial Use | Redistribution | Verified from (URL + date fetched) | Risk & Action Required |
|---|---|---|---|---|---|---|
| **Tanzil Uthmani Text** (`tanzil-uthmani.txt`) & **Metadata** (`tanzil-quran-data.xml`) | Tanzil Project (Hamid Zarrabi-Zadeh) | *"Creative Commons Attribution 3.0 Unported (CC BY 3.0): You are free to Share (copy and redistribute) and Adapt (remix, transform, build upon) for any purpose, even commercially."* | **YES** | **YES** | [tanzil.net/download](https://tanzil.net/download) (2026-11-20) | Fully compliant. Attribution maintained in docs and UI. |
| **QUL Indo-Pak WBW Text (Script 59)** | QuranWBW (Ayman Siddiqui) / Tarteel AI QUL | *"Open Quran community repository... QuranWBW.com For providing word-by-word translations in multiple languages. Ayman Siddiqui For his amazing work on Indopak and tajweed fonts and script."* | **UNKNOWN** | **YES** | [qul.tarteel.ai/credits](https://qul.tarteel.ai/credits) (2026-11-20) | Commercial bundling rights unverified. Acme One permission email drafted (`02_tarteel_qul_commercial_permission.md`). |
| **QUL Indo-Pak Ayah Text (Script 89)** | QuranWBW / Tarteel AI QUL | Script based on South Asian Nastaleeq Mushaf standard. | **UNKNOWN** | **YES** | [qul.tarteel.ai/credits](https://qul.tarteel.ai/credits) (2026-11-20) | Commercial bundling rights unverified. Covered under Tarteel inquiry. |
| **QUL Uthmani WBW Text (Script 56)** | QuranWBW / Tarteel AI QUL | Verification reference only. Not shipped in kiosk runtime. | **N/A (Internal Verification)** | **N/A** | [qul.tarteel.ai/credits](https://qul.tarteel.ai/credits) (2026-11-20) | Internal verification ground check only. |
| **Urdu WBW Meanings (Translation 93)** | Compiled by Dr. Farhat Hashmi (QuranWBW) | *"Quranwbw.com wouldn't be possible without these amazing people: ... Dr. Farhat Hashmi for her Urdu word by word compilation."* | **UNKNOWN** | **YES** | [old.quranwbw.com/about](https://old.quranwbw.com/about) (2026-11-20) | Commercial rights unverified. Permission email drafted to QuranWBW (`01_quranwbw_font_permission.md`). |
| **English WBW Meanings (Translation 92)** | Dr. Shehnaz Shaikh & Ms. Kausar Khatri (QuranWBW) | *"Quranwbw.com wouldn't be possible without these amazing people: Dr. Shehnaz Shaikh, Ms. Kausar Khatri for their English... word by word compilation."* | **UNKNOWN** | **YES** | [old.quranwbw.com/about](https://old.quranwbw.com/about) (2026-11-20) | Commercial rights unverified. Covered under QuranWBW inquiry. |
| **Indo-Pak Nastaleeq Font** (`fonts/indopak-nastaleeq-qul.ttf`) | Ayman Siddiqui (QuranWBW) | Font TTF Name Table: *"Made only for Sadaqa-e-Jaria purposes. No Copyright infringement intended. NOT FOR SALE, NOT FOR MODIFICATION, NOT FOR DISTRIBUTION OR NOT FOR DEVELOPMENT WITHOUT WRITTEN NOTICE BY QURANWBW.COM. E-mail: quranwbw@gmail.com"* | **NO (without written notice)** | **NO (conditional)** | Extracted directly from TTF binary Name Table (ID 13) (2026-11-20) | Permission requested by Usman Bari on 2026-11-20, awaiting reply. |
| **QuranEnc Urdu Full Translation** (`urdu_junagarhi`) | Maulana Muhammad Junagarhi (King Fahd Glorious Quran Printing Complex) | *"Contents of the translations can be downloaded and re-published, with the following terms and conditions: 1. No modification, addition, or deletion of the content. 2. Clearly referring to the publisher and the source (QuranEnc.com). 3. Mentioning the version number when re-publishing the translation. 4. Keeping the transcript information inside the document. 5. Notifying the source (QuranEnc.com) of any note on the translation. 6. Updating the translation according to the latest version issued from the source (QuranEnc.com). 7. Inappropriate advertisements must not be included when displaying translations of the meanings of the Noble Quran."* | **UNKNOWN (Free re-publishing allowed under terms 1–7)** | **YES** | [quranenc.com/en/home](https://quranenc.com/en/home) Terms and Policies Modal (2026-11-20) | Terms 1–7 satisfied. Formal courtesy clarification sent to QuranEnc (`03_quranenc_commercial_clarification.md`). |
| **QuranEnc English Full Translation** (`english_saheeh`) | Saheeh International (Emily Assami, Mary Kennedy, Amatullah Bantley / KFGQPC) | Same QuranEnc Terms and Policies (1–7) quoted verbatim above. | **UNKNOWN (Free re-publishing allowed under terms 1–7)** | **YES** | [quranenc.com/en/home](https://quranenc.com/en/home) Terms and Policies Modal (2026-11-20) | Terms 1–7 satisfied. Covered under QuranEnc inquiry. |
| **Surah Names Metadata** (`raw/qul-surah-names.json`) | Quran.com API v4 / QUL | Endpoints provided by Quran.com / QUL open web services. Dedicated commercial licensing page not located on API root. | **UNKNOWN** | **YES** | [api.quran.com/api/v4/chapters](https://api.quran.com/api/v4/chapters) (2026-11-20) | Factual metadata (surah names, ayah counts). Marked UNKNOWN pending API licensing confirmation. |

---

## 2. Risk Mitigation & Permission Inquiries

1. **Font Permission (`01_quranwbw_font_permission.md`):** Permission requested by Usman Bari on 2026-11-20, awaiting reply.
2. **QUL Script Data Permission (`02_tarteel_qul_commercial_permission.md`):** Submitted to Tarteel AI team.
3. **QuranEnc Terms Notice (`03_quranenc_commercial_clarification.md`):** Submitted to QuranEnc management.
