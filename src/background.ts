import browser from "webextension-polyfill";
import { generateDJIntro, testVoice } from "./services/geminiService";
import { Song, DJVoice } from "./types";
import { DJStyle, TransitionPlan } from "./config";
import { EXTENSION_CONFIG } from "./config";
import { encodeAudio } from "./services/liveAudioUtils";
import { logger } from "./utils/Logger";

const log = logger.withContext('Background');


const MAX_HISTORY = EXTENSION_CONFIG.MAX_HISTORY;

interface ExtensionMessage {
  type: string;
  data?: any;
}

// Handler functions that return Promises directly
async function handleGenerateIntro(data: any, sender: browser.Runtime.MessageSender) {
  const {
    currentSong,
    nextSong,
    plan,
    style,
    voice,
    language,
    playlistContext,
    customPrompt,
    dualDjMode,
    secondaryVoice,
    debugSettings,
    textModel,
    ttsModel,
    newsHistory
  } = data;

  const storageResult = await browser.storage.local.get(["narrativeHistory"]);
  const history = (storageResult as any).narrativeHistory || [];

  try {
    const result = await generateDJIntro(
      currentSong as Song,
      nextSong as Song,
      plan as TransitionPlan,
      style as DJStyle,
      voice as DJVoice,
      language,
      customPrompt,
      playlistContext || [],
      dualDjMode,
      secondaryVoice,
      debugSettings,
      textModel || "FLASH",
      ttsModel || "FLASH",
      newsHistory || [],
      // Progress Callback
      (stage) => {
        if (sender.tab?.id) {
          browser.tabs.sendMessage(sender.tab.id, {
            type: "GENERATION_PROGRESS",
            data: stage
          }).catch(() => { }); // Ignore errors if tab closed
        }
      }
    );

    if (result.audio) {
      // Update History
      const newEntry = `Transitioned: "${currentSong.title}" -> "${nextSong.title}"`;
      const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY);
      await browser.storage.local.set({ narrativeHistory: updatedHistory });

      const base64 = encodeAudio(new Uint8Array(result.audio));
      return {
        audio: base64,
        script: result.script,
        prompt: result.prompt
      };
    } else {
      return { error: "Failed to generate audio" };
    }
  } catch (err: any) {
    log.error("❌ Error:", err);
    return { error: err.message };
  }
}

async function handleTestVoice(data: any) {
  const { voice, language } = data;
  const cacheKey = `voiceTestCache_${voice}_${language}`;
  const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  const result = await browser.storage.local.get([cacheKey]);
  const cached = result[cacheKey] as { audio: string; timestamp: number } | undefined;

  // Check if cache exists and is still valid
  if (cached && cached.timestamp && cached.audio) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_EXPIRY_MS) {
      log.log(`Using cached voice sample for ${voice}/${language} (age: ${Math.floor(age / (24 * 60 * 60 * 1000))} days)`);
      return { audio: cached.audio, fromCache: true };
    } else {
      log.log(`Cache expired for ${voice}/${language}, regenerating...`);
    }
  }

  // Generate fresh sample and cache it with timestamp
  try {
    const audio = await testVoice(voice, language);
    if (audio) {
      const base64 = encodeAudio(new Uint8Array(audio));
      // Store in cache with timestamp for expiry tracking
      await browser.storage.local.set({
        [cacheKey]: {
          audio: base64,
          timestamp: Date.now()
        }
      });
      log.log(`Cached voice sample for ${voice}/${language}`);
      return { audio: base64, fromCache: false };
    } else {
      return { error: "Failed to generate test audio" };
    }
  } catch (err: any) {
    log.error("❌ Test voice error:", err);
    return { error: err.message };
  }
}

async function handleClearVoiceCache() {
  const items = await browser.storage.local.get(null);
  const keysToRemove = Object.keys(items).filter(key => key.startsWith("voiceTestCache_"));
  if (keysToRemove.length > 0) {
    await browser.storage.local.remove(keysToRemove);
    log.log(`Cleared ${keysToRemove.length} voice cache entries`);
    return { cleared: keysToRemove.length };
  }
  return { cleared: 0 };
}

async function handleSearchSongs(data: any) {
  const query = data.query;
  const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    // Clean up JSONP if present "window.google.ac.h(...)"
    const jsonText = text.replace(/^window\.google\.ac\.h\((.*)\)$/, "$1");
    const parsedData = JSON.parse(jsonText);
    return { data: parsedData };
  } catch (err: any) {
    log.error("Search failed", err);
    return { error: err.message };
  }
}

async function handleProxyFetchImage(data: any) {
  const url = data.url;

  // Check verbose logging setting (fire and forget)
  browser.storage.local.get("horisFmSettings").then((result) => {
    const settings = (result as any).horisFmSettings;
    if (settings?.debug?.verboseLogging) {
      log.log("Proxy fetching image:", url);
    }
  });

  try {
    const response = await fetch(url, {
      referrerPolicy: "no-referrer",
      credentials: "omit"
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const contentType = response.headers.get("content-type") || "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return { error: "Result was not an image" };
    }

    const buffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);

    return { dataUrl: `data:${contentType};base64,${base64}` };
  } catch (err: any) {
    log.error("❌ Image proxy fetch failed:", err);
    return { error: err.message };
  }
}

