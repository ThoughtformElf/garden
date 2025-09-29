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
                this.signaling.sync.disconnect();
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

    sendJoinSessionRequest(syncName) {
        const ws = this.signaling.ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'join_session',
                sessionId: syncName 
            }));
        } else {
            debug.error("Cannot send join session request, WebSocket is not open.");
        }
    }

    sendSignal(data, targetPeerId) {
        const ws = this.signaling.ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'signal',
                target: targetPeerId,
                data: data
            }));
        }
    }
}