#!/usr/bin/env python3
"""
scripts/inspect_raw.py
Inspects raw Quran and translation files in raw/ without modifying anything.
Standard library only.
"""
import os
import json
import unicodedata
from collections import defaultdict

RAW_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "raw")

FILES = [
    "tanzil-uthmani.txt",
    "qul-wbw-script.json",
    "qul-wbw-indopak.json",
    "qul-ayah-indopak.json",
    "qul-wbw-ur.json",
    "qul-wbw-en.json",
]

def inspect_tanzil(filepath):
    print("=" * 70)
    print("FILE: tanzil-uthmani.txt (Tanzil Uthmani Text - Ground Truth)")
    print("=" * 70)
    with open(filepath, "r", encoding="utf-8") as f:
        lines = [line.rstrip("\r\n") for line in f]
    
    total_lines = len(lines)
    ayah_lines = [l for l in lines if l and not l.startswith("#")]
    comment_lines = [l for l in lines if l.startswith("#")]
    
    print(f"Total lines: {total_lines}")
    print(f"Ayah data lines: {len(ayah_lines)} (expected: 6236)")
    print(f"License/comment lines at end: {len(comment_lines)}")
    print(f"Structure: pipe-delimited 'sura|aya|text'")
    
    surahs = set()
    total_words = 0
    samples = []
    for i, line in enumerate(ayah_lines):
        parts = line.split("|")
        if len(parts) == 3:
            s, a, text = parts
            surahs.add(int(s))
            words = text.split()
            total_words += len(words)
            if i < 3:
                samples.append(f"  [{i+1}] Surah {s}, Ayah {a}: '{text}' ({len(words)} words)")
                
    print(f"Total Surahs: {len(surahs)}")
    print(f"Total Ayahs: {len(ayah_lines)}")
    print(f"Total space-delimited words: {total_words}")
    print("3 Sample entries:")
    for s in samples:
        print(s)
    print()

def inspect_json_file(filename, filepath):
    print("=" * 70)
    print(f"FILE: {filename}")
    print("=" * 70)
    
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    print(f"Top-level type: {type(data).__name__}")
    
    if isinstance(data, dict):
        keys = list(data.keys())
        print(f"Total keys: {len(keys)}")
        
        # Determine keying scheme
        sample_key = keys[0]
        key_parts = sample_key.split(":")
        if len(key_parts) == 3:
            scheme = "surah:ayah:word (e.g. '1:1:1')"
        elif len(key_parts) == 2:
            scheme = "surah:ayah (e.g. '1:1')"
        else:
            scheme = "unknown"
        print(f"Key format: {scheme}")
        
        # Count surahs, ayahs, words
        surah_set = set()
        ayah_set = set()
        pua_chars = set()
        
        for k in keys:
            parts = k.split(":")
            if len(parts) >= 2:
                surah_set.add(int(parts[0]))
                ayah_set.add((int(parts[0]), int(parts[1])))
                
            val = data[k]
            text = val["text"] if isinstance(val, dict) and "text" in val else str(val)
            for c in text:
                if "\ue000" <= c <= "\uf8ff":
                    pua_chars.add(c)
                    
        print(f"Total Surahs represented: {len(surah_set)}")
        print(f"Total Ayahs represented: {len(ayah_set)}")
        print(f"Total entries (words or ayahs): {len(keys)}")
        if pua_chars:
            print(f"Special codepoints (PUA glyphs / font ligatures): {len(pua_chars)} unique characters")
            sample_pua = [f"{c} (U+{ord(c):04X})" for c in sorted(pua_chars)[:5]]
            print(f"Sample PUA characters: {', '.join(sample_pua)}")
        else:
            print("Special codepoints (PUA glyphs): None (standard Unicode only)")
            
        print("3 Sample entries:")
        for k in keys[:3]:
            val = data[k]
            if isinstance(val, dict):
                print(f"  Key '{k}': {repr(val)}")
            else:
                print(f"  Key '{k}': {repr(val)}")
                
        # Check ayah-end markers if word-by-word
        if len(key_parts) == 3:
            # Check how ayah end marker looks
            print("Ayah-end marker samples (e.g. last word of 1:1, 1:2, 1:3):")
            for a_key in ["1:1", "1:2", "1:3"]:
                words_in_a = [k for k in keys if k.startswith(a_key + ":")]
                words_in_a.sort(key=lambda x: int(x.split(":")[2]))
                last_w = words_in_a[-1]
                val = data[last_w]
                t = val["text"] if isinstance(val, dict) else val
                raw_codes = " ".join(f"U+{ord(c):04X}" for c in str(t))
                print(f"  Ayah {a_key} last word key '{last_w}': {repr(t)} [codepoints: {raw_codes}]")
    print()

def main():
    print("BASEERAH RAW FILES INSPECTION REPORT\n")
    for fn in FILES:
        fp = os.path.join(RAW_DIR, fn)
        if not os.path.exists(fp):
            print(f"WARNING: {fn} not found in {RAW_DIR}")
            continue
        if fn.endswith(".txt"):
            inspect_tanzil(fp)
        else:
            inspect_json_file(fn, fp)

if __name__ == "__main__":
    main()
