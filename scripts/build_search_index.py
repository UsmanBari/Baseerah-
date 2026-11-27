#!/usr/bin/env python3
"""
scripts/build_search_index.py
Builds a compact offline search index (data/search_index.js) from verified surahs data.
Strips diacritics for fast normalized Arabic search, and indexes Urdu & English text snippets.
"""
import os
import re
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SURAHS_DIR = os.path.join(BASE_DIR, 'data', 'surahs')

# Regex to strip Arabic diacritics for search normalization
ARABIC_DIACRITICS = re.compile(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A\u08F0-\u08FF]')
# Regex to normalize Arabic characters (alefs, etc.)
def normalize_arabic(text):
    if not text:
        return ""
    # Strip HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Strip footnotes
    text = re.sub(r'\[\d+\]', '', text)
    # Strip end of ayah glyphs
    text = re.sub(r'[\uf500-\uf65d\u0660-\u0669\u06dd\u06de\u06df\u25cb\u25ef\ufd3e\ufd3f\u061e]', '', text)
    # Strip diacritics
    text = ARABIC_DIACRITICS.sub('', text)
    # Normalize alefs
    text = re.sub(r'[إأآٱ]', 'ا', text)
    # Normalize ya / alif maqsura
    text = re.sub(r'[ىي]', 'ی', text)
    # Normalize ta marbuta / ha
    text = re.sub(r'ة', 'ہ', text)
    # Tatweel
    text = text.replace('\u0640', '')
    return ' '.join(text.split())

def clean_snippet(text, max_len=75):
    if not text:
        return ""
    # Remove HTML and footnotes
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\[\d+\]', '', text)
    text = ' '.join(text.split())
    if len(text) > max_len:
        return text[:max_len] + '...'
    return text

def build_search_index():
    entries = []
    
    # Process all 114 surahs
    for s_num in range(1, 115):
        fn = f"{s_num:03d}.js"
        fp = os.path.join(SURAHS_DIR, fn)
        if not os.path.exists(fp):
            continue
            
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
            
        m = re.search(r'window\.BASEERAH_SURAH\s*=\s*(.+?);\s*$', content, re.DOTALL)
        if not m:
            continue
            
        surah_data = json.loads(m.group(1))
        
        for ayah in surah_data['ayahs']:
            a_num = ayah['number']
            ar_norm = normalize_arabic(ayah.get('arFull', ''))
            ur_snip = clean_snippet(ayah.get('ur', ''))
            en_snip = clean_snippet(ayah.get('en', ''))
            
            entries.append({
                's': s_num,
                'a': a_num,
                'ar': ar_norm,
                'ur': ur_snip,
                'en': en_snip
            })
            
    out_path = os.path.join(BASE_DIR, 'data', 'search_index.js')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('/* Generated offline search index for Baseerah (6,236 Ayahs) */\n')
        f.write('window.BASEERAH_SEARCH_INDEX = ')
        json.dump(entries, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
        
    print(f"Built search index with {len(entries)} ayahs at {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")

if __name__ == '__main__':
    build_search_index()
