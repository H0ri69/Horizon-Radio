import { AppSettings, DJStyle } from '../../types';
export * from './constants';
export * from './prompts';



export const GEMINI_CONFIG = {
  TEXT_MODEL: "gemini-2.5-flash",
  TTS_MODEL: "gemini-2.5-flash-preview-tts",
  LIVE_MODEL: "gemini-2.5-flash-native-audio-preview-09-2025",
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
};

export const EXTENSION_CONFIG = {
  MAX_HISTORY: 7
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'CYBER',
  palette: 'NEON',
  djVoice: 'Charon', 
  djStyle: DJStyle.STANDARD,
  customStylePrompt: '',
  djFrequency: 0.8,
  dualDjMode: false,
  secondaryDjVoice: 'Kore',
  language: 'en'
};


