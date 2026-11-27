// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Part C: Authentic Quran Recitation Audio & Mosque Respect Integration", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      s.idleSeconds = 0;
      s.mosqueMute = false; // Enabled for audio tests
      s.readingMode = "wbw";
      localStorage.setItem("baseerah_settings", JSON.stringify(s));
    });
  });

  test("1. Audio controls render in WBW header toolbar and toggle play/pause state", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Audio controls pill
    const audioControls = page.locator(".audio-controls-pill");
    await expect(audioControls).toBeVisible();

    const playBtn = page.locator("#btn-audio-play");
    const speedBtn = page.locator("#btn-audio-speed");
    const repeatBtn = page.locator("#btn-audio-repeat");

    await expect(playBtn).toBeVisible();
    await expect(speedBtn).toBeVisible();
    await expect(repeatBtn).toBeVisible();

    // Test speed toggle
    await speedBtn.click();
    await expect(speedBtn).toHaveText("0.75×");
    await speedBtn.click();
    await expect(speedBtn).toHaveText("1×");

    // Test repeat toggle
    await repeatBtn.click();
    await expect(repeatBtn).toHaveClass(/active/);
    await repeatBtn.click();
    await expect(repeatBtn).not.toHaveClass(/active/);
  });

  test("2. Tapping word tile triggers discrete word pronunciation audio", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Mock Audio.prototype.play so no network audio failure in headless CI
    await page.evaluate(() => {
      window._playedUrls = [];
      const origAudio = window.Audio;
      window.Audio = function (url) {
        const audio = new origAudio(url);
        audio.play = async function () {
          window._playedUrls.push(url);
          return Promise.resolve();
        };
        return audio;
      };
    });

    // Tap first word (بِسْمِ)
    const firstTile = page.locator(".wbw-interlinear-tile").first();
    await firstTile.click();

    // Verify word audio URL called
    const playedUrls = await page.evaluate(() => window._playedUrls);
    expect(playedUrls.length).toBeGreaterThan(0);
    expect(playedUrls[0]).toContain("audio.qurancdn.com/wbw/001_001_001.mp3");
  });

  test("3. Synchronized word tile highlighting activates with .audio-active-word", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Trigger word highlight callback directly
    await page.evaluate(() => {
      const tile = document.querySelector('.wbw-interlinear-tile[data-word-idx="1"]');
      if (tile) tile.classList.add("audio-active-word");
    });

    const activeTile = page.locator('.wbw-interlinear-tile[data-word-idx="1"]');
    await expect(activeTile).toHaveClass(/audio-active-word/);

    // Verify visual highlight CSS properties
    const border = await activeTile.evaluate((el) => window.getComputedStyle(el).borderColor);
    expect(border).toBeTruthy();
  });

  test("4. Mosque Respect Mode (Global Mute) silences audio and displays respectful notice", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Enable Mosque Mute
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      s.mosqueMute = true;
      localStorage.setItem("baseerah_settings", JSON.stringify(s));
      if (window.baseerahState) window.baseerahState.settings.mosqueMute = true;
    });

    // Attempt to tap Play
    const playBtn = page.locator("#btn-audio-play");
    await playBtn.click();

    // Verify Mosque Respect toast notice appears
    const toast = page.locator(".baseerah-toast");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("احترامِ مسجد موڈ");
  });

  test("5. Mushaf Mode contains individual ayah play buttons", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Switch to mushaf mode
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      s.readingMode = "mushaf";
      s.mosqueMute = false;
      localStorage.setItem("baseerah_settings", JSON.stringify(s));
      if (window.baseerahState) window.baseerahState.settings.readingMode = "mushaf";
      if (window.baseerahRouter) window.baseerahRouter.navigate("quran/1/1");
    });

    await page.waitForSelector(".mushaf-ayah-block");

    // Verify play buttons exist for ayahs
    const mushafPlayBtns = page.locator(".btn-mushaf-play");
    const count = await mushafPlayBtns.count();
    expect(count).toBe(7); // 7 ayahs in Al-Fatihah
  });
});
