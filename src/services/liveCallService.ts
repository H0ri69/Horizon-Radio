
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, StartSensitivity, EndSensitivity } from "@google/genai";
import { decodeAudio, decodeAudioData, createPcmBlob, downsampleTo16k } from './liveAudioUtils';
import { DJVoice, AppLanguage } from '../types';
import { MODEL_MAPPING, VOICE_PROFILES, DJStyle } from "@/config";

// TTS Performance Prompts (defined inline to avoid circular dependency)
// These control HOW the AI speaks (voice performance, delivery, pacing)
const TTS_PERFORMANCE_PROMPTS: Record<string, string | undefined> = {
    [DJStyle.STANDARD]: "SCENE: Professional radio studio. Keep a slight 'smile' in the voice. Performance: Use [excited] for high-tempo song intros and [professional] for station IDs. Speak with high-end condenser mic proximity.",
    [DJStyle.CHILL]: "SCENE: Late-night candlelit booth. Performance: Soft, rhythmic delivery. Use a [warm], intimate voice with [nostalgic] or [empathetic] undertones. Lean into the mic.",
    [DJStyle.TECHNICAL]: "SCENE: High-tech podcasting setup. Performance: Rapid, knowledgeable fire. Sound [cheerful] or [amazed] when sharing fun facts. Be very [professional] with technical specs.",
    [DJStyle.MINIMAL]: "Neutral, clean, and robotic station voice ID.",
    [DJStyle.ASMR]: "SCENE: Binaural microphone setup. Performance: Maximum proximity, ultra-soft whispering. Minimal vocal intensity.",
    [DJStyle.DRUNK]: "SCENE: Talking to a friend in a dark living room. Performance: Tipsy and slightly [sarcastic] or [laughing]. Pacing should be erratic with frequent [uhm] and [short pause].",
    [DJStyle.CUSTOM]: undefined,
};
interface LiveCallConfig {
    apiKey: string;
    callerName: string;
    reason: string;
    previousSongTitle: string;
    previousSongArtist: string;
    nextSongTitle: string;
    nextSongArtist: string;
    voice: DJVoice;
    language: AppLanguage;
    style: DJStyle;
    customPrompt?: string;
    dualDjMode: boolean;
    secondaryPersonaName?: string;
    onStatusChange: (status: string) => void;
    onUnrecoverableError: () => void;
    onCallEnd: () => void;
}

export class LiveCallService {
    private liveInputContext: AudioContext | null = null;
    private liveOutputContext: AudioContext | null = null;
    private liveStream: MediaStream | null = null;
    private liveSession: Promise<any> | null = null;
    private liveSources: Set<AudioBufferSourceNode> = new Set();
    private liveNextStartTime: number = 0;
    private liveSilenceInterval: any = null;
    private isLiveActive: boolean = false;

    private config: LiveCallConfig | null = null;
    private currentSessionId: number = 0; // Track which session is active

    constructor() { }

