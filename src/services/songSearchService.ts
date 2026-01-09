import { YtmApiService } from './ytmApiService';

export class SongSearchService {
    /**
     * Searches for songs using YTM Internal API via injected context.
     * Returns rich metadata including cover art and artist.
     */
    static async search(query: string): Promise<any[]> {
        if (!query || query.length < 2) return [];

        try {
            // Use local YTM API service (via injected context)
            const results = await YtmApiService.search(query);

            // Ensure compatibility with whatever Song interface CallModal expects
            return results.map(r => ({
                ...r,
                file: new File([], "placeholder")
            }));
        } catch (e) {
            console.warn("[Hori-s] YTM API search failed, falling back to basic result", e);
            return [
                {
                    id: 'manual-1',
                    title: query,
                    artist: "Search Result",
                    duration: 0,
                    cover: "",
                    file: new File([], 'placeholder')
                }
            ];
        }
    }
}
