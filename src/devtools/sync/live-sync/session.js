import { Modal } from '../../../util/modal.js';

export class LiveSyncSession {
  constructor(manager) {
    this.manager = manager;
    this.sync = manager.sync;
    this.hostSelectionModal = null;
    this.electionTimeout = null;
  }

  enable(forceFresh = false) {
    const { manager, sync } = this;
    if (manager.state !== 'disabled' || (sync.connectionState !== 'connected-p2p' && sync.connectionState !== 'connected-signal')) {
      if (localStorage.getItem('thoughtform_live_sync_enabled') === 'true') {
        sync.addMessage('Live Sync is enabled. Waiting for a P2P connection to start...');
      }
      return;
    }

    console.log('[LiveSync] Enabling...');
    localStorage.setItem('thoughtform_live_sync_enabled', 'true');
    const myPeerId = sync.getPeerId();
    const myPeerName = localStorage.getItem('thoughtform_peer_prefix') || myPeerId.substring(0, 8);
    const stickyHostId = sessionStorage.getItem('thoughtform_live_sync_host_id');

    if (stickyHostId && !forceFresh) {
      console.log('[LiveSync] Found sticky session. Forcing re-election to ensure consistency.');
      this._performReElectionReset();
      return;
    }

    manager.state = 'pending';
    manager.pendingPeers.set(myPeerId, { id: myPeerId, name: myPeerName });
    sync.sendSyncMessage({ type: 'MSG_LIVESYNC_ANNOUNCE', peerInfo: { id: myPeerId, name: myPeerName } });
    sync.ui.updateLiveSyncUI();
    sync.addMessage('Live Sync pending. Searching for active sessions...');
    console.log('[LiveSync] State is PENDING. Broadcasting announce and starting election timeout.');

    this.electionTimeout = setTimeout(() => {
      if (manager.state === 'pending') {
        console.log('[LiveSync] Election timeout fired. No existing session found.');
        sync.addMessage('No active session found. Starting new election...');
        this.showHostSelectionModalIfNeeded();
      }
    }, 3000);
  }

  disable() {
    const { manager, sync } = this;
    if (manager.state === 'disabled') return;
    console.log('[LiveSync] Disabling...');

    localStorage.setItem('thoughtform_live_sync_enabled', 'false');
    sessionStorage.removeItem('thoughtform_live_sync_host_id');
    sessionStorage.removeItem('thoughtform_live_sync_gardens');
    if (this.electionTimeout) clearTimeout(this.electionTimeout);

    sync.sendSyncMessage({ type: 'MSG_LIVESYNC_DISABLE' });

    if (this.hostSelectionModal) {
      this.hostSelectionModal.destroy();
      this.hostSelectionModal = null;
    }

    // --- THIS IS THE FIX (Part 1) ---
    // The previous implementation only disconnected the ACTIVE editor.
    // This new logic iterates through ALL open panes and ensures EVERY
    // editor is disconnected, guaranteeing a clean state for the re-sync.
    if (sync.workspace && sync.workspace.panes) {
        sync.workspace.panes.forEach(pane => {
            pane.editor?.disconnectLiveSync();
        });
    }

    manager.yDocManager.destroyAll();

    manager.state = 'disabled';
    manager.pendingPeers.clear();
    manager.activePeers.clear();
    manager.hostId = null;
    manager.syncableGardens = [];

    sync.ui.updateLiveSyncUI();
    sync.addMessage('Live Sync disabled.');
  }
  
  triggerReElection() {
      if (this.manager.state === 'disabled' || this.manager.state === 'pending') return;
      console.log('[LiveSync] Re-election triggered by user.');
      this.sync.addMessage('A re-election has been triggered...');
      this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_REELECT' });
      this._performReElectionReset();
  }

  _performReElectionReset() {
    this.sync.addMessage('Resetting session for re-election...');
    this.disable();
    setTimeout(() => this.enable(true), 500);
  }

  showHostSelectionModalIfNeeded() {
    const { manager, sync } = this;
    if (manager.state !== 'pending' || this.hostSelectionModal || manager.pendingPeers.size < 2) return;

    console.log('[LiveSync] Showing host selection modal.');
    this.hostSelectionModal = new Modal({ title: 'Select Live Sync Host' });
    const choices = Array.from(manager.pendingPeers.values()).map(peer => ({ id: peer.id, text: peer.name, class: peer.id === sync.getPeerId() ? 'is-self' : '' }));
    choices.push({ id: 'cancel', text: 'Cancel', class: 'destructive' });
    this.hostSelectionModal.updateContent('<p>Which device has the most up-to-date work? That device will become the host for this session.</p>');

    choices.forEach(choice => {
      const button = this.hostSelectionModal.addFooterButton(choice.text, () => {
        if (choice.id && choice.id !== 'cancel') {
          sync.sendSyncMessage({ type: 'MSG_LIVESYNC_HOST_CHOSEN', chosenHostId: choice.id });
          this.processHostSelection(choice.id);
        } else {
          this.disable();
        }
      });
      if (choice.class) button.classList.add(choice.class);
    });
    this.hostSelectionModal.show();
  }

  processHostSelection(chosenHostId) {
    const { manager, sync } = this;
    if (manager.state !== 'pending') return;
    console.log('[LiveSync] Processing host selection. Chosen host:', chosenHostId.substring(0, 4));
    if (this.electionTimeout) clearTimeout(this.electionTimeout);
    if (this.hostSelectionModal) { this.hostSelectionModal.destroy(); this.hostSelectionModal = null; }

    manager.hostId = chosenHostId;
    sessionStorage.setItem('thoughtform_live_sync_host_id', manager.hostId);
    manager.activePeers = new Map(manager.pendingPeers);
    manager.pendingPeers.clear();

    if (manager.hostId === sync.getPeerId()) {
      manager.state = 'host';
      sync.addMessage('You are the new Live Sync host.');
      this.showGardenSelectionModal();
    } else {
      manager.state = 'follower';
      sync.addMessage(`Live Sync host is ${manager.activePeers.get(manager.hostId)?.name}. Awaiting session details...`);
    }
    sync.ui.updateLiveSyncUI();
  }

  async showGardenSelectionModal() {
    const { manager, sync } = this;
    console.log('[LiveSync] Host showing garden selection modal.');
    const gardensRaw = localStorage.getItem('thoughtform_gardens');
    const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];

    const selectedGardens = await Modal.gardenSelection({
      title: 'Select Gardens for Live Sync',
      gardenData: gardens,
    });

    if (selectedGardens && selectedGardens.length > 0) {
      manager.syncableGardens = selectedGardens;
      sessionStorage.setItem('thoughtform_live_sync_gardens', JSON.stringify(manager.syncableGardens));
      sync.addMessage(`Session started. Syncing gardens: ${manager.syncableGardens.join(', ')}.`);
      sync.sendSyncMessage({ type: 'MSG_LIVESYNC_SESSION_START', syncableGardens: manager.syncableGardens });
      sync.workspace.activateLiveSyncForCurrentFile();
    } else {
      sync.addMessage('No gardens selected. Live sync cancelled.');
      this.disable();
    }
  }
}