# Baseerah — Prayer-Time Notifications & Web Push Setup Guide

This document describes how to configure and deploy background Web Push notifications for Baseerah using Netlify Functions, Netlify Blobs, and the Service Worker.

---

## 1. Generating & Configuring VAPID Keys

Web Push relies on the VAPID (Voluntary Application Server Identification) protocol. A public/private keypair must be generated once and stored securely in Netlify environment variables.

### Step 1: Generate Keys
Run the following command in your terminal:
```bash
npx web-push generate-vapid-keys
```

Example output:
```text
Public Key:
<YOUR-PUBLIC-KEY (starts with B, ~87 characters)>

Private Key:
<YOUR-PRIVATE-KEY (~43 characters) — never share or commit this>
```

### Step 2: Add Environment Variables in Netlify
1. Log in to [Netlify](https://app.netlify.com) and navigate to your site.
2. Go to **Site configuration** → **Environment variables**.
3. Click **Add a variable** and add the following:
   - `VAPID_PUBLIC_KEY`: Paste your generated Public Key.
   - `VAPID_PRIVATE_KEY`: Paste your generated Private Key (keep this secret; never commit it).
   - `VAPID_SUBJECT`: Set to an email or contact URL (e.g. `mailto:support@baseerah.app` or `mailto:owner@example.com`).
4. Trigger a new deploy or deploy from git for the environment variables to take effect.

---

## 2. Architecture & Components

```
┌─────────────────────────────────┐
│     Client (Browser / TWA)      │
│  - PushManager subscription     │
│  - In-app alert banner          │
│  - Settings Sheet / Admin       │
└───────────────┬─────────────────┘
                │ POST /push-subscribe
                ▼
┌─────────────────────────────────┐
│  Netlify Functions & Blobs      │
│  - push-subscribe.js (validate) │
│  - push-unsubscribe.js (prune)  │
│  - Blobs store (coarse coords)  │
└───────────────┬─────────────────┘
                │ Scheduled Cron (*/5 * * * *)
                ▼
┌─────────────────────────────────┐
│     push-dispatch.mjs           │
│  - Adhan prayer calculation     │
│  - Web-push delivery (VAPID)    │
│  - Deduplication via sentTags   │
│  - Prunes 404/410 subscriptions │
└───────────────┬─────────────────┘
                │ Web Push Protocol
                ▼
┌─────────────────────────────────┐
│       Service Worker (sw.js)    │
│  - push event listener          │
│  - notificationclick -> /#home  │
└─────────────────────────────────┘
```

1. **`/.netlify/functions/vapid-public-key`**: Returns the public key to clients without exposing secrets.
2. **`/.netlify/functions/push-subscribe`**: Validates payload strictly, rate-limits per endpoint hash (max 30 writes/hour), and stores in Netlify Blobs (`sub_<hash>`).
3. **`/.netlify/functions/push-unsubscribe`**: Deletes the subscription record from Netlify Blobs.
4. **`/.netlify/functions/push-dispatch.mjs`**: Netlify Scheduled Function (`*/5 * * * *`). Iterates subscriptions, computes today's prayer times in subscriber timezone using `adhan`, and delivers web push for prayers matching `[now - 3min, now + 3min]`.
5. **`sw.js`**: Listens for `push` events and displays system notification with `icons/icon-192.png`. On click, focuses the open window or opens `/#home`.

---

## 3. Scheduled Function Interval & Netlify Free Tier Limits

- **Schedule Interval:** `*/5 * * * *` (runs every 5 minutes).
- **Free Tier Invocations:**
  - Invocations per hour: 12
  - Invocations per day: $12 \times 24 = 288$
  - Invocations per month (30 days): $288 \times 30 = 8,640$
  - Netlify Free Tier Allowance: **125,000 function requests/month**.
  - Total usage is only **~6.9%** of the monthly free allowance, leaving ample quota for user traffic and client API calls.
- **Why not 1 minute?** 1-minute cron expressions (`* * * * *`) consume 43,200 invocations per month and are frequently restricted or subject to throttling on serverless free tiers. A 5-minute interval provides reliable execution with minimal resource footprint.

---

## 4. Testing on Phone via Android TWA

Baseerah runs as a Trusted Web Activity (TWA) on Android. Chrome handles background push and notification delegation automatically.

### Testing Steps:
1. Ensure the APK is installed on your Android device (or test in Chrome on Android).
2. Open Baseerah and navigate to Reader Settings (or Admin).
3. Toggle **Prayer notifications** ON. Android will prompt: `"Baseerah would like to send you notifications"`.
4. Tap **Allow**.
5. Change the reminder offset (e.g., 5 min before or at prayer time).
6. To test immediate delivery:
   - Check the subscriber record in Netlify Blobs.
   - Manually trigger `push-dispatch` or adjust the device clock / prayer times to the upcoming prayer minute.
   - Lock the phone or put the app in the background.
   - The phone receives the system notification with the Baseerah logo.
   - Tapping the notification opens or focuses Baseerah directly at the Home / Prayer Times card.

---

## 5. System Limits & Honest Constraints

1. **Background Sound on Mobile:** When the app is closed, Android plays the user's default system notification sound or ringtone. Web Push cannot play custom multi-minute audio files (such as a full 3-minute Azan) in the background while the screen is locked; playing extended background audio requires a native Android foreground service.
2. **Timing Window:** Because the background dispatcher runs every 5 minutes, delivery occurs within ±2.5 minutes of the calculated prayer minute.
3. **In-App Experience:** When the app is actively open, Baseerah provides an immediate, exact in-app banner with smooth slide-down animation, dismiss action, and optional recitation suppression.

## Update (Nov 2026): server fix and new reminders

- **Bug fixed:** the old functions silently kept subscriptions in temporary memory (CommonJS `require` inside an ES module, and Netlify Blobs used without Lambda context), so the dispatcher never found any phone. All push functions are now modern Netlify Functions (`.mjs`) that import `@netlify/blobs` directly. Shared code: `netlify/lib/push-common.mjs`.
- **New reminders** (per phone, sent by `push-dispatch` every 5 minutes, once per day each):
  - Daily Quran reminder (default 07:00 local time, adjustable in Settings). Opens `/#continue`, which jumps to the last-read ayah. The text is a short ayah translation taken from `data/featured_ayahs.json` (generated into `netlify/lib/daily-ayahs.mjs` by `scripts/build_daily_ayahs.py`).
  - Friday Surah Al-Kahf reminder at 09:00 local time. Opens `/#quran/18/1`.
- **Test endpoint:** `POST /.netlify/functions/push-test` with `{ subscription }` sends one test notification (rate limited). Used by Settings → "Send test notification".
- Phones re-register on every app start, so existing users are picked up automatically after this update.
- Kiosk mode still never subscribes to background push.

### Nov 2026 (second update)
- Default city is Islamabad (settings v5 moves phones still on the untouched Lahore default).
- Prayer reminders now say which prayer is next ("Next: Maghrib at 5:00 PM").
- Daily Quran reminder has two buttons: "Read now" and "In 1 hour" (`POST /.netlify/functions/push-snooze`; the dispatcher sends one follow-up).
- Optional "Fajr ending alert" 20 minutes before sunrise (off by default).
- Daily ayah pool: 25 complete, short ayahs, generated from `data/surahs/*.js` by `scripts/build_daily_ayahs.py` (fragments and ayahs over 170 characters are skipped so nothing is cut).
