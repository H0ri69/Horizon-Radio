/**
 * Horizon Logger
 * 
 * A drop-in replacement for console.log with [Horizon] prefix and context support.
 * 
 * ## Basic Usage
 * ```typescript
 * import { logger } from '@/utils/Logger';
 * 
 * logger.log('App started');           // [22:30:15.3][Horizon] App started
 * logger.error('Failed to load', err); // [22:30:15.3][Horizon] Failed to load <error>
 * ```
 * 
 * ## Context Usage (Recommended for Modules/Services)
 * ```typescript
 * // At the top of your service/component file
 * import { logger } from '@/utils/Logger';
 * const log = logger.withContext('Scheduler');
 * 
 * // Later in the file
 * log.info('Decision made');    // [22:30:15.3][Horizon][Scheduler] Decision made
 * log.error('Failed', err);     // [22:30:15.3][Horizon][Scheduler] Failed <error>
 * ```
 * 
 * ## When to Use Context
 * - ✅ Services (e.g., 'Gemini', 'Scheduler', 'Sweeper')
 * - ✅ Background scripts (e.g., 'Background')
 * - ✅ Content scripts (e.g., 'Content')
 * - ✅ Complex components with significant logging
 * - ❌ Simple utility functions (just use `logger` directly)
 * - ❌ One-off debug statements (context adds unnecessary noise)
 * 
 * ## Nested Contexts (Advanced)
 * ```typescript
 * const log = logger.withContext('Background').withContext('API');
 * log.info('Request sent');  // [22:30:15.3][Horizon][Background][API] Request sent
 * ```
 */

const BASE_PREFIX = '[Horizon]';

/**
 * Get current timestamp in hh:mm:ss.m format (1 decimal for tenths of a second)
 */
function getTimestamp(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const tenths = Math.floor(now.getMilliseconds() / 100); // 0-9
    return `${hours}:${minutes}:${seconds}.${tenths}`;
}

class Logger {
    private contexts: string[] = [];

    /**
     * Create a new logger instance with an additional context.
     * This is the recommended way to namespace logs for modules/services.
     * 
     * @param context - The context name (e.g., 'Scheduler', 'Background', 'Gemini')
     * @returns A new Logger instance with the context added
     * 
     * @example
     * ```typescript
     * // In schedulerService.ts
     * const log = logger.withContext('Scheduler');
     * log.info('Planning transition');  // [22:30:15.3][Horizon][Scheduler] Planning transition
     * 
     * // In geminiService.ts
     * const log = logger.withContext('Gemini');
     * log.debug('Generating script');   // [22:30:15.3][Horizon][Gemini] Generating script
     * ```
     */
    withContext(context: string): Logger {
        const child = new Logger();
        child.contexts = [...this.contexts, context];
        return child;
    }

    /**
     * Build the styled prefix with %c directives for console styling
     * Returns both the formatted text and the corresponding CSS styles
     */
    private buildStyledPrefix(): { text: string; styles: string[] } {
        const grayStyle = 'color: #bfbfbf'; // Subtle gray for prefixes
        const resetStyle = ''; // Reset to default console color
        
        const timestamp = `%c[${getTimestamp()}]`;
        const horizonPrefix = `%c${BASE_PREFIX}`;
        const contextPrefixes = this.contexts.map(c => `%c[${c}]`).join('');
        const reset = '%c'; // Reset color for the actual message
        
        const text = timestamp + horizonPrefix + contextPrefixes + reset;
        
        // Each %c directive needs a corresponding CSS style
        const styles = [
            grayStyle, // timestamp
            grayStyle, // BASE_PREFIX
            ...this.contexts.map(() => grayStyle), // each context
            resetStyle // reset to default for message content
        ];
        
        return { text, styles };
    }

    /**
     * Log a standard message.
     * Returns a bound function so devtools shows the caller's location.
     */
    get log() {
        const { text, styles } = this.buildStyledPrefix();
        return console.log.bind(console, text, ...styles);
    }

    /**
     * Log a debug message.
     * Returns a bound function so devtools shows the caller's location.
     */
    get debug() {
        const { text, styles } = this.buildStyledPrefix();
        return console.debug.bind(console, text, ...styles);
    }

    /**
     * Log an info message.
     * Returns a bound function so devtools shows the caller's location.
     */
    get info() {
        const { text, styles } = this.buildStyledPrefix();
        return console.info.bind(console, text, ...styles);
    }

    /**
     * Log a warning message.
     * Returns a bound function so devtools shows the caller's location.
     */
    get warn() {
        const { text, styles } = this.buildStyledPrefix();
        return console.warn.bind(console, text, ...styles);
    }

    /**
     * Log an error message.
     * Returns a bound function so devtools shows the caller's location.
     */
    get error() {
        const { text, styles } = this.buildStyledPrefix();
        return console.error.bind(console, text, ...styles);
    }

    /**
     * Log a table (cannot use getter pattern due to signature)
     */
    table(data: any, columns?: string[]) {
        const { text, styles } = this.buildStyledPrefix();
        console.log(text, ...styles, 'Table:');
        console.table(data, columns);
    }

    /**
     * Start a timer (cannot use getter pattern - requires label storage)
     */
    time(label?: string) {
        // Note: console.time doesn't support %c styling, so we use plain text
        const plainPrefix = `[${getTimestamp()}]${BASE_PREFIX}${this.contexts.map(c => `[${c}]`).join('')}`;
        console.time(`${plainPrefix} ${label || 'Timer'}`);
    }

    /**
     * End a timer
     */
    timeEnd(label?: string) {
        const plainPrefix = `[${getTimestamp()}]${BASE_PREFIX}${this.contexts.map(c => `[${c}]`).join('')}`;
        console.timeEnd(`${plainPrefix} ${label || 'Timer'}`);
    }

    /**
     * Start a console group.
     * Returns a bound function so devtools shows the caller's location.
     */
    get group() {
        const { text, styles } = this.buildStyledPrefix();
        return console.group.bind(console, text, ...styles);
    }

    /**
     * Start a collapsed console group.
     * Returns a bound function so devtools shows the caller's location.
     */
    get groupCollapsed() {
        const { text, styles } = this.buildStyledPrefix();
        return console.groupCollapsed.bind(console, text, ...styles);
    }

    /**
     * End a console group
     */
    groupEnd() {
        console.groupEnd();
    }

    /**
     * Log a stack trace.
     * Returns a bound function so devtools shows the caller's location.
     */
    get trace() {
        const { text, styles } = this.buildStyledPrefix();
        return console.trace.bind(console, text, ...styles);
    }
}

/**
 * Global logger instance with [Horizon] prefix.
 * Use directly for simple logging, or create a contexted logger with `.withContext()`.
 * 
 * @example
 * ```typescript
 * // Simple usage
 * logger.log('Hello world');  // [22:30:15.3][Horizon] Hello world
 * 
 * // With context (recommended for modules)
 * const log = logger.withContext('MyModule');
 * log.info('Started');  // [22:30:15.3][Horizon][MyModule] Started
 * ```
 */
export const logger = new Logger();
