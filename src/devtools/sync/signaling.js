// src/devtools/sync/signaling.js
export class SyncSignaling {
  constructor(syncInstance) {
    this.sync = syncInstance;
    this.ws = null;
    this.signalingServerUrl = localStorage.getItem('thoughtform_signaling_server') || 'ws://localhost:8080';
    // Store peer information for direct signaling
    this.peerId = null;
    this.targetPeerId = null;
  }

  updateSignalingServerUrl(url) {
    this.signalingServerUrl = url;
    localStorage.setItem('thoughtform_signaling_server', url);
  }

  connectToSignalingServer() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.signalingServerUrl);
      
      this.ws.onopen = () => {
        console.log(`Connected to signaling server at ${this.signalingServerUrl}`);
        resolve();
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from signaling server');
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error(`Failed to connect to signaling server at ${this.signalingServerUrl}`));
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSignalingMessage(data);
        } catch (error) {
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
        break;
        
      case 'peer_joined':
        console.log('Peer joined session');
        // Store the ID of the peer that joined (if we are the initiator)
        if (this.sync.isInitiator && data.peerId) {
           this.targetPeerId = data.peerId;
           console.log("DEBUG: Stored target peer ID:", this.targetPeerId);
        }
        this.sync.updateStatus('Peer joined. Establishing connection...', this.sync.sessionCode);
        break;

      case 'signal':
        this.handleSignal(data.data);
        break;
        
      case 'peer_left':
        console.log('Peer left session');
        this.sync.updateStatus('Peer disconnected', this.sync.sessionCode);
        break;
        
      case 'error':
        console.error('Signaling error:', data.message);
        this.sync.updateStatus('Signaling error: ' + data.message);
        break;
        
      // --- NEW: Handle direct sync messages via signaling ---
      case 'direct_sync_message':
        console.log("DEBUG: Received direct sync message via signaling");
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
      this.ws.send(JSON.stringify({
        type: 'signal',
        data: data
      }));
    }
  }

  async handleSignal(data) {
    try {
      console.log("DEBUG: Received signal:", data.type);
      if (data.type === 'offer') {
        console.log("DEBUG: Handling offer");
        await this.sync.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await this.sync.peerConnection.createAnswer();
        await this.sync.peerConnection.setLocalDescription(answer);
        console.log("DEBUG: Sending answer");
        this.sendSignal({
          type: 'answer',
          sdp: answer.sdp
        });
      } else if (data.type === 'answer') {
        console.log("DEBUG: Handling answer");
        await this.sync.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.type === 'candidate') {
        console.log("DEBUG: Handling ICE candidate");
        const candidate = new RTCIceCandidate(data.candidate);
        await this.sync.peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error handling signal:', error);
      this.sync.addMessage(`WebRTC error: ${error.message}`);
    }
  }

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
        console.log("DEBUG: PeerConnection state:", this.sync.peerConnection.connectionState);
        this.sync.addMessage(`Connection state: ${this.sync.peerConnection.connectionState}`);
      };
      
      this.sync.peerConnection.oniceconnectionstatechange = () => {
        console.log("DEBUG: ICE Connection state:", this.sync.peerConnection.iceConnectionState);
        this.sync.addMessage(`ICE state: ${this.sync.peerConnection.iceConnectionState}`);
      };
      
      // Create data channel
      this.sync.dataChannel = this.sync.peerConnection.createDataChannel('syncChannel');
      this.sync.fileSync.setupDataChannel(this.sync.dataChannel);
      
      // Handle ICE candidates
      this.sync.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("DEBUG: Sending ICE candidate");
          this.sendSignal({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      };
      
      // Create offer
      console.log("DEBUG: Creating offer");
      const offer = await this.sync.peerConnection.createOffer();
      await this.sync.peerConnection.setLocalDescription(offer);
      
      // Send offer through signaling server
      console.log("DEBUG: Sending offer");
      this.sendSignal({
        type: 'offer',
        sdp: offer.sdp
      });
      
      // Request session creation from server
      this.ws.send(JSON.stringify({
        type: 'create_session'
      }));
      
      this.sync.updateStatus('Creating session...');
    } catch (error) {
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
        console.log("DEBUG: PeerConnection state:", this.sync.peerConnection.connectionState);
        this.sync.addMessage(`Connection state: ${this.sync.peerConnection.connectionState}`);
      };
      
      this.sync.peerConnection.oniceconnectionstatechange = () => {
        console.log("DEBUG: ICE Connection state:", this.sync.peerConnection.iceConnectionState);
        this.sync.addMessage(`ICE state: ${this.sync.peerConnection.iceConnectionState}`);
      };
      
      // Handle data channel
      this.sync.peerConnection.ondatachannel = (event) => {
        console.log("DEBUG: Data channel received");
        this.sync.dataChannel = event.channel;
        this.sync.fileSync.setupDataChannel(this.sync.dataChannel);
      };
      
      // Handle ICE candidates
      this.sync.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("DEBUG: Sending ICE candidate");
          this.sendSignal({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      };
      
      this.sync.updateStatus('Joining session...', code);
    } catch (error) {
      console.error('Error joining session:', error);
      this.sync.updateStatus('Error joining session: ' + error.message);
      this.sync.addMessage(`Error: ${error.message}`);
    }
  }

  // --- NEW METHOD: Send sync message via signaling server ---
  sendSyncMessageViaSignaling(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.targetPeerId) {
      // Send message directly to the target peer via the signaling server
      this.ws.send(JSON.stringify({
        type: 'direct_sync_message',
        targetPeerId: this.targetPeerId, // Send to the specific peer
        message: data // The actual sync message (e.g., {type: 'file_update', ...})
      }));
      console.log("DEBUG: Sent sync message via signaling to peer", this.targetPeerId);
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
       // Fallback: broadcast if we don't know the target ID (e.g., for the joining peer)
       this.ws.send(JSON.stringify({
        type: 'direct_sync_message',
        // No targetPeerId means broadcast within session (server needs to handle this)
        message: data
      }));
      console.log("DEBUG: Sent sync message via signaling (broadcast)");
    } else {
      console.warn('Signaling WebSocket not open or target peer unknown, could not send sync message via signaling.');
      this.sync.addMessage('Error: Not connected to signaling server for message send.');
    }
  }
  // --- END NEW METHOD ---

  // --- MODIFIED sendSyncMessage: Try data channel first, fallback to signaling ---
  sendSyncMessage(data) {
    // If data channel is open, use it (preferred for speed)
    if (this.sync.dataChannel && this.sync.dataChannel.readyState === 'open') {
      this.sync.dataChannel.send(JSON.stringify(data));
      console.log("DEBUG: Sent sync message via data channel");
    } else {
      // Fallback to signaling server if data channel is not available/open
      console.log("DEBUG: Data channel not open, falling back to signaling for sync message");
      this.sendSyncMessageViaSignaling(data);
    }
  }
  // --- END MODIFIED sendSyncMessage ---

  destroy() {
    if (this.ws) {
      this.ws.close();
    }
  }
}