#!/usr/bin/env python3
"""
scripts/check_shaping_harfbuzz.py
Font-independent HarfBuzz shaping verification across all 6,236 Quran ayahs.
Shapes every ayah using uharfbuzz with:
1. Chosen Tajweed font (Amiri Quran: fonts/amiri-quran.ttf) against verified Uthmani text.
2. Indo-Pak font (QUL Nastaleeq: fonts/indopak-nastaleeq-qul.ttf) against verified Indo-Pak text.

Fails (exit 1) on:
- Any .notdef glyph (glyph ID 0)
- Any base Arabic letter mapped to an empty glyph (0 contours & 0 advance)
Reports exact shaped glyph counts.
"""

import sys
import os
import glob
import json
import re

try:
    import uharfbuzz as hb
except ImportError:
    print("FAIL: uharfbuzz is required. Install via `pip install uharfbuzz`.", file=sys.stderr)
    sys.exit(1)

from fontTools.ttLib import TTFont

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_all_ayahs():
    ayahs = []
    for s in range(1, 115):
        pad = f"{s:03d}"
        path = os.path.join(BASE_DIR, "data", "surahs", f"{pad}.js")
        if not os.path.exists(path):
            print(f"FAIL: Missing surah file {path}", file=sys.stderr)
            sys.exit(1)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        json_str = re.sub(r"^window\.BASEERAH_SURAH\s*=\s*", "", content).rstrip(";\n ")
        data = json.loads(json_str)
        for a in data["ayahs"]:
            raw_tajweed = a.get("arTajweed", a.get("arFull", ""))
            clean_tajweed = re.sub(r"<[^>]+>", "", raw_tajweed)
            ayahs.append({
                "surah": s,
                "ayah": a["number"],
                "arFull": a.get("arFull", ""),
                "arTajweed": clean_tajweed
            })
    return ayahs

def shape_and_verify(font_path, text_key, font_name, ayahs):
    if not os.path.exists(font_path):
        print(f"FAIL: Font file not found at {font_path}", file=sys.stderr)
        return False, 0, 0, 0

    with open(font_path, "rb") as f:
        font_data = f.read()

    face = hb.Face(font_data)
    font = hb.Font(face)
    tt = TTFont(font_path)
    glyf = tt.get("glyf") if "glyf" in tt else None

    # Base Arabic letters range (excluding combining marks / diacritics / pauses)
    # Range covers: 0x0621-0x064A, 0x066E-0x066F, 0x0671-0x06D3 (excluding 0x064B-0x065F, 0x0670, 0x06D6+)
    ARABIC_BASE_LETTERS = set(range(0x0621, 0x064B)) | set(range(0x066E, 0x0670)) | set(range(0x0671, 0x06D4))

    total_glyphs = 0
    notdef_count = 0
    empty_base_count = 0
    failures = []

    for item in ayahs:
        text = item[text_key]
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(font, buf)

        infos = buf.glyph_infos
        positions = buf.glyph_positions
        total_glyphs += len(infos)

        for info, pos in zip(infos, positions):
            if info.codepoint == 0:  # .notdef
                notdef_count += 1
                failures.append((item["surah"], item["ayah"], "NOTDEF", info.cluster))
            elif glyf and info.cluster < len(text):
                ch = text[info.cluster]
                if ord(ch) in ARABIC_BASE_LETTERS:
                    glyph_name = font.glyph_to_string(info.codepoint)
                    if glyph_name in glyf:
                        g = glyf[glyph_name]
                        if g.numberOfContours == 0 and pos.x_advance == 0:
                            empty_base_count += 1
                            failures.append((item["surah"], item["ayah"], f"EMPTY_BASE({ch})", glyph_name))

    print(f"Font: {font_name} ({os.path.basename(font_path)})")
    print(f"  Total ayahs shaped: {len(ayahs)}")
    print(f"  Total shaped glyphs: {total_glyphs}")
    print(f"  .notdef glyphs: {notdef_count}")
    print(f"  Empty base glyphs: {empty_base_count}")

    if notdef_count > 0 or empty_base_count > 0:
        print(f"  FAIL: Found shaping anomalies in {font_name}!", file=sys.stderr)
        for f in failures[:10]:
            print(f"    - Ayah {f[0]}:{f[1]} [{f[2]}] at cluster {f[3]}", file=sys.stderr)
        return False, total_glyphs, notdef_count, empty_base_count

    print(f"  PASS: 100% clean HarfBuzz shaping (0 .notdef, 0 empty base letters).\n")
    return True, total_glyphs, notdef_count, empty_base_count

def main():
    print("=== HarfBuzz Full-Quran Shaping Integrity Check ===")
    ayahs = load_all_ayahs()
    print(f"Loaded {len(ayahs)} ayahs across all 114 Surahs.\n")
    if len(ayahs) != 6236:
        print(f"FAIL: Expected 6,236 ayahs, got {len(ayahs)}", file=sys.stderr)
        sys.exit(1)

    # 1. Chosen Tajweed font
    tajweed_font = os.path.join(BASE_DIR, "fonts", "amiri-quran.ttf")
    ok1, tg1, nd1, eb1 = shape_and_verify(tajweed_font, "arTajweed", "Tajweed Uthmani (Amiri Quran)", ayahs)

    # 2. Indo-Pak font
    indopak_font = os.path.join(BASE_DIR, "fonts", "indopak-nastaleeq-qul.ttf")
    ok2, tg2, nd2, eb2 = shape_and_verify(indopak_font, "arFull", "Indo-Pak Nastaleeq (QUL)", ayahs)

    if not ok1 or not ok2:
        print("❌ FAILED: One or more fonts failed HarfBuzz shaping integrity!", file=sys.stderr)
        sys.exit(1)

    print("✅ SUCCESS: All 6,236 ayahs passed HarfBuzz shaping in both fonts!")
    print(f"   Amiri Quran: {tg1} glyphs | Indo-Pak: {tg2} glyphs\n")

if __name__ == "__main__":
    main()
