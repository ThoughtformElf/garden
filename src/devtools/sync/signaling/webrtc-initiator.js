// src/devtools/sync/signaling/webrtc-initiator.js
import debug from '../../../util/debug.js';

export class WebRtcInitiator {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    async startSession(syncName) {
        const syncInstance = this.signaling.sync;
        try {
            syncInstance.isInitiator = true;
            syncInstance.syncName = syncName;

            syncInstance.peerConnection = new RTCPeerConnection({
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            syncInstance.peerConnection.onconnectionstatechange = () => {
                debug.log("P2P Connection state:", syncInstance.peerConnection.connectionState);
                if (syncInstance.peerConnection.connectionState === 'failed') {
                    syncInstance.updateConnectionState('connected-signal', 'P2P connection failed. Using fallback.');
                }
            };

            syncInstance.dataChannel = syncInstance.peerConnection.createDataChannel('syncChannel');

            syncInstance.dataChannel.onopen = () => {
                syncInstance.updateConnectionState('connected-p2p', 'P2P connection established.');
                if (syncInstance.fileSync) {
                    syncInstance.fileSync.setupDataChannel(syncInstance.dataChannel);
                }
            };

            syncInstance.dataChannel.onclose = () => {
                if (syncInstance.connectionState === 'connected-p2p') {
                     syncInstance.updateConnectionState('connected-signal', 'P2P channel closed. Using fallback.');
                }
            };
            
            syncInstance.dataChannel.onerror = (error) => {
                debug.error("Data channel error:", error);
                syncInstance.addMessage(`Data channel error: ${error.message}`);
                syncInstance.updateConnectionState('connected-signal', 'P2P channel error. Using fallback.');
            };

            syncInstance.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.signaling.sendSignal({ type: 'candidate', candidate: event.candidate });
                }
            };
            
            // The initiator is now set up and waiting for a 'peer_joined' message
            // which will trigger createOfferAfterPeerJoined().
            syncInstance.updateConnectionState('connected-signal', 'Waiting for peer to join...');

        } catch (error) {
            debug.error('Error starting initiator session:', error);
            syncInstance.updateConnectionState('error', `Error: ${error.message}`);
        }
    }

    async createOfferAfterPeerJoined() {
        const syncInstance = this.signaling.sync;
        try {
            if (!syncInstance.peerConnection) return;
            const offer = await syncInstance.peerConnection.createOffer();
            await syncInstance.peerConnection.setLocalDescription(offer);
            this.signaling.sendSignal({ type: 'offer', sdp: offer.sdp });
        } catch (error) {
            debug.error('Error creating offer:', error);
            syncInstance.updateConnectionState('error', `Error creating P2P offer: ${error.message}`);
        }
    }
}