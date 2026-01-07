import React from "react";
import { createRoot } from "react-dom/client";
import { InjectedApp } from "./components/InjectedApp";
import { Song, DJVoice, AppLanguage } from "./types";
import { DJStyle } from "./config";
import "./index.css"; // Inject Tailwind Styles

// Prevent running in iframes
if (window !== window.top) {
  throw new Error("Hori-s.FM: Content script blocked in iframe.");
}

console.log("Hori-s.FM Content Script Loaded (v2.6 - Clean Logs)");

// --- TYPES & STATE ---
type DJState = "IDLE" | "GENERATING" | "READY" | "PLAYING" | "COOLDOWN";

interface State {
  status: DJState;
  currentSongSig: string; // ID to track if song changed
  bufferedAudio: string | null; // Base64 audio
  generatedForSig: string | null; // CONTEXT VALIDATION
  bufferedAudioType: "SHORT" | "LONG"; // New State
  lastTime: number;
  lastSongChangeTs: number;
  recentThemeIndices: number[]; // Track last 2 theme indices
  themeUsageHistory: Record<number, number>; // themeIndex -> timestamp
}

// --- INITIAL LOAD ---
chrome.storage.local.get(["recentThemes", "themeUsageHistory"], (result) => {
  if (Array.isArray(result.recentThemes)) {
    state.recentThemeIndices = result.recentThemes as number[];
  }
  if (result.themeUsageHistory) {
    state.themeUsageHistory = result.themeUsageHistory as Record<number, number>;
  }
});

// --- MANUAL TRIGGER LISTENER ---
window.addEventListener("HORIS_MANUAL_TRIGGER", () => {
  console.log("[Hori-s] ⚡ Manual Trigger Event Detected!");
  if (state.status === "IDLE" || state.status === "COOLDOWN") {
    (state as any).forceGenerate = true;
  }
});

const broadcastStatusUpdate = () => {
  window.dispatchEvent(new CustomEvent("HORIS_STATUS_UPDATE", { detail: state.status }));
};

const updateStatus = (newStatus: DJState) => {
  state.status = newStatus;
  broadcastStatusUpdate();
};

let state: State = {
  status: "IDLE",
  currentSongSig: "",
  bufferedAudio: null,
  generatedForSig: null,
  bufferedAudioType: "SHORT",
  lastTime: 0,
  lastSongChangeTs: 0,
  recentThemeIndices: [],
  themeUsageHistory: {},
};

// --- DOM UTILS ---
const getMoviePlayer = () => {
  const videos = Array.from(document.querySelectorAll("video"));
  if (videos.length === 0) return null;
  if (videos.length === 1) return videos[0];
  const playing = videos.filter(v => !v.paused);
  if (playing.length >= 1) return playing[0];
  const valid = videos.filter(v => v.src && v.duration > 0);
  if (valid.length > 0) return valid[valid.length - 1];
  return videos[0];
};

