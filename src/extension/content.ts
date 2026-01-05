import { Song, DJStyle, DJVoice, AppLanguage } from '../../types';

// Prevent running in iframes
if (window !== window.top) {
    throw new Error("Hori-s.FM: Content script blocked in iframe.");
}

console.log("Hori-s.FM Content Script Loaded (Styles v2.5 - Single Instance)");

// --- TYPES & STATE ---
type DJState = 'IDLE' | 'GENERATING' | 'READY' | 'PLAYING' | 'COOLDOWN';

interface State {
    status: DJState;
    currentSongSig: string; // ID to track if song changed
    bufferedAudio: string | null; // Base64 audio
    generatedForSig: string | null; // CONTEXT VALIDATION
    lastTime: number;
    lastSongChangeTs: number;
}

let state: State = {
    status: 'IDLE',
    currentSongSig: '',
    bufferedAudio: null,
    generatedForSig: null,
    lastTime: 0,
    lastSongChangeTs: 0
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

// --- WEB AUDIO DUCKING SYSTEM ---
class WebAudioDucker {
    private ctx: AudioContext | null = null;
    private source: MediaElementAudioSourceNode | null = null;
    private gainNode: GainNode | null = null;
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

            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            // Create source only if not exists for this element
            // Note: MediaElementSource can only be created once per element usually.
            // In a content script, we must be careful. 
            // However, since we are inside the page context via content script, we access the DOM element.
            // If the extension interacts with the same element multiple times, we need to be careful.
            // BUT: Content scripts live in an isolated world. They cannot access the page's AudioContext.
            // They CAN create their own AudioContext and connect the element to it? 
            // Actually, cross-origin issues might arise if we try to route the element's audio.
            // UPDATE: Content scripts CANNOT access MediaElementAudioSourceNode for elements created by the page due to isolation/CORS often.
            // Wait, for Extensions, we usually have permissions. But `captureVisibleTab` is for video.
            // Let's try this: detailed research suggests MediaElementAudioSourceNode in content script works if CORS matches or if allow-origin.
            // YTM serves some content with CORS. 
            // IF THIS FAILS, we might need to inject a script into the page context (MAIN world).
            // Let's assume for this task we try the standard approach, but if it fails we might need `chrome.scripting.executeScript` in MAIN world.

            // Re-evaluating based on "volume spiking" issue: 
            // The simple volume control was "spiking" because the site fought back.
            // Let's try the Web Audio approach. If it fails due to CORS/Isolation, we will know quickly.

            this.source = this.ctx.createMediaElementSource(video);
            this.gainNode = this.ctx.createGain();

            this.source.connect(this.gainNode);
            this.gainNode.connect(this.ctx.destination);

            this.initialized = true;
            console.log("[Audio] WebAudio Ducker Initialized");
        } catch (e) {
            console.error("[Audio] WebAudio Init Failed:", e);
        }
    }

    public async duck(duration: number = 2000) {
        const video = document.querySelector('video');
        if (!video) return;

        this.init(video);
        if (!this.ctx || !this.gainNode) return;

        console.log("[Audio] Ducking music...");
        const now = this.ctx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
        this.gainNode.gain.linearRampToValueAtTime(0.2, now + (duration / 1000));
    }

    public async unduck(duration: number = 3000) {
        if (!this.ctx || !this.gainNode) return;

        console.log("[Audio] Restoring music...");
        const now = this.ctx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
        this.gainNode.gain.linearRampToValueAtTime(1.0, now + (duration / 1000));
    }
}

const ducker = new WebAudioDucker();

// Fallback logic in case WebAudio fails? 
// For now, we trust the user wants to try this new approach.



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
    ducker.duck(2000);

    try {
        await audioEl.play();
    } catch (e) {
        console.error("[Audio] Playback failed:", e);
        ducker.unduck(1000);
        state.status = 'IDLE';
    }

    audioEl.onended = () => {
        console.log("[Audio] Playback finished.");
        ducker.unduck(3000);

        state.status = 'COOLDOWN';
        state.bufferedAudio = null;

        setTimeout(() => {
            if (state.status === 'COOLDOWN') state.status = 'IDLE';
        }, 5000);
    };
};

// --- MAIN LOOP ---
const mainLoop = setInterval(() => {
    // Safety Check: Extension Reloaded?
    if (!chrome.runtime?.id) {
        console.log("[Hori-s.FM] Extension context invalidated. Stopping script. Please refresh the page.");
        clearInterval(mainLoop);
        return;
    }

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
        state.lastSongChangeTs = Date.now();

        // CRITICAL: If audio is still playing (transitioning), ensure new song is DUCKED.
        if (!audioEl.paused) {
            console.log("[Audio] Transition active during song change. Re-applying ducking.");
            ducker.duck(50); // Fast re-duck
        }
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
        // PREVENT PREMATURE GENERATION:
        // If song changed < 3 seconds ago, and we are "at the end", it's likely a DOM/Video Desync (Old video still playing).
        if (Date.now() - state.lastSongChangeTs < 3000) {
            return;
        }

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

        try {
            chrome.storage.local.get(['horisFmSettings'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error("[Generator] Storage access failed:", chrome.runtime.lastError);
                    return;
                }
                const settings = (result as any).horisFmSettings || { enabled: true, voice: 'Kore' };

                if (!settings.enabled) {
                    console.log("[Generator] Aborting: System Disabled");
                    state.status = 'COOLDOWN';
                    return;
                }

                try {
                    chrome.runtime.sendMessage({
                        type: 'GENERATE_INTRO',
                        data: {
                            currentSong: { title: current.title, artist: current.artist, id: 'ytm-current' },
                            nextSong: { title: next.title || "Next Track", artist: next.artist || "Unknown", id: 'ytm-next' },
                            playlistContext: (current as any).playlistContext || [],
                            style: settings.style || 'STANDARD',
                            voice: settings.voice,
                            language: 'en',
                            customPrompt: settings.customPrompt
                        }
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            // This often catches "Could not establish connection" if bg is dead
                            console.warn("[Generator] Communication error:", chrome.runtime.lastError);
                            return;
                        }

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
                } catch (e) {
                    console.error("[Generator] Failed to send message:", e);
                }
            });
        } catch (e) {
            // This catches the immediate "context invalidated" if accessing chrome.storage throws
            console.log("[Hori-s.FM] Extension context invalidated during storage access. Stopping.");
            clearInterval(mainLoop);
        }
    }

    if (state.status === 'READY' && timeLeft < 12) {
        playBufferedAudio();
    }

}, 1000);
