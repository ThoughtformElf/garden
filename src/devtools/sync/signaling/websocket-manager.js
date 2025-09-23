// src/devtools/sync/signaling/websocket-manager.js
import debug from '../../../util/debug.js';

export class WebSocketManager {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    connectToSignalingServer() {
        return new Promise((resolve, reject) => {
            const serverUrl = this.signaling.signalingServerUrl;
            if (this.signaling.ws && this.signaling.ws.readyState === WebSocket.OPEN) {
                resolve();
                return;
            }
            
            this.signaling.ws = new WebSocket(serverUrl);

            this.signaling.ws.onopen = () => {
                debug.log(`Connected to signaling server at ${serverUrl}`);
                resolve();
            };

            this.signaling.ws.onclose = () => {
                debug.log('Disconnected from signaling server');
                // Only revert to disconnected state if we aren't in a stable P2P session.
                if (this.signaling.sync.connectionState !== 'connected-p2p') {
                    this.signaling.sync.updateConnectionState('disconnected', 'Signaling server disconnected.');
                }
            };

            this.signaling.ws.onerror = (error) => {
                debug.error('WebSocket error:', error);
                this.signaling.sync.updateConnectionState('error', 'Signaling server connection error.');
                reject(new Error(`Failed to connect to signaling server at ${serverUrl}`));
            };

            this.signaling.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (this.signaling._signalingMessageHandler) {
                         this.signaling._signalingMessageHandler.handleSignalingMessage(data);
                    }
                } catch (error) {
                    debug.error('Error parsing signaling message:', error);
                }
            };
        });
    }

    sendCreateSessionRequest(syncName) {
        const ws = this.signaling.ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'create_session',
                // This is the key change for the server to support persistent names
                sessionId: syncName 
            }));
        } else {
            debug.error("Cannot send create session request, WebSocket is not open.");
            this.signaling.sync.updateConnectionState('error', 'Cannot create session, not connected.');
        }
    }

    sendSignal(data) {
        const ws = this.signaling.ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'signal', data: data }));
        }
    }
}