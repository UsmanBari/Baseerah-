import urllib.request
import json
import ssl

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

print("=== Check Quran.com API: Verses with words and text_uthmani_tajweed ===")
# Let's check 1:1, 1:2, and 114:1 with words
for verse_key in ["1:1", "1:2", "114:1"]:
    d = fetch_json(f"https://api.quran.com/api/v4/verses/by_key/{verse_key}?words=true&word_fields=text_uthmani,text_uthmani_tajweed,text_imlaei")
    print(f"\n--- Verse {verse_key} ---")
    if "verse" in d and "words" in d["verse"]:
        for w in d["verse"]["words"]:
            print(f"Word {w['position']}: text_uthmani='{w.get('text_uthmani')}' | text_uthmani_tajweed='{w.get('text_uthmani_tajweed')}'")
