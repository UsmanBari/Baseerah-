// @ts-check
const { test } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Capture Premium Screenshots", () => {
  test.setTimeout(90000);
  const artifactDir = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";
  const premiumDir = path.join(process.cwd(), "docs", "screenshots", "premium");

  test("Capture Home & Quran WBW screenshots for Urdu and English", async ({ page }) => {
    if (!fs.existsSync(premiumDir)) {
      fs.mkdirSync(premiumDir, { recursive: true });
    }

    const viewports = [
      { width: 1280, height: 800, name: "1280x800" },
      { width: 1280, height: 585, name: "1280x585" },
      { width: 390, height: 844, name: "390x844" },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Home - Urdu UI
      await page.goto("/index.html#home");
      await page.waitForSelector("#brand-logo");
      await page.click('.lang-btn[data-lang="ur"]');
      await page.waitForTimeout(400);

      const urHomeFile = `home_ur_${vp.name}.png`;
      const urHomeDocPath = path.join(premiumDir, urHomeFile);
      await page.screenshot({ path: urHomeDocPath });
      fs.copyFileSync(urHomeDocPath, path.join(artifactDir, urHomeFile));

      // 2. Quran WBW - Urdu UI
      await page.goto("/index.html#quran/1/1");
      await page.waitForSelector(".wbw-interlinear-tile");
      await page.waitForTimeout(400);

      const urQuranFile = `quran_wbw_ur_${vp.name}.png`;
      const urQuranDocPath = path.join(premiumDir, urQuranFile);
      await page.screenshot({ path: urQuranDocPath });
      fs.copyFileSync(urQuranDocPath, path.join(artifactDir, urQuranFile));

      // 3. Home - English UI
      await page.goto("/index.html#home");
      await page.waitForSelector("#brand-logo");
      await page.click('.lang-btn[data-lang="en"]');
      await page.waitForTimeout(400);

      const enHomeFile = `home_en_${vp.name}.png`;
      const enHomeDocPath = path.join(premiumDir, enHomeFile);
      await page.screenshot({ path: enHomeDocPath });
      fs.copyFileSync(enHomeDocPath, path.join(artifactDir, enHomeFile));

      // 4. Quran WBW - English UI
      await page.goto("/index.html#quran/1/1");
      await page.waitForSelector(".wbw-interlinear-tile");
      await page.waitForTimeout(400);

      const enQuranFile = `quran_wbw_en_${vp.name}.png`;
      const enQuranDocPath = path.join(premiumDir, enQuranFile);
      await page.screenshot({ path: enQuranDocPath });
      fs.copyFileSync(enQuranDocPath, path.join(artifactDir, enQuranFile));
    }
  });
});
