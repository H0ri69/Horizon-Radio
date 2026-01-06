import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { Song, DJVoice, AppLanguage } from '../src/types';
import { GEMINI_CONFIG, DJ_STYLE_PROMPTS, getLanguageInstruction, LENGTH_CONSTRAINT, DJ_PERSONA_NAMES, TTS_DUAL_DJ_DIRECTION, DEFAULT_DJ_STYLE, DJStyle } from '../src/config';

// Type definitions for better type safety
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

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error("Invalid API Key. Please update .env");
  }
  return new GoogleGenAI({ apiKey });
};

const TEXT_MODEL = GEMINI_CONFIG.TEXT_MODEL;
const TTS_MODEL = GEMINI_CONFIG.TTS_MODEL;

const createWavHeader = (dataLength: number, sampleRate: number = 24000) => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  return buffer;
};

const writeString = (view: DataView, offset: number, str: string) => {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
};

const concatenateBuffers = (buffer1: ArrayBuffer, buffer2: ArrayBuffer) => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

const processAudioResponse = (response: AudioResponseData): ArrayBuffer | null => {
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    console.warn("[Gemini] Warning: No base64 audio data found in response");
    return null;
  }

  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const pcmData = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    pcmData[i] = binaryString.charCodeAt(i);
  }

  const header = createWavHeader(pcmData.length);
  return concatenateBuffers(header, pcmData.buffer);
};

