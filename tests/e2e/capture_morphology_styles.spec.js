// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Morphology Readability Rules & Styles A vs B Comparison", () => {
  const artifactDir = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";
  const docDir = path.join(process.cwd(), "docs", "screenshots", "morphology");

  test.beforeAll(async () => {
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }
  });

  const saveImg = async (page, filename, locator = null) => {
    const docPath = path.join(docDir, filename);
    const artPath = path.join(artifactDir, filename);
    if (locator) {
      await locator.screenshot({ path: docPath });
    } else {
      await page.screenshot({ path: docPath });
    }
    fs.copyFileSync(docPath, artPath);
    console.log(`Saved screenshot: ${filename}`);
  };

  test("1. Non-negotiable Readability Rules: Byte-for-byte fidelity, diacritic purity & layout invariance", async ({ page }) => {
    await page.goto("/review-morphology.html");
    await page.waitForSelector("table.morph-compare-table tr[data-loc]");

    const results = await page.evaluate(() => {
      const rows = document.querySelectorAll("table.morph-compare-table tr[data-loc]");
      let totalChecked = 0;
      let byteFidelityPass = true;
      let layoutShiftDetected = false;
      let diacriticColorErrors = [];
      let fallbackVerified = false;

      rows.forEach(row => {
        totalChecked++;
        const loc = row.getAttribute("data-loc");
        const baseline = row.querySelector(".col-baseline").textContent.trim();
        const styleA = row.querySelector(".style-a-box").textContent.trim();
        const styleB = row.querySelector(".style-b-box").textContent.trim();

        // 1. Byte-for-byte fidelity test: concatenated text must exactly match original baseline
        if (styleA !== baseline || styleB !== baseline) {
          byteFidelityPass = false;
        }

        // 2. Layout invariant test: baseline width must match style-a and style-b text width
        const rangeBase = document.createRange();
        rangeBase.selectNodeContents(row.querySelector(".col-baseline"));
        const baseWidth = rangeBase.getBoundingClientRect().width;

        const rangeA = document.createRange();
        rangeA.selectNodeContents(row.querySelector(".style-a-box"));
        const aWidth = rangeA.getBoundingClientRect().width;

        const rangeB = document.createRange();
        rangeB.selectNodeContents(row.querySelector(".style-b-box"));
        const bWidth = rangeB.getBoundingClientRect().width;

        if (Math.abs(baseWidth - aWidth) > 1 || Math.abs(baseWidth - bWidth) > 1) {
          layoutShiftDetected = true;
        }

        // 3. Diacritics in Style B must be pure dark ink
        const diacs = row.querySelectorAll(".style-b-box .morph-diacritic");
        const bodyInk = window.getComputedStyle(document.body).color;
        diacs.forEach(d => {
          const col = window.getComputedStyle(d).color;
          if (col !== bodyInk) {
            diacriticColorErrors.push({ loc, text: d.textContent, col, expected: bodyInk });
          }
        });

        // 4. Verify ligature fallback for 1:2:2 (لِلّٰهِ)
        if (loc === "1:2:2") {
          // Style B must fall back to pure ink letters with underline bar
          const styleBLetters = row.querySelectorAll(".style-b-box [class*='morph-letter']");
          if (styleBLetters.length === 0) {
            fallbackVerified = true;
          }
        }
      });

      return { totalChecked, byteFidelityPass, layoutShiftDetected, diacriticColorErrors, fallbackVerified };
    });

    expect(results.totalChecked).toBeGreaterThan(60);
    expect(results.byteFidelityPass).toBe(true);
    expect(results.layoutShiftDetected).toBe(false);
    expect(results.diacriticColorErrors.length).toBe(0);
    expect(results.fallbackVerified).toBe(true);
  });

  test("2. Mushaf mode is ALWAYS plain, uncoloured text with zero morphology spans", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".mode-pill-toggle");

    // Enable morphology first in WBW mode
    const morphBtn = page.locator("#btn-toggle-morphology");
    if (!(await morphBtn.evaluate(el => el.classList.contains("active")))) {
      await morphBtn.click();
    }
    await page.waitForSelector(".wbw-interlinear-tile .morph-seg");

    // Switch to Mushaf continuous mode
    await page.click('.mode-pill-btn[data-mode="mushaf"]');
    await page.waitForSelector(".mushaf-reading-viewport");

    // Assert that Mushaf mode has zero morphology spans or bars
    const morphSegsInMushaf = await page.locator(".mushaf-reading-viewport .morph-seg").count();
    const morphBarsInMushaf = await page.locator(".mushaf-reading-viewport .morph-bar").count();
    expect(morphSegsInMushaf).toBe(0);
    expect(morphBarsInMushaf).toBe(0);

    // Verify Ayah-end medallion in Mushaf has zero morphology styling
    const medallion = page.locator(".mushaf-medallion-box").first();
    await expect(medallion).toBeVisible();
    const medallionMorphSpans = await medallion.locator(".morph-seg").count();
    expect(medallionMorphSpans).toBe(0);
  });

  test("3. Capture comprehensive side-by-side comparison screenshots for 1:1-7 and 2:1-5", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1600 });
    await page.goto("/review-morphology.html");
    await page.waitForSelector("table.morph-compare-table tr[data-loc]");
    await page.waitForTimeout(600);

    // 1. Capture side-by-side reading cards for sample ayahs
    const cardPreviews = page.locator("#reading-card-previews");
    await saveImg(page, "styles_reading_cards_side_by_side.png", cardPreviews);

    // 2. Capture full 65-word comparison table
    const tableSection = page.locator("table.morph-compare-table");
    await saveImg(page, "styles_comparison_table_all.png", tableSection);

    // 3. Zoomed high-res view of Surah Al-Fatihah words
    await saveImg(page, "styles_fatihah_zoom.png", page.locator("table.morph-compare-table tbody"));
  });

  test("4. Capture actual app Quran reader screens for both Style A and Style B at 1280x800", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // A. STYLE A: Underline on Quran Screen (1:2)
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Activate morphology
    const morphToggle = page.locator("#btn-toggle-morphology");
    if (!(await morphToggle.evaluate(el => el.classList.contains("active")))) {
      await morphToggle.click();
    }
    // Set style to underline
    const underBtn = page.locator('.morph-style-btn[data-morph-style="underline"]');
    if (await underBtn.isVisible()) {
      await underBtn.click();
    }
    await page.waitForTimeout(400);
    await saveImg(page, "quran_1_2_style_a_underline_1280x800.png");

    // B. STYLE B: Tint on Quran Screen (1:2)
    const tintBtn = page.locator('.morph-style-btn[data-morph-style="tint"]');
    if (await tintBtn.isVisible()) {
      await tintBtn.click();
    }
    await page.waitForTimeout(400);
    await saveImg(page, "quran_1_2_style_b_tint_1280x800.png");

    // C. STYLE A: Underline on Al-Baqarah 2:3
    await page.goto("/index.html#quran/2/3");
    await page.waitForSelector(".wbw-interlinear-tile");
    if (await underBtn.isVisible()) {
      await underBtn.click();
    }
    await page.waitForTimeout(400);
    await saveImg(page, "quran_2_3_style_a_underline_1280x800.png");

    // D. STYLE B: Tint on Al-Baqarah 2:3
    if (await tintBtn.isVisible()) {
      await tintBtn.click();
    }
    await page.waitForTimeout(400);
    await saveImg(page, "quran_2_3_style_b_tint_1280x800.png");
  });
});
