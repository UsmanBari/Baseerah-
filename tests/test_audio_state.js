/* Baseerah — audio state regression test (owner-reported bug)
 * Steps: play Al-Fatihah from ayah 6 → let it finish → open ayah 1 → press play.
 * Expected: ayah 1 plays (not ayah 7 again) and buttons show "play" after the surah ends.
 * Audio is stubbed: play() resolves immediately and fires "ended" after a short delay. */
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const PORT = 8137;
const TYPES = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, serviceWorkers: "block" });
  await ctx.route(/\.(mp3|ogg|m4a)(\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: "audio/mpeg", body: "" }));
  await ctx.addInitScript(() => {
    window.__plays = [];
    const origAdd = HTMLMediaElement.prototype.addEventListener;
    HTMLMediaElement.prototype.addEventListener = function (type, fn, opts) {
      if (type === "error" || type === "stalled") return; // stubbed media never errors
      return origAdd.call(this, type, fn, opts);
    };
    HTMLMediaElement.prototype.play = function () {
      const src = this.src || "";
      window.__plays.push(src.split("/").pop());
      clearTimeout(this.__t);
      setTimeout(() => { this.dispatchEvent(new Event("play")); this.dispatchEvent(new Event("playing")); }, 5);
      this.__t = setTimeout(() => this.dispatchEvent(new Event("ended")), window.__dur || 150);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () { clearTimeout(this.__t); this.dispatchEvent(new Event("pause")); };
    HTMLMediaElement.prototype.load = function () {};
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const playBtn = "#btn-audio-play, #btn-mobile-audio-play";
  const isPlayingUI = () => page.evaluate(() => [...document.querySelectorAll("#btn-audio-play, #btn-mobile-audio-play")].some((b) => b.classList.contains("playing")));

  try {
    await page.goto(`http://localhost:${PORT}/#quran/1/6`);
    await page.waitForSelector(playBtn, { timeout: 15000, state: "attached" });
    await page.waitForTimeout(500);
    await page.locator(playBtn).filter({ visible: true }).first().click();
    // ayah 6 → 7 → end (auto-advance re-renders the reader on each ayah)
    await page.waitForFunction(() => window.__plays.some((s) => /001007/.test(s)), null, { timeout: 10000 });
    await page.waitForTimeout(900);
    assert.strictEqual(await isPlayingUI(), false, "After the surah ends, the play button must show PLAY, not pause");
    console.log("  PASS: buttons reset to play after the surah ended");

    const before = await page.evaluate(() => window.__plays.length);
    await page.evaluate(() => { window.location.hash = "#quran/1/1"; });
    await page.waitForTimeout(800);
    await page.locator(playBtn).filter({ visible: true }).first().click();
    await page.waitForFunction((n) => window.__plays.length > n, before, { timeout: 8000 });
    const next = await page.evaluate((n) => window.__plays.slice(n), before);
    const firstAyahPlay = next.find((s) => /^\d{6}\.mp3$/.test(s));
    assert.ok(firstAyahPlay && /^001001/.test(firstAyahPlay), `Play on ayah 1 must start ayah 1, got: ${JSON.stringify(next)}`);
    console.log("  PASS: play on ayah 1 after the surah ended starts ayah 1:", firstAyahPlay);

    // Pause then resume keeps the same ayah (long stub duration so it doesn't advance)
    await page.evaluate(() => { window.__dur = 60000; window.location.hash = "#home"; });
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.location.hash = "#quran/1/3"; });
    await page.waitForTimeout(600);
    await page.locator(playBtn).filter({ visible: true }).first().click();
    await page.waitForTimeout(300);
    await page.locator(playBtn).filter({ visible: true }).first().click(); // pause
    assert.strictEqual(await isPlayingUI(), false, "Pause must show PLAY");
    const n2 = await page.evaluate(() => window.__plays.length);
    await page.locator(playBtn).filter({ visible: true }).first().click(); // resume
    await page.waitForFunction((n) => window.__plays.length > n, n2, { timeout: 5000 });
    const resumed = await page.evaluate((n) => window.__plays[n], n2);
    assert.ok(/^001003/.test(resumed), `Resume must continue ayah 3, got ${resumed}`);
    console.log("  PASS: pause/resume continues the same ayah");

    assert.deepStrictEqual(errors, [], "No page errors");
    console.log("\n✅ AUDIO STATE TESTS PASSED");
  } catch (e) {
    console.error("❌ AUDIO STATE TEST FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
