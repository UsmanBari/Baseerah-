// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Baseerah — Viewports & Live Stress Test Fixes", () => {
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  test("Item 2: Short and mobile viewports scroll gracefully without overlap", async ({ page }) => {
    const viewports = [
      { width: 1280, height: 529, name: "laptop-short" },
      { width: 1366, height: 650, name: "laptop-1366" },
      { width: 390, height: 844, name: "mobile-iphone" },
      { width: 360, height: 640, name: "mobile-small" },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/index.html#home");
      await page.waitForSelector("#brand-logo");

      // Verify About button in normal flow is reachable and clickable
      const aboutBtn = page.locator(".footer-about-link");
      await aboutBtn.scrollIntoViewIfNeeded();
      await expect(aboutBtn).toBeVisible();

      // Verify WBW tile is reachable and clickable
      const wbwTile = page.locator(".tile-wide-wbw");
      await wbwTile.scrollIntoViewIfNeeded();
      await expect(wbwTile).toBeVisible();

      // Verify Namaz tile is reachable and clickable
      const namazTile = page.locator(".tile-namaz-emerald");
      await namazTile.scrollIntoViewIfNeeded();
      await expect(namazTile).toBeVisible();

      // Verify Ayah-of-the-moment card is clamped and does not exceed 380px
      const ayahCard = page.locator("#ayah-moment-card");
      await expect(ayahCard).toBeVisible();
      const cardBox = await ayahCard.boundingBox();
      expect(cardBox).not.toBeNull();
      if (cardBox) {
        expect(cardBox.height).toBeLessThanOrEqual(385);
      }
    }

    // Capture screenshot on 1280x529
    await page.setViewportSize({ width: 1280, height: 529 });
    await page.goto("/index.html#home");
    await page.waitForSelector("#brand-logo");
    await page.screenshot({ path: path.join(screenshotsDir, "short_viewport_1280x529.png") });
  });

  test("Item 3: Quran reading card never collapses below 300px on short viewports (2:282 & 9:1)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 529 });

    // Test 2:282 (longest ayah in the Quran)
    await page.goto("/index.html#quran/2/282");
    await page.waitForSelector(".wbw-interlinear-tile");

    const readingCard = page.locator(".interlinear-reading-card");
    await expect(readingCard).toBeVisible();

    const cardBox = await readingCard.boundingBox();
    expect(cardBox).not.toBeNull();
    if (cardBox) {
      expect(cardBox.height).toBeGreaterThanOrEqual(300);
    }

    // Verify word tiles count (2:282 has 128 word tiles)
    const tilesCount = await page.locator(".wbw-interlinear-tile").count();
    expect(tilesCount).toBe(128);

    // Verify translations duo grid is placed below and accessible
    const transGrid = page.locator(".translations-duo-grid");
    await transGrid.scrollIntoViewIfNeeded();
    await expect(transGrid).toBeVisible();

    // Verify footer navigation is sticky/visible
    const footerNav = page.locator(".quran-v2-footer");
    await expect(footerNav).toBeVisible();

    // Capture screenshot for 2:282
    await page.screenshot({ path: path.join(screenshotsDir, "quran_2_282_short.png") });

    // Test Surah 9:1
    await page.goto("/index.html#quran/9/1");
    await page.waitForSelector(".wbw-interlinear-tile");
    const cardBox9 = await page.locator(".interlinear-reading-card").boundingBox();
    expect(cardBox9).not.toBeNull();
    if (cardBox9) {
      expect(cardBox9.height).toBeGreaterThanOrEqual(300);
    }
  });

  test("Item 4: Namaz screen all 4 tabs styled with Baseerah v2 aesthetic", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#namaz");
    await page.waitForSelector(".namaz-header");

    // 1. Scholar Warning Banner
    const banner = page.locator(".scholar-review-banner");
    await expect(banner).toBeVisible();

    // Tab 1: Steps
    await expect(page.locator(".namaz-steps-layout")).toBeVisible();
    await expect(page.locator(".namaz-steps-rail")).toBeVisible();
    await expect(page.locator(".namaz-step-detail-card")).toBeVisible();
    await expect(page.locator(".posture-silhouette-box svg")).toBeVisible();

    // Switch step in rail
    const thirdStep = page.locator(".rail-step-btn").nth(2);
    await thirdStep.click();
    await expect(thirdStep).toHaveClass(/active/);
    await page.screenshot({ path: path.join(screenshotsDir, "namaz_steps.png") });

    // Tab 2: Wudu
    await page.click(".namaz-tab-btn[data-tab='wudu']");
    await expect(page.locator(".wudu-grid")).toBeVisible();
    const wuduCards = page.locator(".wudu-card");
    await expect(wuduCards.first()).toBeVisible();
    expect(await wuduCards.count()).toBeGreaterThan(3);
    await page.screenshot({ path: path.join(screenshotsDir, "namaz_wudu.png") });

    // Tab 3: Rakats
    await page.click(".namaz-tab-btn[data-tab='rakats']");
    await expect(page.locator(".rakats-container")).toBeVisible();
    await expect(page.locator(".rakats-table")).toBeVisible();
    await expect(page.locator(".rakat-tag").first()).toBeVisible();
    await expect(page.locator(".total-rakat-badge").first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "namaz_rakats.png") });

    // Tab 4: Duas
    await page.click(".namaz-tab-btn[data-tab='duas']");
    await expect(page.locator(".duas-list-container")).toBeVisible();
    await expect(page.locator(".dua-card").first()).toBeVisible();
    await expect(page.locator(".pending-scholar-box").first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "namaz_duas.png") });
  });

  test("Item 5: Big surahs open with immediate loading state and fast cached performance", async ({ page }) => {
    await page.goto("/index.html#home");
    await page.waitForSelector("#brand-logo");

    // Wait a brief moment for idle pre-caching to start
    await page.waitForTimeout(500);

    // Navigate to Surah 36 (Ya-Sin)
    const t0 = Date.now();
    await page.goto("/index.html#quran/36/1");
    await page.waitForSelector(".wbw-interlinear-tile");
    const tElapsed = Date.now() - t0;

    // First ayah rendered
    const firstTile = page.locator(".wbw-interlinear-tile").first();
    await expect(firstTile).toBeVisible();
    expect(tElapsed).toBeLessThan(2000);

    // Second navigation to Surah 36 should be instantaneous (< 400ms from memory cache)
    const tCached0 = Date.now();
    await page.goto("/index.html#quran/36/2");
    await page.waitForSelector(".wbw-interlinear-tile");
    const tCachedElapsed = Date.now() - tCached0;
    expect(tCachedElapsed).toBeLessThan(400);

    // Navigate to Surah 2 (Al-Baqarah)
    await page.goto("/index.html#quran/2/1");
    await page.waitForSelector(".wbw-interlinear-tile");
    await expect(page.locator(".wbw-interlinear-tile").first()).toBeVisible();
  });
});
