import { Song, DJStyle, DJVoice, AppLanguage } from '../../types';

console.log("Hori-s.FM Content Script Loaded (Styles v2.4 - Smooth Fades)");

// --- TYPES & STATE ---
type DJState = 'IDLE' | 'GENERATING' | 'READY' | 'PLAYING' | 'COOLDOWN';

interface State {
    status: DJState;
    currentSongSig: string; // ID to track if song changed
    bufferedAudio: string | null; // Base64 audio
    generatedForSig: string | null; // CONTEXT VALIDATION
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
    // 1. Current Song Parsers - SCOPED TO PLAYER BAR
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (!playerBar) return { current: { title: "", artist: "", album: "" }, next: { title: "", artist: "" }, playlistContext: [] };

    const titleEl = playerBar.querySelector('.content-info-wrapper .title');
    const subtitleEl = playerBar.querySelector('.content-info-wrapper .subtitle');

    let title = titleEl?.textContent || "";
    let artist = "";
    let album = "";

    if (subtitleEl && subtitleEl.textContent) {
        const parts = subtitleEl.textContent.split('•').map(s => s.trim());
        if (parts.length >= 1) artist = parts[0];
        if (parts.length >= 2) album = parts[1];
    }

    // 2. Queue Logic (Context)
    const queueItems = document.querySelectorAll('ytmusic-player-queue-item');
    let currentIndex = -1;
    const playlistContext: string[] = [];

    // Find current index
    queueItems.forEach((item, index) => {
        if (item.hasAttribute('selected')) currentIndex = index;
    });

    // Scrape surroundings (e.g. -5 to +5)
    if (currentIndex !== -1) {
        const start = Math.max(0, currentIndex - 5);
        const end = Math.min(queueItems.length, currentIndex + 5);
        for (let i = start; i < end; i++) {
            const title = queueItems[i].querySelector('.song-title')?.textContent || "Unknown";
            const artist = queueItems[i].querySelector('.byline')?.textContent || "Unknown";
            playlistContext.push(`${itemIndexToLabel(i, currentIndex)}: ${title} by ${artist}`);
        }
    }

    // Next Song (Immediate)
    let nextTitle = "";
    let nextArtist = "";
    if (currentIndex !== -1 && currentIndex + 1 < queueItems.length) {
        nextTitle = queueItems[currentIndex + 1].querySelector('.song-title')?.textContent || "";
        nextArtist = queueItems[currentIndex + 1].querySelector('.byline')?.textContent || "";
    }

    return {
        current: { title, artist, album },
        next: { title: nextTitle, artist: nextArtist },
        playlistContext // New field
    };
};

function itemIndexToLabel(index: number, current: number): string {
    if (index === current) return "[NOW PLAYING]";
    if (index > current) return `[UP NEXT +${index - current}]`;
    return `[PREVIOUS -${current - index}]`;
}

// --- AUDIO SYSTEM ---
const audioEl = document.createElement('audio');
audioEl.id = 'horis-fm-dj-voice';
document.body.appendChild(audioEl);

// --- VOLUME CONTROL SYSTEM ---
let duckingInterval: any = null;
let fadeInterval: any = null;

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const fadeVolume = (targetVol: number, duration: number = 800): Promise<void> => {
    return new Promise((resolve) => {
        const video = getMoviePlayer();
        if (!video) { resolve(); return; }

        if (fadeInterval) clearInterval(fadeInterval);

        const startVol = video.volume;
        const startTime = Date.now();

        console.log(`[Audio] Fading volume: ${startVol.toFixed(2)} -> ${targetVol} (${duration}ms)`);

        fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = clamp(elapsed / duration, 0, 1);

            // Linear interpolation
            const newVol = startVol + (targetVol - startVol) * progress;

            if (video) video.volume = clamp(newVol, 0, 1);

            if (progress >= 1) {
                clearInterval(fadeInterval);
                fadeInterval = null;
                resolve();
            }
        }, 50); // 20fps updates is smooth enough for volume
    });
};

