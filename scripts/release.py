#!/usr/bin/env python3
"""
scripts/release.py
Automated release packaging tool for Baseerah Commercial Kiosk:
  1. Runs all test suites (tests/test_build.py, tests/test_kiosk.py)
  2. Generates updated data/manifest.sha256.json
  3. Bundles production zip package in release/baseerah-v1.0.0.zip
"""
import os
import sys
import json
import zipfile
import hashlib
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RELEASE_DIR = os.path.join(BASE_DIR, "release")
DATA_DIR = os.path.join(BASE_DIR, "data")

def run_tests():
    print("Step 1: Running automated test suites...")
    res = subprocess.run([sys.executable, "-m", "unittest", "tests/test_build.py", "tests/test_kiosk.py"], cwd=BASE_DIR)
    if res.returncode != 0:
        sys.exit("FATAL: Tests failed! Aborting release packaging.")
    print("  ✓ All automated tests passed successfully.")

def update_manifest():
    print("\nStep 2: Generating SHA-256 integrity manifest...")
    manifest = {}
    for root, _, files in os.walk(DATA_DIR):
        for f in files:
            if f.endswith((".js", ".json", ".md")) and f != "manifest.sha256.json":
                fp = os.path.join(root, f)
                rel_path = os.path.relpath(fp, BASE_DIR).replace("\\", "/")
                with open(fp, "rb") as fh:
                    content = fh.read().replace(b"\r\n", b"\n")
                    manifest[rel_path] = hashlib.sha256(content).hexdigest()

    manifest_path = os.path.join(DATA_DIR, "manifest.sha256.json")
    with open(manifest_path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
    print(f"  ✓ Wrote SHA-256 hashes for {len(manifest)} data files to {manifest_path}")

def package_zip():
    print("\nStep 3: Creating release zip package...")
    os.makedirs(RELEASE_DIR, exist_ok=True)
    zip_path = os.path.join(RELEASE_DIR, "baseerah-v1.0.0.zip")

    include_dirs = ["css", "fonts", "data", "js", "icons", "docs"]
    include_files = ["index.html", "manifest.json", "sw.js", "review.html", "README.md", "CHANGELOG.md"]

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        # Add single files
        for f in include_files:
            fp = os.path.join(BASE_DIR, f)
            if os.path.exists(fp):
                zipf.write(fp, f)
                print(f"  + Added {f}")

        # Add directories
        for d in include_dirs:
            dp = os.path.join(BASE_DIR, d)
            if os.path.exists(dp):
                for root, _, files in os.walk(dp):
                    for file in files:
                        fp = os.path.join(root, file)
                        rel_path = os.path.relpath(fp, BASE_DIR).replace("\\", "/")
                        zipf.write(fp, rel_path)
                print(f"  + Added directory {d}/")

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"\n✓ Baseerah v1.0.0 successfully packaged: {zip_path} ({size_mb:.2f} MB)")

def main():
    print("=" * 60)
    print("Baseerah (بصيرة) v1.0.0 Commercial Release Packager")
    print("=" * 60)
    run_tests()
    update_manifest()
    package_zip()
    print("\nRelease build complete!")

if __name__ == "__main__":
    main()
