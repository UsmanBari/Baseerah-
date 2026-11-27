/* Baseerah — word timing for recitation highlight.

   The ayah MP3s have no word timestamps, so we estimate them:
   1. Weight each word by how long it takes to recite: letters, long vowels,
      madd signs (ٓ) and shaddah — not by raw string length (harakat and pause
      marks made the old estimate drift).
   2. Skip the silence at the start and end of the file, and the breaths the
      reciter takes at pause marks (ۚ ۖ ۗ …). When the audio can be read, we find
      these silences in the waveform itself; otherwise we use safe defaults.
   Words are then spread over the time the reciter is actually speaking. */

const PAUSE_MARKS = /[ۖ-ۜ۞]/; // ۖ ۗ ۘ ۙ ۚ ۛ ۜ ۞
const DIACRITIC = (cp) => (cp >= 0x064B && cp <= 0x065F) || cp === 0x0670 || (cp >= 0x06D6 && cp <= 0x06ED);
const LONG = new Set(["ا", "و", "ی", "ي", "ى", "آ"]);

export function wordWeight(ar, isLast = false) {
  const text = String(ar || "").split(/\s/)[0];
  let w = 0.8; // every word has a minimum onset
  let prevBase = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === 0x0653) { w += 2.2; continue; }        // maddah: 4–6 counts
    if (cp === 0x0651) { w += 0.45; continue; }       // shaddah: doubled letter
    if (cp === 0x0670 || cp === 0x0656) { w += 0.9; continue; } // dagger alif / small ya: long vowel
    if (cp >= 0x064B && cp <= 0x064D) { w += 0.3; continue; }   // tanween
    if (DIACRITIC(cp)) continue;
    if (cp < 0x0600 || cp > 0x06FF) continue;
    if (cp === 0x0622) { w += 3.1; prevBase = ch; continue; } // آ = alif + maddah
    // A long-vowel letter after another letter is a vowel, not a consonant.
    w += LONG.has(ch) && prevBase ? 0.9 : 1;
    prevBase = ch;
  }
  if (isLast) w += 1.6; // reciters stretch the last word (madd ʿāriḍ, waqf)
  return w;
}

export function hasPauseMark(ar) {
  return PAUSE_MARKS.test(String(ar || ""));
}

/**
 * Spread words across voiced time.
 * @param {Array<{ar:string}>} words
 * @param {number} duration seconds
 * @param {{voiced?: Array<[number, number]>}} [opts] voiced intervals from the waveform
 * @returns {Array<{index:number,start:number,end:number}>}
 */
export function estimateSegments(words, duration, opts = {}) {
  const n = words.length;
  if (!n || !(duration > 0)) return [];
  const weights = words.map((w, i) => wordWeight(w.ar, i === n - 1));

  let voiced = Array.isArray(opts.voiced) && opts.voiced.length ? opts.voiced : null;
  if (!voiced) {
    // No waveform: trim typical lead-in / tail silence, and leave a short breath
    // after words that carry a pause mark.
    const lead = Math.min(0.4, duration * 0.06);
    const tail = Math.min(0.55, duration * 0.07);
    const breaths = words.map((w, i) => (i < n - 1 && hasPauseMark(w.ar) ? 1 : 0));
    const nb = breaths.reduce((a, b) => a + b, 0);
    const breath = nb ? Math.min(0.45, (duration - lead - tail) * 0.06 / nb) : 0;
    const speak = Math.max(0.2, duration - lead - tail - nb * breath);
    const total = weights.reduce((a, b) => a + b, 0);
    let t = lead;
    return weights.map((wt, i) => {
      const start = t;
      const end = start + (wt / total) * speak;
      t = end + (breaths[i] ? breath : 0);
      return { index: i, start, end: i === n - 1 ? duration : end };
    });
  }

  // Waveform available. If the long silences line up with the pause marks,
  // give each phrase its own voiced chunk (much tighter). Otherwise spread
  // all words over the voiced time.
  const phrases = [];
  let cur = [];
  words.forEach((w, i) => {
    cur.push(i);
    if (i < n - 1 && hasPauseMark(w.ar)) { phrases.push(cur); cur = []; }
  });
  if (cur.length) phrases.push(cur);

  const chunks = mergeVoiced(voiced, 0.32); // split only on breaths ≥ 0.32s
  const segs = new Array(n);
  if (phrases.length > 1 && chunks.length === phrases.length) {
    phrases.forEach((idxs, p) => spread(idxs, [chunks[p]], weights, segs));
  } else {
    spread(words.map((_, i) => i), voiced, weights, segs);
  }
  segs[n - 1].end = Math.max(segs[n - 1].end, duration);
  return segs;
}

