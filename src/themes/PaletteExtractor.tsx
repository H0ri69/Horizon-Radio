import { useEffect, useRef, useState } from "react";
import { Vibrant } from "node-vibrant/browser";
import Color from "colorjs.io";
import browser from "webextension-polyfill";

interface PaletteColor {
    hex: string;
    hsl: [number, number, number];
    oklch: [number, number, number];
}

interface PaletteState {
    LightVibrant: PaletteColor;
    Vibrant: PaletteColor;
    DarkVibrant: PaletteColor;
    LightMuted: PaletteColor;
    Muted: PaletteColor;
    DarkMuted: PaletteColor;
}

const defaultColor: PaletteColor = {
    hex: "#333333",
    hsl: [0, 0, 0.2],
    oklch: [0.3, 0.05, 0],
};

const defaultPalette: PaletteState = {
    LightVibrant: defaultColor,
    Vibrant: defaultColor,
    DarkVibrant: defaultColor,
    LightMuted: defaultColor,
    Muted: defaultColor,
    DarkMuted: defaultColor,
};

// Correct selector for the player bar thumbnail
const THUMBNAIL_SELECTOR = "ytmusic-player-bar img.image";

// Helper to validate image URL
function isValidImageUrl(src: string | undefined): boolean {
    if (!src) return false;
    if (src.includes("data:image/gif")) return false; // placeholder
    if (src === "https://music.youtube.com/") return false; // base URL error
    if (!src.startsWith("http")) return false;
    return true;
}

