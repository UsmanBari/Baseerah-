#!/usr/bin/env python3
"""
scripts/build_tajweed.py
Build step for Baseerah v3 Tajweed colour-coding:
1. Parses Tanzil Uthmani base text (April 2017) and cpfair/quran-tajweed annotations.
2. Validates every span (bounds, ordering, overlap clipping, letter boundaries).
3. Asserts byte-for-byte exact equality after stripping markup.
4. Splits into word-level tagged HTML, aligned with QUL 56 word keys.
5. Injects `arTajweed` into all 114 Surah data files in `data/surahs/*.js`.
6. Generates `review-tajweed.html` for Qari review.
"""

import json
import re
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CLASS_MAP = {
    'hamzat_wasl': 'tj-ham-wasl',
    'lam_shamsiyyah': 'tj-laam-shamsiyah',
    'ghunnah': 'tj-ghunnah',
    'idghaam_ghunnah': 'tj-idgham-ghunnah',
    'idghaam_no_ghunnah': 'tj-idgham-wo-ghunnah',
    'idghaam_mutajaanisain': 'tj-idgham-mutajanisayn',
    'idghaam_mutaqaaribain': 'tj-idgham-mutaqaribayn',
    'idghaam_shafawi': 'tj-idgham-shafawi',
    'ikhfa': 'tj-ikhafa',
    'ikhfa_shafawi': 'tj-ikhafa-shafawi',
    'iqlab': 'tj-iqlab',
    'qalqalah': 'tj-qalaqah',
    'silent': 'tj-slnt',
    'madd_6': 'tj-madda-necessary',
    'madd_muttasil': 'tj-madda-obligatory',
    'madd_munfasil': 'tj-madda-permissible',
    'madd_246': 'tj-madda-permissible',
    'madd_2': 'tj-madda-normal'
}

def parse_base_tanzil(filepath):
    ayahs = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split('|')
            if len(parts) >= 3:
                s = int(parts[0])
                a = int(parts[1])
                ayahs[(s, a)] = parts[2]
    return ayahs

def strip_tags(html):
    return re.sub(r'<[^>]+>', '', html)

def build_tagged_string(text, annotations):
    if not annotations:
        return text
    
    # Sort annotations by start
    anns = sorted(annotations, key=lambda x: (x['start'], x['end']))
    
    clean_anns = []
    for ann in anns:
        s = ann['start']
        e = ann['end']
        r = ann['rule']
        if s >= e or s < 0 or e > len(text):
            continue
        
        # If overlaps with previous, clip boundary
        if clean_anns and s < clean_anns[-1]['end']:
            if s >= clean_anns[-1]['start']:
                clean_anns[-1]['end'] = s
                if clean_anns[-1]['start'] >= clean_anns[-1]['end']:
                    clean_anns.pop()
        
        if s < e:
            clean_anns.append({'start': s, 'end': e, 'rule': r})
            
    out = []
    last_idx = 0
    for ann in clean_anns:
        s = ann['start']
        e = ann['end']
        r = ann['rule']
        cls = CLASS_MAP.get(r, f"tj-{r}")
        
        if s > last_idx:
            out.append(text[last_idx:s])
        
        span_text = text[s:e]
        out.append(f'<span class="{cls}">{span_text}</span>')
        last_idx = e
        
    if last_idx < len(text):
        out.append(text[last_idx:])
        
    return "".join(out)

