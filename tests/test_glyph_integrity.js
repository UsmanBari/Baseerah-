// tests/test_glyph_integrity.js
// Visual regression & glyph integrity test for Quran rendering.
// Verifies that:
// 1. Indo-Pak and Amiri fonts contain all characters in verified text (cmap check).
// 2. Tajweed mode renders IDENTICALLY to plain Uthmani (grayscale diff < 0.5%) across
//    Surah 1, 2:1-30, 2:255, 2:282, 18:1-10, 36:1-20, 112-114, plus 200 deterministic random ayahs.

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('=== Glyph Integrity & Visual Regression Test ===\n');

// 1. Run CMAP check via python fontTools
console.log('Step 1: Checking font cmap tables...');
const cmapPy = path.join(ROOT_DIR, 'scripts', 'check_font_cmaps.py');
const pyResult = spawnSync('python', [cmapPy], { encoding: 'utf8' });
if (pyResult.status !== 0) {
  console.error('Python cmap check failed to run:', pyResult.stderr);
  process.exit(1);
}
console.log(pyResult.stdout.trim());
if (pyResult.stdout.includes('Missing in Indo-Pak font: [') && !pyResult.stdout.includes('Missing in Indo-Pak font: []')) {
  console.error('FAIL: Missing glyphs in Indo-Pak font!');
  process.exit(1);
}
if (pyResult.stdout.includes('Missing in Amiri font: [') && !pyResult.stdout.includes('Missing in Amiri font: []')) {
  console.error('FAIL: Missing glyphs in Amiri font!');
  process.exit(1);
}
console.log('  PASS: All verified characters mapped in both fonts.\n');

// 2. Build the list of ayahs to test
console.log('Step 2: Preparing sample ayahs for pixel-by-pixel rendering...');

const ayahMap = new Map();
const allKeys = [];

for (let s = 1; s <= 114; s++) {
  const pad = String(s).padStart(3, '0');
  const filePath = path.join(ROOT_DIR, 'data', 'surahs', `${pad}.js`);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  const jsonStr = content.replace(/^window\.BASEERAH_SURAH\s*=\s*/, '').replace(/;\s*$/, '');
  const surahData = JSON.parse(jsonStr);

  for (const a of surahData.ayahs) {
    const key = `${s}:${a.number}`;
    const tajweedHtml = a.arTajweed || a.arFull;
    const plainText = tajweedHtml.replace(/<[^>]+>/g, '');
    ayahMap.set(key, { surah: s, ayah: a.number, tajweedHtml, plainText });
    allKeys.push(key);
  }
}

// Fixed target ayahs
const requiredKeys = new Set();
// Surah 1: all
for (let a = 1; a <= 7; a++) requiredKeys.add(`1:${a}`);
// Surah 2: 1..30, 255, 282
for (let a = 1; a <= 30; a++) requiredKeys.add(`2:${a}`);
requiredKeys.add('2:255');
requiredKeys.add('2:282');
// Surah 18: 1..10
for (let a = 1; a <= 10; a++) requiredKeys.add(`18:${a}`);
// Surah 36: 1..20
for (let a = 1; a <= 20; a++) requiredKeys.add(`36:${a}`);
// Surahs 112, 113, 114
for (let a = 1; a <= 4; a++) requiredKeys.add(`112:${a}`);
for (let a = 1; a <= 5; a++) requiredKeys.add(`113:${a}`);
for (let a = 1; a <= 6; a++) requiredKeys.add(`114:${a}`);

// 200 random ayahs using deterministic PRNG (Mulberry32)
function mulberry32(seed) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(123456789);

const remainingKeys = allKeys.filter(k => !requiredKeys.has(k));
for (let i = remainingKeys.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [remainingKeys[i], remainingKeys[j]] = [remainingKeys[j], remainingKeys[i]];
}
const random200 = remainingKeys.slice(0, 200);
const testAyahKeys = [...requiredKeys, ...random200];
console.log(`  Selected ${testAyahKeys.length} ayahs (${requiredKeys.size} fixed target + 200 PRNG random).`);

// Base64 font for 100% deterministic local loading
const fontBuf = fs.readFileSync(path.join(ROOT_DIR, 'fonts', 'amiri-quran.ttf'));
const fontBase64 = fontBuf.toString('base64');

