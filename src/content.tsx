import React from "react";
import { createRoot } from "react-dom/client";
import { InjectedApp } from "./components/InjectedApp";
import { Song, DJStyle, DJVoice, AppLanguage } from "../types";
import "./index.css"; // Inject Tailwind Styles

// Prevent running in iframes
if (window !== window.top) {
  throw new Error("Hori-s.FM: Content script blocked in iframe.");
}

console.log("Hori-s.FM Content Script Loaded (Styles v2.5 - Single Instance)");

// --- TYPES & STATE ---
type DJState = "IDLE" | "GENERATING" | "READY" | "PLAYING" | "COOLDOWN";

interface State {
  status: DJState;
  currentSongSig: string; // ID to track if song changed
  bufferedAudio: string | null; // Base64 audio
  generatedForSig: string | null; // CONTEXT VALIDATION
  lastTime: number;
  lastSongChangeTs: number;
}

let state: State = {
  status: "IDLE",
  currentSongSig: "",
  bufferedAudio: null,
  generatedForSig: null,
  lastTime: 0,
  lastSongChangeTs: 0,
};

// --- DOM UTILS ---
const getMoviePlayer = () => document.querySelector("video");

const getSongInfo = () => {
  // 1. Current Song Parsers - SCOPED TO PLAYER BAR
  const playerBar = document.querySelector("ytmusic-player-bar");
  if (!playerBar)
    return {
      current: { title: "", artist: "", album: "" },
      next: { title: "", artist: "" },
      playlistContext: [],
    };

  const titleEl = playerBar.querySelector(".content-info-wrapper .title");
  const subtitleEl = playerBar.querySelector(".content-info-wrapper .subtitle");

  let title = titleEl?.textContent || "";
  let artist = "";
  let album = "";

  if (subtitleEl && subtitleEl.textContent) {
    const parts = subtitleEl.textContent.split("•").map((s) => s.trim());
    if (parts.length >= 1) artist = parts[0];
    if (parts.length >= 2) album = parts[1];
  }

  // 2. Queue Logic (Context)
  const queueItems = document.querySelectorAll("ytmusic-player-queue-item");
  let currentIndex = -1;
  const playlistContext: string[] = [];

  // --- ROBUST CURRENT INDEX DETECTION ---

  // Attempt 1: Trust 'selected' attribute
  queueItems.forEach((item, index) => {
    if (item.hasAttribute("selected")) currentIndex = index;
  });

  // Attempt 2: Validation - Does the 'selected' item actually match the current title?
  let validationFailed = false;
  if (currentIndex !== -1) {
    const selectedTitle = queueItems[currentIndex].querySelector(".song-title")?.textContent;
    if (selectedTitle && selectedTitle !== title) {
      console.warn(
        `[Hori-s] Queue Mismatch: Selected "${selectedTitle}" vs Playing "${title}". Rescanning...`
      );
      validationFailed = true;
      currentIndex = -1; // Reset to force rescan
    }
  }

  // Attempt 3: Scanner - Find item matching current title
  if (currentIndex === -1) {
    // We look for the first match. In a perfect world we'd use previous history to disambiguate duplicates,
    // but for now, first match is safer than "no match".
    for (let i = 0; i < queueItems.length; i++) {
      const itemTitle = queueItems[i].querySelector(".song-title")?.textContent;
      if (itemTitle === title) {
        currentIndex = i;
        break; // Take first match
      }
    }
  }

  // Capture context around the determined index
  if (currentIndex !== -1) {
    const start = Math.max(0, currentIndex - 5);
    const end = Math.min(queueItems.length, currentIndex + 5);
    for (let i = start; i < end; i++) {
      const title = queueItems[i].querySelector(".song-title")?.textContent || "Unknown";
      const artist = queueItems[i].querySelector(".byline")?.textContent || "Unknown";
      playlistContext.push(`${itemIndexToLabel(i, currentIndex)}: ${title} by ${artist}`);
    }
  }

  // 3. Next Song Logic
  let nextTitle = "";
  let nextArtist = "";

  // Strategy A: Queue (Preferred)
  if (currentIndex !== -1 && currentIndex + 1 < queueItems.length) {
    nextTitle = queueItems[currentIndex + 1].querySelector(".song-title")?.textContent || "";
    nextArtist = queueItems[currentIndex + 1].querySelector(".byline")?.textContent || "";
  }

  // Strategy B: "Next" Button Tooltip (Fallback)
  // The next button often has a title like "Next: Song Name" or "Next song"
  if (!nextTitle) {
    const nextButton = document.querySelector(".next-button");
    if (nextButton) {
      const buttonTitle = nextButton.getAttribute("title");
      if (buttonTitle && buttonTitle.startsWith("Next: ")) {
        // "Next: Song Name" - sadly doesn't give artist, but better than nothing
        nextTitle = buttonTitle.replace("Next: ", "");
        nextArtist = "Unknown"; // We can't easily get artist from tooltip
        console.log(`[Hori-s] Fallback: Used Next Button tooltip for "${nextTitle}"`);
      }
    }
  }

  return {
    current: { title, artist, album },
    next: { title: nextTitle, artist: nextArtist },
    playlistContext,
  };
};

