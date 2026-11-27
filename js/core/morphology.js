/* Baseerah — Morphology Rendering Engine
   Supports:
   - Style A: "Underline" (pure ink letters, 3px rounded bar under prefix/suffix measured via Range.getClientRects)
   - Style B: "Tint" (prefix/suffix base letters tinted ≥4.5:1, diacritics stay pure ink, fallback to Style A on ligatures)
   - Zero layout shift, byte-for-byte fidelity
*/

export function isDiacritic(cp) {
  if (cp >= 0x064B && cp <= 0x065F) return true; // Fathah, Dammah, Kasrah, Sukun, Shaddah, Tanween
  if (cp === 0x0670) return true;                 // Superscript Alef / Khari Zabar
  if (cp >= 0x06D6 && cp <= 0x06ED) return true; // Quranic pause marks, high small letters
  return false;
}

export function buildTintSegmentHtml(text, segType) {
  if (!text) return "";
  let out = "";
  let currentBase = "";
  let currentDiac = "";

  const flushBase = () => {
    if (currentBase) {
      out += `<span class="morph-letter-${segType}">${currentBase}</span>`;
      currentBase = "";
    }
  };
  const flushDiac = () => {
    if (currentDiac) {
      out += `<span class="morph-diacritic">${currentDiac}</span>`;
      currentDiac = "";
    }
  };

  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (isDiacritic(cp)) {
      flushBase();
      currentDiac += ch;
    } else {
      flushDiac();
      currentBase += ch;
    }
  }
  flushBase();
  flushDiac();
  return out;
}

export function shouldFallbackToUnderline(loc, text) {
  if (!text) return false;
  // In Indo-Pak script, Allah ligature (e.g. لِلّٰهِ, اللّٰهِ) is an inseparable OpenType glyph.
  // In Style B, coloring the prefix causes the font engine to color the entire stem ligature,
  // or separating diacritics detaches the lam/he glyphs. Fallback to Style A preserves pure ink text.
  if (text.includes("لِلّٰهِ") || text.includes("اللّٰهِ") || text.includes("لله")) {
    return true;
  }
  return false;
}

export function renderArabicWordHtml(wAr, morph, isMorphActive, morphStyle) {
  if (!isMorphActive || !morph || !morph.segmented) {
    return wAr;
  }

  const pText = morph.prefix || "";
  const stText = morph.stem || "";
  const sfText = morph.suffix || "";

  if (morphStyle === "tint") {
    // Check fallback
    if (shouldFallbackToUnderline(null, wAr)) {
      // Fallback to Underline style for this word to avoid breaking ligatures
      const p = pText ? `<span class="morph-seg morph-prefix" data-seg="prefix">${pText}</span>` : "";
      const st = `<span class="morph-seg morph-stem" data-seg="stem">${stText}</span>`;
      const sf = sfText ? `<span class="morph-seg morph-suffix" data-seg="suffix">${sfText}</span>` : "";
      return `${p}${st}${sf}<span class="morph-bar-overlay" aria-hidden="true"></span>`;
    }

    const p = pText ? `<span class="morph-seg morph-prefix">${buildTintSegmentHtml(pText, "prefix")}</span>` : "";
    const st = `<span class="morph-seg morph-stem">${stText}</span>`;
    const sf = sfText ? `<span class="morph-seg morph-suffix">${buildTintSegmentHtml(sfText, "suffix")}</span>` : "";
    return `${p}${st}${sf}`;
  }

  // Default: Style A "Underline"
  const p = pText ? `<span class="morph-seg morph-prefix" data-seg="prefix">${pText}</span>` : "";
  const st = `<span class="morph-seg morph-stem" data-seg="stem">${stText}</span>`;
  const sf = sfText ? `<span class="morph-seg morph-suffix" data-seg="suffix">${sfText}</span>` : "";
  return `${p}${st}${sf}<span class="morph-bar-overlay" aria-hidden="true"></span>`;
}

