// src/devtools/sync/signaling/signaling-message-handler.js
import debug from '../../../util/debug.js';

/**
 * Handles messages received from the signaling server.
 * Delegates actions based on message type.
 */
export class SignalingMessageHandler {
    constructor(signalingInstance) {
        this.signaling = signalingInstance; // Reference to the main SyncSignaling instance
    }

    /**
     * Processes incoming signaling messages.
     * @param {Object} data The parsed JSON message data.
     */
    handleSignalingMessage(data) {
        const syncInstance = this.signaling.sync; // Get the main Sync instance
        switch (data.type) {
            case 'session_created':
                syncInstance.sessionCode = data.sessionId;
                syncInstance.updateStatus('Session created. Share this code with your peer.', syncInstance.sessionCode);
                break;

            case 'peer_joined':
                debug.log('Peer joined session');
                if (syncInstance.isInitiator && data.peerId) {
                    this.signaling.targetPeerId = data.peerId; // Update targetPeerId on the signaling instance
                    debug.log("DEBUG: Stored target peer ID:", this.signaling.targetPeerId);
                }
                syncInstance.updateStatus('Peer joined. Establishing connection...', syncInstance.sessionCode);
                if (syncInstance.isInitiator) {
                    debug.log("DEBUG: Initiator creating offer after peer joined.");
                    // Delegate offer creation to the initiator module if it exists
                    if (this.signaling._webrtcInitiator && typeof this.signaling._webrtcInitiator.createOfferAfterPeerJoined === 'function') {
                        this.signaling._webrtcInitiator.createOfferAfterPeerJoined();
                    } else {
                         debug.error("DEBUG: WebRTC Initiator module not available to create offer.");
                    }
                }
                break;

            case 'signal':
                // Delegate signal handling to the main instance's existing method for now
                // (Could be further split if needed)
                this.signaling.handleSignal(data.data);
                break;

            case 'peer_left':
                debug.log('Peer left session');
                syncInstance.updateStatus('Peer disconnected', syncInstance.sessionCode);
                // Reset sync method state when peer leaves
                this.signaling._updateCurrentSyncMethodState('none');
                break;

            case 'error':
                debug.error('Signaling error:', data.message);
                syncInstance.updateStatus('Signaling error: ' + data.message);
                // Reset sync method state on signaling error
                this.signaling._updateCurrentSyncMethodState('none');
                break;

            case 'direct_sync_message':
                debug.log("DEBUG: Received direct sync message via signaling");
                if (data.message && syncInstance.fileSync) {
                    // Delegate sync message handling to the fileSync module
                    syncInstance.fileSync.handleSyncMessage(data.message);
                }
                break;
            default:
                debug.log("DEBUG: Unknown signaling message type received:", data.type);
        }
    }
}