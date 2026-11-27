const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT_DIR, 'icons');

async function generate() {
  const browser = await chromium.launch({ headless: true });

  const tasks = [
    { svg: 'icon.svg', png: 'icon-192.png', size: 192 },
    { svg: 'icon.svg', png: 'icon-512.png', size: 512 },
    { svg: 'icon-maskable.svg', png: 'icon-512-maskable.png', size: 512 },
    { svg: 'icon-maskable.svg', png: 'icon-192-maskable.png', size: 192 }
  ];

  for (const t of tasks) {
    const svgPath = path.join(ICONS_DIR, t.svg);
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    const outPath = path.join(ICONS_DIR, t.png);

    const page = await browser.newPage({
      viewport: { width: t.size, height: t.size },
      deviceScaleFactor: 1
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: outPath, omitBackground: true });
    console.log(`Generated ${t.png} (${t.size}x${t.size})`);
    await page.close();
  }

  await browser.close();
  console.log('Icon generation complete!');
}

generate().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
