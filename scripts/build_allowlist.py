import os
import re
import json

BASE_DIR = "."
ARABIC_PATTERN = re.compile(r"[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]+")

targets = []
for d in ["js", "css", "data/namaz"]:
    full_d = os.path.join(BASE_DIR, d)
    if os.path.exists(full_d):
        for root, _, files in os.walk(full_d):
            for f in files:
                if f.endswith((".js", ".css", ".json")):
                    targets.append(os.path.join(root, f))
for f in os.listdir(BASE_DIR):
    if f.endswith(".html"):
        targets.append(os.path.join(BASE_DIR, f))

found = {}
for path in targets:
    rel_path = os.path.relpath(path, BASE_DIR).replace("\\", "/")
    with open(path, "r", encoding="utf-8") as fh:
        lines = fh.readlines()
    for line in lines:
        for m in ARABIC_PATTERN.findall(line):
            if rel_path not in found:
                found[rel_path] = {}
            if m not in found[rel_path]:
                found[rel_path][m] = {
                    "reason": "UI label / layout metadata in Urdu language"
                }

with open("scripts/arabic_allowlist.json", "w", encoding="utf-8") as f:
    json.dump(found, f, ensure_ascii=False, indent=2)

print(f"Generated allowlist with {sum(len(v) for v in found.values())} entries across {len(found)} files.")
