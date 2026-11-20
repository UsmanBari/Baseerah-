// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Baseerah Commercial Mosque Kiosk — v2 Redesign E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html#home");
    await page.waitForSelector("#brand-logo");
  });

  test("1. Home screen split hero loads with verified Bismillah and Ayah of the Moment", async ({ page }) => {
    // Left hero panel with gold calligraphy
    const logoCalligraphy = page.locator(".hero-calligraphy-gold");
    await expect(logoCalligraphy).toBeVisible();

    // Verify hero logo area has NO duplicate bismillah
    const heroBismillah = page.locator("#home-bismillah");
    await expect(heroBismillah).toHaveCount(0);

    // Ayah of the Moment card
    const momentCard = page.locator("#ayah-moment-card");
    await expect(momentCard).toBeVisible();

    // Verify Arabic text and 8-point gold medallion
    const momentAr = momentCard.locator(".moment-ar-text");
    await expect(momentAr).toBeVisible();
    await expect(momentAr).toContainText("بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ");
    await expect(momentCard.locator(".ayah-medallion-badge")).toBeVisible();
  });

  test("2. Language toggle mirrors layout between Urdu and English", async ({ page }) => {
    // Default is Urdu
    await expect(page.locator("html")).toHaveAttribute("lang", "ur");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // Toggle to English
    await page.click(".lang-btn[data-lang='en']");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    // Toggle back to Urdu
    await page.click(".lang-btn[data-lang='ur']");
    await expect(page.locator("html")).toHaveAttribute("lang", "ur");
  });

  test("3. Navigate to Surahs and open Quran reader", async ({ page }) => {
    await page.click("[data-nav='surahs']");
    await expect(page).toHaveURL(/.*#surahs/);

    // Click Surah Al-Fatihah
    await page.click("[data-surah='1']");
    await expect(page).toHaveURL(/.*#quran\/1\/1/);

    // Verify interlinear word tile appears
    const firstTile = page.locator(".wbw-interlinear-tile").first();
    await expect(firstTile).toBeVisible();
    await expect(firstTile.locator(".tile-ar")).toContainText("بِسْمِ");
  });

  test("4. Interlinear tiles count check for 1:1 (4 tiles) and 1:7 (9 tiles)", async ({ page }) => {
    // Navigate to 1:1 (Al-Fatiha 1)
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");
    const tiles1_1 = page.locator(".wbw-interlinear-tile");
    await expect(tiles1_1).toHaveCount(4);

    // Verify 8-point medallion badge exists at the end of the ayah
    await expect(page.locator(".medallion-tile-end")).toBeVisible();

    // Navigate to 1:7 (Al-Fatiha 7)
    await page.goto("/index.html#quran/1/7");
    await page.waitForSelector(".wbw-interlinear-tile");
    const tiles1_7 = page.locator(".wbw-interlinear-tile");
    await expect(tiles1_7).toHaveCount(9);
  });

  test("5. Meaning toggle [Both | اردو | English] hides/shows translation lines", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Both lines visible by default
    const firstUr = page.locator(".wbw-interlinear-tile .tile-ur").first();
    const firstEn = page.locator(".wbw-interlinear-tile .tile-en").first();
    await expect(firstUr).toBeVisible();
    await expect(firstEn).toBeVisible();

    // Toggle to Urdu only
    await page.click(".meaning-btn[data-meaning='ur']");
    await expect(firstUr).toBeVisible();
    await expect(firstEn).toBeHidden();

    // Toggle to English only
    await page.click(".meaning-btn[data-meaning='en']");
    await expect(firstUr).toBeHidden();
    await expect(firstEn).toBeVisible();

    // Toggle back to Both
    await page.click(".meaning-btn[data-meaning='both']");
    await expect(firstUr).toBeVisible();
    await expect(firstEn).toBeVisible();
  });

  test("6. 5-step font scaler [A− | A+] changes scale classes", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".btn-scaler-plus");

    // Default is level 3 (scale-step-3 / scale-normal)
    await expect(page.locator("body")).toHaveClass(/scale-step-3/);

    // Click A+
    await page.click(".btn-scaler-plus");
    await expect(page.locator("body")).toHaveClass(/scale-step-4/);

    // Click A+ again
    await page.click(".btn-scaler-plus");
    await expect(page.locator("body")).toHaveClass(/scale-step-5/);

    // Click A-
    await page.click(".btn-scaler-minus");
    await expect(page.locator("body")).toHaveClass(/scale-step-4/);
  });

  test("7. Scholarly footnote tap opens the bottom sheet", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".fn-ref-btn");

    // Click first footnote reference
    const firstFootnote = page.locator(".fn-ref-btn").first();
    await expect(firstFootnote).toBeVisible();
    await firstFootnote.click();

    // Verify footnote bottom sheet appears
    const sheet = page.locator(".footnote-sheet");
    await expect(sheet).toBeVisible();
    await expect(page.locator(".footnote-text")).not.toBeEmpty();

    // Close footnote sheet
    await page.click(".footnote-sheet .btn-close");
    await expect(sheet).toBeHidden();
  });

  test("8. Zero page scroll verification for 20 sample ayahs of Al-Baqarah and 2:282 (longest ayah)", async ({ page }) => {
    // 20 representative sample ayahs + longest ayah 282
    const sampleAyahs = [1, 20, 45, 67, 102, 124, 142, 163, 177, 195, 213, 228, 243, 255, 260, 270, 275, 280, 285, 286, 282];

    for (const aNum of sampleAyahs) {
      await page.goto(`/index.html#quran/2/${aNum}`);
      await page.waitForSelector(".interlinear-reading-card");

      // Verify page itself never scrolls (reading card scrolls internally)
      const isPageOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollHeight > window.innerHeight || document.body.scrollHeight > window.innerHeight;
      });
      expect(isPageOverflowing).toBe(false);
    }
  });

  test("9. Reading mode switch to Mushaf Continuous Mode with 8-point medallions", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.click(".mode-btn[data-mode='mushaf']");

    const mushafText = page.locator(".mushaf-flow-text");
    await expect(mushafText).toBeVisible();

    // Verify 8-point medallions between ayahs
    const medallions = page.locator(".mushaf-ayah-span .ayah-medallion-badge");
    await expect(medallions.first()).toBeVisible();

    // Click first ayah span to open details bottom sheet
    await page.locator(".mushaf-ayah-span").first().click();
    await expect(page.locator(".bottom-sheet")).toBeVisible();
    await expect(page.locator(".sheet-surah-ar")).toContainText("الفاتحة");
    await page.click(".bottom-sheet .btn-close");
  });

  test("10. Go-to-Ayah touch keypad jumps directly to specified verse", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.click("#btn-goto-keypad");

    await expect(page.locator(".modal-card")).toBeVisible();
    // Press Ayah '5' on touch keypad and click Jump
    await page.click(".key-btn[data-key='5']");
    await page.click(".btn-jump");

    await expect(page).toHaveURL(/.*#quran\/1\/5/);
  });

  test("11. Hidden Admin Panel unlocks with 6-digit PIN setup", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem("baseerah_admin_pin_hash");
      localStorage.removeItem("baseerah_admin_pin_salt");
    });
    await page.goto("/index.html#home");
    await page.waitForSelector("#brand-logo");
    const logo = page.locator("#brand-logo");

    // Rapid 5 taps
    for (let i = 0; i < 5; i++) {
      await logo.click();
    }

    // Setup Modal appears
    await expect(page.locator(".modal-card")).toBeVisible();

    // Step 1: Set PIN: 1, 2, 3, 4, 5, 6
    for (const d of ["1", "2", "3", "4", "5", "6"]) {
      await page.click(`.key-btn[data-key='${d}']`);
    }

    // Step 2: Confirm PIN: 1, 2, 3, 4, 5, 6
    for (const d of ["1", "2", "3", "4", "5", "6"]) {
      await page.click(`.key-btn[data-key='${d}']`);
    }

    await expect(page).toHaveURL(/.*#admin/);
    await expect(page.locator(".screen-admin")).toBeVisible();
  });

  test("12. Quran and Urdu fonts load properly before rendering text, with zero missing-glyph boxes", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".wbw-interlinear-tile");

    const fontsLoaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return {
        quranFont: document.fonts.check('1em "AlQuran IndoPak"'),
        urduFont: document.fonts.check('1em "Noto Nastaliq Urdu"')
      };
    });
    expect(fontsLoaded.quranFont).toBe(true);
    expect(fontsLoaded.urduFont).toBe(true);

    // Check computed font-family
    const firstTileAr = page.locator(".wbw-interlinear-tile .tile-ar").first();
    const quranFontFamily = await firstTileAr.evaluate((el) => window.getComputedStyle(el).fontFamily);
    expect(quranFontFamily).toContain("AlQuran IndoPak");

    // Check no '○' or missing glyphs in Arabic tiles
    const tileTexts = await page.locator(".wbw-interlinear-tile .tile-ar").allInnerTexts();
    for (const t of tileTexts) {
      expect(t).not.toContain("○");
    }
  });

  test("13. Urdu digits render in authentic Noto font family with correct U+06F0–06F9 glyphs", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.waitForSelector(".ayah-chip");

    const chipFont = await page.locator(".ayah-chip").first().evaluate((el) => window.getComputedStyle(el).fontFamily);
    expect(chipFont).toMatch(/Noto Naskh Arabic|Noto Nastaliq Urdu/);

    const keypadPillFont = await page.locator(".btn-jump-keypad-pill").evaluate((el) => window.getComputedStyle(el).fontFamily);
    expect(keypadPillFont).toMatch(/Noto Naskh Arabic|Noto Nastaliq Urdu/);
  });

  test("14. Footer arrows point away from center in both Urdu (RTL) and English (LTR)", async ({ page }) => {
    // 1. Urdu mode (RTL): Next (left) uses '‹' and Prev (right) uses '›'
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector(".quran-v2-footer");

    const prevBtnUr = page.locator("#btn-prev-ayah");
    const nextBtnUr = page.locator("#btn-next-ayah");
    await expect(prevBtnUr).toContainText("پچھلی آیت ›");
    await expect(nextBtnUr).toContainText("‹ اگلی آیت");

    // 2. English mode (LTR): Prev (left) uses '‹' and Next (right) uses '›'
    await page.goto("/index.html#home");
    await page.click(".lang-btn[data-lang='en']");
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector(".quran-v2-footer");

    const prevBtnEn = page.locator("#btn-prev-ayah");
    const nextBtnEn = page.locator("#btn-next-ayah");
    await expect(prevBtnEn).toContainText("‹ Previous ayah");
    await expect(nextBtnEn).toContainText("Next ayah ›");
  });
});
