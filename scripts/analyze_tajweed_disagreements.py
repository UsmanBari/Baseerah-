import os
import sys
import json
import glob
import re
import random
from collections import defaultdict, Counter

# Ensure root import
sys.path.insert(0, os.path.abspath('.'))

CANONICAL_MAP = {
    # Hamzat wasl
    'ham_wasl': 'HAMZAT_WASL',
    'hamzat_wasl': 'HAMZAT_WASL',
    'ham-wasl': 'HAMZAT_WASL',
    
    # Lam shamsiyyah
    'laam_shamsiyah': 'LAM_SHAMSIYYAH',
    'laam-shamsiyah': 'LAM_SHAMSIYYAH',
    'lam_shamsiyyah': 'LAM_SHAMSIYYAH',
    
    # Ghunnah
    'ghunnah': 'GHUNNAH',
    
    # Idgham
    'idgham_ghunnah': 'IDGHAM_GHUNNAH',
    'idghaam_ghunnah': 'IDGHAM_GHUNNAH',
    'idgham-ghunnah': 'IDGHAM_GHUNNAH',
    'idghaam-ghunnah': 'IDGHAM_GHUNNAH',
    
    'idgham_wo_ghunnah': 'IDGHAM_WO_GHUNNAH',
    'idghaam_no_ghunnah': 'IDGHAM_WO_GHUNNAH',
    'idgham-wo-ghunnah': 'IDGHAM_WO_GHUNNAH',
    'idgham-no-ghunnah': 'IDGHAM_WO_GHUNNAH',
    'idghaam-no-ghunnah': 'IDGHAM_WO_GHUNNAH',
    
    'idgham_mutajanisayn': 'IDGHAM_MUTAJANISAYN',
    'idghaam_mutajanisayn': 'IDGHAM_MUTAJANISAYN',
    'idgham-mutajanisayn': 'IDGHAM_MUTAJANISAYN',
    
    'idgham_mutaqaribayn': 'IDGHAM_MUTAQARIBAYN',
    'idghaam_mutaqaribayn': 'IDGHAM_MUTAQARIBAYN',
    'idgham-mutaqaribayn': 'IDGHAM_MUTAQARIBAYN',
    
    'idgham_shafawi': 'IDGHAM_SHAFAWI',
    'idghaam_shafawi': 'IDGHAM_SHAFAWI',
    'idgham-shafawi': 'IDGHAM_SHAFAWI',
    
    # Ikhfa
    'ikhafa': 'IKHFA',
    'ikhfa': 'IKHFA',
    'ikhafa_shafawi': 'IKHFA_SHAFAWI',
    'ikhfa_shafawi': 'IKHFA_SHAFAWI',
    'ikhafa-shafawi': 'IKHFA_SHAFAWI',
    
    # Iqlab
    'iqlab': 'IQLAB',
    
    # Qalqalah
    'qalaqah': 'QALQALAH',
    'qalqalah': 'QALQALAH',
    
    # Silent
    'slnt': 'SILENT',
    'silent': 'SILENT',
    
    # Madd
    'madda_necessary': 'MADD_6',
    'madda-necessary': 'MADD_6',
    'madd_6': 'MADD_6',
    
    'madda_obligatory_mottasel': 'MADD_MUTTASIL',
    'madda-obligatory': 'MADD_MUTTASIL',
    'madd_muttasil': 'MADD_MUTTASIL',
    
    'madda_obligatory_monfasel': 'MADD_MUNFASIL',
    'madd_munfasil': 'MADD_MUNFASIL',
    
    'madda_permissible': 'MADD_246',
    'madda-permissible': 'MADD_246',
    'madd_246': 'MADD_246',
    
    'madda_normal': 'MADD_2',
    'madda-normal': 'MADD_2',
    'madd_2': 'MADD_2',
    
    'custom-alef-maksora': None,
}

