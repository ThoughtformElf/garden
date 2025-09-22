// src/devtools/sync-ui.js
export class SyncUI {
  constructor(syncInstance) {
    this.sync = syncInstance;
  }

  render() {
    this.sync._container.innerHTML = `
      <div id="eruda-Sync">
        <div class="eruda-sync-config" style="margin-bottom: 20px; padding: 10px; border: 1px solid #444; border-radius: 4px;">
          <h3>Signaling Server Configuration</h3>
          <label for="signaling-server-url">Server URL:</label>
          <input type="text" id="signaling-server-url" class="eruda-input" value="${this.sync.signaling.signalingServerUrl}" placeholder="ws://localhost:8080">
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
        <div class="eruda-sync-controls" style="margin-top: 20px;">
          <button id="sync-all-files-btn" class="eruda-button">Send All Files</button>
          <button id="request-all-files-btn" class="eruda-button">Request All Files</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const startBtn = this.sync._container.querySelector('#start-sync-btn');
    const joinBtn = this.sync._container.querySelector('#join-sync-btn');
    const sendBtn = this.sync._container.querySelector('#eruda-send-message-btn');
    const saveConfigBtn = this.sync._container.querySelector('#save-signaling-config');
    const syncAllBtn = this.sync._container.querySelector('#sync-all-files-btn');
    const requestAllBtn = this.sync._container.querySelector('#request-all-files-btn');
    
    startBtn.addEventListener('click', () => {
      this.sync.emit('start');
      this.sync.signaling.startSession();
    });
    
    joinBtn.addEventListener('click', () => {
      const code = this.sync._container.querySelector('#sync-join-code').value.trim();
      if (code) {
        this.sync.emit('join', code);
        this.sync.signaling.joinSession(code);
      }
    });
    
    sendBtn.addEventListener('click', () => {
      const messageInput = this.sync._container.querySelector('#eruda-message-input');
      const message = messageInput.value.trim();
      if (message && this.sync.dataChannel && this.sync.dataChannel.readyState === 'open') {
        this.sync.dataChannel.send(message);
        this.sync.addMessage('Sent: ' + message);
        messageInput.value = '';
      }
    });
    
    saveConfigBtn.addEventListener('click', () => {
      const urlInput = this.sync._container.querySelector('#signaling-server-url');
      const newUrl = urlInput.value.trim();
      if (newUrl) {
        this.sync.signaling.updateSignalingServerUrl(newUrl);
        this.sync.updateStatus(`Signaling server URL updated to: ${newUrl}`);
      }
    });
    
    syncAllBtn.addEventListener('click', () => {
      this.sync.fileSync.syncAllFiles();
    });
    
    requestAllBtn.addEventListener('click', () => {
      this.sync.fileSync.requestAllFiles();
    });
  }

  updateStatus(message, code = null) {
    const statusEl = this.sync._container.querySelector('#sync-status');
    const sessionCodeEl = this.sync._container.querySelector('#sync-session-code');
    const sessionInfoEl = this.sync._container.querySelector('#sync-session-info');
    
    if (statusEl) statusEl.textContent = message;
    if (code && sessionCodeEl && sessionInfoEl) {
      sessionCodeEl.textContent = code;
      sessionInfoEl.style.display = 'block';
    } else if (sessionInfoEl) {
      sessionInfoEl.style.display = 'none';
    }
  }

  addMessage(text) {
    const messagesList = this.sync._container.querySelector('#eruda-messages-list');
    if (messagesList) {
      const messageEl = document.createElement('div');
      messageEl.textContent = text;
      messagesList.appendChild(messageEl);
      messagesList.scrollTop = messagesList.scrollHeight;
    }
  }

  showMessages() {
    const messagesDiv = this.sync._container.querySelector('#eruda-sync-messages');
    if (messagesDiv) {
      messagesDiv.style.display = 'block';
    }
  }

  hideMessages() {
    const messagesDiv = this.sync._container.querySelector('#eruda-sync-messages');
    if (messagesDiv) {
      messagesDiv.style.display = 'none';
    }
  }
}