import { logger } from "./utils/Logger";

const log = logger.withContext('Inject');


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

        log.log("Requesting Play Next for:", videoId);

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
})();
