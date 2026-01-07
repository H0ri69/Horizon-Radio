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
  MARKUP_TAG_GUIDANCE,
  lowestSafetySettings,
} from "../config";

const LONG_MESSAGE_THEMES = [
  "Tell a short, music-related Joke",
  "Share a Trivium or Fun Fact about the artist or song",
  "Preview upcoming songs in the queue. Mention the titles and artists of the next 2-3 specific songs using ONLY the playlist context provided ([UP NEXT +1], [UP NEXT +2], etc). Do NOT invent song titles or be vague.",
  "Spotlight a story about the Artist",
  "Briefly mention current Weather for your listeners, referencing the local country of ${location}. USE GOOGLE SEARCH to get actual conditions. Interpret the timezone as a country, not a specific city. Deliver it naturally as a DJ update (e.g., 'A bit chilly here in the UK tonight...'). Use Celsius for temperatures unless location is in USA/Canada, then use Fahrenheit.",
  "Briefly mention a local News headline relevant to the country where ${location} is located. USE GOOGLE SEARCH. Interpret the timezone as a country, not a specific city. Deliver it as a casual radio update, not a robotic headline read.",
];

const SHORT_MESSAGE_INSTRUCTION = "Keep it extremely concise. Maximum 2 sentences. Focus strictly on the transition (Song A to Song B).";


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

const TEXT_MODEL = GEMINI_CONFIG.TEXT_MODEL;
const TTS_MODEL = GEMINI_CONFIG.TTS_MODEL;

const writeString = (view: DataView, offset: number, str: string): void => {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
};

const createWavHeader = (dataLength: number, sampleRate: number = 24000): ArrayBuffer => {
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
    // Retry on Rate Limits (429) AND Internal Server Errors (500, 503)
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
      console.warn(
        `[Gemini] API Error (${error.status || error.code || "Unknown"
        }). Retrying in ${delay}ms... (Attempt ${attempt}, ${retries} retries left). Error: ${error.message || "No message"
        }`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2, attempt + 1);
    }
    console.error(`[Gemini] API Call failed after ${attempt} attempts.`, error);
    throw error;
  }
}

