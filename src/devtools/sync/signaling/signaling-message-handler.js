// src/devtools/sync/signaling/signaling-message-handler.js
import debug from '../../../util/debug.js';

export class SignalingMessageHandler {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    handleSignalingMessage(data) {
        const syncInstance = this.signaling.sync;
        switch (data.type) {
            case 'session_created':
                if (this.signaling.isNegotiating) {
                    this.signaling.startSession(data.sessionId);
                }
                break;

            case 'peer_joined':
                if (syncInstance.isInitiator && data.peerId) {
                    this.signaling.targetPeerId = data.peerId;
                }
                
                syncInstance.updateConnectionState('connected-signal', 'Peer joined. Establishing P2P connection...');
                
                if (syncInstance.isInitiator && this.signaling._webrtcInitiator) {
                    debug.log("Initiator creating offer after peer joined.");
                    this.signaling._webrtcInitiator.createOfferAfterPeerJoined();
                }
                break;

            case 'signal':
                this.signaling.handleSignal(data.data);
                break;

            case 'peer_left':
                syncInstance.addMessage('Peer disconnected from session.');
                this.signaling.targetPeerId = null;

                if (syncInstance.isInitiator) {
                    debug.log("Initiator resetting peer connection, ready for next peer.");
                    this.signaling._webrtcInitiator.setupPeerConnection();
                    syncInstance.updateConnectionState('connected-signal', 'Peer left. Ready for new connection.');
                } else {
                    syncInstance.updateConnectionState('connected-signal', 'Peer left. Using WebSocket fallback.');
                }
                break;

            case 'error':
                debug.error('Signaling error:', data.message);
                if (this.signaling.isNegotiating && data.message.includes('already exists')) {
                    this.signaling.attemptToJoinSession();
                
                /**
                 * THIS IS THE FIX:
                 * Handle the case where the session initiator disconnects. Instead of just
                 * showing an error, the client will now attempt to re-establish the session.
                 */
                } else if (data.message.includes('Session closed by initiator')) {
                    debug.log("Initiator left. This client will attempt to re-establish the session.");
                    syncInstance.addMessage("Host disconnected. Attempting to reconnect...");
                    
                    // Grab the session name before disconnect() clears it.
                    const sessionToReconnect = syncInstance.syncName;

                    if (sessionToReconnect) {
                        // Fully disconnect and clean up the old state.
                        syncInstance.disconnect();

                        // Use a short timeout to allow the disconnection to settle
                        // before starting a new connection negotiation.
                        setTimeout(() => {
                            syncInstance.connect(sessionToReconnect);
                        }, 500);
                    }
                } else {
                    syncInstance.updateConnectionState('error', `Signaling error: ${data.message}`);
                }
                break;

            case 'direct_sync_message':
                if (data.message && syncInstance.fileSync) {
                    syncInstance.fileSync.handleSyncMessage(data.message);
                }
                break;
            default:
                debug.log("Unknown signaling message type received:", data.type);
        }
    }
}