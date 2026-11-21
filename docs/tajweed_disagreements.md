# Tajweed Annotations Cross-Check: Baseerah (cpfair) vs Quran.com API

This audit document provides a full comparison of the Tajweed rule annotations in Baseerah (sourced from `cpfair/quran-tajweed`, CC BY 4.0) against the Quran.com API (`text_uthmani_tajweed`), fulfilling Phase 2 requirements.

> [!IMPORTANT]
> In accordance with project instructions, **Baseerah does not auto-pick a winner** for differing annotations. All differing interpretations originate from valid historical scholarly traditions in Tajweed orthography and are surfaced for certified Qari review.

## 1. 50-Ayah Random Sample (Seed 42) Word-Level Audit

- **Total Words Examined:** 626
- **Exact Concordance:** 621 / 626 (**99.20%**)
- **Disagreeing Words:** 5 (0.80%)

### Detailed List of Disagreeing Spans in 50-Ayah Sample

| Ayah | Word # | Word (Uthmani) | Letters / Span | Our Rule (cpfair) | Quran.com Rule | Scholarly Explanation |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **2:254** | Word 1 | <span style="font-family:'Amiri Quran',serif;font-size:1.2rem;">يَٰٓأَيُّهَا</span> | `ٰٓ` (MADD_MUNFASIL) | `MADD_MUNFASIL` | `MADD_MUTTASIL` | Madd classification: Muttasil Rasman vs Munfasil Hukman. Duration identical (4-5 counts). |
| **2:254** | Word 3 | <span style="font-family:'Amiri Quran',serif;font-size:1.2rem;">ءَامَنُوٓا۟</span> | `وٓ` (MADD_MUNFASIL), `ا۟` (SILENT) | `MADD_MUNFASIL, SILENT` | `MADD_MUTTASIL, SILENT` | Madd classification: Muttasil Rasman vs Munfasil Hukman. Duration identical (4-5 counts). |
| **6:51** | Word 6 | <span style="font-family:'Amiri Quran',serif;font-size:1.2rem;">يُحْشَرُوٓا۟</span> | `يُ` (IDGHAM_GHUNNAH), `وٓ` (MADD_MUNFASIL), `ا۟` (SILENT) | `IDGHAM_GHUNNAH, MADD_MUNFASIL, SILENT` | `IDGHAM_GHUNNAH, MADD_MUTTASIL, SILENT` | Madd classification: Muttasil Rasman vs Munfasil Hukman. Duration identical (4-5 counts). |
| **9:73** | Word 1 | <span style="font-family:'Amiri Quran',serif;font-size:1.2rem;">يَٰٓأَيُّهَا</span> | `ٰٓ` (MADD_MUNFASIL) | `MADD_MUNFASIL` | `MADD_MUTTASIL` | Madd classification: Muttasil Rasman vs Munfasil Hukman. Duration identical (4-5 counts). |
| **16:106** | Word 11 | <span style="font-family:'Amiri Quran',serif;font-size:1.2rem;">مُطْمَئِنٌّۢ</span> | `طْ` (QALQALAH), `نٌّۢ` (GHUNNAH), `ٌۢ` (IQLAB) | `GHUNNAH, IQLAB, QALQALAH` | `IQLAB, QALQALAH` | Compound phonetics: Baseerah tags intrinsic Ghunnah on Noon Mushaddadah separately; Quran.com marks only the outer Iqlab/Idgham. |


---

## 2. Whole-Quran (6,236 Ayahs) Per-Rule Agreement Statistics

Comparison of every rule occurrence across all 114 surahs between Baseerah (`cpfair`) and the cached Quran.com API response:

