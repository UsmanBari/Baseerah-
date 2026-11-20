# Baseerah (بصيرة) — Kiosk

Touch-screen kiosk web app for mosques and public places: learn **Namaz** step-by-step and read the **Quran** word by word with Urdu and English meanings, rendered in authentic **Indo-Pak Nastaleeq** script.

Plain HTML, CSS, and modern vanilla JavaScript. No framework, no bundler, no build step, no npm packages, and no backend.

---

## Quick Start
- **Run the kiosk:** Double-click `index.html`. It opens directly in your browser over `file://`.
- **Full-screen kiosk mode:** Press `F11` (or use Chrome/Edge kiosk flag `--kiosk`).
- **Offline ready:** All 114 surahs, translations, and the Indo-Pak Nastaleeq font are stored locally.

---

## Directory Structure
```text
baseerah/
├── index.html              # Kiosk screens: Home, Surah List, Quran, Namaz, About
├── css/styles.css          # Kiosk UI styling + @font-face for Indo-Pak Nastaleeq
├── js/app.js               # App logic: dynamic surah loader, navigation, touch handlers, idle reset
├── fonts/
│   └── font.ttf            # Indo-Pak Nastaleeq font with QUL PUA ligatures & ayah markers
├── data/
│   ├── index.js            # window.BASEERAH_INDEX (all 114 surahs metadata)
│   ├── surahs/             # 001.js … 114.js (loaded on demand via <script>)
│   ├── namaz.js            # Namaz steps (draft, scholar review pending — do not modify)
│   ├── SOURCES.md          # Full source licenses, attributions & citations
│   └── build_report.json   # Build validation metrics, checks & missing meaning logs
├── raw/                    # (Git-ignored) Raw downloaded source data
│   ├── tanzil-uthmani.txt       # Ground truth Arabic text (Tanzil.net, CC BY 3.0)
│   ├── qul-wbw-indopak.json     # QUL script 59 (Indo-Pak Nastaleeq word-by-word)
│   ├── qul-ayah-indopak.json    # QUL script 89 (Indo-Pak Nastaleeq ayah-by-ayah)
│   ├── qul-wbw-script.json      # QUL script 56 (Uthmani word-by-word, for verification)
│   ├── qul-wbw-ur.json          # QUL Urdu word-by-word meanings (resource 93)
│   ├── qul-wbw-en.json          # QUL English word-by-word meanings (resource 92)
│   ├── qul-surah-names.json     # Surah names and metadata
│   └── quranenc/                # Raw full ayah translations from QuranEnc
│       ├── urdu_junagarhi/      # 114 JSON files (Maulana Muhammad Junagarhi)
│       └── english_saheeh/      # 114 JSON files (Saheeh International)
├── scripts/
│   ├── inspect_raw.py      # Raw files structure, keying and codepoint inspector
│   ├── fetch_quranenc.py   # Downloader for QuranEnc translations (114 surahs each)
│   └── build_data.py       # Strict 6-step merge & validation build pipeline
└── tests/
    └── test_build.py       # Python unittest suite verifying dataset integrity
```

---

## Quran Data Sources & Licenses

| Source | Resource / File | What it is | License / Terms |
|---|---|---|---|
| **Tanzil Project** | `raw/tanzil-uthmani.txt` | Uthmani text with ayah numbers (Ground Truth) | Creative Commons Attribution 3.0 (CC BY 3.0) |
| **QUL (Tarteel AI)** | `raw/qul-wbw-indopak.json` (Script 59) | Indo-Pak Nastaleeq word-by-word (Display Arabic) | Open Quran Resources / Attribution to Tarteel AI |
| **QUL (Tarteel AI)** | `raw/qul-ayah-indopak.json` (Script 89) | Indo-Pak Nastaleeq ayah-by-ayah (`arFull`) | Open Quran Resources / Attribution to Tarteel AI |
| **QUL (Tarteel AI)** | `raw/qul-wbw-script.json` (Script 56) | Uthmani word-by-word (Verification against Tanzil) | Open Quran Resources / Attribution to Tarteel AI |
| **QUL (Tarteel AI)** | `raw/qul-wbw-ur.json` (Trans 93) | Urdu word-by-word meanings | Open Quran Resources / Attribution to Tarteel AI |
| **QUL (Tarteel AI)** | `raw/qul-wbw-en.json` (Trans 92) | English word-by-word meanings | Open Quran Resources / Attribution to Tarteel AI |
| **QUL (Tarteel AI)** | `fonts/font.ttf` | Indo-Pak Nastaleeq font (PUA ligatures & markers) | Open Quran Resources / Attribution to Tarteel AI |
| **QuranEnc** | `urdu_junagarhi` | Full ayah Urdu translation (Maulana Junagarhi) | Free non-profit Islamic educational use, unaltered |
| **QuranEnc** | `english_saheeh` | Full ayah English translation (Saheeh Int.) | Free non-profit Islamic educational use, unaltered |

