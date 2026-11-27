/**
 * tests/test_notifications_playwright.js
 * Playwright E2E tests for Baseerah prayer-time notifications:
 * 1. Settings UI rendered at 360px and 1366px viewports.
 * 2. Permission denial path: simulated denied permission flips toggle off and shows help text.
 * 3. In-app banner: page.clock advances to prayer time -> banner appears, dismiss button works, auto-hides after 2 min.
 * 4. Recitation audio suppression: banner suppressed while audio is playing, shows when playback ends.
 */

const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const PORT = 8142;
const TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404);
    return res.end("Not Found");
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening on http://localhost:${PORT}`);

  const browser = await chromium.launch({ args: ["--no-sandbox"] });

  try {
    console.log("=== Running Baseerah Notifications Playwright Tests ===\n");

    // -----------------------------------------------------------------
    // TEST 1: Settings UI at 360px (mobile) and 1366px (desktop/kiosk)
    // -----------------------------------------------------------------
    console.log("1. Testing Settings UI at 360px and 1366px viewports...");
    for (const vp of [{ width: 360, height: 800, name: "360px mobile" }, { width: 1366, height: 768, name: "1366px desktop" }]) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, serviceWorkers: "block" });
      const page = await context.newPage();
      await page.goto(`http://localhost:${PORT}/#quran/1/1`);
      await page.waitForSelector(".screen-quran-v2", { timeout: 10000 });

      // Open settings bottom sheet
      await page.evaluate(() => {
        if (window.UIComponents && window.UIComponents.showQuranSettingsBottomSheet) {
          window.UIComponents.showQuranSettingsBottomSheet();
        }
      });

      await page.waitForSelector(".quran-settings-sheet", { timeout: 5000 });

      // Check Master toggle
      const masterToggle = await page.locator('[data-sheet-notif="on"], [data-sheet-notif="off"]');
      assert.strictEqual(await masterToggle.count(), 2, `[${vp.name}] Master toggle On/Off buttons present`);

      // Check Remind Me segmented control
      const remindMeBtns = await page.locator(".notif-offset-toggle button");
      assert.strictEqual(await remindMeBtns.count(), 4, `[${vp.name}] Remind me 4 options (0, 5, 10, 15 min) present`);

      // Check Per-Prayer toggles
      const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
      for (const p of prayers) {
        const pBtn = await page.locator(`[data-prayer-toggle="${p}"]`);
        assert.strictEqual(await pBtn.count(), 2, `[${vp.name}] Per-prayer toggle for ${p} (On/Off pair) present`);
      }

      // Check Location row
      const citySelect = await page.locator("#sheet-city-select");
      assert.strictEqual(await citySelect.count(), 1, `[${vp.name}] City select dropdown present`);
      const useLocBtn = await page.locator("#btn-sheet-geo");
      assert.strictEqual(await useLocBtn.count(), 1, `[${vp.name}] Use location button present`);
      const currentCity = await page.locator("#sheet-current-city");
      assert.strictEqual(await currentCity.count(), 1, `[${vp.name}] Current city display present`);

      await context.close();
      console.log(`  PASS: Settings UI fully rendered at ${vp.name}`);
    }

    // -----------------------------------------------------------------
    // TEST 2: Permission denial path
    // -----------------------------------------------------------------
    console.log("2. Testing permission denial handling...");
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
      const page = await context.newPage();

      // Mock Notification permission as denied
      await page.addInitScript(() => {
        window.Notification = {
          permission: "denied",
          requestPermission: async () => "denied"
        };
      });

      await page.goto(`http://localhost:${PORT}/#quran/1/1`);
      await page.waitForSelector(".screen-quran-v2", { timeout: 10000 });

      // Open settings bottom sheet
      await page.evaluate(() => {
        window.UIComponents.showQuranSettingsBottomSheet();
      });
      await page.waitForSelector(".quran-settings-sheet", { timeout: 5000 });

      // Click "On" button
      const onBtn = page.locator('[data-sheet-notif="on"]');
      await onBtn.click();
      await page.waitForTimeout(300);

      // Verify toggle stayed/flipped to off
      const offBtnActive = await page.locator('[data-sheet-notif="off"].active').count();
      assert.strictEqual(offBtnActive, 1, "Off button is active after denied permission");

      // Verify help text is shown
      const helpVisible = await page.evaluate(() => {
        const el = document.getElementById("notif-permission-help");
        return el && el.style.display !== "none" && el.textContent.includes("Notifications are blocked");
      });
      assert.strictEqual(helpVisible, true, "Help text explaining blocked notifications is visible");

      await context.close();
      console.log("  PASS: Permission denial flips toggle off and displays help text");
    }

    // -----------------------------------------------------------------
    // TEST 3: In-app prayer alert banner with page.clock
    // -----------------------------------------------------------------
    console.log("3. Testing in-app prayer alert banner & page.clock...");
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
      const page = await context.newPage();

      await page.goto(`http://localhost:${PORT}/#home`);
      await page.waitForSelector(".screen-home-v2", { timeout: 10000 });

      // Install fake clock: 2 seconds before Dhuhr (11:48:58 AM PKT on Nov 21, 2026)
      await page.clock.install({ time: new Date("2026-11-21T11:48:58+05:00") });

      // Enable notifications in state and schedule next alert
      await page.evaluate(() => {
        Object.assign(window.baseerahState.settings, { prayerCity: "Lahore", prayerLat: 31.5204, prayerLng: 74.3587 }); // times below are Lahore times
        window.baseerahState.prayerNotifications = true;
        window.baseerahState.notificationOffset = 0;
        window.baseerahState.notificationPrayers = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
        window.baseerahNotificationManager.scheduleNextAlert();
      });

      // Fast-forward 3 seconds past Dhuhr (11:49:01 AM PKT)
      await page.clock.fastForward(3000);

      // Verify banner appears
      await page.waitForSelector("#prayer-alert-banner", { timeout: 5000 });
      const bannerText = await page.locator("#prayer-alert-banner").textContent();
      assert(bannerText.includes("Dhuhr"), "Banner contains Dhuhr prayer name");
      assert(bannerText.includes("It's time for prayer") || bannerText.includes("نماز کا وقت"), "Banner contains prayer arrival message");

      // Test Dismiss button
      const dismissBtn = page.locator("#btn-alert-dismiss");
      await dismissBtn.click();
      await page.waitForTimeout(200);

      const bannerExists = await page.locator("#prayer-alert-banner").count();
      assert.strictEqual(bannerExists, 0, "Banner dismissed on click");

      // Test 2-minute auto-hide
      await page.evaluate(() => {
        window.baseerahNotificationManager.showInAppBanner("asr", new Date());
      });
      await page.waitForSelector("#prayer-alert-banner", { timeout: 2000 });

      // Fast forward 121 seconds
      await page.clock.fastForward(121000);
      await page.waitForTimeout(100);

      const autoHideCount = await page.locator("#prayer-alert-banner").count();
      assert.strictEqual(autoHideCount, 0, "Banner auto-hidden after 2 minutes");

      await context.close();
      console.log("  PASS: In-app banner triggered by clock, dismissed by user, and auto-hidden after 2 min");
    }

    // -----------------------------------------------------------------
    // TEST 4: Recitation audio suppression
    // -----------------------------------------------------------------
    console.log("4. Testing recitation audio alert suppression...");
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
      const page = await context.newPage();
      page.on("pageerror", (e) => console.log("PAGE ERROR:", e));
      page.on("console", (m) => console.log("PAGE LOG:", m.text()));

      await page.goto(`http://localhost:${PORT}/#home`);
      await page.waitForSelector(".screen-home-v2", { timeout: 10000 });

      // Simulate recitation playing
      await page.evaluate(() => {
        window.audioManager.isPlayingAyah = true;
        // Trigger alert while recitation is active
        window.baseerahNotificationManager.onAlertArrived("maghrib", new Date());
      });

      await page.waitForTimeout(200);

      // Banner should be SUPPRESSED while audio is playing
      const bannerDuringAudio = await page.locator("#prayer-alert-banner").count();
      assert.strictEqual(bannerDuringAudio, 0, "Banner is suppressed while recitation audio is playing");

      // Now pause/stop recitation
      await page.evaluate(() => {
        window.audioManager.isPlayingAyah = false;
        window.audioManager.notifyState();
      });

      // Banner should now appear!
      await page.waitForSelector("#prayer-alert-banner", { timeout: 5000 });
      const bannerText = await page.locator("#prayer-alert-banner").textContent();
      assert(bannerText.includes("Maghrib"), "Banner appears after recitation ends with Maghrib");

      await context.close();
      console.log("  PASS: Alert banner suppressed during recitation and shown immediately upon pause/completion");
    }

    console.log("\n✅ ALL NOTIFICATIONS PLAYWRIGHT TESTS PASSED!\n");
    await browser.close();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed:", err);
    await browser.close();
    server.close();
    process.exit(1);
  }
})();
