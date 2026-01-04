import { generateDJIntro } from '../../services/geminiService';
import { Song, DJStyle, DJVoice } from '../../types';

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GENERATE_INTRO') {
        const { currentSong, nextSong, style, voice, language } = message.data;

        console.log("Generating Intro for:", currentSong.title, "->", nextSong.title);

        generateDJIntro(
            currentSong as Song,
            nextSong as Song,
            style as DJStyle,
            voice as DJVoice,
            language,
            undefined,
            [] // upcoming song titles
        ).then((arrayBuffer) => {
            if (arrayBuffer) {
                console.log("Audio generated, sending back...");
                const base64 = arrayBufferToBase64(arrayBuffer);
                sendResponse({ audio: base64 });
            } else {
                sendResponse({ error: "Failed to generate audio" });
            }
        }).catch(err => {
            console.error(err);
            sendResponse({ error: err.message });
        });

        return true; // Keep channel open for async response
    }
});