const normalizeString = (str: string | null | undefined): string => {
  if (!str) return "";
  return str
    .replace(/\bExplicit\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const getSongInfo = () => {
  const playerBar = document.querySelector("ytmusic-player-bar");
  if (!playerBar)
    return {
      current: { title: "", artist: "", album: "" },
      next: { title: "", artist: "" },
      playlistContext: [],
    };

  const titleEl = playerBar.querySelector(".content-info-wrapper .title");
  const subtitleEl = playerBar.querySelector(".content-info-wrapper .subtitle");

  let title = titleEl?.textContent?.trim() || "";
  let artist = "";
  let album = "";

  if (subtitleEl && subtitleEl.textContent) {
    const parts = subtitleEl.textContent.split("•").map((s) => s.trim());
    if (parts.length >= 1) artist = parts[0];
    if (parts.length >= 2) album = parts[1];
  }

  const queueContainer = document.querySelector("ytmusic-player-queue");
  const queueItems = queueContainer ? Array.from(queueContainer.querySelectorAll("ytmusic-player-queue-item")) : [];
  let currentIndex = -1;
  const playlistContext: string[] = [];
  const normalizedCurrentTitle = normalizeString(title);

  const isVisible = (el: Element) => {
    const htmlEl = el as HTMLElement;
    return htmlEl.offsetHeight > 0 || htmlEl.offsetParent !== null;
  };

  queueItems.forEach((item, index) => {
    if (item.hasAttribute("selected") && isVisible(item)) {
      currentIndex = index;
    }
  });

  if (currentIndex === -1) {
    queueItems.forEach((item, index) => {
      if (!isVisible(item)) return;
      const playBtn = item.querySelector("ytmusic-play-button-renderer");
      if (playBtn && (playBtn.getAttribute("state") === "playing" || playBtn.getAttribute("state") === "paused")) {
        currentIndex = index;
      }
    });
  }

  if (currentIndex === -1) {
    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      if (!isVisible(item)) continue;
      const itemTitle = item.querySelector(".song-title")?.textContent;
      if (normalizeString(itemTitle) === normalizedCurrentTitle) {
        currentIndex = i;
        break;
      }
    }
  }

  if (currentIndex !== -1) {
    const start = Math.max(0, currentIndex - 5);
    const end = Math.min(queueItems.length, currentIndex + 5);
    for (let i = start; i < end; i++) {
      const t = queueItems[i].querySelector(".song-title")?.textContent || "Unknown";
      const a = queueItems[i].querySelector(".byline")?.textContent || "Unknown";
      playlistContext.push(`${itemIndexToLabel(i, currentIndex)}: ${t} by ${a}`);
    }
  }

  let nextTitle = "";
  let nextArtist = "";
  if (currentIndex !== -1) {
    for (let i = currentIndex + 1; i < queueItems.length; i++) {
      if (isVisible(queueItems[i])) {
        nextTitle = queueItems[i].querySelector(".song-title")?.textContent || "";
        nextArtist = queueItems[i].querySelector(".byline")?.textContent || "";
        break;
      }
    }
  }

  if (!nextTitle) {
    const nextButton = document.querySelector(".next-button");
    if (nextButton) {
      const buttonTitle = nextButton.getAttribute("title");
      if (buttonTitle?.startsWith("Next: ")) {
        nextTitle = buttonTitle.replace("Next: ", "");
        nextArtist = "Unknown";
      }
    }
  }

  return {
    current: { title: title.replace(/\bExplicit\b/gi, "").trim(), artist, album },
    next: { title: nextTitle.replace(/\bExplicit\b/gi, "").trim(), artist: nextArtist },
    playlistContext,
  };
};

function itemIndexToLabel(index: number, current: number): string {
  if (index === current) return "[NOW PLAYING]";
  if (index > current) return `[UP NEXT +${index - current}]`;
  return `[PREVIOUS -${current - index}]`;
}

const getScrapedTime = (): { currentTime: number; duration: number } | null => {
  const progressBar = document.querySelector("#progress-bar");
  if (progressBar) {
    const now = parseInt(progressBar.getAttribute("aria-valuenow") || "0", 10);
    const max = parseInt(progressBar.getAttribute("aria-valuemax") || "0", 10);
    if (!isNaN(now) && !isNaN(max) && max > 0) return { currentTime: now, duration: max };
  }
  const timeInfo = document.querySelector(".time-info");
  if (timeInfo?.textContent) {
    const parts = timeInfo.textContent.split("/").map(s => s.trim());
    if (parts.length === 2) {
      const parseTime = (str: string) => {
        const [m, s] = str.split(":").map(Number);
        return (m * 60) + s;
      };
      const now = parseTime(parts[0]);
      const max = parseTime(parts[1]);
      if (!isNaN(now) && !isNaN(max) && max > 0) return { currentTime: now, duration: max };
    }
  }
  return null;
};

const audioEl = document.createElement("audio");
audioEl.id = "horis-fm-dj-voice";
document.body.appendChild(audioEl);

class WebAudioDucker {
  public ctx: AudioContext | null = null;
  public source: MediaElementAudioSourceNode | null = null;
  public gainNode: GainNode | null = null;
  private initialized = false;

  constructor() { }

  private init(video: HTMLMediaElement) {
    if (this.initialized && this.source?.mediaElement === video) return;
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new Ctx();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      this.source = this.ctx.createMediaElementSource(video);
      this.gainNode = this.ctx.createGain();
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.error("[Hori-s] Audio Init Failed:", e);
    }
  }

  public async duck(duration: number = 2000) {
    const video = document.querySelector("video");
    if (!video) return;
    this.init(video);
    if (!this.ctx || !this.gainNode) return;
    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0.2, now + duration / 1000);
  }

  public async unduck(duration: number = 3000) {
    if (!this.ctx || !this.gainNode) return;
    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(1.0, now + duration / 1000);
  }
}

