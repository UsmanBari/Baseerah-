/**
 * scripts/test_smoke_114_surahs.js
 * Smoke test: opens all 114 surahs at 390x844 in both normal and tajweed mode.
 * Serves with real production CSP headers.
 * Fails on any:
 * 1. Console error or CSP violation
 * 2. Uncaught page error
 * 3. Blank/missing ayah
 * 4. Horizontal overflow (scrollWidth > innerWidth)
 * 5. Unknown 404 route handling failure
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8098;
const BASE_DIR = path.resolve(__dirname, '..');

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

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(BASE_DIR, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Apply Netlify-equivalent CSP and Security Headers
  const headers = {
    'Content-Type': contentType,
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'interest-cohort=(), camera=(), microphone=(), geolocation=(self)',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self' https://everyayah.com https://*.everyayah.com https://verses.quran.com https://audio.qurancdn.com; connect-src 'self' https://everyayah.com https://*.everyayah.com https://verses.quran.com https://audio.qurancdn.com; frame-ancestors 'none';"
  };

  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
});

async function run() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening on port ${PORT} with CSP headers`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore network errors to external audio CDNs when running offline
      if (!text.includes('everyayah.com') && !text.includes('Failed to load resource')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  let failedCount = 0;

  try {
    console.log("Navigating to initial page...");
    await page.goto(`http://localhost:${PORT}/#home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 1. Test 404 Route Handling
    console.log("Testing 404 route handling...");
    await page.evaluate(() => { window.location.hash = '#unknown/random/route'; });
    await page.waitForTimeout(100);
    const is404Visible = await page.evaluate(() => {
      const el = document.querySelector('.screen-notfound');
      return !!el && getComputedStyle(el).display !== 'none';
    });
    if (!is404Visible) {
      console.error("FAIL: 404 screen not displayed for invalid route!");
      failedCount++;
    } else {
      console.log("PASS: 404 route correctly resolved and rendered.");
    }

    // 2. Iterate through all 114 Surahs
    console.log("Testing all 114 Surahs in Normal and Tajweed mode at 390x844...");
    const modes = [
      { name: 'Normal', tajweed: false },
      { name: 'Tajweed', tajweed: true }
    ];

    for (const mode of modes) {
      console.log(`\n--- Starting Mode: ${mode.name} ---`);

      for (let surah = 1; surah <= 114; surah++) {
        await page.evaluate(({ s, tajweed }) => {
          if (window.baseerahState && window.baseerahState.settings) {
            window.baseerahState.settings.showTajweed = tajweed;
          }
          window.location.hash = `#quran/${s}/1`;
        }, { s: surah, tajweed: mode.tajweed });

        // Wait for async fetch and DOM render
        await page.waitForSelector('.ayah-card, .mushaf-ayah-span, .wbw-word-tile', { timeout: 10000 });

        const check = await page.evaluate(() => {
          const docEl = document.documentElement;
          const overflow = docEl.scrollWidth > window.innerWidth;
          
          // Check that at least one ayah tile / card / text exists and is non-empty
          const ayahCards = document.querySelectorAll('.ayah-card, .mushaf-ayah-span, .wbw-word-tile');
          const hasAyah = ayahCards.length > 0;
          const textLength = document.getElementById('app-container')?.innerText?.length || 0;

          return {
            overflow,
            hasAyah,
            textLength,
            scrollWidth: docEl.scrollWidth,
            innerWidth: window.innerWidth
          };
        });

        if (check.overflow) {
          console.error(`FAIL: Surah ${surah} [${mode.name}] has horizontal overflow: scrollWidth=${check.scrollWidth} > innerWidth=${check.innerWidth}`);
          failedCount++;
        }
        if (!check.hasAyah || check.textLength < 10) {
          console.error(`FAIL: Surah ${surah} [${mode.name}] has blank or missing ayah content!`);
          failedCount++;
        }

        if (mode.tajweed && surah === 1) {
          const tajweedResult = await page.evaluate(() => {
            const spans = document.querySelectorAll('[class*="tj-"]');
            if (spans.length < 4) {
              return { ok: false, reason: `found only ${spans.length} colored spans (< 4 required)` };
            }
            const colors = Array.from(spans).map(el => window.getComputedStyle(el).color);
            const nonBlack = colors.filter(c => c && c !== 'rgb(0, 0, 0)' && c !== 'rgb(31, 30, 27)');
            if (nonBlack.length === 0) {
              return { ok: false, reason: `all ${spans.length} spans evaluated to pure ink/black: ${colors.slice(0, 3).join(', ')}` };
            }
            return { ok: true, count: spans.length, sampleColor: colors[0] };
          });

          if (!tajweedResult.ok) {
            console.error(`FAIL: In tajweed mode, ayah 1:1 tajweed check failed: ${tajweedResult.reason}`);
            failedCount++;
          }
        }

        if (surah % 20 === 0 || surah === 114) {
          process.stdout.write(`  Surahs 1-${surah} validated...\n`);
        }
      }
    }

    if (consoleErrors.length > 0) {
      console.error(`FAIL: Encountered ${consoleErrors.length} console errors:`, consoleErrors);
      failedCount += consoleErrors.length;
    }

    if (pageErrors.length > 0) {
      console.error(`FAIL: Encountered ${pageErrors.length} uncaught page errors:`, pageErrors);
      failedCount += pageErrors.length;
    }

    if (failedCount === 0) {
      console.log("\nPASS: All 114 Surahs passed smoke test in both Normal and Tajweed mode at 390x844 (0 errors, 0 overflows, 0 blanks).");
    } else {
      console.error(`\nFAIL: Smoke test finished with ${failedCount} total failures.`);
      process.exit(1);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error("Smoke test unexpected error:", err);
  server.close();
  process.exit(1);
});