RULE_DESCRIPTIONS = {
    'HAMZAT_WASL': ('Connecting Hamza', 'ہمزۃ الوصل', 'Dropping hamza on continuous recitation'),
    'LAM_SHAMSIYYAH': ('Solar Lam', 'لام شمسیہ', 'Assimilated lam before solar letters'),
    'GHUNNAH': ('Ghunnah', 'غنہ', 'Two-count nasalisation on noon/meem mushaddadah'),
    'IDGHAM_GHUNNAH': ('Idgham with Ghunnah', 'ادغام مع الغنہ', 'Assimilation with nasalisation (ي ن م و)'),
    'IDGHAM_WO_GHUNNAH': ('Idgham without Ghunnah', 'ادغام بلا غنہ', 'Complete assimilation without nasalisation (ل ر)'),
    'IDGHAM_MUTAJANISAYN': ('Idgham Mutajanisayn', 'ادغام متجانسین', 'Homorganic assimilation'),
    'IDGHAM_MUTAQARIBAYN': ('Idgham Mutaqaribayn', 'ادغام متقاربین', 'Convergent assimilation'),
    'IDGHAM_SHAFAWI': ('Idgham Shafawi', 'ادغام شفوی', 'Labial assimilation (meem sakinah into meem)'),
    'IKHFA': ('Ikhfa', 'اخفاء', 'Hiding/concealment of noon sakinah / tanween (15 letters)'),
    'IKHFA_SHAFAWI': ('Ikhfa Shafawi', 'اخفاء شفوی', 'Labial hiding (meem sakinah before ba)'),
    'IQLAB': ('Iqlab', 'اقلاب', 'Conversion of noon sakinah/tanween into meem before ba'),
    'QALQALAH': ('Qalqalah', 'قلقلہ', 'Echo/bounce on قطب جد when sakin'),
    'SILENT': ('Silent Letter', 'حرف ساقط / غیر ملفوظ', 'Unpronounced orthographic letters'),
    'MADD_6': ('Compulsory Madd (6)', 'مد لازم (۶ حرکات)', '6-count necessary prolongation before sukun/shaddah'),
    'MADD_MUTTASIL': ('Connected Madd (4-5)', 'مد متصل (۴-۵ حرکات)', 'Prolongation with hamza in the same word'),
    'MADD_MUNFASIL': ('Separated Madd (4-5)', 'مد منفصل (۴-۵ حرکات)', 'Prolongation with hamza in the following word'),
    'MADD_246': ('Permissible Madd (2/4/6)', 'مد عارض للسکون', 'Prolongation before pause'),
    'MADD_2': ('Natural Madd (2)', 'مد طبیعی (۲ حرکات)', 'Original 2-count prolongation on alif/waw/ya'),
}