const ducker = new WebAudioDucker();

const mountReactApp = () => {
  const rootId = "horis-extension-root";
  if (document.getElementById(rootId)) return;
  const rootDiv = document.createElement("div");
  rootDiv.id = rootId;
  document.body.appendChild(rootDiv);
  const root = createRoot(rootDiv);
  root.render(<InjectedApp ducker={ducker} />);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountReactApp);
} else {
  mountReactApp();
}

const playBufferedAudio = async () => {
  if (!state.bufferedAudio) return;
  if (state.generatedForSig !== state.currentSongSig) {
    updateStatus("IDLE");
    state.bufferedAudio = null;
    state.generatedForSig = null;
    return;
  }

  updateStatus("PLAYING");
  const url = `data:audio/wav;base64,${state.bufferedAudio}`;
  audioEl.src = url;
  audioEl.volume = 1.0;

  await new Promise((resolve) => {
    audioEl.onloadedmetadata = resolve;
  });

  const djDuration = audioEl.duration;

  if (state.bufferedAudioType === "LONG") {
    ducker.duck(2000);
    const freshTime = getScrapedTime();
    let musicPauseDelay = 2000;
    if (freshTime) {
      const remaining = freshTime.duration - freshTime.currentTime;
      musicPauseDelay = Math.max(0, (remaining - 2) * 1000);
    }

    setTimeout(() => {
      if (state.status === "PLAYING") {
        const video = getMoviePlayer();
        if (video) video.pause();
      }
    }, musicPauseDelay);

    const resumeDelay = Math.max(0, (djDuration - 5) * 1000);
    setTimeout(() => {
      if (state.status === "PLAYING") {
        const video = getMoviePlayer();
        if (video) video.play();
      }
    }, resumeDelay);
  } else {
    ducker.duck(2000);
  }

  try {
    await audioEl.play();
  } catch (e) {
    console.error("[Hori-s] Playback failed:", e);
    ducker.unduck(1000);
    updateStatus("IDLE");
    const video = getMoviePlayer();
    if (video && state.bufferedAudioType === "LONG") video.play();
  }

  audioEl.onended = () => {
    ducker.unduck(3000);
    updateStatus("COOLDOWN");
    state.bufferedAudio = null;
    setTimeout(() => {
      if (state.status === "COOLDOWN") updateStatus("IDLE");
    }, 5000);
  };
};

