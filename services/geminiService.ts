import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { Song, DJStyle, DJVoice, AppLanguage } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error("Invalid API Key. Please update .env");
  }
  return new GoogleGenAI({ apiKey });
};

const TEXT_MODEL = "gemini-2.5-flash";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

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
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
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

export const identifySongMetadata = async (filename: string): Promise<{ artist: string, title: string }> => {
  try {
    const ai = getClient();
    const prompt = `Analyze this filename: "${filename}". Extract the Artist and Song Title. 
    If the filename is generic (e.g. "track1.mp3"), try to guess if it's a famous song, otherwise use "Unknown Artist" and the filename as title.
    Return ONLY a JSON object with keys "artist" and "title".`;

    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", tools: [{ googleSearch: {} }] }
    }));

    const text = response.text;
    if (!text) return { artist: 'Unknown Artist', title: filename };

    return JSON.parse(text);
  } catch (e) {
    console.error("Metadata identification failed", e);
    return { artist: 'Unknown Artist', title: filename };
  }
};

export const generateOpeningLine = async (voice: DJVoice): Promise<ArrayBuffer | null> => {
  return null;
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
  if (voice === 'Charon') {
    return "Speak with a deep, resonant, confidential, and professional tone, like a late-night podcast host: ";
  }
  if (voice === 'Kore') {
    return "Speak in a clear, natural, balanced, and conversational tone, not overly hyped: ";
  }
  return "";
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
  if (voice === 'Charon') {
    return "Acting Direction: You are a late-night podcast host. Write with a deep, confidential, and professional persona. Use calm, steady, and authoritative phrasing. Do not rush. Use ellipses for pauses.";
  }
  if (voice === 'Kore') {
    return "Acting Direction: You are a friendly, natural speaker. Write with a balanced, conversational tone. Avoid 'hype' words or exclamation marks. Keep it grounded and normal, like talking to a friend.";
  }
  return "";
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
  history: string[] = [] // NEW: Previous voiceovers
): Promise<ArrayBuffer | null> => {

  let prompt = "";
  const langInstruction = language === 'cs' ? "Speak in Czech language." : language === 'ja' ? "Speak in Japanese language." : "Speak in English.";
  const voiceInstruction = getVoiceDirection(voice);

  const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const { context } = getTimeOfDay();

  // Construct Context Block
  const historyBlock = history.length > 0
    ? `PREVIOUS VOICEOVERS (For Context Only - Do not repeat): \n${history.join('\n')}`
    : "No previous history.";

  const playlistBlock = playlistContext.length > 0
    ? `PLAYLIST CONTEXT (Surrounding Tracks): \n${playlistContext.join('\n')}`
    : "No playlist context.";

  // Determine Style Instruction based on Enum
  let styleInstruction = "";
  switch (style) {
    case DJStyle.STANDARD:
      styleInstruction = `
        ROLE: Professional Commercial Radio DJ (Morning/Afternoon Drive).
        TONE: High energy, fast-paced, slick, and confident.
        CONTENT: 
        - Briefly mention the time of day or vibe (e.g., "Cruising through your afternoon...", "Waking you up...").
        - Mention the station name "Hori-s FM" naturally.
        - Bridge the two songs using a common theme, contrast, or energy shift.
        - SEARCH GOAL: Find one cool fact about the artist or song (Year, Genre, Hometown) and weave it in quickly.
      `;
      break;
    case DJStyle.CHILL:
      styleInstruction = `
        ROLE: Late-night 'Quiet Storm' or Lo-Fi Radio Host.
        TONE: Deep, soothing, slow, intimate, and relaxed. ASMR-adjacent.
        CONTENT:
        - Set a mood. Focus on feelings, atmosphere, and relaxation.
        - Use words like "smooth", "vibes", "relax", "unwind".
        - Minimal facts, more about the sonic experience.
        - SEARCH GOAL: Check if the song has a specific mood or interesting production backstory.
      `;
      break;
    case DJStyle.TECHNICAL:
      styleInstruction = `
        ROLE: Music Historian / Encyclopedia.
        TONE: Geeky, enthusiastic, precise, and educational.
        CONTENT:
        - Focus PURELY on the metadata: Release year, Producer, Sample source, or Record Label.
        - Less "personality", more "information".
        - Treat the listener like a fellow audiophile.
        - SEARCH GOAL: Find DEEP CUT trivia. Who produced it? What year? Who originally wrote it?
      `;
      break;
    case DJStyle.MINIMAL:
      styleInstruction = `
        ROLE: Automated Voice / Minimal Announcer.
        TONE: Neutral, robotic, efficient.
        CONTENT:
        - STRICT FORMAT: "That was [Artist] with [Title]. Up next is [Next Title] by [Next Artist]."
        - Zero fluff. No station ID. No greeting.
      `;
      break;
    case DJStyle.CUSTOM:
      styleInstruction = `
        ROLE: Custom User Persona.
        INSTRUCTION: ${customPrompt ? customPrompt : "Be a standard DJ."}
      `;
      break;
    default:
      styleInstruction = "ROLE: Standard Radio DJ. Be professional and smooth.";
  }

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

  const langInstruction = language === 'cs' ? "Speak in Czech language." : language === 'ja' ? "Speak in Japanese language." : "Speak in English.";
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