// Clean text to prevent TTS errors (remove stage directions, emojis, etc)
const cleanTextForTTS = (text: string, partialClean: boolean = false): string => {
  if (!text) return "";
  let cleaned = text
    .replace(/\*.*?\*/g, "") // Remove *actions*
    .replace(/\(.*?\)/g, ""); // Remove (notes)

  // Full clean: also remove quotes and replace punctuation
  if (!partialClean) {
    cleaned = cleaned
      .replace(/["]+/g, "") // Remove quotes
      .replace(/[:;]/g, ","); // Replace colons/semicolons with commas for flow
  }

  return cleaned.trim();
};

const generateScript = async (prompt: string): Promise<string | null> => {
  const label = `[Gemini:Timing] Script Generation`;
  console.time(label);
  try {
    console.log(`[Gemini] 📝 Generating script...`);
    const ai = await getClient();
    const response: GenerateContentResponse = await callWithRetry(() =>
      ai.models.generateContent({
        model: TEXT_MODEL,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          safetySettings: lowestSafetySettings,
          tools: [{ googleSearch: {} }],
        },
      })
    );

    // Log grounding metadata if available (to verify search is working)
    const grounding = response.candidates?.[0]?.groundingMetadata;
    if (grounding?.searchEntryPoint) {
      console.log("[Gemini] 🔎 Search Performed. Grounding Metadata found.");
    } else {
      console.log("[Gemini] 🔎 No Grounding Metadata found (Search may not have been triggered).");
    }

    const script = response.text || null;
    if (script) {
      console.log(`[Gemini] ✅ Script generated (${script.length} chars).`);
    } else {
      console.warn(`[Gemini] ⚠️ Script generation returned empty.`);
    }
    return script;
  } catch (e) {
    console.error("[Gemini] ❌ Script generation failed", e);
    return null;
  } finally {
    console.timeEnd(label);
  }
};

const speakText = async (
  text: string,
  voice: DJVoice,
  secondaryVoice?: DJVoice,
  personaNameA?: string,
  personaNameB?: string,
  style?: DJStyle
): Promise<ArrayBuffer | null> => {
  const label = `[Gemini:Timing] TTS Generation (Dual=${!!secondaryVoice})`;
  console.time(label);
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
        console.warn("[Gemini] 🗣️ TTS skipped: Empty text after cleaning");
        return null;
      }
      finalTextInput = cleanedText;
    }

    console.log(
      `[Gemini] 🗣️ TTS Input (Dual=${isDualDj}): "${finalTextInput.substring(0, 100)}..."`
    );

    const ai = await getClient();

    // Build speech config based on single vs dual DJ mode
    const speechConfig: SpeechConfig =
      isDualDj && secondaryVoice && personaNameA && personaNameB
        ? {
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
        }
        : {
          // Single speaker configuration
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        };

    // Get TTS system prompt based on DJ style (if provided)
    const systemInstruction = style ? DJ_STYLE_TTS_SYSTEM_PROMPTS[style] || "" : "";

    if (systemInstruction) {
      console.log(`[Gemini] 📋 Using TTS System Instruction for style: ${style}`);
    }

    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: TTS_MODEL,
          contents: [{ parts: [{ text: finalTextInput }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            // KEEP COMMENTED OUT FOR NOW, AS THE OFFICIAL GEMINI API CRASHES WITH THIS
            // systemInstruction,
            speechConfig,
          },
        }),
      2,
      2000
    ); // Specific retry strategy for TTS

    const audioContent = processAudioResponse(response);
    if (audioContent) {
      console.log(`[Gemini] ✅ TTS generated (${audioContent.byteLength} bytes).`);
    } else {
      console.warn(`[Gemini] ⚠️ TTS returned no audio data.`);
    }
    return audioContent;
  } catch (e) {
    console.error("[Gemini] ❌ TTS generation failed", e);
    return null;
  } finally {
    console.timeEnd(label);
  }
};

const getTimeOfDay = (): { context: string; greeting: string } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { context: "Morning", greeting: "Good morning" };
  if (hour >= 12 && hour < 17) return { context: "Afternoon", greeting: "Good afternoon" };
  if (hour >= 17 && hour < 22) return { context: "Evening", greeting: "Good evening" };
  return { context: "Late Night", greeting: "Hey night owls" };
};