function mergeVoiced(voiced, minGap) {
  const out = [];
  for (const [s, e] of voiced) {
    const last = out[out.length - 1];
    if (last && s - last[1] < minGap) last[1] = e;
    else out.push([s, e]);
  }
  return out;
}

// Map cumulative word weight onto the voiced timeline (skipping silences).
function spread(idxs, intervals, weights, segs) {
  const total = idxs.reduce((a, i) => a + weights[i], 0);
  const voicedLen = intervals.reduce((a, [s, e]) => a + (e - s), 0);
  const at = (x) => { // voiced offset → clock time
    let rem = x;
    for (const [s, e] of intervals) {
      if (rem <= e - s) return s + rem;
      rem -= e - s;
    }
    return intervals[intervals.length - 1][1];
  };
  let acc = 0;
  idxs.forEach((i) => {
    const start = at((acc / total) * voicedLen);
    acc += weights[i];
    const end = at((acc / total) * voicedLen);
    segs[i] = { index: i, start, end };
  });
}

/**
 * Find speech in decoded audio: returns voiced intervals [start, end] in seconds.
 * Pure function over Float32 samples so it can be unit-tested.
 */
export function findVoiced(samples, sampleRate, frameSec = 0.02) {
  const frame = Math.max(1, Math.round(sampleRate * frameSec));
  const nf = Math.floor(samples.length / frame);
  if (nf < 3) return [];
  const rms = new Float32Array(nf);
  let peak = 0;
  for (let f = 0; f < nf; f++) {
    let sum = 0;
    const o = f * frame;
    for (let i = 0; i < frame; i++) { const v = samples[o + i]; sum += v * v; }
    rms[f] = Math.sqrt(sum / frame);
    if (rms[f] > peak) peak = rms[f];
  }
  if (peak <= 0) return [];
  const sorted = Array.from(rms).sort((a, b) => a - b);
  const floor = sorted[Math.floor(nf * 0.1)];
  const thr = Math.max(peak * 0.06, floor * 2.5);
  const out = [];
  let start = -1;
  let quiet = 0;
  const minQuiet = Math.round(0.14 / frameSec); // ignore gaps shorter than 140ms
  for (let f = 0; f < nf; f++) {
    if (rms[f] >= thr) {
      if (start < 0) start = f;
      quiet = 0;
    } else if (start >= 0) {
      quiet++;
      if (quiet >= minQuiet) {
        out.push([start * frameSec, (f - quiet + 1) * frameSec]);
        start = -1;
        quiet = 0;
      }
    }
  }
  if (start >= 0) out.push([start * frameSec, (nf - quiet) * frameSec]);
  return out.filter(([s, e]) => e - s >= 0.06);
}

let _ctx = null;
const _voicedCache = new Map(); // url → intervals (null = unreadable)

/** Best effort: decode the ayah audio and find where the reciter speaks. */
export async function analyzeVoiced(url) {
  if (!url || typeof window === "undefined") return null;
  if (_voicedCache.has(url)) return _voicedCache.get(url);
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || typeof fetch !== "function") return null;
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok || res.type === "opaque") throw new Error("unreadable");
    const buf = await res.arrayBuffer();
    if (!_ctx) _ctx = new AC();
    const audio = await new Promise((resolve, reject) => {
      const p = _ctx.decodeAudioData(buf, resolve, reject);
      if (p && p.then) p.then(resolve, reject);
    });
    const voiced = findVoiced(audio.getChannelData(0), audio.sampleRate);
    const out = voiced.length ? voiced : null;
    if (_voicedCache.size > 40) _voicedCache.delete(_voicedCache.keys().next().value);
    _voicedCache.set(url, out);
    return out;
  } catch (e) {
    _voicedCache.set(url, null);
    return null;
  }
}

/* Real word timings (Alafasy only), from quran-align by Collin Fair,
   CC BY 4.0 — see docs/LICENSES_AUDIT.md. One small file per surah. */
const _exact = new Map();
export async function exactSegments(surah, ayah, audioSrc) {
  if (!/Alafasy/i.test(String(audioSrc || ""))) return null;
  try {
    let table = _exact.get(surah);
    if (!table) {
      table = fetch(`data/timings/alafasy/${String(surah).padStart(3, "0")}.json`).then((r) => (r.ok ? r.json() : null));
      _exact.set(surah, table);
    }
    const data = await table;
    const words = data && data[ayah];
    if (!Array.isArray(words) || !words.length) return null;
    return words.map(([s, e], index) => ({ index, start: s / 1000, end: Math.max(s, e) / 1000 }));
  } catch (e) {
    _exact.delete(surah);
    return null;
  }
}
