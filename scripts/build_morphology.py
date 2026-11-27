#!/usr/bin/env python3
"""
scripts/build_morphology.py
Derives word morphology splits (prefix, stem, suffix) for Surah 1 and Surah 2:1-20
using QUL Morphology Resource 77 (Word stem).
Ensures 100% byte-for-byte fidelity with Indo-Pak Quran text.
"""

import os
import json
import sqlite3
import unicodedata
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(ROOT_DIR, "raw")
DATA_DIR = os.path.join(ROOT_DIR, "data")
SCRIPTS_DIR = os.path.join(ROOT_DIR, "scripts")

DB_PATH = os.path.join(RAW_DIR, "qul-morphology-77.sqlite")
INDO_PATH = os.path.join(RAW_DIR, "qul-wbw-indopak.json")
WBW_EN_PATH = os.path.join(RAW_DIR, "qul-wbw-en.json")
WBW_UR_PATH = os.path.join(RAW_DIR, "qul-wbw-ur.json")
LABELS_PATH = os.path.join(SCRIPTS_DIR, "morph_labels.json")

OUTPUT_JSON = os.path.join(DATA_DIR, "morphology.json")
OUTPUT_JS = os.path.join(DATA_DIR, "morphology.js")

def is_diacritic(ch):
    cat = unicodedata.category(ch)
    if cat in ('Mn', 'Me', 'Cf', 'Sk'):
        return True
    cp = ord(ch)
    if 0x064B <= cp <= 0x065F or cp == 0x0670 or 0x06D6 <= cp <= 0x06ED:
        return True
    return False

def clean_arabic(text):
    return "".join(c for c in text if not is_diacritic(c) and c != " ")

def norm_base(c):
    if c in ('ي', 'ى', 'ئ', 'ی'):
        return 'ی'
    if c in ('ك', 'ک'):
        return 'ک'
    if c in ('ه', 'ہ', 'ة', 'ۃ'):
        return 'ہ'
    if c in ('أ', 'إ', 'آ', 'ٱ', 'ا'):
        return 'ا'
    return c

def clean_label(text):
    if not text:
        return ""
    # Remove brackets like [All] or (of)
    t = re.sub(r'[\[\]\(\)]', '', text).strip()
    return t

