// src/devtools/sync/signaling.js
import debug from '../../util/debug.js';

export class SyncSignaling {
  constructor(syncInstance) {
    this.sync = syncInstance;
    this.ws = null;
    this.signalingServerUrl = localStorage.getItem('thoughtform_signaling_server') || 'ws://localhost:8080';
    this.peerId = null;
    this.targetPeerId = null;
    // Track the current best available sync method based on connection state
    this.currentSyncMethod = 'none'; // 'webrtc_active', 'webrtc_inactive', 'websocket', 'none'
  }

  updateSignalingServerUrl(url) {
    this.signalingServerUrl = url;
    localStorage.setItem('thoughtform_signaling_server', url);
  }

  // Getter for the current sync method state
  getCurrentSyncMethodState() {
      return this.currentSyncMethod;
  }

  // --- NEW PRIVATE METHOD: Update currentSyncMethod and UI indicator ---
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
  // --- END NEW PRIVATE METHOD ---

  connectToSignalingServer() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.signalingServerUrl);

      this.ws.onopen = () => {
        debug.log(`Connected to signaling server at ${this.signalingServerUrl}`);
        resolve();
        // Potentially update state if no better method is available yet
        if (this.currentSyncMethod === 'none') {
             this._updateCurrentSyncMethodState('websocket');
        }
      };

      this.ws.onclose = () => {
        debug.log('Disconnected from signaling server');
        // Reset sync method state on disconnection
        this._updateCurrentSyncMethodState('none');
      };

      this.ws.onerror = (error) => {
        debug.error('WebSocket error:', error);
        // Reset sync method state on error
        this._updateCurrentSyncMethodState('none');
        reject(new Error(`Failed to connect to signaling server at ${this.signalingServerUrl}`));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSignalingMessage(data);
        } catch (error) {
          debug.error('Error parsing signaling message:', error);
        }
      };
    });
  }

  handleSignalingMessage(data) {
    switch (data.type) {
      case 'session_created':
        this.sync.sessionCode = data.sessionId;
        this.sync.updateStatus('Session created. Share this code with your peer.', this.sync.sessionCode);
        break;

      case 'peer_joined':
        debug.log('Peer joined session');
        if (this.sync.isInitiator && data.peerId) {
           this.targetPeerId = data.peerId;
           debug.log("DEBUG: Stored target peer ID:", this.targetPeerId);
        }
        this.sync.updateStatus('Peer joined. Establishing connection...', this.sync.sessionCode);
        if (this.sync.isInitiator) {
            debug.log("DEBUG: Initiator creating offer after peer joined.");
            this.createOfferAfterPeerJoined();
        }
        break;

      case 'signal':
        this.handleSignal(data.data);
        break;

      case 'peer_left':
        debug.log('Peer left session');
        this.sync.updateStatus('Peer disconnected', this.sync.sessionCode);
        // Reset sync method state when peer leaves
        this._updateCurrentSyncMethodState('none');
        break;

      case 'error':
        debug.error('Signaling error:', data.message);
        this.sync.updateStatus('Signaling error: ' + data.message);
        // Reset sync method state on signaling error
        this._updateCurrentSyncMethodState('none');
        break;

      case 'direct_sync_message':
        debug.log("DEBUG: Received direct sync message via signaling");
        if (data.message) {
            this.sync.fileSync.handleSyncMessage(data.message);
        }
        break;
    }
  }

  sendSignal(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      debug.log("DEBUG: Sending signal via WebSocket:", data.type);
      this.ws.send(JSON.stringify({
        type: 'signal',
        data: data
      }));
    }
  }

  async handleSignal(data) {
    try {
      debug.log("DEBUG: Received signal:", data.type);
      if (data.type === 'offer') {
        debug.log("DEBUG: Handling offer");
        await this.sync.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await this.sync.peerConnection.createAnswer();
        await this.sync.peerConnection.setLocalDescription(answer);
        debug.log("DEBUG: Sending answer");
        this.sendSignal({
          type: 'answer',
          sdp: answer.sdp
        });
      } else if (data.type === 'answer') {
        debug.log("DEBUG: Handling answer");
        await this.sync.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.type === 'candidate') {
        debug.log("DEBUG: Handling ICE candidate");
        const candidate = new RTCIceCandidate(data.candidate);
        await this.sync.peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      debug.error('Error handling signal:', error);
      this.sync.addMessage(`WebRTC error: ${error.message}`);
    }
  }

  async createOfferAfterPeerJoined() {
    try {
        if (!this.sync.peerConnection) {
             debug.error("DEBUG: createOfferAfterPeerJoined called but peerConnection is null");
             return;
        }

        debug.log("DEBUG: Creating offer");
        const offer = await this.sync.peerConnection.createOffer();
        await this.sync.peerConnection.setLocalDescription(offer);

        debug.log("DEBUG: Sending offer");
        this.sendSignal({ type: 'offer', sdp: offer.sdp });

    } catch (error) {
        debug.error('Error creating/sending offer after peer joined:', error);
        this.sync.updateStatus('Error creating offer: ' + error.message);
        this.sync.addMessage(`Error: ${error.message}`);
    }
  }

  // Start a new WebRTC session (initiator)
  async startSession() {
    try {
      this.sync.isInitiator = true;
      this.sync.updateStatus('Connecting to signaling server...');

      await this.connectToSignalingServer();

      this.sync.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      this.sync.peerConnection.onconnectionstatechange = () => {
        debug.log("DEBUG: PeerConnection state:", this.sync.peerConnection.connectionState);
        this.sync.addMessage(`Connection state: ${this.sync.peerConnection.connectionState}`);
        // Update sync method state based on overall connection state if it's problematic
        if (this.sync.peerConnection.connectionState === 'failed' || this.sync.peerConnection.connectionState === 'disconnected') {
             // If main connection fails, fall back to signaling state
             if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                 this._updateCurrentSyncMethodState('websocket');
             } else {
                 this._updateCurrentSyncMethodState('none');
             }
        }
      };

      this.sync.peerConnection.oniceconnectionstatechange = () => {
        debug.log("DEBUG: ICE Connection state:", this.sync.peerConnection.iceConnectionState);
        this.sync.addMessage(`ICE state: ${this.sync.peerConnection.iceConnectionState}`);
         // Update sync method state based on ICE state if it's problematic
        if (this.sync.peerConnection.iceConnectionState === 'failed' || this.sync.peerConnection.iceConnectionState === 'disconnected') {
             // If ICE fails, fall back to signaling state
             if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                 this._updateCurrentSyncMethodState('websocket');
             } else {
                 this._updateCurrentSyncMethodState('none');
             }
        }
      };

      debug.log("DEBUG: Creating data channel");
      this.sync.dataChannel = this.sync.peerConnection.createDataChannel('syncChannel');

      // --- CRITICAL: Setup data channel listeners to update sync method state ---
      this.sync.dataChannel.onopen = () => {
          debug.log("DEBUG: Data channel opened");
          this._updateCurrentSyncMethodState('webrtc_active');
          // Call the original setup logic from files.js
          if (this.sync.fileSync && typeof this.sync.fileSync.setupDataChannel === 'function') {
              // We might need to re-bind events or just trigger the onopen logic
              // Let's trigger the onopen logic manually if needed, or ensure setupDataChannel handles it
              // For now, let's assume setupDataChannel sets up all necessary handlers
              // and we just inform it that the channel is open.
              // A cleaner way might be to have setupDataChannel take the channel,
              // and it manages its own state/events. Let's assume that's the case.
              // If setupDataChannel was meant to be called once during creation,
              // and we need to notify the fileSync about the open event, we might need
              // a separate event or a way to trigger its internal onopen logic.
              // Let's re-call setupDataChannel to ensure it hooks up to the new channel's events.
              // This might be redundant if setupDataChannel is only for initial setup.
              // Let's check the files.js setupDataChannel implementation.
              // It looks like setupDataChannel *is* the place where onopen/onmessage etc. are defined.
              // So calling it here might overwrite the events we just set up.
              // A better approach is to let files.js handle the setup, and signaling.js just
              // informs the UI about the state change.
              // So, we just update the state here. files.js should listen or be notified separately.
              // Actually, looking at files.js, setupDataChannel IS where the onopen logic resides.
              // So we need to call it. But only once. The issue is it was called during creation
              // in joinSession. We need to make sure it's called for the initiator's channel too.
              // Let's call it here.
              this.sync.fileSync.setupDataChannel(this.sync.dataChannel);
          }
      };

      this.sync.dataChannel.onclose = () => {
          debug.log("DEBUG: Data channel closed");
          this._updateCurrentSyncMethodState('webrtc_inactive');
      };

      this.sync.dataChannel.onerror = (error) => {
          debug.error("DEBUG: Data channel error:", error);
          this._updateCurrentSyncMethodState('webrtc_inactive');
      };
      // --- END CRITICAL ---

      this.sync.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          debug.log("DEBUG: Sending ICE candidate");
          this.sendSignal({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      };

      debug.log("DEBUG: Requesting session creation from server");
      this.ws.send(JSON.stringify({
        type: 'create_session'
      }));

      this.sync.updateStatus('Creating session...');
    } catch (error) {
      debug.error('Error starting session:', error);
      this.sync.updateStatus('Error starting session: ' + error.message);
      this.sync.addMessage(`Error: ${error.message}`);
    }
  }

  // Join an existing WebRTC session
  async joinSession(code) {
    try {
      this.sync.isInitiator = false;
      this.sync.sessionCode = code;
      this.sync.updateStatus('Connecting to signaling server...');

      await this.connectToSignalingServer();

      this.ws.send(JSON.stringify({
        type: 'join_session',
        sessionId: code
      }));

      this.sync.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      this.sync.peerConnection.onconnectionstatechange = () => {
        debug.log("DEBUG: PeerConnection state:", this.sync.peerConnection.connectionState);
        this.sync.addMessage(`Connection state: ${this.sync.peerConnection.connectionState}`);
         if (this.sync.peerConnection.connectionState === 'failed' || this.sync.peerConnection.connectionState === 'disconnected') {
             if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                 this._updateCurrentSyncMethodState('websocket');
             } else {
                 this._updateCurrentSyncMethodState('none');
             }
        }
      };

      this.sync.peerConnection.oniceconnectionstatechange = () => {
        debug.log("DEBUG: ICE Connection state:", this.sync.peerConnection.iceConnectionState);
        this.sync.addMessage(`ICE state: ${this.sync.peerConnection.iceConnectionState}`);
         if (this.sync.peerConnection.iceConnectionState === 'failed' || this.sync.peerConnection.iceConnectionState === 'disconnected') {
             if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                 this._updateCurrentSyncMethodState('websocket');
             } else {
                 this._updateCurrentSyncMethodState('none');
             }
        }
      };

      // Handle data channel for the joiner (received from initiator)
      this.sync.peerConnection.ondatachannel = (event) => {
        debug.log("DEBUG: Data channel received");
        this.sync.dataChannel = event.channel;

        // --- CRITICAL: Setup data channel listeners for the received channel ---
        // Update state on open/close/error for the received channel
        this.sync.dataChannel.onopen = () => {
            debug.log("DEBUG: Received data channel opened");
            this._updateCurrentSyncMethodState('webrtc_active');
            // Call the original setup logic from files.js
            if (this.sync.fileSync && typeof this.sync.fileSync.setupDataChannel === 'function') {
                this.sync.fileSync.setupDataChannel(this.sync.dataChannel);
            }
        };

        this.sync.dataChannel.onclose = () => {
            debug.log("DEBUG: Received data channel closed");
            this._updateCurrentSyncMethodState('webrtc_inactive');
        };

        this.sync.dataChannel.onerror = (error) => {
            debug.error("DEBUG: Received data channel error:", error);
            this._updateCurrentSyncMethodState('webrtc_inactive');
        };
        // --- END CRITICAL ---
      };

      this.sync.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          debug.log("DEBUG: Sending ICE candidate");
          this.sendSignal({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      };

      this.sync.updateStatus('Joining session...', code);
    } catch (error) {
      debug.error('Error joining session:', error);
      this.sync.updateStatus('Error joining session: ' + error.message);
      this.sync.addMessage(`Error: ${error.message}`);
    }
  }

  sendSyncMessageViaSignaling(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.targetPeerId) {
      debug.log("DEBUG: Sent sync message via signaling to peer", this.targetPeerId);
      this.ws.send(JSON.stringify({
        type: 'direct_sync_message',
        targetPeerId: this.targetPeerId,
        message: data
      }));
      // This confirms WebSocket is usable for sending, but state should already reflect this
      // unless it was 'none' or 'webrtc_inactive'
      if (this.currentSyncMethod !== 'webrtc_active') {
          this._updateCurrentSyncMethodState('websocket');
      }
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
       debug.log("DEBUG: Sent sync message via signaling (broadcast)");
       this.ws.send(JSON.stringify({
        type: 'direct_sync_message',
        message: data
      }));
      if (this.currentSyncMethod !== 'webrtc_active') {
          this._updateCurrentSyncMethodState('websocket');
      }
    } else {
      debug.warn('Signaling WebSocket not open or target peer unknown, could not send sync message via signaling.');
      this.sync.addMessage('Error: Not connected to signaling server for message send.');
    }
  }

  sendSyncMessage(data) {
    if (this.sync.dataChannel && this.sync.dataChannel.readyState === 'open') {
        debug.log("DEBUG: Sent sync message via data channel");
        this.sync.dataChannel.send(JSON.stringify(data));
        // Sending via data channel confirms it's active, state should already reflect this
        // but let's ensure it's set correctly
        this._updateCurrentSyncMethodState('webrtc_active');
    } else {
        debug.log("DEBUG: Data channel not open, falling back to signaling for sync message");
        this.sendSyncMessageViaSignaling(data);
        // sendSyncMessageViaSignaling will update state to 'websocket' if needed
    }
  }

  destroy() {
    if (this.ws) {
      this.ws.close();
    }
    // Reset sync method state on destroy
    this._updateCurrentSyncMethodState('none');
    // Potentially clean up peerConnection and dataChannel listeners if needed
  }
}