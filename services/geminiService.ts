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
      config: { responseMimeType: "application/json" }
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
    }));
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
  upcomingSongTitles: string[] = []
): Promise<ArrayBuffer | null> => {

  let prompt = "";
  const langInstruction = language === 'cs' ? "Speak in Czech language." : language === 'ja' ? "Speak in Japanese language." : "Speak in English.";
  const voiceInstruction = getVoiceDirection(voice);

  // Explicitly use en-US to ensure 12-hour format with AM/PM for clarity
  const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const { context, greeting } = getTimeOfDay();

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
  else if (style === DJStyle.CUSTOM && customPrompt) {
    prompt = `
        You are a Radio DJ transitioning from "${currentSong.title}" by ${currentSong.artist} to "${nextSong?.title || 'Unknown'}" by ${nextSong?.artist || 'Unknown'}.
        
        FOLLOW THESE CUSTOM INSTRUCTIONS STRICTLY:
        ${customPrompt}
        
        Output ONLY the spoken text. No *asterisks* or (parentheses).
        Important: ${langInstruction}
        ${voiceInstruction}
        `;
  }
  else {
    // DYNAMIC SEGMENT GENERATION
    // We roll a dice to see if the DJ should do something special
    const roll = Math.random();
    let specialInstruction = "";
    let lengthConstraint = "Keep it brief (under 30 words).";

    if (style === DJStyle.MINIMAL) {
      specialInstruction = "Be extremely concise. Just say the song names.";
    } else {
      // New Distribution for Realism to match "Real Radio Station" feel

      // 0.00 - 0.30: Standard / Short Transition
      // 0.30 - 0.45: Station ID
      // 0.45 - 0.60: Time Check
      // 0.60 - 0.85: Music Fact / Trivia (Replaces high joke frequency)
      // 0.85 - 0.95: Teaser (Upcoming tracks)
      // 0.95 - 1.00: Joke (Rare, only 5%)

      if (roll > 0.30 && roll <= 0.45) {
        specialInstruction = `Mention that the listener is tuned into "Horis FM", the AI Radio Station. Make it sound professional and established.`;
      } else if (roll > 0.45 && roll <= 0.60) {
        specialInstruction = `Mention the current time is ${timeString}. You are broadcasting in the ${context}. Match the vibe (e.g. if Late Night, be chill. If Morning, be energetic).`;
      } else if (roll > 0.60 && roll <= 0.85) {
        // Music Fact Logic
        const targetArtist = Math.random() > 0.5 ? currentSong.artist : (nextSong?.artist || 'Unknown Artist');
        const isUnknown = !targetArtist || targetArtist.toLowerCase().includes('unknown') || targetArtist === 'Artist';

        if (!isUnknown) {
          specialInstruction = `Share a quick, interesting, real-world fact or bit of trivia about the artist "${targetArtist}". It makes the broadcast feel authentic.`;
          lengthConstraint = "You can speak a bit longer (up to 50 words) to explain the fact.";
        } else {
          specialInstruction = `Comment on the specific energy or genre of the track that just played ("${currentSong.title}"). Act like a music critic.`;
        }
      } else if (roll > 0.85 && roll <= 0.95 && upcomingSongTitles.length > 0) {
        const teaseList = upcomingSongTitles.slice(0, 2).join(" and ");
        specialInstruction = `Tease that we have great tracks coming up later, specifically: ${teaseList}. Build anticipation.`;
        lengthConstraint = "You can speak a bit longer (up to 50 words) to list the upcoming tracks.";
      } else if (roll > 0.95) {
        specialInstruction = `Tell a very short, clean, dry one-liner joke about music. Then transition to the song.`;
        lengthConstraint = "Keep the joke punchy.";
      } else {
        // Standard Fallback (0.00 - 0.30)
        if (style === DJStyle.CHILL) {
          specialInstruction = `Be calm, relaxed, soft-spoken. It is currently ${context}. Match the energy.`;
        } else if (style === DJStyle.TECHNICAL) {
          specialInstruction = "Mention a technical detail about the music theory or production.";
        } else {
          specialInstruction = `Be professional, warm, and engaging. It is ${context}. Keep the flow moving.`;
        }
      }
    }

    prompt = `
      You are a radio DJ hosting a show on "Horis FM". 
      Current song ending: "${currentSong.title}" by ${currentSong.artist}.
      Next song starting: "${nextSong?.title}" by ${nextSong?.artist}.
      Current Time Context: ${context} (${timeString}).

      Instructions:
      1. Transition smoothly between the tracks.
      2. ${specialInstruction}
      3. ${lengthConstraint}
      4. STRICT RULE: Ensure time accuracy. If it is ${timeString}, DO NOT contradict this time. For example, if it is 12:00 PM (Noon), do NOT say "midnight is young". If it is 12:00 AM (Midnight), do NOT say "have a nice lunch".
      5. Output ONLY the spoken text. Do not include stage directions like *laughs* or [music fades].
      
      Important: ${langInstruction}
      ${voiceInstruction}
      `;
  }

  const script = await generateScript(prompt);
  if (!script) return null;
  console.log("DJ Script:", script);

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