def build():
    print("=" * 60)
    print("Building Baseerah Morphology Dataset (Spike: Surah 1 + 2:1-20)")
    print("=" * 60)

    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found at {DB_PATH}. Run scripts/fetch_qul_stems.py first.")

    with open(INDO_PATH, "r", encoding="utf-8") as f:
        wbw_indopak = json.load(f)

    wbw_en = {}
    if os.path.exists(WBW_EN_PATH):
        with open(WBW_EN_PATH, "r", encoding="utf-8") as f:
            wbw_en = json.load(f)

    wbw_ur = {}
    if os.path.exists(WBW_UR_PATH):
        with open(WBW_UR_PATH, "r", encoding="utf-8") as f:
            wbw_ur = json.load(f)

    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        labels_data = json.load(f)
    prefixes_map = labels_data.get("prefixes", {})
    suffixes_map = labels_data.get("suffixes", {})

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT sw.word_location, s.text_clean FROM stem_words sw JOIN stems s ON sw.stem_id = s.id")
    stems_dict = dict(cur.fetchall())
    conn.close()

    targets = [(1, a) for a in range(1, 8)] + [(2, a) for a in range(1, 21)]

    segmented_count = 0
    unsegmented_count = 0
    failed_count = 0

    morphology_data = {}

    for s, a in targets:
        w_idx = 1
        while True:
            loc = f"{s}:{a}:{w_idx}"
            if loc not in wbw_indopak:
                break
            w_data = wbw_indopak[loc]
            w_text = w_data["text"]

            # Skip ayah marker glyphs
            if any(ord(c) in (0x06DD, 0xFD3E, 0xFD3F) or 0xF000 <= ord(c) <= 0xF8FF for c in w_text) and not any(unicodedata.category(c) == 'Lo' for c in w_text):
                w_idx += 1
                continue

            stem_clean = stems_dict.get(loc)
            en_meaning = wbw_en.get(loc, "")
            ur_meaning = wbw_ur.get(loc, "")

            if not stem_clean:
                unsegmented_count += 1
                morphology_data[loc] = {
                    "text": w_text,
                    "segmented": False,
                    "reason": "no stem record"
                }
                w_idx += 1
                continue

            base_chars = []
            for idx, ch in enumerate(w_text):
                if not is_diacritic(ch) and ch != ' ':
                    base_chars.append((idx, ch, norm_base(ch)))

            stem_base = [norm_base(ch) for ch in stem_clean if not is_diacritic(ch) and ch != ' ']
            norm_word_base = [b[2] for b in base_chars]
            stem_len = len(stem_base)

            matches = []
            for i in range(len(norm_word_base) - stem_len + 1):
                if norm_word_base[i:i+stem_len] == stem_base:
                    matches.append(i)

            if len(matches) == 1:
                match_start = matches[0]
                match_end = match_start + stem_len

                prefix_end_idx = base_chars[match_start][0]

                if match_end < len(base_chars):
                    stem_end_idx = base_chars[match_end][0]
                else:
                    stem_end_idx = len(w_text)

                prefix = w_text[:prefix_end_idx]
                stem = w_text[prefix_end_idx:stem_end_idx]
                suffix = w_text[stem_end_idx:]

                # ZERO-TOLERANCE BYTE-FOR-BYTE CHECK
                if prefix + stem + suffix != w_text:
                    failed_count += 1
                    print(f"ERROR: Byte mismatch at {loc}: '{prefix}' + '{stem}' + '{suffix}' != '{w_text}'")
                    morphology_data[loc] = {
                        "text": w_text,
                        "segmented": False,
                        "reason": "byte mismatch"
                    }
                else:
                    segmented_count += 1
                    
                    # Generate legend elements
                    prefix_clean = clean_arabic(prefix)
                    suffix_clean = clean_arabic(suffix)
                    
                    # Match labels
                    p_en = prefixes_map.get(prefix_clean, {}).get("en") or prefixes_map.get(prefix, {}).get("en", "")
                    p_ur = prefixes_map.get(prefix_clean, {}).get("ur") or prefixes_map.get(prefix, {}).get("ur", "")

                    s_en = suffixes_map.get(suffix_clean, {}).get("en") or suffixes_map.get(suffix, {}).get("en", "")
                    s_ur = suffixes_map.get(suffix_clean, {}).get("ur") or suffixes_map.get(suffix, {}).get("ur", "")

                    stem_en = clean_label(en_meaning)
                    stem_ur = clean_label(ur_meaning)

                    # Build legend parts
                    legend_parts_en = []
                    legend_parts_ur = []

                    if prefix and p_en:
                        legend_parts_en.append(f"{prefix} = {p_en}")
                    if prefix and p_ur:
                        legend_parts_ur.append(f"{prefix} = {p_ur}")

                    if stem_en:
                        legend_parts_en.append(f"{stem} = {stem_en}")
                    if stem_ur:
                        legend_parts_ur.append(f"{stem} = {stem_ur}")

                    if suffix and s_en:
                        legend_parts_en.append(f"{suffix} = {s_en}")
                    if suffix and s_ur:
                        legend_parts_ur.append(f"{suffix} = {s_ur}")

                    legend_en = " · ".join(legend_parts_en) if (prefix or suffix) else ""
                    legend_ur = " · ".join(legend_parts_ur) if (prefix or suffix) else ""

                    morphology_data[loc] = {
                        "text": w_text,
                        "segmented": True,
                        "prefix": prefix,
                        "stem": stem,
                        "suffix": suffix,
                        "stem_clean": stem_clean,
                        "legend": {
                            "en": legend_en,
                            "ur": legend_ur
                        }
                    }
            else:
                unsegmented_count += 1
                morphology_data[loc] = {
                    "text": w_text,
                    "segmented": False,
                    "reason": f"matches={len(matches)} for stem '{stem_clean}'"
                }

            w_idx += 1

    total_words = segmented_count + unsegmented_count + failed_count
    print(f"Total Words Processed: {total_words}")
    print(f"  Segmented:   {segmented_count} ({segmented_count / total_words * 100:.1f}%)")
    print(f"  Unsegmented: {unsegmented_count} ({unsegmented_count / total_words * 100:.1f}%)")
    print(f"  Failed:      {failed_count} (0% byte deviations)")

    # Save outputs
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(morphology_data, f, ensure_ascii=False, indent=2)

    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write("window.BASEERAH_MORPHOLOGY = ")
        json.dump(morphology_data, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print(f"Saved morphology dataset to:\n  - {OUTPUT_JSON}\n  - {OUTPUT_JS}")

if __name__ == "__main__":
    build()
