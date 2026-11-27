# Baseerah v3 — Visual Design Fix & Verification Report

**Date:** November 22, 2026  
**Branch:** `feat/v3-tajweed`  
**Test Suite Status:** ✅ PASS (`npm run test:ci` — 8/8 test suites green)  
**Lighthouse Audit:** ✅ Measured with official Google Lighthouse (v13.6.0)  

---

> [!IMPORTANT]
> **Integrity Statement:** All design changes and responsive layouts were visually validated via automated Playwright screenshots across 8 standard device viewports. **No verified Quran text, translations, word-by-word data, or tajweed pipeline output was touched.**

---

## 1. Executive Summary & Before/After Gallery

This design hardening round addressed the visual defects identified in the overnight screenshot run (`docs/screenshots/overnight2/`). The fixes restore crisp typography, remove font rendering artifacts (such as chevron characters rendering as commas in Urdu fonts), eliminate mobile header wrapping, optimize word-by-word tile geometry for 390px screens, prevent element overlaps in the Namaz guide, and ensure Tajweed color-coding renders vividly across all themes and viewports.

A total of **156 "after" screenshots** were captured and saved in `docs/screenshots/design_fix/` for direct side-by-side comparison against `docs/screenshots/overnight2/`.

---

## 2. Section A: Documentation & Scholarly Honesty Updates

In commit `88ea36f`, all documentation was revised to ensure strict truthfulness and eliminate unverified claims:

1. **`docs/DESIGN_QA.md`:**
   - Removed the premature "all-PASS" table that failed to reflect visual defects.
   - Replaced with an honest defect catalog detailing actual layout issues observed in `docs/screenshots/overnight2/`.
   - Corrected the typo `"Jamaican times"` to `"jamaat times"`.

2. **Unverified Status of Namaz Content:**
   - Updated `docs/DESIGN_QA.md`, `docs/OVERNIGHT_REPORT_2.md`, and `docs/PR_DESCRIPTION_feat-v3-tajweed.md` to state clearly that all Namaz steps, posture descriptions, and supplications are **unverified and pending formal scholar review ("مواد زیرِ نظرِ ثانی")**.
   - Removed claims that content was "verified" or "sourced from authentic classical Hanafi manuals".

3. **Tajweed Dataset Attribution:**
   - Corrected description across documentation: Tajweed color rules are derived from Collin Fair's automated pipeline (`cpfair/quran-tajweed`, CC BY 4.0) mapped to a Dar al-Maarifah-style color scheme, and remain **pending Qari review**.

4. **Kiosk Ayahs Labeling:**
   - Updated `data/kiosk_ayahs.json` description to indicate "well-known ayahs" rather than claiming classical scholarly curation.

---

## 3. Section B: Tajweed Rendering Root Cause & Fix

### Problem in `docs/screenshots/overnight2/`
In `docs/screenshots/overnight2/quran_tajweed_ur_390x844.png`, the Quran text was completely black and monochrome, despite Tajweed mode being enabled in state.

### Root Cause Analysis
In `scripts/capture_design_qa_screenshots.js`, navigation between screens was handled via `page.goto(hash)` or `window.location.hash = hash`. Because the route was `#quran/1/1` for both the normal screen and the tajweed screen, the hash did not change. As a result, the router's `hashchange` event never fired, leaving the rendered DOM unchanged. Additionally, the dark-mode capture loop omitted `showTajweed = true`.

### The Fix (Commit `d2bfa3b`)
1. Modified `scripts/capture_design_qa_screenshots.js` so that `gotoScreen()` explicitly calls `window.baseerahRouter.resolveRoute()` on every screen transition, forcing a clean re-render with active settings.
2. Added strict automated assertions in `scripts/check_responsive.js` and `scripts/test_smoke_114_surahs.js` asserting that:
   - At least 4 `.tj-*` colored span elements exist on Ayah 1:1.
   - The computed CSS color of colored spans is neither pure black (`rgb(0, 0, 0)`) nor default body ink (`rgb(31, 30, 27)`).

### Visual Verification
- **Before:** `docs/screenshots/overnight2/quran_tajweed_ur_390x844.png` (pure ink black text).
- **After:** `docs/screenshots/design_fix/quran_tajweed_ur_390x844.png` (rich Tajweed colors: Madd red `#C62828`, Ghunnah green `#2E7D32`, Qalqalah blue `#0277BD`, Silent grey `#9E9E9E`).

---

## 4. Section C: Mobile (390px) Design Fixes

All 9 mobile design defects were resolved in commit `aa077bc` and verified via Playwright screenshots:

### C.1 Reader Header (Single Clean Row)
- **Defect:** Wrapped into 2–3 crowded lines on 390px. Back button displayed English/Urdu text ("سورتیں"), right side had 6 buttons crowded together.
- **Fix Applied:**
  - Back button converted to icon-only button (40×40 hit target); `.btn-header-back-text` hidden on mobile via `display: none`.
  - Centered surah meta into a single line wrapped in `<bdi>` (Urdu: `سورت ۲ · ۲۸۶ آیات`, English: `Surah 2 · 286 ayahs`).
  - Streamlined right side to exactly two buttons: Play (40×40 circular, `#0E5A47`) and Overflow (40×40 circular, `⋯`, `#btn-quran-overflow`).
  - All toolbar controls (WBW/Mushaf, meaning toggle, Tajweed toggle, speed, reciter, download) accessible via Settings bottom sheet on mobile.
- **Files:** `js/screens/quran.js` (lines 380–485), `css/styles.css` (lines 1680–1760).
- **Verification:** `docs/screenshots/design_fix/quran_wbw_ur_390x844.png`.

### C.2 Navigation Arrows (Font Glyphs Replaced with Inline SVG)
- **Defect:** Chevrons `‹` (U+2039) and `›` (U+203A) rendered as Arabic commas (،) in the Urdu font, confusing users.
- **Fix Applied:** Replaced character glyphs with crisp inline SVG chevrons (`aria-hidden="true"`) across reader, home, and namaz screens.
- **Files:** `js/screens/quran.js`, `js/screens/home.js`, `js/screens/namaz.js`.
- **Verification:** `docs/screenshots/design_fix/quran_wbw_ur_390x844.png`.

### C.3 Word-by-Word (WBW) Tile Geometry
- **Defect:** Tiles had 10px 14px padding, 95px min-width, and an awkward gold divider border (`.tile-gold-divider`), forcing 1–2 words per line.
- **Fix Applied:** Reduced tile padding to `4px 5px`, lowered min-width to `50px`, removed `.tile-gold-divider` (`display: none !important`), and set `justify-content: flex-start` in RTL reading direction.
- **Result:** Surah 1 Ayah 1 (4 words) fits cleanly on 1 line. Surah 2:1–5 fits 3–4 words per line.
- **Files:** `css/styles.css` (lines 2210–2270).
- **Verification:** `docs/screenshots/design_fix/quran_wbw_ur_390x844.png`, `docs/screenshots/design_fix/quran_wbw_en_390x844.png`.

### C.4 Ayah Card Top Row Alignment
- **Defect:** "یاد ہے / Memorized" button had height 46px, misaligning with the 34px bookmark and copy action buttons.
- **Fix Applied:** Reduced `.btn-memorized-toggle` height to 34px compact pill, matching `.btn-ayah-action` pills with unified borders and vertical alignment.
- **Files:** `css/styles.css` (lines 2380–2415).
- **Verification:** `docs/screenshots/design_fix/quran_wbw_ur_390x844.png`.

### C.5 Translation Card Source Label & Link
- **Defect:** Missing clear scholarly source label; "مکمل پڑھیں ↗" looked like an awkward standalone button.
- **Fix Applied:** Added subtle source label (`اردو ترجمہ · مولانا محمد جوناگڑھی`); converted "مکمل پڑھیں ↗" into an inline compact text link with underline.
- **Files:** `js/screens/quran.js` (lines 295–310), `css/styles.css` (lines 2440–2465).
- **Verification:** `docs/screenshots/design_fix/quran_wbw_ur_390x844.png`.

### C.6 Namaz Screen Navigation, Tabs & Posture Overlay
- **Defect:** Back button occupied 80px width, namaz tabs wrapped awkwardly, and on the Takbeer detail card the posture silhouette illustration overlapped the Urdu title.
- **Fix Applied:**
  - Back button converted to 40×40 icon-only button.
  - `.namaz-tab-group` converted to horizontally scrollable pill row (`overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none`).
  - `.detail-header` restructured to column flex on `<600px` so the illustration sits centered above the title with zero overlap.
- **Files:** `css/styles.css` (lines 3260–3320), `js/screens/namaz.js` (lines 130–170).
- **Verification:** `docs/screenshots/design_fix/namaz_steps_ur_390x844.png`.

### C.7 Settings Bottom Sheet Segmented Controls
- **Defect:** Segmented toggles had uneven widths, transparent backgrounds, and active states that were difficult to distinguish.
- **Fix Applied:** Added dedicated `.quran-settings-sheet .mode-pill-toggle` rules giving equal width segments (`flex: 1 1 0%`), primary solid green active state (`#0E5A47` with white text), and muted high-contrast text for inactive state.
- **Files:** `css/styles.css` (lines 3140–3185).
- **Verification:** `docs/screenshots/design_fix/quran_settings_sheet_ur_390x844.png`.

### C.8 Home Screen Hero & Mobile Above-the-Fold Content
- **Defect:** Large 48px calligraphy and a duplicate "Daily Moment" card pushed "Continue Reading" and core 2×2 action cards below the fold.
- **Fix Applied:** Reduced mobile hero calligraphy to 24px, title to 16px, single-line tagline; suppressed duplicate moment card on mobile so "Continue Reading" and 2×2 action tiles appear above the fold on 390×844 without scrolling.
- **Files:** `css/styles.css` (lines 1450–1510).
- **Verification:** `docs/screenshots/design_fix/home_ur_390x844.png`.