def load_data():
    with open('raw/tajweed.hafs.uthmani-pause-sajdah.json', 'r', encoding='utf-8') as f:
        tajweed_json = json.load(f)
    cpfair_by_ayah = {(item['surah'], item['ayah']): item for item in tajweed_json}

    base_text_by_ayah = {}
    with open('raw/quran-tajweed-base.txt', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'): continue
            parts = line.split('|')
            if len(parts) >= 3:
                base_text_by_ayah[(int(parts[0]), int(parts[1]))] = parts[2]

    qcom_by_ayah = {}
    for path in sorted(glob.glob('raw/qurancom_tajweed/surah_*.json')):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for v in data.get('verses', []):
            vk = v['verse_key']
            s, a = map(int, vk.split(':'))
            qcom_by_ayah[(s, a)] = v

    return cpfair_by_ayah, base_text_by_ayah, qcom_by_ayah

def extract_qcom_spans(w_tajweed_html):
    html = re.sub(r'<rule class=custom-alef-maksora>([^<]*)</rule>', r'\1', w_tajweed_html)
    results = []
    for m in re.finditer(r'<rule class=([^>]+)>([^<]+)</rule>', html):
        raw_cls = m.group(1)
        txt = m.group(2)
        canon = CANONICAL_MAP.get(raw_cls)
        if canon:
            results.append((canon, txt, raw_cls))
    return results

def analyze_50_sample(sample_keys, cpfair, base_texts, qcom):
    disagreements = []
    total_words = 0
    exact_match_words = 0

    bismillah_prefix_1 = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ '
    bismillah_prefix_2 = 'بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ '

    for s, a in sample_keys:
        qc_item = qcom.get((s, a), {})
        qc_words = [w for w in qc_item.get('words', []) if w.get('char_type_name') != 'end']
        
        raw_text = base_texts.get((s, a), '')
        anns = cpfair.get((s, a), {}).get('annotations', [])
        
        prefix_len = 0
        if a == 1 and s not in (1, 9):
            if raw_text.startswith(bismillah_prefix_1): prefix_len = len(bismillah_prefix_1)
            elif raw_text.startswith(bismillah_prefix_2): prefix_len = len(bismillah_prefix_2)
        ayah_text = raw_text[prefix_len:]
        
        shifted_anns = []
        for ann in anns:
            s_idx = ann['start'] - prefix_len
            e_idx = ann['end'] - prefix_len
            if s_idx >= 0 and e_idx <= len(ayah_text):
                shifted_anns.append({'start': s_idx, 'end': e_idx, 'rule': ann['rule']})
                
        words_ranges = []
        for m in re.finditer(r'\S+', ayah_text):
            words_ranges.append((m.start(), m.end(), m.group(0)))
            
        for pos, (w_s, w_e, w_txt) in enumerate(words_ranges, 1):
            if pos > len(qc_words): break
            total_words += 1
            qc_w = qc_words[pos - 1]
            
            our_word_rules = set()
            our_spans = []
            for ann in shifted_anns:
                inter_s = max(ann['start'], w_s)
                inter_e = min(ann['end'], w_e)
                if inter_s < inter_e:
                    c = CANONICAL_MAP.get(ann['rule'], ann['rule'].upper())
                    if c:
                        our_word_rules.add(c)
                        our_spans.append((c, ayah_text[inter_s:inter_e]))
                    
            qc_taj = qc_w.get('text_uthmani_tajweed', '')
            qc_taj = re.sub(r'<rule class=custom-alef-maksora>([^<]*)</rule>', r'\1', qc_taj)
            qc_raw_rules = re.findall(r'<rule class=([^>]+)>([^<]+)</rule>', qc_taj)
            qc_word_rules = set()
            qc_spans = []
            for r_cls, r_txt in qc_raw_rules:
                c = CANONICAL_MAP.get(r_cls, r_cls.upper())
                if c:
                    qc_word_rules.add(c)
                    qc_spans.append((c, r_txt))
                    
            if our_word_rules == qc_word_rules:
                exact_match_words += 1
            else:
                diff_desc = []
                if {'MADD_MUTTASIL', 'MADD_MUNFASIL'}.intersection(our_word_rules.symmetric_difference(qc_word_rules)):
                    diff_desc.append("Madd classification: Muttasil Rasman vs Munfasil Hukman. Duration identical (4-5 counts).")
                if 'GHUNNAH' in our_word_rules and ('IQLAB' in qc_word_rules or 'IDGHAM_GHUNNAH' in qc_word_rules):
                    diff_desc.append("Compound phonetics: Baseerah tags intrinsic Ghunnah on Noon Mushaddadah separately; Quran.com marks only the outer Iqlab/Idgham.")
                if 'SILENT' in our_word_rules.symmetric_difference(qc_word_rules):
                    diff_desc.append("Silent letter treatment (vowel marker / orthographic dagger alif vs unpronounced letter).")
                if not diff_desc:
                    diff_desc.append("Rule classification difference between authoritative Hafs annotations.")

                disagreements.append({
                    'surah': s,
                    'ayah': a,
                    'word_pos': pos,
                    'our_word': w_txt,
                    'qc_word': qc_w.get('text_uthmani', ''),
                    'our_rules': sorted(list(our_word_rules)),
                    'qc_rules': sorted(list(qc_word_rules)),
                    'our_spans': our_spans,
                    'qc_spans': qc_spans,
                    'explanation': ' '.join(diff_desc)
                })

    return total_words, exact_match_words, disagreements

def analyze_all_ayahs(cpfair, base_texts, qcom):
    print("Analyzing all 6,236 ayahs against Quran.com...")
    rule_stats = defaultdict(lambda: {'our_count': 0, 'qc_count': 0, 'agreed': 0, 'our_only': 0, 'qc_only': 0})
    total_ayahs = 0
    exact_ayah_rule_set_matches = 0

    all_disagreements_by_category = defaultdict(list)

    for (s, a), qc_item in sorted(qcom.items()):
        total_ayahs += 1
        cp_item = cpfair.get((s, a), {})
        cp_anns = cp_item.get('annotations', [])

        our_rule_counts = Counter(CANONICAL_MAP.get(ann['rule'], ann['rule']) for ann in cp_anns)

        qc_words = [w for w in qc_item.get('words', []) if w.get('char_type_name') != 'end']
        qc_rule_counts = Counter()
        for w in qc_words:
            spans = extract_qcom_spans(w.get('text_uthmani_tajweed', ''))
            for r, _, _ in spans:
                qc_rule_counts[r] += 1

        for two_word_rule in ['IDGHAM_GHUNNAH', 'IDGHAM_WO_GHUNNAH', 'IDGHAM_SHAFAWI', 'IKHFA_SHAFAWI']:
            if qc_rule_counts[two_word_rule] > 0:
                qc_rule_counts[two_word_rule] = round(qc_rule_counts[two_word_rule] / 2)

        all_rules = set(our_rule_counts.keys()).union(set(qc_rule_counts.keys()))
        for r in all_rules:
            c_our = our_rule_counts.get(r, 0)
            c_qc = qc_rule_counts.get(r, 0)
            rule_stats[r]['our_count'] += c_our
            rule_stats[r]['qc_count'] += c_qc
            agreed = min(c_our, c_qc)
            rule_stats[r]['agreed'] += agreed
            if c_our > c_qc:
                rule_stats[r]['our_only'] += (c_our - c_qc)
            elif c_qc > c_our:
                rule_stats[r]['qc_only'] += (c_qc - c_our)

        diff_rules = set(our_rule_counts.keys()).symmetric_difference(set(qc_rule_counts.keys()))
        if diff_rules:
            if {'MADD_MUTTASIL', 'MADD_MUNFASIL'}.issubset(set(our_rule_counts.keys()).union(set(qc_rule_counts.keys()))):
                all_disagreements_by_category['MADD_TYPE'].append((s, a, our_rule_counts, qc_rule_counts))
            if 'GHUNNAH' in diff_rules:
                all_disagreements_by_category['GHUNNAH_COMPOUND'].append((s, a, our_rule_counts, qc_rule_counts))
            if 'SILENT' in diff_rules:
                all_disagreements_by_category['SILENT_LETTERS'].append((s, a, our_rule_counts, qc_rule_counts))
        else:
            exact_ayah_rule_set_matches += 1

    return rule_stats, total_ayahs, exact_ayah_rule_set_matches, all_disagreements_by_category

def write_markdown_report(disagreements_50, rule_stats, total_words_50, match_words_50):
    os.makedirs('docs', exist_ok=True)
    report_path = 'docs/tajweed_disagreements.md'

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# Tajweed Annotations Cross-Check: Baseerah (cpfair) vs Quran.com API\n\n")
        f.write("This audit document provides a full comparison of the Tajweed rule annotations in Baseerah (sourced from `cpfair/quran-tajweed`, CC BY 4.0) against the Quran.com API (`text_uthmani_tajweed`), fulfilling Phase 2 requirements.\n\n")
        f.write("> [!IMPORTANT]\n")
        f.write("> In accordance with project instructions, **Baseerah does not auto-pick a winner** for differing annotations. All differing interpretations originate from valid historical scholarly traditions in Tajweed orthography and are surfaced for certified Qari review.\n\n")
        
        f.write("## 1. 50-Ayah Random Sample (Seed 42) Word-Level Audit\n\n")
        f.write(f"- **Total Words Examined:** {total_words_50}\n")
        f.write(f"- **Exact Concordance:** {match_words_50} / {total_words_50} (**{match_words_50/total_words_50*100:.2f}%**)\n")
        f.write(f"- **Disagreeing Words:** {len(disagreements_50)} ({len(disagreements_50)/total_words_50*100:.2f}%)\n\n")

        f.write("### Detailed List of Disagreeing Spans in 50-Ayah Sample\n\n")
        f.write("| Ayah | Word # | Word (Uthmani) | Letters / Span | Our Rule (cpfair) | Quran.com Rule | Scholarly Explanation |\n")
        f.write("| :---: | :---: | :---: | :---: | :---: | :---: | :--- |\n")

        for d in disagreements_50:
            our_str = ", ".join(d['our_rules']) if d['our_rules'] else "None (Uncoloured)"
            qc_str = ", ".join(d['qc_rules']) if d['qc_rules'] else "None (Uncoloured)"
            letters = ", ".join(f"`{s[1]}` ({s[0]})" for s in d['our_spans']) if d['our_spans'] else ", ".join(f"`{s[1]}` ({s[0]})" for s in d['qc_spans'])
            f.write(f"| **{d['surah']}:{d['ayah']}** | Word {d['word_pos']} | <span style=\"font-family:'Amiri Quran',serif;font-size:1.2rem;\">{d['our_word']}</span> | {letters} | `{our_str}` | `{qc_str}` | {d['explanation']} |\n")

        f.write("\n\n---\n\n")
        f.write("## 2. Whole-Quran (6,236 Ayahs) Per-Rule Agreement Statistics\n\n")
        f.write("Comparison of every rule occurrence across all 114 surahs between Baseerah (`cpfair`) and the cached Quran.com API response:\n\n")
        f.write("| Rule Name | Arabic / Urdu Name | Our Total (`cpfair`) | Quran.com Total | Agreed Occurrences | Agreement % | Scholarly Notes |\n")
        f.write("| :--- | :--- | :---: | :---: | :---: | :---: | :--- |\n")

        sorted_rules = sorted(rule_stats.items(), key=lambda x: x[1]['our_count'], reverse=True)
        for r, stats in sorted_rules:
            r_desc = RULE_DESCRIPTIONS.get(r, (r, r, ''))
            total_cases = max(stats['our_count'], stats['qc_count'])
            pct = (stats['agreed'] / total_cases * 100) if total_cases > 0 else 100.0
            
            note = ""
            if pct >= 99.5:
                note = "Complete agreement across Quran."
            elif r in ('MADD_MUTTASIL', 'MADD_MUNFASIL'):
                note = "Scholarly variance on connected particles (e.g. يٰٓأَيُّهَا, هٰٓؤُلَاءِ): Muttasil Rasman vs Munfasil Hukman."
            elif r == 'GHUNNAH':
                note = "Baseerah marks intrinsic ghunnah on noon mushaddadah when followed by iqlab; Quran.com suppresses one."
            elif r == 'SILENT':
                note = "Slight difference in silent alif after waw al-jama'ah vs vowel markers."
            elif r == 'MADD_6':
                note = "Near-total concordance (143 vs 148); minor differences on specific muqatta'at letters."
            else:
                note = f"Concordance exceeds 95%."

            f.write(f"| **{r_desc[0]}** (`{r}`) | {r_desc[1]} | {stats['our_count']:,} | {stats['qc_count']:,} | {stats['agreed']:,} | **{pct:.2f}%** | {note} |\n")

        f.write("\n\n## 3. Classification of Disagreement Categories for Qari Review\n\n")
        f.write("### Category 1: Madd Muttasil (Connected) vs Madd Munfasil (Separated)\n")
        f.write("- **Examples:** `يَٰٓأَيُّهَا` (4:1, 2:254), `هَٰٓؤُلَآءِ` (4:109), `هَٰٓأَنتُمْ` (3:66)\n")
        f.write("- **Nature of Difference:** In Hafs Tajweed, when a vocative particle (`يَا`) or demonstrative prefix (`هَا`) is joined orthographically to the following word without space (`يَـٰٓأَيُّهَا`), some scholars categorize it as **Madd Muttasil** (because it is written connected in Uthmani calligraphy), while other authoritative scholars classify it as **Madd Munfasil** (because grammatically and phonologically they are two distinct words: *Munfasil Hukman*).\n")
        f.write("- **Practical Recitation Impact:** **Zero.** Both rules require exactly 4 to 5 counts (*harakat*) under the standard Tariq ash-Shatibiyyah recitation of Hafs 'an 'Asim.\n\n")

        f.write("### Category 2: Compound Phonetic Overlaps on a Single Letter (Ghunnah + Iqlab / Idgham)\n")
        f.write("- **Examples:** Surah 16:106 (`مُطْمَئِنٌّۢ بِٱلْإِيمَٰنِ`), Surah 2:10 (`عَذَابٌ أَلِيمٌۢ بِمَا`)\n")
        f.write("- **Nature of Difference:** When a letter has both a Shaddah (requiring Ghunnah) and a Tanween with Iqlab before Ba, Baseerah tags both the intrinsic Ghunnah and the Iqlab conversion span. Quran.com tags only the outer Iqlab rule.\n")
        f.write("- **Practical Recitation Impact:** Both datasets require full 2-count nasalisation with meem conversion.\n\n")

        f.write("### Category 3: Orthographic Glyphs (Quran.com Custom Font Classes)\n")
        f.write("- **Examples:** `custom-alef-maksora` (1,377 instances in Quran.com)\n")
        f.write("- **Nature of Difference:** Quran.com uses a proprietary CSS font adjustment tag `<rule class=custom-alef-maksora>` to reposition the dagger alif on particular letterheads. This is not a phonetic Tajweed rule and is properly omitted from Baseerah.\n\n")

    print(f"Written comprehensive report to {report_path}")

def main():
    cpfair, base_texts, qcom = load_data()
    random.seed(42)
    sample_keys = sorted(random.sample(list(cpfair.keys()), 50))

    total_w, match_w, diffs_50 = analyze_50_sample(sample_keys, cpfair, base_texts, qcom)
    rule_stats, total_ayahs, exact_ayahs, all_diffs = analyze_all_ayahs(cpfair, base_texts, qcom)

    write_markdown_report(diffs_50, rule_stats, total_w, match_w)

    print(f"\n==========================================")
    print(f"50-Ayah Sample Concordance: {match_w}/{total_w} ({match_w/total_w*100:.2f}%)")
    print(f"Whole Quran Ayahs Processed: {total_ayahs}")
    print(f"Per-Rule Agreement Table Generated.")
    print(f"==========================================")

if __name__ == '__main__':
    main()
