import { Song, DJStyle, DJVoice, AppLanguage } from '../../types';

console.log("Hori-s.FM Content Script Loaded (State Machine v2.3 - Hardened)");

// --- TYPES & STATE ---
type DJState = 'IDLE' | 'GENERATING' | 'READY' | 'PLAYING' | 'COOLDOWN';

interface State {
    status: DJState;
    currentSongSig: string; // ID to track if song changed
    bufferedAudio: string | null; // Base64 audio
    generatedForSig: string | null; // CONTEXT VALIDATION: Which song was this audio generated for?
    lastTime: number;
}

let state: State = {
    status: 'IDLE',
    currentSongSig: '',
    bufferedAudio: null,
    generatedForSig: null,
    lastTime: 0
};

// --- DOM UTILS ---
const getMoviePlayer = () => document.querySelector('video');

const getSongInfo = () => {
    // 1. Current Song Parsers - SCOPED TO PLAYER BAR (Fixes 'Chinese Tea Ceremony' page title issue)
    const playerBar = document.querySelector('ytmusic-player-bar');

    // Fallback? If bar isn't loaded, return empty.
    if (!playerBar) return { current: { title: "", artist: "", album: "" }, next: { title: "", artist: "" } };

    const titleEl = playerBar.querySelector('.content-info-wrapper .title');
    const subtitleEl = playerBar.querySelector('.content-info-wrapper .subtitle');

    let title = titleEl?.textContent || "";
    let artist = "";
    let album = "";

    // Parse Subtitle: "Artist • Album • Year • Views"
    if (subtitleEl && subtitleEl.textContent) {
        const parts = subtitleEl.textContent.split('•').map(s => s.trim());
        if (parts.length >= 1) artist = parts[0];
        if (parts.length >= 2) album = parts[1];
        // We ignore the rest
    }

    // 2. Next Song Logic
    let nextTitle = "";
    let nextArtist = "";

    const queueItems = document.querySelectorAll('ytmusic-player-queue-item');
    let foundCurrent = false;

    // Helper: Find the *active* item, then pick the next one.
    for (const item of queueItems) {
        if (item.hasAttribute('selected')) {
            foundCurrent = true;
            continue;
        }
        if (foundCurrent) {
            nextTitle = item.querySelector('.song-title')?.textContent || "";
            nextArtist = item.querySelector('.byline')?.textContent || "";
            break;
        }
    }

    return {
        current: { title, artist, album },
        next: { title: nextTitle, artist: nextArtist }
    };
};

// --- AUDIO SYSTEM ---
const audioEl = document.createElement('audio');
audioEl.id = 'horis-fm-dj-voice';
document.body.appendChild(audioEl);

// ACTIVE DUCKING SYSTEM
// We need to continuously force volume down because YTM resets it on track change
let duckingInterval: any = null;

const startActiveDucking = (originalVolume: number) => {
    if (duckingInterval) clearInterval(duckingInterval);

    const targetVolume = originalVolume * 0.15;
    console.log(`[Audio] Starting active ducking. Target: ${targetVolume}`);

    const enforce = () => {
        const video = getMoviePlayer();
        if (video) {
            // Only duck if it's significantly higher than our target (allow small user deviations?)
            // Actually, enforce strict ducking to be safe.
            if (video.volume > targetVolume + 0.05) {
                video.volume = targetVolume;
            }
        }
    };

    // Run immediately
    enforce();

    // Run repeatedly
    duckingInterval = setInterval(enforce, 200);
};

const stopActiveDucking = (restoreTo: number) => {
    if (duckingInterval) {
        clearInterval(duckingInterval);
        duckingInterval = null;
    }

    const video = getMoviePlayer();
    if (video) {
        console.log(`[Audio] Restoring volume to ${restoreTo}`);
        video.volume = restoreTo;
    }
};


