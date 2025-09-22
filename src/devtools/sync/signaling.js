// src/devtools/sync-signaling.js
export class SyncSignaling {
  constructor(syncInstance) {
    this.sync = syncInstance;
    this.ws = null;
    this.signalingServerUrl = localStorage.getItem('thoughtform_signaling_server') || 'ws://localhost:8080';
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
      if (data.type === 'offer') {
        await this.sync.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await this.sync.peerConnection.createAnswer();
        await this.sync.peerConnection.setLocalDescription(answer);
        this.sendSignal({
          type: 'answer',
          sdp: answer.sdp
        });
      } else if (data.type === 'answer') {
        await this.sync.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.type === 'candidate') {
        const candidate = new RTCIceCandidate(data.candidate);
        await this.sync.peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error handling signal:', error);
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
      
      // Create data channel
      this.sync.dataChannel = this.sync.peerConnection.createDataChannel('syncChannel');
      this.sync.fileSync.setupDataChannel(this.sync.dataChannel);
      
      // Handle ICE candidates
      this.sync.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      };
      
      // Create offer
      const offer = await this.sync.peerConnection.createOffer();
      await this.sync.peerConnection.setLocalDescription(offer);
      
      // Send offer through signaling server
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
      
      // Handle data channel
      this.sync.peerConnection.ondatachannel = (event) => {
        this.sync.dataChannel = event.channel;
        this.sync.fileSync.setupDataChannel(this.sync.dataChannel);
      };
      
      // Handle ICE candidates
      this.sync.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
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
    }
  }

  sendSyncMessage(data) {
    if (this.sync.dataChannel && this.sync.dataChannel.readyState === 'open') {
      this.sync.dataChannel.send(JSON.stringify(data));
    } else {
      console.warn('Data channel not open, could not send sync message');
    }
  }

  destroy() {
    if (this.ws) {
      this.ws.close();
    }
  }
}