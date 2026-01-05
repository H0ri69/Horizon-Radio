import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { Song, DJStyle, DJVoice, AppLanguage } from '../types';
import { GEMINI_CONFIG, DJ_STYLE_PROMPTS, VOICE_DIRECTIONS, TTS_INSTRUCTIONS, getLanguageInstruction } from '../src/config';

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

const processAudioResponse = (response: any): ArrayBuffer | null => {
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

// Robust Retry Logic for API Calls
async function callWithRetry<T>(fn: () => Promise<T>, retries = GEMINI_CONFIG.RETRY_COUNT, delay = GEMINI_CONFIG.RETRY_DELAY): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    // Retry on Rate Limits (429) AND Internal Server Errors (500, 503)
    const isRetryable = e.status === 429 || e.code === 429 ||
      e.status === 500 || e.code === 500 ||
      e.status === 503 || e.code === 503 ||
      (e.message && (e.message.includes('429') || e.message.includes('quota') || e.message.includes('500') || e.message.includes('503') || e.message.includes('INTERNAL')));

    if (retries > 0 && isRetryable) {
      console.warn(`Gemini API Error (${e.status || e.code || 'Unknown'}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw e;
  }
}

// Clean text to prevent TTS errors (remove stage directions, emojis, etc)
const cleanTextForTTS = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\*.*?\*/g, '')      // Remove *actions*
    .replace(/\[.*?\]/g, '')      // Remove [instructions]
    .replace(/\(.*?\)/g, '')      // Remove (notes)
    .replace(/["]+/g, '')         // Remove quotes
    .replace(/[:;]/g, ',')        // Replace colons/semicolons with commas for flow
    .trim();
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

const getTTSInstruction = (voice: DJVoice): string => {
  return TTS_INSTRUCTIONS[voice] || "";
};

const speakText = async (text: string, voice: DJVoice): Promise<ArrayBuffer | null> => {
  try {
    // CRITICAL: Clean text before sending to TTS model
    const cleanedText = cleanTextForTTS(text);
    if (!cleanedText) {
      console.warn("TTS skipped: Empty text after cleaning");
      return null;
    }
    console.log(`[Gemini] 🗣️ TTS Input: "${cleanedText}"`);

    // Prepend specific style instruction for the TTS model
    const ttsInstruction = getTTSInstruction(voice);
    const finalTextInput = ttsInstruction + cleanedText;

    const ai = getClient();
    const response = await callWithRetry(() => ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: finalTextInput }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    }), 2, 2000); // Specific retry strategy for TTS
    return processAudioResponse(response);
  } catch (e) {
    console.error("TTS generation failed", e);
    return null;
  }
};

// Helper to provide specific acting directions based on the requested voice
const getVoiceDirection = (voice: DJVoice): string => {
  return VOICE_DIRECTIONS[voice] || "";
};

const getTimeOfDay = (): { context: string, greeting: string } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { context: "Morning", greeting: "Good morning" };
  if (hour >= 12 && hour < 17) return { context: "Afternoon", greeting: "Good afternoon" };
  if (hour >= 17 && hour < 22) return { context: "Evening", greeting: "Good evening" };
  return { context: "Late Night", greeting: "Hey night owls" };
};

const synthesizeDialogue = async (script: string, voiceA: DJVoice, voiceB: DJVoice): Promise<ArrayBuffer | null> => {
  const lines = script.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const segments: { text: string; voice: DJVoice }[] = [];

  // Parse script into segments
  // Expected format: "[VoiceName]: Text"
  lines.forEach(line => {
    // Simple heuristic: check if line starts with VoiceName OR is just text (default to A)
    // We try to detect the speaker based on the line prefix
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const speaker = line.substring(0, colonIndex).trim();
      const text = line.substring(colonIndex + 1).trim();

      // Map speaker name to Voice ID (case insensitive check)
      const currentVoice = speaker.toLowerCase() === voiceB.toLowerCase() ? voiceB : voiceA;
      segments.push({ text, voice: currentVoice });
    } else {
      // Fallback: if no speaker prefix, assume Voice A (Host) or continuation
      segments.push({ text: line, voice: voiceA });
    }
  });

  const audioBuffers: ArrayBuffer[] = [];

  for (const segment of segments) {
    console.log(`[Dual DJ] Synthesizing for ${segment.voice}: "${segment.text}"`);
    const buffer = await speakText(segment.text, segment.voice);
    if (buffer) {
      // Strip 44-byte WAV header to get raw PCM
      audioBuffers.push(buffer.slice(44));
    }
  }

  if (audioBuffers.length === 0) return null;

  // Concatenate all PCM buffers
  const totalLength = audioBuffers.reduce((acc, b) => acc + b.byteLength, 0);
  const combinedPCM = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of audioBuffers) {
    combinedPCM.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  // Create new WAV header for the total length
  const header = createWavHeader(totalLength);
  return concatenateBuffers(header, combinedPCM.buffer);
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
  const voiceInstruction = getVoiceDirection(voice);
  const secondaryVoiceInstruction = getVoiceDirection(secondaryVoice);

  const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const { context } = getTimeOfDay();

  // Determine Style Instruction based on Enum (MOVED TO TOP)
  let styleInstruction = "";
  if (style === DJStyle.CUSTOM) {
    const customFunc = DJ_STYLE_PROMPTS[DJStyle.CUSTOM] as (p: string) => string;
    styleInstruction = customFunc(customPrompt || "");
  } else {
    styleInstruction = (DJ_STYLE_PROMPTS[style] as string) || "ROLE: Standard Radio DJ. Be professional and smooth.";
  }

  // Construct Context Block
  const historyBlock = history.length > 0
    ? `PREVIOUS VOICEOVERS (For Context Only - Do not repeat): \n${history.join('\n')}`
    : "No previous history.";

  const playlistBlock = playlistContext.length > 0
    ? `PLAYLIST CONTEXT (Surrounding Tracks): \n${playlistContext.join('\n')}`
    : "No playlist context.";

  if (dualDjMode) {
    prompt = `
       You are TWO Radio DJs covering a shift together on "Horis FM".
       HOST 1 (Main): ${voice} (${getVoiceDirection(voice)})
       HOST 2 (Co-Host): ${secondaryVoice} (${getVoiceDirection(secondaryVoice)})
       
       CURRENT SITUATION:
       - Song Ending: "${currentSong.title}" by ${currentSong.artist}
       - Song Starting: "${nextSong?.title}" by "${nextSong?.artist}"
       - Time: ${context} (${timeString})
       
       TONE/STYLE:
       ${styleInstruction}
       
       ${historyBlock}
       ${playlistBlock}

       TASK:
       Write a short, banter-filled dialogue script between the two DJs transitioning the songs.
       FORMAT:
       ${voice}: [Text]
       ${secondaryVoice}: [Text]
       
       MAX LENGTH: 4 exchanges total. Keep it snappy and natural.
       
       CONSTRAINTS:
       - Output ONLY the spoken words in the "Speaker: Text" format.
       - No stage directions.
       
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

    return synthesizeDialogue(script, voice, secondaryVoice);
  }

  // --- STANDARD SINGLE DJ LOGIC ---

  if (nextSong?.requestedBy) {
    prompt = `
       You are a Radio DJ on "Horis FM". A listener named "${nextSong.requestedBy}" has requested the song "${nextSong.title}" by "${nextSong.artist}".
       They sent this message: "${nextSong.requestMessage}".
       
       Transition from "${currentSong.title}", shout out the listener, react to their message, and intro the new track.
       Keep it under 50 words. Do not use stage directions like *laughs*.
       
       Important: ${langInstruction}
       ${voiceInstruction}
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
      MAX LENGTH: ${style === DJStyle.MINIMAL ? "15 words" : "45 words"}.
      
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
      ${voiceInstruction}
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
  const voiceInstruction = getVoiceDirection(voice);

  const introPrompt = `
    You are a radio DJ on Horis FM. You are about to take a live call from a listener named "${callerName}".
    ${reason ? `They want to talk about: "${reason}".` : ''}
    
    Write a short, engaging introduction line to bring them on air. 
    Example: "We've got [Name] on the line! How's it going?"
    Keep it under 15 words. Output ONLY the text. No stage directions.
    Important: ${langInstruction}
    ${voiceInstruction}
  `;

  const outroPrompt = `
    You are a radio DJ. You just finished talking to a listener named "${callerName}".
    Now you need to introduce the next song: "${nextSong?.title || 'Unknown'}" by "${nextSong?.artist || 'Unknown'}".
    
    Write a short outro thanking the caller and introducing the track.
    Example: "Thanks for calling in, [Name]. Here's [Song] by [Artist]."
    Keep it under 20 words. Output ONLY the text. No stage directions.
    Important: ${langInstruction}
    ${voiceInstruction}
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