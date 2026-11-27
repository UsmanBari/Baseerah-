// scripts/generate_section_a_screenshots.js
// Renders Ayah 2:2 in Tajweed Mushaf & WBW at 390px & 1280px (light & dark)
// and extracts before/after zoom crops of 'رَيْبَ فِيهِ' and 'ٱلْكِتَٰبُ'

import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8666;
const OUT_DIR = path.join(ROOT_DIR, 'docs', 'screenshots', 'fix_round_3');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 1. Extract BEFORE crops from fix_round_2
const beforeImgPath = path.join(ROOT_DIR, 'docs', 'screenshots', 'fix_round_2', 'quran_2_1_5_tajweed_mushaf_ur_390x844.png');
if (fs.existsSync(beforeImgPath)) {
  spawnSync('python', ['-c', `
from PIL import Image
im = Image.open('${beforeImgPath.replace(/\\/g, '/')}')
# The image is 390x844. Ayah 2 is near the bottom.
# Ayah 2 text is around y=770 to 820.
w, h = im.size
# Let's crop Ayah 2 text region
# In 390x844, width is 390.
crop_full = im.crop((10, 750, 380, 830))
crop_full.save('${path.join(OUT_DIR, 'before_ayah2_text_390.png').replace(/\\/g, '/')}')

# Zoom into rayba feehi and alkitab
crop_rayba = im.crop((140, 765, 260, 825))
crop_rayba.save('${path.join(OUT_DIR, 'before_crop_rayba_feehi_390.png').replace(/\\/g, '/')}')

crop_alkitab = im.crop((240, 765, 360, 825))
crop_alkitab.save('${path.join(OUT_DIR, 'before_crop_alkitab_390.png').replace(/\\/g, '/')}')
print('Before crops extracted successfully.')
`]);
}

// 2. Launch server & Playwright to render fresh AFTER screenshots
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let p = path.join(ROOT_DIR, req.url.split('?')[0]);
  if (p.endsWith(path.sep) || p === ROOT_DIR) p = path.join(ROOT_DIR, 'index.html');
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    const ext = path.extname(p);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, async () => {
  const browser = await chromium.launch();

  const configs = [
    { mode: 'mushaf', theme: 'light', width: 390, height: 844, name: 'quran_2_2_tajweed_mushaf_light_390x844.png' },
    { mode: 'mushaf', theme: 'dark', width: 390, height: 844, name: 'quran_2_2_tajweed_mushaf_dark_390x844.png' },
    { mode: 'mushaf', theme: 'light', width: 1280, height: 800, name: 'quran_2_2_tajweed_mushaf_light_1280x800.png' },
    { mode: 'mushaf', theme: 'dark', width: 1280, height: 800, name: 'quran_2_2_tajweed_mushaf_dark_1280x800.png' },
    { mode: 'wbw', theme: 'light', width: 390, height: 844, name: 'quran_2_2_tajweed_wbw_light_390x844.png' },
    { mode: 'wbw', theme: 'dark', width: 390, height: 844, name: 'quran_2_2_tajweed_wbw_dark_390x844.png' },
    { mode: 'wbw', theme: 'light', width: 1280, height: 800, name: 'quran_2_2_tajweed_wbw_light_1280x800.png' },
    { mode: 'wbw', theme: 'dark', width: 1280, height: 800, name: 'quran_2_2_tajweed_wbw_dark_1280x800.png' }
  ];

  for (const cfg of configs) {
    const page = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height }, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/#quran/2/2`);
    await page.evaluate(({ m, th }) => {
      window.baseerahState.settings.readingMode = m;
      window.baseerahState.settings.showTajweed = true;
      window.baseerahState.settings.theme = th;
      window.baseerahState.settings.lang = 'ur';
      window.baseerahState.notify();
      window.baseerahRouter.resolveRoute();
    }, { m: cfg.mode, th: cfg.theme });

    await page.waitForTimeout(400);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const fullPath = path.join(OUT_DIR, cfg.name);
    await page.screenshot({ path: fullPath, fullPage: false });
    console.log(`Saved ${cfg.name}`);

    // If 390 light mushaf, extract after zoom crops
    if (cfg.name === 'quran_2_2_tajweed_mushaf_light_390x844.png') {
      const ayah2Card = await page.$('#mushaf-ayah-2, .mushaf-ayah-card, .reading-card-container');
      if (ayah2Card) {
        await ayah2Card.screenshot({ path: path.join(OUT_DIR, 'after_ayah2_card_390_light.png') });
      }
    }
    if (cfg.name === 'quran_2_2_tajweed_mushaf_light_1280x800.png') {
      const ayah2Card = await page.$('#mushaf-ayah-2, .mushaf-ayah-card, .reading-card-container');
      if (ayah2Card) {
        await ayah2Card.screenshot({ path: path.join(OUT_DIR, 'after_ayah2_card_1280_light.png') });
      }
    }

    await page.close();
  }

  // Extract precise element-level zoom crops of text using Playwright on #mushaf-ayah-2 .mushaf-ar-text
  const zoomPage = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3 });
  await zoomPage.goto(`http://localhost:${PORT}/#quran/2/2`);
  await zoomPage.evaluate(() => {
    window.baseerahState.settings.readingMode = 'mushaf';
    window.baseerahState.settings.showTajweed = true;
    window.baseerahState.settings.theme = 'light';
    window.baseerahState.notify();
    window.baseerahRouter.resolveRoute();
  });
  await zoomPage.waitForTimeout(400);
  await zoomPage.evaluate(() => document.fonts.ready);
  const textEl = await zoomPage.$('#mushaf-ayah-2 .mushaf-ar-text');
  if (textEl) {
    await textEl.screenshot({ path: path.join(OUT_DIR, 'after_text_zoom_full.png') });
    console.log('Saved after_text_zoom_full.png at 3x scale.');
  }
  await zoomPage.close();

  // Crop from after_text_zoom_full into rayba_feehi and alkitab
  spawnSync('python', ['-c', `
from PIL import Image
full_path = '${path.join(OUT_DIR, 'after_text_zoom_full.png').replace(/\\/g, '/')}'
if Image.open(full_path):
    im = Image.open(full_path)
    w, h = im.size
    # Text is RTL: ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ
    # Crop alkitab (right side)
    crop_alkitab = im.crop((int(w * 0.60), 0, int(w * 0.95), h))
    crop_alkitab.save('${path.join(OUT_DIR, 'after_crop_alkitab_zoom.png').replace(/\\/g, '/')}')
    
    # Crop rayba feehi (center)
    crop_rayba = im.crop((int(w * 0.35), 0, int(w * 0.65), h))
    crop_rayba.save('${path.join(OUT_DIR, 'after_crop_rayba_feehi_zoom.png').replace(/\\/g, '/')}')
    print('Zoom crops generated successfully.')
`]);

  await browser.close();
  server.close();
  console.log('All Section A screenshots and zoom crops generated!');
});
