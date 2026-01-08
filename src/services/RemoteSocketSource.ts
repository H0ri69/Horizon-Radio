import { ILiveInputSource } from './liveCallService';
import { Blob as GenAIBlob } from '@google/genai';

// Extension side code doesn't use 'ws' package directly usually (browser native WebSocket), 
// but for type safety it's fine. We use native WebSocket here.

export class RemoteSocketSource implements ILiveInputSource {
    public name = "Remote Caller";
    private ws: WebSocket | null = null;
    private hostId: string;
    private relayUrl: string;
    private onStatusChange: (status: string) => void;
    
    // We hold the 'onAudioData' callback provided by the Service
    private propagateAudio: ((blob: GenAIBlob) => void) | null = null;

    constructor(hostId: string, relayUrl: string, onStatusChange: (s: string) => void) {
        this.hostId = hostId;
        this.relayUrl = relayUrl;
        this.onStatusChange = onStatusChange;
    }

    public setStatusCallback(callback: (status: string) => void) {
        this.onStatusChange = callback;
    }

    async initialize(context: AudioContext): Promise<void> {
        // No local media initialization needed for remote source
        return Promise.resolve();
    }

    connect(context: AudioContext, onAudioData: (pcmBlob: GenAIBlob) => void): void {
        this.propagateAudio = onAudioData;

        // Ensure we are connected to Relay
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
             this.initWebSocket();
        }
    }

    private initWebSocket() {
        console.log('[RemoteSocketSource] Connecting to Relay:', this.relayUrl);
        this.onStatusChange('CONNECTING TO RELAY...');
        
        this.ws = new WebSocket(this.relayUrl);
        this.ws.binaryType = 'arraybuffer'; // Crucial for receiving raw audio

        this.ws.onopen = () => {
            console.log('[RemoteSocketSource] Connected to Relay. Registering as Host:', this.hostId);
            this.ws?.send(JSON.stringify({ type: 'REGISTER_HOST', hostId: this.hostId }));
            this.onStatusChange('WAITING FOR CALL...');
        };

        this.ws.onmessage = (event) => {
            // Handle Audio (Binary)
            if (event.data instanceof ArrayBuffer) {
                if (this.propagateAudio) {
                    // Convert ArrayBuffer to Blob for Gemini
                    // Gemini expects "audio/pcm"
                    const blob = new Blob([event.data], { type: 'audio/pcm' });
                    // Gemini Blob type: { data: string (base64) | Blob, mimeType: string }
                    // Wait, the SDK expects a specific format.
                    // Let's check liveCallService usage: `createPcmBlob` returns { data: base64, mimeType... }
                    // We need to match that format? Or does SDK accept raw Blob?
                    // SDK `Session.sendRealtimeInput` -> `media: { mimeType, data }`
                    
                    // We need to convert ArrayBuffer -> Base64
                    const base64 = this.arrayBufferToBase64(event.data);
                    this.propagateAudio({ 
                        data: base64, 
                        mimeType: 'audio/pcm;rate=16000' 
                    });
                }
                return;
            }

            // Handle Text (Control)
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'GUEST_CONNECTED') {
                    console.log('[RemoteSocketSource] Guest Connected:', msg.callerName);
                    this.onStatusChange(`CALLER: ${msg.callerName}`);
                }
                else if (msg.type === 'GUEST_DISCONNECTED') {
                    console.log('[RemoteSocketSource] Guest Disconnected');
                    this.onStatusChange('WAITING FOR CALL...');
                }
            } catch (e) {
                console.error('Invalid message', e);
            }
        };

        this.ws.onclose = () => {
            console.log('[RemoteSocketSource] Disconnected from Relay');
            this.onStatusChange('RELAY DISCONNECTED');
        };
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.propagateAudio = null;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}
