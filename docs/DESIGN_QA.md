# Baseerah v3 — Visual Design QA Audit Log

**Date:** November 22, 2026  
**Branch:** `feat/v3-tajweed`  
**Status:** In Progress (Active Fix Round)

---

## 1. Audit Principles
- **No fabricated passes:** This document records only genuine visual issues discovered during inspection of screenshots in `docs/screenshots/overnight2/` across viewports (390×844, 820×1180, 1280×800, 1920×1080) and themes (Light, Dark, Sepia).
- **Diff-backed fixes:** Every entry lists only changes that actually exist in the git diff.
- **Content status:** Namaz step guidance and supplications in `data/namaz/` are **UNVERIFIED and pending formal scholar review**. Tajweed color coding is **automatic tajweed coloring (`cpfair/quran-tajweed`, CC BY 4.0) in a Dar al-Maarifah-style color scheme, pending Qari review**.

---

## 2. Issues Discovered in Screenshot Review & Resolution Tracking

### Issue 1: Tajweed screenshots identical to Normal Mode (No Tajweed Colors)
- **Screenshots affected:** `docs/screenshots/overnight2/quran_tajweed_ur_390x844.png`, `dark_tajweed_ur_390x844.png`
- **Root Cause:** The capture script set `baseerahState.settings = settings` in JS while remaining on `#quran/1/1`, which did not re-render the screen or trigger the real UI toggle.
- **Verification:** When toggled through the real UI (tapping `#btn-toggle-tajweed` or the Settings Sheet toggle), 17 colored spans render in Ayah 1:1 (`tj-ham-wasl`, `tj-laam-shamsiyah`, `tj-madda-normal`, `tj-madda-permissible`).
- **Fix:** Update capture script to interact via real UI actions and assert that colored spans exist; add CI smoke assertion for $\ge 4$ spans in 1:1.
- **Status:** In progress (Section B).

### Issue 2: Reader Header Crowded & Bidi Mixing at 390px
- **Screenshot:** `quran_wbw_ur_390x844.png`, `quran_2_282_ur_390x844.png`
- **Root Cause:** 4 round buttons + "سورتیں" pill + title on small phone widths; subtitle mixes English and Urdu numbers causing bidi jumbling ("٢٨٦٠٢ آیات").
- **Fix:** Consolidate to one row on mobile (back icon only, centered Arabic surah name, play, overflow menu). Build language-isolated subtitles wrapped in `<bdi>`.
- **Status:** In progress (Section C.1).

### Issue 3: Navigation Arrows Rendering as Commas in Urdu
- **Screenshot:** `quran_wbw_ur_390x844.png`
- **Root Cause:** The Indo-Pak font lacks the text chevron/arrow glyph, falling back to a glyph that looks like a comma ("، اگلی آیت").
- **Fix:** Replace text characters with accessible inline SVG chevrons (`aria-hidden="true"`), correctly mirrored in RTL.
- **Status:** In progress (Section C.2).

### Issue 4: Word-by-Word Grid Wasting Space on Mobile
- **Screenshot:** `quran_wbw_ur_390x844.png`
- **Root Cause:** Only 2 word tiles per row with large side margins and internal whitespace.
- **Fix:** Reduce tile padding, remove divider line, size tiles to content (`flex-start` in reading direction), reduce outer card padding to 12px on phones. Target 3–4 tiles per row.
- **Status:** In progress (Section C.3).

### Issue 5: Ayah Card Top Row Alignment
- **Screenshot:** `quran_wbw_ur_390x844.png`
- **Root Cause:** "یاد ہو گئی" pill height differs from bookmark and copy buttons.
- **Fix:** Reduce pill size, align all 3 actions to the same height.
- **Status:** In progress (Section C.4).

### Issue 6: Translation Card Header Too Heavy on Phones
- **Screenshot:** `quran_wbw_ur_390x844.png`
- **Root Cause:** Uppercase title + badge + "Read full ↗" button clutter mobile cards.
- **Fix:** Make translation label a small single line; convert "Read full" to a compact inline text link.
- **Status:** In progress (Section C.5).

### Issue 7: Namaz Screen Layout Defects at 390px
- **Screenshots:** `namaz_steps_ur_390x844.png`
- **Root Cause:** "مرکزی صفحہ" text wraps inside circular button; tab pills wrap to 2 lines; step chips clipped at scroller edge; Takbeer title overlaps placeholder illustration.
- **Fix:** Use icon-only back button with aria-label; make tab bar horizontally scrollable with single-line labels; add padding to step chips scroller; position illustration above title on mobile.
- **Status:** In progress (Section C.6).

### Issue 8: Settings Sheet Segmented Toggles
- **Screenshot:** `sheet_settings_ur_390x844.png`
- **Root Cause:** Big grey pills with low contrast and unclear selected state.
- **Fix:** Rebuild segmented controls with equal-width segments, solid primary background + white text for selected state, $\ge 4.5:1$ contrast on unselected labels, 40–44px height.
- **Status:** In progress (Section C.7).

### Issue 9: Home Screen Hero Consuming Entire First Screen
- **Screenshot:** `home_ur_390x844.png`
- **Root Cause:** Hero card + welcome takes entire viewport before actions are visible.
- **Fix:** Compact hero on mobile (logo + one-line tagline), bringing Continue Reading and core actions (Quran, Namaz, Prayer times) above the fold.
- **Status:** In progress (Section C.8).

### Issue 10: Attract Screen Reference Line Bidi Mixing
- **Screenshot:** `attract_ur_390x844.png`
- **Root Cause:** Reference line combines English and Urdu ("1:1 سورت · Al-Fatihah الفاتحة").
- **Fix:** Render reference per UI language only, wrapped in `<bdi>` with isolated directional flow.
- **Status:** In progress (Section C.9).
