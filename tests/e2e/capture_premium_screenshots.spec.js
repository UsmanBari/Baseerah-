// @ts-check
const { test } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Capture Premium Screenshots", () => {
  const artifactDir = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";
  const premiumDir = path.join(process.cwd(), "docs", "screenshots", "premium");

  test("Capture Home screenshots for Urdu and English at 1280x800, 1280x585, 390x844", async ({ page }) => {
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

      // Urdu UI
      await page.goto("/index.html#home");
      await page.waitForSelector("#brand-logo");
      const currentLang = await page.evaluate(() => document.documentElement.lang);
      if (currentLang !== "ur") {
        await page.click('.lang-btn[data-lang="ur"]');
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(400);

      const urduFile = `home_ur_${vp.name}.png`;
      const urduDocPath = path.join(premiumDir, urduFile);
      await page.screenshot({ path: urduDocPath });
      fs.copyFileSync(urduDocPath, path.join(artifactDir, urduFile));

      // English UI
      await page.click('.lang-btn[data-lang="en"]');
      await page.waitForTimeout(400);

      const enFile = `home_en_${vp.name}.png`;
      const enDocPath = path.join(premiumDir, enFile);
      await page.screenshot({ path: enDocPath });
      fs.copyFileSync(enDocPath, path.join(artifactDir, enFile));
    }
  });
});
