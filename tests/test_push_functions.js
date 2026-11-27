/**
 * tests/test_push_functions.js
 * Tests for the Netlify push functions (modern v2 format):
 *  1. payload validation (endpoint, keys, coords, reminder fields)
 *  2. push-subscribe saves to the store, rejects bad input, rate limits
 *  3. push-unsubscribe deletes
 *  4. dispatcher: prayer reminder, dedupe, 410 pruning
 *  5. dispatcher: daily Quran reminder at the chosen local time, opens #continue
 *  6. dispatcher: Friday Al-Kahf reminder only on Fridays
 *  7. reminders that are switched off are not sent
 *  8. push-test sends one notification and maps errors
 */
import assert from "node:assert";
import crypto from "node:crypto";

process.env.VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "test-public";
process.env.VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "test-private";

const { handleSubscribe, validateSubscriptionPayload } = await import("../netlify/functions/push-subscribe.mjs");
const { handleUnsubscribe } = await import("../netlify/functions/push-unsubscribe.mjs");
const { processDispatch, dueNotifications } = await import("../netlify/functions/push-dispatch.mjs");
const { handleTest } = await import("../netlify/functions/push-test.mjs");
const { handleSnooze } = await import("../netlify/functions/push-snooze.mjs");

console.log("=== Netlify push functions tests ===\n");

