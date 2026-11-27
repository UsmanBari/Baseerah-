/* Baseerah — Settings screen (full page)
 * Routes:
 *   #settings                    → opened from Home, back goes Home
 *   #settings/quran/<s>/<a>      → opened from the reader, back returns to that ayah
 */
import { state } from "../core/state.js";
import { router } from "../core/router.js";
import { UIComponents } from "../ui/components.js";

export function renderSettingsScreen(container, params = []) {
  const fromReader = params[0] === "quran";
  const surahNum = fromReader ? parseInt(params[1], 10) || null : null;
  const ayahNum = fromReader ? parseInt(params[2], 10) || 1 : null;
  const meta = surahNum && Array.isArray(window.BASEERAH_INDEX)
    ? window.BASEERAH_INDEX.find((x) => x.number === surahNum)
    : null;

  container.innerHTML = `<div class="screen active screen-settings" dir="ltr"></div>`;
  const host = container.querySelector(".screen-settings");

  const goBack = () => {
    if (fromReader && surahNum) router.navigate(`quran/${surahNum}/${ayahNum}`);
    else router.navigate("home");
  };

  UIComponents.showQuranSettingsBottomSheet({
    page: host,
    surahNum: meta ? surahNum : null,
    totalAyahs: meta ? meta.ayahCount : null,
    focus: fromReader ? null : "notifications",
    onChange: () => {},
    onClose: goBack
  });

  // Hardware / browser back on Android lands on the previous hash automatically.
  host.addEventListener("keydown", (e) => {
    if (e.key === "Escape") goBack();
  });
}
