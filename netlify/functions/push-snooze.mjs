/* Baseerah — POST /.netlify/functions/push-snooze
 * "Remind me in 1 hour" on the Quran-time notification. Stores one
 * follow-up reminder for this phone; the dispatcher sends it. */
import { getSubscriptionStore, endpointHash, json, isRateLimited } from "../lib/push-common.mjs";

export async function handleSnooze(req, options = {}) {
  if (req.method !== "POST") return json(405, { error: "Method Not Allowed" });
  let body;
  try { body = await req.json(); } catch (_) { return json(400, { error: "Malformed JSON" }); }
  const endpoint = body && body.endpoint;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1024) {
    return json(400, { error: "Invalid endpoint" });
  }
  const minutes = Math.min(240, Math.max(15, parseInt(body.minutes, 10) || 60));
  const hash = endpointHash(endpoint);
  if (isRateLimited(`snooze:${hash}`, 10, 3600000)) return json(429, { error: "Too many requests" });

  const store = getSubscriptionStore(options);
  const key = `sub_${hash}`;
  const rec = await store.get(key, { type: "json" });
  if (!rec) return json(404, { error: "Not subscribed" });
  const now = options.now ? options.now.getTime() : Date.now();
  rec.quranSnoozeUntil = now + minutes * 60000;
  await store.set(key, JSON.stringify(rec));
  return json(200, { success: true, at: new Date(rec.quranSnoozeUntil).toISOString() });
}

export default (req) => handleSnooze(req);
