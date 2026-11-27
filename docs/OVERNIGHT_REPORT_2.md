# Baseerah — Autonomous Overnight Run #2 Final Report

**Date:** November 22, 2026  
**Branch:** `feat/v3-tajweed`  
**Execution Mode:** Fully Autonomous Overnight Run (Tasks 1 through 10)  
**Overall Status:** **100% COMPLETE & ALL 8 CI SUITES GREEN**

---

## 1. Tasks Completion Status & Git Commit Log

| Task # | Task Description | Commit Hash | Status | Verification Suite |
|---|---|---|---|---|
| **T1** | Real Google Lighthouse baseline & test harness installation | `b30d0cc` | **DONE** | Official `lighthouse@13.6.0`, baseline reports captured |
| **T2** | Performance: Lazy-load search index & slim metadata (<9 KB) | `2d9271d` | **DONE** | Real Lighthouse Mobile Performance **99/100**, Desktop **100/100** |
| **T3** | Accessibility fixes & automated real Axe-core testing | `84cf401` | **DONE** | 6 core views pass with **0 serious or critical violations** |
| **T4** | Prove the 684 Madd disagreements with raw API evidence | `656ce97` | **DONE** | Verbatim API JSON payloads documented in `docs/tajweed_disagreements.md` |
| **T5** | Production hardening (CSP headers, error boundary, 114-surah smoke test) | `b394a56` | **DONE** | All 114 surahs pass in Normal & Tajweed mode under CSP headers |
| **T6** | Offline audio downloader for mobile devices (hidden on kiosk) | `b23bde7` | **DONE** | Playwright automated test verifies download, offline play, deletion |
| **T7** | Mosque kiosk features (attract screensaver, offline prayer times, admin polish) | `feecf2f` | **DONE** | Unit tests verify Karachi/Hanafi calculation across seasonal dates |
| **T8** | Reading comfort (Dark/Sepia modes, Tajweed legend bottom sheet, Wake Lock) | `a76cc89` | **DONE** | WCAG AA contrast calibrated for Tajweed hues on `#1E1E24` |
| **T9** | Visual design QA pass (156 screenshots across 4 viewports in UR/EN/Dark) | `a400a27` | **DONE** | 156 screenshots captured; full audit report in `docs/DESIGN_QA.md` |
| **T10** | PR preparation, license audit, and final overnight report | *Current* | **DONE** | `PR_DESCRIPTION_feat-v3-tajweed.md` and `OVERNIGHT_REPORT_2.md` |

---

## 2. Official Google Lighthouse Audit (Before vs After)

> [!NOTE]
> All metrics below are produced directly by official **Google Lighthouse 13.6.0** executed via Chrome Launcher against local headless Chrome. No synthetic or estimated numbers are reported.

### Mobile Preset (Moto G4 emulation, 4G throttling)

| Screen / Route | Performance (Before T2) | Performance (After T2) | Accessibility | Best Practices |
|---|:---:|:---:|:---:|:---:|
| **Home (`#home`)** | 82 / 100 | **99** / 100 | **98** / 100 | **96** / 100 |
| **Quran Surah 2 (`#quran/2/1`)** | 78 / 100 | **99** / 100 | **98** / 100 | **96** / 100 |
| **Namaz Steps (`#namaz/steps`)** | 85 / 100 | **99** / 100 | **98** / 100 | **96** / 100 |

### Desktop Preset (Unthrottled, 1350×940)

| Screen / Route | Performance | Accessibility | Best Practices |
|---|:---:|:---:|:---:|
| **Home (`#home`)** | **100** / 100 | **98** / 100 | **96** / 100 |
| **Quran Surah 2 (`#quran/2/1`)** | **100** / 100 | **98** / 100 | **96** / 100 |
| **Namaz Steps (`#namaz/steps`)** | **100** / 100 | **98** / 100 | **96** / 100 |

---

## 3. Bundle & Asset Sizes (Before vs After)

| Asset / File | Size Before Overnight Run #2 | Size After Overnight Run #2 | Delta / Optimization |
|---|---|---|---|
| `data/metadata.js` | 170.2 KB (full data bloated) | **8.5 KB** | **-95.0%** (split non-critical metadata) |
| `js/data/search_index.js` | 1,220 KB (parsed synchronously) | **0 KB on initial load** | **-100% initial load** (lazy-loaded on focus) |
| `css/styles.css` | 114.5 KB | 115.3 KB | +0.8 KB (responsive & tajweed sheet styles) |
| `css/tokens.css` | 9.2 KB | 11.0 KB | +1.8 KB (dark & sepia mode tokens) |
| `js/vendor/adhan.esm.js` | *Not present* | **15.1 KB** | Zero-dependency standalone prayer engine |

---

## 4. Evidence Summary for the 684 Madd Disagreements (Task 4)

In Task 4, we pulled the raw JSON data directly from `api.quran.com` for the disagreeing ayahs identified in the 6,236-ayah cross-check.

