import { HarmBlockThreshold, HarmCategory, SafetySetting } from "@google/genai";
import { AppSettings } from "../types";
export * from "./prompts";
import { AppLanguage, DJVoice, VoiceProfile } from "../types";

// DJ Style Configuration
export const DJStyle = {
  STANDARD: "Standard (Radio Host)",
  CHILL: "Late Night Radio (Chill)",
  TECHNICAL: "Music Nerd (Facts & Stats)",
  MINIMAL: "Minimal (Just Song Names)",
  ASMR: "ASMR (Whispering)",
  CUSTOM: "Custom (User Defined)",
  DRUNK: "Drunk (Chaotic)",
} as const;

export type DJStyle = (typeof DJStyle)[keyof typeof DJStyle];

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
    PRO: "gemini-2.0-flash-exp-native-audio-preview",
  }
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
  },
};

// Voice profiles with persona names - single source of truth
export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "sadachbia",
    personaNames: { en: "Sam", cs: "Samuel", ja: "サム" },
    gender: "Male",
    tags: ["Calm", "Composed", "sadachbia"],
  },
  {
    id: "sulafat",
    personaNames: { en: "Sophie", cs: "Sofie", ja: "ソフィ" },
    gender: "Female",
    tags: ["Soft", "Warm", "sulafat"],
  },
  {
    id: "algenib",
    personaNames: { en: "Alex", cs: "Aleš", ja: "アレックス" },
    gender: "Male",
    tags: ["Energetic", "Bright", "algenib"],
  },
  {
    id: "zephyr",
    personaNames: { en: "Laura", cs: "Laura", ja: "ゾーイ" },
    gender: "Female",
    tags: ["Gentle", "Breezy", "zephyr"],
  },
  {
    id: "kore",
    personaNames: { en: "Nataly", cs: "Natálie", ja: "さら" },
    gender: "Female",
    tags: ["Natural", "Balanced", "kore"],
  },
  {
    id: "algieba",
    personaNames: { en: "Arthur", cs: "Artur", ja: "アーサー" },
    gender: "Male",
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

export const lowestSafetySettings: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.OFF },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.OFF },
];
