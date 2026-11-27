# Baseerah — Prayer-Time Notifications & Azan Reminders Report

> **Feature Version:** 1.0.0  
> **Target Platforms:** PWA (Android / Desktop / iOS) & Android TWA (Trusted Web Activity)  
> **Status:** Production Ready · 100% Passing CI Tests  

---

## 1. Executive Summary

This release introduces an offline-first, privacy-respecting prayer notification and Azan reminder system for **Baseerah**. The feature provides two synchronized notification tiers:
1. **In-App Real-Time Alerts (App Open / Kiosk Mode):** A calm, non-intrusive banner that displays at the exact prayer time (or configured advance reminder), suppresses automatically during active Quran recitation to protect prayer and recitation sanctity, provides a chime hook, and auto-dismisses after 2 minutes.
2. **Background Web Push Notifications (App Closed / Background / Android TWA):** A serverless Netlify architecture using Netlify Scheduled Functions and Netlify Blobs to calculate prayer times per subscriber using `adhan` and dispatch standards-compliant Web Push notifications via VAPID.

---

## 2. File Manifest

### Client Core & UI
- [`js/core/notifications.js`](file:///c:/Users/usmanbari/Desktop/baseerah/js/core/notifications.js): Notification engine managing client timers, visibility changes, midnight recalculation, audio recitation suppression, chime playback, and push sync.
- [`js/core/storage.js`](file:///c:/Users/usmanbari/Desktop/baseerah/js/core/storage.js): Persistence schema for `prayerNotifications`, `notificationPrayers`, and `notificationOffset`.
- [`js/core/state.js`](file:///c:/Users/usmanbari/Desktop/baseerah/js/core/state.js): Reactive state bindings and subscriber dispatch for notifications settings.
- [`js/core/i18n.js`](file:///c:/Users/usmanbari/Desktop/baseerah/js/core/i18n.js): English & Urdu localization strings for notifications UI, permission help, and alert messages.
- [`js/ui/icons.js`](file:///c:/Users/usmanbari/Desktop/baseerah/js/ui/icons.js): Added custom SVG `bell` icon following the existing inline SVG design system.
- [`js/ui/components.js`](file:///c:/Users/usmanbari/Desktop/baseerah/js/ui/components.js): Settings bottom sheet section with master toggle, remind-me segmented control (At time, 5, 10, 15 min), per-prayer toggles, city picker, and "Use my location".
- [`js/screens/admin.js`](file:///c:/Users/usmanbari/Desktop/baseerah/js/screens/admin.js): Mosque admin controls for prayer notifications.
- [`js/screens/about.js`](file:///c:/Users/usmanbari/Desktop/baseerah/js/screens/about.js): "Notifications & Privacy" zero-tracking notice.
- [`sw.js`](file:///c:/Users/usmanbari/Desktop/baseerah/sw.js): Service Worker `push` and `notificationclick` handlers.
- [`css/styles.css`](file:///c:/Users/usmanbari/Desktop/baseerah/css/styles.css) & [`css/phone.css`](file:///c:/Users/usmanbari/Desktop/baseerah/css/phone.css): Styling for in-app alert banner, settings cards, and responsive phone layouts.

### Netlify Serverless Backend
- [`netlify/functions/vapid-public-key.js`](file:///c:/Users/usmanbari/Desktop/baseerah/netlify/functions/vapid-public-key.js): Securely serves `VAPID_PUBLIC_KEY` to clients (GET/HEAD only).
- [`netlify/functions/push-subscribe.js`](file:///c:/Users/usmanbari/Desktop/baseerah/netlify/functions/push-subscribe.js): Validates payloads, enforces rate limits (max 30 writes/hour per endpoint), and persists subscriptions in Netlify Blobs (`sub_<sha256(endpoint)>`).
- [`netlify/functions/push-unsubscribe.js`](file:///c:/Users/usmanbari/Desktop/baseerah/netlify/functions/push-unsubscribe.js): Deletes subscription from Netlify Blobs.
- [`netlify/functions/push-dispatch.mjs`](file:///c:/Users/usmanbari/Desktop/baseerah/netlify/functions/push-dispatch.mjs): Netlify Scheduled Function (`*/5 * * * *`) calculating times via `adhan`, deduping via tags (`prayer-YYYY-MM-DD-prayer`), sending Web Push, and pruning 410/404 expired subscriptions.
- [`netlify.toml`](file:///c:/Users/usmanbari/Desktop/baseerah/netlify.toml): Configures `functions = "netlify/functions"` and CSP directives.
- [`.env.example`](file:///c:/Users/usmanbari/Desktop/baseerah/.env.example): Template for local development and Netlify deployment variables.

### Documentation & Verification
- [`docs/NOTIFICATIONS_SETUP.md`](file:///c:/Users/usmanbari/Desktop/baseerah/docs/NOTIFICATIONS_SETUP.md): Operational guide, production deployment steps, and TWA verification.
- [`tests/test_prayer_scheduler.js`](file:///c:/Users/usmanbari/Desktop/baseerah/tests/test_prayer_scheduler.js): Unit tests for scheduler logic (fixed dates, offsets, rollover, DST-free Asia/Karachi).
- [`tests/test_push_functions.js`](file:///c:/Users/usmanbari/Desktop/baseerah/tests/test_push_functions.js): Unit & integration tests for Netlify functions (validation, rate-limiting, dispatch, 410 pruning).
- [`tests/test_notifications_playwright.js`](file:///c:/Users/usmanbari/Desktop/baseerah/tests/test_notifications_playwright.js): Playwright E2E tests for settings viewports (360px & 1366px), permission denial, `page.clock` in-app alerts, and recitation suppression.

---

## 3. Architecture & Technical Decisions

### In-App vs. Background Sync
- **When App Is Open:** The client single-timer scheduler runs entirely in the browser using the client's local `PrayerEngine`. When prayer time arrives, an in-app banner is injected at the top of the viewport (`#prayer-alert-banner`).
- **Recitation Audio Suppression:** If the user is actively reciting or listening to Quran recitation (`audioManager.isPlayingAyah === true`), the banner is held in `pendingAlert` and only displayed once recitation pauses or ends.
- **Kiosk Mode Isolation:** In Kiosk mode (`state.isKiosk === true`), background web push is completely disabled; only in-app visual banners appear, respecting `mosqueMute`.

### Data Privacy & Storage
- Netlify Blobs stores only:
  - Push endpoint & encryption keys (`p256dh`, `auth`).
  - Truncated coordinates (rounded to 2 decimal places, ~1.1 km precision).
  - Selected calculation method, madhab, and timezone.
  - Enabled prayer bitflags and reminder offset (0, 5, 10, or 15 minutes).
  - List of `sentTags` (last 20 entries) for idempotent deduplication.
- Zero analytics, zero IP logging, zero names, zero emails.

### Scheduled Dispatch & Free Tier Math
- Netlify Scheduled Function cron runs every 5 minutes (`*/5 * * * *`).
- In a 30-day month, `12 runs/hour * 24 hours * 30 days = 8,640 invocations/month`.
- Netlify free tier permits **125,000 function invocations per month**.
- Dispatch consumption uses only **~6.9%** of the free-tier quota, leaving ample capacity for user subscribe/unsubscribe requests.

---

## 4. Production Deployment & Netlify Setup

1. **Generate VAPID Keys locally:**
   ```bash
   npx web-push generate-vapid-keys
   ```
2. **Configure Netlify Environment Variables:**
   In your Netlify Site Dashboard (`Site Configuration > Environment Variables`), add:
   - `VAPID_PUBLIC_KEY`: `<Your generated VAPID public key>`
   - `VAPID_PRIVATE_KEY`: `<Your generated VAPID private key>`
   - `VAPID_SUBJECT`: `mailto:admin@yourdomain.com`
3. **Blobs Provisioning:**
   Netlify Blobs is enabled automatically in modern Netlify projects with zero additional setup.

---

## 5. Physical Phone Testing Guide (Android TWA)

1. Verify `/.well-known/assetlinks.json` matches your APK signing fingerprint (`BD:74:25:30:D0:0E:55:F0:4C:30:67:AC:9D:22:53:B4:4D:DB:12:D1:1D:C9:4E:A0:A2:0E:42:1E:BE:A3:4B:79`).
2. Install the signed TWA APK on your physical Android device.
3. Open the app: the URL bar must be absent (Digital Asset Links verified).
4. Tap the Settings icon in the Quran reader or Home screen.
5. Under **Prayer Notifications**, tap **On**:
   - The OS notification permission dialog will appear. Tap **Allow**.
   - The toggle turns active and the details pane unlocks.
6. Test in-app alert: Keep the app open; at prayer time, the top banner appears with chime.
7. Test background alert: Close the app completely or lock the device. Within the 5-minute cron window, the system notification appears with the prayer title, time, and "It's time for prayer". Tapping it launches the TWA directly into `#home`.

---

## 6. Limitations & Edge Cases

1. **Closed App Audio:** Operating systems (Android, iOS) restrict web push notifications from playing arbitrary long custom audio when the browser/app process is terminated. Closed-app notifications play the device's default system notification tone. Custom chime audio plays when the app is active in the foreground.
2. **5-Minute Dispatch Jitter:** Because Netlify Scheduled Functions trigger on 5-minute cron boundaries, background notifications dispatch within a ±3 minute window around the prayer time. The notification title always reflects the exact calculated prayer time (e.g. `Maghrib · 5:01 PM`).
3. **iOS Requirements:** On iOS (16.4+), Web Push requires the user to add the PWA to their Home Screen ("Add to Home Screen").

---

## 7. Automated Test Suite Execution Output

Below is the verified test run showing all 20 test suites in `npm run test:ci` passing 100%:

```text
> baseerah@1.0.0 test:ci
> python -m unittest tests/test_build.py tests/test_kiosk.py && python scripts/check_arabic_allowlist.py && python scripts/check_shaping_harfbuzz.py && node scripts/check_i18n_completeness.js && node tests/test_prayer_times.js && node tests/test_bidi_isolation.js && node tests/test_theme_default.js && node tests/test_tajweed_css_guard.js && node tests/test_toolbar_pills.js && node tests/test_audio_state.js && node scripts/check_responsive.js && node scripts/check_a11y_axe.js && node scripts/test_smoke_114_surahs.js && node scripts/test_offline_audio.js && node scripts/test_offline_start_page.js && node tests/test_glyph_integrity.js && node tests/test_no_raw_i18n_keys.js && node tests/test_prayer_scheduler.js && node tests/test_push_functions.js && node tests/test_notifications_playwright.js

.....................
----------------------------------------------------------------------
Ran 21 tests in 2.021s

OK
============================================================
Baseerah Arabic Script CI Allowlist Checker
============================================================
Verified 9063 approved Urdu UI occurrences.
✓ All Arabic-script occurrences match the approved allowlist (no hand-typed Quran text).

=== HarfBuzz Full-Quran Shaping Integrity Check ===
Loaded 6236 ayahs across all 114 Surahs.

Font: Tajweed Uthmani (Amiri Quran) (amiri-quran.ttf)
  Total ayahs shaped: 6236
  Total shaped glyphs: 693549
  .notdef glyphs: 0
  Empty base glyphs: 0
  PASS: 100% clean HarfBuzz shaping (0 .notdef, 0 empty base letters).

Font: Indo-Pak Nastaleeq (QUL) (indopak-nastaleeq-qul.ttf)
  Total ayahs shaped: 6236
  Total shaped glyphs: 717059
  .notdef glyphs: 0
  Empty base glyphs: 0
  PASS: 100% clean HarfBuzz shaping (0 .notdef, 0 empty base letters).

✅ SUCCESS: All 6,236 ayahs passed HarfBuzz shaping in both fonts!
   Amiri Quran: 693549 glyphs | Indo-Pak: 717059 glyphs

=== Checking i18n Completeness & Script Integrity ===
PASS: All 258 i18n keys are fully mirrored with 100% parity across English and Urdu.

=== Running Prayer Times Engine Unit Tests ===
PASS: Nov 21, 2026 Lahore times match ground truth.
PASS: March 1, 2026 Lahore times match ground truth.
PASS: June 21, 2026 Lahore times match ground truth.
ALL PRAYER TIMES UNIT TESTS PASSED!

✅ ALL BIDI ISOLATION & PRAYER DIGITS TESTS PASSED!

Running Default Light Theme & Migration Tests...
  ✓ Test 1 Passed: Fresh user on dark OS renders light theme
  ✓ Test 2 Passed: v2 system theme migrates to v3 light
  ✓ Test 3 Passed: User explicit dark theme override preserved
  ✓ Test 4 Passed: Kiosk mode defaults to Light
ALL THEME DEFAULT & MIGRATION TESTS PASSED!

=== Tajweed CSS Invariants Guard Test ===
  PASS: Zero forbidden static CSS properties on tajweed text spans.
  PASS: All live Tajweed spans computed to valid inline cursive values.
✅ ALL TAJWEED CSS GUARD CHECKS PASSED!

=== Baseerah Toolbar & Segmented Controls Invariants Test ===
✅ ALL 264 TOOLBAR & SEGMENTED CONTROL INVARIANT CHECKS PASSED!

Audio state regression test passed.

=== Responsive QA Viewport & Overflow Check ===
✅ ALL 16 VIEWPORT & SCREEN RESPONSIVE CHECKS PASSED! Zero unexpected scrollbars or clipped text.

=== Running Automated Accessibility Audit (Axe-Core) ===
Axe results: 0 violations, 0 incomplete on /#home
Axe results: 0 violations, 0 incomplete on /#surahs
Axe results: 0 violations, 0 incomplete on /#quran/1/1
Axe results: 0 violations, 0 incomplete on /#quran/2/255
Axe results: 0 violations, 0 incomplete on /#namaz
Axe results: 0 violations, 0 incomplete on /#about
Axe results: 0 violations, 0 incomplete on /#admin
Axe results: 0 violations, 0 incomplete on /#attract
Accessibility check PASSED. Zero critical or serious a11y violations found across 8 key screens.

=== Running 114 Surahs Smoke Test ===
✅ All 114 Surahs passed smoke test! (0 missing files, 0 hash mismatches, 0 parse errors)

=== Offline Audio Cache & Fallback Verification ===
PASS: 100% of offline audio checks verified.

=== Offline Start Page & Service Worker Cache Verification ===
PASS: Start page (/) cached with status 200 and Cache-Control: max-age=0, must-revalidate.
PASS: All critical static assets and navigation fallback are offline-ready.

=== Glyph Integrity & Visual Regression Test ===
Step 1: Checking font cmap tables...
  PASS: All verified characters mapped in both fonts.
Step 2: Preparing sample ayahs for pixel-by-pixel rendering...
  PASS: 100% of tested ayahs have identical glyph rendering (< 0.6% grayscale diff).
✅ ALL GLYPH INTEGRITY CHECKS PASSED!

=== Checking for Leaked Raw i18n Keys Across All Screens ===
✅ PASS: Zero raw i18n keys or template leaks detected across all tested views in Urdu and English.

=== Running Prayer Scheduler Unit Tests ===
  PASS: Morning alert schedules Dhuhr
  PASS: 0, 5, 10, 15 minute reminder offsets computed accurately
  PASS: Day boundary rollover (after Isha -> tomorrow Fajr)
  PASS: Per-prayer disabled filters respected
  PASS: Asia/Karachi is confirmed DST-free (UTC+5 year-round)
  PASS: Sent-tag deduplication logic verified
✅ ALL PRAYER SCHEDULER UNIT TESTS PASSED!

=== Running Netlify Push Functions Unit & Integration Tests ===
1. Testing push-subscribe.js payload validation...
  PASS: Payload validation handles valid & invalid inputs correctly
2. Testing push-subscribe.js HTTP handler & rate limiting...
  PASS: 30 requests/hour rate limiting enforced
3. Testing push-unsubscribe.js handler...
  PASS: push-unsubscribe successfully deletes record from store
4. Testing push-dispatch.mjs dispatch logic...
  PASS: Dispatch sent notification and deduplicated on subsequent run
5. Testing push-dispatch.mjs pruning on 410 Gone...
  PASS: 410 Gone automatically pruned expired subscription from blob store
✅ ALL NETLIFY PUSH FUNCTIONS TESTS PASSED!

=== Running Baseerah Notifications Playwright Tests ===
1. Testing Settings UI at 360px and 1366px viewports...
  PASS: Settings UI fully rendered at 360px mobile
  PASS: Settings UI fully rendered at 1366px desktop
2. Testing permission denial handling...
  PASS: Permission denial flips toggle off and displays help text
3. Testing in-app prayer alert banner & page.clock...
  PASS: In-app banner triggered by clock, dismissed by user, and auto-hidden after 2 min
4. Testing recitation audio alert suppression...
  PASS: Alert banner suppressed during recitation and shown immediately upon pause/completion
✅ ALL NOTIFICATIONS PLAYWRIGHT TESTS PASSED!
```
