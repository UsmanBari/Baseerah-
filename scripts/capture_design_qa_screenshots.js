// scripts/capture_design_qa_screenshots.js — Automated Visual Design QA & Screenshot Capture
import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const TARGET_DIR = process.env.SHOT_DIR || "fix_round_2";
const OUTPUT_DIR = path.resolve(ROOT_DIR, "docs", "screenshots", TARGET_DIR);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf"
};

function createServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split("?")[0];
      if (reqPath === "/") reqPath = "/index.html";
      const filePath = path.join(ROOT_DIR, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mime = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.listen(port, () => resolve(server));
  });
}

const VIEWPORTS = [
  { width: 390, height: 844, name: "390x844" },
  { width: 820, height: 1180, name: "820x1180" },
  { width: 1280, height: 800, name: "1280x800" },
  { width: 1920, height: 1080, name: "1920x1080" }
];

async function run() {
  const PORT = 8105;
  const server = await createServer(PORT);
  console.log(`Design QA server listening on http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Capturing Viewport ${vp.name} ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });

    const page = await context.newPage();
    // Prime storage with a base load
    await page.goto(`http://localhost:${PORT}/#home`);

    let gotoScreen;

    for (const lang of ["ur", "en"]) {
      console.log(`  Language: ${lang.toUpperCase()}`);

      gotoScreen = async function(hash, options = {}) {
        const { mode = "wbw", tajweed = false, hifz = false, theme = "light", lang: optLang } = options;
        const currentLang = optLang || lang;
        await page.evaluate(
          ({ l, m, tj, hf, th }) => {
            const raw = localStorage.getItem("baseerah_settings");
            const settings = raw ? JSON.parse(raw) : {};
            settings.lang = l;
            settings.readingMode = m;
            settings.showTajweed = tj;
            settings.hifzMode = hf;
            settings.theme = th;
            settings.isKiosk = false;
            localStorage.setItem("baseerah_settings", JSON.stringify(settings));
            if (window.baseerahState) {
              window.baseerahState.settings = settings;
              window.baseerahState.lang = l;
              window.baseerahState.readingMode = m;
              window.baseerahState.theme = th;
            }
          },
          { l: currentLang, m: mode, tj: tajweed, hf: hifz, th: theme }
        );

        await page.goto(`http://localhost:${PORT}/#${hash}`);
        await page.evaluate(
          ({ l, m, tj, hf, th }) => {
            if (window.baseerahState && window.baseerahState.settings) {
              window.baseerahState.settings.lang = l;
              window.baseerahState.settings.readingMode = m;
              window.baseerahState.settings.showTajweed = tj;
              window.baseerahState.settings.hifzMode = hf;
              window.baseerahState.settings.theme = th;
              window.baseerahState.lang = l;
              window.baseerahState.readingMode = m;
              window.baseerahState.theme = th;
            }
            if (window.baseerahRouter) {
              window.baseerahRouter.resolveRoute();
            }
          },
          { l: currentLang, m: mode, tj: tajweed, hf: hifz, th: theme }
        );

        await page.waitForTimeout(300);
        await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
        await page.waitForSelector(".screen.active, .baseerah-error-boundary", { timeout: 8000 });
        await page.waitForTimeout(200);

        if (tajweed) {
          const count = await page.$$eval('[class*="tj-"]', els => els.length);
          if (count < 4) {
            throw new Error(`Tajweed requested but only ${count} tj-* spans found!`);
          }
        }
      }

      // 1. Home Screen
      await gotoScreen("home");
      await page.screenshot({ path: path.join(OUTPUT_DIR, `home_${lang}_${vp.name}.png`), fullPage: false });

      // 2. Surahs List
      await gotoScreen("surahs");
      await page.screenshot({ path: path.join(OUTPUT_DIR, `surahs_${lang}_${vp.name}.png`), fullPage: false });

      // 3. Juz List
      await gotoScreen("juz");
      await page.screenshot({ path: path.join(OUTPUT_DIR, `juz_${lang}_${vp.name}.png`), fullPage: false });

      // 4. Quran 1:1 Normal WBW Mode
      await gotoScreen("quran/1/1", { mode: "wbw", tajweed: false, hifz: false });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `quran_wbw_${lang}_${vp.name}.png`), fullPage: false });

      // 5. Quran 1:1 Mushaf Mode
      await gotoScreen("quran/1/1", { mode: "mushaf", tajweed: false, hifz: false });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `quran_mushaf_${lang}_${vp.name}.png`), fullPage: false });

      // 6. Quran 1:1 Tajweed Mode (WBW)
      await gotoScreen("quran/1/1", { mode: "wbw", tajweed: true, hifz: false });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `quran_tajweed_${lang}_${vp.name}.png`), fullPage: false });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `quran_tajweed_wbw_${lang}_${vp.name}.png`), fullPage: false });

      // 6b. Quran 1:1 Tajweed Mode (Mushaf)
      await gotoScreen("quran/1/1", { mode: "mushaf", tajweed: true, hifz: false });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `quran_tajweed_mushaf_${lang}_${vp.name}.png`), fullPage: false });

      // 6c. Quran 2:1-5 Tajweed Mode (Mushaf)
      await gotoScreen("quran/2/1", { mode: "mushaf", tajweed: true, hifz: false });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `quran_2_1_5_tajweed_mushaf_${lang}_${vp.name}.png`), fullPage: false });

      // 6d. Quran 2:1-5 Tajweed Mode (WBW)
      await gotoScreen("quran/2/1", { mode: "wbw", tajweed: true, hifz: false });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `quran_2_1_5_tajweed_wbw_${lang}_${vp.name}.png`), fullPage: false });

      // 6e. Zoom crops of Ayah 1:1 (Mushaf & WBW)
      if (vp.name === "1280x800" || vp.name === "390x844") {
        await gotoScreen("quran/1/1", { mode: "wbw", tajweed: true, hifz: false });
        const wbwGrid = await page.$(".reading-card-container, .wbw-interlinear-grid");
        if (wbwGrid) {
          await wbwGrid.screenshot({ path: path.join(OUTPUT_DIR, `zoom_tajweed_1_1_wbw_${lang}_${vp.name}.png`) });
        }
        await gotoScreen("quran/1/1", { mode: "mushaf", tajweed: true, hifz: false });
        const mushafAyah = await page.$("#mushaf-ayah-1, .mushaf-reading-viewport");
        if (mushafAyah) {
          await mushafAyah.screenshot({ path: path.join(OUTPUT_DIR, `zoom_tajweed_1_1_mushaf_${lang}_${vp.name}.png`) });
        }
      }

      // 7. Quran 1:1 Hifz Mode
      await gotoScreen("quran/1/1", { mode: "mushaf", tajweed: false, hifz: true });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `quran_hifz_${lang}_${vp.name}.png`), fullPage: false });

      // 8. Quran 2:282 (Longest Ayah)
      await gotoScreen("quran/2/282", { mode: "wbw", tajweed: false, hifz: false });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `quran_2_282_${lang}_${vp.name}.png`), fullPage: false });

      // 9. Namaz Screens (Steps, Wudu, Rakats, Duas)
      await gotoScreen("namaz/steps");
      await page.screenshot({ path: path.join(OUTPUT_DIR, `namaz_steps_${lang}_${vp.name}.png`), fullPage: false });

      await gotoScreen("namaz/wudu");
      await page.screenshot({ path: path.join(OUTPUT_DIR, `namaz_wudu_${lang}_${vp.name}.png`), fullPage: false });

      await gotoScreen("namaz/rakats");
      await page.screenshot({ path: path.join(OUTPUT_DIR, `namaz_rakats_${lang}_${vp.name}.png`), fullPage: false });

      await gotoScreen("namaz/duas");
      await page.screenshot({ path: path.join(OUTPUT_DIR, `namaz_duas_${lang}_${vp.name}.png`), fullPage: false });

      // 10. Admin Panel (Locked)
      await gotoScreen("admin");
      await page.screenshot({ path: path.join(OUTPUT_DIR, `admin_locked_${lang}_${vp.name}.png`), fullPage: false });

      // 11. 404 Screen
      await gotoScreen("nonexistent-test-route");
      await page.screenshot({ path: path.join(OUTPUT_DIR, `notfound_${lang}_${vp.name}.png`), fullPage: false });

      // 12. Attract Screensaver
      await gotoScreen("attract");
      await page.screenshot({ path: path.join(OUTPUT_DIR, `attract_${lang}_${vp.name}.png`), fullPage: false });

      // 13. Settings Bottom Sheet
      await gotoScreen("quran/1/1");
      await page.evaluate(() => {
        window.UIComponents.showQuranSettingsBottomSheet();
      });
      await page.waitForSelector(".quran-settings-sheet", { timeout: 4000 });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `sheet_settings_${lang}_${vp.name}.png`), fullPage: false });
      await page.evaluate(() => {
        document.querySelectorAll(".bottom-sheet-overlay").forEach((el) => el.remove());
      });

      // 14. Tajweed Legend Bottom Sheet
      await page.evaluate(() => {
        window.UIComponents.showTajweedLegendBottomSheet();
      });
      await page.waitForSelector(".tajweed-legend-sheet", { timeout: 4000 });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `sheet_tajweed_legend_${lang}_${vp.name}.png`), fullPage: false });
      await page.evaluate(() => {
        document.querySelectorAll(".bottom-sheet-overlay").forEach((el) => el.remove());
      });

      // 15. Bookmarks Modal
      await page.evaluate(() => {
        window.UIComponents.showBookmarksModal();
      });
      await page.waitForSelector(".bookmarks-modal-card", { timeout: 4000 });
      await page.screenshot({ path: path.join(OUTPUT_DIR, `modal_bookmarks_${lang}_${vp.name}.png`), fullPage: false });
      await page.evaluate(() => {
        document.querySelectorAll(".modal-overlay").forEach((el) => el.remove());
      });
    }

    // Capture Dark Mode Highlights at this viewport (explicitly in Urdu UI)
    console.log(`  Dark Mode Highlights (Urdu UI)...`);
    await gotoScreen("home", { theme: "dark", lang: "ur" });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `dark_home_ur_${vp.name}.png`), fullPage: false });

    await gotoScreen("quran/1/1", { mode: "wbw", tajweed: true, theme: "dark", lang: "ur" });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `dark_tajweed_ur_${vp.name}.png`), fullPage: false });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `dark_tajweed_wbw_ur_${vp.name}.png`), fullPage: false });

    await gotoScreen("quran/1/1", { mode: "mushaf", tajweed: true, theme: "dark", lang: "ur" });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `dark_tajweed_mushaf_ur_${vp.name}.png`), fullPage: false });

    await page.evaluate(() => {
      window.UIComponents.showTajweedLegendBottomSheet();
    });
    await page.waitForSelector(".tajweed-legend-sheet", { timeout: 4000 });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `dark_sheet_tajweed_ur_${vp.name}.png`), fullPage: false });
    await page.evaluate(() => {
      document.querySelectorAll(".bottom-sheet-overlay").forEach((el) => el.remove());
    });

    // Reset theme
    await page.evaluate(() => {
      window.baseerahState.theme = "light";
    });

    await context.close();
  }

  await browser.close();
  server.close();

  const files = fs.readdirSync(OUTPUT_DIR);
  console.log(`\n✅ Visual Design QA capture completed. Saved ${files.length} screenshots in docs/screenshots/${TARGET_DIR}/`);
}

run().catch((err) => {
  console.error("Design QA capture failed:", err);
  process.exit(1);
});
