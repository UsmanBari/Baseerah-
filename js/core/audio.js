/* Baseerah — Audio Architecture & Mosque Respect Setting */
import { state } from "./state.js";

class AudioManager {
  constructor() {
    this.currentAudio = null;
  }

  isMuted() {
    return state.mosqueMute;
  }

  playAyah(surahNumber, ayahNumber) {
    if (this.isMuted()) {
      return {
        played: false,
        reason: "mosque_mute_active",
        messageUr: "احترامِ مسجد موڈ: آواز بند ہے",
        messageEn: "Mosque Respect Mode is active: Audio muted"
      };
    }

    // Stop existing audio
    this.stop();

    // In v1 offline kiosk without pre-bundled 6236 MP3s, audio player architecture is ready
    // URL pattern e.g. "audio/{surah}/{ayah}.mp3"
    const audioUrl = `audio/${String(surahNumber).padStart(3, "0")}_${String(ayahNumber).padStart(3, "0")}.mp3`;
    const audio = new Audio(audioUrl);
    this.currentAudio = audio;

    audio.play().catch((err) => {
      console.info("Audio playback not available offline for this ayah:", err);
    });

    return { played: true, audio };
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }
}

export const audioManager = new AudioManager();
