/* Baseerah — Data Integrity Guard (SHA-256 Verification) */

let manifestCache = null;

export const Integrity = {
  async loadManifest() {
    if (manifestCache) return manifestCache;
    try {
      const resp = await fetch("data/manifest.sha256.json");
      if (!resp.ok) {
        throw new Error(`Failed to load manifest: ${resp.status}`);
      }
      manifestCache = await resp.json();
      return manifestCache;
    } catch (err) {
      console.error("Integrity.loadManifest error:", err);
      return null;
    }
  },

  async computeSha256(str) {
    if (!window.crypto || !window.crypto.subtle) {
      return null;
    }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      console.warn("crypto.subtle.digest error:", err);
      return null;
    }
  },

  async verifySurahFile(surahNumber, rawFileText) {
    const manifest = await this.loadManifest();
    if (!manifest) {
      console.warn("Integrity manifest unavailable; verification unavailable.");
      return { valid: true, warning: "verification unavailable" };
    }

    const padded = String(surahNumber).padStart(3, "0");
    const expectedKey = `data/surahs/${padded}.js`;
    const expectedHash = manifest[expectedKey];

    if (!expectedHash) {
      return { valid: false, reason: "key_missing_in_manifest", expected: "N/A", actual: "verification unavailable" };
    }

    // Normalize CRLF -> LF BEFORE computing the single canonical hash
    const normalizedText = (rawFileText || "").replace(/\r\n/g, "\n");
    const computed = await this.computeSha256(normalizedText);

    if (!computed) {
      // SubtleCrypto failed or unavailable: do not treat as corruption
      console.warn("Integrity hashing unavailable; skipping strict blocking.");
      return { valid: true, warning: "verification unavailable" };
    }

    // Compare only this one hash
    if (computed === expectedHash) {
      return { valid: true };
    }

    console.error(`INTEGRITY CORRUPTION DETECTED in Surah ${surahNumber}! Expected ${expectedHash}, got ${computed}`);
    return { valid: false, reason: "sha256_mismatch", expected: expectedHash, actual: computed };
  }
};
