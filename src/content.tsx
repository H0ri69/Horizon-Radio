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
// --- DOM UTILS ---
const getMoviePlayer = () => {
  const videos = Array.from(document.querySelectorAll("video"));
  if (videos.length === 0) return null;

  // If only one, return it
  if (videos.length === 1) return videos[0];

  // If multiple, try to find the "active" one
  // Criteria 1: It is playing (!paused)
  const playing = videos.filter(v => !v.paused);
  if (playing.length === 1) return playing[0]; // Exactly one playing
  if (playing.length > 1) return playing[0]; // Ambiguous, take first playing?

  // Criteria 2: It has a source and duration
  const valid = videos.filter(v => v.src && v.duration > 0);
  if (valid.length > 0) return valid[valid.length - 1]; // Often the *last* inserted video is the new one in SPAs?

  return videos[0];
};

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

// --- TIME SCRAPING UTILS ---
const getScrapedTime = (): { currentTime: number; duration: number } | null => {
  const progressBar = document.querySelector("#progress-bar");

  if (progressBar) {
    // Primary method: ARIA values on the slider
    const now = parseInt(progressBar.getAttribute("aria-valuenow") || "0", 10);
    const max = parseInt(progressBar.getAttribute("aria-valuemax") || "0", 10);

    // YTM uses seconds for these attributes
    if (!isNaN(now) && !isNaN(max) && max > 0) {
      return { currentTime: now, duration: max };
    }
  }

  // Fallback: Time Text (e.g., "1:11 / 3:11")
  const timeInfo = document.querySelector(".time-info");
  if (timeInfo && timeInfo.textContent) {
    const parts = timeInfo.textContent.split("/").map(s => s.trim());
    if (parts.length === 2) {
      const parseTime = (str: string) => {
        const [m, s] = str.split(":").map(Number);
        return (m * 60) + s;
      };
      const now = parseTime(parts[0]);
      const max = parseTime(parts[1]);
      if (!isNaN(now) && !isNaN(max) && max > 0) {
        return { currentTime: now, duration: max };
      }
    }
  }

  return null;
};

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

  // --- TIME SOURCE ---
  // We use the UI scraping as the source of truth
  const timeData = getScrapedTime();
  if (!timeData) return; // Wait for UI to be ready
  const { currentTime, duration } = timeData;

  const video = getMoviePlayer();
  // We still need video for paused state, but NOT for time
  const isPaused = video ? video.paused : false;

  // Heartbeat logging (every 10 seconds while playing)
  if (!isPaused && Math.floor(currentTime) % 10 === 0) {
    console.log(`[Hori-s:Heartbeat] Status: ${state.status}, Time: ${Math.round(currentTime)}s / ${Math.round(duration)}s, Sig: ${state.currentSongSig}`);
  }

  if (isPaused) return;

  const { current, next } = getSongInfo(); // We get playlist context here too
  const sig = `${current.title}|${current.artist}`;
  const timeLeft = duration - currentTime;

  // --- RESET LOGIC ---
  if (sig !== state.currentSongSig) {
    console.log(`[State] New Song detected: "${current.title}"`);
    console.log(`[State] Clearing previous generation state.`);
    state.currentSongSig = sig;
    state.status = "IDLE";
    state.bufferedAudio = null;
    state.generatedForSig = null;
    state.lastSongChangeTs = Date.now();

    // CRITICAL: If audio is still playing (transitioning), ensure new song is DUCKED (or maybe silence it? for now just duck)
    if (!audioEl.paused) {
      console.log("[Audio] Transition active during song change. Keeping ducking active.");
      ducker.duck(50);
    }
  }

  // Detect seek
  if (Math.abs(currentTime - state.lastTime) > 5) { // Use Abs to detect rewinds too
    if (state.lastTime !== 0) { // Ignore initial load jump
      console.log(`[State] Seek detected (Jumped ${Math.round(currentTime - state.lastTime)}s).`);
    }
  }
  state.lastTime = currentTime;

  // --- GENERATION TRIGGER ---
  const alreadyGenerated = state.generatedForSig === sig;
  const isPastHalfway = currentTime > (duration / 2);
  const hasEnoughTime = timeLeft > 20; // Need at least 20s to generate and prep

  if (state.status === "IDLE" && !alreadyGenerated) {
    // Detailed Evaluation Logging (Throttle to avoid spam)
    if (Math.floor(currentTime) % 2 === 0) {
      // Only log if we are getting close or if it's suspicious
      if (currentTime < 10 || (currentTime > duration * 0.4 && currentTime < duration * 0.6)) {
        console.debug(`[Generator:Eval] ${current.title}: Time=${Math.round(currentTime)}s, Dur=${Math.round(duration)}s, PastHalf=${isPastHalfway}, EnoughTime=${hasEnoughTime}`);
      }
    }

    if (isPastHalfway && hasEnoughTime) {
      // EXTRA SAFETY: 
      // Guard against start of song quirks (rare if halfway)
      // Guard against recent song changes (5s buffer)
      if (Date.now() - state.lastSongChangeTs < 5000) {
        return;
      }

      if (!current.title || !current.artist) {
        console.warn("[Generator] Missing track info, skipping trigger.");
        return;
      }

      // >>> TRIGGER GENERATION <<<
      state.status = "GENERATING";
      state.generatedForSig = sig; // Mark as started for this song

      console.log("------------------------------------------------");
      console.log(`[Generator] 🟢 TRIGGERING GENERATION`);
      console.log(`[Generator] Trigger Reason: Middle of song reached (>50%).`);
      console.log(`[Generator] Song: ${current.title}`);
      console.log(`[Generator] Next: ${next.title}`);
      console.log("------------------------------------------------");

      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
        console.error("[Generator] Extension API broken.");
        return;
      }

      chrome.storage.local.get(["horisFmSettings"], (result) => {
        // ... existing message sending logic ...
        if (chrome.runtime.lastError) {
          console.error("[Generator] Storage access failed:", chrome.runtime.lastError);
          state.status = "IDLE"; // Revert status so we can retry? Or maybe COOLDOWN?
          state.generatedForSig = null; // Unmark
          return;
        }
        const settings = (result as any).horisFmSettings || { enabled: true, voice: "kore" };

        if (!settings.enabled) {
          console.log("[Generator] System Disabled. Cancelling.");
          state.status = "COOLDOWN";
          return;
        }

        console.log(`[Generator] Sending request... (Voice: ${settings.voice}, Style: ${settings.style})`);

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
                console.warn("[Generator] Runtime message error:", chrome.runtime.lastError);
                state.status = "IDLE"; // Retry allowed
                state.generatedForSig = null;
                return;
              }

              if (state.currentSongSig !== sig) {
                console.warn("[Generator] Discarding response: Song changed while generating.");
                return;
              }

              if (response && response.audio) {
                console.log("[Generator] ✅ Audio received & Buffered. Waiting for outro...");
                state.bufferedAudio = response.audio;
                state.status = "READY";
              } else {
                console.warn("[Generator] ❌ No audio returned.");
                state.status = "COOLDOWN";
              }
            }
          );
        } catch (e) {
          console.error("[Generator] Send failed:", e);
          state.status = "IDLE";
          state.generatedForSig = null;
        }
      });
    }
  }

  // Debug logging for development (throttle this?)
  // if (Math.floor(currentTime) % 10 === 0) console.log(`[Status] ${state.status} | TimeLeft: ${Math.round(timeLeft)}s`);

  // --- PLAYBACK TRIGGER ---
  // Play when song is ending (e.g. last 12 seconds)
  // Re-check time here because async operations might have passed
  const freshTime = getScrapedTime();
  if (state.status === "READY" && freshTime) {
    const freshLeft = freshTime.duration - freshTime.currentTime;
    if (freshLeft < 12 && freshLeft > 1) {
      playBufferedAudio();
    }
  }
}, 1000);
