/**
 * Horizon Logger
 * 
 * A drop-in replacement for console.log with [Horizon] prefix and context support.
 * 
 * ## Basic Usage
 * ```typescript
 * import { logger } from '@/utils/Logger';
 * 
 * logger.log('App started');           // [Horizon] App started
 * logger.error('Failed to load', err); // [Horizon] Failed to load <error>
 * ```
 * 
 * ## Context Usage (Recommended for Modules/Services)
 * ```typescript
 * // At the top of your service/component file
 * import { logger } from '@/utils/Logger';
 * const log = logger.withContext('Scheduler');
 * 
 * // Later in the file
 * log.info('Decision made');    // [Horizon][Scheduler] Decision made
 * log.error('Failed', err);     // [Horizon][Scheduler] Failed <error>
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
 * log.info('Request sent');  // [Horizon][Background][API] Request sent
 * ```
 */

const BASE_PREFIX = '[Horizon]';

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
     * log.info('Planning transition');  // [Horizon][Scheduler] Planning transition
     * 
     * // In geminiService.ts
     * const log = logger.withContext('Gemini');
     * log.debug('Generating script');   // [Horizon][Gemini] Generating script
     * ```
     */
    withContext(context: string): Logger {
        const child = new Logger();
        child.contexts = [...this.contexts, context];
        return child;
    }

    /**
     * Build the full prefix including all contexts
     */
    private buildPrefix(): string {
        if (this.contexts.length === 0) {
            return BASE_PREFIX;
        }
        return [BASE_PREFIX, ...this.contexts.map(c => `[${c}]`)].join(' ');
    }

    /**
     * Log a standard message
     */
    log(...args: any[]) {
        console.log(this.buildPrefix(), ...args);
    }

    /**
     * Log a debug message
     */
    debug(...args: any[]) {
        console.debug(this.buildPrefix(), ...args);
    }

    /**
     * Log an info message
     */
    info(...args: any[]) {
        console.info(this.buildPrefix(), ...args);
    }

    /**
     * Log a warning message
     */
    warn(...args: any[]) {
        console.warn(this.buildPrefix(), ...args);
    }

    /**
     * Log an error message
     */
    error(...args: any[]) {
        console.error(this.buildPrefix(), ...args);
    }

    /**
     * Log a table
     */
    table(data: any, columns?: string[]) {
        console.log(this.buildPrefix(), 'Table:');
        console.table(data, columns);
    }

    /**
     * Start a timer
     */
    time(label?: string) {
        console.time(`${this.buildPrefix()} ${label || 'Timer'}`);
    }

    /**
     * End a timer
     */
    timeEnd(label?: string) {
        console.timeEnd(`${this.buildPrefix()} ${label || 'Timer'}`);
    }

    /**
     * Start a console group
     */
    group(...args: any[]) {
        console.group(this.buildPrefix(), ...args);
    }

    /**
     * Start a collapsed console group
     */
    groupCollapsed(...args: any[]) {
        console.groupCollapsed(this.buildPrefix(), ...args);
    }

    /**
     * End a console group
     */
    groupEnd() {
        console.groupEnd();
    }

    /**
     * Log a stack trace
     */
    trace(...args: any[]) {
        console.trace(this.buildPrefix(), ...args);
    }
}

/**
 * Global logger instance with [Horizon] prefix.
 * Use directly for simple logging, or create a contexted logger with `.withContext()`.
 * 
 * @example
 * ```typescript
 * // Simple usage
 * logger.log('Hello world');  // [Horizon] Hello world
 * 
 * // With context (recommended for modules)
 * const log = logger.withContext('MyModule');
 * log.info('Started');  // [Horizon][MyModule] Started
 * ```
 */
export const logger = new Logger();
