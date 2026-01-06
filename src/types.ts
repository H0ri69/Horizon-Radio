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
  tone: string;
  emotion: string;
}

// App Settings Types
export type AppLanguage = "en" | "cs" | "ja";

export interface AppSettings {
  djVoice: DJVoice;
  djStyle: DJStyle;
  customStylePrompt: string;
  language: AppLanguage;
}
