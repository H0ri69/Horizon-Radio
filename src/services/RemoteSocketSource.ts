import { ILiveInputSource } from './liveCallService';
import { Blob as GenAIBlob } from '@google/genai';
import { logger } from "../utils/Logger";

// Extension side code doesn't use 'ws' package directly usually (browser native WebSocket), 
// but for type safety it's fine. We use native WebSocket here.

export class RemoteSocketSource implements ILiveInputSource {
    public name = "Remote Caller";
    private port: chrome.runtime.Port | null = null;
    private hostId: string;
    private statusListeners: ((status: string) => void)[] = [];
    private callRequestListeners: ((data: { name: string; message: string }) => void)[] = [];

    // We hold the 'onAudioData' callback provided by the Service
    private propagateAudio: ((blob: GenAIBlob) => void) | null = null;

    constructor(
        hostId: string
    ) {
        this.hostId = hostId;
    }

    public addStatusListener(callback: (status: string) => void) {
        this.statusListeners.push(callback);
    }

    public removeStatusListener(callback: (status: string) => void) {
        this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    }

    public addCallRequestListener(callback: (data: { name: string; message: string }) => void) {
        this.callRequestListeners.push(callback);
    }

    public removeCallRequestListener(callback: (data: { name: string; message: string }) => void) {
        this.callRequestListeners = this.callRequestListeners.filter(cb => cb !== callback);
    }

    private emitStatus(status: string) {
        this.statusListeners.forEach(cb => cb(status));
    }

    private emitCallRequest(data: { name: string; message: string }) {
        this.callRequestListeners.forEach(cb => cb(data));
    }

    public sendGoLive() {
        if (this.port) {
            logger.debug('[RemoteSocketSource] Sending GO_LIVE signal via Proxy');
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
        logger.debug('[RemoteSocketSource] Connecting to Background Proxy...');
        this.emitStatus('CONNECTING_PROXY...');

        try {
            this.port = chrome.runtime.connect({ name: 'remote-socket-proxy' });

            this.port.onMessage.addListener((msg) => {
                this.handleProxyMessage(msg);
            });

            this.port.onDisconnect.addListener(() => {
                logger.debug('[RemoteSocketSource] Proxy Port Disconnected');
                this.emitStatus('PROXY_DISCONNECTED');
                this.port = null;
            });

        } catch (e) {
            logger.error('[RemoteSocketSource] Failed to connect to extension background:', e);
            this.emitStatus('EXTENSION_ERROR');
        }
    }

    private handleProxyMessage(msg: any) {
        switch (msg.type) {
            case 'PROXY_STATUS':
                if (msg.status === 'OPEN') {
                    logger.debug('[RemoteSocketSource] Proxy WS Open. Registering Host:', this.hostId);
                    this.emitStatus('WAITING_FOR_CALL');
                    // Send Register Command
                    this.port?.postMessage({
                        type: 'SEND_TEXT',
                        payload: { type: 'REGISTER_HOST', hostId: this.hostId }
                    });
                } else if (msg.status === 'CLOSED') {
                    logger.debug('[RemoteSocketSource] Proxy WS Closed. Code:', msg.code);
                    this.emitStatus('RELAY_DISCONNECTED');
                    // Also trigger disconnect callback to cleanup any active session
                    if (this.onDisconnectCallback) this.onDisconnectCallback();
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

    private onDisconnectCallback: (() => void) | null = null;

    public setOnDisconnect(callback: () => void) {
        this.onDisconnectCallback = callback;
    }

    private handleControlMessage(msg: any) {
        if (msg.type === 'GUEST_CONNECTED') {
            logger.debug('[RemoteSocketSource] Guest Connected:', msg.callerName);
            this.emitStatus(`CALLER_CONNECTED:${msg.callerName}`);
        }
        else if (msg.type === 'GUEST_DISCONNECTED') {
            logger.debug('[RemoteSocketSource] Guest Disconnected');
            this.emitStatus('WAITING_FOR_CALL');
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        }
        else if (msg.type === 'CALL_REQUEST') {
            logger.debug('[RemoteSocketSource] Call Request:', msg);
            this.emitCallRequest({ name: msg.name, message: msg.message });
        }
    }

    /**
     * Terminate the connection and Notify the remote user (Hang up).
     */
    disconnect(): void {
        logger.debug("[RemoteSocketSource] disconnect() called (Sending END_CALL)");

        // Notify Relay -> Guest that we hung up
        if (this.port) {
            logger.debug('[RemoteSocketSource] Sending END_CALL signal');
            this.port.postMessage({ type: 'SEND_TEXT', payload: { type: 'END_CALL' } });
            this.port.disconnect(); // Actually close the port too
            this.port = null;
        }

        this.propagateAudio = null;
    }

    /**
     * Close the local connection WITHOUT notifying the remote user.
     * Use this when transferring the session or just closing the UI.
     */
    detach(): void {
        logger.debug("[RemoteSocketSource] detach() called (Silent Close)");
        if (this.port) {
            this.port.disconnect();
            this.port = null;
        }
        this.propagateAudio = null;
    }

    /**
     * Call this if you strictly want to close the connection (e.g. settings change)
     */
    public destroy() {
        this.detach();
    }
}
