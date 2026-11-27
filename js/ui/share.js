/* Baseerah — share an ayah (image / link / QR) and "continue on your phone" QR
 * The image is drawn on a canvas with the app's own fonts: Arabic, Urdu
 * and English, the reference, and a small QR code that opens the ayah.
 */
import { state } from "../core/state.js";
import { t } from "../core/i18n.js";
import { Icons } from "./icons.js";
import qrcode from "../vendor/qrcode.esm.js";

const SITE = "https://basseerah.netlify.app";
const FOOTNOTE = /\s*\[\d+\]/g;
const PUA = /[-]/g;

export function ayahUrl(s, a) { return `${SITE}/#quran/${s}/${a}`; }

/** QR code as an SVG string (crisp at any size). */
export function qrSvg(text, size = 220, { dark = "#0B4A3B", light = "#FFFFFF" } = {}) {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  const quiet = 2;
  const total = n + quiet * 2;
  let path = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}

function drawQr(ctx, text, x, y, size, dark) {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  const cell = size / (n + 4);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) ctx.fillRect(x + (c + 2) * cell, y + (r + 2) * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws the ayah card and returns a PNG Blob. */
export async function renderAyahImage({ surahNum, ayahNum, ar, ur, en, surahNameEn = "", surahNameAr = "" }) {
  const fonts = [`60px "AlQuran IndoPak"`, `40px "Noto Nastaliq Urdu"`, `600 34px "Plus Jakarta Sans"`, `800 40px "Plus Jakarta Sans"`];
  try { await Promise.all(fonts.map((f) => document.fonts.load(f, f.includes("IndoPak") ? ar : f.includes("Nastaliq") ? ur : "Aa"))); } catch (e) { /* draw with fallbacks */ }

  const W = 1080;
  const PAD = 90;
  const inner = W - PAD * 2;
  const arClean = String(ar || "").replace(PUA, "").trim();
  const urClean = String(ur || "").replace(FOOTNOTE, "").trim();
  const enClean = String(en || "").replace(FOOTNOTE, "").trim();

  const probe = document.createElement("canvas").getContext("2d");
  // Shrink type for long ayahs so the image stays a sensible size; never cut the text.
  let scale = 1;
  let layout;
  for (let i = 0; i < 8; i++) {
    const arSize = Math.round(64 * scale), urSize = Math.round(38 * scale), enSize = Math.round(32 * scale);
    probe.font = `${arSize}px "AlQuran IndoPak", "Amiri Quran", serif`; probe.direction = "rtl";
    const arLines = wrapLines(probe, arClean, inner);
    probe.font = `${urSize}px "Noto Nastaliq Urdu", serif`;
    const urLines = urClean ? wrapLines(probe, urClean, inner) : [];
    probe.font = `500 ${enSize}px "Plus Jakarta Sans", sans-serif`; probe.direction = "ltr";
    const enLines = enClean ? wrapLines(probe, enClean, inner) : [];
    const body = arLines.length * arSize * 1.95 + urLines.length * urSize * 2.15 + enLines.length * enSize * 1.5 + 90;
    layout = { arSize, urSize, enSize, arLines, urLines, enLines, body };
    if (body < 1250 || scale < 0.55) break;
    scale -= 0.07;
  }
  const HEADER = 190, FOOTER = 230;
  const H = Math.max(1350, Math.ceil(HEADER + layout.body + FOOTER));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background: deep emerald with a soft light
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0E5A47");
  g.addColorStop(1, "#06281F");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.15, 0, 10, W * 0.15, 0, W);
  glow.addColorStop(0, "rgba(233,199,123,0.18)");
  glow.addColorStop(1, "rgba(233,199,123,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Header: reference
  ctx.textAlign = "center";
  ctx.direction = "ltr";
  ctx.fillStyle = "#E9C77B";
  ctx.font = `700 30px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(`${surahNameEn ? surahNameEn.toUpperCase() + "  ·  " : ""}${surahNum}:${ayahNum}`, W / 2, 110);
  ctx.strokeStyle = "rgba(233,199,123,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 2 - 60, 140); ctx.lineTo(W / 2 + 60, 140); ctx.stroke();

  let y = HEADER + 20;
  // Arabic
  ctx.fillStyle = "#FFFFFF";
  ctx.direction = "rtl";
  ctx.font = `${layout.arSize}px "AlQuran IndoPak", "Amiri Quran", serif`;
  for (const line of layout.arLines) { y += layout.arSize * 1.95; ctx.fillText(line, W / 2, y - layout.arSize * 0.55); }
  y += 30;
  // Urdu
  if (layout.urLines.length) {
    ctx.fillStyle = "#E9C77B";
    ctx.font = `${layout.urSize}px "Noto Nastaliq Urdu", serif`;
    for (const line of layout.urLines) { y += layout.urSize * 2.15; ctx.fillText(line, W / 2, y - layout.urSize * 0.6); }
  }
  y += 24;
  // English
  if (layout.enLines.length) {
    ctx.direction = "ltr";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = `500 ${layout.enSize}px "Plus Jakarta Sans", sans-serif`;
    for (const line of layout.enLines) { y += layout.enSize * 1.5; ctx.fillText(line, W / 2, y); }
  }

  // Footer: brand + QR that opens this ayah
  const fy = H - FOOTER + 40;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(PAD, fy - 30, inner, 2);
  ctx.textAlign = "left";
  ctx.direction = "rtl";
  ctx.fillStyle = "#E9C77B";
  ctx.font = `44px "Noto Nastaliq Urdu", serif`;
  ctx.textAlign = "right";
  ctx.fillText("بصيرة", PAD + 140, fy + 62);
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 40px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText("Baseerah", PAD + 160, fy + 58);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `500 24px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText("Understand the Quran, word by word", PAD + 160, fy + 98);
  drawQr(ctx, ayahUrl(surahNum, ayahNum), W - PAD - 150, fy - 2, 150, "#0B4A3B");

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

async function shareOrDownload(blob, name, text) {
  const file = new File([blob], name, { type: blob.type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelled";
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return "downloaded";
}

function sheetShell(title, bodyHtml) {
  const sheet = document.createElement("div");
  sheet.className = "bottom-sheet-overlay active";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", title);
  sheet.innerHTML = `
    <div class="bottom-sheet share-sheet" dir="ltr">
      <div class="bottom-sheet-handle"></div>
      <div class="word-sheet-head"><span class="share-sheet-title">${title}</span>
        <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">${Icons.close(18)}</button></div>
      ${bodyHtml}
    </div>`;
  const close = () => sheet.remove();
  sheet.querySelector(".btn-close").addEventListener("click", close);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) close(); });
  sheet.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.body.appendChild(sheet);
  return { sheet, close };
}

/** QR sheet: scan on the mosque tablet to open the same ayah on your phone. */
export function showQrSheet(surahNum, ayahNum, label = "") {
  const url = ayahUrl(surahNum, ayahNum);
  sheetShell(t("qrTitle", state.lang), `
    <div class="qr-box">${qrSvg(url, 240)}</div>
    <p class="qr-caption">${t("qrCaption", state.lang).replace("{ref}", `${label ? label + " " : ""}${surahNum}:${ayahNum}`)}</p>`);
}

/** Share menu for one ayah. In kiosk mode only the QR code is offered. */
export function showShareSheet(ayah) {
  if (state.isKiosk) { showQrSheet(ayah.surahNum, ayah.ayahNum, ayah.surahNameEn); return; }
  const { sheet, close } = sheetShell(t("shareTitle", state.lang), `
    <div class="share-options">
      <button type="button" class="share-opt" data-share="image">${Icons.share(20)}<span><strong>${t("shareImage", state.lang)}</strong><small>${t("shareImageSub", state.lang)}</small></span></button>
      <button type="button" class="share-opt" data-share="link">${Icons.external(20)}<span><strong>${t("shareLink", state.lang)}</strong><small>${t("shareLinkSub", state.lang)}</small></span></button>
      <button type="button" class="share-opt" data-share="qr">${Icons.qr(20)}<span><strong>${t("shareQr", state.lang)}</strong><small>${t("shareQrSub", state.lang)}</small></span></button>
    </div>
    <p class="settings-help-text" id="share-status" role="status" aria-live="polite"></p>`);
  const status = sheet.querySelector("#share-status");
  sheet.querySelector('[data-share="image"]').addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    status.textContent = t("shareMaking", state.lang);
    try {
      const blob = await renderAyahImage(ayah);
      const r = await shareOrDownload(blob, `baseerah-${ayah.surahNum}-${ayah.ayahNum}.png`, ayahUrl(ayah.surahNum, ayah.ayahNum));
      status.textContent = r === "downloaded" ? t("shareSaved", state.lang) : "";
      if (r === "shared") close();
    } catch (err) {
      status.textContent = t("shareFailed", state.lang);
    }
    btn.disabled = false;
  });
  sheet.querySelector('[data-share="link"]').addEventListener("click", async () => {
    const url = ayahUrl(ayah.surahNum, ayah.ayahNum);
    const text = `${ayah.surahNameEn || "Surah"} ${ayah.surahNum}:${ayah.ayahNum}`;
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); close(); return; }
    } catch (err) { if (err && err.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); status.textContent = t("shareCopied", state.lang); } catch (err) { status.textContent = url; }
  });
  sheet.querySelector('[data-share="qr"]').addEventListener("click", () => { close(); showQrSheet(ayah.surahNum, ayah.ayahNum, ayah.surahNameEn); });
}
