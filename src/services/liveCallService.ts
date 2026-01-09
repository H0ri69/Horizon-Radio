import browser from "webextension-polyfill";
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, StartSensitivity, EndSensitivity, Blob } from "@google/genai";
import { decodeAudio, decodeAudioData, createPcmBlob, downsampleTo16k } from './liveAudioUtils';
import { DJVoice, AppLanguage } from '../types';
import { MODEL_MAPPING, VOICE_PROFILES, DJStyle, AUDIO, generateLiveSystemInstruction } from "@/config";

// --- Input Source Abstraction ---

export interface ILiveInputSource {
    name: string;
    /**
     * Prepare the input source (e.g., request permissions, get stream).
     * Must be called before connect.
     */
    initialize(context: AudioContext): Promise<void>;

    /**
     * Start sending audio data.
     * @param context The AudioContext to use for processing (if applicable)
     * @param onAudioData Callback to receive ready-to-send PCM Blobs
     */
    connect(context: AudioContext, onAudioData: (pcmBlob: Blob) => void): void;

    /**
     * Stop and cleanup resources.
     */
    disconnect(): void;

    /**
     * Optional: Register a callback to be notified when the source disconnects unexpectedly (e.g. remote user hung up).
     */
    setOnDisconnect?(callback: () => void): void;
}

export class LocalMicSource implements ILiveInputSource {
    public name = "Local Microphone";
    private stream: MediaStream | null = null;
    private audioSource: MediaStreamAudioSourceNode | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;

    async initialize(context: AudioContext): Promise<void> {
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1,
            }
        });
    }

    connect(context: AudioContext, onAudioData: (pcmBlob: Blob) => void): void {
        if (!this.stream) {
            console.error("[LocalMicSource] Cannot connect: Stream not initialized");
            return;
        }

        // Create nodes
        this.audioSource = context.createMediaStreamSource(this.stream);
        this.scriptProcessor = context.createScriptProcessor(AUDIO.BUFFER_SIZE, 1, 1);

        // Handle audio process
        this.scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);

            // Convert to Gemini-compatible PCM
            const pcmBlob = createPcmBlob(downsampleTo16k(inputData, context.sampleRate));
            onAudioData(pcmBlob);
        };

        // Connect graph
        this.audioSource.connect(this.scriptProcessor);
        this.scriptProcessor.connect(context.destination);
    }

    disconnect(): void {
        if (this.scriptProcessor) {
            this.scriptProcessor.onaudioprocess = null;
            try { this.scriptProcessor.disconnect(); } catch (e) { /* ignore */ }
            this.scriptProcessor = null;
        }
        if (this.audioSource) {
            try { this.audioSource.disconnect(); } catch (e) { /* ignore */ }
            this.audioSource = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    setOnDisconnect(callback: () => void): void {
        // Local mic usually doesn't "disconnect" in a way that needs external handling 
        // unless permissions are revoked, which is handled in onprocess error usually.
        // We could listen to stream.onended?
        if (this.stream) {
             (this.stream as any).oninactive = callback;
        }
    }
}

// --- Main Service ---

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
    onSessionStart?: () => void;
    // Future: inputSource?: ILiveInputSource;
}

export class LiveCallService {
    private liveInputContext: AudioContext | null = null;
    private liveOutputContext: AudioContext | null = null;

    // Abstracted Input Source
    private inputSource: ILiveInputSource = new LocalMicSource();

    private liveSession: any = null; // Resolved session object
    private liveSources: Set<AudioBufferSourceNode> = new Set();
    private liveNextStartTime: number = 0;
    private isLiveActive: boolean = false;

    private config: LiveCallConfig | null = null;
    private currentSessionId: number = 0; // Track which session is active

    // Bug fix: Promise to await session resolution before using it
    private sessionResolve: ((session: any) => void) | null = null;

    // Bug fix: Prevent double onCallEnd calls
    private callEndFired: boolean = false;

    constructor() { }