// Log when background script starts (helps debug Firefox event page issues)
log.log("🚀 Background script started");

// Main message listener - returns Promises directly (cleaner webextension-polyfill pattern)
browser.runtime.onMessage.addListener((message: any, _sender: browser.Runtime.MessageSender): Promise<any> | false => {
  const msg = message as ExtensionMessage;

  switch (msg.type) {
    case "PING":
      // Keep-alive ping to wake up the background script
      return Promise.resolve({ pong: true, timestamp: Date.now() });
    case "GENERATE_INTRO":
      return handleGenerateIntro(msg.data, _sender);
    case "TEST_VOICE":
      return handleTestVoice(msg.data);
    case "CLEAR_VOICE_CACHE":
      return handleClearVoiceCache();
    case "SEARCH_SONGS":
      return handleSearchSongs(msg.data);
    case "PROXY_FETCH_IMAGE":
      return handleProxyFetchImage(msg.data);
    default:
      // Return false to indicate we won't handle this message
      // (undefined can cause issues in Firefox)
      return false;
  }
});

// --- REMOTE SOCKET PROXY ---
// Bridges Content Script (Secure Context) <-> Relay Server (Insecure WebSocket)
browser.runtime.onConnect.addListener((port: any) => {
  if (port.name === 'remote-socket-proxy') {
    log.log('🔌 Remote Socket Proxy connected');

    let isPortConnected = true;
    let ws: WebSocket | null = null;
    const RELAY_URL = import.meta.env.VITE_RELAY_URL || "ws://127.0.0.1:8765";
    log.log('Using Relay URL:', RELAY_URL);

    try {
      ws = new WebSocket(RELAY_URL);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        log.log('WS Connected to Relay');
        if (isPortConnected) {
          try {
            port.postMessage({ type: 'PROXY_STATUS', status: 'OPEN' });
          } catch (e) {
            log.warn('Failed to post OPEN status:', e);
          }
        }
      };

      ws.onmessage = (event) => {
        if (!isPortConnected) return;

        // Forward message to Content Script
        if (event.data instanceof ArrayBuffer) {
          // Forward binary audio directly (Structured Clone handles ArrayBuffer)
          // We wrap it to distinguish from text JSON
          try {
            // Convert to Base64 here to avoid any structured clone issues across contexts
            // although ArrayBuffer is supported, debugging is easier with strings sometimes.
            // Let's try raw ArrayBuffer first for performance.
            // Actually, let's wrap it in an object so we can tag it.
            const base64 = arrayBufferToBase64(event.data);
            port.postMessage({ type: 'AUDIO_DATA', data: base64 });
          } catch (e) {
            log.error('Failed to forward binary:', e);
          }
        } else {
          // Forward text 1:1
          try {
            const msg = JSON.parse(event.data);
            port.postMessage({ type: 'CONTROL_MSG', data: msg });
          } catch (e) {
            log.warn('Recv non-JSON text:', event.data);
          }
        }
      };

      ws.onerror = (e) => {
        log.error('WS Error:', e);
        if (isPortConnected) {
          try {
            port.postMessage({ type: 'PROXY_ERROR', error: 'WebSocket Error' });
          } catch (err) {
            log.warn('Failed to post ERROR:', err);
          }
        }
      };

      ws.onclose = (event) => {
        log.log('WS Closed:', event.code);
        if (isPortConnected) {
          try {
            port.postMessage({ type: 'PROXY_STATUS', status: 'CLOSED', code: event.code });
            port.disconnect(); // Close port if WS dies and port is still open
            isPortConnected = false;
          } catch (err) {
            log.warn('Failed to post CLOSED status:', err);
          }
        }
      };

    } catch (e) {
      log.error('Failed to create WS:', e);
      if (isPortConnected) {
        try {
          port.disconnect();
        } catch (err) { /* ignore */ }
        isPortConnected = false;
      }
    }

    // Handle messages FROM Content Script
    port.onMessage.addListener((msg: any) => {
      // Keep-alive heartbeat
      if (msg.type === 'PING') {
        return;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        // Check if we need to send binary or text
        // Implementation currently only sends Text control messages (REGISTER, GO_LIVE)
        // If we ever need to send Audio FROM Extension TO Relay, we handle it here.
        if (msg.type === 'SEND_TEXT') {
          ws.send(JSON.stringify(msg.payload));
        }
      }
    });

    port.onDisconnect.addListener(() => {
      log.log('Proxy Port disconnected. Closing WS.');
      isPortConnected = false;
      if (ws) ws.close();
    });
  }
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
