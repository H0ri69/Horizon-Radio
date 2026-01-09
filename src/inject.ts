(function () {
    function broadcastContext() {
        try {
            if (window.ytcfg && window.ytcfg.data_) {
                window.dispatchEvent(new CustomEvent("HORIS_YTM_CONTEXT", {
                    detail: JSON.stringify({
                        apiKey: window.ytcfg.data_.INNERTUBE_API_KEY,
                        context: window.ytcfg.data_.INNERTUBE_CONTEXT,
                        clientVersion: window.ytcfg.data_.INNERTUBE_CLIENT_VERSION
                    })
                }));
            }
        } catch (e) { console.error("[Hori-s] Context broadcast failed", e); }
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
        } catch (err) { console.error("Parse error", err); }

        const videoId = data?.videoId;
        if (!videoId) return;

        console.log("[Hori-s] Requesting Play Next for:", videoId);

        try {
            // Method 1: Try accessing the Queue Service via DOM (Fragile)
            const queue: any = document.querySelector("ytmusic-player-queue");
            if (queue && queue.dispatch) {
                queue.dispatch({ type: "ADD", payload: videoId });
            } else {
                // Method 2: Navigation Fallback (Guaranteed to play)
                console.log("[Hori-s] Standard queue access failed. Switching to direct navigation.");
                window.location.href = "/watch?v=" + videoId;
            }
        } catch (err) {
            console.error("[Hori-s] Play action failed", err);
        }
    });
})();
