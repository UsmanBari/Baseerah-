/* Baseerah — Offline Audio Storage Manager (Cache API & Storage Persist) */
import { audioManager } from "./audio.js";

const CACHE_NAME = "baseerah-offline-audio-v1";
const METADATA_KEY = "baseerah_downloaded_audio";

export const OfflineAudio = {
  getDownloadedSurahs() {
    try {
      const raw = localStorage.getItem(METADATA_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to read downloaded audio metadata:", e);
      return [];
    }
  },

  isSurahDownloaded(surahNumber, reciterId) {
    const list = this.getDownloadedSurahs();
    return list.some((item) => item.surah === Number(surahNumber) && item.reciterId === reciterId);
  },

  async getStorageUsage() {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        return {
          usage: est.usage || 0,
          quota: est.quota || 0,
          usageMB: ((est.usage || 0) / (1024 * 1024)).toFixed(1),
          quotaMB: ((est.quota || 0) / (1024 * 1024)).toFixed(0)
        };
      } catch (e) {
        console.warn("navigator.storage.estimate failed:", e);
      }
    }
    return { usage: 0, quota: 0, usageMB: "0", quotaMB: "0" };
  },

  async requestPersistence() {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
      try {
        return await navigator.storage.persist();
      } catch (e) {
        console.warn("navigator.storage.persist failed:", e);
      }
    }
    return false;
  },

  async downloadSurah(surahNumber, totalAyahs, reciterId, onProgress = null, abortSignal = null) {
    if (!("caches" in window)) {
      throw new Error("Cache API not supported in this environment");
    }

    const cache = await caches.open(CACHE_NAME);
    let totalBytes = 0;
    const sNum = Number(surahNumber);

    for (let a = 1; a <= totalAyahs; a++) {
      if (abortSignal && abortSignal.aborted) {
        throw new Error("Download cancelled");
      }

      const urls = audioManager.getPlayUrls(sNum, a);
      const primaryUrl = urls[0];

      // Check if already in cache
      let cachedResp = await cache.match(primaryUrl);
      if (!cachedResp) {
        const resp = await fetch(primaryUrl, {
          signal: abortSignal || undefined
        });
        if (!resp.ok) {
          throw new Error(`Failed to fetch ayah ${a}: HTTP ${resp.status}`);
        }
        await cache.put(primaryUrl, resp.clone());
        cachedResp = resp;
      }

      const blob = await cachedResp.blob();
      totalBytes += blob.size;

      if (onProgress) {
        onProgress({
          surah: sNum,
          currentAyah: a,
          totalAyahs,
          sizeBytes: totalBytes,
          sizeMB: (totalBytes / (1024 * 1024)).toFixed(2)
        });
      }
    }

    // Save metadata
    const list = this.getDownloadedSurahs().filter(
      (item) => !(item.surah === sNum && item.reciterId === reciterId)
    );
    list.push({
      surah: sNum,
      reciterId,
      totalAyahs,
      sizeBytes: totalBytes,
      sizeMB: (totalBytes / (1024 * 1024)).toFixed(2),
      downloadedAt: Date.now()
    });
    localStorage.setItem(METADATA_KEY, JSON.stringify(list));

    return {
      surah: sNum,
      reciterId,
      totalAyahs,
      totalBytes,
      sizeMB: (totalBytes / (1024 * 1024)).toFixed(2)
    };
  },

  async deleteDownloadedSurah(surahNumber, reciterId) {
    const sNum = Number(surahNumber);
    if ("caches" in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const list = this.getDownloadedSurahs();
        const item = list.find((it) => it.surah === sNum && it.reciterId === reciterId);
        const totalAyahs = item ? item.totalAyahs : 286;
        for (let a = 1; a <= totalAyahs; a++) {
          const urls = audioManager.getPlayUrls(sNum, a);
          for (const url of urls) {
            await cache.delete(url);
          }
        }
      } catch (e) {
        console.warn("Failed to delete audio from cache:", e);
      }
    }

    const updated = this.getDownloadedSurahs().filter(
      (item) => !(item.surah === sNum && item.reciterId === reciterId)
    );
    localStorage.setItem(METADATA_KEY, JSON.stringify(updated));
  },

  async getCachedAudioBlobUrl(url) {
    if (!("caches" in window)) return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(url);
      if (match) {
        const blob = await match.blob();
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.warn("Failed to match cached audio:", e);
    }
    return null;
  }
};
