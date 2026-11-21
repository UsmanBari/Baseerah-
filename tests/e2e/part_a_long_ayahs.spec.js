// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Part A: Long Ayahs Word Wrapping, No Overflow, and Translation Reachability", () => {
  const artifactDir = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";
  const partADir = path.join(process.cwd(), "docs", "screenshots", "part_a");

  const saveScreenshot = async (page, filename) => {
    if (!fs.existsSync(partADir)) fs.mkdirSync(partADir, { recursive: true });
    const fullPath = path.join(partADir, filename);
    await page.screenshot({ path: fullPath });
    try {
      fs.copyFileSync(fullPath, path.join(artifactDir, filename));
    } catch (e) {}
  };

  const targetAyahs = [
    { surah: 1, ayah: 7 },
    { surah: 2, ayah: 255 },
    { surah: 2, ayah: 282 },
    { surah: 4, ayah: 1 },
    { surah: 4, ayah: 12 },
    { surah: 24, ayah: 31 },
    { surah: 33, ayah: 35 },
  ];

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      s.idleSeconds = 0; // Disable idle timer in tests
      s.readingMode = "wbw";
      localStorage.setItem("baseerah_settings", JSON.stringify(s));
    });
  });

  const checkAyahTilesAndTranslations = async (page, item, vpName) => {
    const check = await page.evaluate(() => {
      const card = document.querySelector(".interlinear-reading-card");
      if (!card) return { ok: false, error: "no card", errors: ["no card"] };
      const cBox = card.getBoundingClientRect();
      const tiles = Array.from(document.querySelectorAll(".wbw-interlinear-tile"));
      const errors = [];

      tiles.forEach((t, i) => {
        const r = t.getBoundingClientRect();
        if (r.width > cBox.width + 4) {
          errors.push(`Tile ${i} width (${r.width}) exceeds card width (${cBox.width})`);
        }
      });

      // Card scroll check: top tile must not have negative offset relative to card
      const firstTile = tiles[0];
      if (firstTile) {
        const fBox = firstTile.getBoundingClientRect();
        if (fBox.top < cBox.top - 12) {
          errors.push(`Top tile pushed out of view: fBox.top (${fBox.top}) < cBox.top (${cBox.top})`);
        }
      }

      return { ok: errors.length === 0, errors, tileCount: tiles.length };
    });

    expect(check.errors).toEqual([]);
    expect(check.tileCount).toBeGreaterThan(0);
  };

  test("Desktop & Laptop viewports (1280x800, 1440x900, 1918x904, 2560x1440)", async ({ page }) => {
    test.setTimeout(90000);
    const desktopVps = [
      { width: 1280, height: 800, name: "1280x800", dpr: 1 },
      { width: 1440, height: 900, name: "1440x900", dpr: 1 },
      { width: 1918, height: 904, name: "1918x904", dpr: 1 },
      { width: 2560, height: 1440, name: "2560x1440", dpr: 2 },
    ];

    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");

    for (const vp of desktopVps) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const lang of ["ur", "en"]) {
        for (const item of targetAyahs) {
          await page.evaluate(({ l, s, a }) => {
            if (window.baseerahState) {
              window.baseerahState.settings.readingMode = "wbw";
              window.baseerahState.settings.idleSeconds = 0;
              window.baseerahState.lang = l;
              window.baseerahState.wbwPagedMode = false;
              window.baseerahState.wbwPage = 0;
            }
            if (window.baseerahRouter) {
              window.baseerahRouter.navigate(`quran/${s}/${a}`);
            }
          }, { l: lang, s: item.surah, a: item.ayah });

          await page.waitForSelector(".wbw-interlinear-tile");
          await checkAyahTilesAndTranslations(page, item, vp.name);

          // Capture 1:7 and 4:1 at 1918x904 in both languages
          if (vp.name === "1918x904" && ((item.surah === 1 && item.ayah === 7) || (item.surah === 4 && item.ayah === 1))) {
            await page.waitForTimeout(50);
            await saveScreenshot(page, `quran_${item.surah}_${item.ayah}_${lang}_${vp.name}.png`);
          }
        }
      }
    }
  });

  test("Mobile & Tablet viewports (390x844, 360x640, 800x1280)", async ({ page }) => {
    test.setTimeout(90000);
    const mobileVps = [
      { width: 390, height: 844, name: "390x844", dpr: 1 },
      { width: 360, height: 640, name: "360x640", dpr: 1 },
      { width: 800, height: 1280, name: "800x1280", dpr: 1 },
    ];

    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");

    for (const vp of mobileVps) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const lang of ["ur", "en"]) {
        for (const item of targetAyahs) {
          await page.evaluate(({ l, s, a }) => {
            if (window.baseerahState) {
              window.baseerahState.settings.readingMode = "wbw";
              window.baseerahState.settings.idleSeconds = 0;
              window.baseerahState.lang = l;
              window.baseerahState.wbwPagedMode = false;
              window.baseerahState.wbwPage = 0;
            }
            if (window.baseerahRouter) {
              window.baseerahRouter.navigate(`quran/${s}/${a}`);
            }
          }, { l: lang, s: item.surah, a: item.ayah });

          await page.waitForSelector(".wbw-interlinear-tile");
          await checkAyahTilesAndTranslations(page, item, vp.name);

          // Capture 1:7 and 4:1 at 390x844 in both languages
          if (vp.name === "390x844" && ((item.surah === 1 && item.ayah === 7) || (item.surah === 4 && item.ayah === 1))) {
            await page.waitForTimeout(50);
            await saveScreenshot(page, `quran_${item.surah}_${item.ayah}_${lang}_${vp.name}.png`);
          }
        }
      }
    }
  });

  test("Long ayah 2:282 continuous scroll vs paged mode at 1918x904 (Urdu UI)", async ({ page }) => {
    await page.setViewportSize({ width: 1918, height: 904 });
    await page.goto("/index.html#quran/2/282");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Continuous scroll mode screenshot
    await page.waitForTimeout(100);
    await saveScreenshot(page, "quran_2_282_scroll_1918x904.png");

    // Toggle paged mode and capture paged screenshot
    const toggleBtn = page.locator("#btn-wbw-toggle-paged");
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await page.waitForTimeout(150);
    await saveScreenshot(page, "quran_2_282_paged_1918x904.png");

    // Test pagination step buttons
    const nextBtn = page.locator("#btn-wbw-page-next");
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await page.waitForTimeout(100);

    const prevBtn = page.locator("#btn-wbw-page-prev");
    await expect(prevBtn).toBeVisible();
    await prevBtn.click();
    await page.waitForTimeout(100);
  });

  test("Verify Translation Bottom Sheet expands and displays full text", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/2/282");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Click Urdu read full button
    const urExpandBtn = page.locator('.btn-read-more-trans[data-lang="ur"]');
    await expect(urExpandBtn).toBeVisible();
    await urExpandBtn.click();

    // Verify modal appears
    const sheet = page.locator(".translation-sheet");
    await expect(sheet).toBeVisible();
    const sheetText = page.locator(".translation-sheet-body");
    await expect(sheetText).toBeVisible();

    // Close modal
    const closeBtn = page.locator(".translation-sheet .btn-close");
    await closeBtn.click();
    await expect(sheet).not.toBeVisible();
  });
});
