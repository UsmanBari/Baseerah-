/* Baseerah — shared code for the push notification functions.
 *
 * Why this file exists: the old functions fell back to an in-memory store
 * whenever Netlify Blobs wasn't reachable the way they called it (CommonJS
 * `require` inside an ES module, and Blobs without Lambda context). That
 * silently lost every subscription, so no notification was ever sent.
 * All functions are now modern (v2) Netlify Functions that import Blobs
 * directly. Tests inject a mock store; production never falls back.
 */
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export const STORE_NAME = "push-subscriptions";

export function getSubscriptionStore(options = {}) {
  if (options.store) return options.store;
  if (globalThis.__MOCK_BLOB_STORE) return globalThis.__MOCK_BLOB_STORE;
  return getStore(STORE_NAME);
}

export function endpointHash(endpoint) {
  return crypto.createHash("sha256").update(endpoint).digest("hex");
}

export function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders }
  });
}

const ALLOWED_METHODS = ["Karachi", "MWL", "UmmAlQura", "Egyptian", "NorthAmerica"];
const ALLOWED_MADHABS = ["Hanafi", "Shafi"];
const ALLOWED_OFFSETS = [0, 5, 10, 15];

export function validateSubscriptionObject(subscription) {
  if (!subscription || typeof subscription !== "object") return "Missing or invalid subscription object";
  const endpoint = subscription.endpoint;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1024) {
    return "Invalid subscription endpoint URL";
  }
  const keys = subscription.keys;
  if (!keys || typeof keys !== "object") return "Missing subscription keys";
  if (typeof keys.p256dh !== "string" || keys.p256dh.length < 10 || keys.p256dh.length > 256) {
    return "Invalid subscription p256dh key";
  }
  if (typeof keys.auth !== "string" || keys.auth.length < 5 || keys.auth.length > 128) {
    return "Invalid subscription auth key";
  }
  return null;
}

/** "07:00" → 420. Returns fallback for anything invalid. */
export function parseTimeOfDay(value, fallback = 420) {
  if (typeof value !== "string") return fallback;
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (h > 23 || mi > 59) return fallback;
  return h * 60 + mi;
}

export function validateSubscriptionPayload(body) {
  if (!body || typeof body !== "object") return { valid: false, error: "Invalid JSON payload" };
  const { subscription, lat, lng, method, madhab, timezone, enabledPrayers, offsetMinutes } = body;

  const subError = validateSubscriptionObject(subscription);
  if (subError) return { valid: false, error: subError };

  if (typeof lat !== "number" || isNaN(lat) || lat < -90 || lat > 90) {
    return { valid: false, error: "Latitude must be a number between -90 and 90" };
  }
  if (typeof lng !== "number" || isNaN(lng) || lng < -180 || lng > 180) {
    return { valid: false, error: "Longitude must be a number between -180 and 180" };
  }

  let cleanTz = "Asia/Karachi";
  if (typeof timezone === "string" && timezone.length <= 64) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone.trim() });
      cleanTz = timezone.trim();
    } catch (_) { /* keep default */ }
  }

  const qr = body.quranReminder && typeof body.quranReminder === "object" ? body.quranReminder : {};
  const jm = body.jumuahReminder && typeof body.jumuahReminder === "object" ? body.jumuahReminder : {};

  return {
    valid: true,
    data: {
      subscription: {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
      },
      lat: parseFloat(lat.toFixed(2)),
      lng: parseFloat(lng.toFixed(2)),
      method: ALLOWED_METHODS.includes(method) ? method : "Karachi",
      madhab: ALLOWED_MADHABS.includes(madhab) ? madhab : "Hanafi",
      timezone: cleanTz,
      prayersEnabled: body.prayersEnabled !== false,
      enabledPrayers: {
        fajr: !enabledPrayers || enabledPrayers.fajr !== false,
        dhuhr: !enabledPrayers || enabledPrayers.dhuhr !== false,
        asr: !enabledPrayers || enabledPrayers.asr !== false,
        maghrib: !enabledPrayers || enabledPrayers.maghrib !== false,
        isha: !enabledPrayers || enabledPrayers.isha !== false
      },
      offsetMinutes: ALLOWED_OFFSETS.includes(offsetMinutes) ? offsetMinutes : 0,
      quranReminder: {
        enabled: qr.enabled !== false,
        minuteOfDay: parseTimeOfDay(qr.time, 420),
        order: qr.order === "random" ? "random" : "linear"
      },
      jumuahReminder: {
        enabled: jm.enabled !== false
      },
      sunriseReminder: {
        enabled: !!(body.sunriseReminder && body.sunriseReminder.enabled === true)
      },
      updatedAt: new Date().toISOString()
    }
  };
}

// Simple per-instance rate limit (best effort; instances are short-lived)
const rateLimitMap = new Map();
export function isRateLimited(key, limit = 30, windowMs = 3600000) {
  const now = Date.now();
  const list = (rateLimitMap.get(key) || []).filter((t) => t > now - windowMs);
  if (list.length >= limit) {
    rateLimitMap.set(key, list);
    return true;
  }
  list.push(now);
  rateLimitMap.set(key, list);
  return false;
}
