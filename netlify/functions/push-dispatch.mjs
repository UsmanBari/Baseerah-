/* Baseerah — Scheduled Netlify Function: push dispatcher (every 5 minutes)
 *
 * For each saved phone it sends, at most once per day each:
 *   - the five prayer reminders (at the time or 5/10/15 min before)
 *   - the daily "Quran time" reminder (default 07:00, opens where they left off)
 *   - the Friday Surah Al-Kahf reminder (09:00 on Fridays, opens Surah 18)
 *   - optional "Fajr ends soon" alert 20 minutes before sunrise
 *   - the "In 1 hour" follow-up when someone snoozes the Quran reminder
 */
import * as webpush from "web-push";
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from "adhan";
import { getSubscriptionStore } from "../lib/push-common.mjs";
import DAILY_AYAHS from "../lib/daily-ayahs.mjs";
import QURAN_EN, { SURAH_NAMES_EN } from "../lib/quran-en.mjs";

export const config = { schedule: "*/5 * * * *" };

const PRAYER_NAMES = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
// A reminder is due if its time falls inside this window around "now".
// The schedule runs every 5 minutes; ±3 min gives overlap so nothing is missed,
// and the per-day tag stops duplicates.
const WINDOW_MS = 3 * 60 * 1000;
const JUMUAH_MINUTE = 9 * 60; // 09:00 local time on Fridays
const SUNRISE_LEAD_MIN = 20;   // "Fajr ends soon" alert, minutes before sunrise
const QURAN_ACTIONS = [
  { action: "read", title: "Read now" },
  { action: "snooze", title: "In 1 hour" }
];

function zonedParts(date, timezone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short"
    }).formatToParts(date);
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    return {
      dateTag: `${get("year")}-${get("month")}-${get("day")}`,
      minuteOfDay: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10),
      weekday: get("weekday")
    };
  } catch (_) {
    return { dateTag: date.toISOString().slice(0, 10), minuteOfDay: date.getUTCHours() * 60 + date.getUTCMinutes(), weekday: "" };
  }
}

function formatTime(date, timezone) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  } catch (_) {
    return date.toISOString().slice(11, 16);
  }
}