### C.9 Attract Screen BDI Numeral Isolation
- **Defect:** Arabic surah name and western numbers mixed in one text node caused parentheses and punctuation to flip or render corrupted.
- **Fix Applied:** Wrapped numbers and names in separate `<bdi>` elements (`<span class="kiosk-ref-name">`, `<span class="kiosk-ref-num">`) with explicit LTR numeral isolation.
- **Files:** `js/screens/attract.js` (lines 120–145).
- **Verification:** `docs/screenshots/design_fix/kiosk_attract_ur_390x844.png`.

---

## 5. Section D: Tablet & Kiosk Viewport Review

Refinements were implemented in commit `da76bed` across tablet and kiosk viewports:

1. **820×1180 (Tablet Portrait):**
   - Constrained reading card to `max-width: 800px`, centered with 40px side margins.
   - Prevents awkward edge-to-edge stretching of word tiles on iPad Air / Android tablets.
   - Verified in `docs/screenshots/design_fix/quran_wbw_ur_820x1180.png`.

2. **1280×800 (Landscape Mosque Kiosk):**
   - Constrained reading card to `max-width: 1100px`, centered with 48px side margins.
   - Desktop navigation arrows positioned comfortably inside the card container.
   - Verified in `docs/screenshots/design_fix/quran_wbw_ur_1280x800.png`.

3. **1920×1080 (Full HD Mosque Wall Display):**
   - Typography scaled proportionally: 40px Arabic font, 24px Urdu translation font, 20px English font, 18px WBW translation.
   - Ensures readability from 3–5 meters away without looking like a phone app scaled up into empty space.
   - Verified in `docs/screenshots/design_fix/quran_wbw_ur_1920x1080.png`.

4. **Automated Responsive Check:**
   - `node scripts/check_responsive.js` executed across all 8 target viewports (360×800, 390×844, 412×915, 768×1024, 820×1180, 1024×768, 1280×800, 1920×1080).
   - **Result:** 0 horizontal overflows, 0 layout clipping errors.

---

## 6. Section E: Test Suite & Official Lighthouse Results

### 6.1 CI Test Suite (`npm run test:ci`)
```
> baseerah@1.0.0 test:ci
> python -m unittest tests/test_build.py tests/test_kiosk.py && python scripts/check_arabic_allowlist.py && node scripts/check_i18n_completeness.js && node tests/test_prayer_times.js && node scripts/check_responsive.js && node scripts/check_a11y_axe.js && node scripts/test_smoke_114_surahs.js && node scripts/test_offline_audio.js

Ran 21 tests in 2.203s — OK
Verified 8958 approved Urdu UI occurrences (0 unapproved).
PASS: All 225 i18n keys are fully mirrored with 100% parity across English and Urdu.
ALL PRAYER TIMES UNIT TESTS PASSED!
Ayah 2:2 rendered with 1 line(s) on 390px.
✅ ALL RESPONSIVE CHECKS PASSED: 0 failures across 8 viewports.
✅ A11y Audit PASSED: Zero serious or critical violations across all tested views.
PASS: All 114 Surahs passed smoke test in both Normal and Tajweed mode at 390x844 (0 errors, 0 overflows, 0 blanks).
PASS: Surah 1 audio download completed successfully.
PASS: LocalStorage metadata updated with downloaded surah.
PASS: Play initiated offline without crashing.
PASS: Downloaded surah listed in Settings Sheet.
PASS: Surah deleted from metadata.
PASS: Download button is properly hidden in kiosk mode.
✅ ALL OFFLINE AUDIO TESTS PASSED!
```

### 6.2 Official Google Lighthouse Audit (Real Measured Scores)
Audited using `lighthouse` (v13.6.0) with headless Chrome via `scripts/run_lighthouse.js`:

| Target Screen | Device | Performance | Accessibility | Best Practices |
|---|---|:---:|:---:|:---:|
| **Home (`#home`)** | Mobile (Moto G4 emulate) | **95** | **100** | **100** |
| **Home (`#home`)** | Desktop | **100** | **96** | **100** |
| **Quran 2:1 (`#quran/2/1`)** | Mobile (Moto G4 emulate) | **64** | **96** | **100** |
| **Quran 2:1 (`#quran/2/1`)** | Desktop | **80** | **100** | **100** |
| **Namaz (`#namaz/steps`)** | Mobile (Moto G4 emulate) | **71** | **100** | **100** |
| **Namaz (`#namaz/steps`)** | Desktop | **100** | **100** | **100** |

*Raw JSON and HTML audit reports are saved in `docs/lighthouse/real/`.*
