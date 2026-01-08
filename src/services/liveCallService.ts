
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { decodeAudio, decodeAudioData, createPcmBlob, downsampleTo16k } from './liveAudioUtils';
import { DJVoice, AppLanguage } from '../types';

interface LiveCallConfig {
    apiKey: string;
    callerName: string;
    reason: string;
    nextSongTitle: string;
    voice: DJVoice;
    language: AppLanguage;
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

            // Input Stream (Microphone)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
            const langInstruction = config.language === 'cs' ? "Speak in Czech." : config.language === 'ja' ? "Speak in Japanese." : "Speak in English.";
            const voiceInstruction = config.voice.toLowerCase().includes('charon')
                ? "Speak deeply, calmly, and professionally like a podcast host."
                : "Speak naturally and clearly. Do not hype."; // Default fallback

            const sessionConfig = {
                model: 'gemini-2.0-flash-exp', // Use latest appropriate model
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } } },
                    systemInstruction: `
                    You are DJ "Horis" on a live radio show. A listener named "${config.callerName}" has just called in.
                    ${config.reason ? `Their message: "${config.reason}"` : ''}
                    The next song you're about to play is: "${config.nextSongTitle}".
                    
                    CRITICAL INSTRUCTIONS:
                    1. START SPEAKING IMMEDIATELY when the call connects. Greet them enthusiastically: "Hey ${config.callerName}! You're live on Horis FM!"
                    2. ${config.reason ? `Acknowledge their message: "${config.reason}"` : 'Ask them what they want to talk about'}
                    3. Have a REAL CONVERSATION - ask follow-up questions, react to what they say, keep it engaging
                    4. DON'T rush to end the call - let the conversation flow naturally for at least 30-60 seconds
                    5. Let the CALLER decide when to end - if they say goodbye, farewell, or indicate they're done, THEN call 'endCall'
                    6. ONLY call 'endCall' yourself if:
                       - The caller clearly says goodbye/farewell/thanks/etc
                       - The conversation has gone on for 90+ seconds (you're the safety timeout)
                       - There's an awkward silence and you've tried to re-engage
                    7. Be cool, witty, high-energy, and genuinely interested in what they have to say
                    8. DO NOT end the call after just one exchange - have multiple back-and-forth exchanges
                    
                    Language: ${langInstruction}
                    Voice style: ${voiceInstruction}
                  `,
                    tools: [{ functionDeclarations: [transitionTool] }],
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
                        console.log(`[Hori-s] Received message for session #${sessionId}:`, msg.serverContent ? 'audio/text' : msg.toolCall ? 'tool call' : 'unknown');

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
                                    console.log(`[Hori-s] Audio chunk finished (${audioBuffer.duration.toFixed(2)}s) [Session #${sessionId}]`);
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
                                console.log(`[Hori-s] Audio chunk started playing at ${this.liveNextStartTime.toFixed(2)}s`);
                                this.liveNextStartTime += audioBuffer.duration;
                                this.liveSources.add(source);
                                console.log(`[Hori-s] Queued audio chunk: ${audioBuffer.duration.toFixed(2)}s (${this.liveSources.size} active) - will play at ${this.liveNextStartTime.toFixed(2)}s`);
                            } catch (e) {
                                console.error("Audio decode error", e);
                            }
                        }
                    },
                    onclose: () => {
                        if (this.isLiveActive) {
                            console.log("[Hori-s] Connection closed. Waiting for audio to finish...");
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