export function layoutUnderlineBars(container) {
  if (!container) return;
  const tiles = container.querySelectorAll(".wbw-word-tile");
  tiles.forEach((tile) => {
    const arEl = tile.querySelector(".tile-ar");
    if (!arEl) return;

    let overlay = arEl.querySelector(".morph-bar-overlay");
    if (!overlay) {
      // If tile has data-seg spans but no overlay (e.g. style switched), create overlay
      if (arEl.querySelector(".morph-seg[data-seg]")) {
        overlay = document.createElement("span");
        overlay.className = "morph-bar-overlay";
        overlay.setAttribute("aria-hidden", "true");
        arEl.appendChild(overlay);
      } else {
        return;
      }
    }

    overlay.innerHTML = "";
    const segs = arEl.querySelectorAll(".morph-seg[data-seg]");
    if (!segs.length) return;

    const arRect = arEl.getBoundingClientRect();
    if (arRect.width === 0) return;

    segs.forEach((seg) => {
      const segType = seg.getAttribute("data-seg");
      if (segType === "stem" || !segType) return; // stem has no bar
      if (!seg.textContent || !seg.textContent.trim()) return;

      const range = document.createRange();
      range.selectNodeContents(seg);
      const rects = range.getClientRects();

      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.width <= 0) continue;
        const bar = document.createElement("div");
        bar.className = `morph-bar morph-bar-${segType}`;
        bar.style.left = `${Math.round(r.left - arRect.left)}px`;
        bar.style.width = `${Math.round(r.width)}px`;
        // Position 4px bar directly under glyphs, 2px above bottom of tile-ar
        bar.style.bottom = "2px";
        overlay.appendChild(bar);
      }
    });
  });
}

/* ── Runtime segmentation for the whole Quran ─────────────────────────────
   The QUL-backed table (window.BASEERAH_MORPHOLOGY) covers only a few
   surahs. For every other word we split common attached particles
   (وَ فَ بِ لِ كَ + ال, and pronoun endings) — but ONLY when the word's own
   English meaning confirms the split (e.g. "And the …" for وَال…, "… their"
   for …هِمْ). The Arabic text is never changed: prefix + stem + suffix is
   always byte-for-byte the original word. Unsure words stay uncoloured. */

const BASE_NORM = { "ي": "ی", "ى": "ی", "ئ": "ی", "ك": "ک", "ة": "ہ", "ۃ": "ہ", "ه": "ہ", "ھ": "ہ", "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا" };
const PREFIX_LABELS = {
  "ال": { en: "the", ur: "خاص / وہ" },
  "و": { en: "and", ur: "اور" },
  "ف": { en: "so / then", ur: "پس / تو" },
  "ب": { en: "with / by / in", ur: "ساتھ / سے / میں" },
  "ل": { en: "for / to", ur: "کے لیے" },
  "ک": { en: "like / as", ur: "جیسے / مانند" }
};
const SUFFIX_RULES = [
  // [normalized base letters, English endings that confirm it, labels]
  ["ہما", ["them", "their", "both"], { en: "them two / their", ur: "ان دونوں کا" }],
  ["کما", ["you", "your"], { en: "you two / your", ur: "تم دونوں کا" }],
  ["ہم", ["them", "their", "themselves"], { en: "them / their", ur: "ان کا / انہیں" }],
  ["ہن", ["them", "their"], { en: "them / their (f.)", ur: "ان (عورتوں) کا" }],
  ["کم", ["you", "your", "yourselves"], { en: "you (all) / your", ur: "تمہارا / تمہیں" }],
  ["کن", ["you", "your"], { en: "you (f.) / your", ur: "تمہارا (مونث)" }],
  ["نا", ["us", "our", "ourselves"], { en: "us / our", ur: "ہمارا / ہمیں" }],
  ["ہا", ["her", "it", "its"], { en: "her / its", ur: "اس کا / اسے (مونث)" }],
  ["ہ", ["him", "his", "it", "its", "himself"], { en: "him / his / it", ur: "اس کا / اسے" }],
  ["ک", ["you", "your", "yourself"], { en: "you / your", ur: "تیرا / تجھے" }],
  ["نی", ["me"], { en: "me", ur: "مجھے" }],
  ["ی", ["me", "my", "myself"], { en: "me / my", ur: "میرا / مجھے" }]
];

