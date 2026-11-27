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

        # Raw source files (raw/) are build inputs and are not committed to the
        # repo. When they are absent (e.g. on CI), the raw spot checks are skipped;
        # every check on the shipped data still runs.
        raw_dir = os.path.join(BASE_DIR, "raw")
        needed = ["tanzil-uthmani.txt", "qul-wbw-indopak.json", "qul-wbw-script.json", "qul-ayah-indopak.json"]
        cls.has_raw = all(os.path.exists(os.path.join(raw_dir, n)) for n in needed)
        if not cls.has_raw:
            return
        with open(os.path.join(raw_dir, "tanzil-uthmani.txt"), "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("1|1|"):
                    cls.tanzil_1_1 = line.strip().split("|")[2]
                    break
        with open(os.path.join(raw_dir, "qul-wbw-indopak.json"), "r", encoding="utf-8") as f:
            cls.raw_59 = json.load(f)
        with open(os.path.join(raw_dir, "qul-wbw-script.json"), "r", encoding="utf-8") as f:
            cls.raw_56 = json.load(f)
        with open(os.path.join(raw_dir, "qul-ayah-indopak.json"), "r", encoding="utf-8") as f:
            cls.raw_89 = json.load(f)

    def require_raw(self):
        if not self.has_raw:
            self.skipTest("raw/ source files not present (build inputs, not committed)")

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
        self.require_raw()
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
        self.require_raw()
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

        # Verify every manifest hash matches the file bytes with CRLF normalized to LF
        for rel_path, expected_hash in manifest.items():
            full_path = os.path.join(BASE_DIR, rel_path)
            self.assertTrue(os.path.exists(full_path), f"Manifest file missing on disk: {rel_path}")
            with open(full_path, "rb") as f:
                content = f.read().replace(b"\r\n", b"\n")
                actual_hash = hashlib.sha256(content).hexdigest()
            self.assertEqual(actual_hash, expected_hash, f"Hash mismatch on {rel_path}: expected {expected_hash}, got {actual_hash}")

    def test_strict_tanzil_base_letters_and_harakat(self):
        """
        Phase 2 Audit: Verify that 2017 Base Uthmani text and verified Tanzil v1.1
        have exactly ZERO letter or harakat differences across all 6,236 ayahs
        using ONLY the exact codepoint sequences defined for Categories 1-5 (no broad stripping).
        Fails the build if any new category or differing sequence appears.
        """
        self.require_raw()
        tanzil_path = os.path.join(BASE_DIR, "raw", "tanzil-uthmani.txt")
        base_path = os.path.join(BASE_DIR, "raw", "quran-tajweed-base.txt")
        
        self.assertTrue(os.path.exists(tanzil_path))
        self.assertTrue(os.path.exists(base_path))

        # Exact 10 pause / sajdah / rub-el-hizb marks in Uthmani text
        EXACT_PAUSE_MARKS = set('\u06D6\u06D7\u06D8\u06D9\u06DA\u06DB\u06DC\u06DD\u06DE\u06E9')

        def strict_cat_transform(text, is_tanzil=False):
            # Cat 1: Exact small low meem (\u06ED) and small high meem (\u06E2)
            text = text.replace('\u06ED', '').replace('\u06E2', '')
            # Cat 2: Exact sequence tatweel + hamza above (\u0640\u0654) -> standalone hamza (\u0621)
            text = text.replace('\u0640\u0654', '\u0621')
            # Cat 3: Exact small high yeh (\u06E7) -> small yeh (\u06E6)
            text = text.replace('\u06E7', '\u06E6')
            # Strip tatweel (\u0640) and exact pause marks only (no broad character-class stripping)
            chars = [c for c in text if c != '\u0640' and c not in EXACT_PAUSE_MARKS]
            res = ''.join(chars)
            # Collapse multiple consecutive spaces (created by stripped pause marks) to single space
            return re.sub(r' +', ' ', res).strip()

        t_dict = {}
        with open(tanzil_path, 'r', encoding='utf-8') as f:
            for l in f:
                if '|' in l and not l.startswith('#'):
                    p = l.strip().split('|')
                    t_dict[(int(p[0]), int(p[1]))] = p[2]

        b_dict = {}
        with open(base_path, 'r', encoding='utf-8') as f:
            for l in f:
                if '|' in l and not l.startswith('#'):
                    p = l.strip().split('|')
                    b_dict[(int(p[0]), int(p[1]))] = p[2]

        self.assertEqual(len(t_dict), 6236)
        self.assertEqual(len(b_dict), 6236)

        unmapped_diffs = []
        for k in sorted(t_dict.keys()):
            tn = strict_cat_transform(t_dict[k], is_tanzil=True)
            bn = strict_cat_transform(b_dict[k], is_tanzil=False)
            if tn != bn:
                # Cat 4: Exact 3 compound word spacing ayahs: 2:181, 8:6, 13:37
                if k in [(2, 181), (8, 6), (13, 37)] and tn.replace(' ', '') == bn.replace(' ', ''):
                    continue
                # Cat 5: Exact 2 Surah Yusuf ayahs: 12:39 and 12:41
                if k in [(12, 39), (12, 41)] and tn == bn.replace('صَىٰ', 'صَٰ'):
                    continue
                # Any other difference indicates an unmapped category or letter difference!
                unmapped_diffs.append((k, tn, bn))

        self.assertEqual(
            len(unmapped_diffs), 0,
            f"Build Failed: New category or letter/harakat difference detected between Tanzil v1.1 and 2017 Base in {len(unmapped_diffs)} ayahs: {unmapped_diffs[:5]}"
        )

    def test_index_html_no_eager_large_files(self):
        """Task 2: Assert index.html does not eagerly load any static resource > 300 KB."""
        index_html_path = os.path.join(BASE_DIR, "index.html")
        with open(index_html_path, "r", encoding="utf-8") as f:
            html = f.read()

        script_srcs = re.findall(r'<script\s+[^>]*src=["\']([^"\']+)["\']', html)
        preload_hrefs = re.findall(r'<link\s+[^>]*rel=["\']preload["\'][^>]*href=["\']([^"\']+)["\']', html)
        preload_hrefs += re.findall(r'<link\s+[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']preload["\']', html)
        css_hrefs = re.findall(r'<link\s+[^>]*rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)["\']', html)
        css_hrefs += re.findall(r'<link\s+[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']stylesheet["\']', html)

        all_eager = set(script_srcs + preload_hrefs + css_hrefs)
        max_bytes = 300 * 1024

        oversized = []
        for rel in all_eager:
            if rel.startswith("http://") or rel.startswith("https://"):
                continue
            clean_rel = rel.split("?")[0].lstrip("./")
            # Fonts are covered by font preload rule (only 1 font needed for first screen)
            if clean_rel.endswith((".ttf", ".woff", ".woff2", ".eot", ".otf")):
                continue
            fp = os.path.join(BASE_DIR, clean_rel)
            if os.path.exists(fp):
                sz = os.path.getsize(fp)
                if sz > max_bytes:
                    oversized.append((clean_rel, f"{sz / 1024:.1f} KB"))

        self.assertEqual(
            len(oversized), 0,
            f"Performance Regression: index.html eagerly loads files > 300 KB: {oversized}"
        )

if __name__ == "__main__":
    unittest.main()