function mockStore() {
  const memory = new Map();
  return {
    memory,
    async get(k, o) { const v = memory.get(k); if (!v) return null; return o && o.type === "json" ? JSON.parse(v) : v; },
    async set(k, v) { memory.set(k, typeof v === "string" ? v : JSON.stringify(v)); },
    async delete(k) { memory.delete(k); },
    async list(o) { const p = (o && o.prefix) || ""; return { blobs: [...memory.keys()].filter((k) => k.startsWith(p)).map((key) => ({ key })) }; }
  };
}
function mockWebpush(fail) {
  const sent = [];
  return { sent, setVapidDetails() {}, async sendNotification(sub, payload) { if (fail) { const e = new Error("gone"); e.statusCode = fail; throw e; } sent.push({ sub, payload: JSON.parse(payload) }); } };
}
const post = (url, body) => new Request("https://x.test" + url, { method: "POST", headers: { "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
const hashOf = (e) => crypto.createHash("sha256").update(e).digest("hex");

const base = {
  subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc123", keys: { p256dh: "BMqOQoR3y0g09e0y1v8z89kL9xPz9mK9v8e1r3t5y7u9", auth: "mK9v8e1r3t5y7u9i" } },
  lat: 31.52, lng: 74.36, method: "Karachi", madhab: "Hanafi", timezone: "Asia/Karachi", offsetMinutes: 0,
  enabledPrayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }
};
const clone = (o) => JSON.parse(JSON.stringify(o));

// 1. Validation
{
  const ok = validateSubscriptionPayload(base);
  assert.strictEqual(ok.valid, true);
  assert.strictEqual(ok.data.quranReminder.enabled, true, "Quran reminder defaults on");
  assert.strictEqual(ok.data.quranReminder.minuteOfDay, 420, "Quran reminder defaults to 07:00");
  assert.strictEqual(ok.data.jumuahReminder.enabled, true, "Jumu'ah reminder defaults on");
  const t = clone(base); t.quranReminder = { enabled: true, time: "21:30" };
  assert.strictEqual(validateSubscriptionPayload(t).data.quranReminder.minuteOfDay, 1290);
  const bad = clone(base); bad.quranReminder = { time: "99:99" };
  assert.strictEqual(validateSubscriptionPayload(bad).data.quranReminder.minuteOfDay, 420, "Invalid time falls back to 07:00");
  const tz = clone(base); tz.timezone = "Not/AZone";
  assert.strictEqual(validateSubscriptionPayload(tz).data.timezone, "Asia/Karachi", "Unknown timezone falls back");
  for (const mutate of [
    (p) => { p.subscription.endpoint = "http://insecure"; },
    (p) => { p.subscription.keys = null; },
    (p) => { p.subscription.keys.p256dh = "short"; },
    (p) => { p.lat = 91; },
    (p) => { p.lng = -181; }
  ]) { const p = clone(base); mutate(p); assert.strictEqual(validateSubscriptionPayload(p).valid, false); }
  console.log("  PASS 1: validation");
}

// 2. Subscribe
{
  const store = mockStore();
  assert.strictEqual((await handleSubscribe(new Request("https://x.test/a", { method: "GET" }), { store })).status, 405);
  assert.strictEqual((await handleSubscribe(post("/a", "{bad"), { store })).status, 400);
  const res = await handleSubscribe(post("/a", base), { store });
  assert.strictEqual(res.status, 200);
  const key = `sub_${hashOf(base.subscription.endpoint)}`;
  assert(store.memory.has(key), "saved under hashed key");
  const saved = JSON.parse(store.memory.get(key));
  assert.strictEqual(saved.quranReminder.minuteOfDay, 420);
  // rate limit: 30 per hour per endpoint
  let last;
  for (let i = 0; i < 30; i++) last = await handleSubscribe(post("/a", base), { store });
  assert.strictEqual(last.status, 429, "31st write in an hour is limited");
  console.log("  PASS 2: subscribe saves + rate limit");
}

// 3. Unsubscribe
{
  const store = mockStore();
  const key = `sub_${hashOf("https://fcm.googleapis.com/fcm/send/zzz")}`;
  store.memory.set(key, "{}");
  const res = await handleUnsubscribe(post("/u", { endpoint: "https://fcm.googleapis.com/fcm/send/zzz" }), { store });
  assert.strictEqual(res.status, 200);
  assert(!store.memory.has(key));
  console.log("  PASS 3: unsubscribe deletes");
}

function savedRecord(over = {}) {
  const r = validateSubscriptionPayload({ ...clone(base), ...over }).data;
  r.sentTags = [];
  return r;
}

// 4. Prayer reminder + dedupe + prune
{
  const store = mockStore();
  const key = "sub_p";
  store.memory.set(key, JSON.stringify(savedRecord({ quranReminder: { enabled: false }, jumuahReminder: { enabled: false } })));
  // Find today's Dhuhr in Lahore for 2026-11-21 by asking the pure function across the day
  const day = new Date("2026-11-21T00:00:00+05:00");
  let dhuhrAt = null;
  for (let m = 0; m < 1440 && !dhuhrAt; m += 1) {
    const t = new Date(day.getTime() + m * 60000);
    const d = dueNotifications(savedRecord({ quranReminder: { enabled: false }, jumuahReminder: { enabled: false } }), t);
    if (d.some((n) => n.tag.endsWith("-dhuhr"))) dhuhrAt = new Date(t.getTime() + 3 * 60000);
  }
  assert(dhuhrAt, "found Dhuhr window");
  const wp = mockWebpush();
  const r1 = await processDispatch(dhuhrAt, { store, webpush: wp });
  assert.strictEqual(r1.sent, 1);
  assert(wp.sent[0].payload.title.startsWith("Dhuhr"));
  assert.strictEqual(wp.sent[0].payload.tag, "prayer-2026-11-21-dhuhr");
  const r2 = await processDispatch(new Date(dhuhrAt.getTime() + 60000), { store, webpush: wp });
  assert.strictEqual(r2.sent, 0, "no duplicate");
  const r3 = await processDispatch(dhuhrAt, { store: (() => { const s = mockStore(); s.memory.set("sub_x", JSON.stringify(savedRecord({ quranReminder: { enabled: false } }))); return s; })(), webpush: mockWebpush(410) });
  assert.strictEqual(r3.pruned, 1, "410 prunes");
  console.log("  PASS 4: prayer reminder, dedupe, prune");
}

// 5. Daily Quran reminder at 07:00 Karachi = 02:00 UTC
{
  const rec = savedRecord({ prayersEnabled: false, jumuahReminder: { enabled: false } });
  const at = new Date("2026-11-23T02:00:00Z");
  const due = dueNotifications(rec, at);
  assert.strictEqual(due.length, 1, "one Quran reminder");
  // Default is "In order": starts at Al-Fatihah 1:1 and groups short ayahs.
  assert.strictEqual(due[0].url, "/#quran/1/1", "opens the first ayah shown");
  assert.strictEqual(due[0].tag, "quran-2026-11-23");
  assert(/Al-Fatihah 1:1–\d/.test(due[0].body), "groups Fatihah ayahs: " + due[0].body);
  assert(typeof due[0].setsLinearIndex === "number" && due[0].setsLinearIndex > 1);
  // Next day continues from where it stopped.
  const next = dueNotifications({ ...rec, quranLinearIndex: due[0].setsLinearIndex }, new Date("2026-11-24T02:00:00Z"))[0];
  assert(next.url !== "/#quran/1/1" && /\d+:\d+/.test(next.body));
  // End of the Quran wraps to the start.
  const last = dueNotifications({ ...rec, quranLinearIndex: 6235 }, at)[0];
  assert.strictEqual(last.url, "/#quran/114/6");
  assert.strictEqual(last.setsLinearIndex, 0);
  // A long ayah (2:282) is cut honestly with a pointer to the full text.
  const { linearPassage } = await import("../netlify/functions/push-dispatch.mjs");
  const idx282 = 7 + 281;
  assert.strictEqual(linearPassage(idx282).ayah, 282);
  assert(/tap to read the full ayah/.test(dueNotifications({ ...rec, quranLinearIndex: idx282 }, at)[0].body));
  // "Random": one ayah, no position change.
  const rnd = dueNotifications(savedRecord({ prayersEnabled: false, jumuahReminder: { enabled: false }, quranReminder: { enabled: true, time: "07:00", order: "random" } }), at)[0];
  assert(/Quran time/.test(rnd.title) && /\d+:\d+\)$/.test(rnd.body) && rnd.setsLinearIndex === undefined);
  assert.strictEqual(dueNotifications(rec, new Date("2026-11-23T02:30:00Z")).length, 0, "not at 07:30");
  const custom = savedRecord({ prayersEnabled: false, jumuahReminder: { enabled: false }, quranReminder: { enabled: true, time: "21:00" } });
  assert.strictEqual(dueNotifications(custom, new Date("2026-11-23T16:00:00Z")).length, 1, "custom 9 PM works");
  const store = mockStore(); store.memory.set("sub_q", JSON.stringify(rec));
  const wp = mockWebpush();
  await processDispatch(at, { store, webpush: wp });
  await processDispatch(new Date(at.getTime() + 2 * 60000), { store, webpush: wp });
  assert.strictEqual(wp.sent.length, 1, "Quran reminder sent once per day");
  console.log("  PASS 5: daily Quran reminder");
}

// 6. Jumu'ah: Friday 2026-11-27 09:00 Karachi = 04:00 UTC
{
  const rec = savedRecord({ prayersEnabled: false, quranReminder: { enabled: false } });
  const fri = dueNotifications(rec, new Date("2026-11-27T04:00:00Z"));
  assert.strictEqual(fri.length, 1);
  assert.strictEqual(fri[0].url, "/#quran/18/1", "opens Surah Al-Kahf");
  assert.strictEqual(dueNotifications(rec, new Date("2026-11-26T04:00:00Z")).length, 0, "not on Thursday");
  console.log("  PASS 6: Jumu'ah reminder only on Friday");
}

// 7. Everything off → nothing
{
  const rec = savedRecord({ prayersEnabled: false, quranReminder: { enabled: false }, jumuahReminder: { enabled: false } });
  assert.strictEqual(dueNotifications(rec, new Date("2026-11-27T04:00:00Z")).length, 0);
  assert.strictEqual(dueNotifications(rec, new Date("2026-11-23T02:00:00Z")).length, 0);
  console.log("  PASS 7: switched-off reminders are not sent");
}

// 8. Test endpoint
{
  const wp = mockWebpush();
  const ok = await handleTest(post("/t", { subscription: base.subscription }), { webpush: wp });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(wp.sent.length, 1);
  assert(/working/.test(wp.sent[0].payload.title));
  const gone = await handleTest(post("/t", { subscription: { ...base.subscription, endpoint: "https://fcm.googleapis.com/fcm/send/other" } }), { webpush: mockWebpush(410) });
  assert.strictEqual(gone.status, 410);
  const badReq = await handleTest(post("/t", { subscription: { endpoint: "nope" } }), { webpush: wp });
  assert.strictEqual(badReq.status, 400);
  console.log("  PASS 8: test notification endpoint");
}

// 9. Prayer body names the next prayer; Quran reminder carries actions; ayah text is complete
{
  const rec = savedRecord({ quranReminder: { enabled: false }, jumuahReminder: { enabled: false } });
  const day = new Date("2026-11-21T00:00:00+05:00");
  let asr = null;
  for (let m = 0; m < 1440 && !asr; m++) {
    const d = dueNotifications(rec, new Date(day.getTime() + m * 60000)).find((n) => n.tag.endsWith("-asr"));
    if (d) asr = d;
  }
  assert(asr && /Next: Maghrib at/.test(asr.body), "Asr reminder mentions Maghrib: " + (asr && asr.body));
  const q = dueNotifications(savedRecord({ prayersEnabled: false, jumuahReminder: { enabled: false } }), new Date("2026-11-23T02:00:00Z"))[0];
  assert.deepStrictEqual(q.actions.map((a) => a.action), ["read", "snooze"]);
  assert(!/…/.test(q.body), "daily ayah is never cut");
  const { default: AYAHS } = await import("../netlify/lib/daily-ayahs.mjs");
  assert(AYAHS.length >= 20, "a few weeks of different ayahs");
  for (const a of AYAHS) assert(a.en.length <= 170 && !/\[\d+\]/.test(a.en), "clean, short ayah " + a.surah + ":" + a.ayah);
  console.log("  PASS 9: richer prayer text, actions, ayah pool");
}

// 10. Fajr-ending alert is off by default, 20 min before sunrise when on
{
  const off = savedRecord({ prayersEnabled: false, quranReminder: { enabled: false }, jumuahReminder: { enabled: false } });
  const on = savedRecord({ prayersEnabled: false, quranReminder: { enabled: false }, jumuahReminder: { enabled: false }, sunriseReminder: { enabled: true } });
  const day = new Date("2026-11-23T00:00:00+05:00");
  let hit = null, offHits = 0;
  for (let m = 0; m < 1440; m++) {
    const t = new Date(day.getTime() + m * 60000);
    offHits += dueNotifications(off, t).length;
    const d = dueNotifications(on, t).find((n) => n.tag.startsWith("sunrise-"));
    if (d && !hit) hit = { d, t };
  }
  assert.strictEqual(offHits, 0, "off by default");
  assert(hit && /Fajr ends at/.test(hit.d.title));
  console.log("  PASS 10: Fajr ending alert");
}

// 11. Snooze: stores a follow-up, dispatcher sends it once, then clears
{
  const store = mockStore();
  const rec = savedRecord({ prayersEnabled: false, quranReminder: { enabled: false }, jumuahReminder: { enabled: false } });
  const key = `sub_${hashOf(rec.subscription.endpoint)}`;
  store.memory.set(key, JSON.stringify(rec));
  const t0 = new Date("2026-11-23T02:01:00Z");
  const r = await handleSnooze(post("/s", { endpoint: rec.subscription.endpoint, minutes: 60 }), { store, now: t0 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await handleSnooze(post("/s", { endpoint: "https://fcm.googleapis.com/fcm/send/none" }), { store })).status, 404);
  const wp = mockWebpush();
  await processDispatch(new Date(t0.getTime() + 30 * 60000), { store, webpush: wp });
  assert.strictEqual(wp.sent.length, 0, "not before the hour");
  await processDispatch(new Date(t0.getTime() + 60 * 60000), { store, webpush: wp });
  assert.strictEqual(wp.sent.length, 1, "sent at the hour");
  assert(/Ready for your Quran time/.test(wp.sent[0].payload.title));
  assert.strictEqual(wp.sent[0].payload.data.url, "/#continue");
  await processDispatch(new Date(t0.getTime() + 65 * 60000), { store, webpush: wp });
  assert.strictEqual(wp.sent.length, 1, "only once");
  assert(!("quranSnoozeUntil" in JSON.parse(store.memory.get(key))), "snooze cleared");
  console.log("  PASS 11: snooze follow-up");
}

console.log("\n✅ ALL NETLIFY PUSH FUNCTIONS TESTS PASSED!\n");