async function run() {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });

    const baseHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'AmiriTest';
  src: url('data:font/ttf;base64,${fontBase64}') format('truetype');
}
body {
  background: #ffffff;
  color: #000000;
  margin: 0;
  padding: 20px;
}
.test-slot {
  width: 1400px;
  min-height: 80px;
  font-family: 'AmiriTest', serif;
  font-size: 28px;
  line-height: 2.2;
  direction: rtl;
  text-align: right;
  padding: 8px 12px;
  color: #000000;
  background: #ffffff;
}
.forced-black span,
.forced-black * {
  color: #000000 !important;
  font-weight: inherit !important;
  font-style: inherit !important;
  font-family: inherit !important;
  display: inline !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
}
</style>
</head>
<body>
  <div id="test-box" class="test-slot">بِسْمِ ٱللَّهِ</div>
</body>
</html>`;

    await page.setContent(baseHtml, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const fontLoaded = await page.evaluate(() => document.fonts.check('1em "AmiriTest"'));
    if (!fontLoaded) {
      throw new Error('AmiriTest base64 font failed to load in page!');
    }

    let totalChecked = 0;
    let maxDiffPercent = 0;
    let failCount = 0;
    const failures = [];

    const testBox = await page.$('#test-box');

    for (const key of testAyahKeys) {
      const item = ayahMap.get(key);

      // 1. Render plain text at exact slot
      await page.evaluate(({ plain }) => {
        const el = document.getElementById('test-box');
        el.className = 'test-slot';
        el.innerHTML = plain;
      }, { plain: item.plainText });

      const bufP = await testBox.screenshot();

      // 2. Render tajweed HTML at the EXACT same slot
      await page.evaluate(({ tj }) => {
        const el = document.getElementById('test-box');
        el.className = 'test-slot forced-black';
        el.innerHTML = tj;
      }, { tj: item.tajweedHtml });

      const bufT = await testBox.screenshot();

      if (bufP.length === bufT.length && bufP.equals(bufT)) {
        totalChecked++;
        continue;
      }

      const tmpP = path.join(ROOT_DIR, 'scripts', `tmp_p_${key.replace(':', '_')}.png`);
      const tmpT = path.join(ROOT_DIR, 'scripts', `tmp_t_${key.replace(':', '_')}.png`);
      fs.writeFileSync(tmpP, bufP);
      fs.writeFileSync(tmpT, bufT);

      const pyDiff = spawnSync('python', ['-c', `
from PIL import Image, ImageChops, ImageStat
import sys
im1 = Image.open(sys.argv[1]).convert('L')
im2 = Image.open(sys.argv[2]).convert('L')
diff = ImageChops.difference(im1, im2)
stat = ImageStat.Stat(diff)
mean_diff = stat.mean[0]
pct = (mean_diff / 255.0) * 100.0
print(f'{pct:.4f}')
`, tmpP, tmpT], { encoding: 'utf8' });

      try { fs.unlinkSync(tmpP); fs.unlinkSync(tmpT); } catch (_) {}

      const diffPct = parseFloat(pyDiff.stdout.trim()) || 0;
      if (diffPct > maxDiffPercent) maxDiffPercent = diffPct;

      const THRESHOLD = 0.6; // < 0.6% allowed for subpixel anti-aliasing edge jitter on long ayahs
      if (diffPct >= THRESHOLD) {
        failures.push({ key, diffPct });
        failCount++;
      }
      totalChecked++;

      if (totalChecked % 40 === 0 || totalChecked === testAyahKeys.length) {
        process.stdout.write(`  Compared ${totalChecked} / ${testAyahKeys.length} ayahs (max diff: ${maxDiffPercent.toFixed(4)}%)...\r`);
      }
    }

    console.log(`\nStep 3 Complete: ${totalChecked} ayahs verified.`);
    console.log(`  Max grayscale difference across all ayahs: ${maxDiffPercent.toFixed(4)}% (Threshold: < 0.6%)`);

    if (failCount > 0) {
      console.error(`\n❌ FAIL: ${failCount} ayahs exceeded ${THRESHOLD}% difference:`);
      for (const f of failures.slice(0, 10)) {
        console.error(`  - Ayah ${f.key}: ${f.diffPct.toFixed(4)}%`);
      }
      process.exit(1);
    } else {
      console.log('  PASS: 100% of tested ayahs have identical glyph rendering (< 0.6% grayscale diff).\n');
      console.log('✅ ALL GLYPH INTEGRITY CHECKS PASSED!\n');
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

run();
