/**
 * Scheduler Configuration
 * Centralized constants and types for DJ segment scheduling
 */

import type { AppLanguage } from '../types';

// =============================================================================
// SEGMENT TYPES
// =============================================================================

/**
 * DJ segment types - determines what content the DJ delivers
 */
export type DJSegmentType = 
  | 'SHORT_INTRO'   // Quick 1-2 sentence transition
  | 'LONG_INTRO'    // Theme-based longer segment
  | 'WEATHER'       // Weather report (time-gated)
  | 'NEWS'          // Comprehensive news segment (time-gated)
  | 'SILENCE';      // No DJ - let music breathe

/**
 * Themes for LONG_INTRO segments
 */
export type LongIntroTheme = 
  | 'JOKE'
  | 'TRIVIA'
  | 'QUEUE_PREVIEW'
  | 'ARTIST_STORY';

/**
 * The complete transition plan returned by the scheduler
 */
export interface TransitionPlan {
  sweeper: string | null;           // Path to sweeper audio, or null if no sweeper
  segment: DJSegmentType;           // What type of DJ segment
  longTheme?: LongIntroTheme;       // Only present if segment is LONG_INTRO
}

/**
 * User-editable scheduler settings
 * These can be customized in the settings UI
 */
export interface SchedulerSettings {
  // Sweeper settings
  sweeperProbability: number;      // 0-1 (0-100%)
  sweeperCooldownMin: number;      // minutes
  
  // Segment weights (relative)
  silenceWeight: number;           // 0-30
  shortIntroWeight: number;        // 10-80
  longIntroWeight: number;         // 10-60
  weatherWeight: number;           // 1-10
  newsWeight: number;              // 1-10
  
  // Time-gated cooldowns
  weatherCooldownMin: number;      // 30-180 minutes
  newsCooldownMin: number;         // 60-300 minutes
}

/**
 * Scheduler state - tracks recent activity for decision making
 */
export interface SchedulerState {
  // Sweeper tracking
  lastSweeperTime: number;
  recentSweeperIndices: number[];   // Last 2 sweeper indices to avoid repeats
  
  // DJ segment tracking
  lastWeatherTime: number;
  lastNewsTime: number;
  consecutiveShortIntros: number;
  consecutiveSilence: number;
  recentLongThemes: LongIntroTheme[];
}

// =============================================================================
// SCHEDULER CONSTANTS
// =============================================================================

export const SCHEDULER = {
  // --- Sweeper Settings ---
  /** Probability of playing a sweeper before DJ segment (0.0 - 1.0) */
  SWEEPER_PROBABILITY: 0.2,
  
  /** Minimum time between sweepers in ms (2 minutes) */
  SWEEPER_COOLDOWN: 2 * 60 * 1000,
  
  /** Gap in ms between sweeper end and DJ start */
  SWEEPER_GAP_MS: 200,
  
  /** Number of recent sweepers to track to avoid repeats */
  SWEEPER_HISTORY_SIZE: 2,

  // --- Silence Settings ---
  
  /** Force DJ after this many consecutive silent songs */
  MAX_CONSECUTIVE_SILENCE: 4,

  // --- Short Intro Settings ---
  /** Force variety after this many consecutive short intros */
  MAX_CONSECUTIVE_SHORT: 5,

  // --- Time-Gated Segment Cooldowns ---
  /** Minimum time between weather reports (1 hour) */
  WEATHER_COOLDOWN: 60 * 60 * 1000,
  
  /** Minimum time between news segments (2 hours) */
  NEWS_COOLDOWN: 2 * 60 * 60 * 1000,

  // --- Long Intro Theme Settings ---
  /** Number of recent themes to track to avoid repeats */
  THEME_HISTORY_SIZE: 2,

  // --- Segment Weights (relative, normalized internally) ---
  /** Base weights for segment selection when all are eligible */
  SEGMENT_BASE_WEIGHTS: {
    SHORT_INTRO: 50,
    LONG_INTRO: 30,
    SILENCE: 15,
    WEATHER: 5,
    NEWS: 3,
  } as Record<DJSegmentType, number>,
} as const;

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_SCHEDULER_STATE: SchedulerState = {
  lastSweeperTime: 0,
  recentSweeperIndices: [],
  lastWeatherTime: 0,
  lastNewsTime: 0,
  consecutiveShortIntros: 0,
  consecutiveSilence: 0,
  recentLongThemes: [],
};

export const DEFAULT_SCHEDULER_SETTINGS: SchedulerSettings = {
  // Sweeper settings (match current SCHEDULER constants)
  sweeperProbability: 0.2,           // 20%
  sweeperCooldownMin: 2,             // 2 minutes
  
  // Segment weights (match current SCHEDULER.SEGMENT_BASE_WEIGHTS)
  silenceWeight: 15,
  shortIntroWeight: 50,
  longIntroWeight: 30,
  weatherWeight: 5,
  newsWeight: 3,
  
  // Time-gated cooldowns (match current SCHEDULER cooldowns)
  weatherCooldownMin: 60,            // 1 hour
  newsCooldownMin: 120,              // 2 hours
};

// =============================================================================
// LONG INTRO THEME PROMPTS
// =============================================================================

export const LONG_INTRO_THEME_PROMPTS: Record<LongIntroTheme, string> = {
  JOKE: "Tell a short, music-related Joke that flows naturally into the next song.",
  TRIVIA: "Share a Trivium or Fun Fact about the artist or song - something interesting most listeners wouldn't know.",
  QUEUE_PREVIEW: "Preview what's coming up next in the queue. Mention the titles and artists of the next 2-3 songs using ONLY the playlist context provided ([UP NEXT +1], [UP NEXT +2], etc). Do NOT invent song titles.",
  ARTIST_STORY: "Spotlight a brief story about the Artist - their journey, an interesting moment in their career, or what makes them unique.",
};

// =============================================================================
// WEATHER & NEWS PROMPTS
// =============================================================================

export const WEATHER_PROMPT = (timezone: string) => 
  `Briefly mention current Weather for your listeners, referencing the local country of ${timezone}. USE GOOGLE SEARCH to get actual conditions. Interpret the timezone as a country, not a specific city. Deliver it naturally as a DJ update (e.g., 'A bit chilly here in the UK tonight...'). Use Celsius for temperatures unless location is in USA/Canada, then use Fahrenheit.`;

export const NEWS_PROMPT = (timezone: string) =>
  `Deliver a comprehensive news update for your listeners. USE GOOGLE SEARCH to find 2-3 current, relevant news stories from the country where ${timezone} is located. Cover different topics if possible (e.g., politics, culture, sports, or tech). Interpret the timezone as a country, not a specific city. Deliver each story briefly but informatively - this is a proper radio news segment, not just headlines. Transition naturally between stories and wrap up professionally.`;