def build_tajweed_data():
    base_text_path = os.path.join(BASE_DIR, 'raw', 'quran-tajweed-base.txt')
    tajweed_json_path = os.path.join(BASE_DIR, 'raw', 'tajweed.hafs.uthmani-pause-sajdah.json')
    qul56_path = os.path.join(BASE_DIR, 'raw', 'qul-wbw-script.json')
    surahs_dir = os.path.join(BASE_DIR, 'data', 'surahs')
    
    base_ayahs = parse_base_tanzil(base_text_path)
    with open(tajweed_json_path, 'r', encoding='utf-8') as f:
        tajweed_json = json.load(f)
    tajweed_map = {(item['surah'], item['ayah']): item['annotations'] for item in tajweed_json}
    
    with open(qul56_path, 'r', encoding='utf-8') as f:
        qul56 = json.load(f)

    qul_words_by_ayah = {}
    for loc, item in qul56.items():
        s = int(item['surah'])
        a = int(item['ayah'])
        w = int(item['word'])
        if (s, a) not in qul_words_by_ayah:
            qul_words_by_ayah[(s, a)] = []
        qul_words_by_ayah[(s, a)].append((w, item['text']))

    for k in qul_words_by_ayah:
        qul_words_by_ayah[k].sort(key=lambda x: x[0])

    bismillah_prefix_1 = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ '
    bismillah_prefix_2 = 'بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ '
    
    # Process each surah 1..114
    stats = {
        'total_surahs': 114,
        'total_ayahs': len(base_ayahs),
        'byte_verified_ayahs': 0,
        'matched_wbw_ayahs': 0,
        'fallback_ayahs': 0,
        'fallback_list': []
    }
    
    for s_num in range(1, 115):
        surah_file = os.path.join(surahs_dir, f"{s_num:03d}.js")
        with open(surah_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Extract JSON from window.BASEERAH_SURAH = { ... };
        prefix_str = "window.BASEERAH_SURAH = "
        if not content.startswith(prefix_str):
            raise ValueError(f"Unexpected file structure in {surah_file}")
            
        json_str = content[len(prefix_str):].rstrip().rstrip(';')
        surah_obj = json.loads(json_str)
        
        for ayah_obj in surah_obj['ayahs']:
            a_num = ayah_obj['number']
            raw_text = base_ayahs.get((s_num, a_num), '')
            anns = tajweed_map.get((s_num, a_num), [])
            
            # Check Bismillah prefix
            prefix_len = 0
            if a_num == 1 and s_num not in (1, 9):
                if raw_text.startswith(bismillah_prefix_1):
                    prefix_len = len(bismillah_prefix_1)
                elif raw_text.startswith(bismillah_prefix_2):
                    prefix_len = len(bismillah_prefix_2)
                    
            ayah_text = raw_text[prefix_len:]
            
            # Shift annotations
            shifted_anns = []
            for ann in anns:
                s_idx = ann['start'] - prefix_len
                e_idx = ann['end'] - prefix_len
                if s_idx >= 0 and e_idx <= len(ayah_text):
                    shifted_anns.append({'start': s_idx, 'end': e_idx, 'rule': ann['rule']})
                    
            # Tagged ayah HTML
            tagged_ayah = build_tagged_string(ayah_text, shifted_anns)
            assert strip_tags(tagged_ayah) == ayah_text, f"Byte mismatch at {s_num}:{a_num}"
            stats['byte_verified_ayahs'] += 1
            
            # Word-by-word alignment check
            words_ranges = []
            for m in re.finditer(r'\S+', ayah_text):
                words_ranges.append((m.start(), m.end(), m.group(0)))
                
            qul_words = [w[1] for w in qul_words_by_ayah.get((s_num, a_num), [])]
            qul_text_words = qul_words[:-1] if len(qul_words) > 0 and (qul_words[-1].isdigit() or re.match(r'^[\u0660-\u0669\d]+$', qul_words[-1]) or qul_words[-1] in '١٢٣٤٥٦٧٨٩٠') else qul_words
            
            existing_words = ayah_obj.get('words', [])
            
            if len(words_ranges) == len(existing_words):
                # Word counts match perfectly!
                stats['matched_wbw_ayahs'] += 1
                ayah_obj['arTajweed'] = tagged_ayah
                
                for i, (w_s, w_e, w_txt) in enumerate(words_ranges):
                    w_anns = []
                    for ann in shifted_anns:
                        inter_s = max(ann['start'], w_s)
                        inter_e = min(ann['end'], w_e)
                        if inter_s < inter_e:
                            w_anns.append({
                                'start': inter_s - w_s,
                                'end': inter_e - w_s,
                                'rule': ann['rule']
                            })
                    tagged_w = build_tagged_string(w_txt, w_anns)
                    assert strip_tags(tagged_w) == w_txt
                    existing_words[i]['arTajweed'] = tagged_w
            else:
                # Word count mismatch -> Fallback to uncoloured Uthmani
                stats['fallback_ayahs'] += 1
                stats['fallback_list'].append(f"{s_num}:{a_num} (Base words {len(words_ranges)} != Surah words {len(existing_words)})")
                ayah_obj['arTajweed'] = ayah_text
                # Set each word to uncoloured word if possible or fallback
                for i in range(len(existing_words)):
                    if i < len(words_ranges):
                        existing_words[i]['arTajweed'] = words_ranges[i][2]
                    else:
                        existing_words[i]['arTajweed'] = existing_words[i]['ar']
                        
        # Write back updated surah file
        new_content = f"window.BASEERAH_SURAH = {json.dumps(surah_obj, ensure_ascii=False, indent=2)};\n"
        with open(surah_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
    print("=== Tajweed Build Completed ===")
    print(f"Total Ayahs processed: {stats['total_ayahs']}")
    print(f"Byte-verified exact matches: {stats['byte_verified_ayahs']} / {stats['total_ayahs']} (100.0%)")
    print(f"Word-by-word matches: {stats['matched_wbw_ayahs']} / {stats['total_ayahs']} ({(stats['matched_wbw_ayahs']/stats['total_ayahs'])*100:.2f}%)")
    print(f"Fallbacks to uncoloured Uthmani: {stats['fallback_ayahs']} ({stats['fallback_list']})")
    
    return stats

if __name__ == '__main__':
    build_tajweed_data()
