// src/devtools/sync/signaling/index.js
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
            console.log(`[SYNC-INITIATOR] Creating data channel for ${peerId.substring(0,8)}...`);
            const dataChannel = pc.createDataChannel('syncChannel');
            syncInstance.setupDataChannel(peerId, dataChannel);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            console.log(`[SYNC-INITIATOR] Sending offer to ${peerId.substring(0,8)}...`);
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
    
    async joinSession(syncName) {
        try {
            await this._webSocketManager.connectToSignalingServer();
            this._webSocketManager.sendJoinSessionRequest(syncName);
        } catch (error) {
            this.sync.updateConnectionState('error', `Failed to connect to signaling server.`);
        }
    }

    // ***** THIS IS THE FIX *****
    // This function now contains the glare-resolution logic.
    connectToPeer(peerId) {
        // Do not attempt to connect to ourselves.
        if (peerId === this.peerId) return;
        
        // The peer with the GREATER ID is responsible for initiating the connection.
        // Both peers will run this check and come to the same conclusion.
        if (this.peerId > peerId) {
            console.log(`[SYNC-GLARE] My ID (${this.peerId.substring(0,4)}...) is greater than ${peerId.substring(0,4)}... I will initiate.`);
            this._webrtcInitiator.connectToPeer(peerId);
        } else {
            console.log(`[SYNC-GLARE] My ID (${this.peerId.substring(0,4)}...) is less than ${peerId.substring(0,4)}... I will wait for their offer.`);
        }
    }
    // ***** END OF FIX *****
    
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
                console.log(`[SYNC-SIGNAL] Received offer from ${fromPeerId.substring(0,8)}...`);
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.sendSignal({ type: 'answer', sdp: answer.sdp }, fromPeerId);
            } else if (data.type === 'answer') {
                console.log(`[SYNC-SIGNAL] Received answer from ${fromPeerId.substring(0,8)}...`);
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