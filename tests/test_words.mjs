// Checks the JS normaliser matches the Python build (so tap-a-word counts are right)
import fs from "node:fs";
import assert from "node:assert";
import { normalizeArabic } from "../js/core/words.js";

const g = {};
new Function("window", fs.readFileSync("data/word_freq.js", "utf8"))(g);
new Function("window", fs.readFileSync("data/vocab.js", "utf8"))(g);
const freq = g.BASEERAH_WORD_FREQ;
const counts = new Map();
let total = 0;
for (const f of fs.readdirSync("data/surahs").filter((x) => x.endsWith(".js"))) {
  const raw = fs.readFileSync(`data/surahs/${f}`, "utf8").replace(/^window\.BASEERAH_SURAH\s*=\s*/, "").trim().replace(/;$/, "");
  for (const a of JSON.parse(raw).ayahs) for (const w of a.words) {
    const k = normalizeArabic(w.ar);
    if (!k) continue;
    total++;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
}
let checked = 0;
for (const [k, n] of counts) {
  if (n >= 2) { assert.strictEqual(freq[k], n, `count mismatch for ${k}`); checked++; }
  else assert.ok(!(k in freq), `${k} should be omitted`);
}
assert.strictEqual(g.BASEERAH_VOCAB.totalWords, total);
assert.strictEqual(normalizeArabic("الْكِتٰبُ"), normalizeArabic("الكتب"));
console.log(`words ok: ${checked} forms match, ${total} words`);
