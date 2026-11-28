/* Baseerah — Authentic Quran Recitation Audio Architecture, Multi-Reciter Engine & Mosque Respect Setting */
import { state } from "./state.js";
import { t } from "./i18n.js";
import { wakeLockManager } from "./wake-lock.js";

import { IS_KIOSK_BUILD } from "./build.js";
import { estimateSegments, analyzeVoiced, exactSegments } from "./word-timing.js";

export const RECITERS = [
  {
    id: "alafasy",
    nameEn: "Mishary Rashid Alafasy",
    nameUr: "مشاری راشد العفاسی",
    folder: "Alafasy_128kbps",
    subfolder: "Alafasy/mp3",
    bitrate: "128 kbps"
  },
  {
    id: "husary",
    nameEn: "Mahmoud Khalil Al-Husary",
    nameUr: "محمود خلیل الحصری",
    folder: "Husary_128kbps",
    subfolder: "Husary_128kbps",
    bitrate: "128 kbps"
  },
  {
    id: "minshawi",
    nameEn: "Mohamed Siddiq Al-Minshawi",
    nameUr: "محمد صدیق المنشاوی",
    folder: "Minshawy_Murattal_128kbps",
    subfolder: "Minshawy_Murattal_128kbps",
    bitrate: "128 kbps"
  },
  {
    id: "abdulbasit",
    nameEn: "Abdul Basit Abdul Samad",
    nameUr: "عبد الباسط عبد الصمد",
    folder: "Abdul_Basit_Murattal_192kbps",
    subfolder: "Abdul_Basit_Murattal_192kbps",
    bitrate: "192 kbps"
  },
  {
    id: "sudais",
    nameEn: "Abdur-Rahman As-Sudais",
    nameUr: "عبد الرحمن السدیس",
    folder: "Abdurrahmaan_As-Sudais_192kbps",
    subfolder: "Abdurrahmaan_As-Sudais_192kbps",
    bitrate: "192 kbps"
  }
];

class AudioManager {
  constructor() {
    this.currentAudio = null;
    this.currentWordAudio = null;
    this.nextAudio = null;
    this.isPlayingAyah = false;
    this.playbackRate = 1.0;

    // Repeat mode: "off" | "ayah" | "range"
    this.repeatMode = "off";
    this.repeatAyah = false; // backwards compatibility
    this.repeatRange = [1, 7]; // [startAyah, endAyah]

    this.autoPlayNext = true;
    this.playMode = "ayah"; // "ayah" | "surah"
    this.currentSurah = null;
    this.currentAyah = null;
    this.totalAyahs = 7;
    this.activeWordIndex = null;
    this.segments = [];
    this.currentReciterId = this.loadStoredReciter();
    this.isPlayingBismillah = false;
    this.currentBlobUrl = null;

    // Observers / Callbacks
    this.onWordHighlight = null;
    this.onStateChange = null;
    this.onAyahChange = null;
    this.onTimeUpdate = null;
    this.listeners = new Set();
  }

