import { EventBinder } from './ui/event-binder.js';
import { ModalHandler } from './ui/modal-handler.js';

export class SyncUI {
  constructor(syncInstance) {
    this.sync = syncInstance;
    this.eventBinder = new EventBinder(syncInstance);
    this.modalHandler = new ModalHandler(syncInstance);
    this.syncMethodIndicatorEl = null;
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
              <div class="sync-row">
                <label for="sync-peer-prefix-input" class="sync-label">Peer Name Prefix:</label>
                <input type="text" id="sync-peer-prefix-input" class="eruda-input flex-grow" placeholder="e.g., laptop, desktop (optional)">
              </div>
              <div class="sync-row space-between">
                <label class="flex-center">
                  <input type="checkbox" id="live-sync-toggle-checkbox">
                  <span style="margin-left: 5px;">Enable Live Sync (beta)</span>
                </label>
                <button id="live-sync-reelect-btn" class="eruda-button" style="display: none;">Re-elect Host</button>
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
                    <strong>Live Sync:</strong> <span id="live-sync-status">Disabled</span>
                    <strong>Peers:</strong> <span id="sync-peer-count">0</span>
                    <strong>Peer ID:</strong> <span id="sync-peer-id-display" style="word-break: break-all;">Not Connected</span>
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
    }
  }

  bindEvents() {
    this.eventBinder.bind();
  }
  
  updateLiveSyncUI() {
    const container = this.sync._container;
    if (!container) return;

    const statusEl = container.querySelector('#live-sync-status');
    const checkbox = container.querySelector('#live-sync-toggle-checkbox');
    const reelectBtn = container.querySelector('#live-sync-reelect-btn');

    if (!statusEl || !checkbox || !reelectBtn) return;

    const state = this.sync.liveSync.state;
    checkbox.disabled = this.sync.connectionState === 'connecting';
    checkbox.checked = localStorage.getItem('thoughtform_live_sync_enabled') === 'true';
    
    const isSessionActive = state === 'host' || state === 'follower';
    reelectBtn.style.display = isSessionActive ? 'block' : 'none';

    let statusText = 'Disabled';
    switch(state) {
        case 'pending': statusText = 'Pending Selection...'; break;
        case 'host':
            const hostName = this.sync.liveSync.hostId === this.sync.getPeerId() ? ' (You)' : ` (${this.sync.liveSync.activePeers.get(this.sync.liveSync.hostId)?.name || '...'})`;
            statusText = `Host${hostName}`;
            break;
        case 'follower':
            const leaderName = ` (${this.sync.liveSync.activePeers.get(this.sync.liveSync.hostId)?.name || '...'})`;
            statusText = `Follower${leaderName}`;
            break;
    }
    statusEl.textContent = statusText;
  }
  
  updateStatus(message) {
    const statusEl = this.sync._container.querySelector('#sync-status');
    if (statusEl) statusEl.textContent = message;
    
    const peerCountEl = this.sync._container.querySelector('#sync-peer-count');
    if (peerCountEl) peerCountEl.textContent = this.sync.connectedPeers.size;
  }
  
  updateControls(state) {
    const container = this.sync._container;
    if (!container) return;
    const isDisconnected = (state === 'disconnected' || state === 'error');
    const isConnecting = (state === 'connecting');

    const connectBtn = container.querySelector('#sync-connect-btn');
    if (connectBtn) {
      connectBtn.disabled = isConnecting;
      connectBtn.textContent = isDisconnected ? 'Connect' : (isConnecting ? 'Connecting...' : 'Disconnect');
    }
    
    container.querySelector('#sync-name-input').disabled = !isDisconnected;
    container.querySelector('#sync-peer-prefix-input').disabled = !isDisconnected;
    container.querySelectorAll('.sync-actions button').forEach(btn => btn.disabled = state !== 'connected-p2p');
    
    this.updateLiveSyncUI();
  }
  
  updateConnectionIndicator(state) {
    const tabEl = document.querySelector('.luna-tab-item[data-id="Sync"]');
    if (tabEl) {
      tabEl.classList.remove('sync-status-connecting', 'sync-status-p2p', 'sync-status-signal', 'sync-status-error');
      let methodText = 'None';
      let methodColor = 'var(--color-text-secondary)';
      switch (state) {
        case 'connecting': tabEl.classList.add('sync-status-connecting'); methodText = 'Connecting...'; methodColor = 'var(--base-accent-warning)'; break;
        case 'connected-signal': tabEl.classList.add('sync-status-signal'); methodText = 'WebSocket (Fallback)'; methodColor = 'var(--base-accent-warning)'; break;
        case 'connected-p2p': tabEl.classList.add('sync-status-p2p'); methodText = 'WebRTC (P2P)'; methodColor = 'var(--base-accent-action)'; break;
        case 'error': tabEl.classList.add('sync-status-error'); methodText = 'Error'; methodColor = 'var(--base-accent-destructive)'; break;
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

  showSyncProgressModal() { this.modalHandler.show(); }
  updateSyncProgress(event) { this.modalHandler.update(event); }
  hideSyncProgressModal() { this.modalHandler.hide(); }
}