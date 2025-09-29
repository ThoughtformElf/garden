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
                // ***** THIS IS THE FIX *****
                // The moment we are welcomed by the server, we are in a stable,
                // connected-but-waiting state. This prevents the "failed to connect" error.
                syncInstance.updateConnectionState('connected-signal', 'Connected to tracker, waiting for peers...');
                // ***** END OF FIX *****
                break;
            
            case 'peer_list': // Server is introducing us to existing peers
                data.peers.forEach(peerId => {
                    this.signaling.connectToPeer(peerId);
                });
                break;

            case 'peer_joined': // A new peer has joined the swarm
                // Attempt to connect to the new peer if we have capacity
                this.signaling.connectToPeer(data.peerId);
                break;

            case 'signal':
                if (data.from && data.data) {
                    this.signaling.handleSignal(data.from, data.data);
                }
                break;

            case 'peer_left':
                if (data.peerId) {
                    syncInstance.handlePeerLeft(data.peerId);
                }
                break;

            case 'error':
                syncInstance.updateConnectionState('error', `Signaling error: ${data.message}`);
                break;
        }
    }
}