export function PaletteExtractor() {
    const [state, setState] = useState<{
        palette: PaletteState;
        sorted: PaletteColor[];
    }>({
        palette: defaultPalette,
        sorted: [defaultColor, defaultColor, defaultColor, defaultColor, defaultColor, defaultColor],
    });
    const { palette, sorted: sortedPalette } = state;
    const imgChangeObserver = useRef<MutationObserver | null>(null);
    const lastExtractedSrc = useRef<string>("");

    const verbose = useRef(false);

    useEffect(() => {
        // Load verbose setting
        browser.storage.local.get("horisFmSettings").then((result) => {
            const settings = result.horisFmSettings as any;
            if (settings?.debug?.verboseLogging) {
                verbose.current = true;
            }
        });

        const getPalette = async () => {
            try {
                const imgElement = document.querySelector(
                    THUMBNAIL_SELECTOR
                ) as HTMLImageElement | null;

                if (!imgElement) {
                    // console.log("[Palette] Image element not found");
                    return;
                }

                const imgSrc = imgElement.src;

                if (!isValidImageUrl(imgSrc)) {
                    if (verbose.current) console.log("[Palette] Invalid image URL:", imgSrc);
                    return;
                }

                // Skip if we already extracted from this image
                if (lastExtractedSrc.current === imgSrc) {
                    if (verbose.current) console.log("[Palette] Already extracted from this image");
                    return;
                }

                if (verbose.current) console.log("[Palette] Extracting colors from:", imgSrc);

                let targetSrc = imgSrc;
                try {
                    // Use background proxy to avoid CORS issues, especially in Firefox
                    const response = await browser.runtime.sendMessage({
                        type: "PROXY_FETCH_IMAGE",
                        data: { url: imgSrc }
                    }) as { dataUrl?: string; error?: string };

                    if (response && response.dataUrl) {
                        if (verbose.current) console.log("[Palette] Successfully proxied image via background");
                        targetSrc = response.dataUrl;
                    } else if (response && response.error) {
                        if (verbose.current) console.warn("[Palette] Proxy fetch failed:", response.error);
                    }
                } catch (proxyErr) {
                    console.error("[Palette] Failed to communicate with background proxy:", proxyErr);
                }

                const vibrantPalette = await Vibrant.from(targetSrc)
                    .quality(10)
                    .getPalette();

                if (!vibrantPalette) {
                    if (verbose.current) console.log("[Palette] No palette extracted");
                    return;
                }

                lastExtractedSrc.current = imgSrc;

                const toOklch = (hex: string): [number, number, number] => {
                    try {
                        const color = new Color(hex).to("oklch");
                        return color.coords.map((c) => Number(c) || 0) as [number, number, number];
                    } catch {
                        return [0.3, 0.05, 0];
                    }
                };

                const extractColor = (swatch: any): PaletteColor => {
                    if (!swatch) return defaultColor;
                    return {
                        hex: swatch.hex || "#333333",
                        hsl: swatch.hsl || [0, 0, 0.2],
                        oklch: toOklch(swatch.hex || "#333333"),
                    };
                };

                // Determine a fallback color (Dominant)
                const dominantSwatch = vibrantPalette.Vibrant || vibrantPalette.Muted || vibrantPalette.DarkVibrant || Object.values(vibrantPalette).find(s => s) || null;
                const fallbackColor = extractColor(dominantSwatch);

                const newPalette: PaletteState = {
                    LightVibrant: vibrantPalette.LightVibrant ? extractColor(vibrantPalette.LightVibrant) : fallbackColor,
                    Vibrant: vibrantPalette.Vibrant ? extractColor(vibrantPalette.Vibrant) : fallbackColor,
                    DarkVibrant: vibrantPalette.DarkVibrant ? extractColor(vibrantPalette.DarkVibrant) : fallbackColor,
                    LightMuted: vibrantPalette.LightMuted ? extractColor(vibrantPalette.LightMuted) : fallbackColor,
                    Muted: vibrantPalette.Muted ? extractColor(vibrantPalette.Muted) : fallbackColor,
                    DarkMuted: vibrantPalette.DarkMuted ? extractColor(vibrantPalette.DarkMuted) : fallbackColor,
                };

                // Sort by adjusted population for dominant color
                const sorted = [
                    { ...newPalette.Vibrant, pop: vibrantPalette.Vibrant?.population || 0 },
                    { ...newPalette.DarkVibrant, pop: vibrantPalette.DarkVibrant?.population || 0 },
                    { ...newPalette.LightVibrant, pop: (vibrantPalette.LightVibrant?.population || 0) * 0.5 },
                    { ...newPalette.Muted, pop: (vibrantPalette.Muted?.population || 0) * 0.1 },
                    { ...newPalette.LightMuted, pop: (vibrantPalette.LightMuted?.population || 0) * 0.04 },
                    { ...newPalette.DarkMuted, pop: (vibrantPalette.DarkMuted?.population || 0) * 0.04 },
                ]
                    .sort((a, b) => b.pop - a.pop)
                    .map(({ hex, hsl, oklch }) => ({ hex, hsl, oklch }));

                if (verbose.current) console.log("[Palette] Colors extracted:", newPalette.Vibrant.hex);
                setState({
                    palette: newPalette,
                    sorted
                });
            } catch (err) {
                console.error("[Palette] Error extracting colors:", err);
            }
        };

        // Initial extraction with delay
        const initialTimeout = setTimeout(getPalette, 1000);

        // Watch for song changes on the player bar image
        let debounceTimer: ReturnType<typeof setTimeout>;
        const setupObserver = () => {
            const imgElement = document.querySelector(THUMBNAIL_SELECTOR);

            if (imgElement) {
                imgChangeObserver.current = new MutationObserver((mutationList) => {
                    const mutation = mutationList[0];
                    if (mutation && mutation.attributeName === "src") {
                        const target = mutation.target as HTMLImageElement;
                        if (isValidImageUrl(target.src)) {
                            if (verbose.current) console.log("[Palette] Song image changed, debouncing extraction...");
                            clearTimeout(debounceTimer);
                            debounceTimer = setTimeout(getPalette, 400);
                        }
                    }
                });

                imgChangeObserver.current.observe(imgElement, {
                    attributeFilter: ["src"],
                    attributeOldValue: true,
                });
                if (verbose.current) console.log("[Palette] Observer attached to:", THUMBNAIL_SELECTOR);
            } else {
                // Retry if element not found yet
                // console.log("[Palette] Image not found, retrying...");
                setTimeout(setupObserver, 2000);
            }
        };

        setTimeout(setupObserver, 1500);

        return () => {
            clearTimeout(initialTimeout);
            if (imgChangeObserver.current) {
                imgChangeObserver.current.disconnect();
            }
        };
    }, []);

    const cssVars = `
    :root {
      --ts-palette-lightvibrant-hex: ${palette.LightVibrant.hex};
      --ts-palette-vibrant-hex: ${palette.Vibrant.hex};
      --ts-palette-darkvibrant-hex: ${palette.DarkVibrant.hex};
      --ts-palette-lightmuted-hex: ${palette.LightMuted.hex};
      --ts-palette-muted-hex: ${palette.Muted.hex};
      --ts-palette-darkmuted-hex: ${palette.DarkMuted.hex};

      --ts-palette-lightvibrant-hue: ${(palette.LightVibrant.hsl[0] * 360).toFixed()};
      --ts-palette-vibrant-hue: ${(palette.Vibrant.hsl[0] * 360).toFixed()};
      --ts-palette-darkvibrant-hue: ${(palette.DarkVibrant.hsl[0] * 360).toFixed()};
      --ts-palette-lightmuted-hue: ${(palette.LightMuted.hsl[0] * 360).toFixed()};
      --ts-palette-muted-hue: ${(palette.Muted.hsl[0] * 360).toFixed()};
      --ts-palette-darkmuted-hue: ${(palette.DarkMuted.hsl[0] * 360).toFixed()};

      --ts-palette-lightvibrant-saturation: ${(palette.LightVibrant.hsl[1] * 100).toFixed()}%;
      --ts-palette-vibrant-saturation: ${(palette.Vibrant.hsl[1] * 100).toFixed()}%;
      --ts-palette-darkvibrant-saturation: ${(palette.DarkVibrant.hsl[1] * 100).toFixed()}%;
      --ts-palette-lightmuted-saturation: ${(palette.LightMuted.hsl[1] * 100).toFixed()}%;
      --ts-palette-muted-saturation: ${(palette.Muted.hsl[1] * 100).toFixed()}%;
      --ts-palette-darkmuted-saturation: ${(palette.DarkMuted.hsl[1] * 100).toFixed()}%;

      --ts-palette-lightvibrant-light: ${(palette.LightVibrant.hsl[2] * 100).toFixed()}%;
      --ts-palette-vibrant-light: ${(palette.Vibrant.hsl[2] * 100).toFixed()}%;
      --ts-palette-darkvibrant-light: ${(palette.DarkVibrant.hsl[2] * 100).toFixed()}%;
      --ts-palette-lightmuted-light: ${(palette.LightMuted.hsl[2] * 100).toFixed()}%;
      --ts-palette-muted-light: ${(palette.Muted.hsl[2] * 100).toFixed()}%;
      --ts-palette-darkmuted-light: ${(palette.DarkMuted.hsl[2] * 100).toFixed()}%;

      --ts-palette-lightvibrant-l: ${palette.LightVibrant.oklch[0]};
      --ts-palette-vibrant-l: ${palette.Vibrant.oklch[0]};
      --ts-palette-darkvibrant-l: ${palette.DarkVibrant.oklch[0]};
      --ts-palette-lightmuted-l: ${palette.LightMuted.oklch[0]};
      --ts-palette-muted-l: ${palette.Muted.oklch[0]};
      --ts-palette-darkmuted-l: ${palette.DarkMuted.oklch[0]};

      --ts-palette-lightvibrant-c: ${palette.LightVibrant.oklch[1]};
      --ts-palette-vibrant-c: ${palette.Vibrant.oklch[1]};
      --ts-palette-darkvibrant-c: ${palette.DarkVibrant.oklch[1]};
      --ts-palette-lightmuted-c: ${palette.LightMuted.oklch[1]};
      --ts-palette-muted-c: ${palette.Muted.oklch[1]};
      --ts-palette-darkmuted-c: ${palette.DarkMuted.oklch[1]};

      --ts-palette-lightvibrant-h: ${palette.LightVibrant.oklch[2].toFixed(2)};
      --ts-palette-vibrant-h: ${palette.Vibrant.oklch[2].toFixed(2)};
      --ts-palette-darkvibrant-h: ${palette.DarkVibrant.oklch[2].toFixed(2)};
      --ts-palette-lightmuted-h: ${palette.LightMuted.oklch[2].toFixed(2)};
      --ts-palette-muted-h: ${palette.Muted.oklch[2].toFixed(2)};
      --ts-palette-darkmuted-h: ${palette.DarkMuted.oklch[2].toFixed(2)};

      --ts-palette-dominant-hex: ${sortedPalette[0]?.hex || "#333"};
      --ts-palette-dominant-l: ${sortedPalette[0]?.oklch[0]?.toFixed(3) || 0.3};
      --ts-palette-dominant-c: ${sortedPalette[0]?.oklch[1]?.toFixed(3) || 0.05};
      --ts-palette-dominant-h: ${(sortedPalette[0]?.oklch[2] || 0).toFixed(2)};

      --ts-palette-0-hex: ${sortedPalette[0]?.hex || "#333"};
      --ts-palette-0-l: ${sortedPalette[0]?.oklch[0]?.toFixed(3) || 0.3};
      --ts-palette-0-c: ${sortedPalette[0]?.oklch[1]?.toFixed(3) || 0.05};
      --ts-palette-0-h: ${(sortedPalette[0]?.oklch[2] || 0).toFixed(2)};
    }
  `;

    return <style id="horis-palette">{cssVars}</style>;
}
