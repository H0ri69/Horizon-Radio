import browser from "webextension-polyfill";

/**
 * Sends a ping to wake up the background script.
 * In Firefox MV3, the background script is an "event page" that can be unloaded.
 * Sending a ping ensures it's loaded before sending the actual message.
 */
async function pingBackground(): Promise<boolean> {
    try {
        const response = await browser.runtime.sendMessage({ type: "PING" }) as { pong?: boolean } | undefined;
        return response?.pong === true;
    } catch {
        return false;
    }
}

/**
 * Sends a message to the background script with automatic retry on connection failures.
 * 
 * In Manifest V3, the background service worker/event page can become inactive and may not 
 * respond immediately. This utility:
 * 1. Sends a PING to wake up the background script
 * 2. Retries the message a few times with increasing delays
 * 
 * @param message The message to send to the background script
 * @param options Optional configuration for retry behavior
 * @returns The response from the background script
 * @throws Error if all retries are exhausted
 */
export async function sendMessageWithRetry<T = any>(
    message: any,
    options: {
        maxRetries?: number;
        retryDelayMs?: number;
        onRetry?: (attempt: number, error: Error) => void;
    } = {}
): Promise<T> {
    const { maxRetries = 3, retryDelayMs = 300, onRetry } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // On retry attempts, try to wake up the background script first
            if (attempt > 1) {
                await pingBackground();
                // Small delay after ping to let the background script fully initialize
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const response = await browser.runtime.sendMessage(message);
            return response as T;
        } catch (error: any) {
            lastError = error;

            // Check if this is a "receiving end does not exist" error
            // This happens when the service worker/event page is inactive
            const isConnectionError =
                error?.message?.includes("Could not establish connection") ||
                error?.message?.includes("Receiving end does not exist") ||
                error?.message?.includes("Extension context invalidated");

            if (!isConnectionError || attempt === maxRetries) {
                // Don't retry for non-connection errors or if we've exhausted retries
                throw error;
            }

            // Notify about retry if callback provided
            if (onRetry) {
                onRetry(attempt, error);
            }

            // Wait before retrying - use exponential backoff
            await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
        }
    }

    throw lastError || new Error("sendMessageWithRetry: Unknown error");
}
