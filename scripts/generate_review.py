#!/usr/bin/env python3
"""
scripts/generate_review.py
Generates review.html for Hafiz / scholar visual verification against printed Indo-Pak mushafs.
Includes requested spot-check ayahs:
  - 1:1–7 (Al-Fatihah)
  - 2:255 (Ayat al-Kursi)
  - 36:1–12 (Ya-Sin)
  - 112:1–4 (Al-Ikhlas)
  - 114:1–6 (An-Nas)
  - 5:52, 11:13, 80:25 (Named verification exceptions with red 'Hafiz check required' label)
"""
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
SURAHS_DIR = os.path.join(DATA_DIR, "surahs")

def load_surah(s_num):
    fp = os.path.join(SURAHS_DIR, f"{s_num:03d}.js")
    with open(fp, "r", encoding="utf-8") as f:
        text = f.read().strip()
    prefix = "window.BASEERAH_SURAH ="
    raw = text[len(prefix):].rstrip(";").strip()
    return json.loads(raw)

def main():
    print("Generating review.html from verified built data...")
    surahs_cache = {}

    def get_ayah(s, a):
        if s not in surahs_cache:
            surahs_cache[s] = load_surah(s)
        return next(item for item in surahs_cache[s]["ayahs"] if item["number"] == a)

    review_groups = [
        {"title": "Surah Al-Fatihah (1:1–7)", "is_exception": False, "refs": [(1, a) for a in range(1, 8)]},
        {"title": "Ayat al-Kursi (2:255)", "is_exception": False, "refs": [(2, 255)]},
        {"title": "Surah Ya-Sin (36:1–12)", "is_exception": False, "refs": [(36, a) for a in range(1, 13)]},
        {"title": "Surah Al-Ikhlas (112:1–4)", "is_exception": False, "refs": [(112, a) for a in range(1, 5)]},
        {"title": "Surah An-Nas (114:1–6)", "is_exception": False, "refs": [(114, a) for a in range(1, 7)]},
        {
            "title": "Verification Exception: Surah Al-Ma'idah (5:52)",
            "is_exception": True,
            "note": "QUL 56 Uthmani reference has an internal space in word 12 ('دَآئِرَ ةٌۭ'). In shipped Indo-Pak QUL 59, word 12 is 'دَآىِٕرَةٌ ؕ' where letters are joined correctly and space is only before the waqf sign.",
            "refs": [(5, 52)]
        },
        {
            "title": "Verification Exception: Surah Hud (11:13)",
            "is_exception": True,
            "note": "Tanzil uses Alef Wasla & Dagger Alef ('ٱفْتَرَىٰهُ'), QUL 56 uses plain Alef ('افْتَرَاهُ'). Shipped Indo-Pak uses authentic South Asian Nastaleeq rasm ('افْتَرَاهُ ؕ').",
            "refs": [(11, 13)]
        },
        {
            "title": "Verification Exception: Surah 'Abasa (80:25)",
            "is_exception": True,
            "note": "Tanzil uses Alef with Hamza Above ('أَنَّا'), QUL 56 uses bare Alef with Fatha ('اَنَّا'). Shipped Indo-Pak uses 'اَنَّا'.",
            "refs": [(80, 25)]
        }
    ]

    html = []
    html.append("""<!DOCTYPE html>
<html lang="ur">
<head>
  <meta charset="utf-8">
  <title>Baseerah — Hafiz & Scholar Quran Review (پڑتال و تصدیق)</title>
  <style>
    @font-face {
      font-family: "QUL-IndoPak";
      src: url("fonts/indopak-nastaleeq-qul.ttf") format("truetype");
      font-display: block;
    }
    :root {
      --bg: #F7F4EC;
      --surface: #FFFFFF;
      --line: #E2DACA;
      --ink: #1D2B26;
      --accent: #0E5A47;
      --gold: #E9C77B;
      --danger: #B3261E;
      --danger-bg: #F9DEDC;
    }
    body {
      background: var(--bg);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 30px;
      line-height: 1.6;
    }
    .header {
      background: var(--surface);
      border: 2px solid var(--line);
      border-radius: 16px;
      padding: 24px 32px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 8px;
      color: var(--accent);
      font-size: 28px;
    }
    .header p {
      margin: 4px 0;
      color: #555;
    }
    .group-block {
      background: var(--surface);
      border: 2px solid var(--line);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 28px;
    }
    .group-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--accent);
      border-bottom: 2px solid var(--line);
      padding-bottom: 10px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-danger {
      background: var(--danger);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .exception-note {
      background: var(--danger-bg);
      border-left: 4px solid var(--danger);
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #410E0B;
    }
    .ayah-card {
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .ayah-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 15px;
      font-weight: 600;
      color: var(--accent);
    }
    .ayah-ar-full {
      font-family: "QUL-IndoPak", serif;
      font-size: 34px;
      line-height: 2.2;
      color: #000000;
      direction: rtl;
      text-align: right;
      padding: 12px 18px;
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .wbw-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      background: #FFFFFF;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--line);
    }
    .wbw-table th, .wbw-table td {
      border: 1px solid var(--line);
      padding: 10px 14px;
      text-align: center;
    }
    .wbw-table th {
      background: #EFEBE0;
      color: var(--accent);
      font-size: 14px;
    }
    .wbw-ar {
      font-family: "QUL-IndoPak", serif;
      font-size: 28px;
      direction: rtl;
      color: #000000;
    }
    .wbw-ur {
      font-family: "Noto Nastaliq Urdu", serif;
      font-size: 17px;
      direction: rtl;
      color: #2E3D37;
      line-height: 1.8;
    }
    .wbw-en {
      font-size: 15px;
      color: #333333;
    }
    .translation-pane {
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px 18px;
    }
    .trans-ur {
      font-family: "Noto Nastaliq Urdu", serif;
      font-size: 18px;
      direction: rtl;
      text-align: right;
      line-height: 2.0;
      color: var(--ink);
      margin-bottom: 8px;
    }
    .trans-en {
      font-size: 15px;
      color: #444;
      line-height: 1.5;
    }
    .trans-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      margin-bottom: 4px;
      display: block;
    }
  </style>
</head>
<body>

<div class="header">
  <h1>Baseerah (بصيرة) — Hafiz &amp; Scholar Proofreading Suite</h1>
  <p><strong>Rasm &amp; Font:</strong> Indo-Pak Nastaleeq Script 89 (Ayah) &amp; Script 59 (WBW) rendered via <code>fonts/indopak-nastaleeq-qul.ttf</code>.</p>
  <p><strong>Translations:</strong> Maulana Muhammad Junagarhi (Urdu) &amp; Saheeh International (English) via QuranEnc.</p>
  <p><em>Purpose: For visual cross-examination against printed Pakistani 16-line / 15-line Tajweed Mushafs.</em></p>
</div>
""")

    for grp in review_groups:
        html.append('<div class="group-block">')
        badge = '<span class="badge-danger">Hafiz Check Required</span>' if grp["is_exception"] else ''
        html.append(f'<div class="group-title">{grp["title"]} {badge}</div>')
        if grp.get("note"):
            html.append(f'<div class="exception-note"><strong>Note:</strong> {grp["note"]}</div>')

        for (s, a) in grp["refs"]:
            ayah = get_ayah(s, a)
            html.append(f'<div class="ayah-card">')
            html.append(f'<div class="ayah-header"><span>Surah {s}, Ayah {a}</span><span>{len(ayah["words"])} Words</span></div>')
            html.append(f'<div class="ayah-ar-full">{ayah["arFull"]}</div>')

            # WBW Table
            html.append('<table class="wbw-table">')
            html.append('<thead><tr><th>#</th><th>Arabic (Indo-Pak QUL 59)</th><th>Urdu Meaning (QUL 93)</th><th>English Meaning (QUL 92)</th></tr></thead><tbody>')
            for i, w in enumerate(ayah["words"], 1):
                ur_val = w["ur"] if w["ur"] is not None else '<span style="color:#888;">—</span>'
                en_val = w["en"] if w["en"] is not None else '<span style="color:#888;">—</span>'
                html.append(f'<tr><td>{i}</td><td class="wbw-ar">{w["ar"]}</td><td class="wbw-ur">{ur_val}</td><td class="wbw-en">{en_val}</td></tr>')
            html.append('</tbody></table>')

            # Full translations
            html.append('<div class="translation-pane">')
            html.append('<span class="trans-label">Urdu Full Translation (Maulana Junagarhi):</span>')
            html.append(f'<div class="trans-ur">{ayah["ur"]}</div>')
            html.append('<span class="trans-label">English Full Translation (Saheeh International):</span>')
            html.append(f'<div class="trans-en">{ayah["en"]}</div>')
            html.append('</div>')

            html.append('</div>')

        html.append('</div>')

    html.append("""
</body>
</html>
""")

    out_file = os.path.join(BASE_DIR, "review.html")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(html))

    print(f"✓ Generated review.html successfully at: {out_file}")

if __name__ == "__main__":
    main()
