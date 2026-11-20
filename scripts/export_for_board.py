#!/usr/bin/env python3
"""
scripts/export_for_board.py
Generates a comprehensive, printable proofing document of the full Quran in Indo-Pak Nastaleeq
script with ayah numbers and Urdu translation, designed specifically for the Punjab Quran Board
and certified Huffaz review.

Outputs:
  - export/board_review_quran.html (print-optimized HTML with @page rules for A4 print-to-PDF)
  - export/board_review_quran.pdf (if Playwright or headless browser is available)
"""
import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
SURAHS_DIR = os.path.join(DATA_DIR, "surahs")
EXPORT_DIR = os.path.join(BASE_DIR, "export")

def load_json_from_js(filepath, var_name):
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read().strip()
    prefix = f"window.{var_name} ="
    if not text.startswith(prefix):
        raise ValueError(f"Unexpected format in {filepath}")
    raw_json = text[len(prefix):].rstrip(";").strip()
    return json.loads(raw_json)

def main():
    print("Generating Board Review Export for Punjab Quran Board Proofreading...")
    os.makedirs(EXPORT_DIR, exist_ok=True)

    index_path = os.path.join(DATA_DIR, "index.js")
    if not os.path.exists(index_path):
        sys.exit(f"FATAL: Missing {index_path}. Run build_data.py first.")

    index_data = load_json_from_js(index_path, "BASEERAH_INDEX")

    html_parts = []
    html_parts.append("""<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>القرآن الکریم — مسودہ برائے پنجاب قرآن بورڈ</title>
  <style>
    @font-face {
      font-family: "QUL-IndoPak";
      src: url("../fonts/indopak-nastaleeq-qul.ttf") format("truetype");
    }
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 20mm 15mm;
      @bottom-center {
        content: counter(page);
        font-family: sans-serif;
        font-size: 10pt;
      }
    }
    body {
      font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif;
      background: #FFFFFF;
      color: #111111;
      margin: 0;
      padding: 20px;
      line-height: 2.2;
    }
    .cover {
      text-align: center;
      padding: 60px 20px;
      page-break-after: always;
      border: 3px double #0E5A47;
      margin-bottom: 40px;
    }
    .cover-title {
      font-family: "QUL-IndoPak", serif;
      font-size: 42pt;
      color: #0E5A47;
      margin-bottom: 20px;
    }
    .cover-sub {
      font-size: 18pt;
      color: #333333;
      margin-bottom: 15px;
    }
    .cover-meta {
      font-size: 13pt;
      color: #555555;
      margin-top: 30px;
      line-height: 1.9;
    }
    .surah-header {
      background: #F4EFE6;
      border: 2px solid #0E5A47;
      border-radius: 8px;
      padding: 12px 20px;
      text-align: center;
      margin: 30px 0 15px;
      page-break-inside: avoid;
    }
    .surah-name-ar {
      font-family: "QUL-IndoPak", serif;
      font-size: 28pt;
      color: #0E5A47;
      display: block;
    }
    .surah-details {
      font-size: 12pt;
      color: #444444;
    }
    .bismillah-block {
      text-align: center;
      font-family: "QUL-IndoPak", serif;
      font-size: 26pt;
      color: #0E5A47;
      margin: 15px 0 25px;
      page-break-inside: avoid;
    }
    .ayah-entry {
      border-bottom: 1px solid #E5E0D8;
      padding: 14px 0;
      page-break-inside: avoid;
    }
    .ayah-ar {
      font-family: "QUL-IndoPak", serif;
      font-size: 22pt;
      line-height: 2.4;
      color: #000000;
      text-align: right;
      margin-bottom: 8px;
    }
    .ayah-ur {
      font-family: "Noto Nastaliq Urdu", serif;
      font-size: 13pt;
      line-height: 2.0;
      color: #2E3D37;
      text-align: right;
    }
    .ayah-num {
      display: inline-block;
      font-size: 10pt;
      font-family: sans-serif;
      background: #EFEBE0;
      color: #0E5A47;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 8px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

<div class="cover">
  <div class="cover-title">القرآن الکریم</div>
  <div class="cover-sub">مسودہ برائے تصدیق و نظر ثانی پنجاب قرآن بورڈ</div>
  <div class="cover-meta">
    <strong>منصوبہ:</strong> بصیرہ (Baseerah Kiosk) — ایکمی ون (Acme One)<br>
    <strong>رسم الخط:</strong> انڈو پاک نستعلیق (Indo-Pak Nastaleeq Script 89)<br>
    <strong>ترجمہ:</strong> مولانا محمد جوناگڑھی (King Fahd Glorious Quran Printing Complex / QuranEnc)<br>
    <strong>تاریخ طباعت و پیشکش:</strong> نومبر ۲۰۲۶ء<br>
    <em>پنجاب قرآن (پرنٹنگ اینڈ ریکارڈنگ) ایکٹ ۲۰۱۱ء کے تحت برائے پڑتال</em>
  </div>
</div>
""")

    for s_info in index_data:
        s_num = s_info["number"]
        surah_file = os.path.join(SURAHS_DIR, f"{s_num:03d}.js")
        surah_data = load_json_from_js(surah_file, "BASEERAH_SURAH")

        html_parts.append(f"""
<div class="surah-header">
  <span class="surah-name-ar">سُورَۃُ {surah_data['nameAr']}</span>
  <span class="surah-details">سورت نمبر: {s_num} | آیات: {len(surah_data['ayahs'])} | {s_info['nameEn']}</span>
</div>
""")

        if s_num != 1 and s_num != 9:
            html_parts.append('<div class="bismillah-block">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ</div>')

        for ayah in surah_data["ayahs"]:
            a_num = ayah["number"]
            ar_text = ayah["arFull"]
            ur_text = ayah["ur"]
            html_parts.append(f"""
<div class="ayah-entry">
  <div class="ayah-ar"><span class="ayah-num">{s_num}:{a_num}</span> {ar_text}</div>
  <div class="ayah-ur">{ur_text}</div>
</div>
""")

    html_parts.append("""
</body>
</html>
""")

    out_html = os.path.join(EXPORT_DIR, "board_review_quran.html")
    with open(out_html, "w", encoding="utf-8") as f:
        f.write("".join(html_parts))

    print(f"✓ Created complete Board Review Export at: {out_html}")
    print("  Document is ready for print-to-PDF or physical submission to the Punjab Quran Board.")

if __name__ == "__main__":
    main()
