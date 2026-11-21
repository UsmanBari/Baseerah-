const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function capture() {
  const artifactDir = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";
  const docsDir = path.join(process.cwd(), "docs", "screenshots", "premium");
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 1280, height: 800, name: "1280x800" },
    { width: 1280, height: 585, name: "1280x585" },
    { width: 390, height: 844, name: "390x844" },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    
    // Urdu UI
    await page.goto("http://localhost:8080/index.html#home");
    await page.waitForSelector("#brand-logo");
    await page.waitForTimeout(600); // Wait for fonts and animations to settle
    
    const urduFilename = `home_ur_${vp.name}.png`;
    const urduPath = path.join(docsDir, urduFilename);
    await page.screenshot({ path: urduPath });
    fs.copyFileSync(urduPath, path.join(artifactDir, urduFilename));
    console.log(`Captured ${urduFilename}`);

    // Switch to English UI
    const enBtn = page.locator('.lang-btn[data-lang="en"]');
    await enBtn.click();
    await page.waitForTimeout(600);

    const enFilename = `home_en_${vp.name}.png`;
    const enPath = path.join(docsDir, enFilename);
    await page.screenshot({ path: enPath });
    fs.copyFileSync(enPath, path.join(artifactDir, enFilename));
    console.log(`Captured ${enFilename}`);

    await page.close();
  }

  await browser.close();
  console.log("All screenshots captured successfully.");
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
