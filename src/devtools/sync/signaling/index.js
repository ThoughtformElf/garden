// src/devtools/sync/signaling/index.js
import debug from '../../../util/debug.js';
import { WebSocketManager } from './websocket-manager.js';
import { SignalingMessageHandler } from './signaling-message-handler.js';
import { WebRtcInitiator } from './webrtc-initiator.js';
import { WebRtcJoiner } from './webrtc-joiner.js';
import { SyncMessageRouter } from './sync-message-router.js';

export class SyncSignaling {
    constructor(syncInstance) {
        this.sync = syncInstance;
        this.ws = null;
        this.signalingServerUrl = localStorage.getItem('thoughtform_signaling_server') || 'wss://socket.thoughtform.garden';
        this.peerId = null; 
        this.targetPeerId = null;

        this.isNegotiating = false;
        this.negotiationSyncName = null;

        this._webSocketManager = new WebSocketManager(this);
        this._signalingMessageHandler = new SignalingMessageHandler(this);
        this._webrtcInitiator = new WebRtcInitiator(this);
        this._webrtcJoiner = new WebRtcJoiner(this);
        this._syncMessageRouter = new SyncMessageRouter(this);
    }

    updateSignalingServerUrl(url) {
        this.signalingServerUrl = url;
        localStorage.setItem('thoughtform_signaling_server', url);
    }
    
    async negotiateSession(syncName) {
        if (this.isNegotiating) return;

        this.isNegotiating = true;
        this.negotiationSyncName = syncName;
        this.sync.isInitiator = false;

        try {
            await this.connectToSignalingServer();
            console.log(`[SYNC-NEGOTIATE] Attempting to create session with persistent name: ${syncName}`);
            
            this._webSocketManager.sendCreateSessionRequest(syncName);
            
        } catch (error) {
            this.sync.updateConnectionState('error', `Failed to connect to signaling server.`);
            this.isNegotiating = false;
        }
    }

    attemptToJoinSession() {
        console.log(`[SYNC-JOINER] Step 2: Create failed, now attempting to join session: ${this.negotiationSyncName}`);
        this.joinSession(this.negotiationSyncName);
    }
    
    async startSession(syncName) {
        console.log(`[SYNC-INITIATOR] Step 2: Session created on server. Initializing as initiator.`);
        this.isNegotiating = false;
        return this._webrtcInitiator.startSession(syncName);
    }

    async joinSession(syncName) {
        console.log(`[SYNC-JOINER] Step 3: Proceeding to join session as non-initiator.`);
        this.isNegotiating = false;
        return this._webrtcJoiner.joinSession(syncName);
    }
    
    connectToSignalingServer() {
        return this._webSocketManager.connectToSignalingServer();
    }

    sendSignal(data) {
        return this._webSocketManager.sendSignal(data);
    }

    sendSyncMessage(data, targetPeerId = null) {
        return this._syncMessageRouter.sendSyncMessage(data, targetPeerId);
    }
    
    async handleSignal(data) {
        const syncInstance = this.sync;
        try {
            if (!syncInstance.peerConnection) {
                debug.error("Received signal but peerConnection is not initialized.");
                return;
            }

            if (data.type === 'offer') {
                await syncInstance.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await syncInstance.peerConnection.createAnswer();
                await syncInstance.peerConnection.setLocalDescription(answer);
                this.sendSignal({ type: 'answer', sdp: answer.sdp });
            } else if (data.type === 'answer') {
                await syncInstance.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
            } else if (data.type === 'candidate') {
                await syncInstance.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (error) {
            debug.error('Error handling signal:', error);
            syncInstance.addMessage(`WebRTC error: ${error.message}`);
            this.sync.updateConnectionState('error', `WebRTC Error: ${error.message}`);
        }
    }

    destroy() {
        this.isNegotiating = false;
        this.negotiationSyncName = null;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}