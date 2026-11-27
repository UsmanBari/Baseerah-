import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(BASE_DIR, 'docs', 'screenshots', 'fix_round_3');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(BASE_DIR, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8097, async () => {
  console.log('Capture server running on http://localhost:8097');
  const browser = await chromium.launch();

  // 1. Phone 390x844: Mushaf Urdu Tajweed (Legend scroll, Ayah label ۲:۱, Jump pill)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await page.addInitScript(() => {
      localStorage.setItem('baseerah_settings', JSON.stringify({
        settingsVersion: 3,
        lang: 'ur',
        readingMode: 'mushaf',
        showTajweed: true,
        theme: 'light'
      }));
    });
    await page.goto('http://localhost:8097/#quran/2/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, 'after_quran_2_1_tajweed_mushaf_ur_390x844.png') });
    console.log('Captured: after_quran_2_1_tajweed_mushaf_ur_390x844.png');

    // Also open Tajweed bottom sheet
    const moreBtn = await page.$('.tj-legend-more-btn');
    if (moreBtn) {
      await moreBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT_DIR, 'after_tajweed_legend_sheet_ur_390x844.png') });
      console.log('Captured: after_tajweed_legend_sheet_ur_390x844.png');
    }

    await page.close();
  }

  // 2. Desktop 1280x800: Mushaf Urdu Tajweed (nowrap memorized pill 44px)
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => {
      localStorage.setItem('baseerah_settings', JSON.stringify({
        settingsVersion: 3,
        lang: 'ur',
        readingMode: 'mushaf',
        showTajweed: true,
        theme: 'light'
      }));
    });
    await page.goto('http://localhost:8097/#quran/2/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, 'after_quran_2_1_tajweed_mushaf_ur_1280x800.png') });
    console.log('Captured: after_quran_2_1_tajweed_mushaf_ur_1280x800.png');
    await page.close();
  }

  // 3. Settings sheet on phone 390x844: "خط کشیدہ" nowrap
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await page.addInitScript(() => {
      localStorage.setItem('baseerah_settings', JSON.stringify({
        settingsVersion: 3,
        lang: 'ur',
        readingMode: 'mushaf',
        showTajweed: true,
        theme: 'light'
      }));
    });
    await page.goto('http://localhost:8097/#quran/2/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const overflowBtn = await page.$('#btn-quran-overflow');
    if (overflowBtn) {
      await overflowBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT_DIR, 'after_settings_sheet_ur_390x844.png') });
      console.log('Captured: after_settings_sheet_ur_390x844.png');
    }
    await page.close();
  }

  await browser.close();
  server.close();
  console.log('All verification screenshots captured successfully.');
});
