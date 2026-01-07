import { generateDJIntro } from "./services/geminiService";
import { Song, DJVoice } from "./types";
import { DJStyle } from "./config";
import { EXTENSION_CONFIG } from "./config";

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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
    } = message.data;

    console.log("Generating Intro for:", currentSong.title, "->", nextSong.title);

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
        [],
        playlistContext || [],
        history,
        dualDjMode,
        secondaryVoice,
        message.data.isLongMessage,
        recentThemeIndices || [],
        debugSettings,
        themeUsageHistory || {}
      )
        .then((result) => {
          if (result.audio) {
            console.log("Audio generated.");

            // 3. Update History
            const newEntry = `Transitioned: "${currentSong.title}" -> "${nextSong.title}"`;
            const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY);
            chrome.storage.local.set({ narrativeHistory: updatedHistory });
            console.log(
              `[Background] 📜 History Saved (${updatedHistory.length} items). Last: ${newEntry}`
            );

            const base64 = arrayBufferToBase64(result.audio);
            sendResponse({ audio: base64, themeIndex: result.themeIndex });
          } else {
            sendResponse({ error: "Failed to generate audio" });
          }
        })
        .catch((err) => {
          console.error(err);
          sendResponse({ error: err.message });
        });
    });

    return true;
  }
});
