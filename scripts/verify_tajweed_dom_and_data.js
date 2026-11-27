import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PORT = 8112;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split("?")[0];
      if (reqPath === "/") reqPath = "/index.html";
      const filePath = path.join(ROOT_DIR, reqPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

function getDataCounts(surahNum, maxAyah) {
  const padded = String(surahNum).padStart(3, "0");
  const raw = fs.readFileSync(path.join(ROOT_DIR, "data", "surahs", `${padded}.js`), "utf8")
    .replace(/^window\.BASEERAH_SURAH\s*=\s*/, "")
    .replace(/;\s*$/, "");
  const surah = JSON.parse(raw);

  const results = [];
  for (let a = 1; a <= maxAyah; a++) {
    const ayah = surah.ayahs.find(x => x.number === a);
    const mushafRules = {};
    const mMatches = (ayah.arTajweed || "").match(/class="([^"]+)"/g) || [];
    mMatches.forEach(m => {
      const cls = m.replace('class="', '').replace('"', '');
      mushafRules[cls] = (mushafRules[cls] || 0) + 1;
    });

    const wbwRules = {};
    (ayah.words || []).forEach(w => {
      const wMatches = (w.arTajweed || "").match(/class="([^"]+)"/g) || [];
      wMatches.forEach(m => {
        const cls = m.replace('class="', '').replace('"', '');
        wbwRules[cls] = (wbwRules[cls] || 0) + 1;
      });
    });

    results.push({
      surah: surahNum,
      ayah: a,
      mushafSpans: mMatches.length,
      mushafRules,
      wbwSpans: Object.values(wbwRules).reduce((a, b) => a + b, 0),
      wbwRules
    });
  }
  return results;
}

