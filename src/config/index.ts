import { AppSettings, DJStyle } from "../../types";
export * from "./prompts";
import { AppLanguage, DJVoice, VoiceProfile } from "../../types";

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
  djVoice: "Charon",
  djStyle: DJStyle.STANDARD,
  customStylePrompt: "",
  language: "en",
};

export const VOICE_PROFILES: VoiceProfile[] = [
  { id: "Charon", name: "Charon", gender: "Male", tone: "Deep/Pro", emotion: "Confidential" },
  { id: "Kore", name: "Kore", gender: "Female", tone: "Natural", emotion: "Balanced" },
  { id: "Puck", name: "Puck", gender: "Male", tone: "Playful", emotion: "Mischievous" },
  { id: "Fenrir", name: "Fenrir", gender: "Male", tone: "Intense", emotion: "Aggressive" },
  { id: "Zephyr", name: "Zephyr", gender: "Female", tone: "Gentle", emotion: "Breezy" },
];

// DJ Persona Names (for dialogue references in multi-DJ mode)
// Maps voice ID to persona name per language
export const DJ_PERSONA_NAMES: Record<DJVoice, Record<AppLanguage, string>> = {
  Charon: {
    en: "Dave",
    cs: "David",
    ja: "ミハエル",
  },
  Kore: {
    en: "Nataly",
    cs: "Natálie",
    ja: "さら",
  },
  Puck: {
    en: "Alex",
    cs: "Aleš",
    ja: "アレックス",
  },
  Fenrir: {
    en: "Jacob",
    cs: "Kuba",
    ja: "ビクター",
  },
  Zephyr: {
    en: "Laura",
    cs: "Laura",
    ja: "ゾーイ",
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
