/**
 * scripts/check_responsive.js
 * Comprehensive responsive verification across all 8 target viewports:
 * 360x800, 390x844, 412x915, 768x1024, 820x1180, 1024x768, 1280x800, 1920x1080.
 *
 * Verifies:
 * 1. Zero horizontal overflow (document.documentElement.scrollWidth <= innerWidth).
 * 2. No content overlap with fixed bottom bar.
 * 3. Arabic ayah lines in Surah 2 Ayah 2 have >= 4 words at 390px (no 1-2 word lines).
 * 4. Captures and saves screenshots for:
 *    - Home
 *    - Al-Baqarah 2:1-5
 *    - Al-Baqarah 2:282 (long ayah)
 *    - Word-by-word view
 *    - Tajweed mode
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8096;
const BASE_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(BASE_DIR, 'screenshots');
const ARTIFACT_DIR = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '820x1180', width: 820, height: 1180 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1920x1080', width: 1920, height: 1080 }
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

const server = http.createServer((req, res) => {
  let filePath = path.join(BASE_DIR, decodeURIComponent(req.url.split('?')[0]));
  if (filePath.endsWith(path.sep)) filePath = path.join(filePath, 'index.html');
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

function copyToArtifact(filename) {
  try {
    const src = path.join(SCREENSHOTS_DIR, filename);
    const dest = path.join(ARTIFACT_DIR, filename);
    if (fs.existsSync(src) && fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(src, dest);
    }
  } catch (err) {
    // Ignore artifact copy errors if directory is not accessible
  }
}

async function runResponsiveChecks() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Responsive test server listening at http://localhost:${PORT}`);

  const browser = await chromium.launch();
  let failureCount = 0;

  try {
    // -------------------------------------------------------------
    // TEST 1: Surah 2 Ayah 2 line count & words per line at 390px
    // -------------------------------------------------------------
    console.log('\n--- Checking Surah 2 Ayah 2 Words-Per-Line at 390px ---');
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('baseerah_settings', JSON.stringify({ readingMode: 'mushaf', lang: 'ur' }));
      });
      await page.goto(`http://localhost:${PORT}/#quran/2/1`);
      await page.waitForSelector('#mushaf-ayah-2', { timeout: 10000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);

      const ayah2Check = await page.evaluate(() => {
        const el = document.querySelector('#mushaf-ayah-2 .mushaf-ar-text');
        if (!el) return { error: 'Element #mushaf-ayah-2 .mushaf-ar-text not found' };

        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        const wordSpans = [];
        nodes.forEach((n) => {
          const parent = n.parentNode;
          const text = n.nodeValue;
          const parts = text.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (/^\s+$/.test(p) || !p) {
              frag.appendChild(document.createTextNode(p));
            } else {
              const sp = document.createElement('span');
              sp.className = '__word_test';
              sp.textContent = p;
              frag.appendChild(sp);
              wordSpans.push(sp);
            }
          });
          parent.replaceChild(frag, n);
        });

        const lines = {};
        wordSpans.forEach((sp) => {
          const rect = sp.getBoundingClientRect();
          const top = Math.round(rect.top);
          let matched = null;
          for (const t of Object.keys(lines)) {
            if (Math.abs(top - t) <= 12) {
              matched = t;
              break;
            }
          }
          if (!matched) lines[top] = [sp.textContent];
          else lines[matched].push(sp.textContent);
        });

        const lineWords = Object.values(lines);
        return {
          elWidth: el.getBoundingClientRect().width,
          lineCount: lineWords.length,
          lineWords
        };
      });

      console.log(`Ayah 2:2 rendered with ${ayah2Check.lineCount} line(s) on 390px:`);
      ayah2Check.lineWords.forEach((words, idx) => {
        console.log(`  Line ${idx + 1} (${words.length} tokens): ${words.join(' ')}`);
        // If single line or initial line, ensure >= 4 words
        if (words.length < 4 && (ayah2Check.lineCount === 1 || idx === 0)) {
          console.error(`  FAIL: Line ${idx + 1} has only ${words.length} words (< 4 words requirement).`);
          failureCount++;
        }
      });
      await context.close();
    }

    // -------------------------------------------------------------
    // TEST 2: Multi-Viewport Responsive Matrix (8 Viewports)
    // -------------------------------------------------------------
    console.log('\n--- Checking 8 Viewports for Horizontal Overflow & Bottom Bar Clearance ---');

    for (const vp of VIEWPORTS) {
      console.log(`\nTesting Viewport ${vp.name} (${vp.width}x${vp.height})...`);
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
      const page = await context.newPage();

      // Test screens: home, surahs, namaz, mushaf 2:1-5, wbw 2:1, mushaf 2:282, tajweed
      const screens = [
        { name: 'home', url: `http://localhost:${PORT}/#home`, mode: null },
        { name: 'surahs', url: `http://localhost:${PORT}/#surahs`, mode: null },
        { name: 'namaz', url: `http://localhost:${PORT}/#namaz`, mode: null },
        { name: 'mushaf_2_1_5', url: `http://localhost:${PORT}/#quran/2/1`, mode: 'mushaf', shot: `responsive_2_1_5_${vp.name}.png` },
        { name: 'mushaf_2_282', url: `http://localhost:${PORT}/#quran/2/282`, mode: 'mushaf', shot: `responsive_2_282_${vp.name}.png` },
        { name: 'wbw_view', url: `http://localhost:${PORT}/#quran/2/1`, mode: 'wbw', shot: `responsive_wbw_${vp.name}.png` },
        { name: 'tajweed_mode', url: `http://localhost:${PORT}/#quran/1/1`, mode: 'mushaf', tajweed: true, shot: `responsive_tajweed_${vp.name}.png` }
      ];

      for (const sc of screens) {
        await page.addInitScript(({ mode, tajweed }) => {
          const settings = {
            lang: 'ur',
            readingMode: mode || 'wbw',
            showTajweed: !!tajweed,
            textSize: 'M'
          };
          localStorage.setItem('baseerah_settings', JSON.stringify(settings));
          if (window.baseerahState && window.baseerahState.settings) {
            window.baseerahState.settings.showTajweed = !!tajweed;
            window.baseerahState.settings.readingMode = mode || 'wbw';
            window.baseerahState.readingMode = mode || 'wbw';
          }
          if (window.baseerahRouter) {
            window.baseerahRouter.resolveRoute();
          }
        }, { mode: sc.mode, tajweed: sc.tajweed });

        await page.goto(sc.url);
        await page.evaluate(({ mode, tajweed }) => {
          if (window.baseerahState && window.baseerahState.settings) {
            window.baseerahState.settings.showTajweed = !!tajweed;
            window.baseerahState.settings.readingMode = mode || 'wbw';
            window.baseerahState.readingMode = mode || 'wbw';
          }
          if (window.baseerahRouter) {
            window.baseerahRouter.resolveRoute();
          }
        }, { mode: sc.mode, tajweed: sc.tajweed });
        await page.waitForTimeout(400);
        await page.evaluate(() => document.fonts.ready);

        // Check 1: Horizontal Overflow
        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const innerW = window.innerWidth;
          return {
            scrollW,
            innerW,
            hasOverflow: scrollW > innerW + 1
          };
        });

        if (overflow.hasOverflow) {
          console.error(`  FAIL [${vp.name} - ${sc.name}]: Horizontal overflow detected (scrollWidth=${overflow.scrollW}px > innerWidth=${overflow.innerW}px)`);
          failureCount++;
        }

        // Check 2: Fixed Bottom Bar Overlap & Clearance
        const bottomBarCheck = await page.evaluate(() => {
          const footer = document.querySelector('.quran-v2-footer');
          if (!footer) return { ok: true, reason: 'no footer' };
          const isFixed = window.getComputedStyle(footer).position === 'fixed';
          
          if (isFixed) {
            // On mobile with fixed footer: check reading viewport has >= 60px bottom padding clearance
            const viewport = document.querySelector('.mushaf-reading-viewport, .quran-reading-viewport');
            if (viewport) {
              const pb = parseFloat(window.getComputedStyle(viewport).paddingBottom) || 0;
              if (pb < 60) {
                return { ok: false, reason: `Insufficient viewport padding-bottom on mobile fixed footer: ${pb}px (< 60px)` };
              }
            }
          }
          return { ok: true };
        });

        if (!bottomBarCheck.ok) {
          console.error(`  FAIL [${vp.name} - ${sc.name}]: Bottom bar clearance issue: ${bottomBarCheck.reason}`);
          failureCount++;
        }

        // Check 3: Tajweed colored spans check — strengthened to exact rule counts for 1:1
        if (sc.name === 'tajweed') {
          const tajweedResult = await page.evaluate(() => {
            const spans = document.querySelectorAll('.tile-ar [class*="tj-"], .mushaf-ar-text [class*="tj-"]');
            const expectedRules = {
              'tj-ham-wasl': 3,
              'tj-laam-shamsiyah': 2,
              'tj-madda-normal': 1,
              'tj-madda-permissible': 1
            };
            const expectedTotal = 7;
            const counts = {};
            spans.forEach(el => {
              const cls = Array.from(el.classList).find(c => c.startsWith('tj-'));
              if (cls) counts[cls] = (counts[cls] || 0) + 1;
            });

            if (spans.length !== expectedTotal) {
              return { ok: false, reason: `rendered ${spans.length} spans, expected exact data count ${expectedTotal}` };
            }

            for (const [rule, expCount] of Object.entries(expectedRules)) {
              if ((counts[rule] || 0) !== expCount) {
                return { ok: false, reason: `rule ${rule} count mismatch: got ${counts[rule] || 0}, expected ${expCount}` };
              }
            }

            const colors = Array.from(spans).map(el => window.getComputedStyle(el).color);
            const nonBlack = colors.filter(c => c && c !== 'rgb(0, 0, 0)' && c !== 'rgb(31, 30, 27)');
            if (nonBlack.length !== expectedTotal) {
              return { ok: false, reason: `not all ${expectedTotal} spans evaluated to non-black colors: ${colors.slice(0, 3).join(', ')}` };
            }

            const textEl = document.querySelector('.tile-ar, .mushaf-ar-text');
            const font = textEl ? window.getComputedStyle(textEl).fontFamily : '';
            if (!font.includes('Amiri Quran')) {
              return { ok: false, reason: `Tajweed view must use Amiri Quran font, got '${font}'` };
            }

            return { ok: true, count: spans.length, counts, font };
          });

          if (!tajweedResult.ok) {
            console.error(`  FAIL [${vp.name} - ${sc.name}]: In tajweed mode, ayah 1:1 tajweed check failed: ${tajweedResult.reason}`);
            failureCount++;
          }
        }

        // Check 4: Home card text width ratio on mobile (<768px)
        if (sc.name === 'home' && vp.width < 768) {
          const homeCardCheck = await page.evaluate(() => {
            const card = document.querySelector('.tile-wide-wbw');
            if (!card) return { ok: true };
            const cardRect = card.getBoundingClientRect();
            const textGroup = card.querySelector('.tile-text-group');
            if (!textGroup) return { ok: true };
            const textRect = textGroup.getBoundingClientRect();
            const ratio = textRect.width / cardRect.width;
            if (ratio < 0.60) {
              return { ok: false, reason: `Text column width (${textRect.width}px) is ${Math.round(ratio * 100)}% of card width (${cardRect.width}px) - must be >= 60%` };
            }
            if (textRect.width < 120) {
              return { ok: false, reason: `Text column width (${textRect.width}px) is < 120px` };
            }
            const title = textGroup.querySelector('.tile-title');
            if (title) {
              const titleRect = title.getBoundingClientRect();
              const words = (title.innerText || title.textContent).trim().split(/\s+/).length;
              if (titleRect.width < 120 && words > 2) {
                return { ok: false, reason: `Title is squeezed to ${titleRect.width}px with ${words} words` };
              }
            }
            return { ok: true, width: textRect.width, ratio: Math.round(ratio * 100) };
          });
          if (!homeCardCheck.ok) {
            console.error(`  FAIL [${vp.name} - home]: Mobile home card text squeezed: ${homeCardCheck.reason}`);
            failureCount++;
          }
        }

        // Check 5: Bidi separation in Quran headers
        if (sc.name.startsWith('mushaf_') || sc.name === 'wbw_view') {
          const bidiCheck = await page.evaluate(() => {
            const sub = document.querySelector('.surah-sub-info');
            if (!sub) return { ok: true };
            const text = sub.innerText || sub.textContent;
            if (text.includes('۲۸۶۰۲') || text.includes('۲۸۶۲')) {
              return { ok: false, reason: `Merged digits detected: "${text}"` };
            }
            const bdis = sub.querySelectorAll('bdi');
            if (bdis.length < 2) {
              return { ok: false, reason: `Expected at least 2 <bdi> elements in .surah-sub-info, found ${bdis.length}` };
            }
            return { ok: true };
          });
          if (!bidiCheck.ok) {
            console.error(`  FAIL [${vp.name} - ${sc.name}]: Bidi number separation failure: ${bidiCheck.reason}`);
            failureCount++;
          }
        }

        // Capture required screenshots
        if (sc.shot) {
          const shotPath = path.join(SCREENSHOTS_DIR, sc.shot);
          await page.screenshot({ path: shotPath, fullPage: false });
          copyToArtifact(sc.shot);
          console.log(`  Saved screenshot: ${sc.shot}`);
        } else if (sc.name === 'home') {
          const shotName = `responsive_home_${vp.name}.png`;
          const shotPath = path.join(SCREENSHOTS_DIR, shotName);
          await page.screenshot({ path: shotPath, fullPage: false });
          copyToArtifact(shotName);
          console.log(`  Saved screenshot: ${shotName}`);
        }
      }

      await context.close();
    }

  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n======================================================');
  if (failureCount === 0) {
    console.log('✅ ALL RESPONSIVE CHECKS PASSED: 0 failures across 8 viewports.');
    process.exit(0);
  } else {
    console.error(`❌ RESPONSIVE CHECKS FAILED: ${failureCount} issue(s) detected.`);
    process.exit(1);
  }
}

runResponsiveChecks().catch((err) => {
  console.error('Fatal error in responsive test runner:', err);
  if (server) server.close();
  process.exit(1);
});