function itemIndexToLabel(index: number, current: number): string {
  if (index === current) return "[NOW PLAYING]";
  if (index > current) return `[UP NEXT +${index - current}]`;
  return `[PREVIOUS -${current - index}]`;
}

// --- AUDIO SYSTEM ---
const audioEl = document.createElement("audio");
audioEl.id = "horis-fm-dj-voice";
document.body.appendChild(audioEl);

// --- WEB AUDIO DUCKING SYSTEM ---
class WebAudioDucker {
  public ctx: AudioContext | null = null; // Public for debugging/React access
  public source: MediaElementAudioSourceNode | null = null;
  public gainNode: GainNode | null = null;
  public analyser: AnalyserNode | null = null; // VISUALIZER SUPPORT
  private initialized = false;

  constructor() {
    // Initialize securely
  }

  private init(video: HTMLMediaElement) {
    if (this.initialized && this.source?.mediaElement === video) return;

    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new Ctx();
      }

      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }

      this.source = this.ctx.createMediaElementSource(video);
      this.gainNode = this.ctx.createGain();

      // CONNECT: Source -> Gain -> Destination
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.initialized = true;
      console.log("[Audio] WebAudio Ducker Initialized");
    } catch (e) {
      console.error("[Audio] WebAudio Init Failed:", e);
    }
  }

  public async duck(duration: number = 2000) {
    const video = document.querySelector("video");
    if (!video) return;

    this.init(video);
    if (!this.ctx || !this.gainNode) return;

    console.log("[Audio] Ducking music...");
    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0.2, now + duration / 1000);
  }

  public async unduck(duration: number = 3000) {
    if (!this.ctx || !this.gainNode) return;

    console.log("[Audio] Restoring music...");
    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(1.0, now + duration / 1000);
  }
}

const ducker = new WebAudioDucker();

// --- MOUNT REACT APP ---
// We create a hidden container for the React Root.
// Portals will render the actual UI into the correct YTM elements.
const mountReactApp = () => {
  const rootId = "horis-extension-root";
  if (document.getElementById(rootId)) return;

  const rootDiv = document.createElement("div");
  rootDiv.id = rootId;
  document.body.appendChild(rootDiv);

  const root = createRoot(rootDiv);
  root.render(<InjectedApp ducker={ducker} />);
  console.log("[Hori-s] Injected React App Mounted");
};

// Initial mount attempt
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountReactApp);
} else {
  mountReactApp();
}

const playBufferedAudio = async () => {
  if (!state.bufferedAudio) return;

  // CONTEXT VALIDATION
  if (state.generatedForSig !== state.currentSongSig) {
    console.warn(`[Audio] Validation Failed! Stale buffer.`);
    state.status = "IDLE";
    state.bufferedAudio = null;
    state.generatedForSig = null;
    return;
  }

  console.log("[Audio] Playing buffered DJ intro...");
  state.status = "PLAYING";

  const url = `data:audio/wav;base64,${state.bufferedAudio}`;
  audioEl.src = url;
  audioEl.volume = 1.0;

  // DUCK YTM
  ducker.duck(2000);

  try {
    await audioEl.play();
  } catch (e) {
    console.error("[Audio] Playback failed:", e);
    ducker.unduck(1000);
    state.status = "IDLE";
  }

  audioEl.onended = () => {
    console.log("[Audio] Playback finished.");
    ducker.unduck(3000);

    state.status = "COOLDOWN";
    state.bufferedAudio = null;

    setTimeout(() => {
      if (state.status === "COOLDOWN") state.status = "IDLE";
    }, 5000);
  };
};

