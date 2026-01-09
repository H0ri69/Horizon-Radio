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
  }
});