/** Minutes between two minute-of-day values, wrapping around midnight. */
function minuteDistance(a, b) {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

function prayerParams(method, madhab) {
  let params;
  if (method === "MWL") params = CalculationMethod.MuslimWorldLeague();
  else if (method === "UmmAlQura") params = CalculationMethod.UmmAlQura();
  else if (method === "Egyptian") params = CalculationMethod.Egyptian();
  else if (method === "NorthAmerica") params = CalculationMethod.NorthAmerica();
  else params = CalculationMethod.Karachi();
  params.madhab = madhab === "Shafi" ? Madhab.Shafi : Madhab.Hanafi;
  return params;
}

export function dailyAyahFor(dateTag) {
  if (!DAILY_AYAHS.length) return null;
  const [y, m, d] = dateTag.split("-").map((n) => parseInt(n, 10));
  const dayNumber = Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
  return DAILY_AYAHS[((dayNumber % DAILY_AYAHS.length) + DAILY_AYAHS.length) % DAILY_AYAHS.length];
}

const LINEAR_MAX_CHARS = 230;

/**
 * "In order": the ayahs at the subscriber's place in the Quran. Short ayahs are
 * grouped (one notification can hold 1:1–1:3) so the reading moves forward at a
 * real pace; a long ayah is shown alone and cut honestly with "tap to read".
 * Returns { surah, ayah, toAyah, text, count }.
 */
export function linearPassage(index) {
  const n = QURAN_EN.length;
  let i = ((Number.isInteger(index) ? index : 0) % n + n) % n;
  const [s, a, first] = QURAN_EN[i];
  let text = first;
  let count = 1;
  // Keep within one surah and within the length a notification shows.
  while (i + count < n) {
    const [s2, , en2] = QURAN_EN[i + count];
    if (s2 !== s || text.length + 1 + en2.length > LINEAR_MAX_CHARS) break;
    text += " " + en2;
    count++;
  }
  const toAyah = a + count - 1;
  return { surah: s, ayah: a, toAyah, text, count, nextIndex: (i + count) % n };
}

/** "Random": a different ayah each day for each phone, from the whole Quran. */
export function randomAyahFor(dateTag, seed = "") {
  let h = 2166136261;
  for (const ch of `${dateTag}|${seed}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  // Prefer an ayah that fits a notification: walk forward from the hashed spot.
  const n = QURAN_EN.length;
  for (let k = 0; k < 40; k++) {
    const [s, a, en] = QURAN_EN[(h + k * 97) % n];
    if (en.length <= 200 && !/[,–-]$/.test(en)) return { surah: s, ayah: a, toAyah: a, text: en };
  }
  const [s, a, en] = QURAN_EN[h % n];
  return { surah: s, ayah: a, toAyah: a, text: en };
}

function passageBody(p) {
  const ref = p.toAyah > p.ayah ? `${p.surah}:${p.ayah}–${p.toAyah}` : `${p.surah}:${p.ayah}`;
  const name = SURAH_NAMES_EN[p.surah - 1] || `Surah ${p.surah}`;
  const text = p.text.length > LINEAR_MAX_CHARS ? `${truncate(p.text, 200)} (tap to read the full ayah)` : p.text;
  return `“${text}” (${name} ${ref})`;
}

function truncate(text, max = 140) {
  if (!text || text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** Works out which notifications one phone should get right now. Pure, so it is easy to test. */
export function dueNotifications(sub, now) {
  const tz = sub.timezone || "Asia/Karachi";
  const local = zonedParts(now, tz);
  const due = [];

  // 1. Prayers (+ optional "Fajr ends soon" before sunrise)
  const lat = typeof sub.lat === "number" ? sub.lat : 33.68;
  const lng = typeof sub.lng === "number" ? sub.lng : 73.05;
  const pt = new PrayerTimes(new Coordinates(lat, lng), now, prayerParams(sub.method, sub.madhab));
  if (sub.prayersEnabled !== false) {
    const offsetMs = (sub.offsetMinutes || 0) * 60000;
    const enabled = sub.enabledPrayers || {};
    const order = Object.keys(PRAYER_NAMES);
    for (const key of order) {
      if (enabled[key] === false || !pt[key]) continue;
      const alertAt = pt[key].getTime() - offsetMs;
      if (Math.abs(alertAt - now.getTime()) > WINDOW_MS) continue;
      const nextKey = order[order.indexOf(key) + 1];
      const nextLine = nextKey && pt[nextKey] ? ` Next: ${PRAYER_NAMES[nextKey]} at ${formatTime(pt[nextKey], tz)}.` : "";
      due.push({
        tag: `prayer-${local.dateTag}-${key}`,
        title: `${PRAYER_NAMES[key]} · ${formatTime(pt[key], tz)}`,
        body: sub.offsetMinutes
          ? `${PRAYER_NAMES[key]} starts in ${sub.offsetMinutes} minutes.${nextLine}`
          : `It's time for ${PRAYER_NAMES[key]}.${nextLine}`,
        url: "/#home"
      });
    }
  }
  const sr = sub.sunriseReminder || { enabled: false };
  if (sr.enabled && pt.sunrise) {
    const alertAt = pt.sunrise.getTime() - SUNRISE_LEAD_MIN * 60000;
    if (Math.abs(alertAt - now.getTime()) <= WINDOW_MS) {
      due.push({
        tag: `sunrise-${local.dateTag}`,
        title: `Fajr ends at ${formatTime(pt.sunrise, tz)}`,
        body: `About ${SUNRISE_LEAD_MIN} minutes left to pray Fajr.`,
        url: "/#home"
      });
    }
  }

  // 2. Daily Quran time
  const qr = sub.quranReminder || { enabled: true, minuteOfDay: 420 };
  if (qr.enabled !== false) {
    const target = typeof qr.minuteOfDay === "number" ? qr.minuteOfDay : 420;
    if (minuteDistance(local.minuteOfDay, target) * 60000 <= WINDOW_MS) {
      const order = qr.order === "random" ? "random" : "linear";
      const p = order === "random"
        ? randomAyahFor(local.dateTag, sub.endpointHash || "")
        : linearPassage(sub.quranLinearIndex || 0);
      due.push({
        tag: `quran-${local.dateTag}`,
        title: order === "random" ? "It's Quran time" : "Your next ayahs",
        body: passageBody(p),
        url: `/#quran/${p.surah}/${p.ayah}`,
        ...(order === "linear" ? { setsLinearIndex: p.nextIndex } : {}),
        actions: QURAN_ACTIONS
      });
    }
  }
  // 2b. "In 1 hour" follow-up the person asked for
  if (typeof sub.quranSnoozeUntil === "number" && now.getTime() >= sub.quranSnoozeUntil - WINDOW_MS) {
    if (now.getTime() - sub.quranSnoozeUntil <= 30 * 60000) {
      due.push({
        tag: `quran-snooze-${sub.quranSnoozeUntil}`,
        title: "Ready for your Quran time?",
        body: "Tap to continue where you left off.",
        url: "/#continue",
        actions: [{ action: "read", title: "Read now" }],
        clearsSnooze: true
      });
    } else {
      due.push({ clearsSnooze: true, expired: true });
    }
  }

  // 3. Friday: Surah Al-Kahf
  const jm = sub.jumuahReminder || { enabled: true };
  if (jm.enabled !== false && local.weekday === "Fri") {
    if (minuteDistance(local.minuteOfDay, JUMUAH_MINUTE) * 60000 <= WINDOW_MS) {
      due.push({
        tag: `jumuah-${local.dateTag}`,
        title: "Jumu'ah Mubarak",
        body: "It's Friday. Tap to read Surah Al-Kahf.",
        url: "/#quran/18/1"
      });
    }
  }
  return due;
}

