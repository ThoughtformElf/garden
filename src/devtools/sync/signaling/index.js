// src/devtools/sync/signaling/index.js
// Final updated version
import debug from '../../../util/debug.js';
import { WebSocketManager } from './websocket-manager.js';
import { SignalingMessageHandler } from './signaling-message-handler.js';
import { WebRtcInitiator } from './webrtc-initiator.js'; // Import new module
import { WebRtcJoiner } from './webrtc-joiner.js';       // Import new module
import { SyncMessageRouter } from './sync-message-router.js'; // Import new module

export class SyncSignaling {
    constructor(syncInstance) {
        this.sync = syncInstance;
        this.ws = null; // WebSocket reference
        this.signalingServerUrl = localStorage.getItem('thoughtform_signaling_server') || 'wss://socket.thoughtform.garden';
        this.peerId = null;
        this.targetPeerId = null;
        // Track the current best available sync method based on connection state
        this.currentSyncMethod = 'none'; // 'webrtc_active', 'webrtc_inactive', 'websocket', 'none'

        // --- Initialize helper modules ---
        this._webSocketManager = new WebSocketManager(this);
        this._signalingMessageHandler = new SignalingMessageHandler(this);
        this._webrtcInitiator = new WebRtcInitiator(this); // Initialize new module
        this._webrtcJoiner = new WebRtcJoiner(this);       // Initialize new module
        this._syncMessageRouter = new SyncMessageRouter(this); // Initialize new module
        // --- End Initialize helper modules ---
    }

    updateSignalingServerUrl(url) {
        this.signalingServerUrl = url;
        localStorage.setItem('thoughtform_signaling_server', url);
    }

    // Getter for the current sync method state
    getCurrentSyncMethodState() {
        return this.currentSyncMethod;
    }

    // --- PRIVATE METHOD: Update currentSyncMethod and UI indicator ---
    _updateCurrentSyncMethodState(method) {
        if (this.currentSyncMethod !== method) {
            this.currentSyncMethod = method;
            debug.log("DEBUG: Current sync method state updated to:", method);
            // Update the UI indicator if the UI instance is available
            if (this.sync && this.sync.ui && typeof this.sync.ui.updateSyncMethodIndicator === 'function') {
                this.sync.ui.updateSyncMethodIndicator();
            }
        }
    }
    // --- END PRIVATE METHOD ---

    // --- DELEGATED METHODS ---
    // Delegate connect method
    connectToSignalingServer() {
        return this._webSocketManager.connectToSignalingServer();
    }

    // Delegate sendSignal method
    sendSignal(data) {
        return this._webSocketManager.sendSignal(data);
    }

    // Delegate startSession method
    async startSession() {
        return this._webrtcInitiator.startSession();
    }

    // Delegate joinSession method
    async joinSession(code) {
        return this._webrtcJoiner.joinSession(code);
    }

    // Delegate createOfferAfterPeerJoined method
    async createOfferAfterPeerJoined() {
        // Check if the initiator module has this method (it should)
        if (this._webrtcInitiator && typeof this._webrtcInitiator.createOfferAfterPeerJoined === 'function') {
             return this._webrtcInitiator.createOfferAfterPeerJoined();
        } else {
             debug.error("DEBUG: WebRTC Initiator module does not have createOfferAfterPeerJoined method.");
        }
    }

    // Delegate sendSyncMessage method
    sendSyncMessage(data) {
        return this._syncMessageRouter.sendSyncMessage(data);
    }

    // Delegate sendSyncMessageViaSignaling method (if needed externally, though less likely)
    // sendSyncMessageViaSignaling(data) {
    //     return this._syncMessageRouter.sendSyncMessageViaSignaling(data);
    // }
    // --- END DELEGATED METHODS ---

    // Keep handleSignal here for now as it's complex and interacts directly with peerConnection
    async handleSignal(data) {
        const syncInstance = this.sync;
        try {
            debug.log("DEBUG: Received signal:", data.type);
            if (data.type === 'offer') {
                debug.log("DEBUG: Handling offer");
                await syncInstance.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await syncInstance.peerConnection.createAnswer();
                await syncInstance.peerConnection.setLocalDescription(answer);
                debug.log("DEBUG: Sending answer");
                this.sendSignal({ // Use delegate
                    type: 'answer',
                    sdp: answer.sdp
                });
            } else if (data.type === 'answer') {
                debug.log("DEBUG: Handling answer");
                await syncInstance.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
            } else if (data.type === 'candidate') {
                debug.log("DEBUG: Handling ICE candidate");
                const candidate = new RTCIceCandidate(data.candidate);
                await syncInstance.peerConnection.addIceCandidate(candidate);
            }
        } catch (error) {
            debug.error('Error handling signal:', error);
            syncInstance.addMessage(`WebRTC error: ${error.message}`);
        }
    }

    // Delegate destroy logic
    destroy() {
        if (this.ws) {
            this.ws.close();
        }
        // Reset sync method state on destroy
        this._updateCurrentSyncMethodState('none');
        // Potentially clean up peerConnection and dataChannel listeners if needed
        // This might involve calling destroy/cleanup methods on the WebRTC modules if they had specific cleanup.
        // For now, setting ws to null and state to 'none' is sufficient.
    }
}