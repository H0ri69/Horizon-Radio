const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8765;
const wss = new WebSocketServer({ port: PORT });

// Store active Hosts (Extension instances)
// Key: hostId (string), Value: WebSocket
const hosts = new Map();

// Store active Guests (Phone callers)
// Key: WebSocket, Value: { hostId: string }
const guests = new Map();

console.log(`[Relay] Server started on port ${PORT}`);

wss.on('connection', (ws) => {
    let isAlive = true;
    ws.on('pong', () => { isAlive = true; });

    // Keep-alive loop
    const interval = setInterval(() => {
        if (isAlive === false) return ws.terminate();
        isAlive = false;
        ws.ping();
    }, 30000);

    ws.on('message', (data, isBinary) => {
        // Handle Binary Audio Data -> Forward to Host
        if (isBinary) {
            const guestInfo = guests.get(ws);
            if (guestInfo && guestInfo.hostId) {
                const hostWs = hosts.get(guestInfo.hostId);
                if (hostWs && hostWs.readyState === WebSocket.OPEN) {
                    hostWs.send(data); // Forward audio blob directly
                }
            }
            return;
        }

        // Handle Text Control Messages
        try {
            const message = JSON.parse(data.toString());
            handleMessage(ws, message);
        } catch (e) {
            console.error('[Relay] Invalid JSON received:', e.message);
        }
    });

    ws.on('close', () => {
        clearInterval(interval);
        handleDisconnect(ws);
    });

    ws.on('error', console.error);
});

function handleMessage(ws, msg) {
    switch (msg.type) {
        case 'REGISTER_HOST':
            if (!msg.hostId) return;
            console.log(`[Relay] Host registered: ${msg.hostId}`);
            
            // If this host was already connected, close old connection? 
            // Or just overwrite. Overwriting is safer for extension reloads.
            hosts.set(msg.hostId, ws);
            
            // Tag this socket as a host
            ws.isHost = true;
            ws.hostId = msg.hostId;
            
            ws.send(JSON.stringify({ type: 'STATUS', status: 'REGISTERED' }));
            break;

        case 'CONNECT_GUEST':
            if (!msg.targetHostId) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Missing targetHostId' }));
                return;
            }

            const hostWs = hosts.get(msg.targetHostId);
            if (!hostWs || hostWs.readyState !== WebSocket.OPEN) {
                console.warn(`[Relay] Guest tried to connect to offline host: ${msg.targetHostId}`);
                ws.send(JSON.stringify({ type: 'ERROR', message: 'HOST_OFFLINE' }));
                return;
            }

            console.log(`[Relay] Guest connected to host: ${msg.targetHostId}`);
            guests.set(ws, { hostId: msg.targetHostId });
            
            // Notify Guest
            ws.send(JSON.stringify({ type: 'STATUS', status: 'CONNECTED' }));
            
            // Notify Host (Optional, but good for UI)
            hostWs.send(JSON.stringify({ 
                type: 'GUEST_CONNECTED', 
                callerName: msg.callerName || 'Unknown Caller' 
            }));
            break;

        case 'CALL_REQUEST':
             // Guest -> Host (Request to join queue)
             const targetHost = guests.get(ws)?.hostId;
             if (targetHost) {
                 const hWs = hosts.get(targetHost);
                 if (hWs && hWs.readyState === WebSocket.OPEN) {
                     console.log(`[Relay] Forwarding CALL_REQUEST from Guest to Host: ${targetHost}`);
                     hWs.send(JSON.stringify({
                         type: 'CALL_REQUEST',
                         name: msg.name,
                         message: msg.message
                     }));
                 } else {
                     console.warn(`[Relay] Failed to forward CALL_REQUEST: Host ${targetHost} not found or offline.`);
                 }
             }
             break;

        case 'GO_LIVE':
            // Host -> Guest (Signal to start speaking/recording)
            console.log(`[Relay] Broadcasting GO_LIVE for Host: ${ws.hostId}`);
            let recipientCount = 0;
            for (const [guestWs, info] of guests.entries()) {
                if (info.hostId === ws.hostId && guestWs.readyState === WebSocket.OPEN) {
                    guestWs.send(JSON.stringify({ type: 'GO_LIVE' }));
                    recipientCount++;
                }
            }
            console.log(`[Relay] Sent GO_LIVE to ${recipientCount} guests.`);
            break;

        default:
            console.warn('[Relay] Unknown message type:', msg.type);
    }
}

function handleDisconnect(ws) {
    if (ws.isHost) {
        console.log(`[Relay] Host disconnected: ${ws.hostId}`);
        hosts.delete(ws.hostId);
        // Optional: Disconnect all guests tailored to this host?
        // For now, let's leave them hanging or implement a timeout.
    } else {
        const guestInfo = guests.get(ws);
        if (guestInfo) {
            console.log(`[Relay] Guest disconnected from host: ${guestInfo.hostId}`);
            // Notify Host
            const hostWs = hosts.get(guestInfo.hostId);
            if (hostWs && hostWs.readyState === WebSocket.OPEN) {
                hostWs.send(JSON.stringify({ type: 'GUEST_DISCONNECTED' }));
            }
            guests.delete(ws);
        }
    }
}
