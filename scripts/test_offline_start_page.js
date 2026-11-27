/**
 * scripts/test_offline_start_page.js
 * Verification for TWA/PWA Offline Startup (Requirement 3):
 * 1. Serves the app locally over HTTP.
 * 2. Navigates to the app root (/) on first visit.
 * 3. Waits for the Service Worker to register, install, and activate.
 * 4. Enables browser offline mode (context.setOffline(true)).
 * 5. Performs a fresh cold navigation to root (/) while completely offline.
 * 6. Asserts that the Service Worker serves the start page from cache,
 *    and the home UI renders properly with 0 errors.
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PORT = 8095;
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
  let reqPath = req.url.split('?')[0].split('#')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(BASE_DIR, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found: ' + reqPath);
  }
});

async function run() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`=== Offline Start Page Test ===\nTest server listening on port ${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Step 1: First visit to start page http://localhost:' + PORT + '/ ...');
  const response = await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  assert.strictEqual(response.status(), 200, 'Initial load must return status 200');

  console.log('Step 2: Waiting for Service Worker registration and activation...');
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('ServiceWorker not supported');
    await navigator.serviceWorker.ready;
  });

  // Give the SW installation and precaching a moment to fully settle
  await page.waitForTimeout(1200);

  // Check cache contents
  const hasIndexCached = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const indexMatch = (await cache.match('./index.html')) || (await cache.match('./'));
      if (indexMatch) return true;
    }
    return false;
  });
  assert.strictEqual(hasIndexCached, true, 'Service Worker cache must contain start page precache');
  console.log('  PASS: Service Worker active and start page precached.');

  console.log('Step 3: Simulating offline state (context.setOffline(true))...');
  await context.setOffline(true);

  console.log('Step 4: Performing cold offline navigation to start page (http://localhost:' + PORT + '/)...');
  const offlinePage = await context.newPage();
  const offlineResponse = await offlinePage.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  
  assert.ok(offlineResponse, 'Service Worker must respond to navigation while offline');
  assert.strictEqual(offlineResponse.status(), 200, 'Offline response status must be 200 from SW cache');
  console.log('  PASS: Offline response received with status 200.');

  console.log('Step 5: Verifying home screen DOM elements rendered offline...');
  await offlinePage.waitForSelector('#brand-logo', { timeout: 3000 });
  await offlinePage.waitForSelector('.screen-home', { timeout: 3000 });
  const brandText = await offlinePage.$eval('.brand-name', el => el.textContent.trim());
  assert.strictEqual(brandText, 'Baseerah', 'Brand name must be Baseerah');

  const cardsCount = await offlinePage.$$eval('.home-card', cards => cards.length);
  assert.ok(cardsCount >= 2, 'Home cards must be rendered while offline');

  console.log('  PASS: Brand logo and home screen cards rendered offline successfully.');

  await browser.close();
  server.close();
  console.log('\n✅ OFFLINE START PAGE TEST PASSED! Service Worker serves the start page offline seamlessly.\n');
}

run().catch(err => {
  console.error('Offline start page test FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
