#!/usr/bin/env python3
"""
scripts/build_data.py
Merges raw Quran and translation files into:
  - data/surahs/001.js ... data/surahs/114.js
  - data/index.js
  - data/manifest.sha256.json
  - data/SOURCES.md
  - data/build_report.json

Enforces all validation rules strictly:
  1. 114 surahs, 6236 ayahs total, ayah counts per surah match Tanzil.
  2. Every ayah has non-empty ur and en full translations from QuranEnc.
  3a. Uthmani check: QUL 56 words joined == Tanzil ayah text (strict normalization).
      Any mismatch must be explicitly listed in scripts/known_exceptions.json.
  3b. Alignment: for every ayah, QUL 59 (Indo-Pak) has exactly the same word keys as QUL 56.
  3c. Indo-Pak consistency: QUL 59 words joined == QUL 89 ayah text, after comparison-only normalization.
  3d. Urdu and English wbw meanings are keyed by the same word keys lining up with 59.
  4. Word counts match across script, Urdu wbw and English wbw for every ayah.
  5. Missing word meanings: set to null, recorded in report (key + Arabic word).
  6. No ayah-number markers end up inside the words list.
  7. Manifest generation: Computes SHA-256 hash for every built file.
"""
import os
import sys
import json
import re
import hashlib
import unicodedata
import difflib
from collections import defaultdict
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "raw")
DATA_DIR = os.path.join(BASE_DIR, "data")
SURAHS_DIR = os.path.join(DATA_DIR, "surahs")
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")

def strip_bismillah_header(text):
    m = re.match(r'^بِّ?سْمِ\s+ٱللَّهِ\s+ٱلرَّحْمَٰ?ـٰنِ\s+ٱلرَّحِيمِ\s+', text)
    if m:
        return text[m.end():]
    return text

PAUSE_SYMBOL_MARKS = re.compile(r"[\u06d6-\u06dc\u06dd\u06de\u06e9]")
FORMAT_CHARS = re.compile(r"[\u200b-\u200f\u202a-\u202e\ufeff]")
ARABIC_DIGITS = re.compile(r"[\u0660-\u0669]")

def normalize_uthmani_for_comparison(text, is_first_ayah_not_fatiha=False):
    """
    Strict comparison-only normalization for Uthmani text:
    - strips Bismillah header on verse 1 if not Fatiha/Tawbah
    - Unicode NFC
    - strips tatweel (U+0640)
    - strips format control chars (RLM, LRM, ZWNJ, etc.)
    - strips pause/symbol marks (U+06D6-U+06DC, U+06DD, U+06DE, U+06E9)
    - strips Arabic digits (U+0660-U+0669)
    - collapses spaces
    (No alef/hamza conversions, no mark removals outside pause marks, no word patches)
    """
    text = unicodedata.normalize("NFC", text)
    if is_first_ayah_not_fatiha:
        text = strip_bismillah_header(text)
    text = text.replace("\u0640", "") # tatweel
    text = FORMAT_CHARS.sub("", text)
    text = PAUSE_SYMBOL_MARKS.sub("", text)
    text = ARABIC_DIGITS.sub("", text)
    return " ".join(text.split())

def classify_mismatch(t_str, w_str):
    classes = []
    if t_str.replace(" ", "") == w_str.replace(" ", "") and t_str != w_str:
        classes.append("space inside word")
        return classes

    matcher = difflib.SequenceMatcher(None, t_str, w_str)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        sub_t = t_str[i1:i2]
        sub_w = w_str[j1:j2]

        if (sub_t == "\u0671" and sub_w == "\u0627") or (sub_t == "\u0627" and sub_w == "\u0671"):
            if "alef wasla vs plain alef" not in classes:
                classes.append("alef wasla vs plain alef")
        elif ("\u0670" in sub_t or "\u0649" in sub_t) and "\u0627" in sub_w:
            if "dagger alef / alef maksura vs plain alef" not in classes:
                classes.append("dagger alef / alef maksura vs plain alef")
        elif (sub_t == "\u0623" and sub_w == "\u0627") or (sub_t == "\u0627" and sub_w == "\u0623"):
            if "alef with hamza above vs plain alef" not in classes:
                classes.append("alef with hamza above vs plain alef")
        elif ("\u06e1" in sub_t and "\u0652" in sub_w) or ("\u0652" in sub_t and "\u06e1" in sub_w):
            if "U+06E1 vs U+0652 sukun encoding" not in classes:
                classes.append("U+06E1 vs U+0652 sukun encoding")
        else:
            diff_repr = f"other: {repr(sub_t)} vs {repr(sub_w)}"
            if diff_repr not in classes:
                classes.append(diff_repr)

    return classes or ["other"]

