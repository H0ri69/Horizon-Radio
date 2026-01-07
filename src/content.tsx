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
    console.log(`[Init] Loaded theme history: [${state.recentThemeIndices.join(", ")}]`);
  }
  if (result.themeUsageHistory) {
    state.themeUsageHistory = result.themeUsageHistory as Record<number, number>;
    console.log(`[Init] Loaded theme cooldowns for themes: ${Object.keys(result.themeUsageHistory).join(", ")}`);
  }
});

// --- MANUAL TRIGGER LISTENER ---
window.addEventListener("HORIS_MANUAL_TRIGGER", () => {
  console.log("[Manual] ⚡ Manual Trigger Event Detected!");
  if (state.status === "IDLE" || state.status === "COOLDOWN") {
    // We'll force the main loop to ignore the trigger point next iteration
    (state as any).forceGenerate = true;
  } else {
    console.warn(`[Manual] Skipping: Status is ${state.status}`);
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
  recentThemeIndices: [], // Initialize empty
  themeUsageHistory: {}, // Initialize empty
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

const normalizeString = (str: string | null | undefined): string => {
  if (!str) return "";
  return str
    .replace(/\bExplicit\b/gi, "") // Remove "Explicit" text
    .replace(/\s+/g, " ")          // Collapse multiple spaces
    .trim()
    .toLowerCase();                // Case insensitive
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

  let rawTitle = titleEl?.textContent || "";
  let title = rawTitle.trim();
  let artist = "";
  let album = "";

  if (subtitleEl && subtitleEl.textContent) {
    const parts = subtitleEl.textContent.split("•").map((s) => s.trim());
    if (parts.length >= 1) artist = parts[0];
    if (parts.length >= 2) album = parts[1];
  }

  // 2. Queue Logic (Context)
  // SCOPE TO THE VISIBLE QUEUE CONTAINER
  const queueContainer = document.querySelector("ytmusic-player-queue");
  const queueItems = queueContainer ? Array.from(queueContainer.querySelectorAll("ytmusic-player-queue-item")) : [];
  let currentIndex = -1;
  const playlistContext: string[] = [];
  const normalizedCurrentTitle = normalizeString(title);

  // HELPER: Check visibility to ignore hidden duplicates
  const isVisible = (el: Element) => {
    const htmlEl = el as HTMLElement;
    return htmlEl.offsetHeight > 0 || htmlEl.offsetParent !== null;
  };

  // --- ROBUST CURRENT INDEX DETECTION ---

  // Attempt 1: Trust 'selected' attribute (MUST BE VISIBLE)
  // We prioritize the item that YTM *says* is selected AND is actually visible
  queueItems.forEach((item, index) => {
    if (item.hasAttribute("selected") && isVisible(item)) {
      currentIndex = index;
    }
  });

  // Attempt 2: Fallback - Look for the playing indicator (MUST BE VISIBLE)
  if (currentIndex === -1) {
    queueItems.forEach((item, index) => {
      if (!isVisible(item)) return;

      const playBtn = item.querySelector("ytmusic-play-button-renderer");
      // state property can be "playing" or "paused"
      if (playBtn && (playBtn.getAttribute("state") === "playing" || playBtn.getAttribute("state") === "paused")) {
        currentIndex = index;
      }
    });
  }

  // Attempt 3: Scanner - Find item matching current title (Last Resort - prone to duplicates)
  // (MUST BE VISIBLE)
  if (currentIndex === -1) {
    // console.warn("[Hori-s] 'selected' item not found. Falling back to title scan (May be inaccurate for duplicates).");
    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      if (!isVisible(item)) continue;

      const itemTitle = item.querySelector(".song-title")?.textContent;
      const normItemTitle = normalizeString(itemTitle);

      if (normItemTitle === normalizedCurrentTitle) {
        currentIndex = i;
        break;
      }
    }
  }


  // Capture context around the determined index
  if (currentIndex !== -1) {
    const start = Math.max(0, currentIndex - 5);
    const end = Math.min(queueItems.length, currentIndex + 5);
    for (let i = start; i < end; i++) {
      // For context, we might want only visible items too, but strict index math is easier if include all
      // However, hidden items might junk up the context. 
      // Compromise: We include them but maybe mark them? 
      // Actually, if we skip hidden items in the loop, the indices desync from 'queueItems'.
      // Better: checking visibility when pushing to context? 
      // For simplicity/safety vs index shifts, let's just grab the text. 
      // If the item is hidden, it's likely a duplicate, so having it in context (which is just text) isn't fatal.
      // The CRITICAL part was identifying 'currentIndex' correctly.

      // But wait... if we have duplicates in the list, "UP NEXT +1" might refer to the hidden duplicate of the current song!
      // So effectively, we should probably ignore hidden items ENTIRELY from our "logical queue".
      // But refactoring 'queueItems' to filter first breaks direct index access if we depend on DOM order matching something else?
      // No, for this internal logic, we can just treat the DOM list as the authority.

      // To keep it simple and safe for this fix: 
      // We will blindly report the raw list context, BUT...
      // The "Next Song" logic below ensures we pick a VISIBLE next item.
      const t = queueItems[i].querySelector(".song-title")?.textContent || "Unknown";
      const a = queueItems[i].querySelector(".byline")?.textContent || "Unknown";
      playlistContext.push(`${itemIndexToLabel(i, currentIndex)}: ${t} by ${a}`);
    }
  }

  // 3. Next Song Logic
  let nextTitle = "";
  let nextArtist = "";

  // Strategy A: Queue (Preferred) - Skipping hidden/phantom items
  if (currentIndex !== -1) {
    for (let i = currentIndex + 1; i < queueItems.length; i++) {
      const nextItem = queueItems[i];
      // CRITICAL: Check if item is visible.
      if (isVisible(nextItem)) {
        nextTitle = nextItem.querySelector(".song-title")?.textContent || "";
        nextArtist = nextItem.querySelector(".byline")?.textContent || "";
        break; // Found the true next song
      }
    }
  }

  // Strategy B: "Next" Button Tooltip (Fallback)
  if (!nextTitle) {
    const nextButton = document.querySelector(".next-button");
    if (nextButton) {
      const buttonTitle = nextButton.getAttribute("title");
      if (buttonTitle && buttonTitle.startsWith("Next: ")) {
        nextTitle = buttonTitle.replace("Next: ", "");
        nextArtist = "Unknown";
        console.log(`[Hori-s] Fallback: Used Next Button tooltip for "${nextTitle}"`);
      }
    }
  }

  return {
    current: { title: title.replace(/\bExplicit\b/gi, "").trim(), artist, album }, // Clean title for AI too
    next: { title: nextTitle.replace(/\bExplicit\b/gi, "").trim(), artist: nextArtist },
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
    updateStatus("IDLE");
    state.bufferedAudio = null;
    state.generatedForSig = null;
    return;
  }

  console.log(`[Audio] Playing buffered DJ intro (${state.bufferedAudioType})...`);
  console.log(`[Audio] Playing buffered DJ intro (${state.bufferedAudioType})...`);
  updateStatus("PLAYING");

  const url = `data:audio/wav;base64,${state.bufferedAudio}`;
  audioEl.src = url;
  audioEl.volume = 1.0;

  // Load metadata to get duration calculation for LONG mode
  await new Promise((resolve) => {
    audioEl.onloadedmetadata = resolve;
  });

  const djDuration = audioEl.duration; // seconds

  if (state.bufferedAudioType === "LONG") {
    // LONG MODE: 
    // 1. Duck Music (Start fade out)
    ducker.duck(2000);

    // 2. Calculate dynamic pause delay to keep music playing until 1s before end
    // Use getScrapedTime() to get FRESH duration/currentTime as we might be slightly off from state
    const freshTime = getScrapedTime();
    let musicPauseDelay = 2000; // Fallback (2s)

    if (freshTime) {
      const remaining = freshTime.duration - freshTime.currentTime;
      // We want to pause when remaining is ~2s. 
      // So delay = (remaining - 2) * 1000
      // Clamp to at least 0.
      musicPauseDelay = Math.max(0, (remaining - 2) * 1000);
      console.log(`[Audio] Long Message: Calculated music pause delay: ${musicPauseDelay}ms (Time remaining: ${remaining}s)`);
    } else {
      console.warn("[Audio] Could not scrape time for dynamic pause. using fallback.");
    }

    // 3. Schedule the PAUSE
    setTimeout(() => {
      if (state.status === "PLAYING") {
        const video = getMoviePlayer();
        if (video) {
          console.log("[Audio] Long Message: Pausing music (2s before end)...");
          video.pause();
        }
      }
    }, musicPauseDelay);

    // Calculate when to resume (5s before DJ ends)
    const resumeDelay = Math.max(0, (djDuration - 5) * 1000);

    // 3. Schedule Resume
    setTimeout(() => {
      if (state.status === "PLAYING") {
        console.log("[Audio] Long Message: Resuming music near end...");
        const video = getMoviePlayer();
        if (video) {
          video.play();
          // We don't unduck yet, playBufferedAudio's onended will handle the full unduck
          // But we might want to ensure it's still quiet? 
          // Yes, the gain node should still be low from the initial duck.
        }
      }
    }, resumeDelay);
  } else {
    // SHORT MODE: Standard Ducking
    ducker.duck(2000);
  }

  try {
    await audioEl.play();
  } catch (e) {
    console.error("[Audio] Playback failed:", e);
    ducker.unduck(1000);
    console.error("[Audio] Playback failed:", e);
    ducker.unduck(1000);
    updateStatus("IDLE");
    const video = getMoviePlayer();
    if (video && state.bufferedAudioType === "LONG") video.play(); // Safety resume
  }

  audioEl.onended = () => {
    console.log("[Audio] Playback finished.");
    ducker.unduck(3000);

    console.log("[Audio] Playback finished.");
    ducker.unduck(3000);

    updateStatus("COOLDOWN");
    state.bufferedAudio = null;

    setTimeout(() => {
      if (state.status === "COOLDOWN") updateStatus("IDLE");
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

  const { current, next, playlistContext } = getSongInfo(); // Extraction fixed
  const sig = `${current.title}|${current.artist}`;
  const timeLeft = duration - currentTime;

  // --- RESET LOGIC ---
  if (sig !== state.currentSongSig) {
    console.log(`[State] New Song detected: "${current.title}"`);
    console.log(`[State] Clearing previous generation state.`);
    state.currentSongSig = sig;
    updateStatus("IDLE");
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

  // Use debug trigger point if available, otherwise default to 25%
  const triggerRatio = (state as any).debugTriggerPoint || 0.25;
  const isPastTriggerPoint = currentTime > (duration * triggerRatio);

  const hasEnoughTime = timeLeft > 20; // Need at least 20s to generate and prep
  const forceGenerate = (state as any).forceGenerate === true;

  if (state.status === "IDLE" && !alreadyGenerated) {
    // Detailed Evaluation Logging (Throttle to avoid spam)
    if (Math.floor(currentTime) % 2 === 0) {
      if (currentTime < 10 || (currentTime > duration * (triggerRatio - 0.03) && currentTime < duration * (triggerRatio + 0.03))) {
        console.debug(`[Generator:Eval] ${current.title}: Time=${Math.round(currentTime)}s, Trigger=${Math.round(triggerRatio * 100)}%, PastTrigger=${isPastTriggerPoint}, EnoughTime=${hasEnoughTime}`);
      }
    }

    if ((isPastTriggerPoint && hasEnoughTime) || forceGenerate) {
      if (forceGenerate) (state as any).forceGenerate = false; // Reset flag
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
      // >>> TRIGGER GENERATION <<<
      updateStatus("GENERATING");
      state.generatedForSig = sig; // Mark as started for this song

      console.log("------------------------------------------------");
      console.log(`[Generator] 🟢 TRIGGERING GENERATION`);
      console.log(`[Generator] Trigger Reason: 25% of song reached.`);
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
          if (chrome.runtime.lastError) {
            console.error("[Generator] Storage access failed:", chrome.runtime.lastError);
            updateStatus("IDLE"); // Revert status so we can retry? Or maybe COOLDOWN?
            state.generatedForSig = null; // Unmark
            return;
          }
        }
        const settings = (result as any).horisFmSettings || { enabled: true, voice: "sadachbia" };

        // Sync trigger point for next evaluation
        if (settings.debug?.triggerPoint) {
          (state as any).debugTriggerPoint = settings.debug.triggerPoint;
        }

        if (!settings.enabled) {
          console.log("[Generator] System Disabled. Cancelling.");
          if (!settings.enabled) {
            console.log("[Generator] System Disabled. Cancelling.");
            updateStatus("COOLDOWN");
            return;
          }
        }

        // Determine Message Type
        const prob = settings.longMessageProbability ?? 0.5;
        const isLong = Math.random() < prob;
        console.log(`[Generator] Type Decision: ${isLong ? "LONG" : "SHORT"} (Prob: ${prob})`);

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
                playlistContext: playlistContext || [],
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
                state.bufferedAudioType = isLong ? "LONG" : "SHORT";

                // Update theme history if we got a theme index back
                if (response.themeIndex !== null && typeof response.themeIndex === "number") {
                  state.recentThemeIndices = [response.themeIndex, ...state.recentThemeIndices].slice(0, 2);

                  // Update cooldown timestamp
                  state.themeUsageHistory[response.themeIndex] = Date.now();

                  chrome.storage.local.set({
                    recentThemes: state.recentThemeIndices,
                    themeUsageHistory: state.themeUsageHistory
                  });
                  console.log(`[Generator] Theme history updated: [${state.recentThemeIndices.join(", ")}]`);
                }

                updateStatus("READY");
              } else {
                console.warn("[Generator] ❌ No audio returned.");
                updateStatus("COOLDOWN");
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
