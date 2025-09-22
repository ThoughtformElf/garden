// src/devtools/sync.js

// A simple event emitter class to communicate with other parts of the app
class Emitter {
  constructor() {
    this._listeners = {};
  }

  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
  }

  emit(event, ...args) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(callback => callback(...args));
    }
  }
}

export class Sync extends Emitter {
  constructor() {
    super();
    this.name = 'sync';
    this._container = null;
    this.peerConnection = null;
    this.dataChannel = null;
    this.sessionCode = null;
    this.isInitiator = false;
    this.isConnected = false;
    this.ws = null; // WebSocket connection
    this.peerId = null;
    
    // Get signaling server URL from localStorage or use default
    this.signalingServerUrl = localStorage.getItem('thoughtform_signaling_server') || 'ws://localhost:8080';
    
    // STUN servers configuration
    this.configuration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    };
  }

  init(dom) {
    this._container = dom;
    this._container.style.padding = '1rem';
    this._container.style.overflowY = 'auto';
    this.render();
  }

  render() {
    this._container.innerHTML = `
      <div id="eruda-Sync">
        <div class="eruda-sync-config" style="margin-bottom: 20px; padding: 10px; border: 1px solid #444; border-radius: 4px;">
          <h3>Signaling Server Configuration</h3>
          <label for="signaling-server-url">Server URL:</label>
          <input type="text" id="signaling-server-url" class="eruda-input" value="${this.signalingServerUrl}" placeholder="ws://localhost:8080">
          <button id="save-signaling-config" class="eruda-button" style="margin-left: 10px;">Save</button>
        </div>
        
        <div class="eruda-sync-status">
          <strong>Status:</strong> <span id="sync-status">Disconnected</span>
        </div>
        <div class="eruda-sync-main">
          <div id="sync-initiator">
            <button id="start-sync-btn" class="eruda-button">Start Sync Session</button>
            <div id="sync-session-info" style="display: none; margin-top: 10px;">
              <p>Share this code with your other device:</p>
              <strong id="sync-session-code" class="eruda-code"></strong>
            </div>
          </div>
          <div id="sync-joiner" style="margin-top: 20px;">
            <label for="sync-join-code">Join a session:</label>
            <input type="text" id="sync-join-code" class="eruda-input" placeholder="Enter code...">
            <button id="join-sync-btn" class="eruda-button">Join</button>
          </div>
        </div>
        <div class="eruda-sync-messages" id="eruda-sync-messages" style="display:none; margin-top: 20px;">
          <h3>Messages</h3>
          <div id="eruda-messages-list" style="height: 150px; overflow-y: auto; border: 1px solid #333; padding: 10px; background-color: #252525; margin-bottom: 10px;"></div>
          <input type="text" id="eruda-message-input" class="eruda-input" placeholder="Type a message...">
          <button id="eruda-send-message-btn" class="eruda-button">Send</button>
        </div>
      </div>
    `;
    this.bindEvents();
  }

  bindEvents() {
    const startBtn = this._container.querySelector('#start-sync-btn');
    const joinBtn = this._container.querySelector('#join-sync-btn');
    const sendBtn = this._container.querySelector('#eruda-send-message-btn');
    const saveConfigBtn = this._container.querySelector('#save-signaling-config');
    
    startBtn.addEventListener('click', () => {
      this.emit('start');
      this.startSession();
    });
    
    joinBtn.addEventListener('click', () => {
      const code = this._container.querySelector('#sync-join-code').value.trim();
      if (code) {
        this.emit('join', code);
        this.joinSession(code);
      }
    });
    
    sendBtn.addEventListener('click', () => {
      const messageInput = this._container.querySelector('#eruda-message-input');
      const message = messageInput.value.trim();
      if (message && this.dataChannel && this.dataChannel.readyState === 'open') {
        this.sendMessage(message);
        messageInput.value = '';
      }
    });
    
    saveConfigBtn.addEventListener('click', () => {
      const urlInput = this._container.querySelector('#signaling-server-url');
      const newUrl = urlInput.value.trim();
      if (newUrl) {
        this.signalingServerUrl = newUrl;
        localStorage.setItem('thoughtform_signaling_server', newUrl);
        this.updateStatus(`Signaling server URL updated to: ${newUrl}`);
      }
    });
  }

  updateStatus(message, code = null) {
    const statusEl = this._container.querySelector('#sync-status');
    const sessionCodeEl = this._container.querySelector('#sync-session-code');
    const sessionInfoEl = this._container.querySelector('#sync-session-info');
    
    if (statusEl) statusEl.textContent = message;
    if (code && sessionCodeEl && sessionInfoEl) {
      sessionCodeEl.textContent = code;
      sessionInfoEl.style.display = 'block';
    } else if (sessionInfoEl) {
      sessionInfoEl.style.display = 'none';
    }
  }

  // Connect to WebSocket signaling server
  connectToSignalingServer() {
    return new Promise((resolve, reject) => {
      // Use the configured signaling server URL
      this.ws = new WebSocket(this.signalingServerUrl);
      
      this.ws.onopen = () => {
        console.log(`Connected to signaling server at ${this.signalingServerUrl}`);
        this.updateStatus(`Connected to signaling server`);
        resolve();
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from signaling server');
        this.updateStatus('Disconnected from signaling server');
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

  // Handle incoming signaling messages
  handleSignalingMessage(data) {
    switch (data.type) {
      case 'session_created':
        this.sessionCode = data.sessionId;
        this.updateStatus('Session created. Share this code with your peer.', this.sessionCode);
        break;
        
      case 'peer_joined':
        console.log('Peer joined session');
        this.updateStatus('Peer joined. Establishing connection...', this.sessionCode);
        break;
        
      case 'signal':
        this.handleSignal(data.data);
        break;
        
      case 'peer_left':
        console.log('Peer left session');
        this.updateStatus('Peer disconnected', this.sessionCode);
        break;
        
      case 'error':
        console.error('Signaling error:', data.message);
        this.updateStatus('Signaling error: ' + data.message);
        break;
    }
  }

  // Send signaling data through WebSocket
  sendSignal(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'signal',
        data: data
      }));
    }
  }

  // Handle WebRTC signaling data
  async handleSignal(data) {
    try {
      if (data.type === 'offer') {
        // Set remote description for offer
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        
        // Create and send answer
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        this.sendSignal({
          type: 'answer',
          sdp: answer.sdp
        });
      } else if (data.type === 'answer') {
        // Set remote description for answer
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.type === 'candidate') {
        // Add ICE candidate
        const candidate = new RTCIceCandidate(data.candidate);
        await this.peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  }

  // Start a new WebRTC session (initiator)
  async startSession() {
    try {
      this.isInitiator = true;
      this.updateStatus('Connecting to signaling server...');
      
      // Connect to signaling server
      await this.connectToSignalingServer();
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      // Create data channel
      this.dataChannel = this.peerConnection.createDataChannel('syncChannel');
      this.setupDataChannel(this.dataChannel);
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      };
      
      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // Send offer through signaling server
      this.sendSignal({
        type: 'offer',
        sdp: offer.sdp
      });
      
      // Request session creation from server
      this.ws.send(JSON.stringify({
        type: 'create_session'
      }));
      
      this.updateStatus('Creating session...');
    } catch (error) {
      console.error('Error starting session:', error);
      this.updateStatus('Error starting session: ' + error.message);
    }
  }

  // Join an existing WebRTC session
  async joinSession(code) {
    try {
      this.isInitiator = false;
      this.sessionCode = code;
      this.updateStatus('Connecting to signaling server...');
      
      // Connect to signaling server
      await this.connectToSignalingServer();
      
      // Request to join session
      this.ws.send(JSON.stringify({
        type: 'join_session',
        sessionId: code
      }));
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      // Handle data channel
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal({
            type: 'candidate',
            candidate: event.candidate
          });
        }
      };
      
      this.updateStatus('Joining session...', code);
    } catch (error) {
      console.error('Error joining session:', error);
      this.updateStatus('Error joining session: ' + error.message);
    }
  }

  // Setup data channel event handlers
  setupDataChannel(channel) {
    channel.onopen = () => {
      this.isConnected = true;
      this.updateStatus('Connected', this.sessionCode);
      this._container.querySelector('#eruda-sync-messages').style.display = 'block';
      this.addMessage('Data channel opened');
    };
    
    channel.onmessage = (event) => {
      this.addMessage('Received: ' + event.data);
    };
    
    channel.onclose = () => {
      this.isConnected = false;
      this.updateStatus('Disconnected', this.sessionCode);
      this._container.querySelector('#eruda-sync-messages').style.display = 'none';
      this.addMessage('Data channel closed');
    };
    
    channel.onerror = (error) => {
      console.error('Data channel error:', error);
      this.updateStatus('Data channel error: ' + error.message);
      this.addMessage('Data channel error: ' + error.message);
    };
  }

  // Send a message through the data channel
  sendMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(message);
      this.addMessage('Sent: ' + message);
    } else {
      this.addMessage('Data channel is not open');
    }
  }

  // Add a message to the messages list
  addMessage(text) {
    const messagesList = this._container.querySelector('#eruda-messages-list');
    if (messagesList) {
      const messageEl = document.createElement('div');
      messageEl.textContent = text;
      messagesList.appendChild(messageEl);
      messagesList.scrollTop = messagesList.scrollHeight;
    }
  }

  show() {
    this._container.style.display = 'block';
  }

  hide() {
    this._container.style.display = 'none';
  }

  destroy() {
    // Clean up resources if needed
    if (this.ws) {
      this.ws.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
  }
}