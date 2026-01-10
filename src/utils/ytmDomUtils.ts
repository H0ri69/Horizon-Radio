/**
 * YouTube Music DOM Utilities
 * 
 * These functions directly manipulate the YouTube Music DOM to perform actions.
 * This is an alternative/fallback to the API-based approach in ytmApiService.
 * 
 * Note: These rely on YTM's current DOM structure and may break if Google
 * updates the UI. Use with appropriate error handling.
 */

import { logger } from "./Logger";

/** Delay helper for async operations */
const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

/**
 * Searches YouTube Music by programmatically interacting with the search box.
 * 
 * This function:
 * 1. Finds the search box component (handles Shadow DOM)
 * 2. Focuses and sets the search query
 * 3. Dispatches input and keyboard events to trigger the search
 * 
 * @param queryText - The search query to enter
 * @returns true if search was submitted successfully, false otherwise
 */
export function searchYtMusic(queryText: string): boolean {
    if (!queryText || queryText.trim() === "") {
        logger.error("[ytmDomUtils] Search query is empty.");
        return false;
    }

    try {
        // 1. Find the search box component
        const searchBox = document.querySelector('ytmusic-search-box');
        if (!searchBox) {
            logger.error("[ytmDomUtils] YT Music search box not found");
            return false;
        }

        // 2. Find the input field (handles both Shadow DOM and Shady DOM modes)
        const searchRoot = searchBox.shadowRoot ?? searchBox;
        const input = searchRoot.querySelector('input#input') as HTMLInputElement | null;
        if (!input) {
            logger.error("[ytmDomUtils] Search input field not found inside search box");
            return false;
        }

        // 3. Focus and set value
        input.click(); // Ensure it expands if collapsed
        input.focus();
        input.value = queryText;

        // 4. Dispatch 'input' event to notify the internal logic that text has changed
        input.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
        }));

        // 5. Dispatch 'Enter' key events (full sequence for maximum compatibility)
        const enterEventParams: KeyboardEventInit = {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        };

        input.dispatchEvent(new KeyboardEvent('keydown', enterEventParams));
        input.dispatchEvent(new KeyboardEvent('keypress', enterEventParams));
        input.dispatchEvent(new KeyboardEvent('keyup', enterEventParams));

        logger.debug(`[ytmDomUtils] Submitted search for: "${queryText}"`);
        return true;
    } catch (e) {
        logger.error("[ytmDomUtils] Unexpected error during search:", e);
        return false;
    }
}

/**
 * Clicks "Play Next" on the first song in search results.
 * 
 * This function:
 * 1. Finds the first song in search results
 * 2. Hovers over it to trigger the menu button to appear
 * 3. Opens the action menu
 * 4. Finds and clicks the "Play Next" option
 * 
 * Supports multiple languages (English, Czech, German, etc.).
 * 
 * @returns true if action was successful, false otherwise
 */
