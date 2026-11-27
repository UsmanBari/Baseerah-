#!/usr/bin/env python3
"""
scripts/build_metadata.py
Parses raw/tanzil-quran-data.xml to generate lean data/metadata.js (< 5 KB) and data/metadata_extended.js
Includes 30 Juz and 15 Sajdas for instant startup.
Rukus and Hizbs are stored in data/metadata_extended.js for on-demand loading.
"""
import os
import json
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

JUZ_NAMES_AR = [
    "الم", "سَيَقُولُ", "تِلْكَ الرُّسُلُ", "لَنْ تَنَالُوا", "وَالْمُحْصَنَاتُ",
    "لَا يُحِبُّ اللَّهُ", "وَإِذَا سَمِعُوا", "وَلَوْ أَنَّنَا", "قَالَ الْمَلَأُ", "وَاعْلَمُوا",
    "يَعْتَذِرُونَ", "وَمَا مِنْ دَابَّةٍ", "وَمَا أُبَرِّئُ", "رُبَمَا", "سُبْحَانَ الَّذِي",
    "قَالَ أَلَمْ", "اقْتَرَبَ لِلنَّاسِ", "قَدْ أَفْلَحَ", "وَقَالَ الَّذِينَ", "أَمَّنْ خَلَقَ",
    "اتْلُ مَا أُوحِيَ", "وَمَنْ يَقْنُتْ", "وَمَا لِيَ", "فَمَنْ أَظْلَمُ", "إِلَيْهِ يُرَدُّ",
    "حم", "قَالَ فَمَا خَطْبُكُمْ", "قَدْ سَمِعَ اللَّهُ", "تَبَارَكَ الَّذِي", "عَمَّ يَتَسَاءَلُونَ"
]

JUZ_NAMES_UR = [
    "الم", "سیقول", "تلك الرسل", "لن تنالوا", "والمحصنات",
    "لا يحب الله", "وإذا سمعوا", "ولو أننا", "قال الملأ", "واعلموا",
    "يعتذرون", "وما من دابة", "وما أبرئ", "ربما", "سبحان الذي",
    "قال ألم", "اقترب للناس", "قد أفلح", "وقال الذين", "أمن خلق",
    "اتل ما أوحي", "ومن يقنت", "وما لي", "فمن أظلم", "إليه يرد",
    "حم", "قال فما خطبكم", "قد سمع الله", "تبارك الذي", "عم يتساءلون"
]