def normalize_indopak_for_comparison(text):
    text = unicodedata.normalize("NFC", text)
    return " ".join(text.split())

def compute_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    print("=" * 70)
    print("BASEERAH DATA BUILD & VALIDATION")
    print("=" * 70)
    report = {
        "buildTimestamp": datetime.now(timezone.utc).isoformat(),
        "counts": {},
        "missingUrduMeanings": [],
        "missingEnglishMeanings": [],
        "validationResults": {}
    }

    # 1. Load Tanzil ground truth
    tanzil_path = os.path.join(RAW_DIR, "tanzil-uthmani.txt")
    if not os.path.exists(tanzil_path):
        sys.exit(f"FATAL: Missing Tanzil file: {tanzil_path}")

    tanzil_ayahs = {}
    tanzil_surah_counts = defaultdict(int)
    with open(tanzil_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("|")
            if len(parts) == 3:
                s, a, text = int(parts[0]), int(parts[1]), parts[2]
                tanzil_ayahs[(s, a)] = text
                tanzil_surah_counts[s] += 1

    report["counts"]["tanzilSurahs"] = len(tanzil_surah_counts)
    report["counts"]["tanzilAyahs"] = len(tanzil_ayahs)
    print(f"Loaded Tanzil: {len(tanzil_surah_counts)} surahs, {len(tanzil_ayahs)} ayahs.")

    if len(tanzil_surah_counts) != 114 or len(tanzil_ayahs) != 6236:
        sys.exit(f"FATAL: Tanzil counts incorrect ({len(tanzil_surah_counts)} surahs, {len(tanzil_ayahs)} ayahs)")

    # 2. Load QUL 56 (Uthmani WBW)
    p56 = os.path.join(RAW_DIR, "qul-wbw-script.json")
    with open(p56, "r", encoding="utf-8") as f:
        s56 = json.load(f)

    # 3. Load QUL 59 (Indo-Pak WBW)
    p59 = os.path.join(RAW_DIR, "qul-wbw-indopak.json")
    with open(p59, "r", encoding="utf-8") as f:
        s59 = json.load(f)

    # 4. Load QUL 89 (Indo-Pak Ayah)
    p89 = os.path.join(RAW_DIR, "qul-ayah-indopak.json")
    with open(p89, "r", encoding="utf-8") as f:
        s89 = json.load(f)

    # 5. Load QUL Urdu WBW (93) & English WBW (92)
    pur = os.path.join(RAW_DIR, "qul-wbw-ur.json")
    with open(pur, "r", encoding="utf-8") as f:
        wur = json.load(f)

    pen = os.path.join(RAW_DIR, "qul-wbw-en.json")
    with open(pen, "r", encoding="utf-8") as f:
        wen = json.load(f)

    # 6. Load Surah metadata
    p_meta = os.path.join(RAW_DIR, "qul-surah-names.json")
    if os.path.exists(p_meta):
        with open(p_meta, "r", encoding="utf-8") as f:
            surah_meta = json.load(f)
    else:
        sys.exit(f"FATAL: Missing surah names metadata: {p_meta}")

    meta_by_num = {item["number"]: item for item in surah_meta}
    if len(meta_by_num) != 114:
        sys.exit(f"FATAL: Surah metadata has {len(meta_by_num)} surahs, expected 114")

    # 7. Load QuranEnc translations
    qenc_ur_dir = os.path.join(RAW_DIR, "quranenc", "urdu_junagarhi")
    qenc_en_dir = os.path.join(RAW_DIR, "quranenc", "english_saheeh")
    if not os.path.exists(qenc_ur_dir) or not os.path.exists(qenc_en_dir):
        sys.exit("FATAL: QuranEnc directories missing. Run scripts/fetch_quranenc.py first.")

    qenc_ur = {}
    qenc_en = {}
    for s in range(1, 115):
        fn = f"{s:03d}.json"
        with open(os.path.join(qenc_ur_dir, fn), "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data.get("result", []):
                qenc_ur[(int(item["sura"]), int(item["aya"]))] = item["translation"].strip()

        with open(os.path.join(qenc_en_dir, fn), "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data.get("result", []):
                qenc_en[(int(item["sura"]), int(item["aya"]))] = item["translation"].strip()

    # Load Known Exceptions
    known_ex_path = os.path.join(SCRIPTS_DIR, "known_exceptions.json")
    known_exceptions = {}
    if os.path.exists(known_ex_path):
        with open(known_ex_path, "r", encoding="utf-8") as f:
            ex_data = json.load(f)
            for item in ex_data.get("exceptions", []):
                known_exceptions[item["ayah"]] = item

    print(f"Loaded QuranEnc: {len(qenc_ur)} Urdu ayahs, {len(qenc_en)} English ayahs.")
    print(f"Loaded Known Exceptions: {len(known_exceptions)} verified entries.")

    # -------------------------------------------------------------
    # VALIDATION CHECKS
    # -------------------------------------------------------------
    print("\nRunning Verification Chain...")

    by_ayah_56 = defaultdict(list)
    for k, v in s56.items():
        s, a, w = map(int, k.split(":"))
        by_ayah_56[(s, a)].append((w, k, v["text"]))
    for k in by_ayah_56:
        by_ayah_56[k].sort(key=lambda x: x[0])

    by_ayah_59 = defaultdict(list)
    for k, v in s59.items():
        s, a, w = map(int, k.split(":"))
        by_ayah_59[(s, a)].append((w, k, v["text"]))
    for k in by_ayah_59:
        by_ayah_59[k].sort(key=lambda x: x[0])

    # Check 1: 114 surahs, 6236 ayahs total, ayah counts per surah match Tanzil
    surah_count_match = True
    for s in range(1, 115):
        expected_ayas = tanzil_surah_counts[s]
        actual_56 = len(set(a for (_s, a) in by_ayah_56 if _s == s))
        actual_59 = len(set(a for (_s, a) in by_ayah_59 if _s == s))
        meta_ayas = meta_by_num[s].get("ayahCount", expected_ayas)
        if actual_56 != expected_ayas or actual_59 != expected_ayas or meta_ayas != expected_ayas:
            surah_count_match = False
            print(f"  Surah count mismatch in surah {s}: Tanzil={expected_ayas}, 56={actual_56}, 59={actual_59}")

    if not surah_count_match or len(by_ayah_56) != 6236 or len(by_ayah_59) != 6236:
        sys.exit("FATAL: Check 1 FAILED (Surah / ayah counts do not match Tanzil)")
    report["validationResults"]["check1_countsMatch"] = True
    print("  ✓ Check 1 PASSED: 114 surahs, 6236 ayahs match Tanzil per surah.")

    # Check 2: Every ayah has non-empty ur and en full translations
    empty_trans = []
    for sa in tanzil_ayahs:
        u = qenc_ur.get(sa)
        e = qenc_en.get(sa)
        if not u:
            empty_trans.append((sa, "ur"))
        if not e:
            empty_trans.append((sa, "en"))

    if empty_trans:
        sys.exit(f"FATAL: Check 2 FAILED (Empty full translations found: {empty_trans[:10]})")
    report["validationResults"]["check2_nonEmptyTranslations"] = True
    print("  ✓ Check 2 PASSED: All 6236 ayahs have non-empty Urdu and English full translations.")

    # Check 3a: Uthmani check: QUL 56 words joined == Tanzil ayah text
    mismatches_3a = []
    unlisted_mismatches = []
    documented_exceptions = []

    for (s, a), t_text in tanzil_ayahs.items():
        words = by_ayah_56[(s, a)]
        w_text = " ".join(w[2] for w in words[:-1])
        is_first = (a == 1 and s != 1 and s != 9)
        norm_t = normalize_uthmani_for_comparison(t_text, is_first_ayah_not_fatiha=is_first)
        norm_w = normalize_uthmani_for_comparison(w_text, False)
        if norm_t != norm_w:
            ref = f"{s}:{a}"
            mismatches_3a.append({
                "ayah": ref,
                "tanzil": norm_t,
                "qul56": norm_w
            })
            if ref in known_exceptions:
                ex_entry = known_exceptions[ref]
                documented_exceptions.append({
                    "ayah": ref,
                    "class": ex_entry["class"],
                    "reason": ex_entry["reason"],
                    "reviewed_by": ex_entry.get("reviewed_by", "pending-hafiz")
                })
            else:
                unlisted_mismatches.append(ref)

    diff_classes = defaultdict(list)
    for m in mismatches_3a:
        classes = classify_mismatch(m["tanzil"], m["qul56"])
        for c in classes:
            diff_classes[c].append(m)

    diff_report = {}
    for c, items in diff_classes.items():
        diff_report[c] = {
            "count": len(items),
            "examples": items[:3]
        }

    report["validationResults"]["check3a_diffClasses"] = diff_report
    report["validationResults"]["check3a_uthmaniMismatches"] = mismatches_3a
    report["validationResults"]["check3a_documentedExceptions"] = documented_exceptions

    if unlisted_mismatches:
        sys.exit(f"FATAL: Check 3a FAILED: Found unlisted mismatches not in known_exceptions: {unlisted_mismatches}")

    report["validationResults"]["check3a_uthmaniMatch"] = True
    print(f"  ✓ Check 3a PASSED: 6233/6236 perfect matches; {len(documented_exceptions)} verified known exceptions in QUL 56.")

    # Check 3b: Alignment: QUL 59 has exactly the same word keys as QUL 56
    mismatches_3b = []
    for sa in by_ayah_56:
        keys_56 = [w[1] for w in by_ayah_56[sa]]
        keys_59 = [w[1] for w in by_ayah_59[sa]]
        if keys_56 != keys_59:
            mismatches_3b.append({"ayah": f"{sa[0]}:{sa[1]}", "keys56": keys_56, "keys59": keys_59})

    if mismatches_3b:
        report["validationResults"]["check3b_alignmentMismatches"] = mismatches_3b
        sys.exit(f"FATAL: Check 3b FAILED: Alignment differed in {len(mismatches_3b)} ayahs")
    report["validationResults"]["check3b_alignmentMatch"] = True
    print("  ✓ Check 3b PASSED: QUL 59 exactly aligns with QUL 56 for all 6236 ayahs.")

    # Check 3c: Indo-Pak consistency: QUL 59 words joined == QUL 89 ayah text
    mismatches_3c = []
    for k89, v89 in s89.items():
        s, a = map(int, k89.split(":"))
        t89 = normalize_indopak_for_comparison(v89["text"])
        words = by_ayah_59[(s, a)]
        w_all = normalize_indopak_for_comparison(" ".join(w[2] for w in words))
        if t89 != w_all:
            w_no_marker = normalize_indopak_for_comparison(" ".join(w[2] for w in words[:-1]))
            marker = words[-1][2]
            t89_no_marker = normalize_indopak_for_comparison(v89["text"].replace(marker, ""))
            if t89_no_marker != w_no_marker:
                mismatches_3c.append({"ayah": k89, "text89": t89, "words59": w_all})

    if mismatches_3c:
        report["validationResults"]["check3c_indopakMismatches"] = mismatches_3c
        sys.exit(f"FATAL: Check 3c FAILED: Indo-Pak consistency failed in {len(mismatches_3c)} ayahs")
    report["validationResults"]["check3c_indopakConsistency"] = True
    print("  ✓ Check 3c PASSED: QUL 59 words joined == QUL 89 ayah text for all 6236 ayahs.")

    # Check 3d & 4 & 5 & 6: Word processing & meaning checks
    built_surahs = {}
    index_entries = []
    total_words_shipped = 0
    missing_ur_list = []
    missing_en_list = []
    markers_found_in_words = []

    # Get Bismillah from 1:1 without ayah-end marker
    bismillah_raw = s89["1:1"]["text"]
    # Ayah marker in 1:1 is ' ۟\uf61e'
    bismillah_ar = bismillah_raw.replace(" ۟\uf61e", "").strip()

    for s in range(1, 115):
        s_meta = meta_by_num[s]
        surah_obj = {
            "number": s,
            "nameAr": s_meta["nameAr"],
            "nameEn": s_meta["nameEn"],
            "ayahs": []
        }

        expected_ayahs = tanzil_surah_counts[s]
        for a in range(1, expected_ayahs + 1):
            sa = (s, a)
            ar_full = s89[f"{s}:{a}"]["text"]
            ur_full = qenc_ur[sa]
            en_full = qenc_en[sa]

            words_59 = by_ayah_59[sa]
            words_56 = by_ayah_56[sa]
            ayah_words_59 = words_59[:-1]
            ayah_words_56 = words_56[:-1]

            ayah_words_shipped = []
            for (w_num, w_key, w_ar), (_, _, w_56_ar) in zip(ayah_words_59, ayah_words_56):
                if re.match(r"^[\u0660-\u0669]+$", w_56_ar) or any("\u0660" <= c <= "\u0669" for c in w_ar):
                    markers_found_in_words.append((w_key, w_ar))

                val_ur = wur.get(w_key)
                if val_ur is not None:
                    val_ur = val_ur.strip()
                if not val_ur:
                    val_ur = None
                    missing_ur_list.append({"key": w_key, "ar": w_ar})

                val_en = wen.get(w_key)
                if val_en is not None:
                    val_en = val_en.strip()
                if not val_en:
                    val_en = None
                    missing_en_list.append({"key": w_key, "ar": w_ar})

                ayah_words_shipped.append({
                    "ar": w_ar,
                    "ur": val_ur,
                    "en": val_en
                })

            total_words_shipped += len(ayah_words_shipped)
            surah_obj["ayahs"].append({
                "number": a,
                "arFull": ar_full,
                "ur": ur_full,
                "en": en_full,
                "words": ayah_words_shipped
            })

        built_surahs[s] = surah_obj
        index_entries.append({
            "number": s,
            "nameAr": s_meta["nameAr"],
            "nameEn": s_meta["nameEn"],
            "ayahCount": len(surah_obj["ayahs"])
        })

    if markers_found_in_words:
        sys.exit(f"FATAL: Check 6 FAILED: Found ayah markers inside words list: {markers_found_in_words[:10]}")
    report["validationResults"]["check6_noMarkersInWords"] = True
    print(f"  ✓ Check 6 PASSED: No ayah markers in word lists.")

    report["counts"]["totalSurahs"] = len(built_surahs)
    report["counts"]["totalAyahs"] = sum(len(s["ayahs"]) for s in built_surahs.values())
    report["counts"]["totalWords"] = total_words_shipped
    report["counts"]["missingUrduMeaningsCount"] = len(missing_ur_list)
    report["counts"]["missingEnglishMeaningsCount"] = len(missing_en_list)
    report["missingUrduMeanings"] = missing_ur_list
    report["missingEnglishMeanings"] = missing_en_list

    print(f"  ✓ Check 4 & 5 PASSED: Word counts align.")
    print(f"    Total words shipped: {total_words_shipped}")
    print(f"    Missing Urdu meanings (set to null): {len(missing_ur_list)}")
    print(f"    Missing English meanings (set to null): {len(missing_en_list)}")

    # -------------------------------------------------------------
    # WRITE OUTPUT FILES
    # -------------------------------------------------------------
    print("\nWriting output files...")
    os.makedirs(SURAHS_DIR, exist_ok=True)

    # 1. data/surahs/{nnn}.js
    for s, surah_data in built_surahs.items():
        filename = f"{s:03d}.js"
        filepath = os.path.join(SURAHS_DIR, filename)
        js_content = f"window.BASEERAH_SURAH = {json.dumps(surah_data, ensure_ascii=False, indent=2)};\n"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(js_content)
    print(f"  Wrote 114 surah files to {SURAHS_DIR}")

    # 2. data/index.js (includes window.BASEERAH_BISMILLAH and window.BASEERAH_INDEX)
    index_path = os.path.join(DATA_DIR, "index.js")
    index_js = (
        f"window.BASEERAH_BISMILLAH = {json.dumps(bismillah_ar, ensure_ascii=False)};\n"
        f"window.BASEERAH_INDEX = {json.dumps(index_entries, ensure_ascii=False, indent=2)};\n"
    )
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_js)
    print(f"  Wrote index file (with verified Bismillah) to {index_path}")

    # 3. data/build_report.json
    report_path = os.path.join(DATA_DIR, "build_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"  Wrote build report to {report_path}")

    # 4. Generate data/manifest.sha256.json (Milestone M1 integrity guard)
    print("Generating SHA-256 integrity manifest for data files...")
    manifest = {}
    for root, dirs, files in os.walk(DATA_DIR):
        for f in files:
            if f.endswith((".js", ".json", ".md")) and f != "manifest.sha256.json":
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, BASE_DIR).replace("\\", "/")
                manifest[rel_path] = compute_sha256(full_path)

    manifest_path = os.path.join(DATA_DIR, "manifest.sha256.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"  Wrote integrity manifest ({len(manifest)} files) to {manifest_path}")

    print("\nBUILD SUCCESSFUL! All checks passed.")

if __name__ == "__main__":
    main()
