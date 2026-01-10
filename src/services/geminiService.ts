import browser from "webextension-polyfill";
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { Song, DJVoice, AppLanguage } from "../types";
import {
  GEMINI_CONFIG,
  DJ_STYLE_PROMPTS,
  getLanguageInstruction,
  LENGTH_CONSTRAINT,
  TTS_DUAL_DJ_DIRECTION,
  DEFAULT_DJ_STYLE,
  DJStyle,
  getMarkupTagGuidance,
  lowestSafetySettings,
  MODEL_MAPPING,
  AUDIO,
  VOICE_PROFILES,
  SHORT_MESSAGE_INSTRUCTION,
  generateDjIntroPrompt,
  MINIMAL_MARKUP_GUIDANCE,
  // Scheduler types
  type TransitionPlan,
  type DJSegmentType,
  LONG_INTRO_THEME_PROMPTS,
  WEATHER_PROMPT,
  NEWS_PROMPT,
} from "../config";
import { GeminiModelTier } from "../types";

const DEFAULT_TEXT_MODEL = MODEL_MAPPING.TEXT.FLASH;
const DEFAULT_TTS_MODEL = MODEL_MAPPING.TTS.FLASH;

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
    if (typeof browser !== "undefined" && browser.storage && browser.storage.local) {
      browser.storage.local.get(["horisFmSettings"]).then((result) => {
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

const applyFadeIn = (pcmData: Uint8Array, durationMs: number = 50, sampleRate: number = AUDIO.SAMPLE_RATE_OUTPUT): void => {
  const bytesPerSample = 2; // 16-bit
  const numSamplesToFade = Math.floor((durationMs / 1000) * sampleRate);

  // Create a DataView for easier reading/writing of 16-bit integers
  const view = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);

  // Ensure we don't go out of bounds if the audio is shorter than the fade
  const limit = Math.min(numSamplesToFade, Math.floor(pcmData.length / bytesPerSample));

  for (let i = 0; i < limit; i++) {
    const offset = i * bytesPerSample;
    // Little-endian is standard for WAV PCM
    const sample = view.getInt16(offset, true);

    // Linear fade-in: 0.0 -> 1.0
    // Using simple linear interpolation is usually sufficient for de-clicking
    const gain = i / limit;

    const newSample = Math.round(sample * gain);
    view.setInt16(offset, newSample, true);
  }
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

  // Apply a short fade-in to prevent initial audio spike/pop
  applyFadeIn(pcmData);

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
    const isThinkingModel = modelName.includes("thinking");
    const response: GenerateContentResponse = await callWithRetry(() =>
      ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          thinkingConfig: isThinkingModel ? { thinkingBudget: 1024 } : undefined,
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

    console.log(`[Hori-s] 🔊 TTS Input: "${finalTextInput}"`);
    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: modelOverride || DEFAULT_TTS_MODEL,
          contents: [{ parts: [{ text: finalTextInput }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig,
            // DO NOT ENABLE, IS BROKEN IN GOOGLE GEMINI API
            //systemInstruction: style ? DJ_STYLE_TTS_SYSTEM_PROMPTS[style] : undefined
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

// Test voice for preview in settings
const TEST_PHRASES: Record<string, string> = {
  en: "Hey there! This is your radio host checking in. How's this voice sounding?",
  cs: "Ahoj! Tady váš rozhlasový moderátor. Jak vám zní můj hlas?",
  ja: "こんにちは！ラジオホストです。この声はいかがですか？",
};

export const testVoice = async (voice: DJVoice, language: string): Promise<ArrayBuffer | null> => {
  try {
    const phrase = TEST_PHRASES[language] || TEST_PHRASES.en;
    const ai = await getClient();
    const profile = VOICE_PROFILES.find(p => p.id === voice);

    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: DEFAULT_TTS_MODEL,
          contents: [{ parts: [{ text: phrase }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: profile?.geminiVoiceName || voice } } },
          },
        }),
      2,
      2000
    );
    return processAudioResponse(response);
  } catch (e) {
    console.error("[Hori-s] Test voice failed", e);
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

/**
 * Get the theme/content prompt based on the transition plan
 */
function getContentPromptForPlan(plan: TransitionPlan, timezone: string, newsHistory?: string[]): { isLong: boolean; themePrompt: string } {
  switch (plan.segment) {
    case 'SILENCE':
      return { isLong: false, themePrompt: '' };
    
    case 'SHORT_INTRO':
      return { isLong: false, themePrompt: '' };
    
    case 'LONG_INTRO':
      if (plan.longTheme) {
        return { isLong: true, themePrompt: LONG_INTRO_THEME_PROMPTS[plan.longTheme] };
      }
      return { isLong: true, themePrompt: LONG_INTRO_THEME_PROMPTS.TRIVIA };
    
    case 'WEATHER':
      return { isLong: true, themePrompt: WEATHER_PROMPT(timezone) };
    
    case 'NEWS':
      let newsPrompt = NEWS_PROMPT(timezone);
      if (newsHistory && newsHistory.length > 0) {
        newsPrompt += `\n\nRECENTLY COVERED NEWS (DO NOT REPEAT THESE):\n"""\n${newsHistory.join('\n---\n')}\n"""\n\nCRITICAL INSTRUCTION: You MUST NOT repeat the stories listed above. Find DIFFERENT headlines or newer developments. If the above covered "Tech", focus on "Science" or "World News" this time.`;
      }
      return { isLong: true, themePrompt: newsPrompt };
    
    default:
      return { isLong: false, themePrompt: '' };
  }
}

/**
 * Generate DJ intro audio based on a TransitionPlan from the scheduler
 */
export const generateDJIntro = async (
  currentSong: Song,
  nextSong: Song | null,
  plan: TransitionPlan,
  style: DJStyle,
  voice: DJVoice,
  language: AppLanguage,
  customPrompt?: string,
  playlistContext: string[] = [],
  dualDjMode: boolean = false,
  secondaryVoice: DJVoice = "Puck",
  debugSettings?: { skipTTS: boolean; verboseLogging: boolean },
  textModelTier: GeminiModelTier = "FLASH",
  ttsModelTier: GeminiModelTier = "FLASH",
  newsHistory: string[] = []
): Promise<{ audio: ArrayBuffer | null; script?: string; prompt?: string }> => {
  // Handle SILENCE - no generation needed
  if (plan.segment === 'SILENCE') {
    console.log('[Hori-s] 🔇 Segment is SILENCE - skipping generation');
    return { audio: null };
  }

  try {
    const langInstruction = getLanguageInstruction(language);
    const timeString = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown Location";
    const { context } = getTimeOfDay();

    // Get content details from the plan
    const { isLong, themePrompt } = getContentPromptForPlan(plan, userTimezone, newsHistory);

    const textModel = MODEL_MAPPING.TEXT[textModelTier] || DEFAULT_TEXT_MODEL;
    const ttsModelTierToUse = ttsModelTier || "FLASH";
    const ttsModel = MODEL_MAPPING.TTS[ttsModelTierToUse] || DEFAULT_TTS_MODEL;
    const dynamicMarkupGuidance = isLong ? getMarkupTagGuidance(ttsModelTierToUse) : MINIMAL_MARKUP_GUIDANCE;

    console.log(`[Hori-s] 🧠 Models: Text=${textModel}, TTS=${ttsModel} | Segment: ${plan.segment}${plan.longTheme ? ` (${plan.longTheme})` : ''}`);

    let styleInstruction = "";
    if (style === DJStyle.CUSTOM) {
      const customFunc = DJ_STYLE_PROMPTS[DJStyle.CUSTOM] as (p: string) => string;
      styleInstruction = customFunc(customPrompt || "");
    } else {
      styleInstruction = (DJ_STYLE_PROMPTS[style] as string) || DEFAULT_DJ_STYLE;
    }

    const playlistBlock = playlistContext.length > 0 ? `PLAYLIST CONTEXT: \n${playlistContext.join("\n")}` : "";

    const host1Profile = VOICE_PROFILES.find(p => p.id === voice);
    const host2Profile = secondaryVoice ? VOICE_PROFILES.find(p => p.id === secondaryVoice) : null;

    const host1Name = host1Profile?.personaNames[language] || "DJ 1";
    const host2Name = host2Profile?.personaNames[language] || "DJ 2";
    const host1Gender = host1Profile?.gender || "Male";
    const host2Gender = host2Profile?.gender || "Male";

    const prompt = generateDjIntroPrompt(
      host1Name,
      host1Gender,
      currentSong.title,
      nextSong?.title || "Next Song",
      styleInstruction,
      isLong,
      themePrompt,
      playlistBlock,
      dynamicMarkupGuidance,
      langInstruction,
      timeString,
      context,
      dualDjMode,
      host2Name,
      host2Gender,
      nextSong ? { requestedBy: nextSong.requestedBy, requestMessage: nextSong.requestMessage, title: nextSong.title } : undefined
    );

    if (debugSettings?.verboseLogging) {
      console.log(`[Hori-s] 🤖 Prompt: ${prompt}`);
    } else {
      console.log(`[Hori-s] 🤖 Prompt: (Enable Verbose Logging to see full text)`);
    }
    
    const scriptStartTime = performance.now();
    const script = await generateScript(prompt, textModel);
    const scriptEndTime = performance.now();
    if (!script) return { audio: null };

    console.log(`[Hori-s] 📝 Script: "${script}" (Generated in ${((scriptEndTime - scriptStartTime) / 1000).toFixed(2)}s)`);

    if (debugSettings?.skipTTS) return { audio: null, script };
    
    const ttsStartTime = performance.now();
    const audio = await speakText(script, voice, undefined, undefined, undefined, style, ttsModel);
    const ttsEndTime = performance.now();
    console.log(`[Hori-s] 🔊 TTS Generated in ${((ttsEndTime - ttsStartTime) / 1000).toFixed(2)}s`);
    
    return { audio, script, prompt };
  } catch (e) {
    console.error("[Hori-s] Intro generation failed", e);
    return { audio: null };
  }
};

