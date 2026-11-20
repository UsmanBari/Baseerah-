// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Baseerah — Viewports & Live Stress Test Fixes", () => {
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  test("Item 1: Real mouse wheel and keyboard scrolling works on short viewports without swallowing", async ({ page }) => {
    const testViewports = [
      { width: 1280, height: 529, name: "laptop-short" },
      { width: 390, height: 844, name: "mobile-iphone" },
    ];

    for (const vp of testViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/index.html#home");
      await page.waitForSelector("#brand-logo");
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);

      // Verify initial scroll position is 0
      let scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBe(0);

      // Real mouse wheel event (NOT window.scrollTo)
      await page.mouse.move(vp.width / 2, vp.height / 2);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(400);

      scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThan(0);

      // Reset to top with Home key
      await page.keyboard.press("Home");
      await page.waitForTimeout(200);

      // Real keyboard End press (NOT window.scrollTo)
      await page.keyboard.press("End");
      await page.waitForTimeout(400);

      const endScrollY = await page.evaluate(() => window.scrollY);
      expect(endScrollY).toBeGreaterThan(0);

      // Assert About button is visible in viewport
      const aboutBtn = page.locator(".footer-about-link");
      await expect(aboutBtn).toBeInViewport();
    }
  });

  test("Item 2: Route changes reset scroll position to (0,0)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 529 });
    await page.goto("/index.html#namaz");
    await page.waitForSelector(".namaz-header");

    // Scroll down with mouse wheel on Namaz screen
    await page.mouse.move(600, 300);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);

    const namazScroll = await page.evaluate(() => window.scrollY);
    expect(namazScroll).toBeGreaterThan(0);

    // Navigate to Quran screen via router
    await page.evaluate(() => window.location.hash = "#quran/1/1");
    await page.waitForSelector(".quran-header-emerald");

    // Assert scroll position immediately reset to (0, 0) and header is fully visible
    const newScrollY = await page.evaluate(() => window.scrollY);
    expect(newScrollY).toBe(0);

    const quranHeader = page.locator(".quran-header-emerald");
    await expect(quranHeader).toBeInViewport();
  });

  test("Item 3: English text inside RTL containers has dir=ltr and unicode-bidi isolate", async ({ page }) => {
    await page.goto("/index.html#namaz");
    await page.waitForSelector(".namaz-header");

    // Check Namaz step English elements
    const railEn = page.locator(".rail-en").first();
    await expect(railEn).toHaveAttribute("dir", "ltr");
    const detailEn = page.locator(".detail-text-en");
    await expect(detailEn).toHaveAttribute("dir", "ltr");

    const detailBidi = await detailEn.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { dir: s.direction, bidi: s.unicodeBidi };
    });
    expect(detailBidi.dir).toBe("ltr");
    expect(detailBidi.bidi).toBe("isolate");

    // Check Wudu tab English elements
    await page.click(".namaz-tab-btn[data-tab='wudu']");
    const wuduTitleEn = page.locator(".wudu-title-en").first();
    await expect(wuduTitleEn).toHaveAttribute("dir", "ltr");
    const wuduInstEn = page.locator(".wudu-instruction-en").first();
    await expect(wuduInstEn).toHaveAttribute("dir", "ltr");

    // Check Quran translation card English body
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".trans-card-en");
    const transEn = page.locator(".trans-card-en .trans-body-text");
    await expect(transEn).toHaveAttribute("dir", "ltr");

    // Check About screen
    await page.goto("/index.html#about");
    await page.waitForSelector(".about-card[dir='ltr']");
    const aboutCardEn = page.locator(".about-card[dir='ltr']").first();
    await expect(aboutCardEn).toBeVisible();
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
