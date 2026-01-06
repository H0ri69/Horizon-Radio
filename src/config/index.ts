import { AppSettings } from "../types";
export * from "./prompts";
import { AppLanguage, DJVoice, VoiceProfile } from "../types";

// DJ Style Configuration
export const DJStyle = {
  STANDARD: "Standard (Radio Host)",
  CHILL: "Late Night Radio (Chill)",
  TECHNICAL: "Music Nerd (Facts & Stats)",
  MINIMAL: "Minimal (Just Song Names)",
  CUSTOM: "Custom (User Defined)",
  DRUNK: "Drunk (Chaotic)",
} as const;

export type DJStyle = (typeof DJStyle)[keyof typeof DJStyle];

export const GEMINI_CONFIG = {
  TEXT_MODEL: "gemini-2.5-flash",
  TTS_MODEL: "gemini-2.5-flash-preview-tts",
  LIVE_MODEL: "gemini-2.5-flash-native-audio-preview-09-2025",
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
};

export const EXTENSION_CONFIG = {
  MAX_HISTORY: 7,
};

export const DEFAULT_SETTINGS: AppSettings = {
  djVoice: "sadachbia",
  djStyle: DJStyle.STANDARD,
  customStylePrompt: "",
  language: "en",
};

export const VOICE_PROFILES: VoiceProfile[] = [
  { id: "sadachbia", name: "Sadachiba", gender: "Male", tone: "Calm", emotion: "Composed" },
  { id: "sulafat", name: "Sulafat", gender: "Female", tone: "Soft", emotion: "Warm" },
  { id: "algenib", name: "Alegenib", gender: "Male", tone: "Energetic", emotion: "Bright" },
  { id: "zephyr", name: "Zephyr", gender: "Female", tone: "Gentle", emotion: "Breezy" },
  { id: "kore", name: "Kore", gender: "Female", tone: "Natural", emotion: "Balanced" },
  { id: "algieba", name: "Algeiba", gender: "Male", tone: "Deep", emotion: "Serious" },
];

// DJ Persona Names (for dialogue references in multi-DJ mode)
// Maps voice ID to persona name per language
export const DJ_PERSONA_NAMES: Record<DJVoice, Record<AppLanguage, string>> = {
  sadachbia: {
    en: "Sam",
    cs: "Samuel",
    ja: "サム",
  },
  sulafat: {
    en: "Sophie",
    cs: "Sofie",
    ja: "ソフィ",
  },
  algenib: {
    en: "Alex",
    cs: "Aleš",
    ja: "アレックス",
  },
  zephyr: {
    en: "Laura",
    cs: "Laura",
    ja: "ゾーイ",
  },
  kore: {
    en: "Nataly",
    cs: "Natálie",
    ja: "さら",
  },
  algieba: {
    en: "Arthur",
    cs: "Artur",
    ja: "アーサー",
  },
};

export const THEME_PALETTES = {
  NEON: {
    primary: "#ff2a6d",
    secondary: "#05d9e8",
    tertiary: "#00ff9f",
  },
  PASTEL: {
    primary: "#ffb7b2",
    secondary: "#a2e1db",
    tertiary: "#e2f0cb",
  },
  MIDNIGHT: {
    primary: "#7c4dff",
    secondary: "#448aff",
    tertiary: "#69f0ae",
  },
  GOLD: {
    primary: "#ffd700",
    secondary: "#c0c0c0",
    tertiary: "#ffffff",
  },
} as const;
