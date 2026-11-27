/**
 * scripts/run_lighthouse.js
 * Runs real Google Lighthouse (mobile and desktop presets) against Baseerah kiosk screens.
 * Saves raw JSON and HTML reports to docs/lighthouse/real/
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = 8085;
const BASE_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(BASE_DIR, 'docs', 'lighthouse', 'real');

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
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(BASE_DIR, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const isCompressible = ['.html', '.css', '.js', '.json', '.svg', '.ttf', '.woff', '.woff2'].includes(ext);

  if (isCompressible && acceptEncoding.includes('gzip')) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Encoding': 'gzip',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

const TARGETS = [
  { name: 'home', route: '#home' },
  { name: 'quran_surah2', route: '#quran/2/1' },
  { name: 'namaz', route: '#namaz/steps' }
];

async function main() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Lighthouse test server listening at http://localhost:${PORT}`);

  const { default: lighthouse, desktopConfig } = await import('lighthouse');
  const chromeLauncher = await import('chrome-launcher');

  let chrome = null;
  const summaryResults = [];
  let lighthouseVersion = 'Unknown';

  try {
    console.log('Launching headless Chrome...');
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });
    console.log(`Chrome launched on port ${chrome.port}`);

    for (const target of TARGETS) {
      const url = `http://localhost:${PORT}/${target.route}`;

      // 1. Mobile run
      console.log(`\nRunning Mobile Lighthouse for ${target.name} (${url})...`);
      const mobileOpts = {
        port: chrome.port,
        output: ['json', 'html'],
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices']
      };

      const mobileResult = await lighthouse(url, mobileOpts);
      lighthouseVersion = mobileResult.lhr.lighthouseVersion;

      const mPerf = Math.round((mobileResult.lhr.categories.performance?.score || 0) * 100);
      const mA11y = Math.round((mobileResult.lhr.categories.accessibility?.score || 0) * 100);
      const mBp = Math.round((mobileResult.lhr.categories['best-practices']?.score || 0) * 100);

      fs.writeFileSync(
        path.join(OUTPUT_DIR, `${target.name}_mobile.json`),
        mobileResult.report[0],
        'utf-8'
      );
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `${target.name}_mobile.html`),
        mobileResult.report[1],
        'utf-8'
      );

      console.log(`  Mobile Scores -> Perf: ${mPerf}, A11y: ${mA11y}, BestPractices: ${mBp}`);

      if (target.name === 'quran_surah2') {
        const lcpMs = mobileResult.lhr.audits['largest-contentful-paint']?.numericValue || 0;
        console.log(`  [CI Perf Check] quran_surah2 Mobile LCP: ${(lcpMs / 1000).toFixed(2)}s (threshold: <= 4.0s)`);
      }

      // 2. Desktop run
      console.log(`Running Desktop Lighthouse for ${target.name}...`);
      const desktopOpts = {
        port: chrome.port,
        output: ['json', 'html'],
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices']
      };

      const desktopResult = await lighthouse(url, desktopOpts, desktopConfig);

      const dPerf = Math.round((desktopResult.lhr.categories.performance?.score || 0) * 100);
      const dA11y = Math.round((desktopResult.lhr.categories.accessibility?.score || 0) * 100);
      const dBp = Math.round((desktopResult.lhr.categories['best-practices']?.score || 0) * 100);

      fs.writeFileSync(
        path.join(OUTPUT_DIR, `${target.name}_desktop.json`),
        desktopResult.report[0],
        'utf-8'
      );
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `${target.name}_desktop.html`),
        desktopResult.report[1],
        'utf-8'
      );

      console.log(`  Desktop Scores -> Perf: ${dPerf}, A11y: ${dA11y}, BestPractices: ${dBp}`);

      summaryResults.push({
        target: target.name,
        route: target.route,
        mobile: { perf: mPerf, a11y: mA11y, bp: mBp },
        desktop: { perf: dPerf, a11y: dA11y, bp: dBp }
      });
    }

    // Write summary report
    const summaryMd = `# Official Google Lighthouse Audit Report

**Lighthouse Version:** \`${lighthouseVersion}\`  
**Audit Timestamp:** ${new Date().toISOString()}  
**Environment:** Local Headless Chrome Static Server

## Summary Scores

### Mobile Preset

| Screen / Route | Performance | Accessibility | Best Practices |
| :--- | :---: | :---: | :---: |
${summaryResults.map(r => `| **${r.target}** (\`${r.route}\`) | **${r.mobile.perf}** / 100 | **${r.mobile.a11y}** / 100 | **${r.mobile.bp}** / 100 |`).join('\n')}

### Desktop Preset

| Screen / Route | Performance | Accessibility | Best Practices |
| :--- | :---: | :---: | :---: |
${summaryResults.map(r => `| **${r.target}** (\`${r.route}\`) | **${r.desktop.perf}** / 100 | **${r.desktop.a11y}** / 100 | **${r.desktop.bp}** / 100 |`).join('\n')}

## Report Artifacts Generated
- Raw JSON and HTML reports saved in \`docs/lighthouse/real/\`:
${TARGETS.map(t => `  - \`${t.name}_mobile.json\`, \`${t.name}_mobile.html\`\n  - \`${t.name}_desktop.json\`, \`${t.name}_desktop.html\``).join('\n')}
`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.md'), summaryMd, 'utf-8');
    console.log(`\nLighthouse audit finished successfully. Summary written to docs/lighthouse/real/summary.md`);

  } catch (err) {
    console.error('\nLighthouse execution encountered an error:', err);
    const errMd = `# Official Google Lighthouse Audit Report — NOT MEASURED

**Timestamp:** ${new Date().toISOString()}  
**Status:** NOT MEASURED  
**Reason / Error:**
\`\`\`
${err.stack || err.message || String(err)}
\`\`\`
`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.md'), errMd, 'utf-8');
    throw err;
  } finally {
    if (chrome) {
      try { await chrome.kill(); } catch (_) {}
    }
    server.close();
  }
}

main().catch((err) => {
  console.error('Fatal error in scripts/run_lighthouse.js:', err);
  process.exit(1);
});
