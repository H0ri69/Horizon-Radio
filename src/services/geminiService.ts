import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { Song, DJVoice, AppLanguage } from "../types";
import {
  GEMINI_CONFIG,
  DJ_STYLE_PROMPTS,
  DJ_STYLE_TTS_SYSTEM_PROMPTS,
  getLanguageInstruction,
  LENGTH_CONSTRAINT,
  DJ_PERSONA_NAMES,
  TTS_DUAL_DJ_DIRECTION,
  DEFAULT_DJ_STYLE,
  DJStyle,
  getMarkupTagGuidance,
  lowestSafetySettings,
  MODEL_MAPPING,
  TIMING,
  AUDIO,
  VOICE_PROFILES,
  LONG_MESSAGE_THEMES,
  SHORT_MESSAGE_INSTRUCTION,
  generateDjIntroPrompt
} from "../config";
import { GeminiModelTier } from "../types";

const DEFAULT_TEXT_MODEL = MODEL_MAPPING.TEXT.FLASH;
const DEFAULT_TTS_MODEL = MODEL_MAPPING.TTS.FLASH;

// LONG_MESSAGE_THEMES moved to src/config/prompts.ts
// SHORT_MESSAGE_INSTRUCTION moved to src/config/prompts.ts

interface GeminiErrorResponse {
  status?: number;
  code?: number;
  message?: string;
}

interface AudioResponseData {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
        };
      }>;
    };
  }>;
}

interface SpeechConfig {
  multiSpeakerVoiceConfig?: {
    speakerVoiceConfigs: Array<{
      speaker: string;
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: string };
      };
    }>;
  };
  voiceConfig?: {
    prebuiltVoiceConfig: { voiceName: string };
  };
}

const getClient = async () => {
  const apiKey = await new Promise<string>((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["horisFmSettings"], (result) => {
        const settings = result.horisFmSettings as { apiKey?: string } | undefined;
        resolve(settings?.apiKey || process.env.API_KEY || "");
      });
    } else {
      resolve(process.env.API_KEY || "");
    }
  });

  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error("Invalid API Key. Please configure it in the Hori-s.FM extension settings.");
  }
  return new GoogleGenAI({ apiKey });
};

const writeString = (view: DataView, offset: number, str: string): void => {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
};

const createWavHeader = (dataLength: number, sampleRate: number = AUDIO.SAMPLE_RATE_OUTPUT): ArrayBuffer => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);
  return buffer;
};

const concatenateBuffers = (buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

const processAudioResponse = (response: AudioResponseData): ArrayBuffer | null => {
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) return null;
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const pcmData = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    pcmData[i] = binaryString.charCodeAt(i);
  }
  const header = createWavHeader(pcmData.length);
  return concatenateBuffers(header, pcmData.buffer);
};

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = GEMINI_CONFIG.RETRY_COUNT,
  delay = GEMINI_CONFIG.RETRY_DELAY,
  attempt = 1
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const error = e as GeminiErrorResponse;
    const isRetryable =
      error.status === 429 ||
      error.code === 429 ||
      error.status === 500 ||
      error.code === 500 ||
      error.status === 503 ||
      error.code === 503 ||
      (error.message &&
        (error.message.includes("429") ||
          error.message.includes("quota") ||
          error.message.includes("500") ||
          error.message.includes("503") ||
          error.message.includes("INTERNAL")));

    if (retries > 0 && isRetryable) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2, attempt + 1);
    }
    throw error;
  }
}

const cleanTextForTTS = (text: string, partialClean: boolean = false): string => {
  if (!text) return "";
  let cleaned = text.replace(/\*.*?\*/g, "").replace(/\(.*?\)/g, "");
  if (!partialClean) {
    cleaned = cleaned.replace(/["]+/g, "").replace(/[:;]/g, ",");
  }
  return cleaned.trim();
};

const generateScript = async (prompt: string, modelOverride?: string): Promise<string | null> => {
  try {
    const ai = await getClient();
    const modelName = modelOverride || DEFAULT_TEXT_MODEL;
    const isProModel = modelName.includes("-pro");
    const response: GenerateContentResponse = await callWithRetry(() =>
      ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          thinkingConfig: { thinkingBudget: isProModel ? 1024 : 0 },
          safetySettings: lowestSafetySettings,
          tools: [{ googleSearch: {} }],
        },
      })
    );
    return response.text || null;
  } catch (e) {
    console.error("[Hori-s] Script generation failed", e);
    return null;
  }
};

