# Pull Request: Baseerah v3 — Tajweed Colours, Continuous Recitation, Offline Audio & Mosque Kiosk Architecture

**Branch:** `feat/v3-tajweed`  
**Base:** `feat/redesign-v2`  
**Status:** Ready for Review / Verification  
**CI Status:** 100% Green (`npm run test:ci` passing all 8 automated suites)

---

## 1. Executive Summary

Baseerah v3 transforms the commercial mosque kiosk and mobile web application into a complete Islamic Quran reading and recitation experience. It introduces **automatic tajweed coloring** (cpfair/quran-tajweed, CC BY 4.0) in a Dar al-Maarifah-style color scheme, pending Qari review, for all 6,236 ayahs of the Noble Quran (Uthmani script), **full-surah continuous audio recitation**, **offline audio downloading for mobile devices**, a dedicated **mosque kiosk mode** with an attract screensaver and offline prayer times engine, **reading comfort modes** (Dark and Sepia with WCAG AA calibrated hues), and **production security hardening**.

All features operate **100% offline** after initial load, with zero paid APIs, zero tracking/analytics, and zero hand-typed Quran text.

---

## 2. Key Features Implemented

### A. Real Tajweed Colour-Coding (Whole Quran — 6,236 Ayahs)
- **Automatic Tajweed Coloring:** Implements automatic tajweed coloring (`cpfair/quran-tajweed`, CC BY 4.0) in a Dar al-Maarifah-style color scheme, pending Qari review (Uthmani script).
- **Zero Runtime API:** All 6,236 ayahs pre-processed at build time via `scripts/build_tajweed_dataset.py`. Zero network overhead or runtime API dependency.
- **Dual-Script Architecture:**
  - *Normal Mode:* Authentic Indo-Pak Nastaliq script (`AlQuran IndoPak`), pure ink.
  - *Tajweed Mode:* Uthmani script (`Noto Naskh Arabic`), letter-level Tajweed color annotations.
- **Integrity Verified:** Stripping HTML markup produces the original base text byte-for-byte.
- **Comprehensive Legend Bottom Sheet:** Interactive bottom sheet detailing all 6 Tajweed categories (Madd, Ghunnah, Ikhfa, Qalqalah, Tafkheem, Silent letters) with color swatches, counts, rules, and Quranic examples.

### B. Full-Surah Recitation & Continuous Player
- **Continuous Ayah Playback:** Automatically transitions seamlessly from ayah to ayah across the entire surah.
- **Bismillah Header Recitation:** Plays authentic standalone Bismillah before Ayah 1 (except Surah At-Tawbah).
- **Word-Level Highlighting:** Synced word highlights and auto-scroll keep the active word centered.
- **Playback Controls:** Multi-speed selector (0.75x, 1.0x, 1.25x, 1.5x), repeat modes (Single Ayah, Ayah Range, Surah loop), and reciter selection.
- **Floating Mini Player:** Fixed bottom playback bar with progress, play/pause, and skip controls across all views.

### C. Offline Audio for Phones & Personal Devices (Non-Kiosk)
- **Download Surah Audio:** Download full surah recitation directly to device storage via Cache API (`baseerah-offline-audio-v1`).
- **Progress Tracking & Cancellation:** Real-time progress display `(Ayah X / Y) (Size MB)` with instant cancellation.
- **Offline Playback:** Seamless playback of cached blobs when offline without network access.
- **Storage Management in Settings:** View storage usage in MB, persist storage permission button, and delete downloaded surahs.
- **Kiosk Discipline:** Download buttons and storage management are strictly hidden when `isKiosk: true`.

### D. Mosque Kiosk Features
- **Attract / Screensaver Mode (`#attract`):**
  - Fullscreen ambient dark interface for idle kiosk displays.
  - Displays verified short positive Quranic ayahs (`data/kiosk_ayahs.json`, clearly flagged as pending scholar review).
  - Rotates every 60 seconds with subtle position drift to prevent OLED/display burn-in.
  - Tap anywhere returns instantly to Home.
  - Controlled by `IdleDetector` (`js/core/idle.js`), active only when `isKiosk: true`.
- **Offline Prayer Times Engine (`js/core/prayer-times.js`):**
  - Powered by Batoul Apps' `adhan` (v4.4.6, MIT, 15 KB ES module).
  - 100% offline mathematical astronomical calculation based on latitude/longitude.
  - Default calculation: University of Islamic Sciences, Karachi, with Hanafi Asr standard.
  - Prayer card on Home screen displaying current prayer, next prayer countdown, and manual Iqamah times.
  - "Use my location" GPS button for mobile phone users.
- **Hardened Admin Panel (`#admin`):**
  - 6-digit PIN authentication with salted SHA-256 hashing and 60-second lockout after 5 failed attempts.
  - PIN change workflow.
  - Section visibility toggles (Quran, Namaz, Prayer Times).
  - Configurable idle timeout, default reciter, default translation, and mosque GPS coordinates.
  - Factory reset button.

### E. Reading Comfort & Accessibility
- **Dark / Night Mode:** Warm paper-dark background (`#121215` / `#1E1E24`) with soft text (`#F3F4F6`). Tajweed color hues specifically lightened and calibrated to achieve $\ge 4.5:1$ contrast against dark surfaces.
- **Sepia Reading Mode:** Warm ivory parchment (`#F4ECD8` / `#FBF6E9`) with dark sepia ink (`#3C2F1D`) for strain-free reading.
- **Theme Selector:** 4-option segmented toggle (`System` / `Light` / `Dark` / `Sepia`) in Settings sheet, respecting `prefers-color-scheme`.
- **Screen Wake Lock API (`WakeLockManager`):** Keeps screen awake while reading Quran or listening to audio recitation. Releases after 2 minutes of idle or when navigating away.
- **A11y Touch Targets:** All interactive elements audited and enforced to $\ge 44\times 44$px.

