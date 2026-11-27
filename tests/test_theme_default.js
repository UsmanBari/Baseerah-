/**
 * tests/test_theme_default.js
 * Asserts that default theme is Light (cream/white parchment) even when OS prefers dark mode,
 * verifies settings migration v3, and ensures user dark/sepia overrides are preserved.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import assert from "assert";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PORT = 8114;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split("?")[0];
      if (reqPath === "/") reqPath = "/index.html";
      const filePath = path.join(ROOT_DIR, reqPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function runTests() {
  const server = await createServer();
  const browser = await chromium.launch({ headless: true });

  console.log("Running Default Light Theme & Migration Tests...");

  try {
    // 1. Fresh user with OS prefers-color-scheme: dark
    {
      const context = await browser.newContext({
        colorScheme: "dark"
      });
      const page = await context.newPage();
      await page.goto(`http://localhost:${PORT}/#home`);
      await page.waitForTimeout(300);

      const themeState = await page.evaluate(() => {
        const bodyClass = document.body.className;
        const dataTheme = document.documentElement.getAttribute("data-theme") || document.body.getAttribute("data-theme");
        const stored = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const screenEl = document.querySelector(".screen");
        const screenBg = screenEl ? window.getComputedStyle(screenEl).backgroundColor : "";
        return { bodyClass, dataTheme, storedTheme: stored.theme, version: stored.settingsVersion, bodyBg, screenBg };
      });

      console.log("  [1] Fresh user with dark OS ->", themeState);
      assert.strictEqual(themeState.storedTheme, "light", "Default theme in storage must be 'light'");
      assert.strictEqual(themeState.version, 6, "Settings version must be 6");
      assert.strictEqual(themeState.dataTheme, "light", "data-theme must be 'light'");
      assert.ok(themeState.bodyClass.includes("theme-light"), "body must have theme-light class");
      assert.ok(!themeState.bodyClass.includes("theme-dark"), "body must NOT have theme-dark class");
      
      // Ensure background is NOT dark (#121215 = rgb(18, 18, 21))
      assert.ok(!themeState.bodyBg.includes("18, 18, 21"), "Body background must not be dark #121215");
      await context.close();
      console.log("  ✓ Test 1 Passed: Fresh user on dark OS renders light theme");
    }

    // 2. Returning user migration: had settingsVersion: 2 with theme: "system"
    {
      const context = await browser.newContext({ colorScheme: "dark" });
      const page = await context.newPage();
      await page.goto(`http://localhost:${PORT}/#home`);
      await page.evaluate(() => {
        localStorage.setItem("baseerah_settings", JSON.stringify({
          settingsVersion: 2,
          theme: "system",
          mosqueMute: false
        }));
      });
      await page.reload();
      await page.waitForTimeout(300);

      const migrated = await page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
        const bodyClass = document.body.className;
        const dataTheme = document.documentElement.getAttribute("data-theme") || document.body.getAttribute("data-theme");
        return { stored, bodyClass, dataTheme };
      });

      console.log("  [2] Migrated from v2 system ->", migrated);
      assert.strictEqual(migrated.stored.settingsVersion, 6, "Migrated version must be 6");
      assert.strictEqual(migrated.stored.theme, "light", "Migrated theme must be reset to 'light'");
      assert.strictEqual(migrated.dataTheme, "light", "data-theme must be 'light'");
      assert.ok(migrated.bodyClass.includes("theme-light"), "body must have theme-light");
      await context.close();
      console.log("  ✓ Test 2 Passed: v2 system theme migrates to v3 light");
    }

    // 3. User who explicitly chose Dark mode in v2: preserved
    {
      const context = await browser.newContext({ colorScheme: "light" });
      const page = await context.newPage();
      await page.goto(`http://localhost:${PORT}/#home`);
      await page.evaluate(() => {
        localStorage.setItem("baseerah_settings", JSON.stringify({
          settingsVersion: 2,
          theme: "dark",
          mosqueMute: false
        }));
      });
      await page.reload();
      await page.waitForTimeout(300);

      const preserved = await page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
        const bodyClass = document.body.className;
        const dataTheme = document.documentElement.getAttribute("data-theme") || document.body.getAttribute("data-theme");
        return { stored, bodyClass, dataTheme };
      });

      console.log("  [3] Explicit Dark preference preserved ->", preserved);
      assert.strictEqual(preserved.stored.settingsVersion, 6, "Migrated version must be 6");
      assert.strictEqual(preserved.stored.theme, "dark", "User's dark theme must be preserved");
      assert.strictEqual(preserved.dataTheme, "dark", "data-theme must be 'dark'");
      assert.ok(preserved.bodyClass.includes("theme-dark"), "body must have theme-dark");
      await context.close();
      console.log("  ✓ Test 3 Passed: Explicit dark preference preserved across migration");
    }

    // 4. Kiosk Mode: always Light unless admin explicitly changes it
    {
      const context = await browser.newContext({ colorScheme: "dark" });
      const page = await context.newPage();
      await page.goto(`http://localhost:${PORT}/#home`);
      await page.evaluate(() => {
        localStorage.setItem("baseerah_settings", JSON.stringify({
          settingsVersion: 3,
          theme: "system",
          isKiosk: true
        }));
      });
      await page.reload();
      await page.waitForTimeout(300);

      const kioskTheme = await page.evaluate(() => {
        return {
          bodyClass: document.body.className,
          dataTheme: document.documentElement.getAttribute("data-theme") || document.body.getAttribute("data-theme"),
          activeTheme: window.baseerahState.theme
        };
      });

      console.log("  [4] Kiosk mode default ->", kioskTheme);
      assert.strictEqual(kioskTheme.activeTheme, "light", "Kiosk mode with 'system' must evaluate to light");
      assert.ok(kioskTheme.bodyClass.includes("theme-light"), "Kiosk must have theme-light");
      await context.close();
      console.log("  ✓ Test 4 Passed: Kiosk mode defaults to Light");
    }

    console.log("\nALL THEME DEFAULT & MIGRATION TESTS PASSED!");
  } finally {
    await browser.close();
    server.close();
  }
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