const PARTICLE_WORDS = {
  "ب": ["in", "with", "by", "for", "about", "through", "at"],
  "ک": ["like", "as"],
  "ل": ["for", "to"]
};
const VERB_SUBJECTS = [
  // [ending letters, gloss's first word, labels, required vowel on first ending letter]
  ["تما", ["you"], { en: "you two (did)", ur: "تم دونوں نے" }, null],
  ["تم", ["you"], { en: "you all (did)", ur: "تم سب نے" }, null],
  ["نا", ["we"], { en: "we (did)", ur: "ہم نے" }, null],
  ["وا", ["they"], { en: "they (did)", ur: "انہوں نے" }, null],
  ["ت", ["you"], { en: "you (did)", ur: "تو نے / آپ نے" }, ["\u064E", "\u0650"]],
  ["ت", ["i"], { en: "I (did)", ur: "میں نے" }, ["\u064F"]]
];
const POSSESSIVES = new Set(["his", "its", "her", "their", "your", "our", "my"]);

function baseLetters(text) {
  // [{i: index in text, b: normalized base letter}]
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);
    if (isDiacritic(cp) || cp === 0x0640 || cp < 0x0600 || cp > 0x06FF) continue;
    const ch = text[i];
    out.push({ i, b: BASE_NORM[ch] || ch });
  }
  return out;
}

