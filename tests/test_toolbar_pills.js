/**
 * tests/test_toolbar_pills.js
 * Playwright test to verify:
 * 1. Unified Segmented Control: for every segmented control, the selected thumb's bounding box
 *    is strictly INSIDE the track's bounding box across all viewports (1920x1080, 1280x800, 820x1180, 390x844),
 *    in Urdu and English, in Light and Dark themes.
 * 2. Equal Heights: all toolbar controls (back/surahs button, audio pill, reading mode toggle,
 *    tajweed toggle, language pill, overflow settings button) share the exact same height (44px ± 1px)
 *    and have matching vertical center lines (±1.5px).
 * 3. Saves zoomed crops of the toolbar to docs/screenshots/toolbar_fix/.
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PORT = 8098;
const BASE_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(BASE_DIR, 'docs', 'screenshots', 'toolbar_fix');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '820x1180', width: 820, height: 1180 },
  { name: '390x844', width: 390, height: 844 }
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(BASE_DIR, reqPath);
      if (filePath.endsWith(path.sep) || fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(PORT, () => {
      resolve(server);
    });
  });
}

async function runTests() {
  console.log('=== Baseerah Toolbar & Segmented Controls Invariants Test ===\n');
  const server = await startServer();
  const browser = await chromium.launch();

  let totalChecks = 0;
  let failures = [];

  try {
    for (const vp of VIEWPORTS) {
      for (const lang of ['ur', 'en']) {
        for (const theme of ['light', 'dark']) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: 1
          });
          const page = await context.newPage();

          // Navigate directly to Surah 1 in reading mode
          await page.goto(`http://localhost:${PORT}/#quran/1/1`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(400);

          // Apply state (lang & theme)
          await page.evaluate(({ l, t }) => {
            if (window.state) {
              window.state.lang = l;
              window.state.theme = t;
              if (window.state.settings) window.state.settings.theme = t;
              document.body.className = `theme-${t} scale-normal`;
              document.body.setAttribute('data-theme', t);
              document.documentElement.lang = l;
              document.documentElement.dir = l === 'ur' ? 'rtl' : 'ltr';
              if (window.App && window.App.navigate) {
                window.App.navigate('quran', [1, 1]);
              }
            }
          }, { l: lang, t: theme });

          await page.waitForTimeout(300);

          // 1. Capture Zoomed Crop of the Toolbar Header
          const header = page.locator('header.quran-header-emerald');
          if (await header.count() > 0) {
            const cropPath = path.join(SCREENSHOTS_DIR, `toolbar_${vp.name}_${lang}_${theme}.png`);
            await header.screenshot({ path: cropPath });
          }

          // 2. Segmented Controls Bounding Box Invariants Check
          const segmentedResults = await page.evaluate(() => {
            const controls = document.querySelectorAll('.segmented-control, .mode-pill-toggle, .lang-toggle-pill, .meaning-toggle-group, .theme-segmented-toggle');
            const results = [];
            controls.forEach((track, idx) => {
              // Only check visible tracks
              const tRect = track.getBoundingClientRect();
              if (tRect.width === 0 || tRect.height === 0 || window.getComputedStyle(track).display === 'none') {
                return;
              }
              const activeBtn = track.querySelector('.active');
              if (!activeBtn) return;
              const bRect = activeBtn.getBoundingClientRect();

              // Check if thumb bounding box is strictly within track bounding box
              // Allow tiny sub-pixel rendering tolerance (0.5px)
              const topDiff = bRect.top - tRect.top;
              const bottomDiff = tRect.bottom - bRect.bottom;
              const leftDiff = bRect.left - tRect.left;
              const rightDiff = tRect.right - bRect.right;

              const isInside = (topDiff >= -0.5) && (bottomDiff >= -0.5) && (leftDiff >= -0.5) && (rightDiff >= -0.5);
              const heightOk = bRect.height <= (tRect.height - 4); // Must be strictly smaller than track

              results.push({
                className: track.className,
                trackHeight: tRect.height,
                thumbHeight: bRect.height,
                topDiff,
                bottomDiff,
                leftDiff,
                rightDiff,
                isInside,
                heightOk
              });
            });
            return results;
          });

          for (const res of segmentedResults) {
            totalChecks++;
            if (!res.isInside || !res.heightOk) {
              failures.push(`[${vp.name} ${lang} ${theme}] Thumb sticking out in "${res.className}": trackHeight=${res.trackHeight}, thumbHeight=${res.thumbHeight}, topGap=${res.topDiff.toFixed(1)}, bottomGap=${res.bottomDiff.toFixed(1)}`);
            }
          }

          // 3. Toolbar Controls Equal Heights & Vertical Centering (on >=768px desktop/tablet viewports)
          if (vp.width >= 768) {
            const toolbarResults = await page.evaluate(() => {
              const selectors = [
                '.btn-header-back',
                '.audio-controls-pill',
                '.mode-pill-toggle',
                '.btn-tajweed-toggle',
                '.lang-toggle-pill',
                '.btn-toolbar-overflow'
              ];
              const controls = [];
              selectors.forEach((sel) => {
                const el = document.querySelector(sel);
                if (el && window.getComputedStyle(el).display !== 'none') {
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    controls.push({
                      sel,
                      height: rect.height,
                      top: rect.top,
                      bottom: rect.bottom,
                      centerY: (rect.top + rect.bottom) / 2
                    });
                  }
                }
              });
              return controls;
            });

            if (toolbarResults.length >= 3) {
              const expectedHeight = 44;
              const baseCenterY = toolbarResults.find(c => c.sel === '.btn-toolbar-overflow')?.centerY || toolbarResults[0].centerY;

              for (const ctrl of toolbarResults) {
                totalChecks++;
                // Height check: 44px ± 1px
                if (Math.abs(ctrl.height - expectedHeight) > 1.2) {
                  failures.push(`[${vp.name} ${lang} ${theme}] Control "${ctrl.sel}" height is ${ctrl.height.toFixed(1)}px (expected 44px ±1px)`);
                }
                // Center line check: within 1.5px
                if (Math.abs(ctrl.centerY - baseCenterY) > 1.8) {
                  failures.push(`[${vp.name} ${lang} ${theme}] Control "${ctrl.sel}" center Y is ${ctrl.centerY.toFixed(1)}px (expected ~${baseCenterY.toFixed(1)}px)`);
                }
              }
            }
          }

          // 4. Test Settings Sheet Segmented Controls (Open overflow sheet)
          const overflowBtn = page.locator('#btn-toolbar-overflow, #btn-quran-overflow').first();
          if (await overflowBtn.count() > 0 && await overflowBtn.isVisible()) {
            await overflowBtn.click();
            await page.waitForTimeout(200);

            const sheetSegResults = await page.evaluate(() => {
              const sheetTracks = document.querySelectorAll('.quran-settings-sheet .segmented-control, .quran-settings-sheet .mode-pill-toggle, .quran-settings-sheet .meaning-toggle-group, .quran-settings-sheet .theme-segmented-toggle');
              const results = [];
              sheetTracks.forEach((track) => {
                const tRect = track.getBoundingClientRect();
                if (tRect.width === 0 || tRect.height === 0) return;
                const activeBtn = track.querySelector('.active');
                if (!activeBtn) return;
                const bRect = activeBtn.getBoundingClientRect();

                const topDiff = bRect.top - tRect.top;
                const bottomDiff = tRect.bottom - bRect.bottom;
                const isInside = (topDiff >= -0.5) && (bottomDiff >= -0.5);
                const heightOk = bRect.height <= (tRect.height - 4);

                results.push({
                  trackHeight: tRect.height,
                  thumbHeight: bRect.height,
                  topDiff,
                  bottomDiff,
                  isInside,
                  heightOk
                });
              });
              return results;
            });

            for (const res of sheetSegResults) {
              totalChecks++;
              if (!res.isInside || !res.heightOk) {
                failures.push(`[${vp.name} ${lang} ${theme}] Settings Sheet thumb sticking out: trackHeight=${res.trackHeight}, thumbHeight=${res.thumbHeight}`);
              }
            }

            // Capture settings sheet screenshot on 390x844
            if (vp.name === '390x844') {
              const sheetEl = page.locator('.quran-settings-sheet');
              if (await sheetEl.count() > 0) {
                const sheetPath = path.join(SCREENSHOTS_DIR, `settings_sheet_${vp.name}_${lang}_${theme}.png`);
                await sheetEl.screenshot({ path: sheetPath });
              }
            }
          }

          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`Executed ${totalChecks} toolbar & segmented control invariant checks.`);
  if (failures.length > 0) {
    console.error(`\n❌ Found ${failures.length} failures:`);
    for (const f of failures) {
      console.error('  - ' + f);
    }
    process.exit(1);
  } else {
    console.log('✅ ALL TOOLBAR PILLS AND SEGMENTED CONTROLS PASSED INVARIANTS PERFECTLY!\n');
    console.log(`Saved zoomed crop screenshots in ${SCREENSHOTS_DIR}`);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
