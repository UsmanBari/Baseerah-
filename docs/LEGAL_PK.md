# Pakistan Legal Framework: Quran Publishing, Electronic Recording & Board Review

**Notice:** *This document provides factual research and regulatory analysis for operational planning. It does NOT constitute formal legal advice. Acme One must confirm all compliance requirements with certified legal counsel and the respective provincial Auqaf and Religious Affairs Departments prior to public deployment.*

---

## 1. Statutory Framework

### A. The Punjab Holy Quran (Printing and Recording) Act 2011 (Amended 2018 & 2021)
- **Official Citation:** Punjab Act II of 2011 (Amended by Act XXVI of 2018 and Act XXXVIII of 2021).
- **Enforcing Authority:** Government of the Punjab, Auqaf and Religious Affairs Department, through the **Punjab Quran Board** (operating under the Muttahida Ulema Board).
- **Core Provisions:**
  1. **Mandatory Registration (Section 3):** No person or entity shall publish, print, or electronically record the Holy Quran without prior registration with the Quran Board / Auqaf Department.
  2. **Prohibition of Error (Section 4):** A publisher or electronic recorder must ensure that the Arabic text of the Holy Quran is free of any printing, typographical, or technical error.
  3. **Mandatory Proofreading by Certified Committee (Section 5):** Every text or recording must be proofread and verified by certified Qur'an Proofreaders (certified Huffaz-e-Quran approved by the Board).
  4. **NOC & Certificate of Error-Free Copy (Section 6):** Prior to releasing any copy to the public, the publisher must submit copies/proofs to the Quran Board and obtain an official Certificate of Error-Free Text.
  5. **Penalty for Unauthorized Electronic Recording (Section 8/9):** Severe penal sanctions (including imprisonment and fines) apply to unauthorized, error-containing, or unvetted digital or physical copies.

### B. Lahore High Court Landmark Judgments on E-Copies of the Holy Quran
- **Key Reference:** *Writ Petition No. 25052/2017 & W.P. No. 44588/2019 (Hassan Muawiya vs. Federation of Pakistan & Others)*.
- **Court Mandate:**
  - The Lahore High Court ruled that digital applications, websites, audio recordings, software, and kiosk hardware displaying the Holy Quran fall strictly under the definition of "Electronic Recording" under the 2011 Act.
  - The Court directed the Pakistan Telecommunication Authority (PTA), Federal Investigation Agency (FIA), and the Punjab Quran Board to actively monitor digital Quranic applications and ensure that uncertified digital copies are restrained from public distribution.
  - Any corporate entity or technology provider deploying Quran software on public terminals (such as mosque kiosks) must obtain certification from the provincial Quran Board.

---

## 2. Provincial & Federal Quran Boards Landscape

| Jurisdiction | Governing Legislation / Authority | Status & Requirement for Mosque Kiosks |
|---|---|---|
| **Punjab** | Punjab Quran Board / Auqaf Department (Act of 2011 / 2021) | **MANDATORY:** Certificate of Error-Free Text and publisher registration required before placement in any Punjab mosque. |
| **Khyber Pakhtunkhwa (KP)** | KP Holy Quran (Printing, Recording and Disposal of Damaged Pages) Act 2014 | **MANDATORY:** KP Quran Board vetting required for distribution. |
| **Sindh** | Sindh Holy Quran (Printing, Recording and Quality Control) Act | Mandatory registration with Sindh Auqaf Department and Quran Committee. |
| **Balochistan** | Balochistan Quran Board Regulations | Approval required through provincial Religious Affairs directorate. |
| **Federal / Islamabad (ICT)** | Ministry of Religious Affairs and Interfaith Harmony / National Quran Council | Federal oversight for nationwide digital platforms. |

---

## 3. Compliance Roadmap for Acme One

Before deploying Baseerah kiosks in mosques and public spaces in Punjab and other provinces, Acme One must execute the following statutory steps:

1. **Publisher Registration:** Register Acme One with the Punjab Auqaf and Religious Affairs Department as an electronic publisher/distributor of Islamic educational software.
2. **Internal Proofreading Protocol:** Employ certified Huffaz-e-Quran to execute an exhaustive verification using Baseerah's dedicated review suite (`review.html`).
3. **Submission for Quran Board Review:**
   - Generate the complete, continuous manuscript using Baseerah's automated Board Export tool (`python scripts/export_for_board.py`).
   - Submit the complete printed manuscript along with the digital kiosk APK/browser build to the Punjab Quran Board.
4. **Obtaining Official NOC / Seal of Approval:**
   - Receive the formal Certificate of Error-Free Text from the Punjab Quran Board.
   - Display the official Quran Board Registration Number and Certificate Seal within the kiosk's "About & Legal" interface.
5. **District Auqaf Approvals:** For placement inside Auqaf-administered Jamia Masjids, present the Quran Board certificate to the Zonal Auqaf Administrator.

---

## 4. Verification Export Tool

To facilitate statutory review by the Quran Board and certified Huffaz, Baseerah includes an automated export utility:
```bash
python scripts/export_for_board.py
```
This utility generates a standardized, printable proofing document displaying the complete Indo-Pak Nastaleeq text with ayah markers, surah headings, and Maulana Junagarhi's Urdu translation, prepared strictly in compliance with Punjab Quran Board formatting norms.
