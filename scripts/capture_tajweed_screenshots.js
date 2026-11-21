const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8089;
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

async function capture() {
  await new Promise((resolve) => server.listen(PORT, resolve));

  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  const screenshotsDir = path.join(BASE_DIR, 'screenshots');
  const artifactDir = "C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c";

  async function take(filename, selector = null) {
    const localP = path.join(screenshotsDir, filename);
    const artP = path.join(artifactDir, filename);
    
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    if (selector) {
      const el = await page.$(selector);
      if (el) {
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await el.screenshot({ path: localP });
        if (fs.existsSync(artifactDir)) fs.copyFileSync(localP, artP);
        console.log(`Captured element ${selector} -> ${filename}`);
        return;
      }
    }
    await page.screenshot({ path: localP });
    if (fs.existsSync(artifactDir)) fs.copyFileSync(localP, artP);
    console.log(`Captured viewport -> ${filename}`);
  }

  // 1. Desktop 1280x800 - Urdu UI, Surah 1:7 with Tajweed ON
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`http://localhost:${PORT}/#quran/1/7`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('baseerah_settings', JSON.stringify({
      meaningDisplay: 'both',
      readingMode: 'wbw',
      showTajweed: true,
      mosqueMute: false
    }));
    localStorage.setItem('baseerah_lang', 'ur');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.reading-card-container');
  await take('tajweed_1_7_ur_1280x800.png');
  await take('tajweed_1_7_ur_card_zoom.png', '.reading-card-container');

  // 2. Desktop 1280x800 - English UI, Surah 1:7 with Tajweed ON
  await page.evaluate(() => {
    localStorage.setItem('baseerah_lang', 'en');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.reading-card-container');
  await take('tajweed_1_7_en_1280x800.png');
  await take('tajweed_1_7_en_card_zoom.png', '.reading-card-container');

  // 3. Desktop 1280x800 - Urdu UI, Surah 2:255 (Ayat al-Kursi) with Tajweed ON
  await page.goto(`http://localhost:${PORT}/#quran/2/255`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('baseerah_lang', 'ur');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.reading-card-container');
  await take('tajweed_2_255_ur_1280x800.png');
  await take('tajweed_2_255_ur_card_zoom.png', '.reading-card-container');

  // 4. Desktop 1280x800 - English UI, Surah 2:255 (Ayat al-Kursi) with Tajweed ON
  await page.evaluate(() => {
    localStorage.setItem('baseerah_lang', 'en');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.reading-card-container');
  await take('tajweed_2_255_en_1280x800.png');
  await take('tajweed_2_255_en_card_zoom.png', '.reading-card-container');

  // 5. Desktop 1280x800 - Surah 114:1-6 in Mushaf Tajweed Mode (Urdu UI)
  await page.goto(`http://localhost:${PORT}/#quran/114/1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('baseerah_settings') || '{}');
    s.readingMode = 'mushaf';
    s.showTajweed = true;
    localStorage.setItem('baseerah_settings', JSON.stringify(s));
    localStorage.setItem('baseerah_lang', 'ur');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.mushaf-flow-text');
  await take('tajweed_114_mushaf_ur_1280x800.png');
  await take('tajweed_114_mushaf_ur_zoom.png', '.mushaf-ayahs-container');

  // 6. Mobile 390x844 - Surah 114:1 in WBW Tajweed Mode (Urdu & English)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://localhost:${PORT}/#quran/114/1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('baseerah_settings') || '{}');
    s.readingMode = 'wbw';
    s.showTajweed = true;
    localStorage.setItem('baseerah_settings', JSON.stringify(s));
    localStorage.setItem('baseerah_lang', 'ur');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.reading-card-container');
  await take('tajweed_114_1_wbw_ur_390x844.png');

  await page.evaluate(() => {
    localStorage.setItem('baseerah_lang', 'en');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.reading-card-container');
  await take('tajweed_114_1_wbw_en_390x844.png');

  // 7. Mobile 390x844 - Surah 1:7 with Tajweed
  await page.goto(`http://localhost:${PORT}/#quran/1/7`, { waitUntil: 'networkidle' });
  await take('tajweed_1_7_wbw_en_390x844.png');

  // 8. Capture review-tajweed.html
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`http://localhost:${PORT}/review-tajweed.html`, { waitUntil: 'networkidle' });
  await take('review_tajweed_overview_1280x800.png');
  await take('review_tajweed_legend_zoom.png', '.legend-card');
  await take('review_tajweed_ayah_1_7_zoom.png', '#ayah-1-7');
  await take('review_tajweed_ayah_2_255_zoom.png', '#ayah-2-255');

  await browser.close();
  server.close();
  console.log("All screenshots captured successfully.");
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
