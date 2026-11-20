# Changelog

All notable changes to **Baseerah (بصيرة)** will be documented in this file.

The project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-20

### Commercial Mosque Kiosk Edition (Milestones M0 through M7 Complete)

#### Sacred Quran Data & Validation (M0)
- Verified all 114 Surahs and 6,236 Ayahs against Tanzil CC BY 3.0 ground truth text.
- Integrated authentic Indo-Pak Nastaleeq word-by-word script (QUL 59) and ayah script (QUL 89) with 435 PUA glyph mappings.
- Replaced hand-typed Bismillah in `index.html` with byte-for-byte extracted `window.BASEERAH_BISMILLAH` from QUL 89.
- Renamed font to `fonts/indopak-nastaleeq-qul.ttf` and audited TTF metadata.
- Documented strict Check 3a reference exceptions (`5:52`, `11:13`, `80:25`) in `scripts/known_exceptions.json` marked `"reviewed_by": "pending-hafiz"`.
- Created interactive reviewer suite `review.html` and full A4 print-ready proof sheet `export/board_review_quran.html` for Punjab Quran Board submission.
- Created `docs/LICENSES_AUDIT.md`, `docs/LEGAL_PK.md`, and permission email drafts for Acme One.

#### Modern Kiosk Architecture & PWA (M1)
- Refactored frontend into native ES modules (`js/core/`, `js/screens/`, `js/ui/`).
- Implemented SHA-256 data integrity guard (`js/core/integrity.js`) verifying `data/manifest.sha256.json`.
- Implemented Service Worker (`sw.js`) and Web App Manifest (`manifest.json`) for 100% offline kiosk operation.
- Added Kiosk lockdown rules (context menu disabled, pinch-zoom disabled, text selection disabled).
- Implemented Hidden Admin Panel triggered by 5 rapid taps on brand mark with PIN protection (default: `1234`).
- Added ambient Attract screen (screensaver) with live clock, rotating Ayah of the Moment, and touch-to-wake.

#### Commercial Design System & Elder Usability (M2)
- Created `css/tokens.css` with Mosque Emerald and Gold color palette.
- Added strict RTL and LTR layout mirroring for Urdu and English.
- Implemented 3-level Elder Readability font scaling (`A / A+ / A++`) with persistent state.
- Enforced 56px+ touch targets on all interactive controls.
- Created `data/featured_ayahs.json` extracted byte-for-byte from built Quran data.

#### Best-in-Class Quran Reading (M3)
- Implemented dual reading modes:
  - **Word-by-Word Mode:** interactive word tiles with Urdu & English meanings, selected word inspector, and full translation citations.
  - **Mushaf Continuous Reading Mode:** flowing ayah text in authentic Indo-Pak Nastaleeq; tapping any ayah opens a smooth Bottom Sheet with translations and word breakdown.
- Added 30 Juz / Para navigation (`data/juz.js`) with traditional Urdu para names (الم, سیقول, تلک الرسل, etc.).
- Added 56px touch numeric keypad dialog for direct "Go to Ayah" jumping.

#### Audio Architecture & Mosque Respect Setting (M4)
- Implemented `AudioManager` (`js/core/audio.js`).
- Added "Mosque Respect Setting" in Admin panel: global mute toggle enforcing absolute silence in mosque prayer halls.

#### Modular Namaz Learning (M5)
- Restructured Namaz content into modular JSON files (`data/namaz/wudu.json`, `data/namaz/steps.json`, `data/namaz/rakats.json`, `data/namaz/duas.json`).
- Added minimalist line-art SVG silhouettes for prayer postures (Qiyam, Ruku, Qawmah, Sujood, Jalsah, Tashahhud, Salam) compliant with Islamic etiquette (no facial features or anatomical realism).
- Displayed persistent Amber Scholar Review Notice.

#### Quality Bar, Tests & Analytics (M6)
- Built automated CI workflow (`.github/workflows/ci.yml`).
- Added comprehensive unit test suites (`tests/test_build.py` and `tests/test_kiosk.py`).
- Added Playwright E2E test suite (`tests/e2e/kiosk.spec.js`).
- Implemented privacy-safe local interaction logging with CSV export in Admin panel.

#### Production Release & Documentation (M7)
- Created automated release packager `scripts/release.py` generating `release/baseerah-v1.0.0.zip`.
- Created comprehensive `docs/DEPLOYMENT.md` for Android Fully Kiosk and Chrome kiosk setups.
- Created `docs/CONTENT_REVIEW.md` for official provincial Quran board certification.
