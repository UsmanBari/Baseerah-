/* Baseerah — Qibla direction
 * Bearing to the Kaaba from the prayer location (great-circle formula), and
 * a live compass on phones that have one.
 */
import { state } from "../core/state.js";
import { t, ur } from "../core/i18n.js";
import { router } from "../core/router.js";

const KAABA = { lat: 21.4225, lng: 39.8262 };

export function qiblaBearing(lat, lng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(lat), φ2 = toRad(KAABA.lat), Δλ = toRad(KAABA.lng - lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function distanceKm(lat, lng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dφ = toRad(KAABA.lat - lat), dλ = toRad(KAABA.lng - lng);
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(KAABA.lat)) * Math.sin(dλ / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

let cleanup = null;

export function renderQiblaScreen(container) {
  if (cleanup) { cleanup(); cleanup = null; }
  const lat = typeof state.settings.prayerLat === "number" ? state.settings.prayerLat : 33.6844;
  const lng = typeof state.settings.prayerLng === "number" ? state.settings.prayerLng : 73.0479;
  const bearing = qiblaBearing(lat, lng);
  const city = state.settings.prayerCity || "Islamabad";
  const dist = Math.round(distanceKm(lat, lng));

  container.innerHTML = `
    <div class="screen active screen-qibla" dir="ltr">
      <header class="settings-page-header">
        <button type="button" class="btn-header-back settings-back" data-nav="home" aria-label="${t("home", state.lang)}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          <span>${t("home", state.lang)}</span>
        </button>
        <h1 class="settings-page-title">${t("qiblaTitle", state.lang)} <span class="bi-ur" lang="ur" dir="rtl">${ur("qiblaTitle")}</span></h1>
      </header>
      <main class="qibla-main">
        <div class="qibla-dial-wrap">
          <div class="qibla-dial" id="qibla-dial">
            ${DIRS.map((d, i) => `<span class="qd-mark ${d.length === 1 ? "major" : ""}" style="transform: rotate(${i * 45}deg) translateY(-118px) rotate(${-i * 45}deg)">${d}</span>`).join("")}
            <div class="qibla-needle" style="transform: rotate(${bearing}deg)">
              <span class="qn-line"></span>
              <span class="qn-kaaba" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><rect x="5" y="7" width="14" height="13" rx="1.5" fill="#1B1B1B"/><rect x="5" y="10" width="14" height="2" fill="#D9B45A"/></svg></span>
            </div>
            <span class="qibla-center"></span>
          </div>
          <span class="qibla-top-marker" aria-hidden="true"></span>
        </div>
        <p class="qibla-deg"><strong>${Math.round(bearing)}°</strong> ${t("qiblaFromNorth", state.lang)}</p>
        <p class="qibla-status" id="qibla-status" role="status" aria-live="polite">${t("qiblaStatic", state.lang)}</p>
        <button type="button" class="btn-notif-test" id="btn-qibla-compass">${t("qiblaUseCompass", state.lang)}</button>
        <p class="qibla-meta">${t("qiblaFrom", state.lang).replace("{city}", city).replace("{km}", dist.toLocaleString("en-US"))}</p>
        <p class="settings-help-text qibla-tip">${t("qiblaTip", state.lang)}</p>
      </main>
    </div>`;

  container.querySelector("[data-nav='home']").addEventListener("click", () => router.navigate("home"));
  const dial = container.querySelector("#qibla-dial");
  const status = container.querySelector("#qibla-status");
  const btn = container.querySelector("#btn-qibla-compass");
  let lastAligned = false;

  const onHeading = (heading) => {
    if (heading == null || isNaN(heading)) return;
    dial.style.transform = `rotate(${-heading}deg)`;
    const diff = Math.abs(((bearing - heading + 540) % 360) - 180);
    const aligned = diff <= 5;
    status.textContent = aligned ? t("qiblaAligned", state.lang) : t("qiblaTurn", state.lang).replace("{deg}", Math.round(diff));
    status.classList.toggle("is-aligned", aligned);
    if (aligned && !lastAligned) { try { if (navigator.vibrate) navigator.vibrate([30, 40, 30]); } catch (e) { /* ignore */ } }
    lastAligned = aligned;
  };

  const absHandler = (e) => { if (e.absolute && e.alpha != null) onHeading(360 - e.alpha); };
  const iosHandler = (e) => { if (typeof e.webkitCompassHeading === "number") onHeading(e.webkitCompassHeading); };

  const start = async () => {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== "granted") { status.textContent = t("qiblaNoSensor", state.lang); return; }
        window.addEventListener("deviceorientation", iosHandler);
      } else if ("ondeviceorientationabsolute" in window) {
        window.addEventListener("deviceorientationabsolute", absHandler);
      } else {
        window.addEventListener("deviceorientation", absHandler);
      }
      btn.hidden = true;
      status.textContent = t("qiblaCalibrate", state.lang);
      setTimeout(() => { if (status.textContent === t("qiblaCalibrate", state.lang)) status.textContent = t("qiblaNoSensor", state.lang); }, 4000);
    } catch (e) {
      status.textContent = t("qiblaNoSensor", state.lang);
    }
  };
  btn.addEventListener("click", start);
  // Android starts without a permission prompt
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function" && window.matchMedia("(pointer: coarse)").matches) start();

  cleanup = () => {
    window.removeEventListener("deviceorientationabsolute", absHandler);
    window.removeEventListener("deviceorientation", absHandler);
    window.removeEventListener("deviceorientation", iosHandler);
  };
  const off = () => { if (cleanup) { cleanup(); cleanup = null; } window.removeEventListener("hashchange", off); };
  window.addEventListener("hashchange", off);
}
