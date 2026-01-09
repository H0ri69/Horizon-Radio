import browser from "webextension-polyfill";
import { generateDJIntro, testVoice } from "./services/geminiService";
import { Song, DJVoice } from "./types";
import { DJStyle } from "./config";
import { EXTENSION_CONFIG } from "./config";
import { encodeAudio } from "./services/liveAudioUtils";

const MAX_HISTORY = EXTENSION_CONFIG.MAX_HISTORY;

interface ExtensionMessage {
  type: string;
  data?: any;
}

browser.runtime.onMessage.addListener((message: any, sender, sendResponse): any => {
  const msg = message as ExtensionMessage;

  if (msg.type === "GENERATE_INTRO") {
    const {
      currentSong,
      nextSong,
      style,
      voice,
      language,
      playlistContext,
      customPrompt,
      dualDjMode,
      secondaryVoice,
      recentThemeIndices,
      debugSettings,
      themeUsageHistory,
      textModel,
      ttsModel,
    } = msg.data;

    // 1. Fetch History
    browser.storage.local.get(["narrativeHistory"]).then((result) => {
      const history = (result as any).narrativeHistory || [];

      // 2. Call Service
      generateDJIntro(
        currentSong as Song,
        nextSong as Song,
        style as DJStyle,
        voice as DJVoice,
        language,
        customPrompt,
        playlistContext || [],
        history,
        dualDjMode,
        secondaryVoice,
        msg.data.isLongMessage,
        recentThemeIndices || [],
        debugSettings,
        themeUsageHistory || {},
        textModel || "FLASH",
        ttsModel || "PRO"
      )
        .then((result) => {
          if (result.audio) {
            // 3. Update History
            const newEntry = `Transitioned: "${currentSong.title}" -> "${nextSong.title}"`;
            const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY);
            browser.storage.local.set({ narrativeHistory: updatedHistory });

            const base64 = encodeAudio(new Uint8Array(result.audio));
            sendResponse({ audio: base64, themeIndex: result.themeIndex, script: result.script });
          } else {
            sendResponse({ error: "Failed to generate audio" });
          }
        })
        .catch((err) => {
          console.error("[Hori-s:Background] ❌ Error:", err);
          sendResponse({ error: err.message });
        });
    });

    return true;
  } else if (msg.type === "TEST_VOICE") {
    const { voice, language } = msg.data;
    const cacheKey = `voiceTestCache_${voice}_${language}`;
    const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Check cache first
    browser.storage.local.get([cacheKey]).then((result) => {
      const cached = result[cacheKey] as { audio: string; timestamp: number } | undefined;

      // Check if cache exists and is still valid
      if (cached && cached.timestamp && cached.audio) {
        const age = Date.now() - cached.timestamp;
        if (age < CACHE_EXPIRY_MS) {
          console.log(`[Hori-s:Background] Using cached voice sample for ${voice}/${language} (age: ${Math.floor(age / (24 * 60 * 60 * 1000))} days)`);
          sendResponse({ audio: cached.audio, fromCache: true });
          return;
        } else {
          console.log(`[Hori-s:Background] Cache expired for ${voice}/${language}, regenerating...`);
        }
      }

      // Generate fresh sample and cache it with timestamp
      testVoice(voice, language)
        .then((audio) => {
          if (audio) {
            const base64 = encodeAudio(new Uint8Array(audio));
            // Store in cache with timestamp for expiry tracking
            browser.storage.local.set({
              [cacheKey]: {
                audio: base64,
                timestamp: Date.now()
              }
            });
            console.log(`[Hori-s:Background] Cached voice sample for ${voice}/${language}`);
            sendResponse({ audio: base64, fromCache: false });
          } else {
            sendResponse({ error: "Failed to generate test audio" });
          }
        })
        .catch((err) => {
          console.error("[Hori-s:Background] ❌ Test voice error:", err);
          sendResponse({ error: err.message });
        });
    });
    return true;
  } else if (msg.type === "CLEAR_VOICE_CACHE") {
    // Clear all voice test cache entries
    browser.storage.local.get(null).then((items) => {
      const keysToRemove = Object.keys(items).filter(key => key.startsWith("voiceTestCache_"));
      if (keysToRemove.length > 0) {
        browser.storage.local.remove(keysToRemove).then(() => {
          console.log(`[Hori-s:Background] Cleared ${keysToRemove.length} voice cache entries`);
          sendResponse({ cleared: keysToRemove.length });
        });
      } else {
        sendResponse({ cleared: 0 });
      }
    });
    return true;
  } else if (msg.type === "SEARCH_SONGS") {
    const query = msg.data.query;
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;

    fetch(url)
      .then((res) => res.text()) // Sometimes returns weird JSON
      .then((text) => {
        // Clean up JSONP if present "window.google.ac.h(...)"
        const jsonText = text.replace(/^window\.google\.ac\.h\((.*)\)$/, "$1");
        return JSON.parse(jsonText);
      })
      .then((data) => {
        sendResponse({ data });
      })
      .catch((err) => {
        console.error("Search failed", err);
        sendResponse({ error: err.message });
      });

    return true;
  } else if (msg.type === "PROXY_FETCH_IMAGE") {
    const url = msg.data.url;
    console.log("[Hori-s:Background] Proxy fetching image:", url);

    fetch(url, {
      referrerPolicy: "no-referrer",
      credentials: "omit"
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const buffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);

        sendResponse({ dataUrl: `data:${contentType};base64,${base64}` });
      })
      .catch((err) => {
        console.error("[Hori-s:Background] ❌ Image proxy fetch failed:", err);
        sendResponse({ error: err.message });
      });
    return true;
  }
});

// --- REMOTE SOCKET PROXY ---
// Bridges Content Script (Secure Context) <-> Relay Server (Insecure WebSocket)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'remote-socket-proxy') {
    console.log('[Background] 🔌 Remote Socket Proxy connected');

    let ws: WebSocket | null = null;
    const RELAY_URL = import.meta.env.VITE_RELAY_URL || "ws://127.0.0.1:8765";
    console.log('[Background] Using Relay URL:', RELAY_URL);

    try {
      ws = new WebSocket(RELAY_URL);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('[Background] WS Connected to Relay');
        port.postMessage({ type: 'PROXY_STATUS', status: 'OPEN' });
      };

      ws.onmessage = (event) => {
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
            console.error('[Background] Failed to forward binary:', e);
          }
        } else {
          // Forward text 1:1
          try {
            const msg = JSON.parse(event.data);
            port.postMessage({ type: 'CONTROL_MSG', data: msg });
          } catch (e) {
            console.warn('[Background] Recv non-JSON text:', event.data);
          }
        }
      };

      ws.onerror = (e) => {
        console.error('[Background] WS Error:', e);
        port.postMessage({ type: 'PROXY_ERROR', error: 'WebSocket Error' });
      };

      ws.onclose = (event) => {
        console.log('[Background] WS Closed:', event.code);
        port.postMessage({ type: 'PROXY_STATUS', status: 'CLOSED', code: event.code });
        port.disconnect(); // Close port if WS dies
      };

    } catch (e) {
      console.error('[Background] Failed to create WS:', e);
      port.disconnect();
    }

    // Handle messages FROM Content Script
    port.onMessage.addListener((msg) => {
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
      console.log('[Background] Proxy Port disconnected. Closing WS.');
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
