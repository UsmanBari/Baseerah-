/* Baseerah — POST /.netlify/functions/push-subscribe
 * Saves (or updates) one phone's push subscription and reminder settings. */
import { getSubscriptionStore, endpointHash, json, validateSubscriptionPayload, isRateLimited } from "../lib/push-common.mjs";

export { validateSubscriptionPayload };

export async function handleSubscribe(req, options = {}) {
  if (req.method !== "POST") return json(405, { error: "Method Not Allowed" });

  let body;
  try { body = await req.json(); } catch (_) { return json(400, { error: "Malformed JSON" }); }

  const validation = validateSubscriptionPayload(body);
  if (!validation.valid) return json(400, { error: validation.error });

  const hash = endpointHash(validation.data.subscription.endpoint);
  if (isRateLimited(`sub:${hash}`)) return json(429, { error: "Too many requests" });

  try {
    const store = getSubscriptionStore(options);
    const existing = await store.get(`sub_${hash}`, { type: "json" });
    const sentTags = existing && Array.isArray(existing.sentTags) ? existing.sentTags : [];
    const record = { ...validation.data, endpointHash: hash, sentTags };
    if (existing && existing.quranSnoozeUntil) record.quranSnoozeUntil = existing.quranSnoozeUntil;
    // Keep the place in the Quran across settings changes.
    if (existing && Number.isInteger(existing.quranLinearIndex)) record.quranLinearIndex = existing.quranLinearIndex;
    await store.set(`sub_${hash}`, JSON.stringify(record));
    return json(200, { success: true });
  } catch (err) {
    console.error("push-subscribe: failed to save", err);
    return json(500, { error: "Failed to save subscription" });
  }
}

export default (req) => handleSubscribe(req);