// --- MAIN LOOP ---
const mainLoop = setInterval(() => {
  // Safety Check: Extension Reloaded?
  if (!chrome.runtime?.id) {
    console.log(
      "[Hori-s.FM] Extension context invalidated. Stopping script. Please refresh the page."
    );
    clearInterval(mainLoop);
    return;
  }

  // Ensure APP is mounted
  if (!document.getElementById("horis-extension-root")) {
    mountReactApp();
  }

  const video = getMoviePlayer();
  if (!video || video.paused || !video.duration) return;

  const { current, next } = getSongInfo();
  const sig = `${current.title}|${current.artist}`;
  const currentTime = video.currentTime;
  const timeLeft = video.duration - currentTime;

  // --- RESET LOGIC ---
  if (sig !== state.currentSongSig) {
    console.log(`[State] New Song detected: "${current.title}"`);
    state.currentSongSig = sig;
    state.status = "IDLE";
    state.bufferedAudio = null;
    state.generatedForSig = null;
    state.lastSongChangeTs = Date.now();

    // CRITICAL: If audio is still playing (transitioning), ensure new song is DUCKED.
    if (!audioEl.paused) {
      console.log("[Audio] Transition active during song change. Re-applying ducking.");
      ducker.duck(50); // Fast re-duck
    }
  }

  if (state.lastTime > currentTime + 5) {
    console.log(`[State] Seek detected. Resetting.`);
    state.status = "IDLE";
    state.bufferedAudio = null;
    state.generatedForSig = null;
  }
  state.lastTime = currentTime;

  // --- STATE MACHINE ---
  if (state.status === "IDLE" && timeLeft < 45 && timeLeft > 10) {
    // PREVENT PREMATURE GENERATION:
    // 1. Guard against start of song (if song is shorter than 60s, we might need adjustments, but >20s played is safe rule)
    if (currentTime < 20) {
      return;
    }

    // 2. Guard against recent song changes
    if (Date.now() - state.lastSongChangeTs < 5000) {
      // Increased to 5s
      return;
    }

    if (!current.title || !current.artist) return;

    state.status = "GENERATING";
    state.generatedForSig = sig;
    console.log("[Generator] Starting pre-generation...");
    console.log(`[Generator] Context: "${current.title}" -> "${next.title}"`);
    console.log(`[Generator] Sending request to Background...`);

    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
      console.error("[Generator] Extension API not available.");
      return;
    }

    try {
      chrome.storage.local.get(["horisFmSettings"], (result) => {
        if (chrome.runtime.lastError) {
          console.error("[Generator] Storage access failed:", chrome.runtime.lastError);
          return;
        }
        const settings = (result as any).horisFmSettings || { enabled: true, voice: "Kore" };

        if (!settings.enabled) {
          console.log("[Generator] Aborting: System Disabled");
          state.status = "COOLDOWN";
          return;
        }

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
                playlistContext: (current as any).playlistContext || [],
                style: settings.style || "STANDARD",
                voice: settings.voice,
                language: settings.language || "en",
                customPrompt: settings.customPrompt,
                dualDjMode: settings.dualDjMode,
                secondaryVoice: settings.secondaryDjVoice,
              },
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.warn("[Generator] Communication error:", chrome.runtime.lastError);
                return;
              }

              console.log("[Generator] Background Response Received.");

              if (state.currentSongSig !== sig) {
                console.warn("[Generator] Discarding response: Song changed during generation.");
                return;
              }

              if (response && response.audio) {
                console.log("[Generator] Audio received & Buffered.");
                state.bufferedAudio = response.audio;
                state.status = "READY";
              } else {
                state.status = "COOLDOWN";
              }
            }
          );
        } catch (e) {
          console.error("[Generator] Failed to send message:", e);
        }
      });
    } catch (e) {
      console.log("[Hori-s.FM] Extension context invalidated during storage access. Stopping.");
      clearInterval(mainLoop);
    }
  }

  if (state.status === "READY" && timeLeft < 12) {
    playBufferedAudio();
  }
}, 1000);
