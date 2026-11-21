import json
import random
import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {'User-Agent': 'Mozilla/5.0'}

def get_json(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8'))

with open('raw/tajweed.hafs.uthmani-pause-sajdah.json', 'r', encoding='utf-8') as f:
    tajweed_json = json.load(f)

# Index tajweed_json by (surah, ayah)
cpfair_by_ayah = {(item['surah'], item['ayah']): item['annotations'] for item in tajweed_json}

# Normalized rule groups to compare equivalence
RULE_GROUP_MAP = {
    # Hamzat wasl
    'hamzat_wasl': 'HAMZAT_WASL',
    'ham_wasl': 'HAMZAT_WASL',
    
    # Lam shamsiyyah
    'lam_shamsiyyah': 'LAM_SHAMSIYYAH',
    'laam_shamsiyah': 'LAM_SHAMSIYYAH',
    
    # Ghunnah
    'ghunnah': 'GHUNNAH',
    
    # Idgham
    'idghaam_ghunnah': 'IDGHAM_GHUNNAH',
    'idgham_ghunnah': 'IDGHAM_GHUNNAH',
    'idghaam_no_ghunnah': 'IDGHAM_WO_GHUNNAH',
    'idgham_wo_ghunnah': 'IDGHAM_WO_GHUNNAH',
    'idghaam_mutajaanisain': 'IDGHAM_MUTAJANISAYN',
    'idgham_mutajanisayn': 'IDGHAM_MUTAJANISAYN',
    'idghaam_mutaqaaribain': 'IDGHAM_MUTAQARIBAYN',
    'idgham_mutaqaribayn': 'IDGHAM_MUTAQARIBAYN',
    'idghaam_shafawi': 'IDGHAM_SHAFAWI',
    'idgham_shafawi': 'IDGHAM_SHAFAWI',
    
    # Ikhfa
    'ikhfa': 'IKHFA',
    'ikhafa': 'IKHFA',
    'ikhfa_shafawi': 'IKHFA_SHAFAWI',
    'ikhafa_shafawi': 'IKHFA_SHAFAWI',
    
    # Iqlab
    'iqlab': 'IQLAB',
    
    # Qalqalah
    'qalqalah': 'QALQALAH',
    'qalaqah': 'QALQALAH',
    
    # Silent
    'silent': 'SILENT',
    'slnt': 'SILENT',
    
    # Madd
    'madd_6': 'MADD_6',
    'madda_necessary': 'MADD_6',
    'madd_muttasil': 'MADD_MUTTASIL',
    'madda_obligatory': 'MADD_MUTTASIL',
    'madda_obligatory_mottasel': 'MADD_MUTTASIL',
    'madd_munfasil': 'MADD_MUNFASIL',
    'madda_obligatory_monfasel': 'MADD_MUNFASIL',
    'madd_246': 'MADD_246',
    'madda_permissible': 'MADD_246',
    'madd_2': 'MADD_2',
    'madda_normal': 'MADD_2',
}

# Select 50 deterministic random ayahs across various surahs
random.seed(42)
all_keys = list(cpfair_by_ayah.keys())
sample_keys = random.sample(all_keys, 50)
sample_keys.sort()

print(f"Comparing 50 sample ayahs against Quran.com API...")

total_checked_rules = 0
matching_rules = 0

sample_results = []

for s, a in sample_keys:
    cpfair_anns = cpfair_by_ayah.get((s, a), [])
    cpfair_rule_set = set()
    for ann in cpfair_anns:
        grp = RULE_GROUP_MAP.get(ann['rule'], ann['rule'].upper())
        cpfair_rule_set.add(grp)
        
    # Fetch from Quran.com
    url = f"https://api.quran.com/api/v4/verses/by_key/{s}:{a}?words=true&word_fields=text_uthmani_tajweed"
    try:
        data = get_json(url)
        qcom_rule_set = set()
        if "verse" in data and "words" in data["verse"]:
            for w in data["verse"]["words"]:
                txt = w.get("text_uthmani_tajweed", "")
                if txt:
                    matches = re.findall(r'<rule class=([^>]+)>', txt)
                    for m in matches:
                        grp = RULE_GROUP_MAP.get(m, m.upper())
                        qcom_rule_set.add(grp)
        
        # Calculate Jaccard similarity or overlap of rules present in this ayah
        union = cpfair_rule_set.union(qcom_rule_set)
        intersection = cpfair_rule_set.intersection(qcom_rule_set)
        
        similarity = len(intersection) / len(union) if union else 1.0
        sample_results.append((s, a, similarity, cpfair_rule_set, qcom_rule_set))
    except Exception as e:
        print(f"Error fetching {s}:{a}: {e}")

avg_similarity = sum(r[2] for r in sample_results) / len(sample_results) if sample_results else 0
print(f"\nAverage Rule Concordance across 50 random ayahs: {avg_similarity * 100:.2f}%")
print("First 5 comparisons:")
for s, a, sim, cp, qc in sample_results[:5]:
    print(f"Ayah {s}:{a} Concordance: {sim*100:.1f}%")
    print(f"  cpfair:   {sorted(list(cp))}")
    print(f"  qurancom: {sorted(list(qc))}")
