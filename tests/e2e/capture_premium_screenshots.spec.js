// @ts-check
const { test } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Capture Premium Screenshots", () => {
  test.setTimeout(180000);
  const artifactDir = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";
  const premiumDir = path.join(process.cwd(), "docs", "screenshots", "premium");

  test("Capture All Screens for Urdu and English across Viewports", async ({ page }) => {
    if (!fs.existsSync(premiumDir)) {
      fs.mkdirSync(premiumDir, { recursive: true });
    }

    const saveScreenshot = async (filename) => {
      const docPath = path.join(premiumDir, filename);
      await page.screenshot({ path: docPath });
      fs.copyFileSync(docPath, path.join(artifactDir, filename));
    };

    const viewports = [
      { width: 1280, height: 800, name: "1280x800" },
      { width: 1280, height: 585, name: "1280x585" },
      { width: 390, height: 844, name: "390x844" },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // === URDU UI ===
      await page.goto("/index.html#home");
      await page.evaluate(() => sessionStorage.clear());
      await page.waitForSelector("#brand-logo");
      await page.click('.lang-btn[data-lang="ur"]');
      await page.waitForTimeout(300);

      // 1. Home
      await saveScreenshot(`home_ur_${vp.name}.png`);

      // 2. Quran WBW
      await page.goto("/index.html#quran/1/1");
      await page.waitForSelector(".screen-quran-v2");
      const isMushafUr = await page.$(".mushaf-ayah-block");
      if (isMushafUr) {
        const wbwBtn = page.locator(".mode-btn[data-mode='wbw']");
        if (await wbwBtn.isVisible()) {
          await wbwBtn.click();
        } else {
          await page.evaluate(() => {
            window.baseerahState.settings.readingMode = "wbw";
            window.baseerahRouter.resolveRoute();
          });
        }
        await page.waitForTimeout(300);
      }
      await page.waitForSelector(".wbw-interlinear-tile");
      await page.waitForTimeout(300);
      await saveScreenshot(`quran_wbw_ur_${vp.name}.png`);

      // 3. Quran Mushaf Mode
      const mushafUrBtn = page.locator(".mode-btn[data-mode='mushaf']");
      if (await mushafUrBtn.isVisible()) {
        await mushafUrBtn.click();
      } else {
        await page.evaluate(() => {
          window.baseerahState.settings.readingMode = "mushaf";
          window.baseerahRouter.resolveRoute();
        });
      }
      await page.waitForSelector(".mushaf-ayah-block");
      await page.waitForTimeout(300);
      await saveScreenshot(`quran_mushaf_ur_${vp.name}.png`);

      // 4. Surah List
      await page.goto("/index.html#surahs");
      await page.waitForSelector(".surah-card-v2");
      await page.waitForTimeout(300);
      await saveScreenshot(`surahs_ur_${vp.name}.png`);

      // 5. Namaz Screen
      await page.goto("/index.html#namaz");
      await page.waitForSelector(".namaz-step-detail-card");
      await page.waitForTimeout(300);
      await saveScreenshot(`namaz_ur_${vp.name}.png`);

      // === ENGLISH UI ===
      await page.goto("/index.html#home");
      await page.waitForSelector("#brand-logo");
      await page.click('.lang-btn[data-lang="en"]');
      await page.waitForTimeout(300);

      // 1. Home
      await saveScreenshot(`home_en_${vp.name}.png`);

      // 2. Quran WBW
      await page.goto("/index.html#quran/1/1");
      await page.waitForSelector(".screen-quran-v2");
      const isMushafEn = await page.$(".mushaf-ayah-block");
      if (isMushafEn) {
        const wbwBtn = page.locator(".mode-btn[data-mode='wbw']");
        if (await wbwBtn.isVisible()) {
          await wbwBtn.click();
        } else {
          await page.evaluate(() => {
            window.baseerahState.settings.readingMode = "wbw";
            window.baseerahRouter.resolveRoute();
          });
        }
        await page.waitForTimeout(300);
      }
      await page.waitForSelector(".wbw-interlinear-tile");
      await page.waitForTimeout(300);
      await saveScreenshot(`quran_wbw_en_${vp.name}.png`);

      // 3. Quran Mushaf Mode
      const mushafEnBtn = page.locator(".mode-btn[data-mode='mushaf']");
      if (await mushafEnBtn.isVisible()) {
        await mushafEnBtn.click();
      } else {
        await page.evaluate(() => {
          window.baseerahState.settings.readingMode = "mushaf";
          window.baseerahRouter.resolveRoute();
        });
      }
      await page.waitForSelector(".mushaf-ayah-block");
      await page.waitForTimeout(300);
      await saveScreenshot(`quran_mushaf_en_${vp.name}.png`);

      // 4. Surah List
      await page.goto("/index.html#surahs");
      await page.waitForSelector(".surah-card-v2");
      await page.waitForTimeout(300);
      await saveScreenshot(`surahs_en_${vp.name}.png`);

      // 5. Namaz Screen
      await page.goto("/index.html#namaz");
      await page.waitForSelector(".namaz-step-detail-card");
      await page.waitForTimeout(300);
      await saveScreenshot(`namaz_en_${vp.name}.png`);
    }
  });
});