See `data/SOURCES.md` for complete legal citations and attribution text.

---

## Golden Data Rules
1. **Never type, guess, or auto-generate any Quran content:** Every character and meaning originates byte-for-byte from the authenticated source files.
2. **Never use machine translation or LLM generation:** All translations are from verified scholars and authenticated bodies.
3. **Never normalize or alter the shipped Arabic:** The shipped Arabic text is byte-for-byte identical to the source. Normalization is strictly limited to comparison/validation checks inside `build_data.py`.
4. **Zero-tolerance validation:** The build fails with no output if any consistency or count check fails.

---

## How to Re-Run the Build Pipeline

Requirements: Python 3 (standard library only; no pip dependencies required).

1. **Inspect raw files:**
   ```bash
   python scripts/inspect_raw.py
   ```
2. **Download QuranEnc translations (if updating/rebuilding):**
   ```bash
   python scripts/fetch_quranenc.py
   ```
3. **Execute the verified data build:**
   ```bash
   python scripts/build_data.py
   ```
   This validates all 6 checks:
   - 114 surahs and 6,236 ayahs matching Tanzil's official counts.
   - 100% complete Urdu and English full ayah translations.
   - Uthmani check: QUL 56 words joined match Tanzil ayah text byte-for-byte across all 6,236 ayahs (normalized for comparison only).
   - Alignment: QUL 59 (Indo-Pak) word keys exactly match QUL 56 word keys for all 6,236 ayahs.
   - Indo-Pak consistency: QUL 59 words joined match QUL 89 ayah text byte-for-byte across all 6,236 ayahs.
   - No ayah-number markers (like `١` or `۟\uf61e`) appear inside the word buttons array.
   - Missing Urdu word meanings (283 out of 77,432 words, ~99.6% complete) are mapped to `null` (never "undefined") and logged to `data/build_report.json`.

4. **Run automated test suite:**
   ```bash
   python -m unittest tests/test_build.py
   ```

---

## Kiosk Features
- **Surah List:** Touch grid of 114 surah cards with surah number badge, Arabic name in Indo-Pak Nastaleeq, English name, and ayah count.
- **On-Demand Loading:** Surahs are loaded individually via dynamic `<script>` tags on click and cached in memory. Works smoothly over `file://` protocol.
- **Word-by-Word Quran Reader:** Tap any word to view its isolated Arabic spelling, Urdu meaning, and English meaning.
- **Missing Meanings:** Handled gracefully — shows "—" in muted styling if a word meaning is null.
- **Contained Scrolling:** Words wrap and scroll inside the ayah box for long ayahs without scrolling the viewport on a 1280×800 kiosk screen.
- **Seamless Surah Transitions:** Next button at the last ayah of a surah seamlessly advances to ayah 1 of the next surah; Previous button moves to the last ayah of the previous surah.
- **Learn Namaz:** Step-by-step visual prayer guide with Urdu and English directions, plus Arabic recitation and Urdu translation (*Draft — scholar review pending*).
- **Kiosk Reset:** Returns to the Home screen after 90 seconds of inactivity. Context menu / long-press is disabled.
- **About & Sources Screen:** Accessible via a link on Home to display source attributions, licenses, and validation notes.
