/**
 * scripts/check_a11y_axe.js
 * Automated Accessibility Audit using axe-core and Playwright.
 *
 * Checks:
 * 1. #home
 * 2. #quran/1/1
 * 3. #quran/2/1
 * 4. #namaz/steps
 * 5. Settings bottom sheet
 * 6. Bookmarks modal
 *
 * Asserts ZERO violations with impact "serious" or "critical".
 * Logs any "moderate" or "minor" violations for review.
 */

const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8086;
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

async function run() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[A11y] Server listening on http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const auditTargets = [
    { name: 'Home Screen (#home)', hash: '#home', setup: async () => {} },
    { name: 'Quran Screen 1:1 (#quran/1/1)', hash: '#quran/1/1', setup: async (page) => {
      await page.waitForSelector('.wbw-interlinear-tile, .mushaf-ayah-block', { timeout: 8000 });
    }},
    { name: 'Quran Screen 2:1 (#quran/2/1)', hash: '#quran/2/1', setup: async (page) => {
      await page.waitForSelector('.wbw-interlinear-tile, .mushaf-ayah-block', { timeout: 8000 });
    }},
    { name: 'Quran Screen 2:1 Word-by-word', hash: '#quran/2/1', setup: async (page) => {
      await page.waitForSelector('.mushaf-ayah-block, .wbw-interlinear-tile', { timeout: 8000 });
      await page.evaluate(() => { window.baseerahState.settings.readingMode = 'wbw'; window.baseerahState.notify(); window.baseerahRouter.resolveRoute(); });
      await page.waitForSelector('.wbw-interlinear-tile', { timeout: 8000 });
    }},
    { name: 'Namaz Steps Screen (#namaz/steps)', hash: '#namaz/steps', setup: async (page) => {
      await page.waitForSelector('.namaz-steps-rail', { timeout: 8000 });
    }},
    { name: 'Settings Bottom Sheet', hash: '#quran/2/1', setup: async (page) => {
      await page.waitForSelector('.wbw-interlinear-tile, .mushaf-ayah-block', { timeout: 8000 });
      await page.evaluate(() => {
        window.BASEERAH_COMPONENTS?.showQuranSettingsBottomSheet?.({ onChange: () => {} });
      });
      await page.waitForSelector('.bottom-sheet-overlay.active', { timeout: 5000 });
    }},
    { name: 'Bookmarks Modal', hash: '#quran/2/1', setup: async (page) => {
      await page.waitForSelector('.wbw-interlinear-tile, .mushaf-ayah-block', { timeout: 8000 });
      await page.evaluate(() => {
        window.BASEERAH_COMPONENTS?.showBookmarksModal?.(() => {});
      });
      await page.waitForSelector('.bookmarks-modal-card', { timeout: 5000 });
    }}
  ];

  let totalSeriousOrCritical = 0;
  const auditResults = [];

  for (const target of auditTargets) {
    console.log(`\n[A11y] Auditing: ${target.name}...`);
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/${target.hash}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await target.setup(page);
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    const moderateOrMinor = results.violations.filter(
      (v) => v.impact === 'moderate' || v.impact === 'minor'
    );

    auditResults.push({
      target: target.name,
      seriousOrCritical: seriousOrCritical.length,
      moderateOrMinor: moderateOrMinor.length,
      violations: results.violations
    });

    if (seriousOrCritical.length > 0) {
      console.error(`  ❌ FAIL: ${seriousOrCritical.length} serious/critical violations:`);
      for (const v of seriousOrCritical) {
        console.error(`     - [${v.impact.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
        for (const node of v.nodes.slice(0, 3)) {
          console.error(`       HTML: ${node.html}`);
          console.error(`       Failure summary: ${node.failureSummary}`);
        }
      }
      totalSeriousOrCritical += seriousOrCritical.length;
    } else {
      console.log(`  ✅ PASS: 0 serious or critical violations.`);
    }

    if (moderateOrMinor.length > 0) {
      console.log(`  ℹ️ Notice: ${moderateOrMinor.length} moderate/minor violations:`);
      for (const v of moderateOrMinor) {
        console.log(`     - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
      }
    }
    await page.close();
  }

  await browser.close();
  server.close();

  // Write report
  const reportPath = path.join(BASE_DIR, 'docs', 'a11y_axe_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2), 'utf-8');
  console.log(`\n[A11y] Audit report written to ${reportPath}`);

  if (totalSeriousOrCritical > 0) {
    console.error(`\n❌ A11y Audit FAILED: ${totalSeriousOrCritical} total serious/critical violations found.`);
    process.exit(1);
  } else {
    console.log(`\n✅ A11y Audit PASSED: Zero serious or critical violations across all tested views.`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('[A11y] Error during audit:', err);
  if (server) server.close();
  process.exit(1);
});
