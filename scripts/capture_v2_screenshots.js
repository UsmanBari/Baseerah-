// @ts-check
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const SCREENSHOTS_V2_DIR = path.join(__dirname, "..", "docs", "screenshots", "v2");

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
    return null;
  }
  console.log("Starting local HTTP server on port 8080...");
  const server = spawn("python", ["-m", "http.server", "8080", "--bind", "127.0.0.1"], {
    cwd: path.join(__dirname, ".."),
    stdio: "ignore"
  });
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (await checkServer()) break;
  }
  return server;
}

async function main() {
  const serverProcess = await ensureServer();
  if (!fs.existsSync(SCREENSHOTS_V2_DIR)) {
    fs.mkdirSync(SCREENSHOTS_V2_DIR, { recursive: true });
  }

  console.log("Capturing Baseerah v2 visual snapshots suite...");
  const browser = await chromium.launch();

  const configs = [
    { name: "landscape_1280x800", width: 1280, height: 800 },
    { name: "portrait_800x1280", width: 800, height: 1280 }
  ];

  for (const cfg of configs) {
    const context = await browser.newContext({
      viewport: { width: cfg.width, height: cfg.height }
    });
    const page = await context.newPage();

    // 1. Home Split Hero (Urdu)
    await page.goto("http://127.0.0.1:8080/index.html#home");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `01_home_split_hero_ur_${cfg.name}.png`) });

    // 2. Home Split Hero (English)
    await page.click(".lang-btn[data-lang='en']");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `02_home_split_hero_en_${cfg.name}.png`) });

    // Reset to Urdu
    await page.click(".lang-btn[data-lang='ur']");
    await page.waitForTimeout(300);

    // 3. Surah List Screen
    await page.goto("http://127.0.0.1:8080/index.html#surahs");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `03_surahs_v2_ur_${cfg.name}.png`) });

    // 4. Juz/Para List Screen
    await page.click(".tab-btn[data-tab='juz']");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `04_juz_v2_ur_${cfg.name}.png`) });

    // 5. Quran Interlinear Reader (1:1 - 4 tiles with medallions & duo cards)
    await page.goto("http://127.0.0.1:8080/index.html#quran/1/1");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `05_quran_interlinear_1_1_${cfg.name}.png`) });

    // 6. Quran Interlinear Reader (1:7 - 9 tiles)
    await page.goto("http://127.0.0.1:8080/index.html#quran/1/7");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `06_quran_interlinear_1_7_${cfg.name}.png`) });

    // 7. Meaning Toggle (Urdu only)
    await page.click(".meaning-btn[data-meaning='ur']");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `07_meaning_toggle_ur_${cfg.name}.png`) });

    // 8. Meaning Toggle (English only)
    await page.click(".meaning-btn[data-meaning='en']");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `08_meaning_toggle_en_${cfg.name}.png`) });

    // Reset meaning toggle to both
    await page.click(".meaning-btn[data-meaning='both']");
    await page.waitForTimeout(300);

    // 9. Scholarly Footnote Bottom Sheet
    await page.goto("http://127.0.0.1:8080/index.html#quran/1/1");
    await page.waitForTimeout(400);
    await page.locator(".fn-ref-btn").first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `09_footnote_sheet_${cfg.name}.png`) });
    await page.click(".footnote-sheet .btn-close");
    await page.waitForTimeout(300);

    // 10. Quran Mushaf Continuous Mode
    await page.click(".mode-btn[data-mode='mushaf']");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `10_mushaf_continuous_${cfg.name}.png`) });

    // 11. Namaz Screen (Steps)
    await page.goto("http://127.0.0.1:8080/index.html#namaz");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `11_namaz_steps_${cfg.name}.png`) });

    // 12. Namaz Wudu Screen
    await page.click(".namaz-tab-btn[data-tab='wudu']");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `12_namaz_wudu_${cfg.name}.png`) });

    // 13. About & Sources Screen
    await page.goto("http://127.0.0.1:8080/index.html#about");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `13_about_sources_${cfg.name}.png`) });

    // 14. Attract Screensaver
    await page.goto("http://127.0.0.1:8080/index.html#attract");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_V2_DIR, `14_attract_screensaver_${cfg.name}.png`) });

    await context.close();
  }

  await browser.close();
  if (serverProcess) serverProcess.kill();
  console.log(`✓ All v2 redesign visual snapshots successfully captured in ${SCREENSHOTS_V2_DIR}`);
}

main().catch((err) => {
  console.error("V2 screenshot capture error:", err);
  process.exit(1);
});
