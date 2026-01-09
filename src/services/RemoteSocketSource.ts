import { ILiveInputSource } from './liveCallService';
import { Blob as GenAIBlob } from '@google/genai';

// Extension side code doesn't use 'ws' package directly usually (browser native WebSocket), 
// but for type safety it's fine. We use native WebSocket here.

export class RemoteSocketSource implements ILiveInputSource {
    public name = "Remote Caller";
    private port: chrome.runtime.Port | null = null;
    private hostId: string;

    private onStatusChange: (status: string) => void;

    private onCallRequest: ((data: { name: string; message: string }) => void) | null = null;

    // We hold the 'onAudioData' callback provided by the Service
    private propagateAudio: ((blob: GenAIBlob) => void) | null = null;

    constructor(
        hostId: string,
        onStatusChange: (s: string) => void,
        onCallRequest?: (data: { name: string; message: string }) => void
    ) {
        this.hostId = hostId;
        this.onStatusChange = onStatusChange;
        if (onCallRequest) this.onCallRequest = onCallRequest;
    }

    public setStatusCallback(callback: (status: string) => void) {
        this.onStatusChange = callback;
    }

    public setCallRequestCallback(callback: (data: { name: string; message: string }) => void) {
        this.onCallRequest = callback;
    }

    public sendGoLive() {
        if (this.port) {
            console.log('[RemoteSocketSource] Sending GO_LIVE signal via Proxy');
            this.port.postMessage({ type: 'SEND_TEXT', payload: { type: 'GO_LIVE' } });
        }
    }

    async initialize(context: AudioContext): Promise<void> {
        // No local media initialization needed for remote source
        return Promise.resolve();
    }

    connect(context: AudioContext, onAudioData: (pcmBlob: GenAIBlob) => void): void {
        this.propagateAudio = onAudioData;

        // Ensure we are connected via Proxy
        if (!this.port) {
            this.initProxyConnection();
        }
    }

    private initProxyConnection() {
        console.log('[RemoteSocketSource] Connecting to Background Proxy...');
        this.onStatusChange('CONNECTING_PROXY...');

        try {
            this.port = chrome.runtime.connect({ name: 'remote-socket-proxy' });

            this.port.onMessage.addListener((msg) => {
                this.handleProxyMessage(msg);
            });

            this.port.onDisconnect.addListener(() => {
                console.log('[RemoteSocketSource] Proxy Port Disconnected');
                this.onStatusChange('PROXY_DISCONNECTED');
                this.port = null;
            });

        } catch (e) {
            console.error('[RemoteSocketSource] Failed to connect to extension background:', e);
            this.onStatusChange('EXTENSION_ERROR');
        }
    }

    private handleProxyMessage(msg: any) {
        switch (msg.type) {
            case 'PROXY_STATUS':
                if (msg.status === 'OPEN') {
                    console.log('[RemoteSocketSource] Proxy WS Open. Registering Host:', this.hostId);
                    this.onStatusChange('WAITING_FOR_CALL');
                    // Send Register Command
                    this.port?.postMessage({
                        type: 'SEND_TEXT',
                        payload: { type: 'REGISTER_HOST', hostId: this.hostId }
                    });
                } else if (msg.status === 'CLOSED') {
                    console.log('[RemoteSocketSource] Proxy WS Closed. Code:', msg.code);
                    this.onStatusChange('RELAY_DISCONNECTED');
                }
                break;

            case 'AUDIO_DATA':
                if (this.propagateAudio && msg.data) {
                    // msg.data is Base64 string from background
                    this.propagateAudio({
                        data: msg.data,
                        mimeType: 'audio/pcm;rate=16000'
                    });
                }
                break;

            case 'CONTROL_MSG':
                const payload = msg.data;
                this.handleControlMessage(payload);
                break;

            case 'PROXY_ERROR':
                console.error('[RemoteSocketSource] Proxy reported error:', msg.error);
                break;
        }
    }

    private handleControlMessage(msg: any) {
        if (msg.type === 'GUEST_CONNECTED') {
            console.log('[RemoteSocketSource] Guest Connected:', msg.callerName);
            this.onStatusChange(`CALLER_CONNECTED:${msg.callerName}`);
        }
        else if (msg.type === 'GUEST_DISCONNECTED') {
            console.log('[RemoteSocketSource] Guest Disconnected');
            this.onStatusChange('WAITING_FOR_CALL');
        }
        else if (msg.type === 'CALL_REQUEST') {
            console.log('[RemoteSocketSource] Call Request:', msg);
            if (this.onCallRequest) {
                this.onCallRequest({ name: msg.name, message: msg.message });
            }
        }
    }

    disconnect(): void {
        if (this.port) {
            this.port.disconnect();
            this.port = null;
        }
        this.propagateAudio = null;
    }
}
