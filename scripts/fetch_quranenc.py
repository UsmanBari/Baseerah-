#!/usr/bin/env python3
"""
scripts/fetch_quranenc.py
Downloads Urdu and English translations from QuranEnc API:
  - https://quranenc.com/api/v1/translation/sura/urdu_junagarhi/{1..114}
  - https://quranenc.com/api/v1/translation/sura/english_saheeh/{1..114}
Saves raw responses to raw/quranenc/{key}/{nnn}.json without modification.
Uses 1-second delay between requests and retries 3 times on failure.
Skips files that already exist.
Standard library only.
"""
import os
import sys
import json
import time
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_BASE = os.path.join(BASE_DIR, "raw", "quranenc")

TRANSLATIONS = [
    "urdu_junagarhi",
    "english_saheeh"
]

def fetch_surah(trans_key, surah_num, max_retries=3):
    url = f"https://quranenc.com/api/v1/translation/sura/{trans_key}/{surah_num}"
    headers = {"User-Agent": "Baseerah-Kiosk/1.0"}
    req = urllib.request.Request(url, headers=headers)
    
    for attempt in range(1, max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                content = resp.read()
                # Validate JSON before saving
                parsed = json.loads(content.decode("utf-8"))
                if "result" not in parsed:
                    raise ValueError(f"Unexpected response structure: {list(parsed.keys())}")
                return content
        except Exception as e:
            print(f"  [Attempt {attempt}/{max_retries}] Error fetching {trans_key} surah {surah_num}: {e}")
            if attempt < max_retries:
                time.sleep(2 * attempt)
            else:
                raise

def main():
    print("Starting QuranEnc download...")
    for trans_key in TRANSLATIONS:
        out_dir = os.path.join(OUTPUT_BASE, trans_key)
        os.makedirs(out_dir, exist_ok=True)
        print(f"\nProcessing {trans_key} -> {out_dir}")
        
        for surah_num in range(1, 115):
            filename = f"{surah_num:03d}.json"
            filepath = os.path.join(out_dir, filename)
            
            if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
                print(f"[{trans_key}] Surah {surah_num:03d} already exists, skipping.")
                continue
                
            print(f"[{trans_key}] Fetching surah {surah_num:03d}/114...", end="", flush=True)
            raw_bytes = fetch_surah(trans_key, surah_num)
            with open(filepath, "wb") as f:
                f.write(raw_bytes)
            print(" done.")
            time.sleep(1)

    # Verification summary
    print("\n" + "=" * 60)
    print("QURANENC DOWNLOAD VERIFICATION")
    print("=" * 60)
    all_ok = True
    for trans_key in TRANSLATIONS:
        out_dir = os.path.join(OUTPUT_BASE, trans_key)
        files = [f for f in os.listdir(out_dir) if f.endswith(".json")]
        total_ayahs = 0
        for f in sorted(files):
            with open(os.path.join(out_dir, f), "r", encoding="utf-8") as fp:
                data = json.load(fp)
                total_ayahs += len(data.get("result", []))
                
        print(f"Translation: {trans_key}")
        print(f"  Files count: {len(files)} (expected: 114)")
        print(f"  Total ayahs: {total_ayahs} (expected: 6236)")
        if len(files) != 114 or total_ayahs != 6236:
            all_ok = False
            print(f"  FAILED: mismatch in count!")
        else:
            print(f"  PASSED: count matches.")

    if not all_ok:
        sys.exit(1)
    print("\nFetch completed successfully.")

if __name__ == "__main__":
    main()