async function verify() {
  const server = await createServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Helper to set state and load
  async function loadAyah(surah, ayah, mode) {
    await page.goto(`http://localhost:${PORT}/#quran/${surah}/${ayah}`);
    await page.evaluate(({ s, a, m }) => {
      const settings = JSON.parse(localStorage.getItem("baseerah_settings") || "{}");
      settings.readingMode = m;
      settings.showTajweed = true;
      settings.lang = "ur";
      localStorage.setItem("baseerah_settings", JSON.stringify(settings));
      if (window.baseerahState) {
        window.baseerahState.settings = settings;
        window.baseerahState.notify();
      }
      if (window.baseerahRouter) {
        window.baseerahRouter.resolveRoute();
      }
    }, { s: surah, a: ayah, m: mode });
    await page.waitForTimeout(400);
  }

  console.log("=================================================");
  console.log("TAJWEED SPAN VERIFICATION: DATA FILE VS DOM");
  console.log("=================================================");

  const s1Data = getDataCounts(1, 7);
  const s2Data = getDataCounts(2, 5);

  // 1. Verify Surah 1 Mushaf in DOM
  await loadAyah(1, 1, "mushaf");
  const s1MushafDom = await page.evaluate(() => {
    const ayahs = [];
    document.querySelectorAll(".mushaf-ayah-block").forEach(block => {
      const num = parseInt(block.getAttribute("data-ayah-num"), 10);
      if (num >= 1 && num <= 7) {
        const rules = {};
        let total = 0;
        block.querySelectorAll(".mushaf-ar-text span[class*='tj-']").forEach(span => {
          const cls = Array.from(span.classList).find(c => c.startsWith("tj-"));
          if (cls) {
            rules[cls] = (rules[cls] || 0) + 1;
            total++;
          }
        });
        const computedFont = window.getComputedStyle(block.querySelector(".mushaf-ar-text")).fontFamily;
        ayahs.push({ ayah: num, total, rules, font: computedFont });
      }
    });
    return ayahs;
  });

  // 2. Verify Surah 1 WBW in DOM
  const s1WbwDom = [];
  for (let a = 1; a <= 7; a++) {
    await loadAyah(1, a, "wbw");
    const domInfo = await page.evaluate((aNum) => {
      const rules = {};
      let total = 0;
      document.querySelectorAll(".tile-ar span[class*='tj-']").forEach(span => {
        const cls = Array.from(span.classList).find(c => c.startsWith("tj-"));
        if (cls) {
          rules[cls] = (rules[cls] || 0) + 1;
          total++;
        }
      });
      const firstTile = document.querySelector(".tile-ar");
      const font = firstTile ? window.getComputedStyle(firstTile).fontFamily : "none";
      return { ayah: aNum, total, rules, font };
    }, a);
    s1WbwDom.push(domInfo);
  }

  // 3. Verify Surah 2 Mushaf in DOM
  await loadAyah(2, 1, "mushaf");
  const s2MushafDom = await page.evaluate(() => {
    const ayahs = [];
    document.querySelectorAll(".mushaf-ayah-block").forEach(block => {
      const num = parseInt(block.getAttribute("data-ayah-num"), 10);
      if (num >= 1 && num <= 5) {
        const rules = {};
        let total = 0;
        block.querySelectorAll(".mushaf-ar-text span[class*='tj-']").forEach(span => {
          const cls = Array.from(span.classList).find(c => c.startsWith("tj-"));
          if (cls) {
            rules[cls] = (rules[cls] || 0) + 1;
            total++;
          }
        });
        const computedFont = window.getComputedStyle(block.querySelector(".mushaf-ar-text")).fontFamily;
        ayahs.push({ ayah: num, total, rules, font: computedFont });
      }
    });
    return ayahs;
  });

  // 4. Verify Surah 2 WBW in DOM
  const s2WbwDom = [];
  for (let a = 1; a <= 5; a++) {
    await loadAyah(2, a, "wbw");
    const domInfo = await page.evaluate((aNum) => {
      const rules = {};
      let total = 0;
      document.querySelectorAll(".tile-ar span[class*='tj-']").forEach(span => {
        const cls = Array.from(span.classList).find(c => c.startsWith("tj-"));
        if (cls) {
          rules[cls] = (rules[cls] || 0) + 1;
          total++;
        }
      });
      const firstTile = document.querySelector(".tile-ar");
      const font = firstTile ? window.getComputedStyle(firstTile).fontFamily : "none";
      return { ayah: aNum, total, rules, font };
    }, a);
    s2WbwDom.push(domInfo);
  }

  await browser.close();
  server.close();

  // Print comparison
  console.log("\n--- SURAH 1:1 - 1:7 ---");
  for (let i = 0; i < 7; i++) {
    const d = s1Data[i];
    const mDom = s1MushafDom.find(x => x.ayah === d.ayah);
    const wDom = s1WbwDom.find(x => x.ayah === d.ayah);
    const mMatch = d.mushafSpans === mDom.total;
    const wMatch = d.wbwSpans === wDom.total;
    console.log(`Ayah 1:${d.ayah} | Data M:${d.mushafSpans} W:${d.wbwSpans} | DOM M:${mDom.total} (${mMatch ? 'MATCH' : 'FAIL'}) W:${wDom.total} (${wMatch ? 'MATCH' : 'FAIL'}) | Font: ${wDom.font}`);
  }

  console.log("\n--- SURAH 2:1 - 2:5 ---");
  for (let i = 0; i < 5; i++) {
    const d = s2Data[i];
    const mDom = s2MushafDom.find(x => x.ayah === d.ayah);
    const wDom = s2WbwDom.find(x => x.ayah === d.ayah);
    const mMatch = d.mushafSpans === mDom.total;
    const wMatch = d.wbwSpans === wDom.total;
    console.log(`Ayah 2:${d.ayah} | Data M:${d.mushafSpans} W:${d.wbwSpans} | DOM M:${mDom.total} (${mMatch ? 'MATCH' : 'FAIL'}) W:${wDom.total} (${wMatch ? 'MATCH' : 'FAIL'}) | Font: ${wDom.font}`);
  }

  return { s1Data, s2Data, s1MushafDom, s1WbwDom, s2MushafDom, s2WbwDom };
}

verify().catch(console.error);
