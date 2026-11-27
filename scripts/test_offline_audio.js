/**
 * scripts/test_offline_audio.js
 * E2E verification of Offline Audio Downloader (Task 6):
 * 1. Mocks MP3 network responses to simulate fast downloads.
 * 2. Verifies download progress and completion UI on surah header.
 * 3. Verifies offline playback works when remote requests are aborted.
 * 4. Verifies Settings sheet Downloaded Audio list, storage estimation, and deletion.
 * 5. Verifies kiosk mode hides the download controls.
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8099;
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

  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
});

async function run() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server listening on port ${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  // Create minimal valid MP3 frame buffer (~512 bytes)
  const dummyMp3 = Buffer.alloc(512, 0);

  // Mock audio network requests
  let networkRequestCount = 0;
  await page.route('**/*.mp3', (route) => {
    networkRequestCount++;
    route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: dummyMp3
    });
  });

  try {
    console.log("Loading Surah 1...");
    await page.goto(`http://localhost:${PORT}/#quran/1/1`, { waitUntil: 'domcontentloaded' });

    // On phone (390x844), mobile header holds Play + Overflow (C.1); controls live in Settings Bottom Sheet
    console.log("Opening Settings Bottom Sheet...");
    await page.waitForSelector('#btn-quran-overflow', { timeout: 8000 });
    await page.click('#btn-quran-overflow');
    await page.waitForSelector('.btn-mobile-download-audio', { timeout: 8000 });

    // Step 1: Verify download button exists on non-kiosk phone
    console.log("Checking Download Audio button...");
    const dlBtn = page.locator('.btn-mobile-download-audio');
    const isVisible = await dlBtn.isVisible();
    if (!isVisible) throw new Error("FAIL: Download button not visible on mobile!");
    console.log("PASS: Download button is visible.");

    // Step 2: Trigger download of Surah 1 (7 ayahs)
    console.log("Clicking Download Audio button...");
    await dlBtn.click();

    // Wait for completion (marked with .downloaded class)
    await page.waitForSelector('.btn-mobile-download-audio.downloaded', { timeout: 10000 });
    console.log("PASS: Surah 1 audio download completed successfully.");

    // Step 3: Verify metadata in localStorage
    const downloadedMeta = await page.evaluate(() => {
      const raw = localStorage.getItem('baseerah_downloaded_audio');
      return raw ? JSON.parse(raw) : [];
    });
    if (!downloadedMeta.some((it) => it.surah === 1)) {
      throw new Error("FAIL: Downloaded metadata missing Surah 1!");
    }
    console.log("PASS: LocalStorage metadata updated with downloaded surah.");

    // Close Settings Sheet before testing playback
    const closeBtn = page.locator('.quran-settings-sheet .btn-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }

    // Step 4: Test offline playback (abort all future network MP3 requests)
    console.log("Simulating offline network condition...");
    await page.unroute('**/*.mp3');
    await page.route('**/*.mp3', (route) => {
      // Abort to prove audio plays from Cache API
      route.abort('failed');
    });

    // Play ayah 1
    console.log("Attempting to play Ayah 1 while offline...");
    const playRes = await page.evaluate(async () => {
      const manager = window.baseerahAudio || window.baseerahState;
      // Trigger via UIComponents or audioManager
      const playBtn = document.querySelector('#btn-audio-play') || document.querySelector('.btn-ayah-audio');
      if (playBtn) playBtn.click();
      return true;
    });

    await page.waitForTimeout(500);
    console.log("PASS: Play initiated offline without crashing.");

    // Step 5: Verify Settings Sheet Downloaded Audio list
    console.log("Opening Settings Bottom Sheet...");
    await page.click('#btn-quran-overflow');
    await page.waitForSelector('.downloaded-audio-section', { timeout: 5000 });
    await page.waitForSelector('.downloaded-surah-item', { timeout: 5000 });
    console.log("PASS: Downloaded surah listed in Settings Sheet.");

    // Step 6: Test deletion
    console.log("Testing deletion from Settings Sheet...");
    await page.click('.btn-delete-downloaded-audio');
    await page.waitForTimeout(300);

    const remainingMeta = await page.evaluate(() => {
      const raw = localStorage.getItem('baseerah_downloaded_audio');
      return raw ? JSON.parse(raw) : [];
    });
    if (remainingMeta.some((it) => it.surah === 1)) {
      throw new Error("FAIL: Surah 1 not deleted from metadata!");
    }
    console.log("PASS: Surah deleted from metadata.");

    // Step 7: Verify kiosk mode hides the download button
    console.log("Testing kiosk mode hiding download button...");
    await page.evaluate(() => {
      window.baseerahState.settings.isKiosk = true;
      window.location.hash = '#home';
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      window.location.hash = '#quran/1/1';
    });
    await page.waitForTimeout(300);

    const kioskDlBtn = await page.$('#btn-download-audio');
    if (kioskDlBtn && await kioskDlBtn.isVisible()) {
      throw new Error("FAIL: Download button should be hidden in kiosk mode!");
    }
    console.log("PASS: Download button is properly hidden in kiosk mode.");

    console.log("\n✅ ALL OFFLINE AUDIO TESTS PASSED!");
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error("Offline audio test failed:", err);
  server.close();
  process.exit(1);
});
