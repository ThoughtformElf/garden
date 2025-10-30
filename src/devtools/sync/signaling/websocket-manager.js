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
                console.log(`Connected to signaling server at ${serverUrl}`);
                resolve();
            };

            this.signaling.ws.onclose = () => {
                console.log('Disconnected from signaling server');
                this.signaling.sync.disconnect();
            };

            this.signaling.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
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
                    console.error('Error parsing signaling message:', error);
                }
            };
        });
    }

    sendJoinSessionRequest(syncName, peerNamePrefix) {
        const ws = this.signaling.ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
            // --- THIS IS THE FIX ---
            // Include the unique browser session ID in the join request.
            // This allows the signaling server to announce it to other peers.
            const payload = {
                type: 'join_session',
                sessionId: syncName,
                browserSessionId: this.signaling.sync.sessionId
            };
            if (peerNamePrefix) {
                payload.peerNamePrefix = peerNamePrefix;
            }
            ws.send(JSON.stringify(payload));
            // --- END OF FIX ---
        } else {
            console.error("Cannot send join session request, WebSocket is not open.");
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