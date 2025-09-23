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
                // *** FIX 1: REMOVED the incorrect updateStatus call. ***
                // The startSession method is now solely responsible for updating the state
                // from 'connecting' to 'connected-signal', which is the correct flow.
                if (this.signaling.isNegotiating) {
                    this.signaling.startSession(data.sessionId);
                }
                break;

            case 'peer_joined':
                if (syncInstance.isInitiator && data.peerId) {
                    this.signaling.targetPeerId = data.peerId;
                }
                
                // *** FIX 2: Use updateConnectionState to keep the status message current. ***
                // The state remains 'connected-signal', but we update the message to reflect the new activity.
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
                syncInstance.updateConnectionState('connected-signal', 'Peer left. Using WebSocket fallback.');
                this.signaling.targetPeerId = null;
                break;

            case 'error':
                debug.error('Signaling error:', data.message);
                if (this.signaling.isNegotiating && data.message.includes('already exists')) {
                    this.signaling.attemptToJoinSession();
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