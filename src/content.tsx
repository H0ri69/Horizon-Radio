import browser from "webextension-polyfill";
import React from "react";
import { createRoot } from "react-dom/client";
import { InjectedApp } from "./components/InjectedApp";
import { Song, DJVoice, AppLanguage } from "./types";
import {
  DJStyle,
  DJ_PERSONA_NAMES,
  TIMING,
  AUDIO,
  DEFAULT_SCHEDULER_SETTINGS,
  SCHEDULER,
} from "./config";
import type { SchedulerState, TransitionPlan, SchedulerSettings } from "./config";
import { eventBus } from "./services/eventBus";
import { logger } from "./utils/Logger";
import {
  decideTransition,
  updateStateAfterTransition,
  createInitialState,
  logSchedulerDecision,
  logSchedulerConfig,
} from "./services/schedulerService";

const log = logger.withContext("Content");

import {
  getSweeperPaths,
  hasSweeperPaths,
  playSweeperWithGap,
  initializeSweeperPaths,
} from "./services/sweeperService";
import "./index.css"; // Inject Tailwind Styles

// Prevent running in iframes
if (window !== window.top) {
  throw new Error("Hori-s.FM: Content script blocked in iframe.");
}

log.log("Content Script Loaded (v2.6 - Clean Logs)");

import { liveCallService } from "./services/liveCallService";
import { RemoteSocketSource } from "./services/RemoteSocketSource";
import { YtmApiService } from "./services/ytmApiService";
import {
  getPendingDomAction,
  clearPendingDomAction,
  playFirstResultNext,
} from "./utils/ytmDomUtils";
import { sendMessageWithRetry } from "./utils/messaging";

