/**
 * Scheduler Service
 * Core logic for deciding what DJ segments and sweepers to play
 */

import type { AppLanguage } from '../types';
import {
  SCHEDULER,
  DEFAULT_SCHEDULER_STATE,
  DEFAULT_SCHEDULER_SETTINGS,
  LONG_INTRO_THEME_PROMPTS,
  type DJSegmentType,
  type LongIntroTheme,
  type TransitionPlan,
  type SchedulerState,
  type SchedulerSettings,
} from '../config/scheduler';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Weighted random selection from an array
 */
function weightedRandomPick<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  return items[items.length - 1];
}

/**
 * Pick a random index, avoiding recently used ones
 */
function pickRandomAvoidingRecent(
  totalCount: number,
  recentIndices: number[]
): number {
  const available = Array.from({ length: totalCount }, (_, i) => i)
    .filter(i => !recentIndices.includes(i));
  
  if (available.length === 0) {
    // All have been used recently, just pick random
    return Math.floor(Math.random() * totalCount);
  }
  
  return available[Math.floor(Math.random() * available.length)];
}

// =============================================================================
// SWEEPER DECISION
// =============================================================================

/**
 * Decide whether to play a sweeper and which one
 */
function decideSweeper(
  state: SchedulerState,
  sweeperPaths: string[],
  now: number,
  settings: SchedulerSettings
): { sweeper: string | null; sweeperIndex: number | null } {
  // Check cooldown
  const timeSinceLast = now - state.lastSweeperTime;
  const cooldownMs = settings.sweeperCooldownMin * 60 * 1000;
  if (timeSinceLast < cooldownMs) {
    return { sweeper: null, sweeperIndex: null };
  }
  
  // Check probability
  if (Math.random() > settings.sweeperProbability) {
    return { sweeper: null, sweeperIndex: null };
  }
  
  // No sweepers available
  if (sweeperPaths.length === 0) {
    console.error('[Scheduler] No sweepers available for language!');
    return { sweeper: null, sweeperIndex: null };
  }
  
  // Pick a sweeper avoiding recent ones
  const index = pickRandomAvoidingRecent(
    sweeperPaths.length,
    state.recentSweeperIndices
  );
  
  return { sweeper: sweeperPaths[index], sweeperIndex: index };
}

// =============================================================================
// SEGMENT DECISION
// =============================================================================

/**
 * Get available segment types based on cooldowns and constraints
 */
function getAvailableSegments(state: SchedulerState, now: number, settings: SchedulerSettings): DJSegmentType[] {
  const available: DJSegmentType[] = ['SHORT_INTRO', 'LONG_INTRO'];
  
  // Silence: only if we haven't had too many in a row
  if (state.consecutiveSilence < SCHEDULER.MAX_CONSECUTIVE_SILENCE) {
    available.push('SILENCE');
  }
  
  // Weather: check cooldown (use custom settings)
  const weatherCooldownMs = settings.weatherCooldownMin * 60 * 1000;
  if (now - state.lastWeatherTime >= weatherCooldownMs) {
    available.push('WEATHER');
  }
  
  // News: check cooldown (use custom settings)
  const newsCooldownMs = settings.newsCooldownMin * 60 * 1000;
  if (now - state.lastNewsTime >= newsCooldownMs) {
    available.push('NEWS');
  }
  
  // Force variety if too many short intros
  if (state.consecutiveShortIntros >= SCHEDULER.MAX_CONSECUTIVE_SHORT) {
    const idx = available.indexOf('SHORT_INTRO');
    if (idx !== -1) available.splice(idx, 1);
  }
  
  return available;
}

/**
 * Get weights for available segments using custom settings
 */
function getSegmentWeights(available: DJSegmentType[], settings: SchedulerSettings): number[] {
  const weightMap: Record<DJSegmentType, number> = {
    SHORT_INTRO: settings.shortIntroWeight,
    LONG_INTRO: settings.longIntroWeight,
    SILENCE: settings.silenceWeight,
    WEATHER: settings.weatherWeight,
    NEWS: settings.newsWeight,
  };
  return available.map(seg => weightMap[seg] || 1);
}

/**
 * Decide which segment type to generate
 */