// Robust Retry Logic for API Calls
async function callWithRetry<T>(fn: () => Promise<T>, retries = GEMINI_CONFIG.RETRY_COUNT, delay = GEMINI_CONFIG.RETRY_DELAY): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const error = e as GeminiErrorResponse;
    // Retry on Rate Limits (429) AND Internal Server Errors (500, 503)
    const isRetryable = error.status === 429 || error.code === 429 ||
      error.status === 500 || error.code === 500 ||
      error.status === 503 || error.code === 503 ||
      (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('500') || error.message.includes('503') || error.message.includes('INTERNAL')));

    if (retries > 0 && isRetryable) {
      console.warn(`Gemini API Error (${error.status || error.code || 'Unknown'}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Clean text to prevent TTS errors (remove stage directions, emojis, etc)
const cleanTextForTTS = (text: string, partialClean: boolean = false): string => {
  if (!text) return "";
  let cleaned = text
    .replace(/\*.*?\*/g, '')      // Remove *actions*
    .replace(/\[.*?\]/g, '')      // Remove [instructions]
    .replace(/\(.*?\)/g, '');     // Remove (notes)

  // Full clean: also remove quotes and replace punctuation
  if (!partialClean) {
    cleaned = cleaned
      .replace(/["]+/g, '')       // Remove quotes
      .replace(/[:;]/g, ',');     // Replace colons/semicolons with commas for flow
  }

  return cleaned.trim();
};





const generateScript = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getClient();
    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: {
          thinkingBudget: 0 // Set to 0 to disable thinking
        }, tools: [{ googleSearch: {} }]
      }
    }));

    // Log grounding metadata if available (to verify search is working)
    const grounding = response.candidates?.[0]?.groundingMetadata;
    if (grounding?.searchEntryPoint) {
      console.log("[Gemini] 🔎 Search Performed. Grounding Metadata found.");
    } else {
      console.log("[Gemini] 🔎 Search Performed. Grounding Metadata NOT found.");
    }

    return response.text || null;
  } catch (e) {
    console.error("Script generation failed", e);
    return null;
  }
};

const speakText = async (
  text: string, 
  voice: DJVoice, 
  secondaryVoice?: DJVoice,
  personaNameA?: string,
  personaNameB?: string
): Promise<ArrayBuffer | null> => {
  try {
    let finalTextInput = text;
    
    // Check if this looks like a Dual DJ script (has persona names with colons)
    // We detect dual mode by checking if personaNameA/B are provided
    const isDualDj = !!secondaryVoice && !!personaNameA && !!personaNameB;

    if (isDualDj) {
        // Partial cleaning for Dual DJ - keep speaker prefixes (persona names with colons)
        const cleanedScript = cleanTextForTTS(text, true);

         // CRITICAL: Prepend direction instruction for multi-speaker TTS
         finalTextInput = `${TTS_DUAL_DJ_DIRECTION}\n${cleanedScript}`;
    } else {
         const cleanedText = cleanTextForTTS(text);
          if (!cleanedText) {
            console.warn("TTS skipped: Empty text after cleaning");
            return null;
          }
          finalTextInput = cleanedText;
    }

    console.log(`[Gemini] 🗣️ TTS Input (Dual=${isDualDj}): "${finalTextInput.substring(0, 100)}..."`);

    const ai = getClient();
    
    // Build speech config based on single vs dual DJ mode
    const speechConfig: SpeechConfig = isDualDj && secondaryVoice && personaNameA && personaNameB ? {
      // Multi-speaker configuration using actual persona names
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          {
            speaker: personaNameA, // Use actual name like "Mike" instead of "Speaker 1"
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
          {
            speaker: personaNameB, // Use actual name like "Sarah" instead of "Speaker 2"
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: secondaryVoice },
            },
          },
        ],
      },
    } : {
      // Single speaker configuration
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: voice },
      },
    };

    const response = await callWithRetry(() => ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: finalTextInput }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig,
      },
    }), 2, 2000); // Specific retry strategy for TTS
    return processAudioResponse(response);
  } catch (e) {
    console.error("TTS generation failed", e);
    return null;
  }
};

const getTimeOfDay = (): { context: string, greeting: string } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { context: "Morning", greeting: "Good morning" };
  if (hour >= 12 && hour < 17) return { context: "Afternoon", greeting: "Good afternoon" };
  if (hour >= 17 && hour < 22) return { context: "Evening", greeting: "Good evening" };
  return { context: "Late Night", greeting: "Hey night owls" };
};

export const generateDJIntro = async (
  currentSong: Song,
  nextSong: Song | null,
  style: DJStyle,
  voice: DJVoice,
  language: AppLanguage,
  customPrompt?: string,
  upcomingSongTitles: string[] = [], // Kept for compat
  playlistContext: string[] = [], // NEW: Immediate surroundings
  history: string[] = [], // NEW: Previous voiceovers
  dualDjMode: boolean = false, // EXISTING ARGUMENT OR NEW? If I can't change signature easily, I might relying on customPrompt or overload. 
  secondaryVoice: DJVoice = 'Puck'
): Promise<ArrayBuffer | null> => {

  let prompt = "";
  const langInstruction = getLanguageInstruction(language);

  const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const { context } = getTimeOfDay();

  // Determine Style Instruction based on Enum (MOVED TO TOP)
  let styleInstruction = "";
  if (style === DJStyle.CUSTOM) {
    const customFunc = DJ_STYLE_PROMPTS[DJStyle.CUSTOM] as (p: string) => string;
    styleInstruction = customFunc(customPrompt || "");
  } else {
    styleInstruction = (DJ_STYLE_PROMPTS[style] as string) || DEFAULT_DJ_STYLE;
  }

  // Construct Context Block
  const historyBlock = history.length > 0
    ? `PREVIOUS VOICEOVERS (For Context Only - Do not repeat): \n${history.join('\n')}`
    : "No previous history.";

  const playlistBlock = playlistContext.length > 0
    ? `PLAYLIST CONTEXT (Surrounding Tracks): \n${playlistContext.join('\n')}`
    : "No playlist context.";

  if (dualDjMode) {
    // Get persona names for the selected voices in the current language
    const host1Name = DJ_PERSONA_NAMES[voice]?.[language] || 'DJ 1';
    const host2Name = DJ_PERSONA_NAMES[secondaryVoice]?.[language] || 'DJ 2';
    
    prompt = `
       You are TWO Radio DJs covering a shift together on "Horis FM".
       HOST 1 (Main): Named "${host1Name}"
       HOST 2 (Co-Host): Named "${host2Name}"

       CURRENT SITUATION:
       - Song Ending: "${currentSong.title}" by ${currentSong.artist}
       - Song Starting: "${nextSong?.title}" by "${nextSong?.artist}"
       - Time: ${context} (${timeString})
       
       TONE/STYLE:
       ${styleInstruction}
       
       ${historyBlock}
       ${playlistBlock}

       TASK:
       Write a short, banter-filled dialogue script between ${host1Name} and ${host2Name} transitioning the songs.
       
       OUTPUT FORMAT (STRICT):
       Every single line MUST start with either "${host1Name}: " or "${host2Name}: " followed by their dialogue.
       Example:
       ${host1Name}: That was incredible!
       ${host2Name}: Absolutely loved it! Now here's something special...
       ${host1Name}: You're going to love this next track.
       
       ${LENGTH_CONSTRAINT}
       
       CRITICAL CONSTRAINTS:
       - DO NOT include ANY text that is not prefixed with "${host1Name}: " or "${host2Name}: "
       - DO NOT add stage directions, descriptions, or narration
       - DO NOT add introductory text like "Here's the script:" or concluding text
       - Every line MUST have the speaker prefix (either ${host1Name} or ${host2Name})
       - Output ONLY the dialogue lines in the exact format shown above
       
       Important: ${langInstruction}
     `;

    console.log(`[Gemini] Generating DUAL DJ Script: ${voice} & ${secondaryVoice}`);
    const script = await generateScript(prompt);
    if (!script) {
      console.warn("[Gemini] Script generation failed.");
      return null;
    }

    console.log("------------------------------------------------");
    console.log(`[Gemini] 🤖 GENERATED DIALOGUE:\n"${script}"`);
    console.log("------------------------------------------------");

    console.log(`[Dual DJ] Synthesizing full conversation at once...`);
    return speakText(script, voice, secondaryVoice, host1Name, host2Name);
  }

  // --- STANDARD SINGLE DJ LOGIC ---

  if (nextSong?.requestedBy) {
    prompt = `
       You are a Radio DJ on "Horis FM". A listener named "${nextSong.requestedBy}" has requested the song "${nextSong.title}" by "${nextSong.artist}".
       They sent this message: "${nextSong.requestMessage}".
       
       Transition from "${currentSong.title}", shout out the listener, react to their message, and intro the new track.
       ${LENGTH_CONSTRAINT} Do not use stage directions like *laughs*.

       Important: ${langInstruction}
       `;
  }
  else {
    prompt = `
      You are a specific persona: A Radio DJ on "Horis FM".
      
      CURRENT SITUATION:
      - Song Ending: "${currentSong.title}" by ${currentSong.artist}
      - Song Starting: "${nextSong?.title}" by "${nextSong?.artist}"
      - Time: ${context} (${timeString})
      
      ${historyBlock}
      ${playlistBlock}

      TASK:
      Generate a short, radio-realistic transition script.
      ${LENGTH_CONSTRAINT}
      
      STYLE PROTOCOL:
      ${styleInstruction}
      
      TOOLS AVAILABLE:
      - You have access to Google Search.
      - USE IT to find fresh info if needed to make the link relevant.
      - DO NOT just list facts. Weave them into the flow.
      
      CONSTRAINTS:
      - Do NOT output stage directions (e.g. *scratches record*).
      - Do NOT say "Here is the script" or "Transition:".
      - Output ONLY the spoken words.

      Important: ${langInstruction}
      `;
  }

  console.log(`[Gemini] Generating for: Voice=${voice}, Style=${style}`);
  const script = await generateScript(prompt);
  if (!script) {
    console.warn("[Gemini] Script generation failed (empty response).");
    return null;
  }

  console.log("------------------------------------------------");
  console.log(`[Gemini] 🤖 GENERATED SCRIPT:\n"${script}"`);
  console.log("------------------------------------------------");

  return speakText(script, voice);
};

export const generateCallBridging = async (
  callerName: string,
  reason: string,
  nextSong: Song | null,
  voice: DJVoice,
  language: AppLanguage
): Promise<{ intro: ArrayBuffer | null, outro: ArrayBuffer | null }> => {

  const langInstruction = getLanguageInstruction(language);

  const introPrompt = `
    You are a radio DJ on Horis FM. You are about to take a live call from a listener named "${callerName}".
    ${reason ? `They want to talk about: "${reason}".` : ''}
    
    Write a short, engaging introduction line to bring them on air.
    Example: "We've got [Name] on the line! How's it going?"
    Keep it under 15 words. Output ONLY the text. No stage directions.
    Important: ${langInstruction}
  `;

  const outroPrompt = `
    You are a radio DJ. You just finished talking to a listener named "${callerName}".
    Now you need to introduce the next song: "${nextSong?.title || 'Unknown'}" by "${nextSong?.artist || 'Unknown'}".
    
    Write a short outro thanking the caller and introducing the track.
    Example: "Thanks for calling in, [Name]. Here's [Song] by [Artist]."
    Keep it under 20 words. Output ONLY the text. No stage directions.
    Important: ${langInstruction}
  `;

  const [introText, outroText] = await Promise.all([
    generateScript(introPrompt),
    generateScript(outroPrompt)
  ]);

  const [introBuffer, outroBuffer] = await Promise.all([
    introText ? speakText(introText, voice) : null,
    outroText ? speakText(outroText, voice) : null
  ]);

  return { intro: introBuffer, outro: outroBuffer };
};