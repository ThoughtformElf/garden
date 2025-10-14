import debug from '../../../util/debug.js';

export class SignalingMessageHandler {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    handleSignalingMessage(data) {
        const syncInstance = this.signaling.sync;
        switch (data.type) {
            case 'welcome':
                // The server has acknowledged our connection. We can now join a session.
                debug.log("Received welcome from signaling server.");
                break;
            
            case 'session_joined':
                // --- THIS IS THE FIX ---
                // The server has confirmed our session and provided our final peer ID.
                this.signaling.peerId = data.peerId;
                syncInstance.updateConnectionState('connected-signal', 'Connected to tracker, waiting for peers...');
                
                // Now we can connect to the peers the server introduced us to.
                if (data.peers && data.peers.length > 0) {
                    data.peers.forEach(peerId => {
                        this.signaling.connectToPeer(peerId);
                    });
                }
                // --- END OF FIX ---
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