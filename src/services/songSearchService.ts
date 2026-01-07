export class SongSearchService {
    /**
     * Searches for songs using YouTube's suggestion API (public).
     * Note: This returns suggestions (strings), not full Song objects.
     * We will wrap them in mock Song objects.
     */
    static async search(query: string): Promise<any[]> {
        if (!query || query.length < 2) return [];

        try {
            const response: any = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    type: "SEARCH_SONGS",
                    data: { query }
                }, (response) => {
                    resolve(response);
                });
            });

            if (response.error) throw new Error(response.error);
            const data = response.data;

            if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
                const suggestions = data[1]; // Array of strings
                return suggestions.slice(0, 5).map((title: string, index: number) => ({
                    id: `search-res-${index}`,
                    title: title,
                    artist: "YouTube Music",
                    duration: 0,
                    file: new File([], "placeholder")
                }));
            }

            return [];
        } catch (e) {
            console.warn("[Hori-s] Search API failed, using fallback", e);
            return [
                {
                    id: 'manual-1',
                    title: query,
                    artist: "Search Result",
                    duration: 0,
                    file: new File([], 'placeholder')
                }
            ];
        }
    }
}
