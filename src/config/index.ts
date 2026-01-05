import { AppSettings, DJStyle } from '../../types';
export * from './constants';
export * from './prompts';

export const AUDIO_CONFIG = {
  FADE_DURATION: 10000, // 10 seconds
  DJ_DELAY: 5000,      // 5 seconds
  LOOKAHEAD_DELAY: 100, // 0.1 seconds
  FFT_SIZE: 2048,
  SMOOTHING_CONSTANT: 0.85,
  SAMPLE_RATE: 24000,
  VISUALIZER_TRANSITION_DURATION: 1200, // 1.2s
};

export const GEMINI_CONFIG = {
  TEXT_MODEL: "gemini-2.5-flash",
  TTS_MODEL: "gemini-2.5-flash-preview-tts",
  LIVE_MODEL: "gemini-2.5-flash-native-audio-preview-09-2025",
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
};

export const EXTENSION_CONFIG = {
  MAX_HISTORY: 5
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'CYBER',
  palette: 'NEON',
  djVoice: 'Charon', 
  djStyle: DJStyle.STANDARD,
  customStylePrompt: '',
  djFrequency: 0.8,
  language: 'en'
};

export const LIVE_SESSION_CONFIG = {
  SILENCE_TIMEOUT: 10000,
  RMS_THRESHOLD: 0.02
};