    public async startSession(config: LiveCallConfig & { inputSource?: ILiveInputSource }) {
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

        // Use custom input source if provided (for Remote Calls), otherwise default to LocalMic
        if (config.inputSource) {
            console.log(`[Hori-s] Using custom input source: ${config.inputSource.name}`);
            this.inputSource = config.inputSource;
        } else {
            // ensure fresh instance for fresh stream
            this.inputSource = new LocalMicSource();
        }

        try {
            console.log(`[Hori-s] Creating AI client for session #${sessionId}`);

            // Get Call History for context and settings for limit
            const storageResult = await browser.storage.local.get(["horisCallHistory", "horisFmSettings"]);
            const history: any[] = Array.isArray(storageResult.horisCallHistory) ? storageResult.horisCallHistory : [];
            const callHistoryLimit = (storageResult.horisFmSettings as any)?.debug?.callHistoryLimit || 5;

            // Check if this specific person has called before
            const isRepeatCaller = history.some(h => h.name.toLowerCase() === config.callerName.toLowerCase());

            const callHistoryContext = history.length > 0
                ? history.map((h: any) => `- ${h.name} (Topic: ${h.reason || 'None'})`).join("\n")
                : "No previous callers recorded.";

            // Save this caller to history (limit by configurable setting)
            // We filter out previous entries of the same name to keep it clean
            const filteredHistory = history.filter(h => h.name.toLowerCase() !== config.callerName.toLowerCase());
            const updatedHistory = [{ name: config.callerName, reason: config.reason, timestamp: Date.now() }, ...filteredHistory].slice(0, callHistoryLimit);
            browser.storage.local.set({ horisCallHistory: updatedHistory });

            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

            console.log(`[Hori-s] Creating audio contexts for session #${sessionId}`);

            // CLEANUP: Close existing contexts if they were left open
            if (this.liveInputContext) {
                try { await this.liveInputContext.close(); } catch (e) { }
                this.liveInputContext = null;
            }
            if (this.liveOutputContext) {
                try { await this.liveOutputContext.close(); } catch (e) { }
                this.liveOutputContext = null;
            }

            this.liveInputContext = new AudioCtx();
            this.liveOutputContext = new AudioCtx();
            console.log(`[Hori-s] Input context state: ${this.liveInputContext.state}, Output context state: ${this.liveOutputContext.state}`);

            // Output Node
            const outputNode = this.liveOutputContext.createGain();
            outputNode.connect(this.liveOutputContext.destination);

            // Ensure output context is running
            if (this.liveOutputContext.state === 'suspended') {
                await this.liveOutputContext.resume();
            }

            // Initialize Input Source (e.g. Mic Permissions)
            try {
                await this.inputSource.initialize(this.liveInputContext);
            } catch (inputError) {
                console.error('[Hori-s] Input source initialization failed:', inputError);
                if (inputError instanceof Error && (inputError.name === 'NotAllowedError' || inputError.name === 'PermissionDeniedError')) {
                    this.config.onStatusChange('MIC ACCESS DENIED');
                } else {
                    this.config.onStatusChange('INPUT ERROR'); // Generic error
                }

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

            // Monitor Input Source Disconnection (e.g. Remote caller hung up)
            if (this.inputSource.setOnDisconnect) {
                this.inputSource.setOnDisconnect(() => {
                    console.log(`[Hori-s] Input source #${sessionId} disconnected unexpectedly. Ending session.`);
                    // We assume the caller left, so we should clean up.
                    // Depending on UX, we might want Gemini to say "Goodbye" or just cut it.
                    // For now, let's just cut it gracefully.
                    if (this.isLiveActive) {
                        this.cleanupSession(true);
                    }
                });
            }

            // Session will be stored once connected
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
                model: MODEL_MAPPING.LIVE.PRO,
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

                        // Wait for session to be fully resolved
                        const session = await sessionReadyPromise;
                        resolvedSession = session;

                        if (!this.liveInputContext) {
                            console.warn(`[Hori-s] Missing input context for session #${sessionId}`);
                            return;
                        }

                        console.log(`[Hori-s] Connecting input source for session #${sessionId}`);

                        // Connect Input Source
                        this.inputSource.connect(this.liveInputContext, (pcmBlob) => {
                            if (!resolvedSession) return;
                            resolvedSession.sendRealtimeInput({ media: pcmBlob });
                        });
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        if (msg.setupComplete) {
                            console.log(`[Hori-s] Setup complete for session #${sessionId}. Triggering intro.`);
                            // Trigger session start callback (e.g. for Remote GO LIVE signal)
                            this.config?.onSessionStart?.();

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
                                this.liveSources.forEach(s => {
                                    try { s.stop(); } catch (e) { }
                                });
                                this.liveSources.clear();
                                this.liveNextStartTime = this.liveOutputContext?.currentTime || 0;
                            }
                        }

                        if (msg.toolCall) {
                            console.log(`[Hori-s] 🛠️ Tool call received in session #${sessionId}:`, msg.toolCall);
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

                                source.addEventListener('ended', () => {
                                    this.liveSources.delete(source);

                                    if (sessionId !== this.currentSessionId) return;

                                    if (!this.isLiveActive && this.liveSources.size === 0) {
                                        console.log("[Hori-s] All audio finished. Final cleanup.");
                                        setTimeout(() => {
                                            if (this.liveSources.size === 0 && this.liveOutputContext) {
                                                this.liveOutputContext.close();
                                                this.liveOutputContext = null;
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

            sessionPromise.then(session => {
                this.liveSession = session;
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

        if (this.liveSession) {
            try { this.liveSession.close(); } catch (e) { /* ignore */ }
            this.liveSession = null;
        }

        // Cleanup Input Source
        this.inputSource.disconnect();

        // Close input context
        if (this.liveInputContext) {
            this.liveInputContext.close();
            this.liveInputContext = null;
        }

        console.log(`[Hori-s] ${this.liveSources.size} audio sources still playing. Waiting for them to finish...`);

        if (this.liveSources.size === 0) {
            console.log("[Hori-s] No audio playing. Cleaning up immediately.");
            if (this.liveOutputContext) {
                this.liveOutputContext.close();
                this.liveOutputContext = null;
            }
            this.liveNextStartTime = 0;
            if (graceful && this.config && !this.callEndFired) {
                this.callEndFired = true;
                this.config.onCallEnd();
            }
        }
    }
}

export const liveCallService = new LiveCallService();
