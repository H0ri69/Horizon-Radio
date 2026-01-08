import { generateDJIntro } from "./services/geminiService";
import { Song, DJVoice } from "./types";
import { DJStyle } from "./config";
import { EXTENSION_CONFIG } from "./config";
import { encodeAudio } from "./services/liveAudioUtils";

const MAX_HISTORY = EXTENSION_CONFIG.MAX_HISTORY;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_INTRO") {
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
    } = message.data;

    // 1. Fetch History
    chrome.storage.local.get(["narrativeHistory"], (result) => {
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
        message.data.isLongMessage,
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
            chrome.storage.local.set({ narrativeHistory: updatedHistory });

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
  } else if (message.type === "SEARCH_SONGS") {
    const query = message.data.query;
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
