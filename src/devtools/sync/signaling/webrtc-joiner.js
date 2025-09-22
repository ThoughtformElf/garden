// src/devtools/sync/signaling/webrtc-joiner.js
import debug from '../../../util/debug.js';

/**
 * Handles the logic for joining an existing WebRTC session.
 */
export class WebRtcJoiner {
    constructor(signalingInstance) {
        this.signaling = signalingInstance; // Reference to the main SyncSignaling instance
    }

    /**
     * Joins an existing WebRTC session.
     * @param {string} code The session code to join.
     */
    async joinSession(code) {
        const syncInstance = this.signaling.sync; // Get the main Sync instance
        try {
            syncInstance.isInitiator = false;
            syncInstance.sessionCode = code;
            syncInstance.updateStatus('Connecting to signaling server...');

            await this.signaling.connectToSignalingServer(); // Use delegate

            // Send join session request via the raw WebSocket reference
            if (this.signaling.ws && this.signaling.ws.readyState === WebSocket.OPEN) {
                 this.signaling.ws.send(JSON.stringify({
                    type: 'join_session',
                    sessionId: code
                 }));
            } else {
                 debug.error("DEBUG: WebSocket not open when trying to join session.");
                 syncInstance.updateStatus('Error: WebSocket not connected.');
                 syncInstance.addMessage('Error: WebSocket not connected.');
            }

            syncInstance.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Connection state listeners
            syncInstance.peerConnection.onconnectionstatechange = () => {
                debug.log("DEBUG: PeerConnection state:", syncInstance.peerConnection.connectionState);
                syncInstance.addMessage(`Connection state: ${syncInstance.peerConnection.connectionState}`);
                if (syncInstance.peerConnection.connectionState === 'failed' || syncInstance.peerConnection.connectionState === 'disconnected') {
                    if (this.signaling.ws && this.signaling.ws.readyState === WebSocket.OPEN) {
                        this.signaling._updateCurrentSyncMethodState('websocket');
                    } else {
                        this.signaling._updateCurrentSyncMethodState('none');
                    }
                }
            };

            syncInstance.peerConnection.oniceconnectionstatechange = () => {
                debug.log("DEBUG: ICE Connection state:", syncInstance.peerConnection.iceConnectionState);
                syncInstance.addMessage(`ICE state: ${syncInstance.peerConnection.iceConnectionState}`);
                if (syncInstance.peerConnection.iceConnectionState === 'failed' || syncInstance.peerConnection.iceConnectionState === 'disconnected') {
                    if (this.signaling.ws && this.signaling.ws.readyState === WebSocket.OPEN) {
                        this.signaling._updateCurrentSyncMethodState('websocket');
                    } else {
                        this.signaling._updateCurrentSyncMethodState('none');
                    }
                }
            };

            // Handle data channel for the joiner (received from initiator)
            syncInstance.peerConnection.ondatachannel = (event) => {
                debug.log("DEBUG: Data channel received");
                syncInstance.dataChannel = event.channel;

                // --- CRITICAL: Setup data channel listeners for the received channel ---
                // Update state on open/close/error for the received channel
                syncInstance.dataChannel.onopen = () => {
                    debug.log("DEBUG: Received data channel opened");
                    this.signaling._updateCurrentSyncMethodState('webrtc_active');
                    // Call the original setup logic from files.js
                    if (syncInstance.fileSync && typeof syncInstance.fileSync.setupDataChannel === 'function') {
                        syncInstance.fileSync.setupDataChannel(syncInstance.dataChannel);
                    }
                };

                syncInstance.dataChannel.onclose = () => {
                    debug.log("DEBUG: Received data channel closed");
                    this.signaling._updateCurrentSyncMethodState('webrtc_inactive');
                };

                syncInstance.dataChannel.onerror = (error) => {
                    debug.error("DEBUG: Received data channel error:", error);
                    this.signaling._updateCurrentSyncMethodState('webrtc_inactive');
                };
                // --- END CRITICAL ---
            };

            syncInstance.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    debug.log("DEBUG: Sending ICE candidate");
                    // Delegate signal sending
                    this.signaling.sendSignal({
                        type: 'candidate',
                        candidate: event.candidate
                    });
                }
            };

            syncInstance.updateStatus('Joining session...', code);
        } catch (error) {
            debug.error('Error joining session:', error);
            syncInstance.updateStatus('Error joining session: ' + error.message);
            syncInstance.addMessage(`Error: ${error.message}`);
        }
    }
}