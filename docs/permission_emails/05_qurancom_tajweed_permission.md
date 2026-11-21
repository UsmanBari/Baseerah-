# Commercial Permission Request — Quran Foundation / Quran.com API

**To:** support@quran.com / Quran Foundation Legal & Partnerships  
**From:** Usman Bari (Lead Developer, Acme One / Baseerah Project)  
**Subject:** Permission & License Clarification for Commercial Mosque Kiosk — Baseerah (بصيرة)  
**Date:** 2026-11-21  

---

Dear Quran.com / Quran Foundation Team,

Assalamu Alaikum wa Rahmatullah,

We are developing **Baseerah (بصيرة)**, an interactive, standalone digital Quran and Namaz learning kiosk specifically engineered for mosques, Islamic educational centers, and community prayer halls across Pakistan and internationally. Baseerah offers worshippers word-by-word Quranic learning, authenticated multi-language translations (Urdu and English), full-surah audio recitation, and authentic Dar al-Maarifah-style Tajweed colour-coding.

Baseerah will be provided to mosques as dedicated hardware kiosks and an accompanying educational web application. Because commercial kiosks involve hardware procurement, deployment, and ongoing maintenance, we adhere strictly to intellectual property compliance and licensing transparency.

We are writing to formally clarify licensing and request permission for the following assets:

### 1. Requested Assets
1. **Tajweed Text Annotations (`text_uthmani_tajweed`):**
   - Ayah-level and word-level Uthmani Hafs text with semantic Tajweed markup tags (`<rule class="...">` / `<tajweed class="...">`), derived from the open-source Tajweed parsing datasets (`cpfair/quran-tajweed` / Quran.com API v4).
   - Bundling into our local offline application bundle for standalone kiosk operation.
2. **Word-by-Word Audio Syllables (`audio.qurancdn.com/wbw`):**
   - Caching or streaming word-level pronunciation audio clips for individual words during interactive touch learning.
3. **Surah & Ayah Factual Metadata:**
   - Standard chapter metadata, ayah counts, revelation places, and page numbers.

### 2. Our Commitments to Quran Foundation
In appreciation and support of Quran Foundation's groundbreaking digital seva for the Ummah, Baseerah commits to:
- **Prominent Attribution:** Display clear, permanent credit to "Quran Foundation / Quran.com" in the kiosk's "About & Credits" panel, on-screen footer, and documentation.
- **Text Sanctity & Integrity:** Absolute fidelity to the Quranic text without any alteration, omission, or unauthorized manipulation. All text is verified with cryptographic checksums against standard Hafs prints.
- **Commercial Clarity:** Baseerah kiosks are designed solely for educational, non-advertisement, respectful mosque environments. No third-party advertisements or unvetted content will ever appear.

Could you kindly confirm that:
1. Bundling and local offline caching of the `text_uthmani_tajweed` dataset is permitted for this kiosk deployment under standard attribution terms?
2. If a formal partnership agreement, API key tier, or written commercial license is required, please guide us on the appropriate steps.

Jazakum Allahu Khairan for your tireless service to the Quran and the global Ummah. We look forward to your positive response.

With sincere regards,

**Usman Bari**  
Lead Engineer, Baseerah Project  
Acme One Software  
Contact: [usman.bari@example.com]  
Lahore, Pakistan  
