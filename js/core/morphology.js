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
        // Position 3px bar immediately below glyph box baseline
        bar.style.top = `${Math.round(r.bottom - arRect.top - 4)}px`;
        overlay.appendChild(bar);
      }
    });
  });
}
