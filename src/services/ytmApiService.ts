
import { logger } from "../utils/Logger";

let ytmContext: any = null;

// Listen for the context event from the injected script
if (typeof window !== "undefined") {
    window.addEventListener("HORIS_YTM_CONTEXT", (event: any) => {
        if (event.detail) {
            ytmContext = event.detail;
            // logger.debug("[Hori-s] YTM Context received via EventBus");
        }
    });
}

export const YtmApiService = {
    async search(query: string) {
        if (!ytmContext) {
            // Try to wait a bit
            await new Promise(r => setTimeout(r, 1000));
            if (!ytmContext) {
                console.warn("[Hori-s] YTM Context missing for search");
                throw new Error("YTM Context missing");
            }
        }

        try {
            const body = {
                context: ytmContext.context,
                query: query,
                params: "EgWKAQIIAWoKEAMQAQ==" // Filter for "Songs" (protobuf encoded)
            };

            const response = await fetch(`https://music.youtube.com/youtubei/v1/search?key=${ytmContext.apiKey}&prettyPrint=false`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error("Search Network Error");

            const data = await response.json();
            return parseSearchResponse(data);
        } catch (e) {
            console.error("[Hori-s] YTM Search failed", e);
            throw e;
        }
    },

    playNext(videoId: string) {
        // Dispatch event for the injected script to handle
        // We must stringify the detail to pass it across the XRay wrapper boundary in Firefox/certain envs
        window.dispatchEvent(new CustomEvent("HORIS_CMD_PLAY_NEXT", { detail: JSON.stringify({ videoId }) }));
    }
};

function parseSearchResponse(data: any): any[] {
    const results: any[] = [];
    try {
        const sections = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
        if (!sections) return [];

        for (const section of sections) {
            const shelf = section.musicShelfRenderer;
            if (!shelf) continue;

            for (const item of shelf.contents) {
                const mrlir = item.musicResponsiveListItemRenderer;
                if (!mrlir) continue;

                // Extract Video ID
                // Try playlistItemData first (common in search results)
                let videoId = mrlir.playlistItemData?.videoId;
                // Fallback to nav endpoint
                if (!videoId) {
                    videoId = mrlir.doubleTapCommand?.watchEndpoint?.videoId;
                }
                // Fallback to menu items if needed (rare)

                if (!videoId) continue;

                // Extract Title
                const title = mrlir.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "Unknown";

                // Extract Artist
                // Artist is usually in the second column.
                // Format: "Artist" or "Artist • Album • Duration"
                const artistRuns = mrlir.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
                let artist = "Unknown";

                // Find the artist run. It's usually the first one, but sometimes there are "Explicit" badges or bullets.
                // We assume the first text run that isn't a separator is the artist.
                const artistRun = artistRuns.find((r: any) =>
                    r.text &&
                    r.text !== "•" &&
                    r.text.trim().length > 0 &&
                    !["Song", "Video", "Single", "EP", "Album"].includes(r.text)
                );
                if (artistRun) artist = artistRun.text;

                // Extract Cover
                const thumbnails = mrlir.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
                let cover = "";
                if (thumbnails && thumbnails.length > 0) {
                    // Get the largest one (usually last)
                    cover = thumbnails[thumbnails.length - 1].url;
                }

                results.push({
                    id: videoId,
                    title,
                    artist,
                    cover,
                    duration: 0
                });
            }
        }
    } catch (e) {
        console.warn("[Hori-s] Parse error in search", e);
    }
    return results;
}