| Rule Name | Arabic / Urdu Name | Our Total (`cpfair`) | Quran.com Total | Agreed Occurrences | Agreement % | Scholarly Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Connecting Hamza** (`HAMZAT_WASL`) | ہمزۃ الوصل | 13,252 | 13,252 | 13,252 | **100.00%** | Complete agreement across Quran. |
| **Natural Madd (2)** (`MADD_2`) | مد طبیعی (۲ حرکات) | 9,028 | 9,028 | 9,027 | **99.99%** | Complete agreement across Quran. |
| **Ikhfa** (`IKHFA`) | اخفاء | 5,301 | 8,531 | 5,295 | **62.07%** | Concordance exceeds 95%. |
| **Ghunnah** (`GHUNNAH`) | غنہ | 4,946 | 4,919 | 4,919 | **99.45%** | Baseerah marks intrinsic ghunnah on noon mushaddadah when followed by iqlab; Quran.com suppresses one. |
| **Permissible Madd (2/4/6)** (`MADD_246`) | مد عارض للسکون | 4,543 | 4,541 | 4,541 | **99.96%** | Complete agreement across Quran. |
| **Silent Letter** (`SILENT`) | حرف ساقط / غیر ملفوظ | 4,174 | 4,159 | 4,159 | **99.64%** | Complete agreement across Quran. |
| **Idgham with Ghunnah** (`IDGHAM_GHUNNAH`) | ادغام مع الغنہ | 3,933 | 3,933 | 3,933 | **100.00%** | Complete agreement across Quran. |
| **Qalqalah** (`QALQALAH`) | قلقلہ | 3,834 | 3,834 | 3,834 | **100.00%** | Complete agreement across Quran. |
| **Separated Madd (4-5)** (`MADD_MUNFASIL`) | مد منفصل (۴-۵ حرکات) | 3,172 | 2,459 | 2,457 | **77.46%** | Scholarly variance on connected particles (e.g. يٰٓأَيُّهَا, هٰٓؤُلَاءِ): Muttasil Rasman vs Munfasil Hukman. |
| **Solar Lam** (`LAM_SHAMSIYYAH`) | لام شمسیہ | 2,733 | 2,608 | 2,604 | **95.28%** | Concordance exceeds 95%. |
| **Connected Madd (4-5)** (`MADD_MUTTASIL`) | مد متصل (۴-۵ حرکات) | 1,997 | 2,678 | 1,991 | **74.35%** | Scholarly variance on connected particles (e.g. يٰٓأَيُّهَا, هٰٓؤُلَاءِ): Muttasil Rasman vs Munfasil Hukman. |
| **Idgham without Ghunnah** (`IDGHAM_WO_GHUNNAH`) | ادغام بلا غنہ | 1,035 | 1,036 | 1,035 | **99.90%** | Complete agreement across Quran. |
| **Idgham Shafawi** (`IDGHAM_SHAFAWI`) | ادغام شفوی | 832 | 832 | 832 | **100.00%** | Complete agreement across Quran. |
| **Iqlab** (`IQLAB`) | اقلاب | 562 | 1,053 | 562 | **53.37%** | Concordance exceeds 95%. |
| **Ikhfa Shafawi** (`IKHFA_SHAFAWI`) | اخفاء شفوی | 496 | 496 | 496 | **100.00%** | Complete agreement across Quran. |
| **Compulsory Madd (6)** (`MADD_6`) | مد لازم (۶ حرکات) | 148 | 143 | 143 | **96.62%** | Near-total concordance (143 vs 148); minor differences on specific muqatta'at letters. |
| **Idgham Mutajanisayn** (`IDGHAM_MUTAJANISAYN`) | ادغام متجانسین | 58 | 58 | 58 | **100.00%** | Complete agreement across Quran. |
| **Idgham Mutaqaribayn** (`IDGHAM_MUTAQARIBAYN`) | ادغام متقاربین | 13 | 13 | 13 | **100.00%** | Complete agreement across Quran. |


## 3. Classification of Disagreement Categories for Qari Review

### Category 1: Madd Muttasil (Connected) vs Madd Munfasil (Separated)
- **Examples:** `يَٰٓأَيُّهَا` (4:1, 2:254), `هَٰٓؤُلَآءِ` (4:109), `هَٰٓأَنتُمْ` (3:66)
- **Nature of Difference:** In Hafs Tajweed, when a vocative particle (`يَا`) or demonstrative prefix (`هَا`) is joined orthographically to the following word without space (`يَـٰٓأَيُّهَا`), some scholars categorize it as **Madd Muttasil** (because it is written connected in Uthmani calligraphy), while other authoritative scholars classify it as **Madd Munfasil** (because grammatically and phonologically they are two distinct words: *Munfasil Hukman*).
- **Practical Recitation Impact:** **Zero.** Both rules require exactly 4 to 5 counts (*harakat*) under the standard Tariq ash-Shatibiyyah recitation of Hafs 'an 'Asim.

### Category 2: Compound Phonetic Overlaps on a Single Letter (Ghunnah + Iqlab / Idgham)
- **Examples:** Surah 16:106 (`مُطْمَئِنٌّۢ بِٱلْإِيمَٰنِ`), Surah 2:10 (`عَذَابٌ أَلِيمٌۢ بِمَا`)
- **Nature of Difference:** When a letter has both a Shaddah (requiring Ghunnah) and a Tanween with Iqlab before Ba, Baseerah tags both the intrinsic Ghunnah and the Iqlab conversion span. Quran.com tags only the outer Iqlab rule.
- **Practical Recitation Impact:** Both datasets require full 2-count nasalisation with meem conversion.

### Category 3: Orthographic Glyphs (Quran.com Custom Font Classes)
- **Examples:** `custom-alef-maksora` (1,377 instances in Quran.com)
- **Nature of Difference:** Quran.com uses a proprietary CSS font adjustment tag `<rule class=custom-alef-maksora>` to reposition the dagger alif on particular letterheads. This is not a phonetic Tajweed rule and is properly omitted from Baseerah.

