// @ts-check
const { chromium, firefox, webkit } = require("@playwright/test");
const path = require("path");

(async () => {
  const filePath = "file:///" + path.join(process.cwd(), "scratch_joining_test.html").replace(/\\/g, "/");
  
  for (const [name, browserType] of [["chromium", chromium], ["firefox", firefox], ["webkit", webkit]]) {
    try {
      const browser = await browserType.launch();
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1000, height: 1200 });
      await page.goto(filePath);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);

      const docPath = path.join(process.cwd(), "docs", "screenshots", `joining_${name}.png`);
      await page.screenshot({ path: docPath, fullPage: true });

      // Zoomed 1:2 screenshots
      const hamdSegEl = await page.locator("#hamd-seg");
      const lillahSegEl = await page.locator("#lillah-seg");
      await hamdSegEl.screenshot({ path: path.join(process.cwd(), "docs", "screenshots", `hamd_seg_${name}_zoom.png`) });
      await lillahSegEl.screenshot({ path: path.join(process.cwd(), "docs", "screenshots", `lillah_seg_${name}_zoom.png`) });

      console.log(name, "passed screenshots generated");
      await browser.close();
    } catch (e) {
      console.error(name, "FAILED:", e);
    }
  }
})();
