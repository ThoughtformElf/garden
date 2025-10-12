// src/devtools/sync/ui.js
import debug from '../../util/debug.js';
import { Modal } from '../../util/modal.js';

export class SyncUI {
  constructor(syncInstance) {
    this.sync = syncInstance;
    this.syncMethodIndicatorEl = null;
    this.syncProgressModal = null;
    this.syncProgressLogArea = null;
    this.syncProgressFinalMessageArea = null;
    this.syncProgressActionButton = null;
    
    this.connectBtn = null;
    this.nameInput = null;
    this.autoConnectCheckbox = null;
  }
  
  render() {
    if (this.sync._container) {
      this.sync._container.innerHTML = `
        <div class="sync-container">
          <div class="sync-panel">
              <h3>Signaling Server</h3>
              <div class="sync-row">
                <label for="signaling-server-url" class="sync-label">Server URL:</label>
                <input type="text" id="signaling-server-url" class="eruda-input flex-grow" value="${this.sync.signaling.signalingServerUrl}">
                <button id="save-signaling-config" class="eruda-button">Save</button>
              </div>
            </div>
            <div class="sync-panel">
              <h3>Sync Configuration</h3>
              <div class="sync-row">
                <label for="sync-name-input" class="sync-label">Sync Name:</label>
                <input type="text" id="sync-name-input" class="eruda-input" placeholder="e.g., my-devices">
                <button id="sync-connect-btn" class="eruda-button">Connect</button>
              </div>
              <div class="sync-row space-between">
                <label class="flex-center">
                  <input type="checkbox" id="sync-autoconnect-checkbox">
                  <span>Auto-connect on startup</span>
                </label>
              </div>
            </div>
            <div class="sync-panel">
                <div class="sync-status-grid">
                    <strong>Status:</strong> <span id="sync-status">Disconnected</span>
                    <strong>Method:</strong> <span id="sync-method-indicator">None</span>
                    <!-- THIS IS THE FIX: Added the missing peer count element -->
                    <strong>Peers:</strong> <span id="sync-peer-count">0</span>
                </div>
            </div>
            <div class="sync-panel sync-actions">
              <h4>File Sync Actions</h4>
              <div class="sync-row">
                <button id="send-to-peers-btn" class="eruda-button">Send to Peers...</button>
                <button id="request-all-files-btn" class="eruda-button">Request from Peer...</button>
              </div>
            </div>
            <div class="sync-messages-container hidden" id="eruda-sync-messages">
              <h3>Messages</h3>
              <div id="eruda-messages-list" class="sync-messages-list"></div>
            </div>
        </div>
      `;
      this.syncMethodIndicatorEl = this.sync._container.querySelector('#sync-method-indicator');
      this.connectBtn = this.sync._container.querySelector('#sync-connect-btn');
      this.nameInput = this.sync._container.querySelector('#sync-name-input');
      this.autoConnectCheckbox = this.sync._container.querySelector('#sync-autoconnect-checkbox');
    }
  }
  