export async function processDispatch(now = new Date(), options = {}) {
  const store = getSubscriptionStore(options);
  const wp = options.webpush || webpush;
  const pub = process.env.VAPID_PUBLIC_KEY || "";
  const priv = process.env.VAPID_PRIVATE_KEY || "";
  if (pub && priv) wp.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:owner@example.com", pub, priv);
  else if (!options.webpush) {
    console.warn("push-dispatch: VAPID keys missing; nothing sent");
    return { processed: 0, sent: 0, pruned: 0, skipped: "no-vapid" };
  }

  const { blobs } = await store.list({ prefix: "sub_" });
  let processed = 0, sent = 0, pruned = 0;

  for (const blob of blobs) {
    processed++;
    let sub;
    try { sub = await store.get(blob.key, { type: "json" }); } catch (_) { sub = null; }
    if (!sub || !sub.subscription) continue;

    sub.sentTags = Array.isArray(sub.sentTags) ? sub.sentTags : [];
    let changed = false;
    let gone = false;

    for (const n of dueNotifications(sub, now)) {
      if (n.expired) { delete sub.quranSnoozeUntil; changed = true; continue; }
      if (sub.sentTags.includes(n.tag)) continue;
      try {
        await wp.sendNotification(
          sub.subscription,
          JSON.stringify({ title: n.title, body: n.body, tag: n.tag, actions: n.actions || [], data: { url: n.url } }),
          { TTL: 1800, urgency: "high" }
        );
        sent++;
        sub.sentTags.push(n.tag);
        if (n.clearsSnooze) delete sub.quranSnoozeUntil;
        if (typeof n.setsLinearIndex === "number") sub.quranLinearIndex = n.setsLinearIndex;
        changed = true;
      } catch (err) {
        const status = err.statusCode || (err.response && err.response.statusCode);
        if (status === 404 || status === 410) {
          await store.delete(blob.key);
          pruned++;
          gone = true;
          break;
        }
        console.warn(`push-dispatch: send failed for ${blob.key}:`, status, err.message || err);
      }
    }

    if (changed && !gone) {
      sub.sentTags = sub.sentTags.slice(-30);
      await store.set(blob.key, JSON.stringify(sub));
    }
  }

  console.log(`push-dispatch: processed=${processed} sent=${sent} pruned=${pruned}`);
  return { processed, sent, pruned };
}

export default async () => {
  try {
    const result = await processDispatch(new Date());
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("push-dispatch failed:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
