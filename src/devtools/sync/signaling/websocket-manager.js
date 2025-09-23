// src/devtools/sync/signaling/websocket-manager.js
import debug from '../../../util/debug.js';

/**
 * Manages the underlying WebSocket connection to the signaling server.
 * Handles connection lifecycle and initial message parsing.
 */
export class WebSocketManager {
    constructor(signalingInstance) {
        this.signaling = signalingInstance; // Reference to the main SyncSignaling instance
    }

    /**
     * Establishes the WebSocket connection.
     * @returns {Promise<void>} Resolves when connected, rejects on error.
     */
    connectToSignalingServer() {
        return new Promise((resolve, reject) => {
            // Access the URL from the main signaling instance
            const serverUrl = this.signaling.signalingServerUrl;
            this.signaling.ws = new WebSocket(serverUrl);

            this.signaling.ws.onopen = () => {
                debug.log(`Connected to signaling server at ${serverUrl}`);
                resolve();
                // Potentially update state if no better method is available yet
                // Delegate state update to the main instance
                if (this.signaling.getCurrentSyncMethodState() === 'none') {
                    this.signaling._updateCurrentSyncMethodState('websocket');
                }
            };

            this.signaling.ws.onclose = () => {
                debug.log('Disconnected from signaling server');
                // Reset sync method state on disconnection
                // Delegate state update to the main instance
                this.signaling._updateCurrentSyncMethodState('none');
            };

            this.signaling.ws.onerror = (error) => {
                debug.error('WebSocket error:', error);
                // Reset sync method state on error
                // Delegate state update to the main instance
                this.signaling._updateCurrentSyncMethodState('none');
                reject(new Error(`Failed to connect to signaling server at ${serverUrl}`));
            };

            this.signaling.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Delegate message handling to the dedicated handler
                    if (this.signaling._signalingMessageHandler) {
                         this.signaling._signalingMessageHandler.handleSignalingMessage(data);
                    } else {
                        debug.error("DEBUG: Signaling message handler not available to process message:", data);
                    }
                } catch (error) {
                    debug.error('Error parsing signaling message:', error);
                }
            };
        });
    }

    /**
     * Sends a raw signal message through the WebSocket.
     * @param {Object} data The signal data to send.
     */
    sendSignal(data) {
        const ws = this.signaling.ws; // Get ws reference from main instance
        if (ws && ws.readyState === WebSocket.OPEN) {
            debug.log("DEBUG: Sending signal via WebSocket:", data.type);
            ws.send(JSON.stringify({
                type: 'signal',
                data: data
            }));
        }
    }
}