// Theme Selection with History Tracking and Debug Controls
const selectTheme = (
  recentIndices: number[],
  enabledThemes: boolean[],
  forceTheme: number | null,
  verboseLogging: boolean,
  themeUsageHistory: Record<number, number> = {}
): { index: number; theme: string } => {
  // Debug Override: Force specific theme
  if (forceTheme !== null && forceTheme >= 0 && forceTheme < LONG_MESSAGE_THEMES.length) {
    if (verboseLogging) console.log(`[Theme] FORCE OVERRIDE: Using theme ${forceTheme}`);
    return { index: forceTheme, theme: LONG_MESSAGE_THEMES[forceTheme] };
  }

  // Filter: Exclude recent themes AND disabled themes
  // Also enforce cooldowns for specific themes
  const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
  const now = Date.now();

  let availableIndices = LONG_MESSAGE_THEMES
    .map((_, i) => i)
    .filter(i => {
      // Basic checks
      if (recentIndices.includes(i)) return false;
      if (!enabledThemes[i]) return false;

      // Cooldown checks for Weather (4) and News (5)
      if (i === 4 || i === 5) {
        const lastUsed = themeUsageHistory[i] || 0;
        if (now - lastUsed < COOLDOWN_MS) {
          if (verboseLogging) console.log(`[Theme] Skipping theme ${i} (Weather/News) due to cooldown. Last used: ${new Date(lastUsed).toLocaleTimeString()}`);
          return false;
        }
      }

      return true;
    });

  if (verboseLogging) {
    console.log(`[Theme] Recent: [${recentIndices.join(", ")}]`);
    console.log(`[Theme] Enabled: [${enabledThemes.map((e, i) => e ? i : null).filter(i => i !== null).join(", ")}]`);
    console.log(`[Theme] Available: [${availableIndices.join(", ")}]`);
  }

  // Fallback: If all filtered out, use any enabled theme
  if (availableIndices.length === 0) {
    if (verboseLogging) console.warn(`[Theme] No available themes after filtering, using any enabled theme`);
    availableIndices = enabledThemes
      .map((enabled, i) => enabled ? i : -1)
      .filter(i => i !== -1);
  }

  // Fallback: If STILL nothing (all disabled), use theme 0
  if (availableIndices.length === 0) {
    console.error(`[Theme] ALL THEMES DISABLED! Falling back to theme 0.`);
    return { index: 0, theme: LONG_MESSAGE_THEMES[0] };
  }

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
  // Debug parameters
  recentThemeIndices: number[] = [],
  debugSettings?: {
    enabledThemes: boolean[];
    skipTTS: boolean;
    forceTheme: number | null;
    verboseLogging: boolean;
  },
  themeUsageHistory: Record<number, number> = {}
): Promise<{ audio: ArrayBuffer | null; themeIndex: number | null }> => {
  const label = `[Gemini:Timing] Total DJ Intro Process`;
  console.time(label);
  console.log(`[Gemini] 🎉 Incoming DJ Intro Request:`, {
    song: currentSong.title,
    artist: currentSong.artist,
    next: nextSong?.title,
    style,
    voice,
    dual: dualDjMode
  });
  try {
    let prompt = "";
    const langInstruction = getLanguageInstruction(language);

    const timeString = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown Location";
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
    const historyBlock =
      history.length > 0
        ? `PREVIOUS VOICEOVERS (For Context Only - Do not repeat): \n${history.join("\n")}`
        : "No previous history.";

    const playlistBlock =
      playlistContext.length > 0
        ? `PLAYLIST CONTEXT (Surrounding Tracks): \n${playlistContext.join("\n")}`
        : "No playlist context.";

    if (dualDjMode) {
      // Get persona names for the selected voices in the current language
      const host1Name = DJ_PERSONA_NAMES[voice]?.[language] || "DJ 1";
      const host2Name = DJ_PERSONA_NAMES[secondaryVoice]?.[language] || "DJ 2";

      let longMessageTheme = "";
      let selectedThemeIndex: number | null = null;

      if (isLongMessage) {
        // Use debug settings or defaults
        const enabledThemes = debugSettings?.enabledThemes || [true, true, true, true, true, true];
        const forceTheme = debugSettings?.forceTheme ?? null;
        const verboseLogging = debugSettings?.verboseLogging || false;

        const themeSelection = selectTheme(recentThemeIndices, enabledThemes, forceTheme, verboseLogging, themeUsageHistory);
        selectedThemeIndex = themeSelection.index;
        longMessageTheme = themeSelection.theme.replace("${location}", userTimezone);

        console.log("------------------------------------------------");
        console.log(`[Gemini] 🎭 LONG MESSAGE THEME SELECTED: "${longMessageTheme}"`);
        console.log(`[Gemini] 🔢 Theme Index: ${selectedThemeIndex}`);
        console.log("------------------------------------------------");
      }

      prompt = `
         You are TWO Radio DJs covering a shift together on "Horis FM".
         HOST 1 (Main): Named "${host1Name}"
         HOST 2 (Co-Host): Named "${host2Name}"
  
         - Song Ending: "${currentSong.title}" by ${currentSong.artist}
         - Song Starting: "${nextSong?.title}" by "${nextSong?.artist}"
         - Time: ${context} (${timeString})
         - Reference Location: ${userTimezone} (INTERNAL INFO - DO NOT mention this specific location string or "Welcome Europe" unless relevant to a specific theme)
         
         
         TONE/STYLE:
         ${styleInstruction}
         ${isLongMessage ? `\nVARIETY MODE: LONG MESSAGE. \nTheme: ${longMessageTheme}\nTake your time. You can use up to 4 sentences. Engage the listener.` : SHORT_MESSAGE_INSTRUCTION}
  
         ${historyBlock}
         ${playlistBlock}
  
         ${MARKUP_TAG_GUIDANCE}
  
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

         DJ CONSTRAINTS:
         - NEVER mention the literal 'Location' or 'Time' labels from the context above.
         - DO NOT say things like "Welcome Europe" just because the location says "Europe/Prague". Address your listeners naturally or stay localized to the music.
         - If referencing the time, do it naturally like a human ("Just past 9 o'clock", "Middle of the night here"). Do NOT use military time or read out the time exactly as shown in metadata.
         - Use location strictly for situational awareness (Weather/News/Flavor).
       `;

      console.log(`[Gemini] 🎙️ Generating DUAL DJ Intro: ${voice} & ${secondaryVoice}`);
      const script = await generateScript(prompt);
      if (!script) {
        console.warn("[Gemini] ⚠️ Dual DJ script generation failed.");
        return { audio: null, themeIndex: null };
      }

      console.log("------------------------------------------------");
      console.log(`[Gemini] 🤖 GENERATED DIALOGUE:\n"${script}"`);
      console.log("------------------------------------------------");

      if (debugSettings?.skipTTS) {
        console.log(`[Gemini] ⏩ DEBUG: skipTTS is enabled. Skipping audio synthesis.`);
        return { audio: null, themeIndex: selectedThemeIndex };
      }

      console.log(`[Gemini] 🎙️ Synthesizing full conversation at once...`);
      const audio = await speakText(script, voice, secondaryVoice, host1Name, host2Name, style);
      return { audio, themeIndex: selectedThemeIndex }; // Return selected theme index
    }

    // --- STANDARD SINGLE DJ LOGIC ---
    let selectedThemeIndex: number | null = null; // Declare at function scope

    if (nextSong?.requestedBy) {
      prompt = `
         You are a Radio DJ on "Horis FM". A listener named "${nextSong.requestedBy}" has requested the song "${nextSong.title}" by "${nextSong.artist}".
         They sent this message: "${nextSong.requestMessage}".
  
         Transition from "${currentSong.title}", shout out the listener, react to their message, and intro the new track.
         ${LENGTH_CONSTRAINT} Do not use stage directions like *laughs*.
  
         ${MARKUP_TAG_GUIDANCE}
  
         Important: ${langInstruction}
         `;
    } else {
      // Select Theme for Long Message (Single DJ)
      let longMessageTheme = "";

      if (isLongMessage) {
        const enabledThemes = debugSettings?.enabledThemes || [true, true, true, true, true, true];
        const forceTheme = debugSettings?.forceTheme ?? null;
        const verboseLogging = debugSettings?.verboseLogging || false;

        const themeSelection = selectTheme(recentThemeIndices, enabledThemes, forceTheme, verboseLogging, themeUsageHistory);
        selectedThemeIndex = themeSelection.index;
        longMessageTheme = themeSelection.theme.replace("${location}", userTimezone);

        console.log("------------------------------------------------");
        console.log(`[Gemini] 🎭 LONG MESSAGE THEME SELECTED: "${longMessageTheme}"`);
        console.log(`[Gemini] 🔢 Theme Index: ${selectedThemeIndex}`);
        console.log("------------------------------------------------");
      }

      prompt = `
        You are a specific persona: A Radio DJ on "Horis FM".
        
        CURRENT SITUATION:
        - Song Ending: "${currentSong.title}" by ${currentSong.artist}
        - Song Starting: "${nextSong?.title}" by "${nextSong?.artist}"
        - Time: ${context} (${timeString})
        - Reference Location: ${userTimezone} (INTERNAL INFO - DO NOT mention this specific location string or "Welcome Europe" unless relevant to a specific theme)
        
        ${historyBlock}
        ${playlistBlock}
  
        TASK:
        Generate a short, radio-realistic transition script.
        ${LENGTH_CONSTRAINT}
        
        
        STYLE PROTOCOL:
        ${styleInstruction}
        ${isLongMessage ? `\nVARIETY MODE: LONG MESSAGE. \nTheme: ${longMessageTheme}\nTake your time. You can use up to 4 sentences. Engage the listener.` : SHORT_MESSAGE_INSTRUCTION}
  
        ${MARKUP_TAG_GUIDANCE}
  
        TOOLS AVAILABLE:
        - You have access to Google Search.
        - USE IT to find fresh info if needed to make the link relevant.
        - DO NOT just list facts. Weave them into the flow.
        
        CONSTRAINTS:
        - Do NOT output stage directions (e.g. *scratches record*).
        - Do NOT say "Here is the script" or "Transition:".
        - Output ONLY the spoken words.
  
        Important: ${langInstruction}

        DJ CONSTRAINTS:
        - NEVER mention the literal 'Location' or 'Time' labels from the context above.
        - DO NOT say things like "Welcome Europe" just because the location says "Europe/Prague". Address your listeners naturally or stay localized to the music.
        - If referencing the time, do it naturally like a human ("Just past 9 o'clock", "Middle of the night here"). Do NOT use military time or read out the time exactly as shown in metadata.
        - Use location strictly for situational awareness (Weather/News/Flavor).
        `;
    }

    console.log(`[Gemini] 🎙️ Generating Intro for: Voice=${voice}, Style=${style}`);
    const script = await generateScript(prompt);
    if (!script) {
      console.warn("[Gemini] ⚠️ Standard script generation failed (empty response).");
      return { audio: null, themeIndex: null };
    }

    console.log("------------------------------------------------");
    console.log(`[Gemini] 🤖 GENERATED SCRIPT:\n"${script}"`);
    console.log("------------------------------------------------");

    if (debugSettings?.skipTTS) {
      console.log(`[Gemini] ⏩ DEBUG: skipTTS is enabled. Skipping audio synthesis.`);
      return { audio: null, themeIndex: selectedThemeIndex };
    }

    const audio = await speakText(script, voice, undefined, undefined, undefined, style);
    return { audio, themeIndex: selectedThemeIndex }; // Return theme index from selection
  } finally {
    console.timeEnd(label);
  }
};

