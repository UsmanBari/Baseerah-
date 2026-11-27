/* Which version of Baseerah is running.
   - Phone app (basseerah.netlify.app, the APK): never kiosk; no kiosk switch.
   - Mosque kiosk: a separate site whose address contains "kiosk", or a page
     that sets window.BASEERAH_BUILD = "kiosk" before loading the app.
   - Local development (localhost): kiosk can still be switched on for testing. */
const host = typeof location !== "undefined" ? location.hostname : "";
export const IS_KIOSK_BUILD =
  (typeof window !== "undefined" && window.BASEERAH_BUILD === "kiosk") || /kiosk/i.test(host);
export const IS_DEV_HOST = host === "localhost" || host === "127.0.0.1" || host === "";
