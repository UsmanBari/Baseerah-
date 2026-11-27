#!/usr/bin/env python3
"""
tests/test_kiosk.py
Unittest suite for Baseerah Kiosk architecture:
  - Juz 1 to 30 data structure and boundaries
  - Featured ayahs consistency with built Quran data
  - Namaz modular JSON files and draft scholar notices
  - PWA manifest and service worker precaching
  - CSS tokens and touch target sizing
"""
import os
import json
import re
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
SURAHS_DIR = os.path.join(DATA_DIR, "surahs")

def load_surah(s_num):
    fn = f"{s_num:03d}.js"
    fp = os.path.join(SURAHS_DIR, fn)
    with open(fp, "r", encoding="utf-8") as f:
        content = f.read()
    match = re.search(r"window\.BASEERAH_SURAH\s*=\s*(.+?);\s*$", content, re.DOTALL)
    if not match:
        raise ValueError(f"Could not parse {fn}")
    return json.loads(match.group(1))

class TestBaseerahKiosk(unittest.TestCase):
    def test_juz_data(self):
        juz_path = os.path.join(DATA_DIR, "juz.js")
        self.assertTrue(os.path.exists(juz_path))
        with open(juz_path, "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(r"window\.BASEERAH_JUZ\s*=\s*(.+?);\s*$", content, re.DOTALL)
        self.assertIsNotNone(match)
        juz_list = json.loads(match.group(1))
        self.assertEqual(len(juz_list), 30)
        
        # Verify first and last juz
        self.assertEqual(juz_list[0]["number"], 1)
        self.assertIsNone(juz_list[0]["nameUr"]) # Sourced from Tanzil, Urdu names left null pending scholar input
        self.assertEqual(juz_list[0]["start"], {"surah": 1, "ayah": 1})
        self.assertEqual(juz_list[29]["number"], 30)
        self.assertIsNone(juz_list[29]["nameUr"])
        self.assertEqual(juz_list[29]["end"], {"surah": 114, "ayah": 6})

    def test_featured_ayahs_consistency(self):
        feat_path = os.path.join(DATA_DIR, "featured_ayahs.json")
        self.assertTrue(os.path.exists(feat_path))
        with open(feat_path, "r", encoding="utf-8") as f:
            featured = json.load(f)
        self.assertEqual(len(featured), 10)

        # Check each featured ayah matches the built surah data byte-for-byte
        for item in featured:
            s_data = load_surah(item["surah"])
            ayah_obj = next((a for a in s_data["ayahs"] if a["number"] == item["ayah"]), None)
            self.assertIsNotNone(ayah_obj, f"Featured ayah {item['surah']}:{item['ayah']} not in surah")
            self.assertEqual(item["ar"], ayah_obj["arFull"])
            self.assertEqual(item["ur"], ayah_obj["ur"])
            self.assertEqual(item["en"], ayah_obj["en"])

    def test_namaz_recitations(self):
        """Every Quran recitation must match the app's Quran data exactly; every dhikr must carry a reference."""
        import re
        fp = os.path.join(DATA_DIR, "namaz", "recitations.json")
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data.get("reviewed_by"), "pending-scholar-review")
        pua = re.compile(r"[\ue000-\uf8ff]")
        for key, item in data["items"].items():
            self.assertTrue(item.get("ar") and item.get("ur") and item.get("en"), key)
            if item["kind"] == "quran":
                self.assertEqual(item["provenance"], "quran-data")
                m = re.match(r"Quran (\d+):(\d+)(?:-(\d+))?", item["ref"])
                self.assertIsNotNone(m, key)
                s, a, b = int(m.group(1)), int(m.group(2)), int(m.group(3) or m.group(2))
                with open(os.path.join(DATA_DIR, "surahs", f"{s:03d}.js"), "r", encoding="utf-8") as sf:
                    surah = json.loads(re.sub(r"^window\.BASEERAH_SURAH\s*=\s*", "", sf.read()).rstrip().rstrip(";"))
                expected = " ".join(pua.sub("", x["arFull"]).strip() for x in surah["ayahs"] if a <= x["number"] <= b)
                self.assertEqual(item["ar"], expected, f"{key} Arabic must be copied from data/surahs")
            else:
                self.assertEqual(item["kind"], "dhikr")
                self.assertTrue(item.get("ref"), f"{key} needs a hadith/Quran reference")
        for step, keys in data["steps"].items():
            for k in keys:
                self.assertIn(k, data["items"], f"{step} -> {k}")

    def test_namaz_modular_files(self):
        namaz_dir = os.path.join(DATA_DIR, "namaz")
        self.assertTrue(os.path.exists(namaz_dir))
        for filename in ["wudu.json", "steps.json", "rakats.json", "duas.json"]:
            fp = os.path.join(namaz_dir, filename)
            self.assertTrue(os.path.exists(fp), f"{filename} missing")
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.assertEqual(data.get("status"), "draft")
            self.assertEqual(data.get("reviewed_by"), "pending-scholar-review")

            # Check provenance field on every item
            items = data.get("steps") or data.get("duas") or data.get("prayers") or []
            for item in items:
                prov = item.get("provenance")
                self.assertIn(prov, ["scholar-provided", "placeholder"], f"Invalid provenance in {filename}: {prov}")
                # Any non-null Arabic field must be scholar-provided
                ar_val = item.get("ar")
                if ar_val is not None and ar_val != "" and ar_val != "—":
                    self.assertEqual(
                        prov, "scholar-provided",
                        f"Non-null Arabic found without 'scholar-provided' provenance in {filename}: {ar_val}"
                    )
                if prov == "placeholder":
                    self.assertIn(ar_val, [None, "", "—"], f"Placeholder item in {filename} contains unverified Arabic: {ar_val}")

    def test_pwa_manifest_and_sw(self):
        manifest_path = os.path.join(BASE_DIR, "manifest.json")
        self.assertTrue(os.path.exists(manifest_path))
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        self.assertEqual(manifest["name"], "Baseerah — بصيرة")
        self.assertEqual(manifest["short_name"], "Baseerah")
        self.assertEqual(manifest["start_url"], "/")
        self.assertEqual(manifest["scope"], "/")
        self.assertEqual(manifest["display"], "standalone")
        self.assertEqual(manifest["theme_color"], "#0E5A47")
        self.assertEqual(manifest["background_color"], "#0E5A47")
        self.assertEqual(manifest["lang"], "ur")
        self.assertEqual(manifest["dir"], "rtl")

        # Verify icon files exist on disk
        for icon in manifest.get("icons", []):
            icon_path = os.path.join(BASE_DIR, icon["src"])
            self.assertTrue(os.path.exists(icon_path), f"Manifest icon missing: {icon['src']}")

        sw_path = os.path.join(BASE_DIR, "sw.js")
        self.assertTrue(os.path.exists(sw_path))
        with open(sw_path, "r", encoding="utf-8") as f:
            sw_content = f.read()
        self.assertIn("baseerah-v1.0.0", sw_content)
        self.assertIn("PRECACHE_ASSETS", sw_content)
        self.assertIn("icons/icon-192.png", sw_content)
        self.assertIn("icons/icon-512.png", sw_content)
        self.assertIn("icons/icon-512-maskable.png", sw_content)

    def test_css_tokens(self):
        tokens_path = os.path.join(BASE_DIR, "css", "tokens.css")
        self.assertTrue(os.path.exists(tokens_path))
        with open(tokens_path, "r", encoding="utf-8") as f:
            tokens = f.read()
        self.assertIn("--touch-target-min: 56px", tokens)
        self.assertIn("--arabic-word-size", tokens)
        self.assertIn("body.high-contrast", tokens)
        self.assertIn("body.scale-large", tokens)

    def test_es_modules_presence(self):
        core_files = ["router.js", "state.js", "i18n.js", "idle.js", "storage.js", "integrity.js", "audio.js"]
        for cf in core_files:
            fp = os.path.join(BASE_DIR, "js", "core", cf)
            self.assertTrue(os.path.exists(fp), f"Core module missing: {cf}")

        screen_files = ["home.js", "surah-list.js", "quran.js", "namaz.js", "about.js", "admin.js", "attract.js"]
        for sf in screen_files:
            fp = os.path.join(BASE_DIR, "js", "screens", sf)
            self.assertTrue(os.path.exists(fp), f"Screen module missing: {sf}")

if __name__ == "__main__":
    unittest.main()
