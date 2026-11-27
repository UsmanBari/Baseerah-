// scripts/check_i18n_completeness.js — Verify i18n key parity and script integrity
import { DICT } from "../js/core/i18n.js";

console.log("=== Checking i18n Completeness & Script Integrity ===");

const enKeys = Object.keys(DICT.en);
const urKeys = Object.keys(DICT.ur);

let hasError = false;

// 1. Key Parity Check
const missingInUr = enKeys.filter((k) => !urKeys.includes(k));
const missingInEn = urKeys.filter((k) => !enKeys.includes(k));

if (missingInUr.length > 0) {
  console.error("FAIL: Keys missing in DICT.ur:", missingInUr);
  hasError = true;
}
if (missingInEn.length > 0) {
  console.error("FAIL: Keys missing in DICT.en:", missingInEn);
  hasError = true;
}

// 2. Non-empty string check
for (const [lang, table] of Object.entries(DICT)) {
  for (const [key, val] of Object.entries(table)) {
    if (typeof val !== "string" || val.trim().length === 0) {
      console.error(`FAIL: Empty or non-string value for key "${key}" in language "${lang}"`);
      hasError = true;
    }
  }
}

// 3. Urdu Translation Script Check
// Keys that are allowed to contain English/Latin in Urdu dictionary (e.g. English translator credit, English card title, English tab toggle)
const ALLOWED_LATIN_IN_UR = new Set([
  "namazCardTitle",
  "quranCardTitle",
  "meaningToggleEnglish",
  "translatorEnglish",
  "about" // "ذرائع اور اسناد · About"
]);

const ARABIC_URDU_REGEX = /[\u0600-\u06FF]/;
for (const [key, val] of Object.entries(DICT.ur)) {
  if (!ALLOWED_LATIN_IN_UR.has(key)) {
    if (!ARABIC_URDU_REGEX.test(val)) {
      console.error(`FAIL: Key "${key}" in DICT.ur has no Arabic/Urdu characters: "${val}"`);
      hasError = true;
    }
  }
}

if (hasError) {
  console.error("i18n completeness check FAILED.");
  process.exit(1);
} else {
  console.log(`PASS: All ${enKeys.length} i18n keys are fully mirrored with 100% parity across English and Urdu.`);
}
