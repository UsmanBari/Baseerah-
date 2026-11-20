# Baseerah (بصيرة) — Commercial License & Content Asset Audit

**Document Version:** 1.0.0  
**Date:** November 2026  
**Auditor:** Baseerah Engineering (on behalf of Acme One)  
**Strict Policy:** No content asset may be shipped commercially without confirmed commercial redistribution rights. Unknown licenses require explicit written clarification or publisher permission before public deployment in Pakistani mosques.

---

## 1. Master Content Asset Audit Table

| Asset / Content | Source URL | Original Author / Publisher | License / Terms Quoted | Commercial Use | Redistribution | Required Attribution Text | Action Needed |
|---|---|---|---|---|---|---|---|
| **Tanzil Uthmani Text** (`tanzil-uthmani.txt`) | [tanzil.net/download](https://tanzil.net/download) | Tanzil Project (Hamid Zarrabi-Zadeh) | Creative Commons Attribution 3.0 Unported ([CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)): *"You are free to Share (copy and redistribute) and Adapt (remix, transform, build upon) for any purpose, even commercially."* | **YES** | **YES** | *"Tanzil Quran Text Copyright © 2007-2024 Tanzil Project. License: CC BY 3.0. tanzil.net"* | Compliant. Keep attribution in app and docs. |
| **QUL Indo-Pak WBW Text (Script 59)** | [qul.tarteel.ai/resources/quran-script](https://qul.tarteel.ai/resources/quran-script) | Tarteel AI / QuranWBW (Ayman Siddiqui) | QUL Terms of Service: Open Quran community repository for non-profit/community developers. Original text curated by QuranWBW project. | **UNKNOWN** | **YES** | *"Quranic Universal Library by Tarteel AI and QuranWBW contributors."* | Send commercial permission request to Tarteel AI & QuranWBW. |
| **QUL Indo-Pak Ayah Text (Script 89)** | [qul.tarteel.ai/resources/quran-script](https://qul.tarteel.ai/resources/quran-script) | Tarteel AI / QuranWBW | Hosted on QUL for open access. Rasm based on South Asian Nastaleeq Mushaf standard. | **UNKNOWN** | **YES** | *"Quranic Universal Library by Tarteel AI and QuranWBW contributors."* | Send commercial permission request to Tarteel AI & QuranWBW. |
| **QUL Uthmani WBW Text (Script 56)** | [qul.tarteel.ai/resources/quran-script](https://qul.tarteel.ai/resources/quran-script) | Tarteel AI / QuranWBW | Verification reference only. Not shipped in kiosk runtime. | **N/A (Internal Verification Only)** | **N/A** | Internal verification reference only. | None for kiosk display. |
| **QUL Urdu WBW Meanings (Translation 93)** | [qul.tarteel.ai/resources/translation/93](https://qul.tarteel.ai/resources/translation/93) | QuranWBW / Maulana Hafiz Nazar Muhammad | Curated word-by-word Urdu translation. Based on authentic South Asian literal translations. | **UNKNOWN** | **YES** | *"Urdu word-by-word meanings courtesy of QuranWBW / QUL."* | Request written commercial authorization from QuranWBW / Tarteel. |
| **QUL English WBW Meanings (Translation 92)** | [qul.tarteel.ai/resources/translation/92](https://qul.tarteel.ai/resources/translation/92) | QuranWBW / Dr. Shehnaz Shaikh & Ms. Kausar Khatri | Word-by-word English translation popular in South Asia and global educational apps. | **UNKNOWN** | **YES** | *"English word-by-word meanings courtesy of QuranWBW / QUL."* | Request written commercial clarification. |
| **Indo-Pak Nastaleeq Font** (`fonts/indopak-nastaleeq-qul.ttf`) | [qul.tarteel.ai/resources/font](https://qul.tarteel.ai/resources/font) / QuranWBW | Ayman Siddiqui (based on Al Qalam Quran Majeed, Ghandhara, KFGQPC glyphs) | Font Name Table License: *"Made only for Sadaqa-e-Jaria purposes. No Copyright infringement intended. NOT FOR SALE, NOT FOR MODIFICATION, NOT FOR DISTRIBUTION OR NOT FOR DEVELOPMENT WITHOUT WRITTEN NOTICE BY QURANWBW.COM. E-mail: quranwbw@gmail.com"* | **NO (without written notice)** | **NO (conditional)** | *"AlQuran IndoPak by QuranWBW. © Al Qalam, © Ghandhara, © KFGQPC, © Ayman Siddiqui."* | **CRITICAL BLOCKER:** Must obtain written consent from Ayman Siddiqui (`quranwbw@gmail.com`) for deployment in commercial kiosks. |
| **QuranEnc Urdu Translation** (`urdu_junagarhi`) | [quranenc.com/en/browse/urdu_junagarhi](https://quranenc.com/en/browse/urdu_junagarhi) | Maulana Muhammad Junagarhi / King Fahd Glorious Quran Printing Complex | QuranEnc Terms: *"Free distribution for Islamic dawah and education. Texts must remain unaltered."* Commercial hardware kiosk bundling terms not explicitly articulated. | **UNKNOWN** | **YES** | *"Urdu Translation by Maulana Muhammad Junagarhi, courtesy of QuranEnc.com and KFGQPC."* | Send formal inquiry to QuranEnc management regarding mosque kiosk hardware deployments. |
| **QuranEnc English Translation** (`english_saheeh`) | [quranenc.com/en/browse/english_saheeh](https://quranenc.com/en/browse/english_saheeh) | Saheeh International (Emily Assami, Mary Kennedy, Amatullah Bantley) / KFGQPC | QuranEnc Terms: *"Free distribution for Islamic dawah and non-profit educational dissemination."* | **UNKNOWN** | **YES** | *"English Translation by Saheeh International, courtesy of QuranEnc.com and KFGQPC."* | Send formal inquiry to QuranEnc management. |
| **Surah Names Metadata** (`raw/qul-surah-names.json`) | [api.quran.com/api/v4/chapters](https://api.quran.com/api/v4/chapters) & QUL metadata | Quran.com / Tarteel AI | Open API / public domain Islamic metadata. | **YES** | **YES** | *"Surah metadata courtesy of Quran.com API v4."* | Compliant. Keep attribution. |

---

## 2. Risk Assessment & Action Plan

1. **Indo-Pak Font (`fonts/indopak-nastaleeq-qul.ttf`):**
   - **Risk Level:** HIGH. The font binary explicitly contains `NOT FOR SALE, NOT FOR DISTRIBUTION WITHOUT WRITTEN NOTICE BY QURANWBW.COM`.
   - **Resolution:** Send formal letter to Ayman Siddiqui (`quranwbw@gmail.com`) stating that Baseerah hardware is deployed in non-profit mosque settings and seeking written authorization. If permission is denied, fallback to certified SIL Open Font License (OFL) Nastaleeq font (e.g. *Mehr Nastaliq Web* / *Gulzar* / *Noto Nastaliq Urdu* with Quranic OT features) after Hafiz verification.
2. **QUL / Tarteel Datasets:**
   - **Risk Level:** MEDIUM. Tarteel AI provides open community access, but commercial terms should be secured in writing for enterprise kiosk distribution.
   - **Resolution:** Submit enterprise partner permission email to Tarteel AI legal/partnerships.
3. **QuranEnc (Junagarhi & Saheeh International):**
   - **Risk Level:** LOW-MEDIUM. Widely distributed worldwide in commercial and non-commercial apps. Written courtesy notice clarifies kiosk hardware bundling.
