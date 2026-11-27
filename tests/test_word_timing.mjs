// Word highlight timing: weights, silence trimming, phrase alignment.
import assert from "node:assert/strict";
import { wordWeight, estimateSegments, findVoiced, hasPauseMark } from "../js/core/word-timing.js";

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log("  ✓", name); };

ok("harakat do not inflate weight", () => {
  assert.ok(Math.abs(wordWeight("بِسْمِ") - wordWeight("بسم")) < 1e-9);
});
ok("maddah and the last word weigh more", () => {
  assert.ok(wordWeight("جَآءَ") > wordWeight("جَاءَ"));
  assert.ok(wordWeight("رَبِّ", true) > wordWeight("رَبِّ", false));
});
ok("pause marks detected", () => {
  assert.equal(hasPauseMark("رَیْبَ ۛۖۚ"), true);
  assert.equal(hasPauseMark("ذٰلِكَ"), false);
});

const words = ["ذٰلِكَ", "الْكِتٰبُ", "لَا", "رَیْبَ ۛۖۚ", "فِیْهِ ۛۚ", "هُدًی", "لِّلْمُتَّقِیْنَ"].map((ar) => ({ ar }));
ok("estimate: ordered, inside the file, skips lead-in", () => {
  const segs = estimateSegments(words, 10);
  assert.equal(segs.length, 7);
  assert.ok(segs[0].start > 0.2, "lead-in silence skipped");
  for (let i = 0; i < segs.length; i++) {
    assert.ok(segs[i].end > segs[i].start);
    if (i) assert.ok(segs[i].start >= segs[i - 1].end - 1e-9);
  }
  assert.equal(segs[6].end, 10);
});
ok("estimate: breath after pause-marked word", () => {
  const segs = estimateSegments(words, 10);
  assert.ok(segs[4].start - segs[3].end > 0.05);
  assert.ok(segs[1].start - segs[0].end < 1e-9);
});
ok("waveform: phrases snap to voiced chunks", () => {
  const voiced = [[0.5, 3.0], [3.6, 4.6], [5.2, 9.0]]; // 3 phrases, 2 breaths
  const segs = estimateSegments(words, 9.6, { voiced });
  assert.ok(Math.abs(segs[0].start - 0.5) < 1e-6);
  assert.ok(Math.abs(segs[3].end - 3.0) < 1e-6, "phrase 1 ends at breath");
  assert.ok(Math.abs(segs[4].start - 3.6) < 1e-6 && Math.abs(segs[4].end - 4.6) < 1e-6);
  assert.ok(Math.abs(segs[5].start - 5.2) < 1e-6);
});
ok("findVoiced: finds tone bursts and trims silence", () => {
  const sr = 8000;
  const sig = new Float32Array(sr * 3);
  const burst = (a, b) => { for (let i = Math.floor(a * sr); i < b * sr; i++) sig[i] = 0.5 * Math.sin(i * 0.3); };
  burst(0.4, 1.2); burst(1.6, 2.5);
  for (let i = 0; i < sig.length; i++) sig[i] += (Math.random() - 0.5) * 0.002;
  const v = findVoiced(sig, sr);
  assert.equal(v.length, 2);
  assert.ok(Math.abs(v[0][0] - 0.4) < 0.05 && Math.abs(v[0][1] - 1.2) < 0.05);
  assert.ok(Math.abs(v[1][0] - 1.6) < 0.05 && Math.abs(v[1][1] - 2.5) < 0.05);
});
console.log(`word timing: ${pass} passed`);
