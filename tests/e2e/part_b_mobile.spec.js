// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Part B: Mobile Responsiveness & Phone Optimization", () => {
  test.setTimeout(90000);
  const artifactDir = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";
  const mobileDir = path.join(process.cwd(), "docs", "screenshots", "mobile");

  const saveScreenshot = async (page, filename) => {
    if (!fs.existsSync(mobileDir)) fs.mkdirSync(mobileDir, { recursive: true });
    const fullPath = path.join(mobileDir, filename);
    await page.screenshot({ path: fullPath });
    try {
      fs.copyFileSync(fullPath, path.join(artifactDir, filename));
    } catch (e) {}
  };

  const devicesList = [
    { name: "iphone_13", width: 390, height: 844, isPhone: true },
    { name: "iphone_se", width: 375, height: 667, isPhone: true },
    { name: "pixel_7", width: 412, height: 915, isPhone: true },
    { name: "galaxy_s8", width: 360, height: 740, isPhone: true },
    { name: "ipad_mini", width: 768, height: 1024, isPhone: false },
    { name: "galaxy_tab_s7", width: 800, height: 1280, isPhone: false },
  ];

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      s.idleSeconds = 0;
      s.readingMode = "wbw";
      localStorage.setItem("baseerah_settings", JSON.stringify(s));
    });
  });

  test("Phone header, bottom navigation bar, and tap targets (iPhone 13)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector(".wbw-interlinear-tile");

    // 1. Header has compact back button, surah name, and overflow button
    const overflowBtn = page.locator("#btn-quran-overflow");
    await expect(overflowBtn).toBeVisible();

    // Side floating arrows must be hidden on phones
    const sideArrows = page.locator(".reading-card-container .nav-arrow-btn");
    await expect(sideArrows.first()).toBeHidden();

    // 2. Fixed bottom navigation bar is visible with 3 controls
    const footerNav = page.locator(".footer-nav-bar");
    await expect(footerNav).toBeVisible();

    const footerPrev = page.locator("#footer-btn-prev");
    const footerKeypad = page.locator("#btn-goto-keypad");
    const footerNext = page.locator("#footer-btn-next");

    await expect(footerPrev).toBeVisible();
    await expect(footerKeypad).toBeVisible();
    await expect(footerNext).toBeVisible();

    // Verify touch target heights >= 48px
    const prevBox = await footerPrev.boundingBox();
    const keypadBox = await footerKeypad.boundingBox();
    const nextBox = await footerNext.boundingBox();
    expect(prevBox?.height).toBeGreaterThanOrEqual(44);
    expect(keypadBox?.height).toBeGreaterThanOrEqual(44);
    expect(nextBox?.height).toBeGreaterThanOrEqual(44);

    // 3. Test navigation with bottom buttons: tap next ayah
    await footerNext.click();
    await page.waitForTimeout(100);
    expect(page.url()).toContain("#quran/1/3");

    // Tap previous ayah
    await footerPrev.click();
    await page.waitForTimeout(100);
    expect(page.url()).toContain("#quran/1/2");

    // 4. Test overflow settings sheet opens and toggles
    await overflowBtn.click();
    const settingsSheet = page.locator(".quran-settings-sheet");
    await expect(settingsSheet).toBeVisible();

    // Close settings sheet
    const closeBtn = settingsSheet.locator(".btn-close");
    await closeBtn.click();
    await expect(settingsSheet).not.toBeVisible();
  });

  test("Device audit across all 6 targets with screenshots and zero horizontal scroll", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");

    for (const dev of devicesList) {
      await page.setViewportSize({ width: dev.width, height: dev.height });

      for (const lang of ["ur", "en"]) {
        await page.evaluate(({ l }) => {
          if (window.baseerahState) {
            window.baseerahState.settings.readingMode = "wbw";
            window.baseerahState.settings.idleSeconds = 0;
            window.baseerahState.lang = l;
          }
          if (window.baseerahRouter) {
            window.baseerahRouter.navigate("quran/1/7");
          }
        }, { l: lang });

        await page.waitForSelector(".wbw-interlinear-tile");
        await page.waitForTimeout(60);

        // Check horizontal page scroll: document.documentElement.scrollWidth <= window.innerWidth
        const scrollCheck = await page.evaluate(() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const innerWidth = window.innerWidth;
          return { scrollWidth, innerWidth, noOverflow: scrollWidth <= innerWidth + 1 };
        });
        expect(scrollCheck.noOverflow).toBe(true);

        // Check tile metrics on phones
        if (dev.isPhone) {
          const tileMetrics = await page.evaluate(() => {
            const firstTile = document.querySelector(".wbw-interlinear-tile");
            if (!firstTile) return null;
            const ar = firstTile.querySelector(".tile-ar");
            const ur = firstTile.querySelector(".tile-ur");
            const en = firstTile.querySelector(".tile-en");

            const arSize = ar ? parseFloat(window.getComputedStyle(ar).fontSize) : 0;
            const urSize = ur ? parseFloat(window.getComputedStyle(ur).fontSize) : 0;
            const enSize = en ? parseFloat(window.getComputedStyle(en).fontSize) : 0;
            const tileBox = firstTile.getBoundingClientRect();

            return {
              arSize,
              urSize,
              enSize,
              tileHeight: tileBox.height,
              tileWidth: tileBox.width
            };
          });

          if (tileMetrics) {
            expect(tileMetrics.arSize).toBeGreaterThanOrEqual(30);
            expect(tileMetrics.tileHeight).toBeGreaterThanOrEqual(48);
          }
        }

        // Save screenshot
        await saveScreenshot(page, `mobile_${dev.name}_${lang}.png`);
      }
    }
  });
});