export async function playFirstResultNext(): Promise<boolean> {
    logger.debug("[ytmDomUtils] Starting 'Play Next' sequence...");

    try {
        // 1. Find the first song in the list
        const firstSong = document.querySelector('ytmusic-responsive-list-item-renderer');
        if (!firstSong) {
            logger.error("[ytmDomUtils] No songs found in the results!");
            return false;
        }

        // 2. Trigger hover (crucial - the menu button is often lazy-loaded/hidden until hover)
        firstSong.dispatchEvent(new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true
        }));

        // Small delay to let the UI react to the hover
        await delay(200);

        // 3. Find the "Action Menu" button (three dots)
        const menuButton = firstSong.querySelector('ytmusic-menu-renderer button') as HTMLButtonElement | null ??
                           firstSong.querySelector('ytmusic-menu-renderer yt-icon-button') as HTMLElement | null;

        if (!menuButton) {
            logger.error("[ytmDomUtils] Could not find the menu button on the first song instance.");
            return false;
        }

        logger.debug("[ytmDomUtils] Clicking menu button...");
        menuButton.click();

        // 4. Wait for the popup menu to appear (it's attached to body, not the song row)
        await delay(500);

        // 5. Find the "Play Next" option (supports multiple languages)
        const menuItems = Array.from(
            document.querySelectorAll('ytmusic-menu-service-item-renderer, ytmusic-menu-navigation-item-renderer')
        );

        if (menuItems.length === 0) {
             logger.warn("[ytmDomUtils] Menu opened but found no items. The popup might not have rendered in time.");
        }

        const playNextLocalizations = [
            'play next',           // English
            'přehrát jako další',  // Czech
            'hören als nächstes',  // German
            'jouer ensuite',       // French
            'reproducir a continuación', // Spanish
        ];

        const playNextOption = menuItems.find(item => {
            const text = item.textContent?.trim().toLowerCase() ?? '';
            return playNextLocalizations.some(localized => text.includes(localized));
        });

        if (playNextOption) {
            logger.debug("[ytmDomUtils] Found 'Play Next' option. Clicking...");
            (playNextOption as HTMLElement).click();
            logger.debug("[ytmDomUtils] Success! Song queued.");
            return true;
        } else {
            logger.error("[ytmDomUtils] Could not find 'Play Next' option in the menu.");
            logger.debug(
                "[ytmDomUtils] Available options were:",
                menuItems.map(i => i.textContent?.trim() || "Empty")
            );
            return false;
        }
    } catch (e) {
        logger.error("[ytmDomUtils] Unexpected error in 'Play Next' sequence:", e);
        return false;
    }
}

/**
 * Convenience function to search for a song and queue the first result.
 * Combines searchYtMusic and playFirstResultNext with appropriate delays.
 * 
 * @param query - The search query
 * @param waitForResults - Time (ms) to wait for search results to load. Default: 2000
 * @returns true if both search and queue actions succeeded
 */
export async function searchAndPlayNext(query: string, waitForResults = 2000): Promise<boolean> {
    try {
        const searchSuccess = searchYtMusic(query);
        if (!searchSuccess) {
            return false;
        }

        // Wait for search results to load
        await delay(waitForResults);

        return await playFirstResultNext();
    } catch (e) {
        logger.error("[ytmDomUtils] Error in combined searchAndPlayNext sequence:", e);
        return false;
    }
}

/** SVG path used by the player toggle button (same for both UP and DOWN states) */
const PLAYER_TOGGLE_PATH = "M4.135 7a1 1 0 00-.768 1.64L12 19l8.633-10.36A1 1 0 0019.865 7H4.135Z";

/**
 * Ensures the YouTube Music player is in its maximized (expanded) state.
 * 
 * This function checks if the player is currently minimized and clicks
 * the toggle button to expand it if necessary.
 * 
 * @returns true if player is now maximized (or was already), false if toggle failed
 */
export function ensurePlayerMaximized(): boolean {
    try {
        // 1. Check current state via the player-page-open attribute
        const playerPage = document.querySelector('ytmusic-player-page');
        const isMaximized = playerPage?.hasAttribute('player-page-open') ?? false;

        if (isMaximized) {
            logger.debug("[ytmDomUtils] Player is already maximized. No action needed.");
            return true;
        }

        logger.debug("[ytmDomUtils] Player is minimized. Expanding now...");

        // 2. Find the toggle button by matching its SVG path
        // This is more robust than class names which can change
        const allPaths = Array.from(document.querySelectorAll('path'));
        const togglePath = allPaths.find(p =>
            p.getAttribute('d') === PLAYER_TOGGLE_PATH &&
            p.closest('.toggle-player-page-button')
        );

        const toggleButton = togglePath?.closest('.toggle-player-page-button') as HTMLElement | null;

        if (toggleButton) {
            toggleButton.click();
            logger.debug("[ytmDomUtils] Player expanded.");
            return true;
        } else {
            logger.error("[ytmDomUtils] Could not find the player toggle button.");
            return false;
        }
    } catch (e) {
        logger.error("[ytmDomUtils] Unexpected error in ensurePlayerMaximized:", e);
        return false;
    }
}
