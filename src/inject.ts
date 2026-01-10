import { logger } from "./utils/Logger";

const log = logger.withContext('Inject');

// Seek protection state
let seekProtectionEnabled = true;
const PROTECTED_ZONE_SECONDS = 15;

(function () {
    function broadcastContext() {
        try {
            const win = window as any;
            if (win.ytcfg && win.ytcfg.data_) {
                window.dispatchEvent(new CustomEvent("HORIS_YTM_CONTEXT", {
                    detail: JSON.stringify({
                        apiKey: win.ytcfg.data_.INNERTUBE_API_KEY,
                        context: win.ytcfg.data_.INNERTUBE_CONTEXT,
                        clientVersion: win.ytcfg.data_.INNERTUBE_CLIENT_VERSION
                    })
                }));
            }
        } catch (e) { log.error("Context broadcast failed", e); }
    }

    // Initial try and retry - increased frequency and range for reliability
    setTimeout(broadcastContext, 500);
    setTimeout(broadcastContext, 1000);
    setTimeout(broadcastContext, 2000);
    setTimeout(broadcastContext, 5000);
    setTimeout(broadcastContext, 10000);
    setTimeout(broadcastContext, 20000);

    window.addEventListener("HORIS_CMD_PLAY_NEXT", (e: any) => {
        // Parse detail (might be stringified for boundary crossing)
        let data = e.detail;
        try {
            if (typeof data === 'string') data = JSON.parse(data);
        } catch (err) { log.error("Parse error", err); }

        const videoId = data?.videoId;
        if (!videoId) return;

        try {
            // Method 1: Try accessing the Queue Service via DOM (Fragile)
            const queue: any = document.querySelector("ytmusic-player-queue");
            if (queue && queue.dispatch) {
                queue.dispatch({ type: "ADD", payload: videoId });
            } else {
                // Method 2: Navigation Fallback (Guaranteed to play)
                log.log("Standard queue access failed. Switching to direct navigation.");
                window.location.href = "/watch?v=" + videoId;
            }
        } catch (err) {
            log.error("Play action failed", err);
        }
    });

    // --- SEEK PROTECTION ---
    // Prevent seeking into the last 15 seconds of a song via the progress bar

    // Listen for toggle from settings
    window.addEventListener("HORIS_SEEK_PROTECTION_TOGGLE", (e: any) => {
        const detail = e.detail;
        if (typeof detail?.enabled === 'boolean') {
            seekProtectionEnabled = detail.enabled;
        }
    });

    // Get video element and duration
    const getVideoInfo = (): { video: HTMLVideoElement | null; duration: number } => {
        const video = document.querySelector("video") as HTMLVideoElement | null;
        return { video, duration: video?.duration || 0 };
    };

    // Calculate seek position from progress bar event
    const calculateSeekPosition = (event: MouseEvent, progressBar: Element): number | null => {
        const rect = progressBar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
        const { duration } = getVideoInfo();
        if (!duration || duration <= 0) return null;
        return ratio * duration;
    };

    // Handle seek attempt
    const handleSeekAttempt = (event: MouseEvent) => {
        if (!seekProtectionEnabled) return;

        const progressBar = (event.target as Element)?.closest("#progress-bar");
        if (!progressBar) return;

        const { video, duration } = getVideoInfo();
        if (!video || !duration || duration <= 0) return;

        const targetPosition = calculateSeekPosition(event, progressBar);
        if (targetPosition === null) return;

        const safeZoneStart = duration - PROTECTED_ZONE_SECONDS;

        // If song is shorter than protection zone, block ALL seeking
        if (duration <= PROTECTED_ZONE_SECONDS) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            window.dispatchEvent(new CustomEvent("HORIS_SEEK_BLOCKED", {
                detail: { reason: "Song too short", duration, targetPosition }
            }));
            return;
        }

        // If trying to seek into the protected zone
        if (targetPosition > safeZoneStart) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            // Snap to the edge of the safe zone
            video.currentTime = safeZoneStart;

            window.dispatchEvent(new CustomEvent("HORIS_SEEK_BLOCKED", {
                detail: {
                    reason: "protected_zone",
                    duration,
                    targetPosition,
                    snappedTo: safeZoneStart
                }
            }));
        }
    };

    // Attach listeners to the progress bar (capturing phase to intercept before YTM handlers)
    const attachSeekProtection = () => {
        const progressBar = document.querySelector("#progress-bar");
        if (!progressBar) {
            // Retry if not found yet
            setTimeout(attachSeekProtection, 2000);
            return;
        }

        // Use capturing phase to intercept events before YouTube Music handles them
        progressBar.addEventListener("mousedown", handleSeekAttempt as EventListener, { capture: true });
        progressBar.addEventListener("click", handleSeekAttempt as EventListener, { capture: true });
    };

    // Wait for DOM to be ready
    setTimeout(attachSeekProtection, 1500);
})();
