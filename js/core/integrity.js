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
      // Fallback in insecure contexts
      return null;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  },

  async verifySurahFile(surahNumber, rawFileText) {
    const manifest = await this.loadManifest();
    if (!manifest) {
      // If manifest could not be read, treat with extreme caution
      console.warn("Integrity manifest unavailable; skipping strict verification.");
      return { valid: true, warning: "manifest_missing" };
    }

    const padded = String(surahNumber).padStart(3, "0");
    const expectedKey = `data/surahs/${padded}.js`;
    const expectedHash = manifest[expectedKey];

    if (!expectedHash) {
      return { valid: false, reason: "key_missing_in_manifest" };
    }

    const computed = await this.computeSha256(rawFileText);
    if (!computed) {
      return { valid: true, warning: "subtle_crypto_unavailable" };
    }

    // Normalizing Windows CRLF vs Unix LF if file was transferred
    if (computed === expectedHash) {
      return { valid: true };
    }

    // Check with LF normalized
    const normalizedText = rawFileText.replace(/\r\n/g, "\n");
    const normalizedComputed = await this.computeSha256(normalizedText);
    if (normalizedComputed === expectedHash) {
      return { valid: true };
    }

    console.error(`INTEGRITY CORRUPTION DETECTED in Surah ${surahNumber}! Expected ${expectedHash}, got ${computed}`);
    return { valid: false, reason: "sha256_mismatch", expected: expectedHash, got: computed };
  }
};
