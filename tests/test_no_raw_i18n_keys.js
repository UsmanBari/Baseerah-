// tests/test_no_raw_i18n_keys.js
// Scans all Baseerah screens in Urdu and English for leaked raw i18n keys or template strings.

import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { DICT } from '../js/core/i18n.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8777;

console.log('=== Checking for Leaked Raw i18n Keys Across All Screens ===\n');

// Collect all camelCase keys from DICT that could leak
const allKeys = new Set([...Object.keys(DICT.en), ...Object.keys(DICT.ur)]);
const camelCaseKeys = new Set([...allKeys].filter(k => /[a-z][A-Z]/.test(k)));

// Add known former leaked keys explicitly
camelCaseKeys.add('jumpToAyah');

console.log(`Tracking ${camelCaseKeys.size} camelCase i18n keys for UI leakage.`);

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

const ROUTES_TO_TEST = [
  { route: 'home', name: 'Home' },
  { route: 'surahs', name: 'Surahs List' },
  { route: 'juz', name: 'Juz List' },
  { route: 'quran/1/1', name: 'Quran 1:1 WBW Normal' },
  { route: 'quran/1/1', name: 'Quran 1:1 Mushaf Normal', setup: page => page.evaluate(() => { window.baseerahState.settings.readingMode = 'mushaf'; window.baseerahState.notify(); window.baseerahRouter.resolveRoute(); }) },
  { route: 'quran/2/1', name: 'Quran 2:1 WBW Normal' },
  { route: 'quran/2/1', name: 'Quran 2:1 Mushaf Tajweed', setup: page => page.evaluate(() => { window.baseerahState.settings.readingMode = 'mushaf'; window.baseerahState.settings.showTajweed = true; window.baseerahState.notify(); window.baseerahRouter.resolveRoute(); }) },
  { route: 'namaz', name: 'Namaz Hub' },
  { route: 'namaz/steps', name: 'Namaz Steps' }
];

server.listen(PORT, async () => {
  let browser;
  let leaksFound = [];

  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    for (const lang of ['ur', 'en']) {
      for (const item of ROUTES_TO_TEST) {
        await page.goto(`http://localhost:${PORT}/#${item.route}`);
        await page.evaluate((l) => {
          window.baseerahState.settings.lang = l;
          window.baseerahState.notify();
          window.baseerahRouter.resolveRoute();
        }, lang);

        if (item.setup) {
          await item.setup(page);
        }

        await page.waitForTimeout(300);
        await page.evaluate(() => document.fonts.ready);

        // Scan all visible text nodes in active container
        const textNodes = await page.evaluate(() => {
          const results = [];
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName.toLowerCase();
                if (tag === 'script' || tag === 'style') return NodeFilter.FILTER_REJECT;
                const style = window.getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                  return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );

          let curr;
          while ((curr = walker.nextNode())) {
            results.push({
              text: curr.textContent.trim(),
              tag: curr.parentElement.tagName.toLowerCase(),
              className: curr.parentElement.className || '',
              id: curr.parentElement.id || ''
            });
          }
          return results;
        });

        // Also check buttons aria-labels and title attributes
        const ariaLabels = await page.evaluate(() => {
          const els = document.querySelectorAll('[aria-label], [title]');
          return Array.from(els).map(el => ({
            text: el.getAttribute('aria-label') || el.getAttribute('title') || '',
            tag: el.tagName.toLowerCase(),
            className: el.className || '',
            id: el.id || ''
          })).filter(x => x.text.trim());
        });

        const allItems = [...textNodes, ...ariaLabels];

        for (const node of allItems) {
          // Check for template leak patterns like undefined, [object, ${, t(
          if (node.text.includes('${') || node.text.includes('[object Object]') || /\bt\(['"][a-zA-Z0-9]+['"]\)/.test(node.text)) {
            leaksFound.push({
              lang,
              route: item.name,
              leak: node.text,
              type: 'template_literal_or_function_call',
              node
            });
          }

          // Check for camelCase i18n keys appearing verbatim in text
          const words = node.text.split(/[\s/·,.:;!?'"()\[\]{}|]+/);
          for (const w of words) {
            if (camelCaseKeys.has(w)) {
              leaksFound.push({
                lang,
                route: item.name,
                leak: w,
                fullText: node.text,
                type: 'camel_case_i18n_key',
                node
              });
            }
          }
        }
      }
    }

    if (leaksFound.length > 0) {
      console.error(`\n❌ FAIL: Found ${leaksFound.length} leaked raw i18n keys or template strings:\n`);
      for (const l of leaksFound) {
        console.error(`  [${l.lang.toUpperCase()} - ${l.route}] Leaked: "${l.leak}"`);
        console.error(`    Full text: "${l.fullText || l.leak}"`);
        console.error(`    Element: <${l.node.tag} class="${l.node.className}" id="${l.node.id}">\n`);
      }
      process.exit(1);
    } else {
      console.log('✅ PASS: Zero raw i18n keys or template leaks detected across all tested views in Urdu and English.\n');
    }
  } catch (err) {
    console.error('Error during i18n leak test:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