### F. Production Hardening
- **Strict Content Security Policy (CSP):** Configured in `netlify.toml` with `default-src 'self'`, `media-src https://*.everyayah.com https://*.qurancdn.com blob:`, `connect-src 'self' blob:`, and `object-src 'none'`.
- **Security Headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Global Error Boundary:** Graceful bilingual fallback with Reload button, catching uncaught runtime exceptions.
- **Offline Indicator:** Polite banner `#offline-indicator` and online recovery toast.
- **404 Route Screen:** Dedicated `#notfound` screen with friendly bilingual recovery button.

---

## 3. Data Sources & Attributions

| Asset / Content | Source / Author | License | Usage in Baseerah |
|---|---|---|---|
| **Quran Base Text (Uthmani)** | Tanzil Project (Hamid Zarrabi-Zadeh) | CC BY 3.0 | Verified base Uthmani text |
| **Quran Base Text (Indo-Pak)** | QuranWBW (Ayman Siddiqui) / QUL | Community Sadaqah-e-Jaria | Authentic Indo-Pak Nastaliq text |
| **Word-by-Word Translations** | Dr. Farhat Hashmi (UR) & Dr. Shehnaz Shaikh / Kausar Khatri (EN) | Community Open Source | Word-by-word meanings |
| **Full Translations** | Maulana Muhammad Junagarhi (UR) & Saheeh International (EN) | QuranEnc / KFGQPC Terms (1–7) | Scholarly ayah translations |
| **Tajweed Annotations** | Collin Fair (`cpfair/quran-tajweed`) | CC BY 4.0 | Rule offsets & Uthmani tags |
| **Audio Recitation** | EveryAyah / Sheikh Mishary Rashid Alafasy | Public Islamic Distribution | Human Murattal audio streams |
| **Prayer Times Library** | Batoul Apps (`adhan` v4.4.6) | MIT License | Offline prayer time calculations |

---

## 4. Test Suite Coverage & CI Verification

Baseerah v3 enforces 8 automated CI test suites via `npm run test:ci`:

1. **Python Unit Tests (`tests/test_build.py`, `tests/test_kiosk.py`):** 21 passing tests verifying build outputs, Tanzil integrity, and kiosk settings.
2. **Arabic Allowlist Guard (`scripts/check_arabic_allowlist.py`):** 8,954 approved Urdu UI occurrences verified; zero unapproved Arabic strings.
3. **i18n Key Parity Check (`scripts/check_i18n_completeness.js`):** All 225 keys verified with 100% parity across English and Urdu.
4. **Prayer Times Verification (`tests/test_prayer_times.js`):** Ground-truth verification of Karachi calculation across Lahore seasonal dates.
5. **Responsive Check (`scripts/check_responsive.js`):** 8 viewports (360×800 to 1920×1080) verified for zero horizontal overflow and bottom bar clearance.
6. **Axe-Core Accessibility Audit (`scripts/check_a11y_axe.js`):** 6 core views verified with zero serious or critical WCAG AA violations.
7. **114-Surahs Smoke Test (`scripts/test_smoke_114_surahs.js`):** All 114 surahs verified in both Normal and Tajweed mode at 390×844 under CSP headers.
8. **Offline Audio Playwright Test (`scripts/test_offline_audio.js`):** Verifies download, offline playback, cache deletion, and kiosk hiding.

---

## 5. Items Pending Scholar / Qari Review

In accordance with Baseerah's strict Golden Rules, all items involving religious categorization or rule interpretations are transparently documented and flagged for formal review before public release:

1. **684 Madd Disagreements (Obligatory Mottasel vs Munfasil on Connected Ligatures):**
   - Detailed in `docs/tajweed_disagreements.md`.
   - In Uthmani orthography, vocative `يَٰٓأَيُّهَا` and Waw al-Jama'ah with silent alif `قَالُوٓا۟ أَنَّمَا` are written as connected ligatures. Quran.com tags them as `madda_obligatory_mottasel`, while `cpfair` tags them as `madd_munfasil` based on linguistic word separation.
2. **Orthographic Variant in Surah Yusuf (12:39, 12:41):**
   - `يَٰصَىٰحِبَىِ ٱلسِّجْنِ` spelling variation between Tanzil 2017 base text and v1.1.
3. **Lam Shamsiyyah Exceptions:**
   - Color tagging of initial Lam in `ٱللَّه` and relative pronouns `ٱلَّذِى`.
4. **Kiosk Screensaver Ayah Selection (`data/kiosk_ayahs.json`):**
   - 10 short, uplifting Quranic ayahs selected for mosque ambient display (flagged as "Pending scholar review" in UI).
5. **Namaz Procedural Guidance & Translations:**
   - Step descriptions and supplications in `data/namaz/` are UNVERIFIED and pending formal scholar review (flagged as "Under scholarly review" in UI).
6. **Educational Tajweed Definitions:**
   - Rule summaries in the Tajweed Legend Bottom Sheet (prominently labeled: *"Based on Hafs 'an 'Asim tajweed rules — scholar review recommended"*).
