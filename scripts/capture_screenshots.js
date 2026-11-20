// @ts-check
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const SCREENSHOTS_DIR = path.join(__dirname, "..", "docs", "screenshots");

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:8080/index.html", (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureServer() {
  const isRunning = await checkServer();
  if (isRunning) {
    console.log("Server is already running on port 8080.");
    return null;
  }
  console.log("Starting local HTTP server on port 8080...");
  const server = spawn("python", ["-m", "http.server", "8080", "--bind", "127.0.0.1"], {
    cwd: path.join(__dirname, ".."),
    stdio: "ignore"
  });
  // Wait up to 5 seconds for server to respond
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (await checkServer()) break;
  }
  return server;
}

async function main() {
  const serverProcess = await ensureServer();
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log("Launching headless Chromium for Baseerah screenshot suite...");
  const browser = await chromium.launch();

  const configs = [
    { name: "landscape", width: 1280, height: 800 },
    { name: "portrait", width: 800, height: 1280 }
  ];

  for (const cfg of configs) {
    const context = await browser.newContext({
      viewport: { width: cfg.width, height: cfg.height }
    });
    const page = await context.newPage();

    // 1. Home Screen (Urdu)
    await page.goto("http://127.0.0.1:8080/index.html#home");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `01_home_ur_${cfg.name}.png`) });

    // 2. Home Screen (English)
    await page.click(".lang-btn[data-lang='en']");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `02_home_en_${cfg.name}.png`) });

    // Switch back to Urdu
    await page.click(".lang-btn[data-lang='ur']");
    await page.waitForTimeout(400);

    // 3. Surah List Screen
    await page.goto("http://127.0.0.1:8080/index.html#surahs");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `03_surahs_ur_${cfg.name}.png`) });

    // 4. Juz List Screen
    await page.click(".tab-btn[data-tab='juz']");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `04_juz_ur_${cfg.name}.png`) });

    // 5. Quran WBW Reader (Surah 1:1)
    await page.goto("http://127.0.0.1:8080/index.html#quran/1/1");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `05_quran_wbw_ur_${cfg.name}.png`) });

    // 6. Quran Mushaf Mode (Continuous)
    await page.click(".mode-btn[data-mode='mushaf']");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `06_quran_mushaf_ur_${cfg.name}.png`) });

    // 7. Mushaf Bottom Sheet
    await page.locator(".mushaf-ayah-span").first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `07_mushaf_bottom_sheet_${cfg.name}.png`) });
    await page.click(".bottom-sheet .btn-close");
    await page.waitForTimeout(300);

    // 8. Namaz - How to Pray (Steps)
    await page.goto("http://127.0.0.1:8080/index.html#namaz");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `08_namaz_steps_ur_${cfg.name}.png`) });

    // 9. Namaz - Wudu
    await page.click(".namaz-tab-btn[data-tab='wudu']");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `09_namaz_wudu_ur_${cfg.name}.png`) });

    // 10. Namaz - Rakats
    await page.click(".namaz-tab-btn[data-tab='rakats']");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `10_namaz_rakats_ur_${cfg.name}.png`) });

    // 11. Namaz - Duas
    await page.click(".namaz-tab-btn[data-tab='duas']");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `11_namaz_duas_ur_${cfg.name}.png`) });

    // 12. About & Sources
    await page.goto("http://127.0.0.1:8080/index.html#about");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `12_about_ur_${cfg.name}.png`) });

    // 13. Attract Screen (Screensaver)
    await page.goto("http://127.0.0.1:8080/index.html#attract");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `13_attract_${cfg.name}.png`) });

    // 14. Admin PIN Setup Modal
    await page.goto("http://127.0.0.1:8080/index.html#home");
    await page.evaluate(() => localStorage.removeItem("baseerah_admin_pin_hash"));
    for (let i = 0; i < 5; i++) {
      await page.click("#brand-logo");
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `14_admin_pin_setup_${cfg.name}.png`) });

    // 15. Admin Screen (after unlocking)
    // Enter 6 digits twice: 123456
    for (const d of ["1", "2", "3", "4", "5", "6"]) await page.click(`.key-btn[data-key='${d}']`);
    await page.waitForTimeout(200);
    for (const d of ["1", "2", "3", "4", "5", "6"]) await page.click(`.key-btn[data-key='${d}']`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `15_admin_dashboard_${cfg.name}.png`) });

    await context.close();
  }

  // 16. Integrity Failure Screen (Simulating SHA-256 corruption)
  const failContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const failPage = await failContext.newPage();
  // Intercept data/surahs/001.js and return corrupted data
  await failPage.route("**/data/surahs/001.js", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "window.BASEERAH_SURAH = { corrupted: true };"
    });
  });
  await failPage.goto("http://127.0.0.1:8080/index.html#quran/1/1");
  await failPage.waitForTimeout(600);
  await failPage.screenshot({ path: path.join(SCREENSHOTS_DIR, "16_integrity_failure_screen.png") });
  await failContext.close();

  await browser.close();
  if (serverProcess) {
    serverProcess.kill();
  }
  console.log(`✓ All screenshots successfully captured in ${SCREENSHOTS_DIR}`);
}

main().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});
