import { tabularHijri, formatHijri, getHijriParts } from "../js/core/hijri.js";
import assert from "node:assert";
// Known: 23 Nov 2026 ≈ 13 Jumada al-Akhirah 1448 (Umm al-Qura); tabular may differ by ±1 day
const t = tabularHijri(new Date(2026, 10, 23));
assert.strictEqual(t.year, 1448); assert.strictEqual(t.month, 6); assert.ok(Math.abs(t.day - 13) <= 1, "tabular day " + t.day);
// 1 Jan 2000 = 24 Ramadan 1420 (tabular gives 24/25)
const u = tabularHijri(new Date(2000, 0, 1));
assert.strictEqual(u.year, 1420); assert.strictEqual(u.month, 9); assert.ok(Math.abs(u.day - 24) <= 1);
const s = formatHijri(new Date(2026, 10, 23));
assert.ok(/^\d{1,2} [A-Za-z' -]+ 14\d\d AH$/.test(s), s);
assert.ok(!/BC/.test(s));
console.log("hijri ok:", s, JSON.stringify(getHijriParts(new Date(2026,10,23))));
