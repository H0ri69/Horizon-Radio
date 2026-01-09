
import { logger } from "../utils/Logger";

let ytmContext: any = null;

// Listen for the context event from the injected script
if (typeof window !== "undefined") {
    window.addEventListener("HORIS_YTM_CONTEXT", (event: any) => {
        if (event.detail) {
            let data = event.detail;
            try {
                if (typeof data === 'string') data = JSON.parse(data);
                ytmContext = data;
                // logger.debug("[Hori-s] YTM Context received and parsed");
            } catch (e) {
                console.error("[Hori-s] Failed to parse YTM context", e);
            }
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
        // 1. Find the content sections - handle multiple response types
        let sections = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents
            || data.contents?.sectionListRenderer?.contents
            || data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

        if (!sections) {
            // Try to find ANY sectionListRenderer in the tree
            const findSectionList = (obj: any): any => {
                if (!obj || typeof obj !== 'object') return null;
                if (obj.sectionListRenderer?.contents) return obj.sectionListRenderer.contents;
                for (const key in obj) {
                    const found: any = findSectionList(obj[key]);
                    if (found) return found;
                }
                return null;
            };
            sections = findSectionList(data);
        }

        if (!sections) return [];

        for (const section of sections) {
            // Find the shelf (musicShelfRenderer is typical for songs)
            let shelf = section.musicShelfRenderer;

            // Sometimes it's wrapped in an itemSectionRenderer
            if (!shelf && section.itemSectionRenderer?.contents) {
                shelf = section.itemSectionRenderer.contents.find((c: any) => c.musicShelfRenderer)?.musicShelfRenderer;
            }

            if (!shelf || !shelf.contents) continue;

            for (const item of shelf.contents) {
                const mrlir = item.musicResponsiveListItemRenderer;
                if (!mrlir) continue;

                // Extract Video ID
                let videoId = mrlir.playlistItemData?.videoId;
                if (!videoId) {
                    videoId = mrlir.navigationEndpoint?.watchEndpoint?.videoId ||
                        mrlir.doubleTapCommand?.watchEndpoint?.videoId;
                }

                if (!videoId) continue;

                // Extract Title
                const title = mrlir.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "Unknown";

                // Extract Artist & Album
                // Format is usually: "Song • Artist • Album • Duration" OR "Artist • Album"
                const artistRuns = mrlir.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];

                // Split runs by the bullet "•" separator to get segments
                const segments: any[][] = [[]];
                for (const run of artistRuns) {
                    if (run.text?.trim() === "•") {
                        segments.push([]);
                    } else {
                        segments[segments.length - 1].push(run);
                    }
                }

                // Filter out labels and empty segments
                const typeLabels = ["Song", "Video", "Single", "EP", "Album"];
                const cleanSegments = segments.filter(seg => {
                    if (seg.length === 0) return false;
                    const text = seg.map(r => r.text).join("").trim();
                    return !typeLabels.includes(text);
                });

                let artist = "Unknown Artist";
                let album = "";

                if (cleanSegments.length >= 1) {
                    // First non-label segment is the Artist
                    artist = cleanSegments[0].map(r => r.text).join("").trim();
                }

                if (cleanSegments.length >= 2) {
                    // Second non-label segment is usually the Album
                    album = cleanSegments[1].map(r => r.text).join("").trim();

                    // If the "album" segment looks like a duration (e.g. 3:45), it's not an album
                    if (/^\d+:\d+$/.test(album)) {
                        album = "";
                    }
                }

                // Extract Cover
                const thumbnails = mrlir.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
                let cover = "";
                if (thumbnails && thumbnails.length > 0) {
                    // Get a reasonably sized one (usually index 1 or 2 is good for list display)
                    // Or just the last one and ensure it's not too small
                    const bestThumb = thumbnails[thumbnails.length - 1];
                    cover = bestThumb.url;

                    // Rewrite URL to be higher quality if it's a standard YTM thumb
                    if (cover.includes("lh3.googleusercontent.com") || cover.includes("yt3.ggpht.com")) {
                        cover = cover.replace(/=w\d+-h\d+/, "=w120-h120");
                    }
                }

                results.push({
                    id: videoId,
                    title,
                    artist: artist.trim(),
                    album,
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
