
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

    constructor() { }

    public async startSession(config: LiveCallConfig) {
        this.config = config;
        this.isLiveActive = true;
        this.config.onStatusChange('CONNECTING CALL...');

        try {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            this.liveInputContext = new AudioCtx();
            this.liveOutputContext = new AudioCtx();

            // Output Node
            const outputNode = this.liveOutputContext.createGain();
            outputNode.connect(this.liveOutputContext.destination);

            // Input Stream (Microphone)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.liveStream = stream;

            // Silence Detection Vars
            let lastUserAudioTime = Date.now();
            let silenceWarningSent = false;

            // Silence Check Loop
            if (this.liveSilenceInterval) clearInterval(this.liveSilenceInterval);
            this.liveSilenceInterval = setInterval(() => {
                if (!this.liveSession) return;
                const timeSinceLastAudio = Date.now() - lastUserAudioTime;
                if (timeSinceLastAudio > 10000 && !silenceWarningSent) {
                    console.log("[Hori-s] Silence detected. Nudging model.");
                    silenceWarningSent = true;
                    this.liveSession.then((session: any) => {
                        session.send({
                            clientContent: {
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: "SYSTEM_NOTE: The caller has been silent for 10 seconds. Politely ask if they are there or wrap up the call." }]
                                }]
                            }
                        });
                    });
                }
            }, 1000);

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
                    You are DJ "Horis". You are live on air taking a call from listener "${config.callerName}".
                    ${config.reason ? `They want to talk about: "${config.reason}".` : ''}
                    You are about to play: "${config.nextSongTitle}".
                    
                    Guidelines:
                    1. Keep the conversation engaging but brief (target 30-60 seconds).
                    2. Be cool, witty, and high energy.
                    3. CRITICAL: You MUST call the function 'endCall' to hang up when the conversation reaches a natural stopping point.
                    4. If the user stops responding or there is 10+ seconds of silence: Politely say goodbye and call 'endCall'.
                    
                    IMPORTANT: ${langInstruction}
                    ${voiceInstruction}
                  `,
                    tools: [{ functionDeclarations: [transitionTool] }],
                },
            };

            // Connect
            const sessionPromise = ai.live.connect({
                ...sessionConfig,
                callbacks: {
                    onopen: () => {
                        this.config?.onStatusChange('LIVE: ON AIR');
                        if (!this.liveInputContext || !this.liveStream) return;

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
                                source.addEventListener('ended', () => this.liveSources.delete(source));
                                source.start(this.liveNextStartTime);
                                this.liveNextStartTime += audioBuffer.duration;
                                this.liveSources.add(source);
                            } catch (e) {
                                console.error("Audio decode error", e);
                            }
                        }
                    },
                    onclose: () => {
                        if (this.isLiveActive) this.cleanupSession(true);
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

        if (this.liveSession) this.liveSession = null;

        if (this.liveStream) {
            this.liveStream.getTracks().forEach(track => track.stop());
            this.liveStream = null;
        }

        if (this.liveInputContext) {
            this.liveInputContext.close();
            this.liveInputContext = null;
        }

        if (this.liveOutputContext) {
            this.liveOutputContext.close();
            this.liveOutputContext = null;
        }

        if (this.liveSilenceInterval) {
            clearInterval(this.liveSilenceInterval);
            this.liveSilenceInterval = null;
        }

        this.liveSources.forEach(source => { try { source.stop(); } catch (e) { } });
        this.liveSources.clear();
        this.liveNextStartTime = 0;

        if (graceful && this.config) {
            this.config.onCallEnd();
        }
    }
}

export const liveCallService = new LiveCallService();
