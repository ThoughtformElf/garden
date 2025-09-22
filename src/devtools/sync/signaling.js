// src/devtools/sync/signaling.js
import debug from '../../util/debug.js'; // Import the debug utility

export class SyncSignaling {
  constructor(syncInstance) {
    this.sync = syncInstance;
    this.ws = null;
    this.signalingServerUrl = localStorage.getItem('thoughtform_signaling_server') || 'ws://localhost:8080';
    // Store peer information for direct signaling
    this.peerId = null;
    this.targetPeerId = null;
    // Track the last successful sync method used
    this.lastSyncMethod = 'none'; // 'webrtc', 'websocket', 'none'
  }

  updateSignalingServerUrl(url) {
    this.signalingServerUrl = url;
    localStorage.setItem('thoughtform_signaling_server', url);
  }

  // Getter for the last sync method, useful for UI indicator
  getLastSyncMethod() {
      return this.lastSyncMethod;
  }

  connectToSignalingServer() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.signalingServerUrl);
      
      this.ws.onopen = () => {
        debug.log(`Connected to signaling server at ${this.signalingServerUrl}`);
        // Keep this as it's user-facing or important non-debug info
        console.log(`Connected to signaling server at ${this.signalingServerUrl}`);
        resolve();
      };
      
      this.ws.onclose = () => {
        debug.log('Disconnected from signaling server');
        console.log('Disconnected from signaling server');
        // Reset sync method on disconnection
        this.lastSyncMethod = 'none';
      };
      
      this.ws.onerror = (error) => {
        debug.error('WebSocket error:', error);
        console.error('WebSocket error:', error);
        // Reset sync method on error
        this.lastSyncMethod = 'none';
        reject(new Error(`Failed to connect to signaling server at ${this.signalingServerUrl}`));
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSignalingMessage(data);
        } catch (error) {
          debug.error('Error parsing signaling message:', error);
          console.error('Error parsing signaling message:', error);
        }
      };
    });
  }

  handleSignalingMessage(data) {
    switch (data.type) {
      case 'session_created':
        this.sync.sessionCode = data.sessionId;
        this.sync.updateStatus('Session created. Share this code with your peer.', this.sync.sessionCode);
        // --- MODIFICATION: DO NOT create offer here ---
        // The offer will be created when the peer_joined message is received.
        // --- END MODIFICATION ---
        break;
        
      case 'peer_joined':
        debug.log('Peer joined session');
        console.log('Peer joined session'); // Keep user-facing log
        // Store the ID of the peer that joined (if we are the initiator)
        if (this.sync.isInitiator && data.peerId) {
           this.targetPeerId = data.peerId;
           debug.log("DEBUG: Stored target peer ID:", this.targetPeerId);
           // Removed console.log for this, status update is sufficient
        }
        this.sync.updateStatus('Peer joined. Establishing connection...', this.sync.sessionCode);

        // --- ADDITION: Initiator creates offer only AFTER peer joins ---
        if (this.sync.isInitiator) {
            debug.log("DEBUG: Initiator creating offer after peer joined.");
            // Removed console.log for this
            this.createOfferAfterPeerJoined(); // Call a new helper method
        }
        // --- END ADDITION ---
        break;

      case 'signal':
        this.handleSignal(data.data);
        break;
        
      case 'peer_left':
        debug.log('Peer left session');
        console.log('Peer left session');
        this.sync.updateStatus('Peer disconnected', this.sync.sessionCode);
        // Reset sync method when peer leaves
        this.lastSyncMethod = 'none';
        break;
        
      case 'error':
        debug.error('Signaling error:', data.message);
        console.error('Signaling error:', data.message);
        this.sync.updateStatus('Signaling error: ' + data.message);
        // Reset sync method on signaling error
        this.lastSyncMethod = 'none';
        break;
        
      // --- NEW: Handle direct sync messages via signaling ---
      case 'direct_sync_message':
        debug.log("DEBUG: Received direct sync message via signaling");
        // Pass the message content to the file sync handler
        if (data.message) {
            this.sync.fileSync.handleSyncMessage(data.message);
        }
        break;
      // --- END NEW ---
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
        // Removed console.log for this
        await this.sync.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await this.sync.peerConnection.createAnswer();
        await this.sync.peerConnection.setLocalDescription(answer);
        debug.log("DEBUG: Sending answer");
        // Removed console.log for this
        this.sendSignal({
          type: 'answer',
          sdp: answer.sdp
        });
      } else if (data.type === 'answer') {
        debug.log("DEBUG: Handling answer");
        // Removed console.log for this
        await this.sync.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.type === 'candidate') {
        debug.log("DEBUG: Handling ICE candidate");
        // Removed console.log for this
        const candidate = new RTCIceCandidate(data.candidate);
        await this.sync.peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      debug.error('Error handling signal:', error);
      console.error('Error handling signal:', error);
      this.sync.addMessage(`WebRTC error: ${error.message}`);
    }
  }

  // --- ADDITION: New helper method for Initiator ---
  async createOfferAfterPeerJoined() {
    try {
        // Ensure peer connection exists (it should, but be safe)
        if (!this.sync.peerConnection) {
             debug.error("DEBUG: createOfferAfterPeerJoined called but peerConnection is null");
             console.error("DEBUG: createOfferAfterPeerJoined called but peerConnection is null");
             return;
        }

        // Create offer
        debug.log("DEBUG: Creating offer");
        // Removed console.log for this
        const offer = await this.sync.peerConnection.createOffer();
        await this.sync.peerConnection.setLocalDescription(offer);

        // Send offer through signaling server
        debug.log("DEBUG: Sending offer");
        // Removed console.log for this
        this.sendSignal({ type: 'offer', sdp: offer.sdp });

    } catch (error) {
        debug.error('Error creating/sending offer after peer joined:', error);
        console.error('Error creating/sending offer after peer joined:', error);
        this.sync.updateStatus('Error creating offer: ' + error.message);
        this.sync.addMessage(`Error: ${error.message}`);
    }
  }
  // --- END ADDITION ---

  // Start a new WebRTC session (initiator)
  async startSession() {
    try {
      this.sync.isInitiator = true;
      this.sync.updateStatus('Connecting to signaling server...');
      
      await this.connectToSignalingServer();
      
      // Create peer connection
      this.sync.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Add connection state logging
      this.sync.peerConnection.onconnectionstatechange = () => {
        debug.log("DEBUG: PeerConnection state:", this.sync.peerConnection.connectionState);
        // Keep user-facing status messages
        this.sync.addMessage(`Connection state: ${this.sync.peerConnection.connectionState}`);
      };
      
      this.sync.peerConnection.oniceconnectionstatechange = () => {
        debug.log("DEBUG: ICE Connection state:", this.sync.peerConnection.iceConnectionState);
        // Keep user-facing status messages
        this.sync.addMessage(`ICE state: ${this.sync.peerConnection.iceConnectionState}`);
      };
      
      // Create data channel (moved here, before any signaling)
      debug.log("DEBUG: Creating data channel");
      // Removed console.log for this
      this.sync.dataChannel = this.sync.peerConnection.createDataChannel('syncChannel');
      this.sync.fileSync.setupDataChannel(this.sync.dataChannel);
      
      // Handle ICE candidates
      this.sync.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          debug.log("DEBUG: Sending ICE candidate");
          // Removed console.log for this
          this.sendSignal({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      };
      
      // --- MODIFICATION: Move offer creation to after peer joins ---
      // Request session creation from server
      debug.log("DEBUG: Requesting session creation from server");
      this.ws.send(JSON.stringify({
        type: 'create_session'
      }));
      
      this.sync.updateStatus('Creating session...');
      // --- END MODIFICATION ---
    } catch (error) {
      debug.error('Error starting session:', error);
      console.error('Error starting session:', error);
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
      
      // Request to join session
      debug.log("DEBUG: Requesting to join session:", code);
      this.ws.send(JSON.stringify({
        type: 'join_session',
        sessionId: code
      }));
      
      // Create peer connection
      this.sync.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Add connection state logging
      this.sync.peerConnection.onconnectionstatechange = () => {
        debug.log("DEBUG: PeerConnection state:", this.sync.peerConnection.connectionState);
        // Keep user-facing status messages
        this.sync.addMessage(`Connection state: ${this.sync.peerConnection.connectionState}`);
      };
      
      this.sync.peerConnection.oniceconnectionstatechange = () => {
        debug.log("DEBUG: ICE Connection state:", this.sync.peerConnection.iceConnectionState);
        // Keep user-facing status messages
        this.sync.addMessage(`ICE state: ${this.sync.peerConnection.iceConnectionState}`);
      };
      
      // Handle data channel
      this.sync.peerConnection.ondatachannel = (event) => {
        debug.log("DEBUG: Data channel received");
        // Removed console.log for this
        this.sync.dataChannel = event.channel;
        this.sync.fileSync.setupDataChannel(this.sync.dataChannel);
      };
      
      // Handle ICE candidates
      this.sync.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          debug.log("DEBUG: Sending ICE candidate");
          // Removed console.log for this
          this.sendSignal({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      };
      
      this.sync.updateStatus('Joining session...', code);
    } catch (error) {
      debug.error('Error joining session:', error);
      console.error('Error joining session:', error);
      this.sync.updateStatus('Error joining session: ' + error.message);
      this.sync.addMessage(`Error: ${error.message}`);
    }
  }

  // --- NEW METHOD: Send sync message via signaling server ---
  sendSyncMessageViaSignaling(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.targetPeerId) {
      // Send message directly to the target peer via the signaling server
      debug.log("DEBUG: Sent sync message via signaling to peer", this.targetPeerId);
      this.ws.send(JSON.stringify({
        type: 'direct_sync_message',
        targetPeerId: this.targetPeerId, // Send to the specific peer
        message: data // The actual sync message (e.g., {type: 'file_update', ...})
      }));
      // Update sync method tracking
      this.lastSyncMethod = 'websocket';
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
       // Fallback: broadcast if we don't know the target ID (e.g., for the joining peer)
       debug.log("DEBUG: Sent sync message via signaling (broadcast)");
       this.ws.send(JSON.stringify({
        type: 'direct_sync_message',
        // No targetPeerId means broadcast within session (server needs to handle this)
        message: data
      }));
      // Update sync method tracking
      this.lastSyncMethod = 'websocket';
    } else {
      debug.warn('Signaling WebSocket not open or target peer unknown, could not send sync message via signaling.');
      console.warn('Signaling WebSocket not open or target peer unknown, could not send sync message via signaling.');
      this.sync.addMessage('Error: Not connected to signaling server for message send.');
      // Do not update sync method here, as it's an error condition
    }
  }
  // --- END NEW METHOD ---

  // --- MODIFIED sendSyncMessage: Try data channel first, fallback to signaling ---
  sendSyncMessage(data) {
    // If data channel is open, use it (preferred for speed)
    if (this.sync.dataChannel && this.sync.dataChannel.readyState === 'open') {
        debug.log("DEBUG: Sent sync message via data channel");
        // Removed direct console.log
        this.sync.dataChannel.send(JSON.stringify(data));
        // Update sync method tracking
        this.lastSyncMethod = 'webrtc';
    } else {
        // Fallback to signaling server if data channel is not available/open
        debug.log("DEBUG: Data channel not open, falling back to signaling for sync message");
        // Removed direct console.log for this
        this.sendSyncMessageViaSignaling(data);
        // sendSyncMessageViaSignaling will update lastSyncMethod to 'websocket'
    }
  }
  // --- END MODIFIED sendSyncMessage ---

  destroy() {
    if (this.ws) {
      this.ws.close();
    }
    // Reset sync method on destroy
    this.lastSyncMethod = 'none';
  }
}