  loadStoredReciter() {
    if (IS_KIOSK_BUILD) return "alafasy";
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("baseerah_reciter");
      if (stored && RECITERS.some((r) => r.id === stored)) {
        return stored;
      }
    }
    return "alafasy";
  }

  getReciters() {
    return RECITERS;
  }

  getCurrentReciter() {
    return RECITERS.find((r) => r.id === this.currentReciterId) || RECITERS[0];
  }

  setReciter(reciterId) {
    if (!RECITERS.some((r) => r.id === reciterId)) return;
    this.currentReciterId = reciterId;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("baseerah_reciter", reciterId);
    }
    // If currently playing, reload current ayah track with new reciter
    if (this.isPlayingAyah && this.currentSurah && this.currentAyah) {
      const wasPlaying = true;
      const sNum = this.currentSurah;
      const aNum = this.currentAyah;
      this.stop();
      if (wasPlaying) {
        this.playAyah(sNum, aNum);
      }
    }
    this.notifyState();
  }

  isMuted() {
    return !!state.mosqueMute;
  }

  getPlayUrls(surahNumber, ayahNumber) {
    const sPadded = String(surahNumber).padStart(3, "0");
    const aPadded = String(ayahNumber).padStart(3, "0");
    const reciter = this.getCurrentReciter();
    return [
      `https://everyayah.com/data/${reciter.folder}/${sPadded}${aPadded}.mp3`,
      `https://verses.quran.com/${reciter.subfolder}/${sPadded}${aPadded}.mp3`,
      `https://everyayah.com/data/Alafasy_128kbps/${sPadded}${aPadded}.mp3`,
      `audio/${sPadded}_${aPadded}.mp3`
    ];
  }

  getBismillahUrls() {
    const reciter = this.getCurrentReciter();
    return [
      `https://everyayah.com/data/${reciter.folder}/001001.mp3`,
      `https://verses.quran.com/${reciter.subfolder}/001001.mp3`,
      `https://everyayah.com/data/Alafasy_128kbps/001001.mp3`
    ];
  }

  getWordAudioUrl(surahNumber, ayahNumber, wordIndex) {
    const sPadded = String(surahNumber).padStart(3, "0");
    const aPadded = String(ayahNumber).padStart(3, "0");
    const wPadded = String(wordIndex + 1).padStart(3, "0");
    return `https://audio.qurancdn.com/wbw/${sPadded}_${aPadded}_${wPadded}.mp3`;
  }

  preloadNextAyah(surahNumber, ayahNumber) {
    let nextAyah = ayahNumber + 1;
    if (this.repeatMode === "range") {
      if (nextAyah > this.repeatRange[1]) nextAyah = this.repeatRange[0];
    } else if (this.repeatMode === "ayah") {
      nextAyah = ayahNumber;
    }
    if (nextAyah > this.totalAyahs && this.repeatMode === "off") return;

    const urls = this.getPlayUrls(surahNumber, nextAyah);
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = urls[0];
    audio.load();
    this.nextAudio = { surah: surahNumber, ayah: nextAyah, audio };
  }

  playAyah(surahNumber, ayahNumber, options = {}) {
    if (this.isMuted()) {
      return {
        played: false,
        reason: "mosque_mute_active",
        messageUr: "آواز بند ہے — احترامِ مسجد موڈ",
        messageEn: "Audio is muted — Mosque Respect Mode"
      };
    }

    this.stopAudioOnly();

    this.currentSurah = surahNumber;
    this.currentAyah = ayahNumber;
    if (options.totalAyahs) this.totalAyahs = options.totalAyahs;
    if (options.playMode) this.playMode = options.playMode;
    if (options.onWordHighlight) this.onWordHighlight = options.onWordHighlight;
    if (options.onStateChange) this.onStateChange = options.onStateChange;
    if (options.onAyahChange) this.onAyahChange = options.onAyahChange;
    if (options.onTimeUpdate) this.onTimeUpdate = options.onTimeUpdate;

    const urls = this.getPlayUrls(surahNumber, ayahNumber);
    let urlIndex = 0;

    let audio;
    if (this.nextAudio && this.nextAudio.surah === surahNumber && this.nextAudio.ayah === ayahNumber) {
      audio = this.nextAudio.audio;
      this.nextAudio = null;
    } else {
      audio = new Audio();
    }
    audio.playbackRate = this.playbackRate;
    if ("preservesPitch" in audio) audio.preservesPitch = true;
    this.currentAudio = audio;

    const tryNextUrl = async () => {
      if (urlIndex < urls.length) {
        const candidateUrl = urls[urlIndex++];
        let playSrc = candidateUrl;
        this.currentSourceUrl = candidateUrl;

        if (typeof window !== "undefined" && "caches" in window) {
          try {
            const cache = await caches.open("baseerah-offline-audio-v1");
            const match = await cache.match(candidateUrl);
            if (match) {
              const blob = await match.blob();
              if (this.currentBlobUrl) {
                URL.revokeObjectURL(this.currentBlobUrl);
              }
              this.currentBlobUrl = URL.createObjectURL(blob);
              playSrc = this.currentBlobUrl;
            }
          } catch (e) {
            console.warn("Cached audio lookup failed:", e);
          }
        }

        audio.src = playSrc;
        audio.load();
        audio.play().catch((err) => {
          console.warn(`Audio attempt failed for ${playSrc}:`, err);
          tryNextUrl();
        });
      } else {
        this.isPlayingAyah = false;
        if (typeof window !== "undefined" && window.UIComponents && window.UIComponents.showToast) {
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            window.UIComponents.showToast(t("audioOfflineNotice", state.lang));
          } else {
            window.UIComponents.showToast(t("audioErrorNotice", state.lang));
          }
        }
        if (options.onError) options.onError();
        this.notifyState();
      }
    };

    // Word timing for the highlight. Words come from the screen's resolver so
    // the next ayah in a surah gets ITS words (not the previous ayah's).
    if (options.getWords) this.wordResolver = options.getWords;
    const words = this.wordResolver
      ? (this.wordResolver(surahNumber, ayahNumber) || [])
      : (options.words || []);
    this.segments = [];
    this.activeWordIndex = null;

    const buildSegments = () => {
      if (this.currentAudio !== audio) return;
      const dur = audio.duration;
      if (!(dur > 0) || !isFinite(dur)) return;
      if (options.segments && options.segments.length > 0) {
        this.segments = options.segments;
        return;
      }
      if (!words.length) return;
      this.segments = estimateSegments(words, dur);
      // Alafasy: real per-word timings. Others: refine with the silences in the recording.
      const src = this.currentSourceUrl || audio.currentSrc || audio.src;
      exactSegments(surahNumber, ayahNumber, src).then((exact) => {
        if (exact && exact.length === words.length && this.currentAudio === audio) {
          this.segments = exact;
          return;
        }
        return analyzeVoiced(audio.currentSrc || audio.src).then((voiced) => {
        if (voiced && this.currentAudio === audio && audio.duration > 0) {
          this.segments = estimateSegments(words, audio.duration, { voiced });
        }
      });
      });
    };

    audio.addEventListener("loadedmetadata", () => {
      buildSegments();
      this.preloadNextAyah(surahNumber, ayahNumber);
    });
    audio.addEventListener("durationchange", buildSegments);
    // A preloaded next-ayah file may already have its metadata.
    if (audio.readyState >= 1) {
      buildSegments();
      this.preloadNextAyah(surahNumber, ayahNumber);
    }

    // Smooth highlight: follow the clock every frame while playing (timeupdate
    // alone fires only ~4×/s, which made the highlight lag behind the voice).
    const LOOKAHEAD = 0.07;
    const tick = () => {
      if (this.currentAudio !== audio) return;
      const t = audio.currentTime;
      if (this.segments.length > 0) {
        const tt = t + LOOKAHEAD;
        let idx = null;
        for (let i = this.segments.length - 1; i >= 0; i--) {
          if (tt >= this.segments[i].start) { idx = this.segments[i].index; break; }
        }
        if (idx !== this.activeWordIndex) {
          this.activeWordIndex = idx;
          if (this.onWordHighlight) this.onWordHighlight(idx);
        }
      }
      if (!audio.paused && !audio.ended) this._raf = requestAnimationFrame(tick);
    };
    this._tick = tick;

    audio.addEventListener("timeupdate", () => {
      const t = audio.currentTime;
      if (this.onTimeUpdate) this.onTimeUpdate(t, audio.duration);
      if (options.onTimeUpdate) options.onTimeUpdate(t, audio.duration);
      if (typeof requestAnimationFrame !== "function") tick();
    });
    audio.addEventListener("playing", () => {
      if (typeof requestAnimationFrame === "function") {
        cancelAnimationFrame(this._raf);
        this._raf = requestAnimationFrame(tick);
      }
    });
    audio.addEventListener("seeked", () => { if (audio.paused) tick(); });

    audio.addEventListener("play", () => {
      this.isPlayingAyah = true;
      this.updateMediaSession();
      this.notifyState();
    });

    audio.addEventListener("pause", () => {
      if (!audio.seeking) {
        this.isPlayingAyah = false;
        this.notifyState();
      }
    });

    audio.addEventListener("ended", () => {
      this.isPlayingAyah = false;
      this.activeWordIndex = null;
      if (this.onWordHighlight) this.onWordHighlight(null);
      this.notifyState();
      // "Listen & repeat": leave a pause after each ayah so the learner can repeat it.
      const gapMs = Math.max(0, Number(state.settings && state.settings.repeatGapSec) || 0) * 1000;
      const proceed = () => {
        this._gapTimer = null;
        if (this.currentAudio !== audio) return;

        if (this.repeatMode === "ayah" || this.repeatAyah) {
          audio.currentTime = 0;
          audio.play().catch(console.warn);
        } else if (this.playMode === "surah" || this.autoPlayNext) {
          let nextAyah = this.currentAyah + 1;
          if (this.repeatMode === "range") {
            if (nextAyah > this.repeatRange[1]) {
              nextAyah = this.repeatRange[0];
            }
          }
          if (nextAyah <= this.totalAyahs) {
            if (this.onAyahChange) this.onAyahChange(this.currentSurah, nextAyah);
            this.playAyah(this.currentSurah, nextAyah, { ...options, words: undefined, segments: undefined, playMode: this.playMode });
          } else if (this.repeatMode === "range") {
            nextAyah = this.repeatRange[0];
            if (this.onAyahChange) this.onAyahChange(this.currentSurah, nextAyah);
            this.playAyah(this.currentSurah, nextAyah, { ...options, words: undefined, segments: undefined, playMode: this.playMode });
          } else {
            // End of the surah queue: fully reset so a later "play" starts fresh
            // from the ayah the user is looking at (not a stale finished ayah).
            this.finishQueue();
            if (options.onEnded) options.onEnded();
          }
        } else {
          this.finishQueue();
          if (options.onEnded) options.onEnded();
        }
      };
      if (gapMs > 0 && (this.playMode === "surah" || this.autoPlayNext || this.repeatMode === "ayah" || this.repeatAyah)) {
        this._gapTimer = setTimeout(proceed, gapMs);
      } else {
        proceed();
      }
    });

    tryNextUrl();
    return { played: true, audio };
  }

  playSurah(surahNumber, startAyah = 1, totalAyahs = 7, options = {}) {
    if (this.isMuted()) {
      return {
        played: false,
        reason: "mosque_mute_active",
        messageUr: "آواز بند ہے — احترامِ مسجد موڈ",
        messageEn: "Audio is muted — Mosque Respect Mode"
      };
    }

    this.playMode = "surah";
    this.totalAyahs = totalAyahs;

    // Check if Bismillah should precede (Surahs 2-8 and 10-114 when starting from Ayah 1)
    if (startAyah === 1 && surahNumber !== 1 && surahNumber !== 9 && options.bismillahFirst !== false) {
      this.stop();
      this.isPlayingBismillah = true;
      this.currentSurah = surahNumber;
      this.currentAyah = 1;

      const bismillahAudio = new Audio();
      const urls = this.getBismillahUrls();
      bismillahAudio.playbackRate = this.playbackRate;
      this.currentAudio = bismillahAudio;

      bismillahAudio.addEventListener("play", () => {
        this.isPlayingAyah = true;
        this.notifyState();
      });

      bismillahAudio.addEventListener("ended", () => {
        this.isPlayingBismillah = false;
        this.playAyah(surahNumber, 1, { ...options, playMode: "surah", totalAyahs });
      });

      bismillahAudio.src = urls[0];
      bismillahAudio.play().catch(() => {
        this.isPlayingBismillah = false;
        this.playAyah(surahNumber, 1, { ...options, playMode: "surah", totalAyahs });
      });
      return { played: true, audio: bismillahAudio };
    }

    return this.playAyah(surahNumber, startAyah, { ...options, playMode: "surah", totalAyahs });
  }

  playNext() {
    if (!this.currentSurah || !this.currentAyah) return;
    let next = this.currentAyah + 1;
    if (this.repeatMode === "range" && next > this.repeatRange[1]) {
      next = this.repeatRange[0];
    } else if (next > this.totalAyahs) {
      return;
    }
    if (this.onAyahChange) this.onAyahChange(this.currentSurah, next);
    this.playAyah(this.currentSurah, next, { playMode: this.playMode, totalAyahs: this.totalAyahs });
  }

  playPrevious() {
    if (!this.currentSurah || !this.currentAyah) return;
    let prev = this.currentAyah - 1;
    if (this.repeatMode === "range" && prev < this.repeatRange[0]) {
      prev = this.repeatRange[1];
    } else if (prev < 1) {
      return;
    }
    if (this.onAyahChange) this.onAyahChange(this.currentSurah, prev);
    this.playAyah(this.currentSurah, prev, { playMode: this.playMode, totalAyahs: this.totalAyahs });
  }

  togglePlay(surahNumber, ayahNumber, options = {}) {
    if (this.isPlayingAyah && this.currentSurah === surahNumber && this.currentAyah === ayahNumber) {
      this.pause();
      return { isPlaying: false };
    }
    if (this.currentAudio && !this.isPlayingAyah && this.currentSurah === surahNumber && this.currentAyah === ayahNumber) {
      this.resume();
      return { isPlaying: true };
    }
    return this.playAyah(surahNumber, ayahNumber, options);
  }

  playWord(surahNumber, ayahNumber, wordIndex) {
    if (this.isMuted()) {
      return {
        played: false,
        reason: "mosque_mute_active",
        messageUr: "آواز بند ہے — احترامِ مسجد موڈ",
        messageEn: "Audio is muted — Mosque Respect Mode"
      };
    }

    if (this.currentWordAudio) {
      this.currentWordAudio.pause();
      this.currentWordAudio = null;
    }

    const url = this.getWordAudioUrl(surahNumber, ayahNumber, wordIndex);
    const audio = new Audio(url);
    audio.playbackRate = this.playbackRate;
    this.currentWordAudio = audio;

    audio.play().catch((err) => {
      console.warn("Word audio play failed:", err);
    });

    return { played: true, audio };
  }

  pause() {
    if (this._gapTimer) { clearTimeout(this._gapTimer); this._gapTimer = null; }
    if (this.currentAudio && this.isPlayingAyah) {
      this.currentAudio.pause();
      this.isPlayingAyah = false;
      this.notifyState();
    }
  }

  resume() {
    if (this.currentAudio && !this.isPlayingAyah) {
      this.currentAudio.playbackRate = this.playbackRate;
      this.currentAudio.play().catch(console.warn);
      this.isPlayingAyah = true;
      this.notifyState();
    }
  }

  /** Sleep timer: stop the recitation after N minutes (0 = off). Gently fades out. */
  setSleepTimer(minutes) {
    if (this._sleepTimer) { clearTimeout(this._sleepTimer); this._sleepTimer = null; }
    this.sleepEndsAt = null;
    const m = Number(minutes) || 0;
    if (m <= 0) return;
    this.sleepEndsAt = Date.now() + m * 60000;
    this._sleepTimer = setTimeout(() => {
      this._sleepTimer = null;
      this.sleepEndsAt = null;
      const a = this.currentAudio;
      const finish = () => {
        this.stop();
        if (typeof window !== "undefined" && window.UIComponents && window.UIComponents.showToast) {
          window.UIComponents.showToast(t("sleepTimerDone", state.lang));
        }
      };
      if (!a || a.paused) { finish(); return; }
      const start = a.volume;
      let step = 0;
      const fade = setInterval(() => {
        step++;
        try { a.volume = Math.max(0, start * (1 - step / 20)); } catch (e) { /* iOS: volume is read-only */ }
        if (step >= 20) { clearInterval(fade); finish(); try { a.volume = start; } catch (e) { /* ignore */ } }
      }, 150);
    }, m * 60000);
  }

  /** During recitation, tapping a word of the playing ayah jumps the audio to it. */
  seekToWord(surah, ayah, index) {
    const a = this.currentAudio;
    if (!a || !this.isPlayingAyah || this.currentSurah !== surah || this.currentAyah !== ayah) return false;
    const seg = this.segments.find((x) => x.index === index);
    if (!seg) return false;
    a.currentTime = Math.max(0, seg.start);
    this.activeWordIndex = index;
    if (this.onWordHighlight) this.onWordHighlight(index);
    return true;
  }

  stopAudioOnly() {
    if (this._gapTimer) { clearTimeout(this._gapTimer); this._gapTimer = null; }
    if (this._raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this._raf);
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.currentWordAudio) {
      this.currentWordAudio.pause();
      this.currentWordAudio = null;
    }
    this.isPlayingAyah = false;
    this.isPlayingBismillah = false;
    this.activeWordIndex = null;
    if (this.onWordHighlight) this.onWordHighlight(null);
  }

  /** Playback reached the end: clear the finished track and position. */
  finishQueue() {
    this.stopAudioOnly();
    this.nextAudio = null;
    this.currentAyah = null;
    this.playMode = null;
    this.notifyState();
  }

  /** True when there is a paused (not finished) track that can be resumed. */
  canResume(surahNumber, ayahNumber = null) {
    return !!this.currentAudio && !this.isPlayingAyah && this.currentSurah === surahNumber &&
      (ayahNumber === null || this.currentAyah === ayahNumber);
  }

  stop() {
    this.stopAudioOnly();
    this.nextAudio = null;
    this.notifyState();
  }

  setPlaybackRate(rate) {
    this.playbackRate = rate;
    if (this.currentAudio) {
      this.currentAudio.playbackRate = rate;
      if ("preservesPitch" in this.currentAudio) this.currentAudio.preservesPitch = true;
    }
    this.notifyState();
  }

  getPlaybackRate() {
    return this.playbackRate;
  }

  setRepeat(val) {
    this.repeatAyah = !!val;
    this.repeatMode = val ? "ayah" : "off";
    this.notifyState();
  }

  isRepeat() {
    return this.repeatAyah || this.repeatMode === "ayah";
  }

  setRepeatMode(mode, options = {}) {
    this.repeatMode = mode;
    this.repeatAyah = mode === "ayah";
    if (mode === "range" && options.range) {
      this.repeatRange = options.range;
    }
    this.notifyState();
  }

  getRepeatMode() {
    return this.repeatMode;
  }

  setAutoPlay(val) {
    this.autoPlayNext = !!val;
  }

  isAutoPlay() {
    return this.autoPlayNext;
  }

  updateMediaSession(metadata = {}) {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      const reciter = this.getCurrentReciter();
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title || `Ayah ${this.currentAyah || 1}`,
        artist: metadata.artist || reciter.nameEn,
        album: metadata.album || `Surah ${this.currentSurah || 1}`,
        artwork: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      });

      navigator.mediaSession.setActionHandler("play", () => this.resume());
      navigator.mediaSession.setActionHandler("pause", () => this.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => this.playPrevious());
      navigator.mediaSession.setActionHandler("nexttrack", () => this.playNext());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (this.currentAudio && details.seekTime !== undefined) {
          this.currentAudio.currentTime = details.seekTime;
        }
      });
    } catch (e) {
      console.warn("MediaSession error:", e);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyState() {
    wakeLockManager.setAudioPlaying(this.isPlayingAyah);
    const payload = {
      isPlaying: this.isPlayingAyah,
      currentSurah: this.currentSurah,
      currentAyah: this.currentAyah,
      reciter: this.getCurrentReciter(),
      rate: this.playbackRate,
      repeatMode: this.repeatMode,
      repeatRange: this.repeatRange,
      playMode: this.playMode
    };
    if (this.onStateChange) this.onStateChange(payload);
    this.listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error("Audio state subscriber error:", err);
      }
    });
  }
}

export const audioManager = new AudioManager();
if (typeof window !== "undefined") {
  window.audioManager = audioManager;
}
