
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, StartSensitivity, EndSensitivity } from "@google/genai";
import { decodeAudio, decodeAudioData, createPcmBlob, downsampleTo16k } from './liveAudioUtils';
import { DJVoice, AppLanguage } from '../types';
import { MODEL_MAPPING, VOICE_PROFILES, DJStyle, AUDIO, generateLiveSystemInstruction } from "@/config";

interface LiveCallConfig {
    apiKey: string;
    callerName: string;
    reason: string;
    previousSongTitle: string;
    previousSongArtist: string;
    nextSongTitle: string;
    nextSongArtist: string;
    voice: DJVoice;
    personaName: string;
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
    private liveSession: any = null; // Resolved session object
    private liveSources: Set<AudioBufferSourceNode> = new Set();
    private liveNextStartTime: number = 0;
    private isLiveActive: boolean = false;

    private config: LiveCallConfig | null = null;
    private currentSessionId: number = 0; // Track which session is active
    
    // Bug fix: Track audio nodes for proper cleanup
    private audioSource: MediaStreamAudioSourceNode | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    
    // Bug fix: Promise to await session resolution before using it
    private sessionResolve: ((session: any) => void) | null = null;
    
    // Bug fix: Prevent double onCallEnd calls
    private callEndFired: boolean = false;

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
        this.callEndFired = false; // Reset for new session
        this.config.onStatusChange('CONNECTING CALL...');