def parse_tanzil_metadata():
    xml_path = os.path.join(BASE_DIR, 'raw', 'tanzil-quran-data.xml')
    tree = ET.parse(xml_path)
    root = tree.getroot()

    # Surahs
    suras_el = root.find('suras')
    total_ayahs = 0
    sura_ayah_counts = {}
    for s in suras_el:
        idx = int(s.attrib['index'])
        ayas = int(s.attrib['ayas'])
        sura_ayah_counts[idx] = ayas
        total_ayahs += ayas

    # Juzs
    juzs_el = root.find('juzs')
    juzs_raw = []
    for j in juzs_el:
        juzs_raw.append({
            'index': int(j.attrib['index']),
            'sura': int(j.attrib['sura']),
            'aya': int(j.attrib['aya'])
        })

    juzs = []
    for i, j in enumerate(juzs_raw):
        idx = j['index']
        start = {'surah': j['sura'], 'ayah': j['aya']}
        if i < len(juzs_raw) - 1:
            nxt = juzs_raw[i + 1]
            if nxt['aya'] > 1:
                end = {'surah': nxt['sura'], 'ayah': nxt['aya'] - 1}
            else:
                prev_sura = nxt['sura'] - 1
                end = {'surah': prev_sura, 'ayah': sura_ayah_counts[prev_sura]}
        else:
            end = {'surah': 114, 'ayah': 6}

        juzs.append({
            'number': idx,
            'start': start,
            'end': end,
            'nameAr': JUZ_NAMES_AR[idx - 1],
            'nameUr': JUZ_NAMES_UR[idx - 1],
            'nameEn': f"Juz {idx}"
        })

    # Sajdas (15 total)
    sajdas_el = root.find('sajdas')
    sajdas = []
    sajda_by_ayah = {}
    for s in sajdas_el:
        idx = int(s.attrib['index'])
        sura = int(s.attrib['sura'])
        aya = int(s.attrib['aya'])
        s_type = s.attrib['type']
        item = {
            'index': idx,
            'surah': sura,
            'ayah': aya,
            'type': s_type,
            'typeUr': 'واجب' if s_type == 'obligatory' else 'مستحب',
            'typeEn': s_type.capitalize()
        }
        sajdas.append(item)
        sajda_by_ayah[f"{sura}:{aya}"] = item

    # Extended: Hizbs (60 full hizbs)
    hizbs_el = root.find('hizbs')
    hizbs_quarters = []
    for h in hizbs_el:
        hizbs_quarters.append({
            'index': int(h.attrib['index']),
            'sura': int(h.attrib['sura']),
            'aya': int(h.attrib['aya'])
        })

    hizbs_60 = []
    for h_num in range(1, 61):
        q_idx = (h_num - 1) * 4
        start_q = hizbs_quarters[q_idx]
        if h_num < 60:
            nxt_q = hizbs_quarters[h_num * 4]
            if nxt_q['aya'] > 1:
                end = {'surah': nxt_q['sura'], 'ayah': nxt_q['aya'] - 1}
            else:
                prev_sura = nxt_q['sura'] - 1
                end = {'surah': prev_sura, 'ayah': sura_ayah_counts[prev_sura]}
        else:
            end = {'surah': 114, 'ayah': 6}

        hizbs_60.append({
            'number': h_num,
            'start': {'surah': start_q['sura'], 'ayah': start_q['aya']},
            'end': end,
            'nameEn': f"Hizb {h_num}"
        })

    # Extended: Rukus (556 total)
    rukus_el = root.find('rukus')
    rukus = []
    for r in rukus_el:
        rukus.append({
            'index': int(r.attrib['index']),
            'surah': int(r.attrib['sura']),
            'ayah': int(r.attrib['aya'])
        })

    # Write lean data/metadata.js
    metadata_out = os.path.join(BASE_DIR, 'data', 'metadata.js')
    with open(metadata_out, 'w', encoding='utf-8') as f:
        f.write('/* Baseerah Lean Metadata (30 Juz, 15 Sajdas, O(1) Proxy Lookup) - Tanzil CC BY 3.0 */\n')
        f.write('(function() {\n')
        f.write('  var juzs = ')
        json.dump(juzs, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
        f.write('  var sajdaByAyah = ')
        json.dump(sajda_by_ayah, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
        f.write('  var sajdas = ')
        json.dump(sajdas, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
        f.write('''
  function getJuzForAyah(s, a) {
    for (var i = juzs.length - 1; i >= 0; i--) {
      var st = juzs[i].start;
      if (s > st.surah || (s === st.surah && a >= st.ayah)) {
        return juzs[i].number;
      }
    }
    return 1;
  }

  var ayahToJuzProxy = new Proxy({}, {
    get: function(_, key) {
      if (typeof key !== 'string') return undefined;
      var p = key.split(':');
      if (p.length === 2) return getJuzForAyah(parseInt(p[0], 10), parseInt(p[1], 10));
      return undefined;
    }
  });

  window.BASEERAH_METADATA = {
    juzs: juzs,
    sajdas: sajdas,
    sajdaByAyah: sajdaByAyah,
    getJuzForAyah: getJuzForAyah,
    ayahToJuz: ayahToJuzProxy
  };
})();
''')

    # Write data/metadata_extended.js
    extended_out = os.path.join(BASE_DIR, 'data', 'metadata_extended.js')
    with open(extended_out, 'w', encoding='utf-8') as f:
        f.write('/* Baseerah Extended Tanzil Metadata (60 Hizbs, 556 Rukus) */\n')
        f.write('window.BASEERAH_METADATA_EXTENDED = {\n')
        f.write('  hizbs: ')
        json.dump(hizbs_60, f, ensure_ascii=False, separators=(',', ':'))
        f.write(',\n  rukus: ')
        json.dump(rukus, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n};\n')

    print(f"Generated lean metadata at {metadata_out} ({os.path.getsize(metadata_out)/1024:.1f} KB)")
    print(f"Generated extended metadata at {extended_out} ({os.path.getsize(extended_out)/1024:.1f} KB)")

if __name__ == '__main__':
    parse_tanzil_metadata()
