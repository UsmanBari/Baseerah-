const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8097;
const BASE_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(BASE_DIR, 'docs', 'screenshots', 'prayer_digits');
const ARTIFACT_DIR = 'C:\\Users\\usmanbari\\.gemini\\antigravity\\brain\\c6033c6b-cd0c-4b4a-bb86-1829034a6c1c';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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
  console.log(`Server listening on port ${PORT}`);

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '390x844', width: 390, height: 844 },
    { name: '1280x800', width: 1280, height: 800 }
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    const page = await context.newPage();

    // 1. Urdu UI
    await page.goto(`http://localhost:${PORT}/index.html#home`);
    await page.waitForSelector('.prayer-times-home-card');
    await page.waitForTimeout(500);

    const prayerCardUr = page.locator('.prayer-times-home-card');
    const cardUrPath = path.join(OUTPUT_DIR, `prayer_card_${vp.name}_ur.png`);
    await prayerCardUr.screenshot({ path: cardUrPath });
    console.log(`Saved: ${cardUrPath}`);

    const homeUrPath = path.join(OUTPUT_DIR, `home_${vp.name}_ur.png`);
    await page.screenshot({ path: homeUrPath });
    console.log(`Saved: ${homeUrPath}`);

    // Copy to artifact directory
    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(cardUrPath, path.join(ARTIFACT_DIR, `prayer_card_${vp.name}_ur.png`));
      fs.copyFileSync(homeUrPath, path.join(ARTIFACT_DIR, `home_${vp.name}_ur.png`));
    }

    // 2. English UI
    const langBtnEn = page.locator('.lang-btn[data-lang="en"]');
    if (await langBtnEn.count() > 0) {
      await langBtnEn.click();
    } else {
      await page.evaluate(() => {
        window.appState?.setLang?.('en') || (window.location.hash = '#home');
      });
    }
    await page.waitForTimeout(500);
    await page.waitForSelector('.prayer-times-home-card');

    const prayerCardEn = page.locator('.prayer-times-home-card');
    const cardEnPath = path.join(OUTPUT_DIR, `prayer_card_${vp.name}_en.png`);
    await prayerCardEn.screenshot({ path: cardEnPath });
    console.log(`Saved: ${cardEnPath}`);

    const homeEnPath = path.join(OUTPUT_DIR, `home_${vp.name}_en.png`);
    await page.screenshot({ path: homeEnPath });
    console.log(`Saved: ${homeEnPath}`);

    if (fs.existsSync(ARTIFACT_DIR)) {
      fs.copyFileSync(cardEnPath, path.join(ARTIFACT_DIR, `prayer_card_${vp.name}_en.png`));
      fs.copyFileSync(homeEnPath, path.join(ARTIFACT_DIR, `home_${vp.name}_en.png`));
    }

    await context.close();
  }

  await browser.close();
  server.close();
  console.log('Finished capturing all prayer digits screenshots.');
}

run().catch(err => {
  console.error('Error during capture:', err);
  if (server) server.close();
  process.exit(1);
});