        try {
            console.log(`[Hori-s] Creating AI client for session #${sessionId}`);

            // Get Call History for context
            const historyResult = await chrome.storage.local.get(["horisCallHistory"]);
            const history: any[] = Array.isArray(historyResult.horisCallHistory) ? historyResult.horisCallHistory : [];

            // Check if this specific person has called before
            const isRepeatCaller = history.some(h => h.name.toLowerCase() === config.callerName.toLowerCase());

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
            
             // CLEANUP: Close existing contexts if they were left open
            if (this.liveInputContext) {
                try { await this.liveInputContext.close(); } catch(e) {}
                this.liveInputContext = null;
            }
            if (this.liveOutputContext) {
                try { await this.liveOutputContext.close(); } catch(e) {}
                this.liveOutputContext = null;
            }

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
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: 1,
                    }
                });
                this.liveStream = stream;
            } catch (micError) {
                console.error('[Hori-s] Microphone access denied or failed:', micError);
                this.config.onStatusChange('MIC ACCESS DENIED');

                // Clean up contexts
                if (this.liveOutputContext) {
                    this.liveOutputContext.close();
                    this.liveOutputContext = null;
                }
                if (this.liveInputContext) {
                    this.liveInputContext.close();
                    this.liveInputContext = null;
                }

                // Notify error and return
                this.config.onUnrecoverableError();
                return;
            }

            // Session will be stored once connected - using Promise to avoid race condition (Bug #2 fix)
            let resolvedSession: any = null;
            const sessionReadyPromise = new Promise<any>((resolve) => {
                this.sessionResolve = resolve;
            });

            // Tool Definition
            const transitionTool: FunctionDeclaration = {
                name: 'endCall',
                description: 'Terminates the live broadcast call. MUST be called to hang up the phone and return to music.',
                parameters: { type: Type.OBJECT, properties: {} },
            };

            // Session Configuration
            const voiceProfile = VOICE_PROFILES.find(p => p.id === config.voice);
            const systemInstruction = generateLiveSystemInstruction(
                config.personaName,
                config.callerName,
                config.previousSongTitle,
                config.previousSongArtist,
                config.nextSongTitle,
                config.nextSongArtist,
                config.reason,
                isRepeatCaller,
                config.dualDjMode,
                config.secondaryPersonaName,
                config.style,
                config.customPrompt,
                config.language,
                callHistoryContext,
                voiceProfile
            );

            console.log(`[Hori-s] 🎙️ Live Call Style: ${config.style}${config.style === DJStyle.CUSTOM && config.customPrompt ? ` (Custom: "${config.customPrompt}")` : ""}`);


            const sessionConfig = {
                model: MODEL_MAPPING.LIVE.PRO, // Use latest appropriate model
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceProfile?.geminiVoiceName || config.voice } } },
                    systemInstruction,
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
                    onopen: async () => {
                        console.log(`[Hori-s] WebSocket opened for session #${sessionId}`);
                        this.config?.onStatusChange('LIVE: ON AIR');
                        
                        // Bug #2 fix: Wait for session to be fully resolved before setting up audio
                        const session = await sessionReadyPromise;
                        resolvedSession = session;
                        
                        if (!this.liveInputContext || !this.liveStream) {
                            console.error(`[Hori-s] Missing input context or stream for session #${sessionId}`);
                            return;
                        }

                        console.log(`[Hori-s] Setting up audio input for session #${sessionId}`);

                        // Bug #4 fix: Store references for proper cleanup
                        this.audioSource = this.liveInputContext.createMediaStreamSource(this.liveStream);
                        this.scriptProcessor = this.liveInputContext.createScriptProcessor(AUDIO.BUFFER_SIZE, 1, 1);

                        this.scriptProcessor.onaudioprocess = (e) => {
                            if (!this.liveInputContext || !resolvedSession) return;
                            const inputData = e.inputBuffer.getChannelData(0);

                            // Send Audio directly to resolved session (no race condition)
                            const pcmBlob = createPcmBlob(downsampleTo16k(inputData, this.liveInputContext.sampleRate));
                            resolvedSession.sendRealtimeInput({ media: pcmBlob });
                        };

                        this.audioSource.connect(this.scriptProcessor);
                        this.scriptProcessor.connect(this.liveInputContext.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        if (msg.setupComplete) {
                            console.log(`[Hori-s] Setup complete for session #${sessionId}. Triggering intro.`);
                            // Bug #2 fix: Await session before sending initial message
                            const session = await sessionReadyPromise;
                            session.sendClientContent({
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: "SYSTEM_NOTE: The call has just connected. Start your introduction immediately as per your instructions." }]
                                }],
                                turnComplete: true
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
                        }

                        if (msg.toolCall) {
                            console.log(`[Hori-s] 🛠️ Tool call received in session #${sessionId}:`, msg.toolCall);
                        }

                        // Handle Tool Calls (Hangup)
                        if (msg.toolCall) {
                            for (const fc of msg.toolCall.functionCalls!) {
                                if (fc.name === 'endCall') {
                                    if (resolvedSession) resolvedSession.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "ok" } }] });
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
                                const audioBuffer = await decodeAudioData(decodeAudio(base64Audio), ctx, AUDIO.SAMPLE_RATE_OUTPUT, 1);
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

                                        // Double-check no sources are queued before closing
                                        setTimeout(() => {
                                            if (this.liveSources.size === 0 && this.liveOutputContext) {
                                                this.liveOutputContext.close();
                                                this.liveOutputContext = null;

                                                // Bug #3 fix: Guard against double onCallEnd calls
                                                if (this.config && !this.callEndFired) {
                                                    this.callEndFired = true;
                                                    this.config.onCallEnd();
                                                }
                                            }
                                        }, 100);
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
            
            // Store resolved session and notify awaiting callbacks (Bug #2 fix)
            sessionPromise.then(session => {
                resolvedSession = session;
                this.liveSession = session;
                // Resolve the promise so awaiting callbacks can proceed
                if (this.sessionResolve) {
                    this.sessionResolve(session);
                    this.sessionResolve = null;
                }
            });

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

        // Close WebSocket session properly
        if (this.liveSession) {
            try { this.liveSession.close(); } catch (e) { /* ignore */ }
            this.liveSession = null;
        }

        // Bug #4 fix: Explicitly disconnect audio nodes before closing context
        if (this.scriptProcessor) {
            try {
                this.scriptProcessor.onaudioprocess = null; // Remove handler
                this.scriptProcessor.disconnect();
            } catch (e) { /* ignore */ }
            this.scriptProcessor = null;
        }
        if (this.audioSource) {
            try { this.audioSource.disconnect(); } catch (e) { /* ignore */ }
            this.audioSource = null;
        }

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
            // Bug #3 fix: Guard against double onCallEnd calls
            if (graceful && this.config && !this.callEndFired) {
                this.callEndFired = true;
                this.config.onCallEnd();
            }
        }
        // Otherwise, the 'ended' event handler will call onCallEnd when all audio finishes
    }
}

export const liveCallService = new LiveCallService();
