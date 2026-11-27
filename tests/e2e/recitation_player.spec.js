// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Phase 3 Full-Surah Recitation Player & Multi-Reciter Engine", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      s.idleSeconds = 0;
      s.mosqueMute = false;
      s.readingMode = "mushaf";
      localStorage.setItem("baseerah_settings", JSON.stringify(s));
      localStorage.setItem("baseerah_reciter", "alafasy");
    });
  });

  test("1. Reciter picker opens and switches reciters seamlessly", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".mushaf-ayah-block");

    // Click reciter button in toolbar
    const reciterBtn = page.locator("#btn-audio-reciter");
    await expect(reciterBtn).toBeVisible();
    await reciterBtn.click();

    // Verify modal appears with all 5 reciters
    const modal = page.locator(".reciter-picker-modal");
    await expect(modal).toBeVisible();

    const reciterCards = page.locator(".reciter-option-card");
    await expect(reciterCards).toHaveCount(5);

    // Select Husary
    const husaryCard = page.locator('.reciter-option-card[data-reciter-id="husary"]');
    await husaryCard.click();

    // Verify modal closes and active reciter is Husary
    await expect(modal).not.toBeVisible();
    const storedReciter = await page.evaluate(() => localStorage.getItem("baseerah_reciter"));
    expect(storedReciter).toBe("husary");
  });

  test("2. Speed toggle cycles through 0.75x, 1x, 1.25x, 1.5x", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".mushaf-ayah-block");

    const speedBtn = page.locator("#btn-audio-speed");
    await expect(speedBtn).toHaveText("1×");

    await speedBtn.click();
    await expect(speedBtn).toHaveText("1.25×");

    await speedBtn.click();
    await expect(speedBtn).toHaveText("1.5×");

    await speedBtn.click();
    await expect(speedBtn).toHaveText("0.75×");

    await speedBtn.click();
    await expect(speedBtn).toHaveText("1×");
  });

  test("3. Repeat toggle cycles to single ayah repeat and range repeat modal", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".mushaf-ayah-block");

    const repeatBtn = page.locator("#btn-audio-repeat");
    await expect(repeatBtn).toHaveText("🔁");

    // Click to enable single ayah repeat
    await repeatBtn.click();
    await expect(repeatBtn).toHaveText("🔁 1");

    // Click again opens range modal
    await repeatBtn.click();
    const rangeModal = page.locator(".repeat-range-modal");
    await expect(rangeModal).toBeVisible();

    // Save range
    const saveBtn = page.locator(".btn-save-range");
    await saveBtn.click();
    await expect(rangeModal).not.toBeVisible();
  });

  test("4. Mini Player renders upon play and displays track info & controls", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".mushaf-ayah-block");

    // Mock Audio play
    await page.evaluate(() => {
      window.Audio.prototype.play = async function () {
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      };
    });

    const playBtn = page.locator("#btn-audio-play");
    await playBtn.click();

    const miniPlayer = page.locator("#quran-mini-player");
    await expect(miniPlayer).toHaveClass(/active/);

    const miniPlay = page.locator("#btn-mini-play");
    await expect(miniPlay).toHaveText("⏸");
  });

  test("5. Follow-along auto-scroll pauses on user scroll and resumes on pill tap", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".mushaf-ayah-block");

    // Start playback
    await page.evaluate(() => {
      window.audioManager.isPlayingAyah = true;
      window.audioManager.currentAyah = 2;
    });

    // Simulate user scroll/wheel gesture
    const viewport = page.locator(".mushaf-reading-viewport");
    await viewport.dispatchEvent("wheel", { deltaY: 200 });

    const resumeBtn = page.locator("#btn-resume-follow");
    await expect(resumeBtn).toHaveClass(/visible/);

    // Tap resume pill
    await resumeBtn.click();
    await expect(resumeBtn).not.toHaveClass(/visible/);
  });
});
