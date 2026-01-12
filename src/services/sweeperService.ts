/**
 * Sweeper Service
 * Handles loading and playing pre-recorded sweeper audio files
 */

import browser from 'webextension-polyfill';
import type { AppLanguage } from '../types';
import { SCHEDULER } from '../config/scheduler';
import { logger } from '../utils/Logger';

const log = logger.withContext('Sweeper');

// =============================================================================
// SWEEPER ASSET REGISTRY
// =============================================================================

/**
 * Sweeper files by language
 * These are populated at build time via Vite's import.meta.glob
 * 
 * The actual paths are resolved using chrome.runtime.getURL()
 */
const SWEEPER_PATHS: Record<AppLanguage, string[]> = {
  en: [],
  cs: [],
  ja: [],
};

let sweeperPathsInitialized = false;

/**
 * Initialize sweeper paths by scanning the assets directory
 * This uses Vite's glob import to discover files at build time
 */
export function initializeSweeperPaths(): void {
  if (sweeperPathsInitialized) return;

  // Use Vite's import.meta.glob to get all sweeper files at build time
  // This creates a map of file paths at compile time
  const sweeperModules = import.meta.glob('/src/assets/sweepers/**/*.mp3', {
    eager: true,
    query: '?url',
    import: 'default'
  });

  // Parse the paths and organize by language
  for (const [path, url] of Object.entries(sweeperModules)) {
    // Path format: /src/assets/sweepers/{lang}/{filename}.mp3
    const match = path.match(/\/src\/assets\/sweepers\/(\w+)\//);
    if (match) {
      const lang = match[1] as AppLanguage;
      if (lang in SWEEPER_PATHS) {
        // IMPORTANT: Resolve relative build path to absolute extension URL
        const absoluteUrl = browser.runtime.getURL(url as string);
        SWEEPER_PATHS[lang].push(absoluteUrl);
      }
    }
  }

  sweeperPathsInitialized = true;

  // Log discovery results
  for (const [lang, paths] of Object.entries(SWEEPER_PATHS)) {
    log.info(`Found ${paths.length} sweepers for language: ${lang}`);
  }
}

/**
 * Get available sweeper paths for a language
 * @throws Error if no sweepers are available for the language
 */
export function getSweeperPaths(language: AppLanguage): string[] {
  if (!sweeperPathsInitialized) {
    initializeSweeperPaths();
  }

  const paths = SWEEPER_PATHS[language];

  if (!paths || paths.length === 0) {
    throw new Error(`[Sweeper] No sweepers available for language: ${language}`);
  }

  return paths;
}

/**
 * Check if sweepers are available for a language (without throwing)
 */
export function hasSweeperPaths(language: AppLanguage): boolean {
  if (!sweeperPathsInitialized) {
    initializeSweeperPaths();
  }

  const paths = SWEEPER_PATHS[language];
  return paths && paths.length > 0;
}

// =============================================================================
// SWEEPER PLAYBACK
// =============================================================================

let currentSweeperAudio: HTMLAudioElement | null = null;

/**
 * Play a sweeper audio file
 * @param path - URL/path to the sweeper audio file
 * @param volume - Optional volume level (0.1-1.0, defaults to 1.0)
 * @returns Promise that resolves when playback completes
 */
export async function playSweeper(path: string, volume: number = 1.0): Promise<void> {
  return new Promise((resolve, reject) => {
    // Clean up any existing sweeper audio
    if (currentSweeperAudio) {
      currentSweeperAudio.pause();
      currentSweeperAudio.src = '';
      currentSweeperAudio = null;
    }

    const audio = new Audio(path);
    currentSweeperAudio = audio;

    audio.volume = volume;

    audio.onended = () => {
      currentSweeperAudio = null;
      resolve();
    };

    audio.onerror = (e) => {
      log.error('Playback error:', e);
      currentSweeperAudio = null;
      reject(new Error(`Failed to play sweeper: ${path}`));
    };

    audio.play().catch((e) => {
      log.error('Play failed:', e);
      currentSweeperAudio = null;
      reject(e);
    });
  });
}

/**
 * Stop any currently playing sweeper
 */
export function stopSweeper(): void {
  if (currentSweeperAudio) {
    currentSweeperAudio.pause();
    currentSweeperAudio.src = '';
    currentSweeperAudio = null;
  }
}

/**
 * Wait for a specified delay (used for gap between sweeper and DJ)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Play sweeper with the standard gap before DJ starts
 * @param path - URL/path to the sweeper audio file
 * @param volume - Optional volume level (0.1-1.0, defaults to 1.0)
 */
export async function playSweeperWithGap(path: string, volume: number = 1.0): Promise<void> {
  await playSweeper(path, volume);
  await delay(SCHEDULER.SWEEPER_GAP_MS);
}
