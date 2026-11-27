/* Baseerah — reading progress, streak and khatam plan (stored only on this phone)
 * An ayah counts as read when it has been on screen for a moment while
 * reading (Mushaf) or shown in the word-by-word view.
 */
const KEY = "baseerah_reading";
export const TOTAL_AYAHS = 6236;

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysBetween(a, b) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

let offsets = null; // surah -> index of its first ayah (0-based)
function ayahIndex(s, a) {
  if (!offsets) {
    const idx = Array.isArray(window.BASEERAH_INDEX) ? window.BASEERAH_INDEX : [];
    if (idx.length !== 114) return -1;
    offsets = [];
    let sum = 0;
    for (const x of idx) { offsets[x.number] = sum; sum += x.ayahCount; }
  }
  const i = offsets[s];
  return i === undefined ? -1 : i + a - 1;
}
export function refFromIndex(i) {
  const idx = window.BASEERAH_INDEX || [];
  let rem = i;
  for (const x of idx) {
    if (rem < x.ayahCount) return { surah: x.number, ayah: rem + 1, nameEn: x.nameEn };
    rem -= x.ayahCount;
  }
  return { surah: 114, ayah: 6, nameEn: "An-Nas" };
}

// Bitset of 6236 ayahs, base64 in storage (~1 KB)
function decode(b64) {
  const bytes = new Uint8Array(Math.ceil(TOTAL_AYAHS / 8));
  if (!b64) return bytes;
  try {
    const bin = atob(b64);
    for (let i = 0; i < Math.min(bin.length, bytes.length); i++) bytes[i] = bin.charCodeAt(i);
  } catch (e) { /* corrupt: start fresh */ }
  return bytes;
}
function encode(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function countBits(bytes) {
  let n = 0;
  for (let b of bytes) { while (b) { n += b & 1; b >>= 1; } }
  return n;
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { days: raw.days || {}, plan: raw.plan || null, planRead: raw.planRead || "" };
  } catch (e) {
    return { days: {}, plan: null, planRead: "" };
  }
}
function save(st) {
  // Keep about a year of daily counts
  const keys = Object.keys(st.days).sort();
  if (keys.length > 400) for (const k of keys.slice(0, keys.length - 400)) delete st.days[k];
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
}

const seenThisSession = new Set();

export const ReadingTracker = {
  /** Count an ayah as read today (once per session per ayah). */
  markRead(s, a) {
    const key = `${s}:${a}`;
    if (seenThisSession.has(key)) return;
    seenThisSession.add(key);
    const i = ayahIndex(s, a);
    if (i < 0) return;
    const st = load();
    const t = dayKey();
    st.days[t] = (st.days[t] || 0) + 1;
    if (st.plan) {
      const bits = decode(st.planRead);
      bits[i >> 3] |= 1 << (i & 7);
      st.planRead = encode(bits);
    }
    save(st);
  },

  todayCount() { return load().days[dayKey()] || 0; },

  /** Consecutive days with reading, ending today (or yesterday if not read yet today). */
  streak() {
    const st = load();
    let d = new Date();
    if (!st.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    let n = 0;
    while (st.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },

  lastDays(n = 7) {
    const st = load();
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({ key: dayKey(d), label: d.toLocaleDateString("en-US", { weekday: "narrow" }), count: st.days[dayKey(d)] || 0 });
    }
    return out;
  },

  startPlan(days) {
    const st = load();
    st.plan = { days, start: dayKey() };
    st.planRead = "";
    save(st);
  },

  stopPlan() {
    const st = load();
    st.plan = null;
    st.planRead = "";
    save(st);
  },

  /** Khatam plan status, or null if no plan. */
  plan() {
    const st = load();
    if (!st.plan) return null;
    const bits = decode(st.planRead);
    const done = countBits(bits);
    const dayNo = Math.min(st.plan.days, daysBetween(st.plan.start, dayKey()) + 1);
    const daysLeft = Math.max(1, st.plan.days - dayNo + 1);
    const today = st.days[dayKey()] || 0;
    // Today's target spreads what is left over the remaining days (today's reading counts toward it).
    const remainingBeforeToday = Math.max(0, TOTAL_AYAHS - (done - Math.min(today, done)));
    const target = Math.ceil(remainingBeforeToday / daysLeft);
    let next = 0;
    while (next < TOTAL_AYAHS && (bits[next >> 3] & (1 << (next & 7)))) next++;
    return {
      days: st.plan.days, dayNo, start: st.plan.start, done, total: TOTAL_AYAHS,
      pct: (done / TOTAL_AYAHS) * 100, today, target: Math.max(1, target),
      finished: done >= TOTAL_AYAHS,
      next: next < TOTAL_AYAHS ? refFromIndex(next) : null,
      expectedByToday: Math.min(TOTAL_AYAHS, Math.round((TOTAL_AYAHS / st.plan.days) * dayNo))
    };
  }
};
