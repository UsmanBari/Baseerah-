# Baseerah (بصيرة) — Kiosk Prototype

Touch-screen app for mosques and public places: learn **Namaz** and understand the **Quran** word by word (Urdu + English).

## Run it
- **Quickest:** double-click `index.html`. It opens in your browser. No install and no server needed.
- **On a tablet:** copy the folder to the tablet and open `index.html` in Chrome, or host it on any static host (Netlify, GitHub Pages).
- Press `F11` (desktop) or use Chrome's "Add to Home screen" for full-screen.

## Folder structure
```
baseerah/
├── index.html          # 3 screens: Home, Quran, Namaz
├── css/styles.css      # all styling (colors at the top in :root)
├── js/app.js           # navigation, language toggle, word tap, idle reset
└── data/
    ├── quran-sample.js # SAMPLE Al-Fatiha 1–3 (not verified)
    └── namaz.js        # DRAFT Namaz steps (needs scholar review)
```

## What works
- Home → Namaz / Quran, with a Back button on each screen
- Urdu / English toggle for all UI labels
- Quran: tap a word to see its Urdu + English meaning, with the full ayah translation below and Previous/Next ayah buttons
- Namaz: tap a step to see what to do and what to recite
- Kiosk mode: goes back to Home after 90 seconds with no touch, and long-press menus are blocked

## Important: data is sample only
The Arabic, word meanings and translations in `data/` were typed by hand for the mockup and are **not verified**.
Before showing it to anyone, replace them with data built from:
- Arabic text → **Tanzil** (Uthmani, CC BY 3.0, keep unmodified)
- Word-by-word Urdu/English → **QUL** (qul.tarteel.ai)
- Full ayah Urdu/English → **QuranEnc** (`urdu_junagarhi`, `english_saheeh`)

Keep the same shape as `quran-sample.js`, and `app.js` won't need changes.

## Offline note
Fonts (Amiri, Noto Nastaliq Urdu, Inter) load from Google Fonts. For a fully offline kiosk, download them into a `fonts/` folder and switch the `<link>` in `index.html` to local `@font-face` rules.