const speakText = async (
  text: string,
  voice: DJVoice,
  secondaryVoice?: DJVoice,
  personaNameA?: string,
  personaNameB?: string,
  style?: DJStyle,
  modelOverride?: string
): Promise<ArrayBuffer | null> => {
  try {
    let finalTextInput = text;
    const isDualDj = !!secondaryVoice && !!personaNameA && !!personaNameB;
    if (isDualDj) {
      const cleanedScript = cleanTextForTTS(text, true);
      finalTextInput = `${TTS_DUAL_DJ_DIRECTION}\n${cleanedScript}`;
    } else {
      const cleanedText = cleanTextForTTS(text);
      if (!cleanedText) return null;
      finalTextInput = cleanedText;
    }

    const ai = await getClient();
    const host1Profile = VOICE_PROFILES.find(p => p.id === voice);
    const host2Profile = secondaryVoice ? VOICE_PROFILES.find(p => p.id === secondaryVoice) : null;

    const speechConfig: SpeechConfig =
      isDualDj && secondaryVoice && personaNameA && personaNameB
        ? {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: personaNameA, voiceConfig: { prebuiltVoiceConfig: { voiceName: host1Profile?.geminiVoiceName || voice } } },
              { speaker: personaNameB, voiceConfig: { prebuiltVoiceConfig: { voiceName: host2Profile?.geminiVoiceName || secondaryVoice } } },
            ],
          },
        }
        : { voiceConfig: { prebuiltVoiceConfig: { voiceName: host1Profile?.geminiVoiceName || voice } } };

    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: modelOverride || DEFAULT_TTS_MODEL,
          contents: [{ parts: [{ text: finalTextInput }] }],
          config: { 
            responseModalities: [Modality.AUDIO], 
            speechConfig,
            systemInstruction: style ? DJ_STYLE_TTS_SYSTEM_PROMPTS[style] : undefined
          },
        }),
      2,
      2000
    );
    return processAudioResponse(response);
  } catch (e) {
    console.error("[Hori-s] TTS generation failed", e);
    return null;
  }
};

const getTimeOfDay = (): { context: string; greeting: string } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { context: "Morning", greeting: "Good morning" };
  if (hour >= 12 && hour < 17) return { context: "Afternoon", greeting: "Good afternoon" };
  if (hour >= 17 && hour < 22) return { context: "Evening", greeting: "Good evening" };
  return { context: "Late Night", greeting: "Hey night owls" };
};

const selectTheme = (
  recentIndices: number[],
  enabledThemes: boolean[],
  forceTheme: number | null,
  verboseLogging: boolean,
  themeUsageHistory: Record<number, number> = {}
): { index: number; theme: string } => {
  if (forceTheme !== null && forceTheme >= 0 && forceTheme < LONG_MESSAGE_THEMES.length) {
    return { index: forceTheme, theme: LONG_MESSAGE_THEMES[forceTheme] };
  }
  const COOLDOWN_MS = TIMING.THEME_COOLDOWN;
  const now = Date.now();
  let availableIndices = LONG_MESSAGE_THEMES.map((_, i) => i).filter(i => {
    if (recentIndices.includes(i)) return false;
    if (!enabledThemes[i]) return false;
    if (i === 4 || i === 5) {
      if (now - (themeUsageHistory[i] || 0) < COOLDOWN_MS) return false;
    }
    return true;
  });
  if (availableIndices.length === 0) {
    availableIndices = enabledThemes.map((enabled, i) => enabled ? i : -1).filter(i => i !== -1);
  }
  if (availableIndices.length === 0) return { index: 0, theme: LONG_MESSAGE_THEMES[0] };
  const index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  return { index, theme: LONG_MESSAGE_THEMES[index] };
};

