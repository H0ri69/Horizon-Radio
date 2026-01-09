import browser from "webextension-polyfill";

class LoggerService {
    private isVerbose: boolean = false;

    constructor() {
        this.init();
    }

    private init() {
        // Initial load - handle case where browser.storage might not be ready in some contexts immediately
        if (typeof browser !== 'undefined' && browser.storage) {
            browser.storage.local.get("horisFmSettings").then((res) => {
                if (res && res.horisFmSettings) {
                    this.updateState(res.horisFmSettings);
                }
            }).catch(() => { });

            // Listen for changes
            browser.storage.onChanged.addListener((changes) => {
                if (changes.horisFmSettings) {
                    this.updateState(changes.horisFmSettings.newValue);
                }
            });
        }
    }

    private updateState(settings: any) {
        if (settings && settings.debug) {
            this.isVerbose = !!settings.debug.verboseLogging;
        } else {
            this.isVerbose = false;
        }
    }

    /**
     * Log a debug message. Only shows if verbose logging is enabled.
     */
    debug(message: string, ...args: any[]) {
        if (this.isVerbose) {
            console.log(message, ...args);
        }
    }

    /**
     * Standard log. Shows by default? 
     * The user wants to toggle logs "created to troubleshoot".
     * So I will use `debug` for those.
     */
    log(message: string, ...args: any[]) {
        // For general logs that aren't purely debug, we might still want to show them?
        // Or if they are chatty, hide them.
        // I'll assume 'log' is for standard info that isn't spammy, but 'debug' is for the verbose ones.
        console.log(message, ...args);
    }

    /**
     * Warn message. Only shows if verbose logging is enabled.
     */
    warn(message: string, ...args: any[]) {
        if (this.isVerbose) {
            console.warn(message, ...args);
        }
    }

    /**
     * Error message. Always shows.
     */
    error(message: string, ...args: any[]) {
        console.error(message, ...args);
    }
}

export const logger = new LoggerService();