const mainLoop = setInterval(() => {
  if (!chrome.runtime?.id) {
    clearInterval(mainLoop);
    return;
  }

  if (!document.getElementById("horis-extension-root")) mountReactApp();

  const timeData = getScrapedTime();
  if (!timeData) return;
  const { currentTime, duration } = timeData;

  const video = getMoviePlayer();
  const isPaused = video ? video.paused : false;

  if (isPaused) return;

  const { current, next, playlistContext } = getSongInfo();
  const sig = `${current.title}|${current.artist}`;
  const timeLeft = duration - currentTime;

  if (sig !== state.currentSongSig) {
    console.log(`[Hori-s] 🎵 Next song detected: "${current.title}" by ${current.artist}`);
    state.currentSongSig = sig;
    updateStatus("IDLE");
    state.bufferedAudio = null;
    state.generatedForSig = null;
    state.lastSongChangeTs = Date.now();
    if (!audioEl.paused) ducker.duck(50);
  }

  state.lastTime = currentTime;

  const alreadyGenerated = state.generatedForSig === sig;
  const triggerRatio = (state as any).debugTriggerPoint || 0.25;
  const isPastTriggerPoint = currentTime > (duration * triggerRatio);
  const hasEnoughTime = timeLeft > 20;
  const forceGenerate = (state as any).forceGenerate === true;

  if (state.status === "IDLE" && !alreadyGenerated) {
    if ((isPastTriggerPoint && hasEnoughTime) || forceGenerate) {
      if (forceGenerate) (state as any).forceGenerate = false;
      if (Date.now() - state.lastSongChangeTs < 5000) return;
      if (!current.title || !current.artist) return;

      updateStatus("GENERATING");
      state.generatedForSig = sig;

      // Generation logs moved inside callback below

      chrome.storage.local.get(["horisFmSettings"], (result) => {
        const settings = (result as any).horisFmSettings || { enabled: true, voice: "sadachbia" };
        console.log(`[Hori-s] ✨ Generation started (Text: ${settings.textModel || "FLASH"}, TTS: ${settings.ttsModel || "FLASH"})`);
        console.log(`[Hori-s] Current: ${current.title}`);
        console.log(`[Hori-s] Next: ${next.title || "Unknown Track"}`);
        if (settings.debug?.triggerPoint) (state as any).debugTriggerPoint = settings.debug.triggerPoint;
        if (!settings.enabled) {
          updateStatus("COOLDOWN");
          return;
        }

        const prob = settings.longMessageProbability ?? 0.5;
        const isLong = Math.random() < prob;

        try {
          chrome.runtime.sendMessage(
            {
              type: "GENERATE_INTRO",
              data: {
                currentSong: { title: current.title, artist: current.artist, id: "ytm-current" },
                nextSong: {
                  title: next.title || "Next Track",
                  artist: next.artist || "Unknown",
                  id: "ytm-next",
                },
                playlistContext,
                style: settings.style || "STANDARD",
                voice: settings.voice,
                language: settings.language || "en",
                customPrompt: settings.customPrompt,
                dualDjMode: settings.dualDjMode,
                secondaryVoice: settings.secondaryDjVoice,
                isLongMessage: isLong,
                recentThemeIndices: state.recentThemeIndices,
                themeUsageHistory: state.themeUsageHistory,
                debugSettings: settings.debug,
                textModel: settings.textModel,
                ttsModel: settings.ttsModel,
              },
            },
            (response) => {
              if (chrome.runtime.lastError) {
                updateStatus("IDLE");
                state.generatedForSig = null;
                return;
              }

              if (state.currentSongSig !== sig) return;

              if (response && response.audio) {
                state.bufferedAudio = response.audio;
                state.bufferedAudioType = isLong ? "LONG" : "SHORT";

                if (response.themeIndex !== null && typeof response.themeIndex === "number") {
                  state.recentThemeIndices = [response.themeIndex, ...state.recentThemeIndices].slice(0, 2);
                  state.themeUsageHistory[response.themeIndex] = Date.now();
                  chrome.storage.local.set({
                    recentThemes: state.recentThemeIndices,
                    themeUsageHistory: state.themeUsageHistory
                  });
                }

                if (response.script) {
                  console.log(`[Hori-s] 🤖 Script: "${response.script}"`);
                }
                console.log(`[Hori-s] ✅ Generation ready`);
                updateStatus("READY");
              } else {
                updateStatus("COOLDOWN");
              }
            }
          );
        } catch (e) {
          state.status = "IDLE";
          state.generatedForSig = null;
        }
      });
    }
  }

  const freshTime = getScrapedTime();
  if (state.status === "READY" && freshTime) {
    const freshLeft = freshTime.duration - freshTime.currentTime;
    if (freshLeft < 12 && freshLeft > 1) {
      playBufferedAudio();
    }
  }
}, 1000);