export const generateDJIntro = async (
  currentSong: Song,
  nextSong: Song | null,
  style: DJStyle,
  voice: DJVoice,
  language: AppLanguage,
  customPrompt?: string,
  upcomingSongTitles: string[] = [],
  playlistContext: string[] = [],
  history: string[] = [],
  dualDjMode: boolean = false,
  secondaryVoice: DJVoice = "Puck",
  isLongMessage: boolean = false,
  recentThemeIndices: number[] = [],
  debugSettings?: { enabledThemes: boolean[]; skipTTS: boolean; forceTheme: number | null; verboseLogging: boolean; },
  themeUsageHistory: Record<number, number> = {},
  textModelTier: GeminiModelTier = "FLASH",
  ttsModelTier: GeminiModelTier = "PRO"
): Promise<{ audio: ArrayBuffer | null; themeIndex: number | null; script?: string }> => {
  try {
    const langInstruction = getLanguageInstruction(language);
    const timeString = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown Location";
    const { context } = getTimeOfDay();

    const textModel = MODEL_MAPPING.TEXT[textModelTier] || DEFAULT_TEXT_MODEL;
    const ttsModelTierToUse = ttsModelTier || "PRO";
    const ttsModel = MODEL_MAPPING.TTS[ttsModelTierToUse] || DEFAULT_TTS_MODEL;
    const dynamicMarkupGuidance = getMarkupTagGuidance(ttsModelTierToUse);

    console.log(`[Hori-s] 🧠 Models: Text=${textModel}, TTS=${ttsModel}`);

    let styleInstruction = "";
    if (style === DJStyle.CUSTOM) {
      const customFunc = DJ_STYLE_PROMPTS[DJStyle.CUSTOM] as (p: string) => string;
      styleInstruction = customFunc(customPrompt || "");
    } else {
      styleInstruction = (DJ_STYLE_PROMPTS[style] as string) || DEFAULT_DJ_STYLE;
    }

    const historyBlock = history.length > 0 ? `PREVIOUS VOICEOVERS: \n${history.join("\n")}` : "";
    const playlistBlock = playlistContext.length > 0 ? `PLAYLIST CONTEXT: \n${playlistContext.join("\n")}` : "";

    let selectedThemeIndex: number | null = null;
    const host1Profile = VOICE_PROFILES.find(p => p.id === voice);
    const host2Profile = secondaryVoice ? VOICE_PROFILES.find(p => p.id === secondaryVoice) : null;

    const host1Name = host1Profile?.personaNames[language] || "DJ 1";
    const host2Name = host2Profile?.personaNames[language] || "DJ 2";
    const host1Gender = host1Profile?.gender || "Male";
    const host2Gender = host2Profile?.gender || "Male";

    let longMessageTheme = "";
    if (isLongMessage) {
        const themeSelection = selectTheme(recentThemeIndices, debugSettings?.enabledThemes || [true, true, true, true, true, true], debugSettings?.forceTheme ?? null, debugSettings?.verboseLogging || false, themeUsageHistory);
        selectedThemeIndex = themeSelection.index;
        longMessageTheme = themeSelection.theme.replace("${location}", userTimezone);
    }


    const prompt = generateDjIntroPrompt(
        host1Name,
        host1Gender,
        currentSong.title,
        nextSong?.title || "Next Song",
        styleInstruction,
        isLongMessage,
        longMessageTheme,
        historyBlock,
        playlistBlock,
        dynamicMarkupGuidance,
        langInstruction,
        dualDjMode,
        host2Name,
        host2Gender,
        nextSong ? { requestedBy: nextSong.requestedBy, requestMessage: nextSong.requestMessage, title: nextSong.title } : undefined
    );


    const script = await generateScript(prompt, textModel);
    if (!script) return { audio: null, themeIndex: null };

    console.log(`[Hori-s] 📝 Script: "${script}"`);

    if (debugSettings?.skipTTS) return { audio: null, themeIndex: selectedThemeIndex, script };
    const audio = await speakText(script, voice, undefined, undefined, undefined, style, ttsModel);
    return { audio, themeIndex: selectedThemeIndex, script };
  } catch (e) {
    console.error("[Hori-s] Intro generation failed", e);
    return { audio: null, themeIndex: null };
  }
};

