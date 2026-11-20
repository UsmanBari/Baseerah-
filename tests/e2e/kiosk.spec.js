// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Baseerah Commercial Mosque Kiosk E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("Home screen loads with verified Bismillah from data", async ({ page }) => {
    const bismillah = page.locator("#home-bismillah");
    await expect(bismillah).toBeVisible();
    await expect(bismillah).toContainText("بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ");
  });

  test("Language toggle mirrors layout between Urdu and English", async ({ page }) => {
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

  test("Navigate to Surahs and open Quran reader", async ({ page }) => {
    await page.click("[data-nav='surahs']");
    await expect(page).toHaveURL(/.*#surahs/);

    // Click Surah Al-Fatihah
    await page.click("[data-surah='1']");
    await expect(page).toHaveURL(/.*#quran\/1\/1/);

    // Verify word by word tile appears
    const firstWord = page.locator(".wbw-word-tile").first();
    await expect(firstWord).toBeVisible();
    await expect(firstWord.locator(".tile-ar")).toContainText("بِسْمِ");
  });

  test("Elder readability text scaling applies correct CSS class", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await expect(page.locator("body")).toHaveClass(/scale-normal/);

    // Click A+
    await page.click(".scale-btn[data-scale='large']");
    await expect(page.locator("body")).toHaveClass(/scale-large/);

    // Click A++
    await page.click(".scale-btn[data-scale='xlarge']");
    await expect(page.locator("body")).toHaveClass(/scale-xlarge/);
  });

  test("Reading mode switch to Mushaf Continuous Mode", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.click(".mode-btn[data-mode='mushaf']");

    const mushafText = page.locator(".mushaf-flow-text");
    await expect(mushafText).toBeVisible();

    // Click first ayah span to open bottom sheet
    await page.locator(".mushaf-ayah-span").first().click();
    await expect(page.locator(".bottom-sheet")).toBeVisible();
    await expect(page.locator(".sheet-surah-ar")).toContainText("الفاتحة");
  });

  test("Go-to-Ayah touch keypad jumps directly to specified verse", async ({ page }) => {
    await page.goto("/index.html#quran/1/1");
    await page.click("#btn-goto-keypad");

    await expect(page.locator(".modal-card")).toBeVisible();
    // Press Ayah '5' on touch keypad and click Jump
    await page.click(".key-btn[data-key='5']");
    await page.click(".btn-jump");

    await expect(page).toHaveURL(/.*#quran\/1\/5/);
  });

  test("Hidden Admin Panel unlocks with PIN 1234", async ({ page }) => {
    await page.goto("/index.html#home");
    const logo = page.locator("#brand-logo");

    // Rapid 5 taps
    for (let i = 0; i < 5; i++) {
      await logo.click();
    }

    // Modal appears
    await expect(page.locator(".modal-card")).toBeVisible();

    // Enter PIN: 1, 2, 3, 4
    await page.click(".key-btn[data-key='1']");
    await page.click(".key-btn[data-key='2']");
    await page.click(".key-btn[data-key='3']");
    await page.click(".key-btn[data-key='4']");

    await expect(page).toHaveURL(/.*#admin/);
    await expect(page.locator(".screen-admin")).toBeVisible();
  });
});
