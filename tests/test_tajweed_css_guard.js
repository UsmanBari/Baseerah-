// tests/test_tajweed_css_guard.js
// Guard test: Enforces strict CSS invariants on Tajweed inline spans.
// Prevents regression of the Arabic cursive shaping bug.
// FAILS if any rule sets:
// - font-weight other than normal / 400 / inherit
// - font-family
// - letter-spacing
// - padding (other than 0)
// - margin (other than 0)
// - display other than inline
// on span[class*="tj-"]:not(.tj-swatch).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('=== Tajweed CSS Invariants Guard Test ===\n');

// 1. Static CSS File Analysis
console.log('Step 1: Statically parsing css/styles.css...');
const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'css', 'styles.css'), 'utf8');

// Match all CSS rule blocks
const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
let match;
let staticViolations = [];

while ((match = ruleRegex.exec(cssContent)) !== null) {
  const rawSelector = match[1].trim();
  const declarations = match[2].trim();

  // We are checking selectors targeting Tajweed text spans: .tj-* or [class*="tj-"]
  // Exclude swatches and legend controls
  if (
    (rawSelector.includes('.tj-') || rawSelector.includes('tj-')) &&
    !rawSelector.includes('swatch') &&
    !rawSelector.includes('legend') &&
    !rawSelector.includes('sheet') &&
    !rawSelector.includes('rule-') &&
    !rawSelector.includes('desc') &&
    !rawSelector.includes('toggle') &&
    !rawSelector.includes('btn') &&
    !rawSelector.includes('tag') &&
    !rawSelector.includes('badge')
  ) {
    const declLines = declarations.split(';').map(d => d.trim()).filter(Boolean);
    for (const decl of declLines) {
      const [prop, ...valParts] = decl.split(':');
      if (!prop || !valParts.length) continue;
      const property = prop.trim().toLowerCase();
      const value = valParts.join(':').replace(/!important/g, '').trim().toLowerCase();

      if (property === 'font-weight' && !['normal', '400', 'inherit', 'initial', 'unset'].includes(value)) {
        staticViolations.push({ selector: rawSelector, property, value });
      }
      if (property === 'font-family' && !['inherit', 'initial', 'unset'].includes(value)) {
        staticViolations.push({ selector: rawSelector, property, value });
      }
      if (property === 'letter-spacing' && !['normal', '0', '0px', 'inherit', 'initial', 'unset'].includes(value)) {
        staticViolations.push({ selector: rawSelector, property, value });
      }
      if (property === 'display' && !['inline', 'inherit', 'initial', 'unset'].includes(value)) {
        staticViolations.push({ selector: rawSelector, property, value });
      }
      if ((property.startsWith('padding') || property.startsWith('margin')) && !['0', '0px', 'inherit', 'initial', 'unset'].includes(value)) {
        staticViolations.push({ selector: rawSelector, property, value });
      }
    }
  }
}

if (staticViolations.length > 0) {
  console.error('❌ Static CSS Violations found in css/styles.css:');
  for (const v of staticViolations) {
    console.error(`  - Selector: "${v.selector}" sets ${v.property}: ${v.value}`);
  }
  process.exit(1);
}
console.log('  PASS: Zero forbidden static CSS properties on tajweed text spans.\n');

// 2. Computed Style Inspection in Headless Browser
console.log('Step 2: Checking computed styles of live Tajweed spans in browser...');
async function testLiveComputedStyles() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Create standalone test page with Baseerah styles & sample tagged tajweed text
    const testHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="css/tokens.css">
        <link rel="stylesheet" href="css/styles.css">
      </head>
      <body class="theme-light tajweed-mode">
        <div class="mushaf-ar-text" id="tajweed-container">
          <span class="tj-laam-shamsiyah">ٱل</span>كِ<span class="tj-madda-normal">تَٰ</span>بُ 
          <span class="tj-madda-normal">لَا</span> 
          <span class="tj-madda-normal">رَيْ</span>بَ 
          <span class="tj-madda-normal">فِي</span>هِ 
          <span class="tj-ghunnah">هُدًى</span> 
          <span class="tj-idgham-ghunnah">لِّ</span>لْمُتَّقِينَ
        </div>
      </body>
      </html>
    `;

    // Serve via file or setContent with base URL
    const fileUrl = 'file:///' + path.join(ROOT_DIR, 'index.html').replace(/\\/g, '/');
    await page.goto(fileUrl);
    await page.evaluate(() => {
      document.body.className = 'scale-normal theme-light tajweed-mode';
      document.body.innerHTML = `
        <div class="mushaf-ar-text" id="tajweed-container">
          <span class="tj-laam-shamsiyah">ٱل</span>كِ<span class="tj-madda-normal">تَٰ</span>بُ 
          <span class="tj-madda-normal">لَا</span> 
          <span class="tj-madda-normal">رَيْ</span>بَ 
          <span class="tj-madda-normal">فِي</span>هِ 
          <span class="tj-ghunnah">هُدًى</span> 
          <span class="tj-idgham-ghunnah">لِّ</span>لْمُتَّقِينَ
        </div>
      `;
    });

    const violations = await page.evaluate(() => {
      const spans = document.querySelectorAll('#tajweed-container span[class*="tj-"]:not(.tj-swatch)');
      const bad = [];
      spans.forEach((span) => {
        const cs = window.getComputedStyle(span);
        // Check font-weight
        if (cs.fontWeight !== '400' && cs.fontWeight !== 'normal') {
          bad.push({ cls: span.className, prop: 'fontWeight', val: cs.fontWeight, expected: '400' });
        }
        // Check display
        if (cs.display !== 'inline') {
          bad.push({ cls: span.className, prop: 'display', val: cs.display, expected: 'inline' });
        }
        // Check letter spacing
        if (cs.letterSpacing !== 'normal' && cs.letterSpacing !== '0px') {
          bad.push({ cls: span.className, prop: 'letterSpacing', val: cs.letterSpacing, expected: 'normal or 0px' });
        }
        // Check margins
        if (cs.marginTop !== '0px' || cs.marginBottom !== '0px' || cs.marginLeft !== '0px' || cs.marginRight !== '0px') {
          bad.push({ cls: span.className, prop: 'margin', val: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`, expected: '0px' });
        }
        // Check paddings
        if (cs.paddingTop !== '0px' || cs.paddingBottom !== '0px' || cs.paddingLeft !== '0px' || cs.paddingRight !== '0px') {
          bad.push({ cls: span.className, prop: 'padding', val: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`, expected: '0px' });
        }
      });
      return bad;
    });

    if (violations.length > 0) {
      console.error('❌ Computed style violations detected:');
      for (const v of violations) {
        console.error(`  - Span .${v.cls} computed ${v.prop} = "${v.val}" (expected: ${v.expected})`);
      }
      process.exit(1);
    }

    console.log('  PASS: All live Tajweed spans computed to valid inline cursive values (display: inline, weight: 400, 0 margin/padding).\n');
    console.log('✅ ALL TAJWEED CSS GUARD CHECKS PASSED!\n');
  } finally {
    await browser.close();
  }
}

testLiveComputedStyles().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
