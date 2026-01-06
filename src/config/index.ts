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

// Voice profiles with persona names - single source of truth
export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "sadachbia",
    personaNames: { en: "Sam", cs: "Samuel", ja: "サム" },
    gender: "Male",
    tone: "Calm",
    emotion: "Composed",
  },
  {
    id: "sulafat",
    personaNames: { en: "Sophie", cs: "Sofie", ja: "ソフィ" },
    gender: "Female",
    tone: "Soft",
    emotion: "Warm",
  },
  {
    id: "algenib",
    personaNames: { en: "Alex", cs: "Aleš", ja: "アレックス" },
    gender: "Male",
    tone: "Energetic",
    emotion: "Bright",
  },
  {
    id: "zephyr",
    personaNames: { en: "Laura", cs: "Laura", ja: "ゾーイ" },
    gender: "Female",
    tone: "Gentle",
    emotion: "Breezy",
  },
  {
    id: "kore",
    personaNames: { en: "Nataly", cs: "Natálie", ja: "さら" },
    gender: "Female",
    tone: "Natural",
    emotion: "Balanced",
  },
  {
    id: "algieba",
    personaNames: { en: "Arthur", cs: "Artur", ja: "アーサー" },
    gender: "Male",
    tone: "Deep",
    emotion: "Serious",
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