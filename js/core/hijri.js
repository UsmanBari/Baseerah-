/* Baseerah — Hijri date helper
 * Some Android browsers return broken output for the Islamic calendar
 * (for example "June 13, 1448 BC AH"). We ask Intl only for numbers,
 * check that they make sense, and use our own month names. If Intl can't
 * give a valid Umm al-Qura date we fall back to the arithmetic (tabular)
 * Islamic calendar, which may differ by a day — the date is marked as
 * approximate in the UI either way.
 */

export const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
  "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"
];

function fromIntl(date) {
  try {
    const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric", month: "numeric", year: "numeric", timeZone: undefined
    });
    const cal = (fmt.resolvedOptions().calendar || "").toLowerCase();
    if (!cal.startsWith("islamic")) return null;
    const parts = fmt.formatToParts(date);
    const get = (type) => {
      const p = parts.find((x) => x.type === type);
      return p ? parseInt(String(p.value).replace(/[^0-9]/g, ""), 10) : NaN;
    };
    const day = get("day");
    const month = get("month");
    const year = get("year");
    if (!(day >= 1 && day <= 30)) return null;
    if (!(month >= 1 && month <= 12)) return null;
    if (!(year >= 1400 && year <= 1600)) return null;
    return { day, month, year };
  } catch (e) {
    return null;
  }
}

// Tabular Islamic calendar (civil epoch), via Julian Day Number.
export function tabularHijri(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jd = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, year };
}

export function getHijriParts(date = new Date()) {
  return fromIntl(date) || tabularHijri(date);
}

export function formatHijri(date = new Date()) {
  const h = getHijriParts(date);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}
