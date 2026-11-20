#!/usr/bin/env python3
"""
scripts/check_arabic_allowlist.py
CI Guard: Scans js/, css/, *.html and data/namaz/ for Arabic-script characters.
Enforces that NO Quranic Arabic is hand-typed in these files.
Only explicitly approved Urdu UI labels with recorded reasons are allowed.
"""
import os
import re
import sys
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Arabic script Unicode blocks
ARABIC_PATTERN = re.compile(r"[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]+")

ALLOWLIST_PATH = os.path.join(BASE_DIR, "scripts", "arabic_allowlist.json")

def load_allowlist():
    if not os.path.exists(ALLOWLIST_PATH):
        return {}
    with open(ALLOWLIST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def scan_files():
    targets = []
    # Directories
    for d in ["js", "css", "data/namaz"]:
        full_d = os.path.join(BASE_DIR, d)
        if os.path.exists(full_d):
            for root, _, files in os.walk(full_d):
                for f in files:
                    if f.endswith((".js", ".css", ".json")):
                        targets.append(os.path.join(root, f))
    # HTML files in root
    for f in os.listdir(BASE_DIR):
        if f.endswith(".html"):
            targets.append(os.path.join(BASE_DIR, f))

    allowlist = load_allowlist()
    violations = []
    seen_matches = []

    for path in sorted(targets):
        rel_path = os.path.relpath(path, BASE_DIR).replace("\\", "/")
        with open(path, "r", encoding="utf-8") as fh:
            lines = fh.readlines()

        for line_num, line in enumerate(lines, start=1):
            matches = ARABIC_PATTERN.findall(line)
            for m in matches:
                # Ignore font-family references like "Noto Nastaliq Urdu" or comments
                # Check if this exact text is in allowlist for this file or globally
                entry = allowlist.get(rel_path, {}).get(m) or allowlist.get("*", {}).get(m)
                if not entry:
                    violations.append({
                        "file": rel_path,
                        "line": line_num,
                        "text": m,
                        "reason": "NOT IN ALLOWLIST"
                    })
                else:
                    seen_matches.append({
                        "file": rel_path,
                        "line": line_num,
                        "text": m,
                        "reason": entry.get("reason", "Approved UI label")
                    })

    return violations, seen_matches

def main():
    print("=" * 60)
    print("Baseerah Arabic Script CI Allowlist Checker")
    print("=" * 60)
    violations, approved = scan_files()
    print(f"Verified {len(approved)} approved Urdu UI occurrences.")
    if violations:
        print(f"\n❌ FAILED: Found {len(violations)} unapproved Arabic-script strings:")
        for v in violations[:15]:
            print(f"  {v['file']}:{v['line']} -> '{v['text']}' ({v['reason']})")
        if len(violations) > 15:
            print(f"  ... and {len(violations) - 15} more.")
        sys.exit(1)
    print("✓ All Arabic-script occurrences match the approved allowlist (no hand-typed Quran text).")

if __name__ == "__main__":
    main()