const playBufferedAudio = async () => {
    if (!state.bufferedAudio) return;

    // CONTEXT VALIDATION: Ensure we are still on the same song!
    if (state.generatedForSig !== state.currentSongSig) {
        console.warn(`[Audio] Validation Failed! Stale buffer. Generated for: "${state.generatedForSig}", Current: "${state.currentSongSig}"`);
        state.status = 'IDLE';
        state.bufferedAudio = null;
        state.generatedForSig = null;
        return;
    }

    console.log("[Audio] Playing buffered DJ intro...");
    state.status = 'PLAYING';

    const url = `data:audio/wav;base64,${state.bufferedAudio}`;
    audioEl.src = url;
    audioEl.volume = 1.0;

    // DUCK YTM
    const video = getMoviePlayer();
    const originalVolume = video ? video.volume : 1.0;

    startActiveDucking(originalVolume);

    try {
        await audioEl.play();
    } catch (e) {
        console.error("[Audio] Playback failed:", e);
        stopActiveDucking(originalVolume);
        state.status = 'IDLE'; // Reset on failure
    }

    audioEl.onended = () => {
        console.log("[Audio] Playback finished.");
        stopActiveDucking(originalVolume);

        // Enter COOLDOWN to prevent immediately triggering again if times are weird
        state.status = 'COOLDOWN';
        state.bufferedAudio = null; // Clear buffer

        // Release cooldown after a few seconds
        setTimeout(() => {
            if (state.status === 'COOLDOWN') state.status = 'IDLE';
        }, 5000);
    };
};

// --- MAIN LOOP ---
setInterval(() => {
    const video = getMoviePlayer();
    if (!video || video.paused || !video.duration) return;

    const { current, next } = getSongInfo();

    // We use Title + Artist as a unique signature. 
    const sig = `${current.title}|${current.artist}`;
    const currentTime = video.currentTime;
    const timeLeft = video.duration - currentTime;

    // --- RESET LOGIC ---
    // 1. Song Change detected via text
    if (sig !== state.currentSongSig) {
        console.log(`[State] New Song detected: "${current.title}" by "${current.artist}"`);
        state.currentSongSig = sig;
        state.status = 'IDLE';
        state.bufferedAudio = null;
        state.generatedForSig = null;
    }

    // 2. Time Jump detected (User seeked back or song restarted)
    // If time jumps BACK by >5s, hard reset.
    if (state.lastTime > currentTime + 5) {
        console.log(`[State] Seek detected (${state.lastTime} -> ${currentTime}). Resetting.`);
        state.status = 'IDLE';
        state.bufferedAudio = null;
        state.generatedForSig = null;
    }
    state.lastTime = currentTime;

    // --- STATE MACHINE ---

    // TRIGGER CONDITION: 45s before end (to generate) -> Buffer
    // We only generate if we are IDLE.
    if (state.status === 'IDLE' && timeLeft < 45 && timeLeft > 10) {

        // Check Validity
        if (!current.title || !current.artist) {
            console.warn("[Generator] Skipping: Missing metadata.");
            return;
        }

        // START GENERATION
        state.status = 'GENERATING';
        state.generatedForSig = sig; // LOCK CONTEXT
        console.log("[Generator] Starting pre-generation...");

        chrome.storage.local.get(['horisFmSettings'], (result) => {
            const settings = (result as any).horisFmSettings || { enabled: true, voice: 'Kore' };

            if (!settings.enabled) {
                console.log("[Generator] DJ Disabled in settings.");
                state.status = 'COOLDOWN'; // Wait until song changes
                return;
            }

            chrome.runtime.sendMessage({
                type: 'GENERATE_INTRO',
                data: {
                    currentSong: { title: current.title, artist: current.artist, id: 'ytm-current' },
                    nextSong: { title: next.title || "Next Track", artist: next.artist || "Unknown", id: 'ytm-next' },
                    style: 'STANDARD',
                    voice: settings.voice,
                    language: 'en'
                }
            }, (response) => {
                // CALLBACK: Check if we are still generating for the same valid context
                if (state.currentSongSig !== sig) {
                    console.warn("[Generator] Discarding response: Song changed during generation.");
                    return;
                }

                if (response && response.audio) {
                    console.log("[Generator] Audio received & Buffered.");
                    state.bufferedAudio = response.audio;
                    state.status = 'READY';
                } else {
                    console.warn("[Generator] Failed to generate audio.");
                    state.status = 'COOLDOWN';
                }
            });
        });
    }

    // PLAY CONDITION: Song is ending (e.g., < 2s left) OR Song Just Changed (Crossfade scenario)
    // For YTM, usually handling it at < 15s (before standard fade) is good.
    // Let's refine: If we are READY and time < 10s, PLAY.
    if (state.status === 'READY' && timeLeft < 12) {
        playBufferedAudio();
    }

}, 1000);