function glossWords(en) {
  return String(en || "")
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/[^a-z' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Split one word. Returns null when not confident. Exported for tests. */
export function segmentWord(ar, en, ur = "") {
  const full = String(ar || "");
  // Keep trailing pause marks / ayah glyphs out of the analysis.
  const cut = full.search(/\s/);
  const core = cut === -1 ? full : full.slice(0, cut);
  const tail = cut === -1 ? "" : full.slice(cut);
  const letters = baseLetters(core);
  if (letters.length < 3) return null;
  const g = glossWords(en);
  if (!g.length) return null;
  const seq = letters.map((l) => l.b).join("");
  // Allah and words built on it are one ligature — never split them.
  if (/^(ا|و|ف|ب|ل|ت)?لل[ہ]/.test(seq) && /allah/.test(g.join(" "))) return null;

  const hasThe = g.includes("the");
  let p = 0; // number of base letters in the prefix
  const parts = [];
  let gi = 0; // gloss words consumed by the prefix letters
  const left = () => letters.length - p;
  // Up to two particle letters (وَبِ…, فَلِ…), each confirmed by the next gloss word.
  for (let round = 0; round < 2; round++) {
    const ch = seq[p];
    const w = g[gi];
    let key = null;
    if (round === 0 && ch === "و" && w === "and") key = "و";
    else if (round === 0 && ch === "ف" && (w === "so" || w === "then" || w === "and")) key = "ف";
    else if (ch === "ب" && PARTICLE_WORDS["ب"].includes(w)) key = "ب";
    else if (ch === "ک" && PARTICLE_WORDS["ک"].includes(w)) key = "ک";
    else if (ch === "ل" && PARTICLE_WORDS["ل"].includes(w) && seq[p + 1] !== "ا") key = "ل";
    if (!key || left() - 1 < 2) break;
    p += 1; parts.push(key); gi += 1;
  }
  // Definite article. After لِ the alif of ال is dropped in writing (لِلْ…).
  if (hasThe && !/^(الذ|التی|اللت|اللا|اللذ)/.test(seq.slice(p))) {
    const rest = seq.slice(p);
    if (rest.startsWith("ال") && left() - 2 >= 2) { p += 2; parts.push("ال"); }
    else if (parts[parts.length - 1] === "ل" && rest.startsWith("ل") && left() - 1 >= 2) { p += 1; parts.push("ال"); }
  }

  // Pronoun ending. Possessives (their Lord, your sin) may sit anywhere in the
  // gloss; object pronouns (afflicts them) must be its last word.
  let s = 0;
  let suffixRule = null;
  const last = g[g.length - 1];
  for (const rule of SUFFIX_RULES) {
    const [suf, ends] = rule;
    if (!seq.endsWith(suf) || left() - suf.length < 2) continue;
    const ok = ends.includes(last) || g.some((w) => POSSESSIVES.has(w) && ends.includes(w));
    if (ok) { s = suf.length; suffixRule = rule; break; }
  }
  // Verb subject endings (أَنْعَمْتَ = "You have bestowed"): confirmed by the
  // gloss starting with that pronoun, and by the vowel on the ending.
  if (!s) {
    const firstFree = g[gi] === "the" ? g[gi + 1] : g[gi];
    const vowelAfter = (k) => {
      const at = letters[letters.length - k].i + 1;
      return core.slice(at, at + 2);
    };
    for (const [suf, who, label, vowel] of VERB_SUBJECTS) {
      if (!seq.endsWith(suf) || !who.includes(firstFree) || left() - suf.length < 2) continue;
      if (vowel && !vowel.some((v) => vowelAfter(suf.length).includes(v))) continue;
      s = suf.length;
      suffixRule = [suf, [firstFree], label];
      break;
    }
  }
  // A particle glued straight onto a pronoun (لَنَا, لَكُمْ) has no stem to show.
  if (p && !s && SUFFIX_RULES.some(([suf]) => seq.slice(p) === suf)) return null;
  if (!p && !s) return null;

  const prefixEnd = p ? letters[p].i : 0;
  const suffixStart = s ? letters[letters.length - s].i : core.length;
  const prefix = core.slice(0, prefixEnd);
  let stem = core.slice(prefixEnd, suffixStart);
  let suffix = core.slice(suffixStart);
  if (!stem) return null;
  if (suffix) suffix += tail; else stem += tail;
  if (prefix + stem + suffix !== full) return null; // fidelity guard

  // Legend: label each attached part; the stem keeps the rest of the meaning.
  const strip = new Set();
  parts.forEach((k) => (k === "ال" ? ["the"] : k === "و" ? ["and"] : k === "ف" ? ["so", "then", "and"] : PARTICLE_WORDS[k]).forEach((w) => strip.add(w)));
  const cleanEn = String(en || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ").split(/\s+/).filter(Boolean);
  let k0 = 0;
  while (k0 < cleanEn.length - 1 && k0 < parts.length + 1 && strip.has(cleanEn[k0].toLowerCase().replace(/[^a-z]/g, ""))) k0++;
  let stemWords = cleanEn.slice(k0);
  if (suffixRule) stemWords = stemWords.filter((w) => !suffixRule[1].includes(w.toLowerCase().replace(/[^a-z]/g, "")) || stemWords.length === 1);
  const stemEn = stemWords.join(" ").replace(/[,;:]+$/, "").trim();
  const stemShown = stem.replace(/\s+\S*$/, "");
  const suffixShown = suffix.replace(/\s+\S*$/, "");
  const enParts = [], urParts = [];
  if (prefix) {
    enParts.push(`${prefix} = ${parts.map((k) => PREFIX_LABELS[k].en).join(" + ")}`);
    urParts.push(`${prefix} = ${parts.map((k) => PREFIX_LABELS[k].ur).join(" + ")}`);
  }
  if (stemEn) enParts.push(`${stemShown} = ${stemEn}`);
  if (ur) urParts.push(`${stemShown} = ${String(ur).trim()}`);
  if (suffixRule) {
    enParts.push(`${suffixShown} = ${suffixRule[2].en}`);
    urParts.push(`${suffixShown} = ${suffixRule[2].ur}`);
  }
  return {
    text: full,
    segmented: true,
    prefix,
    stem,
    suffix,
    source: "rule",
    parts: [
      prefix ? { type: "prefix", ar: prefix, en: parts.map((k) => PREFIX_LABELS[k].en).join(" + "), ur: parts.map((k) => PREFIX_LABELS[k].ur).join(" + ") } : null,
      { type: "stem", ar: stemShown, en: stemEn, ur: String(ur || "").trim() },
      suffixRule ? { type: "suffix", ar: suffixShown, en: suffixRule[2].en, ur: suffixRule[2].ur } : null
    ].filter(Boolean),
    legend: { en: enParts.join(" · "), ur: urParts.join(" · ") }
  };
}

/** Build parts from a known split (QUL lemma data), labelling each part. */
function fromSplit(word, pre, suf) {
  const full = String(word.ar || "");
  const prefix = full.slice(0, pre);
  const suffix = suf ? full.slice(full.length - suf) : "";
  const stem = full.slice(pre, full.length - suf);
  if (!stem || prefix + stem + suffix !== full) return null;
  const pSeq = baseLetters(prefix).map((l) => l.b).join("");
  const keys = [];
  for (let i = 0; i < pSeq.length; ) {
    if (pSeq.startsWith("ال", i)) { keys.push("ال"); i += 2; }
    else if (pSeq[i] === "ل" && i === pSeq.length - 1 && keys[keys.length - 1] === "ل") { keys.push("ال"); i += 1; }
    else { keys.push(pSeq[i]); i += 1; }
  }
  const pLabel = (k, lang) => (PREFIX_LABELS[k] ? PREFIX_LABELS[k][lang] : (k === "س" ? (lang === "en" ? "will" : "عنقریب") : ""));
  // Ending label: let the gloss-confirmed rules decide; else a neutral label.
  const rule = segmentWord(full, word.en, word.ur);
  const shown = (t) => t.replace(/\s+\S*$/, "");
  const parts = [];
  if (prefix) parts.push({ type: "prefix", ar: prefix, en: keys.map((k) => pLabel(k, "en")).filter(Boolean).join(" + "), ur: keys.map((k) => pLabel(k, "ur")).filter(Boolean).join(" + ") });
  parts.push({ type: "stem", ar: shown(stem) || stem, en: String(word.en || "").replace(/[()\[\]]/g, ""), ur: String(word.ur || "") });
  if (suffix) {
    const rp = rule && rule.suffix === suffix ? rule.parts.find((x) => x.type === "suffix") : null;
    parts.push({ type: "suffix", ar: shown(suffix) || suffix, en: rp ? rp.en : "attached ending (him / you / us …)", ur: rp ? rp.ur : "ساتھ لگا ضمیر" });
  }
  return {
    text: full, segmented: true, prefix, stem, suffix, source: "qul", parts,
    legend: { en: parts.map((p) => `${p.ar} = ${p.en}`).join(" · "), ur: parts.map((p) => `${p.ar} = ${p.ur}`).join(" · ") }
  };
}

const _cache = new Map();
/** Best available split for a word: the reviewed QUL table first, then the
    gloss-confirmed rules. Returns null when the word should stay plain. */
export function getMorphology(loc, word) {
  const table = (typeof window !== "undefined" && window.BASEERAH_MORPHOLOGY) || null;
  const known = table && table[loc];
  if (_cache.has(loc)) return _cache.get(loc);
  if (word && "sp" in word) {
    const m = word.sp && (word.sp[0] || word.sp[1]) ? fromSplit(word, word.sp[0], word.sp[1]) : null;
    _cache.set(loc, m);
    return m;
  }
  if (known && known.segmented && known.text === word.ar) {
    const pick = (legend, ar) => {
      const hit = String(legend || "").split(" · ").find((x) => x.startsWith(`${ar} = `));
      return hit ? hit.slice(ar.length + 3) : "";
    };
    const parts = [
      known.prefix ? { type: "prefix", ar: known.prefix } : null,
      { type: "stem", ar: known.stem },
      known.suffix ? { type: "suffix", ar: known.suffix } : null
    ].filter(Boolean).map((x) => ({
      ...x,
      en: pick(known.legend && known.legend.en, x.ar) || (x.type === "stem" ? String(word.en || "") : ""),
      ur: pick(known.legend && known.legend.ur, x.ar) || (x.type === "stem" ? String(word.ur || "") : "")
    }));
    const out = { ...known, parts };
    _cache.set(loc, out);
    return out;
  }
  const m = word && word.ar ? segmentWord(word.ar, word.en, word.ur) : null;
  _cache.set(loc, m);
  return m;
}
