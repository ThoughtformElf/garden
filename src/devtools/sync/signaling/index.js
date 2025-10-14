import debug from '../../../util/debug.js';
import { WebSocketManager } from './websocket-manager.js';
import { SignalingMessageHandler } from './signaling-message-handler.js';
import { SyncMessageRouter } from './sync-message-router.js';

class WebRtcInitiator {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    async connectToPeer(peerId) {
        const syncInstance = this.signaling.sync;
        const pc = syncInstance.createPeerConnection(peerId, true); // true for initiator
        if (!pc) return; // Max connections reached or connection already exists

        try {
            const dataChannel = pc.createDataChannel('syncChannel');
            syncInstance.setupDataChannel(peerId, dataChannel);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            this.signaling.sendSignal({ type: 'offer', sdp: offer.sdp }, peerId);
        } catch (error) {
            debug.error(`Failed to initiate connection to ${peerId}:`, error);
        }
    }
}

export class SyncSignaling {
    constructor(syncInstance) {
        this.sync = syncInstance;
        this.ws = null;
        this.signalingServerUrl = localStorage.getItem('thoughtform_signaling_server') || 'wss://socket.thoughtform.garden';
        this.peerId = null; 
        
        this._webSocketManager = new WebSocketManager(this);
        this._signalingMessageHandler = new SignalingMessageHandler(this);
        this._webrtcInitiator = new WebRtcInitiator(this);
        this._syncMessageRouter = new SyncMessageRouter(this);
    }
    
    // --- THIS IS THE FIX ---
    // This function was removed during a refactor and is now restored.
    updateSignalingServerUrl(url) {
        this.signalingServerUrl = url;
        localStorage.setItem('thoughtform_signaling_server', url);
    }
    // --- END OF FIX ---
    
    async joinSession(syncName, peerNamePrefix) {
        try {
            await this._webSocketManager.connectToSignalingServer();
            this._webSocketManager.sendJoinSessionRequest(syncName, peerNamePrefix);
        } catch (error) {
            this.sync.updateConnectionState('error', `Failed to connect to signaling server.`);
        }
    }

    connectToPeer(peerId) {
        if (peerId === this.peerId) return;
        if (this.peerId > peerId) {
            this._webrtcInitiator.connectToPeer(peerId);
        } else {
            // console.log(`[SYNC-GLARE] My ID (${this.peerId.substring(0,4)}...) is less than ${peerId.substring(0,4)}... I will wait for their offer.`);
        }
    }
    
    sendSignal(data, targetPeerId) {
        this._webSocketManager.sendSignal(data, targetPeerId);
    }

    async handleSignal(fromPeerId, data) {
        const syncInstance = this.sync;
        try {
            let pc = syncInstance.peerConnections.get(fromPeerId);
            
            if (!pc) {
                if (data.type === 'offer') {
                    pc = syncInstance.createPeerConnection(fromPeerId, false); // false for non-initiator
                    if (!pc) {
                        console.warn(`[SYNC-SIGNAL] Received offer from ${fromPeerId.substring(0,8)} but at connection limit. Ignoring.`);
                        return;
                    }
                } else {
                     debug.warn(`[SYNC-SIGNAL] Received signal from unknown peer ${fromPeerId.substring(0,8)} before an offer. Discarding.`);
                     return;
                }
            }

            if (data.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.sendSignal({ type: 'answer', sdp: answer.sdp }, fromPeerId);
            } else if (data.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
            } else if (data.type === 'candidate') {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (error) {
            debug.error(`Error handling signal from ${fromPeerId}:`, error);
        }
    }

    sendSyncMessage(data, targetPeerId, messageId) {
        this._syncMessageRouter.sendSyncMessage(data, targetPeerId, messageId);
    }
    handleIncomingMessage(data, transport) {
        this._syncMessageRouter.handleIncomingMessage(data, transport);
    }

    destroy() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this._syncMessageRouter.destroy();
    }
}