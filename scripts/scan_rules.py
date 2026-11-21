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

# 1. Collect all tajweed rule classes across a large sample of Surahs (e.g., 1, 2, 18, 36, 55, 67, 112, 113, 114)
print("Collecting rule classes from Quran.com uthmani_tajweed...")
all_rules = set()
rule_samples = {}

sample_surahs = [1, 2, 12, 18, 36, 55, 67, 78, 112, 113, 114]
for s in sample_surahs:
    d = fetch_json(f"https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number={s}")
    if "verses" in d:
        for v in d["verses"]:
            matches = re.findall(r'<tajweed class=([^>]+)>([^<]+)</tajweed>', v["text_uthmani_tajweed"])
            for r_class, text in matches:
                all_rules.add(r_class)
                if r_class not in rule_samples:
                    rule_samples[r_class] = f"{text} (in {v['verse_key']})"

print("\n--- All Discovered Tajweed Classes ---")
for r in sorted(list(all_rules)):
    print(f"Class: {r:<25} Sample: {rule_samples.get(r)}")

# 2. Check Quran.com frontend repository / documentation for tajweed rule definitions and CSS colors
print("\n--- Checking Quran.com rule definitions ---")
# Let's fetch rule definitions or look at github raw if accessible
github_urls = [
    "https://raw.githubusercontent.com/quran/quran.com-frontend-next/master/src/components/QuranReader/ReadingView/TajweedWord/TajweedWord.module.scss",
    "https://raw.githubusercontent.com/quran/quran.com-frontend-next/master/src/styles/tajweed.scss",
    "https://raw.githubusercontent.com/quran/quran.com-frontend-next/master/src/utils/tajweed.ts",
    "https://raw.githubusercontent.com/quran/quran.com-frontend-next/master/types/Tajweed.ts"
]

for url in github_urls:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            content = resp.read().decode('utf-8')
            print(f"FOUND {url} ({len(content)} bytes):")
            print(content[:500])
            print("...")
    except Exception as e:
        # print(f"Not at {url}: {e}")
        pass