// --- YTM INJECTION BRIDGE (FALLBACK FOR FIREFOX) ---
// Note: In Chrome (MV3), we use world: "MAIN" in manifest.json for src/inject.ts
// which is much safer and avoids CSP violations.
if (process.env.TARGET_BROWSER === "firefox") {
  const injectYtmInterceptor = () => {
    const script = document.createElement("script");
    script.textContent = `
      (function() {
          function broadcastContext() {
              try {
                  if (window.ytcfg && window.ytcfg.data_) {
                      window.dispatchEvent(new CustomEvent("HORIS_YTM_CONTEXT", { 
                          detail: JSON.stringify({
                              apiKey: window.ytcfg.data_.INNERTUBE_API_KEY,
                              context: window.ytcfg.data_.INNERTUBE_CONTEXT,
                              clientVersion: window.ytcfg.data_.INNERTUBE_CLIENT_VERSION
                          })
                      }));
                  }
              } catch(e) { /* ignore */ }
          }
          
          setTimeout(broadcastContext, 1000);
          setTimeout(broadcastContext, 3000);
          setTimeout(broadcastContext, 10000);

          window.addEventListener("HORIS_CMD_PLAY_NEXT", (e) => {
               let data = e.detail;
               try { if (typeof data === 'string') data = JSON.parse(data); } catch(err) {}
               const videoId = data?.videoId;
               if(!videoId) return;
               try {
                  const queue = document.querySelector("ytmusic-player-queue");
                  if (queue && queue.dispatch) {
                      queue.dispatch({ type: "ADD", payload: videoId }); 
                  } else {
                       window.location.href = "/watch?v=" + videoId;
                  }
               } catch(err) { /* ignore */ }
          });

          // --- SEEK PROTECTION (FIREFOX) ---
          let seekProtectionEnabled = true;
          const PROTECTED_ZONE_SECONDS = 15;

          window.addEventListener("HORIS_SEEK_PROTECTION_TOGGLE", (e) => {
              const detail = e.detail;
              if (typeof detail?.enabled === 'boolean') {
                  seekProtectionEnabled = detail.enabled;
              }
          });

          const getVideoInfo = () => {
              const video = document.querySelector("video");
              return { video, duration: video?.duration || 0 };
          };

          const calculateSeekPosition = (event, progressBar) => {
              const rect = progressBar.getBoundingClientRect();
              const clickX = event.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              const { duration } = getVideoInfo();
              if (!duration || duration <= 0) return null;
              return ratio * duration;
          };

          const handleSeekAttempt = (event) => {
              if (!seekProtectionEnabled) return;

              const progressBar = event.target.closest("#progress-bar");
              if (!progressBar) return;

              const { video, duration } = getVideoInfo();
              if (!video || !duration || duration <= 0) return;

              const targetPosition = calculateSeekPosition(event, progressBar);
              if (targetPosition === null) return;

              const safeZoneStart = duration - PROTECTED_ZONE_SECONDS;

              if (duration <= PROTECTED_ZONE_SECONDS) {
                  event.preventDefault();
                  event.stopPropagation();
                  event.stopImmediatePropagation();
                  window.dispatchEvent(new CustomEvent("HORIS_SEEK_BLOCKED", {
                      detail: { reason: "Song too short", duration, targetPosition }
                  }));
                  return;
              }

              if (targetPosition > safeZoneStart) {
                  event.preventDefault();
                  event.stopPropagation();
                  event.stopImmediatePropagation();
                  video.currentTime = safeZoneStart;
                  window.dispatchEvent(new CustomEvent("HORIS_SEEK_BLOCKED", {
                      detail: { reason: "protected_zone", duration, targetPosition, snappedTo: safeZoneStart }
                  }));
              }
          };

          const attachSeekProtection = () => {
              const progressBar = document.querySelector("#progress-bar");
              if (!progressBar) {
                  setTimeout(attachSeekProtection, 2000);
                  return;
              }
              progressBar.addEventListener("mousedown", handleSeekAttempt, { capture: true });
              progressBar.addEventListener("click", handleSeekAttempt, { capture: true });
          };
          
          setTimeout(attachSeekProtection, 1500);
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
  };
  injectYtmInterceptor();
}

// --- TYPES & STATE ---
type DJState = "IDLE" | "GENERATING" | "READY" | "PLAYING" | "COOLDOWN" | "LIVE_CALL";

interface State {
  status: DJState;
  currentSongSig: string; // ID to track if song changed
  bufferedAudio: string | null; // Base64 audio
  generatedForSig: string | null; // CONTEXT VALIDATION
  lastTime: number;
  lastSongChangeTs: number;
  scheduler: SchedulerState; // Scheduler state for tracking cooldowns etc.
  currentPlan: TransitionPlan | null; // Current transition plan for playback
  currentSweeperIndex: number | null; // Index of scheduled sweeper for state update
  pendingCall: { name: string; message: string; song: any; inputSource?: any } | null;
}

// --- INITIAL LOAD ---
// Initialize sweeper paths at load time
initializeSweeperPaths();

// Log scheduler config for debugging
logSchedulerConfig();

// --- PENDING DOM ACTION HANDLER ---
// Check if there's a pending action from searchAndPlayNext() that navigated to this page
(async () => {
  // Only process on search results pages
  if (!window.location.href.includes("/search?q=")) return;

  const pendingAction = await getPendingDomAction();
  if (!pendingAction) return;

  log.log(`📋 Found pending action: ${pendingAction.type} for "${pendingAction.query}"`);

  // Clear the action immediately to prevent re-execution on refresh
  await clearPendingDomAction();

  // Wait for search results to render
  const WAIT_FOR_RESULTS_MS = 2500;
  await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_RESULTS_MS));

  // Execute the action
  if (pendingAction.type === "PLAY_FIRST_RESULT_NEXT") {
    log.log(`🎵 Executing queued action: Play first result next`);
    const success = await playFirstResultNext();
    if (success) {
      log.log(`✅ Successfully queued song from search: "${pendingAction.query}"`);
    } else {
      log.error(`❌ Failed to queue song from search: "${pendingAction.query}"`);
    }
  }
})();

// --- MANUAL TRIGGER LISTENER ---
window.addEventListener("HORIS_MANUAL_TRIGGER", () => {
  log.log("⚡ Manual Trigger Event Detected!");
  if (state.status === "IDLE" || state.status === "COOLDOWN") {
    (state as any).forceGenerate = true;
  }
});

// --- EVENT BUS LISTENER ---

// --- REMOTE HOST CONNECTION (PASSIVE) ---
let remoteSource: RemoteSocketSource | null = null;

// Initialize once
chrome.storage.local.get(["horisHostId", "horisFmSettings"], (result) => {
  let hostId = result.horisHostId as string;
  const settings = (result as any).horisFmSettings || {};

  // Generate Host ID if missing
  if (!hostId) {
    const segment = () => Math.random().toString(36).substring(2, 5).toUpperCase();
    hostId = `${segment()}-${segment()}`;
    log.log("🆕 Generated new Host ID:", hostId);
    chrome.storage.local.set({ horisHostId: hostId });
  }

  // Connect with HostID
  if (hostId) {
    log.debug("📡 Initializing Remote Source for Host:", hostId);
    remoteSource = new RemoteSocketSource(hostId);

    remoteSource.addStatusListener((status) => log.debug(`[Remote] ${status}`));
    remoteSource.addCallRequestListener((callData) => {
      log.debug("📞 Incoming Call Request:" + JSON.stringify(callData));
      state.pendingCall = {
        name: callData.name,
        message: callData.message,
        song: null, // No song request in simplified flow
        inputSource: remoteSource,
      };

      // TODO: Optional UI interaction (Toast notification?)
    });
    // Connect immediately (AudioContext is null initially, but that's fine for control messages)
    remoteSource.connect(null as any, () => { });
  }

  // --- SEEK PROTECTION INIT ---
  // Broadcast initial setting to inject.ts
  const protectTransitions = settings.protectTransitions ?? true;
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("HORIS_SEEK_PROTECTION_TOGGLE", {
      detail: { enabled: protectTransitions }
    }));
  }, 2000); // Delay to ensure inject.ts is ready
});

// --- SEEK BLOCKED TOAST LISTENER ---
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

const showSeekBlockedToast = () => {
  // Remove existing toast if any
  const existingToast = document.getElementById("horis-seek-toast");
  if (existingToast) existingToast.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  // Create toast element with theme-aware styling
  const toast = document.createElement("div");
  toast.id = "horis-seek-toast";
  toast.innerHTML = `
    <div class="horis-seek-toast-inner">
      <span style="font-size: 18px;">🛡️</span>
      <span>Transition zone protected</span>
      <span style="opacity: 0.7; font-weight: 400;">• Disable in settings</span>
    </div>
    <style>
      .horis-seek-toast-inner {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        /* Default: Standard theme (indigo gradient) */
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.95));
        color: white;
        padding: 14px 24px;
        border-radius: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255,255,255,0.1);
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: horis-toast-in 0.3s ease-out;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
      
      /* Apple Music theme: use palette-based colors */
      [data-theme="Apple Music"] .horis-seek-toast-inner,
      html[data-theme="Apple Music"] .horis-seek-toast-inner {
        background: linear-gradient(
          135deg, 
          oklch(var(--ts-palette-dominant-l, 0.5) calc(var(--ts-palette-dominant-c, 0.15) * 0.8) var(--ts-palette-dominant-h, 270) / 0.9),
          oklch(calc(var(--ts-palette-dominant-l, 0.5) * 0.8) calc(var(--ts-palette-dominant-c, 0.15) * 0.6) var(--ts-palette-dominant-h, 270) / 0.9)
        );
        box-shadow: 0 8px 32px oklch(var(--ts-palette-dominant-l, 0.5) var(--ts-palette-dominant-c, 0.15) var(--ts-palette-dominant-h, 270) / 0.4), 
                    0 0 0 1px rgba(255,255,255,0.15);
      }
      
      @keyframes horis-toast-in {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes horis-toast-out {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(20px); }
      }
    </style>
  `;
  document.body.appendChild(toast);

  // Auto-remove after 3 seconds
  toastTimeout = setTimeout(() => {
    const toastEl = document.getElementById("horis-seek-toast");
    if (toastEl) {
      const inner = toastEl.querySelector(".horis-seek-toast-inner") as HTMLElement;
      if (inner) inner.style.animation = "horis-toast-out 0.3s ease-out forwards";
      setTimeout(() => toastEl.remove(), 300);
    }
  }, 3000);
};

window.addEventListener("HORIS_SEEK_BLOCKED", (e: any) => {
  showSeekBlockedToast();
});

// --- EVENT BUS LISTENER ---
eventBus.on("HORIS_CALL_SUBMITTED", (detail) => {
  if (detail) {
    log.log("📞 Local Call Received:", detail);
    state.pendingCall = detail;

    // If it's a remote call, we might want to update the status callback to something persistent
    // because the Modal is gone.
    if (detail.remoteSource && typeof detail.remoteSource.setStatusCallback === "function") {
      detail.remoteSource.setStatusCallback((s: string) => {
        log.log(`[RemoteSourceStatus] ${s}`);
        // Optionally broadcast this status to UI if we had a persistent status bar
      });
    }
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
  lastTime: 0,
  lastSongChangeTs: 0,
  scheduler: createInitialState(),
  currentPlan: null,
  currentSweeperIndex: null,
  pendingCall: null,
};

const getMoviePlayer = () => {
  const videos = Array.from(document.querySelectorAll("video"));
  if (videos.length === 0) return null;
  if (videos.length === 1) return videos[0];
  const playing = videos.filter((v) => !v.paused);
  if (playing.length >= 1) return playing[0];
  const valid = videos.filter((v) => v.src && v.duration > 0);
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
      current: { title: "", artist: "", album: "", art: "" },
      next: { title: "", artist: "" },
      playlistContext: [],
    };

  const titleEl = playerBar.querySelector(".content-info-wrapper .title");
  const subtitleEl = playerBar.querySelector(".content-info-wrapper .subtitle");
  const artEl = playerBar.querySelector(".image") as HTMLImageElement;

  let title = titleEl?.textContent?.trim() || "";
  let artist = "";
  let album = "";
  let art = artEl?.src || "";

  if (subtitleEl && subtitleEl.textContent) {
    const parts = subtitleEl.textContent.split("•").map((s) => s.trim());
    if (parts.length >= 1) artist = parts[0];
    if (parts.length >= 2) album = parts[1];
  }

  const queueContainer = document.querySelector("ytmusic-player-queue");
  const queueItems = queueContainer
    ? Array.from(queueContainer.querySelectorAll("ytmusic-player-queue-item"))
    : [];
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
      if (
        playBtn &&
        (playBtn.getAttribute("state") === "playing" || playBtn.getAttribute("state") === "paused")
      ) {
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
    current: { title: title.replace(/\bExplicit\b/gi, "").trim(), artist, album, art },
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
    const parts = timeInfo.textContent.split("/").map((s) => s.trim());
    if (parts.length === 2) {
      const parseTime = (str: string) => {
        const [m, s] = str.split(":").map(Number);
        return m * 60 + s;
      };
      const now = parseTime(parts[0]);
      const max = parseTime(parts[1]);
      if (!isNaN(now) && !isNaN(max) && max > 0) return { currentTime: now, duration: max };
    }
  }
  return null;
};

// HELPER: Find a suitable background image when no song is playing
const findIdleBackground = (): string | null => {
  // 1. Hero / Immersive Header (Home Screen, Channel, etc.)
  const immersive = document.querySelector("ytmusic-immersive-header-renderer .image img");
  if (immersive && (immersive as HTMLImageElement).src) return (immersive as HTMLImageElement).src;

  // 2. Playlist/Album Header
  const header = document.querySelector("ytmusic-detail-header-renderer .image img");
  if (header && (header as HTMLImageElement).src) return (header as HTMLImageElement).src;

  // 3. Artist/Channel Header
  const channelHeader = document.querySelector("ytmusic-c4-tabbed-header-renderer .image img");
  if (channelHeader && (channelHeader as HTMLImageElement).src)
    return (channelHeader as HTMLImageElement).src;

  // 4. First item in the grid (Home screen recommendations) - Fallback
  const firstItem = document.querySelector("ytmusic-two-row-item-renderer .image img");
  if (firstItem && (firstItem as HTMLImageElement).src) return (firstItem as HTMLImageElement).src;

  return null;
};

let audioEl = document.getElementById("horis-fm-dj-voice") as HTMLAudioElement;
if (!audioEl) {
  audioEl = document.createElement("audio");
  audioEl.id = "horis-fm-dj-voice";
  document.body.appendChild(audioEl);
}

class WebAudioDucker {
  public ctx: AudioContext | null = null;
  public source: MediaElementAudioSourceNode | null = null;
  public gainNode: GainNode | null = null;
  private connectedVideo: HTMLMediaElement | null = null;
  private isDucked: boolean = false;
  private targetGainWhileDucked: number = AUDIO.DUCK_GAIN;

  constructor() { }

  /**
   * Initialize or reinitialize the audio routing.
   * Handles the case where the video element changes (song switch).
   */
  private init(video: HTMLMediaElement): boolean {
    // Already connected to this video
    if (this.connectedVideo === video && this.source && this.gainNode && this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return true;
    }

    try {
      // Create AudioContext if needed
      if (!this.ctx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new Ctx();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();

      // Clean up previous connections if video changed
      if (this.source && this.connectedVideo !== video) {
        try {
          this.source.disconnect();
        } catch {
          /* ignore */
        }
        this.source = null;
      }

      // Check if this video already has a source node (from a previous init)
      // MediaElementAudioSourceNode can only be created once per element
      if ((video as any)._horisAudioSource) {
        this.source = (video as any)._horisAudioSource;
        this.gainNode = (video as any)._horisGainNode;
        this.connectedVideo = video;

        // If we're in ducked state, ensure gain is at duck level
        if (this.isDucked && this.gainNode) {
          this.gainNode.gain.setValueAtTime(this.targetGainWhileDucked, this.ctx.currentTime);
        }
        return true;
      }

      // Create new audio routing
      this.source = this.ctx.createMediaElementSource(video);
      this.gainNode = this.ctx.createGain();
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      this.connectedVideo = video;

      // Store references on video element for reconnection
      (video as any)._horisAudioSource = this.source;
      (video as any)._horisGainNode = this.gainNode;

      // If we're supposed to be ducked, start at duck volume to prevent spike
      if (this.isDucked) {
        this.gainNode.gain.setValueAtTime(this.targetGainWhileDucked, this.ctx.currentTime);
      } else {
        this.gainNode.gain.setValueAtTime(AUDIO.FULL_GAIN, this.ctx.currentTime);
      }

      log.log("🔊 Audio routing initialized for video element");
      return true;
    } catch (e) {
      log.error("Audio Routing Init Failed:", e);
      return false;
    }
  }

  /**
   * Ensure we're connected to the current video element.
   * Call this periodically or before operations to handle video element changes.
   */
  public ensureConnected(): boolean {
    const video = document.querySelector("video");
    if (!video) return false;
    return this.init(video);
  }

  public async duck(duration: number = TIMING.DUCK_DURATION, targetGain: number = AUDIO.DUCK_GAIN) {
    const video = document.querySelector("video");
    if (!video) return;

    if (!this.init(video)) return;
    if (!this.ctx || !this.gainNode) return;

    this.isDucked = true;
    this.targetGainWhileDucked = targetGain;

    const now = this.ctx.currentTime;
    const currentGain = this.gainNode.gain.value;

    // Cancel any scheduled changes and set current value
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(currentGain, now);

    // Use exponential ramp for more natural sound (but avoid 0 which breaks exponential)
    const safeTarget = Math.max(targetGain, 0.001);
    this.gainNode.gain.exponentialRampToValueAtTime(safeTarget, now + duration / 1000);
  }

  public async unduck(duration: number = TIMING.UNDUCK_DURATION) {
    // Ensure we're connected before undocking (handles video element changes)
    this.ensureConnected();

    if (!this.ctx || !this.gainNode) return;

    this.isDucked = false;

    const now = this.ctx.currentTime;
    const currentGain = Math.max(this.gainNode.gain.value, 0.001); // Avoid 0 for exponential ramp

    // Cancel any scheduled changes and set current value
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(currentGain, now);

    // Use exponential ramp for more natural sound
    this.gainNode.gain.exponentialRampToValueAtTime(AUDIO.FULL_GAIN, now + duration / 1000);
  }

  /**
   * Force set gain immediately (useful for handling abrupt transitions)
   */
  public setGainImmediate(gain: number) {
    if (!this.ctx || !this.gainNode) return;
    this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
    this.gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
    this.isDucked = gain < AUDIO.FULL_GAIN;
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

  // Provide a safe getter for remoteSource
  const getRemoteSource = () => remoteSource;

  root.render(<InjectedApp ducker={ducker} getRemoteSource={getRemoteSource} />);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountReactApp);
} else {
  mountReactApp();
}

const playBufferedAudio = async () => {
  const hasDjAudio = !!state.bufferedAudio;
  const hasSweeper = !!state.currentPlan?.sweeper;

  // Need either DJ audio or sweeper to proceed
  if (!hasDjAudio && !hasSweeper) return;

  if (state.generatedForSig !== state.currentSongSig) {
    updateStatus("IDLE");
    state.bufferedAudio = null;
    state.generatedForSig = null;
    state.currentPlan = null;
    state.currentSweeperIndex = null;
    return;
  }

  updateStatus("PLAYING");

  // Duck music BEFORE sweeper plays (both sweeper and DJ play over ducked music)
  ducker.duck(TIMING.DUCK_DURATION);

  // Play sweeper first if scheduled in the plan
  if (hasSweeper) {
    try {
      log.log("🔊 Playing sweeper" + (hasDjAudio ? " before DJ audio" : " (SILENCE segment)"));
      await playSweeperWithGap(state.currentPlan!.sweeper!);
    } catch (e) {
      log.error("Sweeper playback failed:", e);
    }
  }

  // If sweeper-only (SILENCE segment), finish up here
  if (!hasDjAudio) {
    ducker.unduck(TIMING.UNDUCK_DURATION);

    // Update scheduler state
    if (state.currentPlan) {
      state.scheduler = updateStateAfterTransition(
        state.scheduler,
        state.currentPlan,
        state.currentSweeperIndex
      );
    }

    updateStatus("COOLDOWN");
    state.currentPlan = null;
    state.currentSweeperIndex = null;
    setTimeout(() => {
      if (state.status === "COOLDOWN") updateStatus("IDLE");
    }, TIMING.COOLDOWN_PERIOD);
    return;
  }

  // DJ audio playback
  const url = `data:audio/wav;base64,${state.bufferedAudio}`;
  audioEl.src = url;
  audioEl.volume = AUDIO.FULL_GAIN;

  await new Promise((resolve) => {
    audioEl.onloadedmetadata = resolve;
  });

  const djDuration = audioEl.duration;

  const isLongMessage = djDuration > TIMING.MUSIC_STOP_THRESHOLD;

  if (isLongMessage) {
    // Music already ducked above, just handle pause/resume timing
    const freshTime = getScrapedTime();
    let musicPauseDelay: number = TIMING.DUCK_DURATION;
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
  }
  // For short messages, music is already ducked above

  try {
    await audioEl.play();
  } catch (e) {
    log.error("Playback failed:", e);
    ducker.unduck(TIMING.SONG_CHECK_INTERVAL);
    // Clean up scheduler state on failure
    if (state.currentPlan) {
      state.scheduler = updateStateAfterTransition(
        state.scheduler,
        state.currentPlan,
        state.currentSweeperIndex
      );
    }
    state.currentPlan = null;
    state.currentSweeperIndex = null;
    updateStatus("IDLE");
    const video = getMoviePlayer();
    if (video && isLongMessage) video.play();
  }

  audioEl.onended = () => {
    ducker.unduck(TIMING.UNDUCK_DURATION);

    // Update scheduler state NOW (at playback time, not generation time)
    if (state.currentPlan) {
      state.scheduler = updateStateAfterTransition(
        state.scheduler,
        state.currentPlan,
        state.currentSweeperIndex
      );
    }

    updateStatus("COOLDOWN");
    state.bufferedAudio = null;
    state.currentPlan = null;
    state.currentSweeperIndex = null;
    setTimeout(() => {
      if (state.status === "COOLDOWN") updateStatus("IDLE");
    }, TIMING.COOLDOWN_PERIOD);
  };
};

const startLiveCall = async () => {
  log.debug("🚀 startLiveCall TRIGGERED");
  if (!state.pendingCall) {
    log.debug("❌ startLiveCall aborted: No pending call");
    return;
  }
  const callData = state.pendingCall;
  state.pendingCall = null; // Clear queue
  updateStatus("LIVE_CALL");
  log.debug("📞 Live Call Status set. Preparing session...");

  ducker.duck(TIMING.SONG_CHECK_INTERVAL);

  const freshTime = getScrapedTime();
  let musicPauseDelay: number = TIMING.DUCK_DURATION;
  if (freshTime) {
    const remaining = freshTime.duration - freshTime.currentTime;
    musicPauseDelay = Math.max(0, (remaining - 2) * 1000);
  }

  setTimeout(() => {
    const video = getMoviePlayer();
    if (video) video.pause();
  }, musicPauseDelay);

  const { current, next } = getSongInfo(); // Re-fetch info

  browser.storage.local.get(["horisFmSettings"]).then((result) => {
    const settings = (result as any).horisFmSettings || {};
    const apiKey = settings.apiKey;

    if (!apiKey) {
      log.error("Cannot start call: API Key missing.");
      updateStatus("IDLE");
      ducker.unduck(TIMING.SONG_CHECK_INTERVAL);
      const video = getMoviePlayer();
      if (video) video.play();
      return;
    }

    log.debug("🎬 Calling liveCallService.startSession...");

    // Queue the song if valid
    if (callData.song && callData.song.id && !callData.song.id.startsWith("manual-")) {
      log.log(`🎵 Queuing Requested Song: ${callData.song.title}`);
      YtmApiService.playNext(callData.song.id);
    }

    liveCallService
      .startSession({
        apiKey,
        inputSource: callData.inputSource,
        callerName: callData.name,
        reason: callData.message,
        previousSongTitle: current.title || "Unknown",
        previousSongArtist: current.artist || "Unknown",
        nextSongTitle: callData.song ? callData.song.title : next.title || "Next Song",
        nextSongArtist: callData.song ? callData.song.artist : next.artist || "Unknown", // Prompt the DJ about the requested song as the "Next" one
        voice: settings.djVoice || "sadachbia",
        personaName:
          DJ_PERSONA_NAMES[settings.djVoice as DJVoice]?.[settings.language as AppLanguage] ||
          "Host",
        language: settings.language || "en",
        style: settings.djStyle || "Standard (Radio Host)",
        customPrompt: settings.customStylePrompt || "",
        dualDjMode: settings.dualDjMode || false,
        secondaryPersonaName: settings.dualDjMode
          ? DJ_PERSONA_NAMES[settings.secondaryDjVoice as DJVoice]?.[
          settings.language as AppLanguage
          ] || "Partner"
          : undefined,
        onStatusChange: (s) => log.log(`[LiveCall] ${s}`),
        onUnrecoverableError: () => {
          log.error("[LiveCall] Unrecoverable Error Triggered.");
          updateStatus("COOLDOWN");
          ducker.unduck(TIMING.DUCK_DURATION);
          const video = getMoviePlayer();
          if (video) video.play();
          setTimeout(() => updateStatus("IDLE"), TIMING.COOLDOWN_PERIOD);
        },
        onCallEnd: () => {
          log.log("[LiveCall] Ended normally.");
          updateStatus("COOLDOWN");
          const video = getMoviePlayer();
          if (video) video.play();
          ducker.unduck(TIMING.DUCK_DURATION);
          setTimeout(() => updateStatus("IDLE"), TIMING.COOLDOWN_PERIOD);
        },
        onSessionStart: () => {
          log.debug("[LiveCall] Session Started Callback.");
          // Send GO LIVE signal to remote client
          if (callData.inputSource instanceof RemoteSocketSource) {
            callData.inputSource.sendGoLive();
          }
        },
      })
      .catch((err) => {
        log.error("💥 liveCallService.startSession Promise Rejected:", err);
        updateStatus("IDLE");
      });
  });
};

/*
  Player state ↔ theme sync
  ------------------------
  We sync player open/fullscreen state to <html> classes.

  Goals:
  - Keep the Apple Music theme visually synced with the player open/close animation.
  - Avoid polling faster than the existing 1s main loop.
  - Avoid allocating observers/timers every tick (perf + leak risk).

  Strategy:
  - Observe ytmusic-app-layout for the coarse state (player-page-open / player-fullscreened).
  - ALSO observe ytmusic-player[player-ui-state] because it often changes *after* the click,
    closer to when the slide-down animation completes.
  - Use a tiny grace on removal to prevent flicker; use a longer fallback grace if we can't
    read a reliable player-ui-state.
*/
const ensurePlayerStateObserver = (() => {
  let appLayoutObserved = false;
  let playerObserved = false;

  let appLayoutObserver: MutationObserver | null = null;
  let playerObserver: MutationObserver | null = null;

  let removeOpenTimer: number | null = null;
  let removeFsTimer: number | null = null;

  const RELIABLE_UI_GRACE_MS = 140;
  const FALLBACK_GRACE_MS = 900;

  const getUiState = () => {
    const player = document.querySelector("ytmusic-player");
    const ui = player?.getAttribute("player-ui-state") || "";
    // Known states we care about across YTM versions.
    const isKnown = ui === "FULLSCREEN" || ui === "PLAYER_PAGE_OPEN" || ui === "MINIPLAYER";
    return { player, ui, isKnown };
  };

  const compute = (appLayout: Element) => {
    const isOpenAttr = appLayout.hasAttribute("player-page-open");
    const isFsAttr = appLayout.hasAttribute("player-fullscreened");

    const { ui, isKnown } = getUiState();
    const isOpenUi = ui === "PLAYER_PAGE_OPEN" || ui === "FULLSCREEN";
    const isFsUi = ui === "FULLSCREEN";

    // If ui-state is known, trust it to avoid early attribute flips on close.
    const isPlayerOpen = isKnown ? isOpenUi : isOpenAttr;
    const isFullscreen = isKnown ? isFsUi : isFsAttr;
    const graceMs = isKnown ? RELIABLE_UI_GRACE_MS : FALLBACK_GRACE_MS;

    return { isPlayerOpen, isFullscreen, graceMs };
  };

  const apply = (appLayout: Element) => {
    const { isPlayerOpen, isFullscreen, graceMs } = compute(appLayout);

    if (isPlayerOpen) {
      if (removeOpenTimer != null) {
        window.clearTimeout(removeOpenTimer);
        removeOpenTimer = null;
      }
      document.documentElement.classList.add("ts-player-page-open");
    } else {
      if (removeOpenTimer != null) window.clearTimeout(removeOpenTimer);
      removeOpenTimer = window.setTimeout(() => {
        document.documentElement.classList.remove("ts-player-page-open");
        removeOpenTimer = null;
      }, graceMs);
    }

    if (isFullscreen) {
      if (removeFsTimer != null) {
        window.clearTimeout(removeFsTimer);
        removeFsTimer = null;
      }
      document.documentElement.classList.add("ts-player-fullscreened");
    } else {
      if (removeFsTimer != null) window.clearTimeout(removeFsTimer);
      removeFsTimer = window.setTimeout(() => {
        document.documentElement.classList.remove("ts-player-fullscreened");
        removeFsTimer = null;
      }, graceMs);
    }
  };

  const attachAppLayoutObserver = () => {
    if (appLayoutObserved) return true;
    const appLayout = document.querySelector("ytmusic-app-layout");
    if (!appLayout) return false;

    apply(appLayout);

    appLayoutObserver = new MutationObserver(() => apply(appLayout));
    appLayoutObserver.observe(appLayout, {
      attributes: true,
      attributeFilter: ["player-page-open", "player-fullscreened"],
    });

    appLayoutObserved = true;
    return true;
  };

  const attachPlayerObserver = () => {
    if (playerObserved) return true;
    const { player } = getUiState();
    const appLayout = document.querySelector("ytmusic-app-layout");
    if (!player || !appLayout) return false;

    // ui-state updates are what we really want for close sync.
    playerObserver = new MutationObserver(() => apply(appLayout));
    playerObserver.observe(player, {
      attributes: true,
      attributeFilter: ["player-ui-state"],
    });

    playerObserved = true;
    return true;
  };

  return () => {
    const ok = attachAppLayoutObserver();
    // Player may appear after app layout; attempt to attach whenever called.
    attachPlayerObserver();
    return ok;
  };
})();

const mainLoop = setInterval(() => {
  if (!browser.runtime?.id) {
    clearInterval(mainLoop);
    return;
  }

  const timeData = getScrapedTime();
  if (!timeData) return;
  const { currentTime, duration } = timeData;

  // 1. Gather Info
  const video = getMoviePlayer();
  const isPaused = video ? video.paused : false;
  const { current, next, playlistContext } = getSongInfo();

  // 1.1 Ensure audio ducker stays connected (handles video element changes)
  // Only check during active playback states to avoid unnecessary work
  if (state.status === "PLAYING" || state.status === "LIVE_CALL") {
    ducker.ensureConnected();
  }

  // 2. Continuous Background Update (Context Aware)
  // If music is paused, prioritizes hero/page content. If playing, prioritizes song art.
  const pageHero = findIdleBackground();
  let activeArt = current.art;

  if (isPaused || !current.art) {
    if (pageHero) activeArt = pageHero;
  }

  if (activeArt) {
    const newVal = `url("${activeArt}")`;
    const oldVal = document.documentElement.style.getPropertyValue("--horis-album-art");
    if (oldVal !== newVal) {
      document.documentElement.style.setProperty("--horis-album-art", newVal);
    }
  }

  // 2.1 Update Theme Classes (Perf optimization to avoid :root:has)
  // Prefer MutationObserver-based sync (instant + close-animation grace). Fallback below.
  const observerAttached = ensurePlayerStateObserver();
  if (!observerAttached) {
    const appLayout = document.querySelector("ytmusic-app-layout");
    if (appLayout) {
      const isPlayerOpen = appLayout.hasAttribute("player-page-open");
      const isFullscreen = appLayout.hasAttribute("player-fullscreened");

      if (isPlayerOpen) document.documentElement.classList.add("ts-player-page-open");
      else document.documentElement.classList.remove("ts-player-page-open");

      if (isFullscreen) document.documentElement.classList.add("ts-player-fullscreened");
      else document.documentElement.classList.remove("ts-player-fullscreened");
    }
  }

  // 3. Status Checks
  if (state.status === "LIVE_CALL") return;
  if (isPaused && state.status !== "PLAYING") return;

  // 4. Song Change Detection
  const sig = `${current.title}|${current.artist}`;
  const timeLeft = duration - currentTime;

  if (sig !== state.currentSongSig) {
    log.log(`🎵 Next song detected: "${current.title}" by ${current.artist}`);
    state.currentSongSig = sig;
    updateStatus("IDLE");
    state.bufferedAudio = null;
    state.generatedForSig = null;
    state.currentPlan = null;
    state.currentSweeperIndex = null;
    state.lastSongChangeTs = Date.now();

    // Ensure ducker reconnects to any new video element to prevent volume spikes
    // If DJ audio is playing, maintain duck state on the new video
    if (!audioEl.paused) {
      ducker.ensureConnected(); // This will apply ducked gain to new video if needed
      ducker.duck(50); // Quick duck to smooth any transition
    }
  }

  state.lastTime = currentTime;

  const alreadyGenerated = state.generatedForSig === sig;
  const triggerRatio = (state as any).debugTriggerPoint || 0.25;
  const isPastTriggerPoint = currentTime > duration * triggerRatio;
  const hasEnoughTime = timeLeft > 20;
  const forceGenerate = (state as any).forceGenerate === true;

  // 5. Generation Logic
  if (state.status === "IDLE" && !alreadyGenerated) {
    if (state.pendingCall) {
      state.generatedForSig = sig;
      log.log("📞 Call pending. Skipping standard generation.");
      return;
    }

    if ((isPastTriggerPoint && hasEnoughTime) || forceGenerate) {
      if (forceGenerate) (state as any).forceGenerate = false;
      if (Date.now() - state.lastSongChangeTs < TIMING.COOLDOWN_PERIOD) return;
      if (!current.title || !current.artist) return;

      updateStatus("GENERATING");
      state.generatedForSig = sig;

      browser.storage.local.get(["horisFmSettings"]).then(async (result) => {
        const settings = (result as any).horisFmSettings || { enabled: true, djVoice: "sadachbia" };

        if (settings.debug?.triggerPoint)
          (state as any).debugTriggerPoint = settings.debug.triggerPoint;
        if (!settings.enabled) {
          updateStatus("COOLDOWN");
          return;
        }

        // Get sweeper paths for current language
        const language = (settings.language || "en") as AppLanguage;
        let sweeperPaths: string[] = [];
        try {
          if (hasSweeperPaths(language)) {
            sweeperPaths = getSweeperPaths(language);
          }
        } catch (e) {
          log.warn("No sweepers available for language:", language);
        }

        // Get scheduler settings from storage (with defaults)
        const schedulerSettings: SchedulerSettings =
          settings.scheduler || DEFAULT_SCHEDULER_SETTINGS;

        // Use scheduler to decide what to play
        const plan = decideTransition(state.scheduler, sweeperPaths, schedulerSettings);
        state.currentPlan = plan;
        state.currentSweeperIndex = plan.sweeper ? sweeperPaths.indexOf(plan.sweeper) : null;
        logSchedulerDecision(plan, state.scheduler);

        log.log(
          `✨ Generation started (Text: ${settings.textModel || "FLASH"}, TTS: ${settings.ttsModel || "FLASH"
          })`
        );

        // Handle SILENCE segment - no DJ generation needed, but still need proper timing
        if (plan.segment === "SILENCE") {
          log.log("🔇 Segment is SILENCE - skipping DJ generation");

          if (plan.sweeper) {
            // Buffer the plan for sweeper-only playback at the right time
            // We'll use bufferedAudio = null but currentPlan has the sweeper
            state.bufferedAudio = null; // No DJ audio
            updateStatus("READY"); // Wait for timing trigger
            // The playBufferedAudio function will handle sweeper-only case
          } else {
            // No sweeper and no DJ - just update state and go to cooldown
            state.scheduler = updateStateAfterTransition(state.scheduler, plan, null);
            updateStatus("COOLDOWN");
            setTimeout(() => {
              if (state.status === "COOLDOWN") updateStatus("IDLE");
            }, TIMING.COOLDOWN_PERIOD);
          }
          return;
        }

        try {
          sendMessageWithRetry(
            {
              type: "GENERATE_INTRO",
              data: {
                currentSong: { title: current.title, artist: current.artist, id: "ytm-current" },
                nextSong: {
                  title: next.title || "Next Track",
                  artist: next.artist || "Unknown",
                  id: "ytm-next",
                },
                plan,
                playlistContext,
                style: settings.djStyle || "STANDARD",
                voice: settings.djVoice,
                language: settings.language || "en",
                customPrompt: settings.customStylePrompt,
                dualDjMode: settings.dualDjMode,
                secondaryVoice: settings.secondaryDjVoice,
                debugSettings: settings.debug,
                textModel: settings.textModel,
                ttsModel: settings.ttsModel,
                newsHistory: state.scheduler.recentNewsSummaries || [],
              },
            },
            {
              maxRetries: 3,
              retryDelayMs: 300,
              onRetry: (attempt, error) => {
                log.warn(`⚠️ Background connection failed (attempt ${attempt}/3), retrying...`);
              },
            }
          )
            .then((response: any) => {
              if (state.currentSongSig !== sig) return;

              if (response && response.audio) {
                state.bufferedAudio = response.audio;
                // Note: Scheduler state is updated at playback time in audioEl.onended

                if (response.script) {
                  log.log(`🤖 Script: "${response.script}"`);

                  // If this was a NEWS segment, save the summary to history to avoid repetition
                  if (plan.segment === "NEWS") {
                    const currentHistory = state.scheduler.recentNewsSummaries || [];
                    const limit =
                      settings.scheduler?.maxNewsHistory ||
                      DEFAULT_SCHEDULER_SETTINGS.maxNewsHistory;
                    const newHistory = [response.script, ...currentHistory].slice(0, limit);

                    state.scheduler.recentNewsSummaries = newHistory;
                    log.log(`📰 History updated, count: ${newHistory.length}`);
                  }
                }
                if (settings.debug?.verboseLogging && response.prompt) {
                  log.log(`🤖 Prompt: "${response.prompt}"`);
                }
                log.log(`✅ Generation ready`);
                updateStatus("READY");
              } else {
                updateStatus("COOLDOWN");
              }
            })
            .catch((err) => {
              log.error("sendMessage error after retries:", err);
              updateStatus("IDLE");
              // Do NOT reset generatedForSig - if it failed, we skip this song to prevent infinite loops
            });
        } catch (e) {
          state.status = "IDLE";
          // Do NOT reset generatedForSig
        }
      });
    }
  }

  // TRIGGER LOGIC
  if (state.pendingCall) {
    const freshTime = getScrapedTime();
    if (freshTime) {
      const freshLeft = freshTime.duration - freshTime.currentTime;
      if (freshLeft < 10 && freshLeft > 1) {
        // 10s trigger
        startLiveCall();
      }
    }
    return;
  }

  const freshTime = getScrapedTime();
  if (state.status === "READY" && freshTime) {
    const freshLeft = freshTime.duration - freshTime.currentTime;
    if (freshLeft < TIMING.DJ_TRIGGER_TIME / 1000 && freshLeft > 1) {
      playBufferedAudio();
    }
  }
}, TIMING.SONG_CHECK_INTERVAL);
