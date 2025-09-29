// src/devtools/sync/signaling/webrtc-initiator.js
import debug from '../../../util/debug.js';

export class WebRtcInitiator {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    // Called when the peer first creates the session.
    async startSession(syncName) {
        const syncInstance = this.signaling.sync;
        syncInstance.isInitiator = true;
        syncInstance.syncName = syncName;
        syncInstance.updateConnectionState('connected-signal', 'Session created. Waiting for peers to join...');
    }

    // Called by the signaling handler for EACH new peer that joins the session.
    async initiateConnection(peerId) {
        const syncInstance = this.signaling.sync;
        try {
            const pc = syncInstance.createPeerConnection(peerId);
            
            const dataChannel = pc.createDataChannel('syncChannel');
            pc.dataChannel = dataChannel; // Attach data channel to the peer connection object

            dataChannel.onopen = () => {
                syncInstance.updateConnectionState('connected-p2p', `P2P link active with ${peerId.substring(0,8)}...`);
            };

            dataChannel.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    await syncInstance._handleIncomingSyncMessage(data, `P2P-${peerId.substring(0,4)}`);
                } catch (error) {
                    console.error('Error parsing sync message from DataChannel:', error, 'Raw data:', event.data);
                }
            };
            dataChannel.onclose = () => {
            };
            dataChannel.onerror = (error) => {
                debug.error(`Data channel error for peer ${peerId.substring(0,8)}...:`, error);
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            this.signaling.sendSignal({ type: 'offer', sdp: offer.sdp }, peerId);

        } catch (error) {
            debug.error(`Error initiating connection to peer ${peerId}:`, error);
            syncInstance.updateConnectionState('error', `Error creating P2P offer: ${error.message}`);
        }
    }
}