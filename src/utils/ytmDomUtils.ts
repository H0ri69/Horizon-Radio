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
 * Searches YouTube Music by navigating to the search URL.
 * 
 * This function uses direct URL navigation instead of keyboard event simulation,
 * which is more reliable across different browser/extension contexts.
 * 
 * NOTE: This causes a page reload! Do NOT use during live calls.
 * For live calls, use searchYtMusicInPlace() instead.
 * 
 * @param queryText - The search query to enter
 * @returns true if navigation was initiated successfully, false otherwise
 */
export function searchYtMusic(queryText: string): boolean {
    if (!queryText || queryText.trim() === "") {
        logger.error("[ytmDomUtils] Search query is empty.");
        return false;
    }

    try {
        const encodedQuery = encodeURIComponent(queryText.trim());
        const searchUrl = `https://music.youtube.com/search?q=${encodedQuery}`;

        logger.debug(`[ytmDomUtils] Navigating to search: "${queryText}"`);
        window.location.href = searchUrl;

        return true;
    } catch (e) {
        logger.error("[ytmDomUtils] Unexpected error during search:", e);
        return false;
    }
}

/**
 * Searches YouTube Music by programmatically interacting with the search box.
 * 
 * This function uses keyboard event simulation which does NOT cause page navigation.
 * Safe to use during live calls where page refresh would kill the session.
 * 
 * NOTE: This approach may be less reliable than URL navigation in some scenarios.
 * 
 * @param queryText - The search query to enter
 * @returns true if search was submitted successfully, false otherwise
 */
export function searchYtMusicInPlace(queryText: string): boolean {
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

        logger.debug(`[ytmDomUtils] Submitted in-place search for: "${queryText}"`);
        return true;
    } catch (e) {
        logger.error("[ytmDomUtils] Unexpected error during in-place search:", e);
        return false;
    }
}

/**
 * Clicks "Play Next" on the first song in search results.
 * 
 * This function handles two types of search result layouts:
 * 1. Featured "Top Result" card (ytmusic-card-shelf-renderer) - appears for popular searches
 * 2. Regular list items (ytmusic-responsive-list-item-renderer) - standard song results
 * 
 * The function:
 * 1. Finds the first song (prioritizing featured cards)
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
        // 1. Find the first song - check for featured card first, then fall back to list items
        // Featured cards appear at the top of search results for popular songs
        const featuredCard = document.querySelector('ytmusic-card-shelf-renderer');
        const listItem = document.querySelector('ytmusic-responsive-list-item-renderer');

        // Determine which element to use and how to find its menu button
        let targetElement: Element | null = null;
        let menuButton: HTMLElement | null = null;

        if (featuredCard) {
            logger.debug("[ytmDomUtils] Found featured 'Top Result' card, using it...");
            targetElement = featuredCard;

            // Featured cards have a different menu structure:
            // The menu button can be found via ytmusic-menu-renderer or directly via aria-label
            const menuRenderer = featuredCard.querySelector('ytmusic-menu-renderer');
            if (menuRenderer) {
                // Try multiple selectors for the menu button - YTM sometimes uses different structures
                menuButton = (menuRenderer.querySelector('button[aria-label="Action menu"]') ??
                    menuRenderer.querySelector('yt-button-shape button') ??
                    menuRenderer.querySelector('button') ??
                    menuRenderer.querySelector('yt-icon-button')) as HTMLElement | null;
            }
        } else if (listItem) {
            logger.debug("[ytmDomUtils] No featured card found, using first list item...");
            targetElement = listItem;

            // Standard list items - original logic
            menuButton = (listItem.querySelector('ytmusic-menu-renderer button') ??
                listItem.querySelector('ytmusic-menu-renderer yt-icon-button')) as HTMLElement | null;
        }

        if (!targetElement) {
            logger.error("[ytmDomUtils] No songs found in the results! Neither featured card nor list items present.");
            return false;
        }

        // 2. Trigger hover (crucial - the menu button is often lazy-loaded/hidden until hover)
        targetElement.dispatchEvent(new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true
        }));
        targetElement.dispatchEvent(new MouseEvent('mouseenter', {
            view: window,
            bubbles: true,
            cancelable: true
        }));

        // Small delay to let the UI react to the hover
        await delay(300);

        // Re-check for menu button after hover (it might be lazy-loaded)
        if (!menuButton && targetElement) {
            const menuRenderer = targetElement.querySelector('ytmusic-menu-renderer');
            if (menuRenderer) {
                menuButton = (menuRenderer.querySelector('button[aria-label="Action menu"]') ??
                    menuRenderer.querySelector('yt-button-shape button') ??
                    menuRenderer.querySelector('button') ??
                    menuRenderer.querySelector('yt-icon-button')) as HTMLElement | null;
            }
        }

        if (!menuButton) {
            logger.error("[ytmDomUtils] Could not find the menu button on the target element.");
            logger.debug("[ytmDomUtils] Target element HTML:", targetElement.outerHTML.substring(0, 500));
            return false;
        }

        logger.debug("[ytmDomUtils] Clicking menu button...");
        menuButton.click();

        // 4. Wait for the popup menu to appear (it's attached to body, not the song row)
        await delay(500);

        // 5. Find the "Play Next" option (supports multiple languages)
        // Look specifically within the popup menu that just opened
        const menuPopup = document.querySelector('ytmusic-menu-popup-renderer');
        const menuItems = Array.from(
            menuPopup?.querySelectorAll('ytmusic-menu-service-item-renderer, ytmusic-menu-navigation-item-renderer') ??
            document.querySelectorAll('ytmusic-menu-service-item-renderer, ytmusic-menu-navigation-item-renderer')
        );

        if (menuItems.length === 0) {
            logger.warn("[ytmDomUtils] Menu opened but found no items. The popup might not have rendered in time.");
        } else {
            logger.debug(`[ytmDomUtils] Found ${menuItems.length} menu items.`);
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
            // Close the menu by clicking elsewhere if we failed
            document.body.click();
            return false;
        }
    } catch (e) {
        logger.error("[ytmDomUtils] Unexpected error in 'Play Next' sequence:", e);
        return false;
    }
}

/**
 * Pending action interface for cross-page workflows.
 * Stored in chrome.storage and picked up by content script on page load.
 */
