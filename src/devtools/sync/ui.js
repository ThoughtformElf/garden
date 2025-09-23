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
    this.syncProgressCloseButton = null;
    
    // Cache DOM elements for frequent access
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
                </div>
            </div>
            <div class="sync-panel sync-actions">
              <h4>File Sync Actions</h4>
              <div class="sync-row">
                <button id="sync-all-files-btn" class="eruda-button">Send All Files</button>
                <button id="request-all-files-btn" class="eruda-button">Request All Files</button>
              </div>
            </div>
            <div class="sync-messages-container hidden" id="eruda-sync-messages">
              <h3>Messages</h3>
              <div id="eruda-messages-list" class="sync-messages-list"></div>
            </div>
        </div>
      `;
      // Cache elements after rendering
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
    
    // Load saved settings from localStorage to populate the form
    this.nameInput.value = localStorage.getItem('thoughtform_sync_name') || '';
    this.autoConnectCheckbox.checked = localStorage.getItem('thoughtform_sync_auto_connect') === 'true';
    
    // Connect/Disconnect button listener
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
        
        debug.log("UI: Connect button clicked");
        this.sync.connect(syncName);
      } else {
        debug.log("UI: Disconnect button clicked");
        this.sync.disconnect();
      }
    });
    
    // THIS IS THE FIX: Added event listener for the server config save button
    const saveConfigBtn = this.sync._container.querySelector('#save-signaling-config');
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => {
        const urlInput = this.sync._container.querySelector('#signaling-server-url');
        const newUrl = urlInput ? urlInput.value.trim() : '';
        if (newUrl) {
          this.sync.signaling.updateSignalingServerUrl(newUrl);
          this.addMessage(`Signaling server updated to: ${newUrl}`);
          debug.log("UI: Save Config button clicked with URL:", newUrl);
        } else {
          this.addMessage('Please enter a valid signaling server URL.');
        }
      });
    }
    // END OF FIX
    
    const syncAllBtn = this.sync._container.querySelector('#sync-all-files-btn');
    const requestAllBtn = this.sync._container.querySelector('#request-all-files-btn');
    
    if (syncAllBtn) {
      syncAllBtn.addEventListener('click', async () => {
        debug.log("UI: Send All Files button clicked");
        this.showSyncProgressModal();
        await this.sync.fileSync.syncAllFiles();
      });
    }
    
    if (requestAllBtn) {
      requestAllBtn.addEventListener('click', () => {
        debug.log("UI: Request All Files button clicked");
        this.showSyncProgressModal();
        this.sync.fileSync.requestAllFiles();
      });
    }
  }
  
  updateStatus(message) {
    const statusEl = this.sync._container.querySelector('#sync-status');
    if (statusEl) {
      statusEl.textContent = message;
    }
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
    
    // Enable/disable file sync buttons based on active connection
    const fileSyncButtons = this.sync._container.querySelectorAll('.eruda-sync-main .eruda-button');
    const shouldEnableFileSync = (state === 'connected-p2p' || state === 'connected-signal');
    fileSyncButtons.forEach(btn => btn.disabled = !shouldEnableFileSync);
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
        case 'disconnected':
        default:
        methodText = 'None';
        methodColor = 'var(--color-text-secondary)';
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
    this.syncProgressCloseButton = this.syncProgressModal.addFooterButton('Close', () => this.hideSyncProgressModal());
    this.syncProgressCloseButton.disabled = true;
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
      if (this.syncProgressFinalMessageArea) this.syncProgressFinalMessageArea.textContent = message;
      if (this.syncProgressFinalMessageArea) this.syncProgressFinalMessageArea.style.color = logEntry.style.color;
      if (this.syncProgressCloseButton) this.syncProgressCloseButton.disabled = false;
    }
  }
  
  hideSyncProgressModal() {
    if (this.syncProgressModal) {
      this.syncProgressModal.destroy();
      this.syncProgressModal = null;
      this.syncProgressLogArea = null;
      this.syncProgressFinalMessageArea = null;
      this.syncProgressCloseButton = null;
    }
  }
}