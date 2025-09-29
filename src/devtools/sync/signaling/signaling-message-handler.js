// src/devtools/sync/signaling/signaling-message-handler.js
import debug from '../../../util/debug.js';

export class SignalingMessageHandler {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    handleSignalingMessage(data) {
        const syncInstance = this.signaling.sync;
        switch (data.type) {
            case 'welcome':
                this.signaling.peerId = data.peerId;
                console.log(`[SYNC-COMMON] Received welcome. My Peer ID is: ${data.peerId}`);
                break;
            case 'session_created':
                if (this.signaling.isNegotiating) this.signaling.startSession(data.sessionId);
                break;
            case 'host_changed':
                syncInstance.handleHostChange(data.newInitiatorPeerId);
                break;
            case 'peer_joined':
                console.log(`[SYNC-COMMON] Server reports a peer joined: ${data.peerId}.`);
                syncInstance.updateConnectionState('connected-signal', 'Peer joined. Establishing P2P connection...');
                if (syncInstance.isInitiator) this.signaling._webrtcInitiator.createOfferAfterPeerJoined();
                break;
            case 'signal':
                this.signaling.handleSignal(data.data);
                break;
            case 'peer_left':
                if (data.peerId) syncInstance.handlePeerLeft(data.peerId);
                break;
            case 'error':
                if (this.signaling.isNegotiating && data.message.includes('already exists')) {
                    this.signaling.attemptToJoinSession();
                } else {
                    syncInstance.updateConnectionState('error', `Signaling error: ${data.message}`);
                }
                break;
            
            // --- THIS IS THE FIX ---
            // Unwraps the payload and routes it to the new central handler.
            case 'direct_sync_message':
                if (data.payload && syncInstance) {
                    syncInstance._handleIncomingSyncMessage(data.payload, 'WS');
                }
                break;
        }
    }
}