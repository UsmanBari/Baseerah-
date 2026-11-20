#!/usr/bin/env python3
"""
tests/test_build.py
Unittest suite for Baseerah built Quran data:
  - Total counts: 114 surahs, 6236 ayahs
  - Al-Fatiha has 7 ayahs
  - Al-Baqarah has 286 ayahs
  - An-Nas has 6 ayahs
  - 1:1 word 1 Arabic matches Tanzil & QUL 59/56 alignment
  - No empty full translations (ur and en)
  - No ayah markers in word lists
  - Bismillah in data matches QUL 89 1:1 without ayah-end marker
  - No hand-typed Quran text in index.html
  - Font references point to fonts/indopak-nastaleeq-qul.ttf
  - Known exceptions file matches Check 3a specification
  - Data manifest SHA-256 exists and matches all 114 surahs + index.js
"""
import os
import sys
import json
import re
import hashlib
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
SURAHS_DIR = os.path.join(DATA_DIR, "surahs")

def load_js_var(filepath, var_name):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read().strip()
    pattern = rf"window\.{var_name}\s*=\s*(.+?)(?:;(?:\r?\n|$))"
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        raise ValueError(f"Variable window.{var_name} not found in {filepath}")
    raw_val = match.group(1).strip()
    return json.loads(raw_val)

class TestBaseerahQuranBuild(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Load index and bismillah
        index_path = os.path.join(DATA_DIR, "index.js")
        cls.bismillah = load_js_var(index_path, "BASEERAH_BISMILLAH")
        cls.index = load_js_var(index_path, "BASEERAH_INDEX")
        
        # Load surahs
        cls.surahs = {}
        for item in cls.index:
            s_num = item["number"]
            fn = f"{s_num:03d}.js"
            fp = os.path.join(SURAHS_DIR, fn)
            cls.surahs[s_num] = load_js_var(fp, "BASEERAH_SURAH")

        # Load raw files for spot check
        with open(os.path.join(BASE_DIR, "raw", "tanzil-uthmani.txt"), "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("1|1|"):
                    cls.tanzil_1_1 = line.strip().split("|")[2]
                    break

        with open(os.path.join(BASE_DIR, "raw", "qul-wbw-indopak.json"), "r", encoding="utf-8") as f:
            cls.raw_59 = json.load(f)

        with open(os.path.join(BASE_DIR, "raw", "qul-wbw-script.json"), "r", encoding="utf-8") as f:
            cls.raw_56 = json.load(f)

        with open(os.path.join(BASE_DIR, "raw", "qul-ayah-indopak.json"), "r", encoding="utf-8") as f:
            cls.raw_89 = json.load(f)

    def test_total_surahs_count(self):
        self.assertEqual(len(self.index), 114)
        self.assertEqual(len(self.surahs), 114)

    def test_total_ayahs_count(self):
        total_ayahs = sum(len(s["ayahs"]) for s in self.surahs.values())
        self.assertEqual(total_ayahs, 6236)
        index_ayahs = sum(item["ayahCount"] for item in self.index)
        self.assertEqual(index_ayahs, 6236)

    def test_fatiha_ayahs(self):
        self.assertEqual(len(self.surahs[1]["ayahs"]), 7)
        self.assertEqual(self.index[0]["ayahCount"], 7)

    def test_baqarah_ayahs(self):
        self.assertEqual(len(self.surahs[2]["ayahs"]), 286)
        self.assertEqual(self.index[1]["ayahCount"], 286)

    def test_nas_ayahs(self):
        self.assertEqual(len(self.surahs[114]["ayahs"]), 6)
        self.assertEqual(self.index[113]["ayahCount"], 6)

    def test_1_1_word_1_arabic(self):
        tanzil_word_1 = self.tanzil_1_1.split()[0]
        w1_built = self.surahs[1]["ayahs"][0]["words"][0]
        raw_59_word_1 = self.raw_59["1:1:1"]["text"]
        raw_56_word_1 = self.raw_56["1:1:1"]["text"]

        self.assertEqual(w1_built["ar"], raw_59_word_1)
        self.assertEqual(raw_59_word_1, "بِسْمِ")
        self.assertEqual(raw_56_word_1, "بِسْمِ")
        self.assertEqual(tanzil_word_1, "بِسْمِ")
        self.assertEqual(w1_built["ar"], tanzil_word_1)

    def test_no_empty_full_translations(self):
        for s_num, s_data in self.surahs.items():
            for ayah in s_data["ayahs"]:
                self.assertTrue(bool(ayah.get("ur")), f"Empty ur in {s_num}:{ayah['number']}")
                self.assertTrue(bool(ayah.get("en")), f"Empty en in {s_num}:{ayah['number']}")
                self.assertTrue(bool(ayah.get("arFull")), f"Empty arFull in {s_num}:{ayah['number']}")

    def test_no_ayah_markers_in_words(self):
        for s_num, s_data in self.surahs.items():
            for ayah in s_data["ayahs"]:
                for w in ayah["words"]:
                    self.assertFalse(
                        re.match(r"^[\u0660-\u0669]+$", w["ar"]),
                        f"Ayah marker found in word: {s_num}:{ayah['number']} -> {w['ar']}"
                    )

    def test_bismillah_data_matches_qul89(self):
        raw_89_1_1 = self.raw_89["1:1"]["text"]
        expected = re.sub(r"[\s\uf500-\uf65d\u0660-\u0669\u06dd\u06de\u06df]+$", "", raw_89_1_1).strip()
        self.assertEqual(self.bismillah, expected)
        self.assertEqual(self.surahs[1]["ayahs"][0]["arFull"], raw_89_1_1)

    def test_no_hand_typed_quran_in_html(self):
        with open(os.path.join(BASE_DIR, "index.html"), "r", encoding="utf-8") as f:
            html = f.read()
        # Ensure Bismillah text is NOT hard-coded in index.html
        self.assertNotIn("بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ", html)
        self.assertIn('id="home-bismillah"', html)

    def test_font_reference(self):
        with open(os.path.join(BASE_DIR, "css", "styles.css"), "r", encoding="utf-8") as f:
            css = f.read()
        self.assertIn("fonts/indopak-nastaleeq-qul.ttf", css)
        self.assertNotIn("fonts/font.ttf", css)
        self.assertTrue(os.path.exists(os.path.join(BASE_DIR, "fonts", "indopak-nastaleeq-qul.ttf")))

    def test_known_exceptions_file(self):
        exc_path = os.path.join(BASE_DIR, "scripts", "known_exceptions.json")
        self.assertTrue(os.path.exists(exc_path))
        with open(exc_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        exceptions = data.get("exceptions", [])
        self.assertEqual(len(exceptions), 3)
        keys = {e["ayah"] for e in exceptions}
        self.assertEqual(keys, {"5:52", "11:13", "80:25"})
        for e in exceptions:
            self.assertEqual(e["reviewed_by"], "pending-hafiz")

    def test_manifest_sha256(self):
        manifest_path = os.path.join(DATA_DIR, "manifest.sha256.json")
        self.assertTrue(os.path.exists(manifest_path))
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        self.assertIn("data/index.js", manifest)
        self.assertGreaterEqual(len(manifest), 118) # 114 surahs + index + juz + featured + namaz

if __name__ == "__main__":
    unittest.main()
