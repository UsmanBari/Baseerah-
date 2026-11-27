/* Baseerah — POST /.netlify/functions/push-test
 * Sends one test notification to the phone that asked, so people can
 * check that notifications reach them. Only works for subscriptions made
 * with this app's VAPID key, and is rate limited. */
import * as webpush from "web-push";
import { json, validateSubscriptionObject, endpointHash, isRateLimited } from "../lib/push-common.mjs";

export async function handleTest(req, options = {}) {
  if (req.method !== "POST") return json(405, { error: "Method Not Allowed" });
  let body;
  try { body = await req.json(); } catch (_) { return json(400, { error: "Malformed JSON" }); }
  const sub = body && body.subscription;
  const err = validateSubscriptionObject(sub);
  if (err) return json(400, { error: err });

  if (isRateLimited(`test:${endpointHash(sub.endpoint)}`, 5, 600000)) return json(429, { error: "Please wait a few minutes before testing again." });

  const pub = process.env.VAPID_PUBLIC_KEY || "";
  const priv = process.env.VAPID_PRIVATE_KEY || "";
  if (!pub || !priv) return json(503, { error: "Notifications are not configured on the server yet." });

  const wp = options.webpush || webpush;
  try {
    wp.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:owner@example.com", pub, priv);
    await wp.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      JSON.stringify({
        title: "Baseerah notifications are working",
        body: "You'll get prayer and Quran reminders like this, even when the app is closed.",
        tag: "baseerah-test",
        data: { url: "/#home" }
      }),
      { TTL: 600, urgency: "high" }
    );
    return json(200, { success: true });
  } catch (e) {
    const status = e.statusCode || 0;
    console.warn("push-test failed", status, e.body || e.message);
    if (status === 404 || status === 410) return json(410, { error: "This phone's subscription expired. Turn reminders off and on again." });
    if (status === 403 || status === 401) return json(502, { error: "Server key mismatch. Check the VAPID keys in Netlify." });
    return json(502, { error: "Could not send the test notification." });
  }
}

export default (req) => handleTest(req);