export interface PendingDomAction {
    type: 'PLAY_FIRST_RESULT_NEXT';
    query: string;
    timestamp: number;
}

/**
 * Storage key for pending DOM actions.
 */
export const PENDING_DOM_ACTION_KEY = 'horisPendingDomAction';

/**
 * Convenience function to search for a song and queue the first result.
 * 
 * This uses a cross-page workflow since URL navigation causes page reload:
 * 1. Stores a pending action in chrome.storage
 * 2. Navigates to the search results page
 * 3. Content script checks for pending actions on load and executes playFirstResultNext()
 * 
 * @param query - The search query
 * @returns true if navigation was initiated (actual queueing happens after page load)
 */
export async function searchAndPlayNext(query: string): Promise<boolean> {
    if (!query || query.trim() === "") {
        logger.error("[ytmDomUtils] Search query is empty.");
        return false;
    }

    try {
        // 1. Store the pending action
        const pendingAction: PendingDomAction = {
            type: 'PLAY_FIRST_RESULT_NEXT',
            query: query.trim(),
            timestamp: Date.now(),
        };

        await chrome.storage.local.set({ [PENDING_DOM_ACTION_KEY]: pendingAction });
        logger.debug(`[ytmDomUtils] Stored pending action for: "${query}"`);

        // 2. Navigate to search (this will reload the page)
        const searchSuccess = searchYtMusic(query);
        if (!searchSuccess) {
            // Clean up if navigation failed
            await chrome.storage.local.remove(PENDING_DOM_ACTION_KEY);
            return false;
        }

        // Note: Code after this won't execute because the page navigates away.
        // The content script will handle the pending action on the new page.
        return true;
    } catch (e) {
        logger.error("[ytmDomUtils] Error in searchAndPlayNext:", e);
        return false;
    }
}

/**
 * Search for a song and queue the first result WITHOUT page navigation.
 * 
 * This uses keyboard event simulation which doesn't reload the page.
 * SAFE TO USE DURING LIVE CALLS where page refresh would kill the session.
 * 
 * Note: This approach may be less reliable than URL navigation but is 
 * necessary when we can't afford to lose the current page state.
 * 
 * @param query - The search query
 * @param waitForResults - Time (ms) to wait for search results to load. Default: 2500
 * @returns true if song was successfully queued, false otherwise
 */
export async function searchAndPlayNextInPlace(query: string, waitForResults = 2500): Promise<boolean> {
    if (!query || query.trim() === "") {
        logger.error("[ytmDomUtils] Search query is empty.");
        return false;
    }

    try {
        logger.debug(`[ytmDomUtils] Starting in-place search for: "${query}"`);

        // 1. Use keyboard-based search (doesn't navigate)
        const searchSuccess = searchYtMusicInPlace(query);
        if (!searchSuccess) {
            return false;
        }

        // 2. Wait for search results to load
        await delay(waitForResults);

        // 3. Queue the first result
        return await playFirstResultNext();
    } catch (e) {
        logger.error("[ytmDomUtils] Error in searchAndPlayNextInPlace:", e);
        return false;
    }
}

/**
 * Clears any pending DOM action from storage.
 * Called after successfully executing a pending action.
 */
export async function clearPendingDomAction(): Promise<void> {
    await chrome.storage.local.remove(PENDING_DOM_ACTION_KEY);
    logger.debug("[ytmDomUtils] Cleared pending DOM action.");
}

/**
 * Retrieves and validates a pending DOM action.
 * Returns null if no action exists or if it's expired (older than 30 seconds).
 */
export async function getPendingDomAction(): Promise<PendingDomAction | null> {
    const result = await chrome.storage.local.get(PENDING_DOM_ACTION_KEY);
    const action = result[PENDING_DOM_ACTION_KEY] as PendingDomAction | undefined;

    if (!action) return null;

    // Expire actions older than 30 seconds (prevents stale actions from executing)
    const MAX_ACTION_AGE_MS = 30_000;
    if (Date.now() - action.timestamp > MAX_ACTION_AGE_MS) {
        logger.debug("[ytmDomUtils] Pending action expired, clearing.");
        await clearPendingDomAction();
        return null;
    }

    return action;
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
