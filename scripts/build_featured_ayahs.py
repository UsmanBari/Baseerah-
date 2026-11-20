#!/usr/bin/env python3
"""
scripts/build_featured_ayahs.py
Extracts curated featured ayahs byte-for-byte from built surah files for the Attract screen.
"""
import os
import json
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
SURAHS_DIR = os.path.join(DATA_DIR, "surahs")

FEATURED_COORDINATES = [
    {"surah": 1, "ayah": 1, "themeEn": "The Opening", "themeUr": "فاتحۃ الکتاب"},
    {"surah": 2, "ayah": 255, "themeEn": "Ayat al-Kursi", "themeUr": "آیت الکرسی"},
    {"surah": 2, "ayah": 286, "themeEn": "Allah does not burden a soul beyond capacity", "themeUr": "اللہ کسی جان پر بوجھ نہیں ڈالتا"},
    {"surah": 3, "ayah": 139, "themeEn": "Do not lose heart nor fall into despair", "themeUr": "نہ ہمت ہارو اور نہ غمگین ہو"},
    {"surah": 13, "ayah": 28, "themeEn": "In the remembrance of Allah hearts find rest", "themeUr": "اللہ کی یاد سے دلوں کو اطمینان ملتا ہے"},
    {"surah": 24, "ayah": 35, "themeEn": "Allah is the Light of the heavens and the earth", "themeUr": "اللہ آسمانوں اور زمین کا نور ہے"},
    {"surah": 55, "ayah": 13, "themeEn": "Which of the favors of your Lord will you deny?", "themeUr": "تم اپنے رب کی کن کن نعمتوں کو جھٹلاؤ گے؟"},
    {"surah": 65, "ayah": 3, "themeEn": "Whoever relies upon Allah, He is sufficient", "themeUr": "جو اللہ پر بھروسہ کرے وہ اس کے لیے کافی ہے"},
    {"surah": 94, "ayah": 5, "themeEn": "Indeed, with hardship comes ease", "themeUr": "بے شک تنگی کے ساتھ آسانی ہے"},
    {"surah": 112, "ayah": 1, "themeEn": "Say, He is Allah, [who is] One", "themeUr": "کہہ دیجیے کہ وہ اللہ ایک ہے"}
]

def load_surah(s_num):
    fn = f"{s_num:03d}.js"
    fp = os.path.join(SURAHS_DIR, fn)
    with open(fp, "r", encoding="utf-8") as f:
        content = f.read()
    match = re.search(r"window\.BASEERAH_SURAH\s*=\s*(.+?);\s*$", content, re.DOTALL)
    if not match:
        raise ValueError(f"Could not parse {fn}")
    return json.loads(match.group(1))

def main():
    featured = []
    for item in FEATURED_COORDINATES:
        s_data = load_surah(item["surah"])
        ayah_obj = next((a for a in s_data["ayahs"] if a["number"] == item["ayah"]), None)
        if not ayah_obj:
            raise ValueError(f"Ayah {item['surah']}:{item['ayah']} not found")
        featured.append({
            "surah": item["surah"],
            "ayah": item["ayah"],
            "surahNameAr": s_data["nameAr"],
            "surahNameEn": s_data["nameEn"],
            "themeEn": item["themeEn"],
            "themeUr": item["themeUr"],
            "ar": ayah_obj["arFull"],
            "ur": ayah_obj["ur"],
            "en": ayah_obj["en"]
        })
    
    out_path = os.path.join(DATA_DIR, "featured_ayahs.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(featured, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(featured)} featured ayahs to {out_path}")

if __name__ == "__main__":
    main()