function decideSegment(
  state: SchedulerState,
  now: number,
  settings: SchedulerSettings
): { segment: DJSegmentType; longTheme?: LongIntroTheme } {
  const available = getAvailableSegments(state, now, settings);
  const weights = getSegmentWeights(available, settings);
  
  const segment = weightedRandomPick(available, weights);
  
  // If LONG_INTRO, also pick a theme
  if (segment === 'LONG_INTRO') {
    const themes: LongIntroTheme[] = ['JOKE', 'TRIVIA', 'QUEUE_PREVIEW', 'ARTIST_STORY'];
    const themeIndex = pickRandomAvoidingRecent(
      themes.length,
      state.recentLongThemes.map(t => themes.indexOf(t))
    );
    return { segment, longTheme: themes[themeIndex] };
  }
  
  return { segment };
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Decide the complete transition plan
 * 
 * @param state - Current scheduler state
 * @param sweeperPaths - Available sweeper paths for current language  
 * @param settings - Scheduler settings (uses defaults if not provided)
 * @returns TransitionPlan with sweeper and segment decisions
 */
export function decideTransition(
  state: SchedulerState,
  sweeperPaths: string[],
  settings: SchedulerSettings = DEFAULT_SCHEDULER_SETTINGS
): TransitionPlan {
  const now = Date.now();
  
  // Decision 1: Sweeper (independent)
  const { sweeper } = decideSweeper(state, sweeperPaths, now, settings);
  
  // Decision 2: Segment type
  const { segment, longTheme } = decideSegment(state, now, settings);
  
  return {
    sweeper,
    segment,
    longTheme,
  };
}

/**
 * Update scheduler state after a transition is executed
 * Returns a new state object (immutable update)
 */
export function updateStateAfterTransition(
  state: SchedulerState,
  plan: TransitionPlan,
  sweeperIndex: number | null
): SchedulerState {
  const now = Date.now();
  const newState = { ...state };
  
  // Update sweeper tracking
  if (plan.sweeper !== null && sweeperIndex !== null) {
    newState.lastSweeperTime = now;
    newState.recentSweeperIndices = [
      sweeperIndex,
      ...state.recentSweeperIndices
    ].slice(0, SCHEDULER.SWEEPER_HISTORY_SIZE);
  }
  
  // Update segment tracking
  switch (plan.segment) {
    case 'SILENCE':
      newState.consecutiveSilence = state.consecutiveSilence + 1;
      newState.consecutiveShortIntros = 0;
      break;
      
    case 'SHORT_INTRO':
      newState.consecutiveShortIntros = state.consecutiveShortIntros + 1;
      newState.consecutiveSilence = 0;
      break;
      
    case 'LONG_INTRO':
      newState.consecutiveShortIntros = 0;
      newState.consecutiveSilence = 0;
      if (plan.longTheme) {
        newState.recentLongThemes = [
          plan.longTheme,
          ...state.recentLongThemes
        ].slice(0, SCHEDULER.THEME_HISTORY_SIZE);
      }
      break;
      
    case 'WEATHER':
      newState.lastWeatherTime = now;
      newState.consecutiveShortIntros = 0;
      newState.consecutiveSilence = 0;
      break;
      
    case 'NEWS':
      newState.lastNewsTime = now;
      newState.consecutiveShortIntros = 0;
      newState.consecutiveSilence = 0;
      break;
  }
  
  return newState;
}

/**
 * Get the prompt text for a long intro theme
 */
export function getLongThemePrompt(theme: LongIntroTheme): string {
  return LONG_INTRO_THEME_PROMPTS[theme];
}

/**
 * Create initial scheduler state
 */
export function createInitialState(): SchedulerState {
  return { ...DEFAULT_SCHEDULER_STATE };
}

/**
 * Log the scheduler configuration at startup
 */
export function logSchedulerConfig(settings: SchedulerSettings = DEFAULT_SCHEDULER_SETTINGS): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║             🎙️ SCHEDULER CONFIG DEFAULTS                      ║
╠═══════════════════════════════════════════════════════════════╣
║ SWEEPER                                                       ║
║   Probability: ${(settings.sweeperProbability * 100).toFixed(0)}%                                            
║   Cooldown: ${settings.sweeperCooldownMin} min                                            
║   Gap before DJ: ${SCHEDULER.SWEEPER_GAP_MS}ms                                       
╠═══════════════════════════════════════════════════════════════╣
║ SEGMENTS (Relative Weights)                                   ║
║   SHORT_INTRO: ${settings.shortIntroWeight}                                             
║   LONG_INTRO: ${settings.longIntroWeight}                                              
║   SILENCE: ${settings.silenceWeight}                                                
║   WEATHER: ${settings.weatherWeight} (${settings.weatherCooldownMin} min cooldown)                             
║   NEWS: ${settings.newsWeight} (${settings.newsCooldownMin} min cooldown)                                
╠═══════════════════════════════════════════════════════════════╣
║ LIMITS                                                        ║
║   Max consecutive SILENCE: ${SCHEDULER.MAX_CONSECUTIVE_SILENCE}                                  
║   Max consecutive SHORT_INTRO: ${SCHEDULER.MAX_CONSECUTIVE_SHORT}                               
╚═══════════════════════════════════════════════════════════════╝
  `);
}

/**
 * Debug helper: log the current scheduler decision
 */
export function logSchedulerDecision(plan: TransitionPlan, state?: SchedulerState): void {
  const parts: string[] = [];
  
  if (plan.sweeper) {
    const filename = plan.sweeper.split('/').pop() || plan.sweeper;
    parts.push(`🔊 Sweeper: ${filename}`);
  } else {
    parts.push('🔇 No sweeper');
  }
  
  parts.push(`📢 Segment: ${plan.segment}`);
  
  if (plan.longTheme) {
    parts.push(`🎯 Theme: ${plan.longTheme}`);
  }
  
  console.log(`[Scheduler] 📋 Decision: ${parts.join(' | ')}`);
  
  // If state provided, log additional context
  if (state) {
    const stateInfo: string[] = [];
    if (state.consecutiveShortIntros > 0) {
      stateInfo.push(`shortIntros: ${state.consecutiveShortIntros}`);
    }
    if (state.consecutiveSilence > 0) {
      stateInfo.push(`silence: ${state.consecutiveSilence}`);
    }
    if (stateInfo.length > 0) {
      console.log(`[Scheduler] 📊 State: ${stateInfo.join(', ')}`);
    }
  }
}

