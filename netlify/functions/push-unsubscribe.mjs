/* Baseerah — POST /.netlify/functions/push-unsubscribe
 * Removes one phone's subscription when all reminders are turned off. */
import { getSubscriptionStore, endpointHash, json } from "../lib/push-common.mjs";

export async function handleUnsubscribe(req, options = {}) {
  if (req.method !== "POST") return json(405, { error: "Method Not Allowed" });
  let body;
  try { body = await req.json(); } catch (_) { return json(400, { error: "Malformed JSON" }); }
  const endpoint = body && body.endpoint;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) return json(400, { error: "Invalid endpoint" });
  try {
    await getSubscriptionStore(options).delete(`sub_${endpointHash(endpoint)}`);
    return json(200, { success: true });
  } catch (err) {
    console.error("push-unsubscribe: failed", err);
    return json(500, { error: "Failed to delete subscription" });
  }
}

export default (req) => handleUnsubscribe(req);
