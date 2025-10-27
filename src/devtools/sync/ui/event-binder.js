import { Modal } from '../../../util/modal.js';

export class EventBinder {
  constructor(syncInstance) {
    this.sync = syncInstance;
  }

  bind() {
    if (!this.sync._container) {
      console.error("[EventBinder] Container not set");
      return;
    }

    const container = this.sync._container;
    const nameInput = container.querySelector('#sync-name-input');
    const peerPrefixInput = container.querySelector('#sync-peer-prefix-input');
    const autoConnectCheckbox = container.querySelector('#sync-autoconnect-checkbox');
    const liveSyncCheckbox = container.querySelector('#live-sync-toggle-checkbox');
    const connectBtn = container.querySelector('#sync-connect-btn');
    const reelectBtn = container.querySelector('#live-sync-reelect-btn');
    const saveConfigBtn = container.querySelector('#save-signaling-config');
    const sendToPeersBtn = container.querySelector('#send-to-peers-btn');
    const requestAllBtn = container.querySelector('#request-all-files-btn');

    nameInput.value = localStorage.getItem('thoughtform_sync_name') || '';
    peerPrefixInput.value = localStorage.getItem('thoughtform_peer_prefix') || '';
    autoConnectCheckbox.checked = localStorage.getItem('thoughtform_sync_auto_connect') === 'true';
    liveSyncCheckbox.checked = localStorage.getItem('thoughtform_live_sync_enabled') === 'true';

    reelectBtn.addEventListener('click', () => this.sync.triggerReElection());

    peerPrefixInput.addEventListener('input', () => {
        localStorage.setItem('thoughtform_peer_prefix', peerPrefixInput.value.trim());
        if (this.sync.connectionState === 'disconnected' || this.sync.connectionState === 'error') {
            const peerIdEl = container.querySelector('#sync-peer-id-display');
            if (peerIdEl) {
                const prefix = peerPrefixInput.value.trim();
                peerIdEl.textContent = prefix ? `${prefix}-<random_id>` : 'Not Connected';
            }
        }
    });

    connectBtn.addEventListener('click', () => {
      const currentState = this.sync.connectionState;
      if (currentState === 'disconnected' || currentState === 'error') {
        const syncName = nameInput.value.trim();
        const peerPrefix = peerPrefixInput.value.trim();
        if (!syncName) {
          this.sync.addMessage("Please enter a Sync Name.");
          return;
        }
        localStorage.setItem('thoughtform_sync_name', syncName);
        this.sync.connect(syncName, peerPrefix);
      } else {
        this.sync.disconnect();
      }
    });

    autoConnectCheckbox.addEventListener('change', (e) => {
        localStorage.setItem('thoughtform_sync_auto_connect', e.target.checked);
    });

    liveSyncCheckbox.addEventListener('change', (e) => {
        localStorage.setItem('thoughtform_live_sync_enabled', e.target.checked);
        if (e.target.checked) {
            if(this.sync.connectionState === 'connected-p2p') this.sync.enableLiveSync();
        } else {
            this.sync.disableLiveSync();
        }
    });

    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => {
        const urlInput = container.querySelector('#signaling-server-url');
        const newUrl = urlInput ? urlInput.value.trim() : '';
        if (newUrl) {
          this.sync.signaling.updateSignalingServerUrl(newUrl);
          this.sync.addMessage(`Signaling server updated to: ${newUrl}`);
        } else {
          this.sync.addMessage('Please enter a valid signaling server URL.');
        }
      });
    }

    if (sendToPeersBtn) {
      sendToPeersBtn.addEventListener('click', async () => {
        const gardensRaw = localStorage.getItem('thoughtform_gardens');
        const gardenData = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
        const peerData = this.sync.connectedPeers;
        const selection = await Modal.sendSelection({ title: 'Send Gardens to Peers', peerData, gardenData });
        if (selection) {
            this.sync.ui.showSyncProgressModal();
            this.sync.fileSync.sendGardensToPeers(selection); 
        }
      });
    }
    
    if (requestAllBtn) {
      requestAllBtn.addEventListener('click', async () => {
        const selection = await Modal.selection({ title: 'Request Gardens from Peers', peerData: this.sync.connectedPeers });
        if (selection) {
          this.sync.ui.showSyncProgressModal();
          this.sync.fileSync.requestSpecificGardens(selection);
        }
      });
    }
  }
}