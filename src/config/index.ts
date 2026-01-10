import { HarmBlockThreshold, HarmCategory, SafetySetting } from "@google/genai";
import { AppSettings } from "../types";
export * from "./constants";
export * from "./prompts";
export * from "./scheduler";
import { AppLanguage, DJVoice, VoiceProfile } from "../types";
import { COLORS, DJStyle } from "./constants";

export const GEMINI_CONFIG = {
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
};

export const EXTENSION_CONFIG = {
  MAX_HISTORY: 7,
};

export const MODEL_MAPPING = {
  TEXT: {
    FLASH: "gemini-2.5-flash",
    PRO: "gemini-2.5-pro",
  },
  TTS: {
    FLASH: "gemini-2.5-flash-preview-tts",
    PRO: "gemini-2.5-pro-preview-tts",
  },
  LIVE: {
    FLASH: "gemini-2.5-flash-native-audio-preview-12-2025",
    PRO: "gemini-2.5-flash-native-audio-preview-12-2025",
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  djVoice: "sadachbia",
  djStyle: DJStyle.STANDARD,
  customStylePrompt: "",
  language: "en",
  longMessageProbability: 0.3,
  textModel: "FLASH",
  ttsModel: "FLASH",
  debug: {
    enabledThemes: [true, true, true, true, true, true], // All themes enabled
    skipTTS: false,
    forceTheme: null, // Random selection
    verboseLogging: false,
    triggerPoint: 0.25, // 25% of song
    callHistoryLimit: 5, // Max callers to remember
  },
};

// Voice profiles with persona names - single source of truth
export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "sadachbia",
    personaNames: { en: "Petr Hudec", cs: "Petr Hudec", ja: "サム" },
    gender: "Male",
    geminiVoiceName: "sadachbia",
    tags: ["Calm", "Composed", "sadachbia"],
  },
  {
    id: "sulafat",
    personaNames: { en: "Sophie", cs: "Sofie", ja: "ソフィ" },
    gender: "Female",
    geminiVoiceName: "sulafat",
    tags: ["Soft", "Warm", "sulafat"],
  },
  {
    id: "algenib",
    personaNames: { en: "Alex", cs: "Aleš", ja: "アレックス" },
    gender: "Male",
    geminiVoiceName: "algenib",
    tags: ["Energetic", "Bright", "algenib"],
  },
  {
    id: "zephyr",
    personaNames: { en: "Laura", cs: "Laura", ja: "ゾーイ" },
    gender: "Female",
    geminiVoiceName: "zephyr",
    tags: ["Gentle", "Breezy", "zephyr"],
  },
  {
    id: "kore",
    personaNames: { en: "Nataly", cs: "Natálie", ja: "さら" },
    gender: "Female",
    geminiVoiceName: "kore",
    tags: ["Natural", "Balanced", "kore"],
  },
  {
    id: "algieba",
    personaNames: { en: "Arthur", cs: "Artur", ja: "アーサー" },
    gender: "Male",
    geminiVoiceName: "algieba",
    tags: ["Deep", "Serious", "algieba"],
  },
];

// DJ Persona Names - generated from VOICE_PROFILES
// Maps voice ID to persona name per language (for dialogue references in multi-DJ mode)
export const DJ_PERSONA_NAMES: Record<DJVoice, Record<AppLanguage, string>> = VOICE_PROFILES.reduce(
  (acc, profile) => {
    acc[profile.id] = profile.personaNames;
    return acc;
  },
  {} as Record<DJVoice, Record<AppLanguage, string>>
);

export const THEME_PALETTES = {
  NEON: {
    primary: COLORS.NEON.PRIMARY,
    secondary: COLORS.NEON.SECONDARY,
    tertiary: COLORS.NEON.TERTIARY,
  },
  PASTEL: {
    primary: COLORS.PASTEL.PRIMARY,
    secondary: COLORS.PASTEL.SECONDARY,
    tertiary: COLORS.PASTEL.TERTIARY,
  },
  MIDNIGHT: {
    primary: COLORS.MIDNIGHT.PRIMARY,
    secondary: COLORS.MIDNIGHT.SECONDARY,
    tertiary: COLORS.MIDNIGHT.TERTIARY,
  },
  GOLD: {
    primary: COLORS.GOLD.PRIMARY,
    secondary: COLORS.GOLD.SECONDARY,
    tertiary: COLORS.GOLD.TERTIARY,
  },
} as const;

export const lowestSafetySettings: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.OFF },
];
