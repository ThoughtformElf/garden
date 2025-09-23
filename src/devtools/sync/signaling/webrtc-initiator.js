// src/devtools/sync/signaling/webrtc-initiator.js
import debug from '../../../util/debug.js';

/**
 * Handles the logic for creating and managing the WebRTC connection
 * when this peer is the initiator (creates the session).
 */
export class WebRtcInitiator {
    constructor(signalingInstance) {
        this.signaling = signalingInstance; // Reference to the main SyncSignaling instance
    }

    /**
     * Starts a new WebRTC session (initiator).
     */
    async startSession() {
        const syncInstance = this.signaling.sync; // Get the main Sync instance
        try {
            syncInstance.isInitiator = true;
            syncInstance.updateStatus('Connecting to signaling server...');

            await this.signaling.connectToSignalingServer(); // Use delegate

            syncInstance.peerConnection = new RTCPeerConnection({
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                  { urls: 'stun:stun.services.mozilla.com' }
                ]
            });

            // Connection state listeners
            syncInstance.peerConnection.onconnectionstatechange = () => {
                debug.log("DEBUG: PeerConnection state:", syncInstance.peerConnection.connectionState);
                syncInstance.addMessage(`Connection state: ${syncInstance.peerConnection.connectionState}`);
                // Update sync method state based on overall connection state if it's problematic
                if (syncInstance.peerConnection.connectionState === 'failed' || syncInstance.peerConnection.connectionState === 'disconnected') {
                    // If main connection fails, fall back to signaling state
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
                // Update sync method state based on ICE state if it's problematic
                if (syncInstance.peerConnection.iceConnectionState === 'failed' || syncInstance.peerConnection.iceConnectionState === 'disconnected') {
                    // If ICE fails, fall back to signaling state
                    if (this.signaling.ws && this.signaling.ws.readyState === WebSocket.OPEN) {
                        this.signaling._updateCurrentSyncMethodState('websocket');
                    } else {
                        this.signaling._updateCurrentSyncMethodState('none');
                    }
                }
            };

            debug.log("DEBUG: Creating data channel");
            syncInstance.dataChannel = syncInstance.peerConnection.createDataChannel('syncChannel');

            // --- CRITICAL: Setup data channel listeners to update sync method state ---
            syncInstance.dataChannel.onopen = () => {
                debug.log("DEBUG: Data channel opened");
                this.signaling._updateCurrentSyncMethodState('webrtc_active');
                // Call the original setup logic from files.js
                if (syncInstance.fileSync && typeof syncInstance.fileSync.setupDataChannel === 'function') {
                    syncInstance.fileSync.setupDataChannel(syncInstance.dataChannel);
                }
            };

            syncInstance.dataChannel.onclose = () => {
                debug.log("DEBUG: Data channel closed");
                this.signaling._updateCurrentSyncMethodState('webrtc_inactive');
            };

            syncInstance.dataChannel.onerror = (error) => {
                debug.error("DEBUG: Data channel error:", error);
                this.signaling._updateCurrentSyncMethodState('webrtc_inactive');
            };
            // --- END CRITICAL ---

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

            debug.log("DEBUG: Requesting session creation from server");
            // Send session creation request via the WebSocket manager
            if (this.signaling.ws && this.signaling.ws.readyState === WebSocket.OPEN) {
                 this.signaling.ws.send(JSON.stringify({
                    type: 'create_session'
                 }));
            } else {
                 debug.error("DEBUG: WebSocket not open when trying to create session.");
                 syncInstance.updateStatus('Error: WebSocket not connected.');
                 syncInstance.addMessage('Error: WebSocket not connected.');
            }

            syncInstance.updateStatus('Creating session...');
        } catch (error) {
            debug.error('Error starting session:', error);
            syncInstance.updateStatus('Error starting session: ' + error.message);
            syncInstance.addMessage(`Error: ${error.message}`);
        }
    }

    /**
     * Creates and sends an offer after the peer has joined.
     */
    async createOfferAfterPeerJoined() {
        const syncInstance = this.signaling.sync; // Get the main Sync instance
        try {
            if (!syncInstance.peerConnection) {
                debug.error("DEBUG: createOfferAfterPeerJoined called but peerConnection is null");
                return;
            }

            debug.log("DEBUG: Creating offer");
            const offer = await syncInstance.peerConnection.createOffer();
            await syncInstance.peerConnection.setLocalDescription(offer);

            debug.log("DEBUG: Sending offer");
            // Delegate signal sending
            this.signaling.sendSignal({ type: 'offer', sdp: offer.sdp });

        } catch (error) {
            debug.error('Error creating/sending offer after peer joined:', error);
            syncInstance.updateStatus('Error creating offer: ' + error.message);
            syncInstance.addMessage(`Error: ${error.message}`);
        }
    }
}