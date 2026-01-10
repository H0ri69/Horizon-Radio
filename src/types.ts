// Import DJStyle type from config (type-only to avoid circular dependency)
import type { DJStyle } from "./config";
export type { DJStyle };

/**
 * Using string to allow flexibility, but typically matches VoiceProfile.id
 */
export type DJVoice = string;

export interface Song {
  id: string;
  title: string;
  artist: string;
  file: File;
  duration: number;
  cover?: string;
  album?: string;
  introBuffer?: ArrayBuffer;
  introSourceId?: string;
  introVoice?: DJVoice;
  introStyle?: DJStyle;
  introCustomPrompt?: string;
  requestedBy?: string;
  requestMessage?: string;
}

// Voice Configuration with Metadata for UI
export interface VoiceProfile {
  id: string;
  personaNames: {
    en: string;
    cs: string;
    ja: string;
  };
  gender: "Male" | "Female" | "Robot";
  geminiVoiceName: string;
  tags: string[];
}

// App Settings Types
export type AppLanguage = "en" | "cs" | "ja";

export type GeminiModelTier = "FLASH" | "PRO";

export interface AppSettings {
  djVoice: DJVoice;
  djStyle: DJStyle;
  customStylePrompt: string;
  language: AppLanguage;
  longMessageProbability: number;
  textModel: GeminiModelTier;
  ttsModel: GeminiModelTier;
  protectTransitions?: boolean; // Prevent seeking into last 15s of songs
  debug?: {
    enabledThemes: boolean[];      // 6 items, one per theme
    skipTTS: boolean;               // Skip audio generation (text only)
    forceTheme: number | null;      // Force specific theme index (null = random)
    verboseLogging: boolean;        // Detailed console logs
    triggerPoint: number;           // 0.1 to 0.9 (percentage of song)
    callHistoryLimit: number;       // Max callers to remember (1-15)
  };
}
