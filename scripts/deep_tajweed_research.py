import urllib.request
import json
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {'User-Agent': 'Mozilla/5.0'}

def fetch_json(url):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

def fetch_text(url):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return f"Error: {e}"

print("=== 1. Quran.com API: Verses uthmani_tajweed ===")
data = fetch_json("https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=1")
if "verses" in data:
    for v in data["verses"][:3]:
        print(f"Verse {v['verse_key']}:")
        print(v["text_uthmani_tajweed"])
else:
    print(data)

print("\n=== 2. Quran.com API: Verse 1:1 with words ===")
data_words = fetch_json("https://api.quran.com/api/v4/verses/by_key/1:1?words=true&word_fields=text_uthmani,text_tajweed,text_imlaei,location")
if "verse" in data_words:
    for w in data_words["verse"]["words"]:
        print(f"Word {w.get('location')} ({w.get('char_type_name')}): {w.get('text_uthmani')} | tajweed: {w.get('text_tajweed')}")
else:
    print(data_words)

print("\n=== 3. Quran.com API: Check another ayah with more tajweed rules (e.g. 2:1, 2:2, 114:1-6) ===")
data_nas = fetch_json("https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=114")
if "verses" in data_nas:
    for v in data_nas["verses"][:3]:
        print(f"Verse {v['verse_key']}: {v['text_uthmani_tajweed']}")

print("\n=== 4. Extract all tajweed classes from Surah 1 & 114 ===")
tags = set()
for s in [1, 112, 113, 114]:
    d = fetch_json(f"https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number={s}")
    if "verses" in d:
        for v in d["verses"]:
            matches = re.findall(r'<tajweed class="?([^">]+)"?>', v["text_uthmani_tajweed"])
            for m in matches:
                tags.add(m)
print("Classes found:", sorted(list(tags)))