    public async startSession(config: LiveCallConfig) {
        // Increment session ID to invalidate old event handlers
        this.currentSessionId++;
        const sessionId = this.currentSessionId;
        console.log(`[Hori-s] Starting session #${sessionId}`);

        this.config = config;
        this.isLiveActive = true;
        this.liveNextStartTime = 0;
        this.liveSources.clear();
        this.config.onStatusChange('CONNECTING CALL...');

        try {
            console.log(`[Hori-s] Creating AI client for session #${sessionId}`);

            // Get Call History for context
            const historyResult = await chrome.storage.local.get(["horisCallHistory"]);
            const history: any[] = Array.isArray(historyResult.horisCallHistory) ? historyResult.horisCallHistory : [];

            // Check if this specific person has called before
            const isRepeatCaller = history.some(h => h.name.toLowerCase() === config.callerName.toLowerCase());
            const repeatCallerNote = isRepeatCaller
                ? `NOTE: ${config.callerName} is a REPEAT CALLER. Welcome them back to the show!`
                : "";

            const callHistoryContext = history.length > 0
                ? history.map((h: any) => `- ${h.name} (Topic: ${h.reason || 'None'})`).join("\n")
                : "No previous callers recorded.";

            // Save this caller to history (limit to last 5)
            // We filter out previous entries of the same name to keep it clean
            const filteredHistory = history.filter(h => h.name.toLowerCase() !== config.callerName.toLowerCase());
            const updatedHistory = [{ name: config.callerName, reason: config.reason, timestamp: Date.now() }, ...filteredHistory].slice(0, 5);
            chrome.storage.local.set({ horisCallHistory: updatedHistory });

            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

            console.log(`[Hori-s] Creating audio contexts for session #${sessionId}`);
            this.liveInputContext = new AudioCtx();
            this.liveOutputContext = new AudioCtx();
            console.log(`[Hori-s] Input context state: ${this.liveInputContext.state}, Output context state: ${this.liveOutputContext.state}`);

            // Output Node
            const outputNode = this.liveOutputContext.createGain();
            outputNode.connect(this.liveOutputContext.destination);

            // Ensure output context is running (might be suspended on subsequent calls)
            if (this.liveOutputContext.state === 'suspended') {
                console.log(`[Hori-s] Resuming suspended output context for session #${sessionId}`);
                await this.liveOutputContext.resume();
                console.log(`[Hori-s] Output context resumed. New state: ${this.liveOutputContext.state}`);
            }

            // Input Stream (Microphone) with professional processing
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                }
            });
            this.liveStream = stream;

            // Silence Detection Vars
            let lastUserAudioTime = Date.now();
            let silenceWarningSent = false;

            // Silence Check Loop - DISABLED
            // The DJ will control call duration via the endCall function
            // Silence detection was interfering with natural conversation flow
            /*
            if (this.liveSilenceInterval) clearInterval(this.liveSilenceInterval);
            this.liveSilenceInterval = setInterval(() => {
                if (!this.liveSession) return;
                const timeSinceLastAudio = Date.now() - lastUserAudioTime;
                if (timeSinceLastAudio > 60000 && !silenceWarningSent) {
                    console.log("[Hori-s] Silence detected (60s). DJ should wrap up based on system instruction.");
                    silenceWarningSent = true;
                }
            }, 1000);
            */

            // Tool Definition
            const transitionTool: FunctionDeclaration = {
                name: 'endCall',
                description: 'Terminates the live broadcast call. MUST be called to hang up the phone and return to music.',
                parameters: { type: Type.OBJECT, properties: {} },
            };

            // Session Configuration
            const langInstruction = config.language === 'cs'
                ? "Entire conversation MUST be in Czech (čeština). Use natural, colloquial Czech grammar."
                : config.language === 'ja'
                    ? "Entire conversation MUST be in Japanese (日本語). Use natural, conversational Japanese."
                    : "Speak in English.";

            // Build Persona/Style Instruction
            // Map DJStyle to a punchy live instruction
            const stylePrompts: Record<string, string> = {
                [DJStyle.STANDARD]: "ACTING: You are a high-energy, confident morning-show DJ. Keep things moving, stay upbeat, and sound extremely polished and professional.",
                [DJStyle.CHILL]: "ACTING: You are a deep, soothing late-night radio host. Speak slowly, intimately, and softly. Breathe between sentences. Total 'Chill' vibes.",
                [DJStyle.TECHNICAL]: "ACTING: You are a music historian and audio nerd. Use technical terms, mention bitrates or production history, and stay genuinely excited about metadata.",
                [DJStyle.MINIMAL]: "ACTING: You are a neutral automated voice. Extremely efficient. No small talk. Just facts and standard radio etiquette.",
                [DJStyle.ASMR]: "ACTING: You are an ASMR host. WHISPER EVERYTHING. Every word must be a gentle whisper. Focus on being soothing and quiet. NEVER RAISE YOUR VOICE.",
                [DJStyle.DRUNK]: "ACTING: You are tipsy (3-4 drinks in). Ramble a bit, trail off mid-sentence, chuckle at yourself, and get easily distracted by small things. Not total slurring, just 'pleasantly buzzed' energy.",
            };

            const styleInstruction = config.style === DJStyle.CUSTOM
                ? `ACTING: Roleplay this CUSTOM Persona defined by the user: ${config.customPrompt || "Professional DJ"}`
                : stylePrompts[config.style] || stylePrompts[DJStyle.STANDARD];

            const voiceInstruction = config.voice.toLowerCase().includes('charon')
                ? "Speak deeply, calmly, and professionally like a podcast host."
                : "Speak naturally and clearly. Do not hype."; // Default fallback

            const dualDjNote = config.dualDjMode && config.secondaryPersonaName
                ? `NARRATIVE NOTE: You are currently on a shift with your co-host ${config.secondaryPersonaName}, but they are BUSY (e.g., grabbing coffee, fixing a cable, or at the mixing board). You are handling this listener call SOLO. Briefly mention their absence to the caller.`
                : "";

            const voiceProfile = VOICE_PROFILES.find(p => p.id === config.voice);
            const gender = voiceProfile?.gender || "Male";
            const genderInstruction = gender === "Female"
                ? "IDENTITY: You are a FEMALE speaker. Use female self-references and female gendered grammar."
                : gender === "Robot"
                    ? "IDENTITY: You are a ROBOT. Use neutral, artificial tone."
                    : "IDENTITY: You are a MALE speaker. Use male self-references and male gendered grammar.";

            // Get TTS Performance Instruction (controls HOW to speak)
            const ttsPerformanceInstruction = config.style === DJStyle.CUSTOM
                ? `Performance Direction: Embody the persona "${config.customPrompt || "Professional DJ"}" through your voice delivery, pacing, and tone. Let the character influence HOW you speak, not just WHAT you say.`
                : TTS_PERFORMANCE_PROMPTS[config.style] || "";

            console.log(`[Hori-s] 🎙️ Live Call Style: ${config.style}${config.style === DJStyle.CUSTOM && config.customPrompt ? ` (Custom: "${config.customPrompt}")` : ""}`);
            if (ttsPerformanceInstruction) {
                console.log(`[Hori-s] 🎭 TTS Performance: ${ttsPerformanceInstruction.substring(0, 100)}...`);
            }

            const sessionConfig = {
                model: MODEL_MAPPING.LIVE.PRO, // Use latest appropriate model
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } } },
                    systemInstruction: `
                    ${repeatCallerNote}
                    ${dualDjNote}
                    
                    ${genderInstruction}
                    ${styleInstruction}
                    ${ttsPerformanceInstruction ? `\n\nVOICE PERFORMANCE DIRECTION:\n${ttsPerformanceInstruction}` : ""}
                    
                    You are currently ON THE AIR on Hori-s FM. A listener named "${config.callerName}" has just called in.
                    Song context: Ended "${config.previousSongTitle}", Next "${config.nextSongTitle}".
                    
                    CRITICAL INSTRUCTIONS:
                    1. START SPEAKING IMMEDIATELY when the call connects. 
                    2. START with a standard song transition: Briefly mention/outro the song that just ended ("${config.previousSongTitle}"). 
                    3. THEN, smoothly transition to introducing the caller: "Wait, we've got a caller on the line! ${config.callerName}, you're live on Horis FM!"
                    4. ${isRepeatCaller ? "WELCOME THEM BACK warmly, referencing the fact they've been on the show before." : (config.reason ? `Acknowledge their reason for calling: "${config.reason}"` : "Ask them what's on their mind.")}
                    5. Have a REAL CONVERSATION - ask follow-up questions, react to what they say, keep it engaging. Do NOT just ask "what do you want to talk about" every time. 
                    6. DON'T rush to end the call - let the conversation flow naturally for at least 30-60 seconds.
                    7. Let the CALLER decide when to end - if they say goodbye or indicate they're done, THEN follow the "Goodbye Sequence":
                       - Say a warm goodbye to "${config.callerName}".
                       - Transition to the next song: Introduce "${config.nextSongTitle}" by "${config.nextSongArtist}" enthusiastically.
                       - IMMEDIATELY call 'endCall' AFTER you finish speaking the next song's introduction.
                    8. ONLY call 'endCall' yourself if:
                       - The caller clearly says goodbye/farewell.
                       - The conversation has gone on for 120+ seconds (safety timeout).
                       - There's a long silence.
                    9. Use natural vocal fillers (e.g., "Uh-huh", "Gotcha", "Oh wow", "Exactly") sparingly when the user is speaking to show you are listening.
                    10. If the user interrupts you, stop mid-sentence and pivot immediately to react to their interruption.
                    11. Speak as if you are wearing a high-quality broadcast headset—close to the mic, warm, intimate, and professional.
                    13. You can occasionally chuckle or react emotionally to what the caller says.
                    14. YOU HAVE ACCESS TO GOOGLE SEARCH. If the caller asks for facts, weather, news, or scores, USE IT to provide accurate "live" information. Interpret results naturally.
                    
                    HISTORY OF PREVIOUS CALLERS THIS SHIFT:
                    ${callHistoryContext}
                    
                    Language: ${langInstruction}
                    Voice style: ${voiceInstruction}
                  `,
                    tools: [{ googleSearch: {} }, { functionDeclarations: [transitionTool] }],
                    realtimeInputConfig: {
                        automaticActivityDetection: {
                            disabled: false,
                            silenceDurationMs: 500,
                            startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
                            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
                        }
                    }
                },
            };

            // Connect
            const sessionPromise = ai.live.connect({
                ...sessionConfig,
                callbacks: {
                    onopen: () => {
                        console.log(`[Hori-s] WebSocket opened for session #${sessionId}`);
                        this.config?.onStatusChange('LIVE: ON AIR');
                        if (!this.liveInputContext || !this.liveStream) {
                            console.error(`[Hori-s] Missing input context or stream for session #${sessionId}`);
                            return;
                        }

                        console.log(`[Hori-s] Setting up audio input for session #${sessionId}`);

                        const source = this.liveInputContext.createMediaStreamSource(this.liveStream);
                        const scriptProcessor = this.liveInputContext.createScriptProcessor(4096, 1, 1);

                        scriptProcessor.onaudioprocess = (e) => {
                            if (!this.liveInputContext) return;
                            const inputData = e.inputBuffer.getChannelData(0);

                            // RMS Calculation for Silence Detection
                            let sum = 0;
                            for (let i = 0; i < inputData.length; i++) {
                                sum += inputData[i] * inputData[i];
                            }
                            const rms = Math.sqrt(sum / inputData.length);
                            if (rms > 0.02) {
                                lastUserAudioTime = Date.now();
                                silenceWarningSent = false;
                            }

                            // Send Audio
                            const pcmBlob = createPcmBlob(downsampleTo16k(inputData, this.liveInputContext.sampleRate));
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(this.liveInputContext.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        if (msg.setupComplete) {
                            console.log(`[Hori-s] Setup complete for session #${sessionId}. Triggering intro.`);
                            // Trigger the first response immediately after setup
                            sessionPromise.then((session) => {
                                session.sendClientContent({
                                    turns: [{
                                        role: 'user',
                                        parts: [{ text: "SYSTEM_NOTE: The call has just connected. Start your introduction immediately as per your instructions." }]
                                    }],
                                    turnComplete: true
                                });
                            });
                        }

                        if (msg.serverContent) {
                            const { modelTurn, interrupted, turnComplete } = msg.serverContent;
                            if (interrupted) {
                                console.log(`[Hori-s] 🛑 Model interrupted by user in session #${sessionId}`);
                                // Stop all currently playing/queued audio chunks from the model
                                this.liveSources.forEach(s => {
                                    try { s.stop(); } catch (e) { }
                                });
                                this.liveSources.clear();
                                this.liveNextStartTime = this.liveOutputContext?.currentTime || 0;
                            }
                            if (modelTurn) {
                                // Noisy log removed
                            }
                        }

                        if (msg.toolCall) {
                            console.log(`[Hori-s] 🛠️ Tool call received in session #${sessionId}:`, msg.toolCall);
                        }

                        // Handle Tool Calls (Hangup)
                        if (msg.toolCall) {
                            for (const fc of msg.toolCall.functionCalls!) {
                                if (fc.name === 'endCall') {
                                    sessionPromise.then(session => session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "ok" } }] }));
                                    const ctx = this.liveOutputContext;
                                    if (ctx) {
                                        // Wait for audio queue to finish then end
                                        const remaining = Math.max(0, this.liveNextStartTime - ctx.currentTime);
                                        setTimeout(() => this.cleanupSession(true), remaining * 1000 + 1000);
                                    } else {
                                        setTimeout(() => this.cleanupSession(true), 1000);
                                    }
                                }
                            }
                        }

                        // Handle Audio Response
                        const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && this.liveOutputContext) {
                            const ctx = this.liveOutputContext;
                            this.liveNextStartTime = Math.max(this.liveNextStartTime, ctx.currentTime);
                            try {
                                const audioBuffer = await decodeAudioData(decodeAudio(base64Audio), ctx, 24000, 1);
                                const source = ctx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputNode);

                                // Track when this source finishes
                                source.addEventListener('ended', () => {
                                    this.liveSources.delete(source);

                                    // Only trigger cleanup if this is still the active session
                                    if (sessionId !== this.currentSessionId) {
                                        console.log(`[Hori-s] Ignoring ended event from old session #${sessionId} (current: #${this.currentSessionId})`);
                                        return;
                                    }

                                    // If no more sources are playing and session is inactive, finish cleanup
                                    if (!this.isLiveActive && this.liveSources.size === 0) {
                                        console.log("[Hori-s] All audio finished. Final cleanup.");
                                        if (this.liveOutputContext) {
                                            this.liveOutputContext.close();
                                            this.liveOutputContext = null;
                                        }
                                        if (this.config) {
                                            this.config.onCallEnd();
                                        }
                                    }
                                });

                                source.start(this.liveNextStartTime);
                                this.liveNextStartTime += audioBuffer.duration;
                                this.liveSources.add(source);
                            } catch (e) {
                                console.error("Audio decode error", e);
                            }
                        }
                    },
                    onclose: (event?: any) => {
                        if (this.isLiveActive) {
                            console.log(`[Hori-s] WebSocket connection closed for session #${sessionId}. Event:`, event);
                            const ctx = this.liveOutputContext;
                            if (ctx) {
                                // Wait for all queued audio to finish playing
                                const remaining = Math.max(0, this.liveNextStartTime - ctx.currentTime);
                                console.log(`[Hori-s] ${remaining.toFixed(2)}s of audio remaining`);
                                setTimeout(() => this.cleanupSession(true), remaining * 1000 + 500);
                            } else {
                                this.cleanupSession(true);
                            }
                        }
                    },
                    onerror: (e) => {
                        console.error("Live session error", e);
                        this.cleanupSession(false);
                        this.config?.onUnrecoverableError();
                    }
                }
            });
            this.liveSession = sessionPromise;

        } catch (e) {
            console.error("Failed to start live session", e);
            this.config?.onUnrecoverableError();
            this.cleanupSession(false);
        }
    }

    public cleanupSession(graceful: boolean = true) {
        if (!this.isLiveActive) return;

        console.log("[Hori-s] Cleaning up live session...");
        this.isLiveActive = false;

        // Close WebSocket
        if (this.liveSession) this.liveSession = null;

        // Stop microphone
        if (this.liveStream) {
            this.liveStream.getTracks().forEach(track => track.stop());
            this.liveStream = null;
        }

        // Close input context (no more recording)
        if (this.liveInputContext) {
            this.liveInputContext.close();
            this.liveInputContext = null;
        }

        // Stop silence detection
        if (this.liveSilenceInterval) {
            clearInterval(this.liveSilenceInterval);
            this.liveSilenceInterval = null;
        }

        // DON'T close output context or stop sources
        // Let the audio sources finish naturally via their 'ended' event handlers
        console.log(`[Hori-s] ${this.liveSources.size} audio sources still playing. Waiting for them to finish...`);

        // If no audio is playing, clean up immediately
        if (this.liveSources.size === 0) {
            console.log("[Hori-s] No audio playing. Cleaning up immediately.");
            if (this.liveOutputContext) {
                this.liveOutputContext.close();
                this.liveOutputContext = null;
            }
            this.liveNextStartTime = 0;
            if (graceful && this.config) {
                this.config.onCallEnd();
            }
        }
        // Otherwise, the 'ended' event handler will call onCallEnd when all audio finishes
    }
}

export const liveCallService = new LiveCallService();
