import os
import json
import ssl
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

CACHE_DIR = "raw/qurancom_tajweed"
os.makedirs(CACHE_DIR, exist_ok=True)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Baseerah Tajweed Audit Tool"
}

def fetch_surah(surah_num):
    cache_path = os.path.join(CACHE_DIR, f"surah_{surah_num:03d}.json")
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 100:
        return surah_num, True, "Cached"

    url = f"https://api.quran.com/api/v4/verses/by_chapter/{surah_num}?words=true&word_fields=text_uthmani_tajweed&per_page=300"
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                with open(cache_path, "w", encoding="utf-8") as out:
                    json.dump(data, out, ensure_ascii=False)
                return surah_num, True, "Fetched"
        except Exception as e:
            time.sleep(1 + attempt)
    return surah_num, False, f"Failed after 3 attempts"

def main():
    print("Starting download of Quran.com Tajweed for all 114 surahs...")
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(fetch_surah, s): s for s in range(1, 115)}
        completed = 0
        for f in as_completed(futures):
            s, success, msg = f.result()
            completed += 1
            if not success or completed % 20 == 0 or completed == 114:
                print(f"[{completed:3d}/114] Surah {s:3d}: {msg}")

    # Verify all 114 surahs exist
    missing = [s for s in range(1, 115) if not os.path.exists(os.path.join(CACHE_DIR, f"surah_{s:03d}.json"))]
    if missing:
        print(f"Error: Missing surahs: {missing}")
        exit(1)
    else:
        print("All 114 surahs successfully downloaded and cached in raw/qurancom_tajweed!")

if __name__ == "__main__":
    main()