export const generateCallBridging = async (
  callerName: string,
  reason: string,
  nextSong: Song | null,
  voice: DJVoice,
  language: AppLanguage
): Promise<{ intro: ArrayBuffer | null; outro: ArrayBuffer | null }> => {
  const label = `[Gemini:Timing] Total Call Bridging Process`;
  console.time(label);
  try {
    console.log(`[Gemini] 📞 Generating call bridging for ${callerName}...`);
    const langInstruction = getLanguageInstruction(language);

    const introPrompt = `
    You are a radio DJ on Horis FM. You are about to take a live call from a listener named "${callerName}".
    ${reason ? `They want to talk about: "${reason}".` : ""}
    
    Write a short, engaging introduction line to bring them on air.
    Example: "We've got [Name] on the line! How's it going?"
    Keep it under 15 words. Output ONLY the text. No stage directions.
    Important: ${langInstruction}
  `;

    const outroPrompt = `
    You are a radio DJ. You just finished talking to a listener named "${callerName}".
    Now you need to introduce the next song: "${nextSong?.title || "Unknown"}" by "${nextSong?.artist || "Unknown"
      }".
    
    Write a short outro thanking the caller and introducing the track.
    Example: "Thanks for calling in, [Name]. Here's [Song] by [Artist]."
    Keep it under 20 words. Output ONLY the text. No stage directions.
    Important: ${langInstruction}
  `;

    const [introText, outroText] = await Promise.all([
      generateScript(introPrompt),
      generateScript(outroPrompt),
    ]);

    const [introBuffer, outroBuffer] = await Promise.all([
      introText ? speakText(introText, voice) : null,
      outroText ? speakText(outroText, voice) : null,
    ]);

    return { intro: introBuffer, outro: outroBuffer };
  } finally {
    console.timeEnd(label);
  }
};