const startActiveDucking = async (originalVolume: number) => {
    // 1. Fade Down
    const targetVolume = originalVolume * 0.15;
    await fadeVolume(targetVolume, 1000); // 1s fade out for smoothness

    // 2. Enforce Low Volume (The Fix for Track Changes)
    if (duckingInterval) clearInterval(duckingInterval);

    console.log(`[Audio] Engaging Volume Enforcer at ${targetVolume.toFixed(2)}`);

    const enforce = () => {
        const video = getMoviePlayer();
        if (video) {
            // Strict enforcement if it jumps up
            if (video.volume > targetVolume + 0.05) {
                // Snap back instantly if it drifted (e.g. track change reset)
                video.volume = targetVolume;
            }
        }
    };
    duckingInterval = setInterval(enforce, 200);
};

const stopActiveDucking = async (restoreTo: number) => {
    // 1. Stop Enforcing
    if (duckingInterval) {
        clearInterval(duckingInterval);
        duckingInterval = null;
    }

    // 2. Fade Up
    await fadeVolume(restoreTo, 1000); // 1s fade in
};


const playBufferedAudio = async () => {
    if (!state.bufferedAudio) return;

    // CONTEXT VALIDATION
    if (state.generatedForSig !== state.currentSongSig) {
        console.warn(`[Audio] Validation Failed! Stale buffer.`);
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

    // Start Ducking (Async, but we start playing voice immediately or after fade?)
    // Usually standard radio style: Fade starts, DJ starts shortly after or same time.
    // Let's run parallel.
    startActiveDucking(originalVolume);

    try {
        await audioEl.play();
    } catch (e) {
        console.error("[Audio] Playback failed:", e);
        stopActiveDucking(originalVolume);
        state.status = 'IDLE';
    }

    audioEl.onended = () => {
        console.log("[Audio] Playback finished.");
        stopActiveDucking(originalVolume);

        state.status = 'COOLDOWN';
        state.bufferedAudio = null;

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
    const sig = `${current.title}|${current.artist}`;
    const currentTime = video.currentTime;
    const timeLeft = video.duration - currentTime;

    // --- RESET LOGIC ---
    if (sig !== state.currentSongSig) {
        console.log(`[State] New Song detected: "${current.title}"`);
        state.currentSongSig = sig;
        state.status = 'IDLE';
        state.bufferedAudio = null;
        state.generatedForSig = null;
    }

    if (state.lastTime > currentTime + 5) {
        console.log(`[State] Seek detected. Resetting.`);
        state.status = 'IDLE';
        state.bufferedAudio = null;
        state.generatedForSig = null;
    }
    state.lastTime = currentTime;

    // --- STATE MACHINE ---
    if (state.status === 'IDLE' && timeLeft < 45 && timeLeft > 10) {
        if (!current.title || !current.artist) return;

        state.status = 'GENERATING';
        state.generatedForSig = sig;
        console.log("[Generator] Starting pre-generation...");
        console.log(`[Generator] Context: "${current.title}" -> "${next.title}"`);
        console.log(`[Generator] Sending request to Background...`);

        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            console.error("[Generator] Extension API not available.");
            return;
        }

        chrome.storage.local.get(['horisFmSettings'], (result) => {
            const settings = (result as any).horisFmSettings || { enabled: true, voice: 'Kore' };

            if (!settings.enabled) {
                console.log("[Generator] Aborting: System Disabled");
                state.status = 'COOLDOWN';
                return;
            }

            chrome.runtime.sendMessage({
                type: 'GENERATE_INTRO',
                data: {
                    currentSong: { title: current.title, artist: current.artist, id: 'ytm-current' },
                    nextSong: { title: next.title || "Next Track", artist: next.artist || "Unknown", id: 'ytm-next' },
                    playlistContext: (current as any).playlistContext || [], // Pass the context
                    style: settings.style || 'STANDARD',
                    voice: settings.voice,
                    language: 'en'
                }
            }, (response) => {
                console.log("[Generator] Background Response Received.");

                if (state.currentSongSig !== sig) {
                    console.warn("[Generator] Discarding response: Song changed during generation.");
                    return;
                }

                if (response && response.audio) {
                    console.log("[Generator] Audio received & Buffered.");
                    state.bufferedAudio = response.audio;
                    state.status = 'READY';
                } else {
                    state.status = 'COOLDOWN';
                }
            });
        });
    }

    if (state.status === 'READY' && timeLeft < 12) {
        playBufferedAudio();
    }

}, 1000);