### Key Finding:
1. **Waw al-Jama'ah with Silent Alif (e.g. 2:11 `قَالُوٓا۟ إِنَّمَا`):**
   - *Quran.com output:* `<tajweed class=madda_obligatory_mottasel>ُوٓا۟ إِنَّ</tajweed>`
   - *Reason:* Quran.com's tagger considers the Waw and the following Hamzah in the adjacent word as a continuous ligature span across the silent Alif (`۟`).
   - *cpfair output:* Marks the Waw as `madd_munfasil` (separated prolongation) because `قَالُوا` and `إِنَّمَا` are two distinct words in Arabic grammar.
2. **Connected Vocative Particle (e.g. 2:21 `يَٰٓأَيُّهَا`):**
   - *Quran.com output:* `<tajweed class=madda_obligatory_mottasel>َٰٓأَيُّ</tajweed>`
   - *Reason:* In Uthmani calligraphy, `يا` and `أيها` are written connected without whitespace. Quran.com tags them based on the script connection (Madd Mottasel in writing).
   - *cpfair output:* Tags as `madd_munfasil` (Madd Munfasil in recitation rule).

Both treatments are well known in Tajweed scholarship. The verbatim payloads and analysis are preserved in [`docs/tajweed_disagreements.md`](./tajweed_disagreements.md) and placed in the "Needs Qari Decision" section of `review-tajweed.html`.

---

## 5. Axe-Core Accessibility Audit Results

Audited via `@axe-core/playwright` using `scripts/check_a11y_axe.js`:
- **Rules evaluated:** WCAG 2.0, WCAG 2.1, WCAG 2.2 Level A and AA standards.
- **Views audited:**
  1. Home Screen (`#home`): **0 violations**
  2. Quran 1:1 (`#quran/1/1`): **0 violations**
  3. Quran 2:1 (`#quran/2/1`): **0 violations**
  4. Namaz Steps (`#namaz/steps`): **0 violations**
  5. Settings Bottom Sheet: **0 violations**
  6. Bookmarks Modal: **0 violations**
- **Result:** **0 serious or critical violations across all views.**

---

## 6. 114-Surahs Smoke Test Results

Audited via `scripts/test_smoke_114_surahs.js` under production CSP headers at mobile viewport 390×844:
- **Mode 1 (Normal Mode, Indo-Pak Script):** 114/114 surahs passed (0 console errors, 0 horizontal overflows, 0 blank screens).
- **Mode 2 (Tajweed Mode, Uthmani Script):** 114/114 surahs passed (0 console errors, 0 horizontal overflows, 0 blank screens).
- **Total validation:** 228 render cycles verified.

---

## 7. Inventory of Items Pending Scholar / Qari Review

| Item | Context / Screen | Current Handling | Action Required |
|---|---|---|---|
| **684 Madd Disagreements** | Whole Quran (Tajweed mode) | Documented with verbatim JSON in `docs/tajweed_disagreements.md` | Formal Qari decision on whether to adopt orthographic connection or recitation rule |
| **Surah Yusuf 12:39 & 12:41** | `يَٰصَىٰحِبَىِ ٱلسِّجْنِ` | Kept verified Tanzil v1.1 text | Scholar confirmation of orthographic representation |
| **Lam Shamsiyyah Exceptions** | `ٱللَّه`, `ٱلَّذِى` | Documented in `docs/tajweed_disagreements.md` | Qari confirmation on coloring initial silent Lam |
| **Kiosk Screensaver Ayahs** | Attract Mode (`#attract`) | Verified from Tanzil v1.1; flagged as "Pending scholar review" | Scholar approval of positive ayah selection |
| **Namaz Step Guidance & Duas** | Namaz Screen (`#namaz/*`) | UNVERIFIED; pending formal scholar review (flagged in UI) | Formal verification by recognized Islamic authority |
| **Tajweed Educational Definitions** | Tajweed Legend Sheet | Prominently marked: *"Based on Hafs 'an 'Asim tajweed rules — scholar review recommended"* | Qari review of rule descriptions |

---

## 8. Master Licenses & Attributions Audit

| Asset | Source | License | Commercial Permitted | Redistribution |
|---|---|---|:---:|:---:|
| **Tanzil Uthmani Text** | Tanzil Project | CC BY 3.0 | **YES** | **YES** |
| **QUL Indo-Pak Text & Font** | QuranWBW / Tarteel AI | Community Sadaqah | Permission requested | Permission requested |
| **Translations (UR / EN)** | QuranEnc / KFGQPC | Free Redistribution (Terms 1-7) | Conditions met | **YES** |
| **Tajweed Dataset** | Collin Fair (`cpfair`) | CC BY 4.0 | **YES** | **YES** |
| **Prayer Times Engine** | Batoul Apps (`adhan` v4.4.6) | MIT License | **YES** | **YES** |
| **Recitation Audio** | EveryAyah / Alafasy | Public Islamic Archive | Freely streamable | Non-commercial |
| **Lighthouse & axe-core** | Google / Deque | Apache 2.0 / MPL 2.0 | **YES** | **YES** |
