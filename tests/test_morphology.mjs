// Word-part colours: gloss-confirmed splits, byte-exact, never Allah.
import assert from "node:assert/strict";
import fs from "node:fs";
import { segmentWord } from "../js/core/morphology.js";

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log("  ✓", name); };
const split = (ar, en) => { const m = segmentWord(ar, en); return m ? [m.prefix, m.stem, m.suffix] : null; };

ok("Al-Rahman splits into ال + رحمن", () => assert.deepEqual(split("الرَّحْمٰنِ", "The Most Gracious"), ["ال", "رَّحْمٰنِ", ""]));
ok("li + al", () => assert.deepEqual(split("لِّلْمُتَّقِیْنَ", "for the God-conscious"), ["لِّلْ", "مُتَّقِیْنَ", ""]));
ok("wa + bi + al", () => assert.deepEqual(split("وَبِالْاٰخِرَةِ", "and in the Hereafter"), ["وَبِالْ", "اٰخِرَةِ", ""]));
ok("possessive ending", () => assert.deepEqual(split("رَبِّهِمْ", "their Lord"), ["", "رَبِّ", "هِمْ"]));
ok("Allah is never split", () => {
  assert.equal(segmentWord("اللّٰهِ", "(of) Allah"), null);
  assert.equal(segmentWord("فَلِلّٰهِ", "then for Allah"), null);
});
ok("root letter و kept when gloss is not 'and'", () => assert.equal(segmentWord("وَجَدَ", "found"), null));
ok("pause marks stay attached", () => {
  const m = segmentWord("الْاَرْضِ ۪", "the earth");
  assert.equal(m.prefix + m.stem + m.suffix, "الْاَرْضِ ۪");
});

ok("whole Quran: every split is byte-exact", () => {
  global.window = {};
  let total = 0, seg = 0;
  for (let s = 1; s <= 114; s++) {
    // eslint-disable-next-line no-eval
    eval(fs.readFileSync(new URL(`../data/surahs/${String(s).padStart(3, "0")}.js`, import.meta.url), "utf8"));
    for (const a of window.BASEERAH_SURAH.ayahs) for (const w of a.words || []) {
      total++;
      const m = segmentWord(w.ar, w.en, w.ur);
      if (!m) continue;
      seg++;
      assert.equal(m.prefix + m.stem + m.suffix, w.ar, `${s}:${a.number} ${w.ar}`);
      assert.ok(m.stem.length > 0);
    }
  }
  assert.ok(seg / total > 0.25, `coverage ${seg}/${total}`);
  console.log(`    ${seg}/${total} words coloured`);
});
console.log(`morphology: ${pass} passed`);

// QUL lemma-based splits (data/morph) must be byte-exact and well-formed.
{
  global.window = {};
  let n = 0;
  for (let s = 1; s <= 114; s++) {
    const p3 = String(s).padStart(3, "0");
    eval(fs.readFileSync(new URL(`../data/surahs/${p3}.js`, import.meta.url), "utf8"));
    const morph = JSON.parse(fs.readFileSync(new URL(`../data/morph/${p3}.json`, import.meta.url), "utf8"));
    for (const a of window.BASEERAH_SURAH.ayahs) (a.words || []).forEach((w, i) => {
      const m = morph[`${a.number}:${i + 1}`];
      if (!m) return;
      const [p, sf] = m;
      assert.ok(p + sf < w.ar.length, `${s}:${a.number}:${i + 1} stem empty`);
      if (p || sf) n++;
    });
  }
  const roots = JSON.parse(fs.readFileSync(new URL("../data/roots.json", import.meta.url), "utf8"));
  assert.equal(roots["1356"].r, "ر ح م");
  console.log(`  ✓ data splits valid (${n} words), roots file ok`);
}
