#!/usr/bin/env python3
"""
scripts/update_sw_version.py
Updates CACHE_NAME in sw.js to include baseerah-v{version}-{git_hash}.
Reads version from package.json and short git hash from git rev-parse or Netlify env COMMIT_REF.
"""
import os
import re
import json
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SW_PATH = os.path.join(BASE_DIR, "sw.js")
PKG_PATH = os.path.join(BASE_DIR, "package.json")

def get_version():
    if os.path.exists(PKG_PATH):
        try:
            with open(PKG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("version", "1.0.0")
        except Exception:
            pass
    return "1.0.0"

def get_git_hash():
    # Netlify environment variable
    commit_ref = os.environ.get("COMMIT_REF")
    if commit_ref:
        return commit_ref[:7]
    try:
        res = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip()
    except Exception:
        pass
    return "dev"

def update_sw(version=None, git_hash=None):
    if not version:
        version = get_version()
    if not git_hash:
        git_hash = get_git_hash()

    cache_name = f"baseerah-v{version}-{git_hash}"
    if not os.path.exists(SW_PATH):
        print(f"Error: {SW_PATH} not found.")
        return cache_name

    with open(SW_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = re.sub(
        r'const CACHE_NAME\s*=\s*["\'][^"\']+["\'];',
        f'const CACHE_NAME = "{cache_name}";',
        content
    )

    with open(SW_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(new_content)

    print(f"Updated sw.js CACHE_NAME to: {cache_name}")
    return cache_name

if __name__ == "__main__":
    update_sw()
