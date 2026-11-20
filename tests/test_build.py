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
"""
import os
import sys
import json
import re
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
SURAHS_DIR = os.path.join(DATA_DIR, "surahs")

def load_js_object(filepath, var_name):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read().strip()
    prefix = f"window.{var_name} ="
    if not content.startswith(prefix):
        raise ValueError(f"File {filepath} does not start with '{prefix}'")
    json_str = content[len(prefix):].rstrip(";").strip()
    return json.loads(json_str)

class TestBaseerahQuranBuild(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Load index
        index_path = os.path.join(DATA_DIR, "index.js")
        cls.index = load_js_object(index_path, "BASEERAH_INDEX")
        
        # Load surahs
        cls.surahs = {}
        for item in cls.index:
            s_num = item["number"]
            fn = f"{s_num:03d}.js"
            fp = os.path.join(SURAHS_DIR, fn)
            cls.surahs[s_num] = load_js_object(fp, "BASEERAH_SURAH")

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
        # 1:1 word 1 in Tanzil
        tanzil_word_1 = self.tanzil_1_1.split()[0]
        # In built data
        w1_built = self.surahs[1]["ayahs"][0]["words"][0]
        
        # Word 1 in 59 raw file
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
                    # No word should be Arabic-Indic digits
                    self.assertFalse(
                        re.match(r"^[\u0660-\u0669]+$", w["ar"]),
                        f"Ayah marker found in word: {s_num}:{ayah['number']} -> {w['ar']}"
                    )

if __name__ == "__main__":
    unittest.main()
