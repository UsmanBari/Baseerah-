// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Morphology Spike — Surah 1 & 2:1-20 Automatic Color Coding", () => {
  const artifactDir = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";
  const docDir = path.join(process.cwd(), "docs", "screenshots", "morphology");

  test.beforeAll(async () => {
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }
  });

  test("1. Dataset integrity: 100% byte fidelity, zero Arabic characters lost or duplicated", async ({ page }) => {
    await page.goto("/index.html#home");
    await page.waitForFunction(() => window.BASEERAH_MORPHOLOGY !== undefined);

    const check = await page.evaluate(() => {
      const morph = window.BASEERAH_MORPHOLOGY;
      let total = 0;
      let segmented = 0;
      let unsegmented = 0;
      let mismatches = [];

      for (const [loc, entry] of Object.entries(morph)) {
        total++;
        if (entry.segmented) {
          segmented++;
          const reconstructed = (entry.prefix || "") + (entry.stem || "") + (entry.suffix || "");
          if (reconstructed !== entry.text) {
            mismatches.push({ loc, reconstructed, expected: entry.text });
          }
        } else {
          unsegmented++;
        }
      }

      return { total, segmented, unsegmented, mismatches, hamd: morph["1:2:1"], lillah: morph["1:2:2"] };
    });

    expect(check.mismatches.length).toBe(0);
    expect(check.segmented).toBeGreaterThan(200);

    // Verify 1:2:1 (اَلْحَمْدُ)
    expect(check.hamd.segmented).toBe(true);
    expect(check.hamd.prefix).toBe("اَلْ");
    expect(check.hamd.stem).toBe("حَمْدُ");
    expect(check.hamd.suffix).toBe("");

    // Verify 1:2:2 (لِلّٰهِ)
    expect(check.lillah.segmented).toBe(true);
    expect(check.lillah.prefix).toBe("لِ");
    expect(check.lillah.stem).toBe("لّٰهِ");
    expect(check.lillah.suffix).toBe("");
  });

  test("2. Off by default until scholar review; unsegmented renders identically", async ({ page }) => {
    await page.goto("/index.html#home");
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Morphology toggle should be inactive by default
    const toggleBtn = page.locator("#btn-toggle-morphology");
    await expect(toggleBtn).not.toHaveClass(/active/);

    // Tiles should have no .morph-prefix or .morph-stem spans when toggle is off
    const prefixCount = await page.locator(".wbw-interlinear-tile .morph-prefix").count();
    expect(prefixCount).toBe(0);

    const firstWordText = await page.locator(".wbw-interlinear-tile .tile-ar").first().innerText();
    expect(firstWordText.trim()).toBe("اَلْحَمْدُ");
  });

  test("3. Header toggle activates color coding and tap displays tiny legend", async ({ page }) => {
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Click toggle button
    await page.click("#btn-toggle-morphology");
    await page.waitForSelector(".wbw-interlinear-tile .morph-prefix");

    // Verify tile 1 (اَلْحَمْدُ) has gold prefix and ink stem
    const tile1 = page.locator(".wbw-interlinear-tile").nth(0);
    const prefix1 = tile1.locator(".morph-prefix");
    const stem1 = tile1.locator(".morph-stem");

    await expect(prefix1).toHaveText("اَلْ");
    await expect(stem1).toHaveText("حَمْدُ");

    // Verify tile 2 (لِلّٰهِ) has prefix and stem
    const tile2 = page.locator(".wbw-interlinear-tile").nth(1);
    const prefix2 = tile2.locator(".morph-prefix");
    const stem2 = tile2.locator(".morph-stem");

    await expect(prefix2).toHaveText("لِ");
    await expect(stem2).toHaveText("لّٰهِ");

    // Verify tile 4 (الْعٰلَمِیْنَ) is unsegmented
    const tile4 = page.locator(".wbw-interlinear-tile").nth(3);
    const prefix4Count = await tile4.locator(".morph-prefix").count();
    expect(prefix4Count).toBe(0);

    // Tap tile 1 to test legend visibility
    const legend1 = tile1.locator(".wbw-morph-legend");
    await expect(legend1).not.toBeVisible();

    await tile1.click();
    await expect(tile1).toHaveClass(/selected/);
    await expect(legend1).toBeVisible();
    const legendText = await legend1.innerText();
    expect(legendText).toContain("اَلْ");
  });

  test("4. Capture morphology screenshots across viewports & languages", async ({ page }) => {
    const saveImg = async (filename) => {
      const docPath = path.join(docDir, filename);
      await page.screenshot({ path: docPath });
      fs.copyFileSync(docPath, path.join(artifactDir, filename));
    };

    // 1. Desktop 1280x800 Urdu UI with Morphology Active
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#home");
    await page.click('.lang-btn[data-lang="ur"]');
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Ensure morphology is ON
    const btnUr = page.locator("#btn-toggle-morphology");
    if (!(await btnUr.evaluate((el) => el.classList.contains("active")))) {
      await btnUr.click();
    }
    // Select first tile to show legend
    await page.locator(".wbw-interlinear-tile").first().click();
    await page.waitForTimeout(300);
    await saveImg("morphology_ur_1280x800.png");

    // Zoomed card screenshot for clarity
    const cardElUr = page.locator("#interlinear-card");
    const docPathCardUr = path.join(docDir, "morphology_card_zoom_1280x800.png");
    await cardElUr.screenshot({ path: docPathCardUr });
    fs.copyFileSync(docPathCardUr, path.join(artifactDir, "morphology_card_zoom_1280x800.png"));

    // 2. Desktop 1280x800 English UI
    await page.goto("/index.html#home");
    await page.click('.lang-btn[data-lang="en"]');
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector(".wbw-interlinear-tile");
    const btnEn = page.locator("#btn-toggle-morphology");
    if (!(await btnEn.evaluate((el) => el.classList.contains("active")))) {
      await btnEn.click();
    }
    await page.locator(".wbw-interlinear-tile").first().click();
    await page.waitForTimeout(300);
    await saveImg("morphology_en_1280x800.png");

    // 3. Mobile 390x844 Urdu UI
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/index.html#home");
    await page.click('.lang-btn[data-lang="ur"]');
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector(".wbw-interlinear-tile");
    await page.evaluate(() => {
      window.baseerahState.settings.showMorphology = true;
      window.baseerahRouter.resolveRoute();
    });
    await page.waitForTimeout(300);
    await page.locator(".wbw-interlinear-tile").first().click();
    await page.waitForTimeout(300);
    await saveImg("morphology_ur_390x844.png");

    // 4. Mobile 390x844 English UI
    await page.goto("/index.html#home");
    await page.click('.lang-btn[data-lang="en"]');
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector(".wbw-interlinear-tile");
    await page.evaluate(() => {
      window.baseerahState.settings.showMorphology = true;
      window.baseerahRouter.resolveRoute();
    });
    await page.waitForTimeout(300);
    await page.locator(".wbw-interlinear-tile").first().click();
    await page.waitForTimeout(300);
    await saveImg("morphology_en_390x844.png");

    // 5. Surah 2:3 sample (shows suffix pronoun e.g. عَلَیْ + هِمْ or رَزَقْنٰ + هُمْ)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/index.html#quran/2/3");
    await page.waitForSelector(".wbw-interlinear-tile");
    await page.evaluate(() => {
      window.baseerahState.settings.showMorphology = true;
      window.baseerahRouter.resolveRoute();
    });
    await page.waitForTimeout(300);
    await page.locator(".wbw-interlinear-tile").nth(4).click(); // رَزَقْنٰهُمْ
    await page.waitForTimeout(300);
    await saveImg("morphology_quran_2_3_1280x800.png");
  });
});
