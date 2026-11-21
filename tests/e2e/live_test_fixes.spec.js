// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Live Test of f645c09 - 3 Bug Fixes Verification", () => {
  const artifactDir = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";
  const docDir = path.join(process.cwd(), "docs", "screenshots", "live_test_fixes");

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

  test("1. Audio Playback: Default mute=false, real click plays audio & highlights words, word tap plays, mute toast verified", async ({ page }) => {
    // 1A. Verify Mosque Mute Toast when mute is true
    await page.goto("/index.html#quran/1/2");
    await page.waitForSelector("#btn-audio-play");

    // Force mute to true in localStorage to test toast
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      s.mosqueMute = true;
      localStorage.setItem("baseerah_settings", JSON.stringify(s));
      if (window.state && window.state.settings) window.state.settings.mosqueMute = true;
    });
    await page.reload();
    await page.waitForSelector("#btn-audio-play");

    // Real user click with locator.click()
    await page.locator("#btn-audio-play").click();
    const toast = page.locator(".baseerah-toast, .toast, [role='alert'], .toast-notification").first();
    await expect(toast).toBeVisible({ timeout: 4000 });
    const toastText = await toast.textContent();
    expect(toastText).toMatch(/احترامِ مسجد موڈ|Mosque Respect Mode|آواز بند ہے/);

    // 1B. Reset to default (mute = false)
    await page.evaluate(() => {
      localStorage.removeItem("baseerah_settings");
      if (window.state && window.state.settings) window.state.settings.mosqueMute = false;
    });
    await page.reload();
    await page.waitForSelector("#btn-audio-play");

    // Verify storage default
    const isMutedDefault = await page.evaluate(() => {
      return window.audioManager ? window.audioManager.isMuted() : false;
    });
    expect(isMutedDefault).toBe(false);

    // 1C. Track network .mp3 requests
    const mp3Requests = [];
    page.on("request", (req) => {
      if (req.url().includes(".mp3")) {
        mp3Requests.push(req.url());
      }
    });

    // 1D. Real user click on Play button
    await page.locator("#btn-audio-play").click();

    // Wait 3.2 seconds
    await page.waitForTimeout(3200);

    // Assert: MP3 was requested
    expect(mp3Requests.length).toBeGreaterThan(0);
    expect(mp3Requests.some((url) => url.includes("001002.mp3"))).toBe(true);

    // Assert: audio.currentTime > 0 after 3s
    const playbackState = await page.evaluate(() => {
      const audio = window.audioManager ? window.audioManager.currentAudio : null;
      return {
        hasAudio: !!audio,
        currentTime: audio ? audio.currentTime : 0,
        paused: audio ? audio.paused : true,
      };
    });
    expect(playbackState.hasAudio).toBe(true);
    expect(playbackState.currentTime).toBeGreaterThan(0);
    expect(playbackState.paused).toBe(false);

    // Assert: a word tile gets .audio-active-word during playback
    const activeTileCount = await page.locator(".wbw-interlinear-tile.audio-active-word").count();
    expect(activeTileCount).toBeGreaterThanOrEqual(1);

    // Pause audio
    await page.locator("#btn-audio-play").click();
    await page.waitForTimeout(300);

    // 1E. Test word tap -> word audio plays
    const wordTile = page.locator(".wbw-interlinear-tile").first();
    await wordTile.click();
    await page.waitForTimeout(1000);

    expect(mp3Requests.some((url) => url.includes("wbw") || url.includes("001_002_001"))).toBe(true);
    const wordAudioState = await page.evaluate(() => {
      const wa = window.audioManager ? window.audioManager.currentWordAudio : null;
      return {
        hasWordAudio: !!wa,
        currentTime: wa ? wa.currentTime : 0,
      };
    });
    expect(wordAudioState.hasWordAudio).toBe(true);
    expect(wordAudioState.currentTime).toBeGreaterThan(0);
  });

  test("2. Desktop Arrows Viewport Bounds & Non-Overlap at 1280x800, 1422x650, 1918x904, 2560x1440 (UR & EN UI)", async ({ page }) => {
    const viewports = [
      { width: 1280, height: 800 },
      { width: 1422, height: 650 },
      { width: 1918, height: 904 },
      { width: 2560, height: 1440 },
    ];

    for (const lang of ["ur", "en"]) {
      for (const vp of viewports) {
        await page.setViewportSize(vp);
        await page.goto("/index.html#quran/1/2");
        await page.evaluate((l) => {
          const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
          s.lang = l;
          localStorage.setItem("baseerah_settings", JSON.stringify(s));
          if (window.state) window.state.lang = l;
        }, lang);
        await page.reload();
        await page.waitForSelector(".reading-card-container");
        await page.waitForSelector("#btn-next-ayah");
        await page.waitForSelector("#btn-prev-ayah");

        const bounds = await page.evaluate((vpWidth) => {
          const nextBtn = document.querySelector("#btn-next-ayah");
          const prevBtn = document.querySelector("#btn-prev-ayah");
          const tiles = Array.from(document.querySelectorAll(".wbw-interlinear-tile"));

          const nextRect = nextBtn.getBoundingClientRect();
          const prevRect = prevBtn.getBoundingClientRect();
          const tileRects = tiles.map((t) => t.getBoundingClientRect());

          // Check if buttons are fully inside viewport
          const nextInside = nextRect.left >= 0 && nextRect.right <= vpWidth;
          const prevInside = prevRect.left >= 0 && prevRect.right <= vpWidth;

          // Check overlap with any tile
          let nextOverlaps = false;
          let prevOverlaps = false;
          let minDistanceNext = 9999;
          let minDistancePrev = 9999;

          tileRects.forEach((tr) => {
            const overlapXNext = !(nextRect.right < tr.left || nextRect.left > tr.right);
            const overlapYNext = !(nextRect.bottom < tr.top || nextRect.top > tr.bottom);
            if (overlapXNext && overlapYNext) nextOverlaps = true;

            const distNext = Math.min(
              Math.abs(tr.left - nextRect.right),
              Math.abs(nextRect.left - tr.right)
            );
            if (distNext < minDistanceNext) minDistanceNext = distNext;

            const overlapXPrev = !(prevRect.right < tr.left || prevRect.left > tr.right);
            const overlapYPrev = !(prevRect.bottom < tr.top || prevRect.top > tr.bottom);
            if (overlapXPrev && overlapYPrev) prevOverlaps = true;

            const distPrev = Math.min(
              Math.abs(tr.left - prevRect.right),
              Math.abs(prevRect.left - tr.right)
            );
            if (distPrev < minDistancePrev) minDistancePrev = distPrev;
          });

          return {
            nextRect,
            prevRect,
            nextInside,
            prevInside,
            nextOverlaps,
            prevOverlaps,
            minDistanceNext,
            minDistancePrev,
          };
        }, vp.width);

        expect(bounds.nextInside).toBe(true);
        expect(bounds.prevInside).toBe(true);
        expect(bounds.nextOverlaps).toBe(false);
        expect(bounds.prevOverlaps).toBe(false);
        expect(bounds.minDistanceNext).toBeGreaterThanOrEqual(8);
        expect(bounds.minDistancePrev).toBeGreaterThanOrEqual(8);
      }
    }
  });

  test("3. Morphology Colour Bars (Underline): 4px bar, >=8px separation from divider, toolbar legend visible", async ({ page }) => {
    await page.setViewportSize({ width: 1422, height: 650 });
    await page.goto("/index.html?lang=ur#quran/1/2");
    await page.waitForSelector(".wbw-interlinear-tile");

    // Enable morphology
    const morphToggle = page.locator("#btn-toggle-morphology");
    if (!(await morphToggle.evaluate((el) => el.classList.contains("active")))) {
      await morphToggle.click();
    }
    // Set style to underline
    const underBtn = page.locator('.morph-style-btn[data-morph-style="underline"]');
    if (await underBtn.isVisible()) {
      await underBtn.click();
    }
    await page.waitForTimeout(400);

    // Verify toolbar legend banner
    const legend = page.locator("#morphology-toolbar-legend");
    await expect(legend).toBeVisible();
    const legendText = await legend.textContent();
    expect(legendText).toContain("گولڈ = سابقہ");
    expect(legendText).toContain("سبز = لاحقہ");

    // Inspect bar geometry vs divider in Urdu UI
    const geo = await page.evaluate(() => {
      const tile = document.querySelector(".wbw-interlinear-tile");
      const divider = tile.querySelector(".tile-gold-divider");
      const bar = tile.querySelector(".morph-bar");
      const bRect = bar.getBoundingClientRect();
      const dRect = divider.getBoundingClientRect();
      const bStyle = window.getComputedStyle(bar);
      return {
        barHeight: bRect.height,
        barOpacity: bStyle.opacity,
        distanceBarToDivider: dRect.top - bRect.bottom,
      };
    });

    expect(geo.barHeight).toBe(4);
    expect(parseFloat(geo.barOpacity)).toBe(1.0);
    expect(geo.distanceBarToDivider).toBeGreaterThanOrEqual(8);

    // Switch to English UI and verify legend
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      s.lang = "en";
      localStorage.setItem("baseerah_settings", JSON.stringify(s));
      if (window.state) window.state.lang = "en";
    });
    await page.reload();
    await page.waitForSelector(".wbw-interlinear-tile");
    if (!(await morphToggle.evaluate((el) => el.classList.contains("active")))) {
      await morphToggle.click();
    }
    await page.waitForTimeout(300);
    const legendEn = page.locator("#morphology-toolbar-legend");
    await expect(legendEn).toBeVisible();
    const legendEnText = await legendEn.textContent();
    expect(legendEnText).toContain("gold = prefix");
    expect(legendEnText).toContain("green = suffix");
  });

  test("4. Capture side-by-side screenshots of 1:2 in Underline vs Tint for client review", async ({ page }) => {
    await page.setViewportSize({ width: 1422, height: 650 });

    // Underline Style (Urdu UI)
    await page.goto("/index.html#quran/1/2");
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      s.lang = "ur";
      localStorage.setItem("baseerah_settings", JSON.stringify(s));
      if (window.state) window.state.lang = "ur";
    });
    await page.reload();
    await page.waitForSelector(".wbw-interlinear-tile");
    const morphToggle = page.locator("#btn-toggle-morphology");
    if (!(await morphToggle.evaluate((el) => el.classList.contains("active")))) {
      await morphToggle.click();
    }
    const underBtn = page.locator('.morph-style-btn[data-morph-style="underline"]');
    if (await underBtn.isVisible()) {
      await underBtn.click();
    }
    await page.waitForTimeout(400);
    await saveImg(page, "quran_1_2_underline_ur_1422x650.png");

    // Tint Style (Urdu UI)
    const tintBtn = page.locator('.morph-style-btn[data-morph-style="tint"]');
    if (await tintBtn.isVisible()) {
      await tintBtn.click();
    }
    await page.waitForTimeout(400);
    await saveImg(page, "quran_1_2_tint_ur_1422x650.png");

    // Underline Style (English UI)
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      s.lang = "en";
      localStorage.setItem("baseerah_settings", JSON.stringify(s));
      if (window.state) window.state.lang = "en";
    });
    await page.reload();
    await page.waitForSelector(".wbw-interlinear-tile");
    if (!(await morphToggle.evaluate((el) => el.classList.contains("active")))) {
      await morphToggle.click();
    }
    if (await underBtn.isVisible()) {
      await underBtn.click();
    }
    await page.waitForTimeout(400);
    await saveImg(page, "quran_1_2_underline_en_1422x650.png");

    // Tint Style (English UI)
    if (await tintBtn.isVisible()) {
      await tintBtn.click();
    }
    await page.waitForTimeout(400);
    await saveImg(page, "quran_1_2_tint_en_1422x650.png");
  });
});
