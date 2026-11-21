/* Baseerah — Authentic Quran Recitation Audio Architecture & Mosque Respect Setting */
import { state } from "./state.js";

class AudioManager {
  constructor() {
    this.currentAudio = null;
    this.currentWordAudio = null;
    this.isPlayingAyah = false;
    this.playbackRate = 1.0;
    this.repeatAyah = false;
    this.autoPlayNext = true;
    this.currentSurah = null;
    this.currentAyah = null;
    this.activeWordIndex = null;
    this.segments = [];
    this.onWordHighlight = null;
    this.onStateChange = null;
  }

  isMuted() {
    return !!state.mosqueMute;
  }

  getPlayUrls(surahNumber, ayahNumber) {
    const sPadded = String(surahNumber).padStart(3, "0");
    const aPadded = String(ayahNumber).padStart(3, "0");
    return [
      `https://everyayah.com/data/Alafasy_128kbps/${sPadded}${aPadded}.mp3`,
      `https://verses.quran.com/Alafasy/mp3/${sPadded}${aPadded}.mp3`,
      `audio/${sPadded}_${aPadded}.mp3`
    ];
  }

  getWordAudioUrl(surahNumber, ayahNumber, wordIndex) {
    const sPadded = String(surahNumber).padStart(3, "0");
    const aPadded = String(ayahNumber).padStart(3, "0");
    const wPadded = String(wordIndex + 1).padStart(3, "0");
    return `https://audio.qurancdn.com/wbw/${sPadded}_${aPadded}_${wPadded}.mp3`;
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

    this.stop();

    this.currentSurah = surahNumber;
    this.currentAyah = ayahNumber;
    this.onWordHighlight = options.onWordHighlight || null;
    this.onStateChange = options.onStateChange || null;

    const urls = this.getPlayUrls(surahNumber, ayahNumber);
    let urlIndex = 0;

    const audio = new Audio();
    audio.playbackRate = this.playbackRate;
    this.currentAudio = audio;

    const tryNextUrl = () => {
      if (urlIndex < urls.length) {
        audio.src = urls[urlIndex++];
        audio.load();
        audio.play().catch((err) => {
          console.warn(`Audio attempt failed for ${audio.src}:`, err);
          tryNextUrl();
        });
      } else {
        this.isPlayingAyah = false;
        if (options.onError) options.onError();
        if (this.onStateChange) this.onStateChange({ isPlaying: false });
      }
    };

    // Calculate or prepare word segments
    const words = options.words || [];
    const totalWords = words.length;

    audio.addEventListener("loadedmetadata", () => {
      const dur = audio.duration || 5.0;
      // Proportional timing calculation if explicit segments not provided
      if (options.segments && options.segments.length > 0) {
        this.segments = options.segments;
      } else if (totalWords > 0) {
        let totalChars = 0;
        const weights = words.map((w) => {
          const len = (w.ar || "").length || 3;
          totalChars += len;
          return len;
        });
        let curTime = 0;
        this.segments = weights.map((wt, i) => {
          const segDur = (wt / totalChars) * dur;
          const start = curTime;
          const end = i === totalWords - 1 ? dur : curTime + segDur;
          curTime = end;
          return { index: i, start, end };
        });
      }
    });

    audio.addEventListener("timeupdate", () => {
      const t = audio.currentTime;
      if (options.onTimeUpdate) options.onTimeUpdate(t, audio.duration);

      // Find current word
      if (this.segments.length > 0) {
        const active = this.segments.find((seg) => t >= seg.start && t < seg.end);
        const idx = active ? active.index : null;
        if (idx !== this.activeWordIndex) {
          this.activeWordIndex = idx;
          if (this.onWordHighlight) this.onWordHighlight(idx);
        }
      }
    });

    audio.addEventListener("play", () => {
      this.isPlayingAyah = true;
      if (this.onStateChange) this.onStateChange({ isPlaying: true });
    });

    audio.addEventListener("pause", () => {
      if (!audio.seeking) {
        this.isPlayingAyah = false;
        if (this.onStateChange) this.onStateChange({ isPlaying: false });
      }
    });

    audio.addEventListener("ended", () => {
      this.isPlayingAyah = false;
      this.activeWordIndex = null;
      if (this.onWordHighlight) this.onWordHighlight(null);
      if (this.onStateChange) this.onStateChange({ isPlaying: false });

      if (this.repeatAyah) {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else if (options.onEnded) {
        options.onEnded();
      }
    });

    tryNextUrl();
    return { played: true, audio };
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
    if (this.currentAudio && this.isPlayingAyah) {
      this.currentAudio.pause();
      this.isPlayingAyah = false;
      if (this.onStateChange) this.onStateChange({ isPlaying: false });
    }
  }

  resume() {
    if (this.currentAudio && !this.isPlayingAyah) {
      this.currentAudio.playbackRate = this.playbackRate;
      this.currentAudio.play().catch(console.warn);
      this.isPlayingAyah = true;
      if (this.onStateChange) this.onStateChange({ isPlaying: true });
    }
  }

  stop() {
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
    this.activeWordIndex = null;
    if (this.onWordHighlight) this.onWordHighlight(null);
    if (this.onStateChange) this.onStateChange({ isPlaying: false });
  }

  setPlaybackRate(rate) {
    this.playbackRate = rate;
    if (this.currentAudio) {
      this.currentAudio.playbackRate = rate;
    }
  }

  getPlaybackRate() {
    return this.playbackRate;
  }

  setRepeat(val) {
    this.repeatAyah = !!val;
  }

  isRepeat() {
    return this.repeatAyah;
  }

  setAutoPlay(val) {
    this.autoPlayNext = !!val;
  }

  isAutoPlay() {
    return this.autoPlayNext;
  }
}

export const audioManager = new AudioManager();
if (typeof window !== "undefined") {
  window.audioManager = audioManager;
}