  bindEvents() {
    if (!this.sync._container) {
      debug.error("SyncUI.bindEvents: Container not set");
      return;
    }
    
    this.nameInput.value = localStorage.getItem('thoughtform_sync_name') || '';
    this.autoConnectCheckbox.checked = localStorage.getItem('thoughtform_sync_auto_connect') === 'true';
    
    this.connectBtn.addEventListener('click', () => {
      const currentState = this.sync.connectionState;
      if (currentState === 'disconnected' || currentState === 'error') {
        const syncName = this.nameInput.value.trim();
        const autoConnect = this.autoConnectCheckbox.checked;
        if (!syncName) {
          this.addMessage("Please enter a Sync Name.");
          return;
        }
        localStorage.setItem('thoughtform_sync_name', syncName);
        localStorage.setItem('thoughtform_sync_auto_connect', autoConnect);
        this.sync.connect(syncName);
      } else {
        this.sync.disconnect();
      }
    });
    
    const saveConfigBtn = this.sync._container.querySelector('#save-signaling-config');
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => {
        const urlInput = this.sync._container.querySelector('#signaling-server-url');
        const newUrl = urlInput ? urlInput.value.trim() : '';
        if (newUrl) {
          this.sync.signaling.updateSignalingServerUrl(newUrl);
          this.addMessage(`Signaling server updated to: ${newUrl}`);
        } else {
          this.addMessage('Please enter a valid signaling server URL.');
        }
      });
    }
    
    const sendToPeersBtn = this.sync._container.querySelector('#send-to-peers-btn');
    const requestAllBtn = this.sync._container.querySelector('#request-all-files-btn');
    
    if (sendToPeersBtn) {
      sendToPeersBtn.addEventListener('click', async () => {
        const gardensRaw = localStorage.getItem('thoughtform_gardens');
        const gardenData = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
        const peerData = this.sync.connectedPeers;

        const selection = await Modal.sendSelection({
            title: 'Send Gardens to Peers',
            peerData: peerData,
            gardenData: gardenData
        });
        
        if (selection) {
            debug.log('User initiated send:', selection);
            this.showSyncProgressModal();
            this.sync.fileSync.sendGardensToPeers(selection); 
        } else {
            debug.log('Garden send cancelled by user.');
        }
      });
    }
    
    if (requestAllBtn) {
      requestAllBtn.addEventListener('click', async () => {
        const selection = await Modal.selection({
          title: 'Request Gardens from Peers',
          peerData: this.sync.connectedPeers
        });

        if (selection) {
          debug.log('User made selection:', selection);
          this.showSyncProgressModal();
          this.sync.fileSync.requestSpecificGardens(selection);
        } else {
          debug.log('Garden request cancelled by user.');
        }
      });
    }
  }
  
  updateStatus(message) {
    const statusEl = this.sync._container.querySelector('#sync-status');
    if (statusEl) statusEl.textContent = message;
    
    // This will now correctly find and update the peer count element.
    const peerCountEl = this.sync._container.querySelector('#sync-peer-count');
    if (peerCountEl) peerCountEl.textContent = this.sync.connectedPeers.size;
  }
  
  updateControls(state) {
    const isDisconnected = (state === 'disconnected' || state === 'error');
    const isConnecting = (state === 'connecting');
    if (this.connectBtn) {
      this.connectBtn.disabled = isConnecting;
      if (isDisconnected) this.connectBtn.textContent = 'Connect';
      else if (isConnecting) this.connectBtn.textContent = 'Connecting...';
      else this.connectBtn.textContent = 'Disconnect';
    }
    if (this.nameInput) this.nameInput.disabled = !isDisconnected;
    if (this.autoConnectCheckbox) this.autoConnectCheckbox.disabled = !isDisconnected;
    const shouldEnableFileSync = (state === 'connected-p2p' || state === 'connected-signal');
    this.sync._container.querySelectorAll('.sync-actions button').forEach(btn => btn.disabled = !shouldEnableFileSync);
  }
  
  updateConnectionIndicator(state) {
    const tabEl = document.querySelector('.luna-tab-item[data-id="Sync"]');
    if (tabEl) {
      tabEl.classList.remove('sync-status-connecting', 'sync-status-p2p', 'sync-status-signal', 'sync-status-error');
      let methodText = 'None';
      let methodColor = 'var(--color-text-secondary)';
      switch (state) {
        case 'connecting':
          tabEl.classList.add('sync-status-connecting');
          methodText = 'Connecting...';
          methodColor = 'var(--base-accent-warning)';
          break;
        case 'connected-signal':
          tabEl.classList.add('sync-status-signal');
          methodText = 'WebSocket (Fallback)';
          methodColor = 'var(--base-accent-warning)';
          break;
        case 'connected-p2p':
          tabEl.classList.add('sync-status-p2p');
          methodText = 'WebRTC (P2P)';
          methodColor = 'var(--base-accent-action)';
          break;
        case 'error':
          tabEl.classList.add('sync-status-error');
          methodText = 'Error';
          methodColor = 'var(--base-accent-destructive)';
          break;
      }
      if (this.syncMethodIndicatorEl) {
        this.syncMethodIndicatorEl.textContent = methodText;
        this.syncMethodIndicatorEl.style.color = methodColor;
      }
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
    if (messagesDiv) messagesDiv.style.display = 'block';
  }
  
  hideMessages() {
    const messagesDiv = this.sync._container.querySelector('#eruda-sync-messages');
    if (messagesDiv) messagesDiv.style.display = 'none';
  }
  
  showSyncProgressModal() {
    if (this.syncProgressModal) this.syncProgressModal.destroy();
    this.syncProgressModal = new Modal({ title: 'File Sync Progress' });
    const progressContent = `
      <div id="sync-progress-log" style="height: 300px; overflow-y: auto; border: 1px solid var(--color-border-primary); padding: 1rem; background-color: var(--base-dark); margin-bottom: 1rem;"></div>
      <div id="sync-progress-final-message" style="font-weight: bold; padding: 5px; min-height: 20px;"></div>
    `;
    this.syncProgressModal.updateContent(progressContent);
    this.syncProgressLogArea = this.syncProgressModal.content.querySelector('#sync-progress-log');
    this.syncProgressFinalMessageArea = this.syncProgressModal.content.querySelector('#sync-progress-final-message');
    this.syncProgressActionButton = null; 
    this.syncProgressModal.show();
  }
  
  updateSyncProgress(event) {
    if (!this.syncProgressModal || !this.syncProgressLogArea) return;
    const { message = 'No message', type = 'info' } = event.detail;
    const logEntry = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    logEntry.style.marginBottom = '5px';
    switch (type) {
      case 'error': logEntry.style.color = 'var(--base-accent-destructive)'; break;
      case 'complete': logEntry.style.color = 'var(--base-accent-action)'; break;
      case 'cancelled': logEntry.style.color = 'var(--base-accent-warning)'; break;
      default: logEntry.style.color = 'var(--color-text-primary)'; break;
    }
    this.syncProgressLogArea.appendChild(logEntry);
    this.syncProgressLogArea.scrollTop = this.syncProgressLogArea.scrollHeight;

    if (['complete', 'error', 'cancelled'].includes(type)) {
      if (this.syncProgressFinalMessageArea) {
        this.syncProgressFinalMessageArea.textContent = message;
        this.syncProgressFinalMessageArea.style.color = logEntry.style.color;
      }
      
      if (this.syncProgressActionButton) {
        this.syncProgressActionButton.remove();
      }

      if (type === 'error' || type === 'cancelled') {
        this.syncProgressActionButton = this.syncProgressModal.addFooterButton('Close', () => this.hideSyncProgressModal());
        if (type === 'error') this.syncProgressActionButton.classList.add('destructive');
      }
    }
  }
  
  hideSyncProgressModal() {
    if (this.syncProgressModal) {
      this.syncProgressModal.destroy();
      this.syncProgressModal = null;
    }
  }
}