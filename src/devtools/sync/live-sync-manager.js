import { Modal } from '../../util/modal.js';
import * as Y from 'yjs';
import debug from '../../util/debug.js';

export class LiveSyncManager {
  constructor(syncInstance) {
    this.sync = syncInstance;

    this.state = 'disabled'; // 'disabled', 'pending', 'host', 'follower'
    this.pendingPeers = new Map();
    this.activePeers = new Map();
    this.hostId = null;
    this.electionTimeout = null;
    this.hostSelectionModal = null;
    
    this.yDocs = new Map();
    this.syncableGardens = [];
  }

  // --- Public API ---

  enable() {
    if (this.state !== 'disabled' || (this.sync.connectionState !== 'connected-p2p' && this.sync.connectionState !== 'connected-signal')) {
        if (localStorage.getItem('thoughtform_live_sync_enabled') === 'true') {
            this.sync.addMessage('Live Sync is enabled. Waiting for a P2P connection to start...');
        }
        return;
    }
    
    console.log('[LiveSync] Enabling...');
    localStorage.setItem('thoughtform_live_sync_enabled', 'true');
    const myPeerId = this.sync.getPeerId();
    const myPeerName = localStorage.getItem('thoughtform_peer_prefix') || myPeerId.substring(0, 8);
    const stickyHostId = sessionStorage.getItem('thoughtform_live_sync_host_id');

    if (stickyHostId) {
        this.hostId = stickyHostId;
        this.syncableGardens = JSON.parse(sessionStorage.getItem('thoughtform_live_sync_gardens') || '[]');
        console.log('[LiveSync] Found sticky session host:', this.hostId);

        if (stickyHostId === myPeerId) {
            this.state = 'host';
            this.activePeers.set(myPeerId, { id: myPeerId, name: myPeerName });
            this.sync.addMessage('Re-established session as host.');
            this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_ANNOUNCE', peerInfo: { id: myPeerId, name: myPeerName } });
        } else {
            this.state = 'follower';
            this.sync.addMessage(`Found active session. Joining as follower...`);
        }
        this.sync.ui.updateLiveSyncUI();
        this.sync.workspace.activateLiveSyncForCurrentFile();
        return;
    }
    
    this.state = 'pending';
    this.pendingPeers.set(myPeerId, { id: myPeerId, name: myPeerName });
    
    this.sync.sendSyncMessage({ 
        type: 'MSG_LIVESYNC_ANNOUNCE', 
        peerInfo: { id: myPeerId, name: myPeerName }
    });
    
    this.sync.ui.updateLiveSyncUI();
    this.sync.addMessage('Live Sync pending. Searching for active sessions...');
    console.log('[LiveSync] State is PENDING. Broadcasting announce and starting election timeout.');
    
    this.electionTimeout = setTimeout(() => {
      if (this.state === 'pending') {
        console.log('[LiveSync] Election timeout fired. No existing session found.');
        this.sync.addMessage('No active session found. Starting new election...');
        this._showHostSelectionModalIfNeeded();
      }
    }, 3000);
  }

  disable() {
    if (this.state === 'disabled') return;
    console.log('[LiveSync] Disabling...');
    
    localStorage.setItem('thoughtform_live_sync_enabled', 'false');
    sessionStorage.removeItem('thoughtform_live_sync_host_id');
    sessionStorage.removeItem('thoughtform_live_sync_gardens');
    if(this.electionTimeout) clearTimeout(this.electionTimeout);

    this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_DISABLE' });

    if (this.hostSelectionModal) {
        this.hostSelectionModal.destroy();
        this.hostSelectionModal = null;
    }

    this.sync.workspace.getActiveEditor()?.disconnectLiveSync();

    this.yDocs.forEach(doc => doc.destroy());
    this.yDocs.clear();

    this.state = 'disabled';
    this.pendingPeers.clear();
    this.activePeers.clear();
    this.hostId = null;
    this.syncableGardens = [];
    
    this.sync.ui.updateLiveSyncUI();
    this.sync.addMessage('Live Sync disabled.');
  }

  triggerReElection() {
      if (this.state === 'disabled' || this.state === 'pending') return;
      console.log('[LiveSync] Re-election triggered by user.');
      this.sync.addMessage('A re-election has been triggered...');
      this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_REELECT' });
      this._performReElectionReset();
  }
  
  activateDocForEditor(editor) {
    if (!editor) return;
    
    console.log(`[LiveSync] Activating doc for editor. Current state: ${this.state}`);
    if (this.state === 'disabled' || this.state === 'pending') {
        editor.disconnectLiveSync();
        return;
    }
    
    const { gardenName, filePath } = editor;
    if (this.syncableGardens.includes(gardenName)) {
        console.log(`[LiveSync] File ${gardenName}#${filePath} is in a syncable garden. Setting up Y.Doc.`);
        this._setupYDoc(gardenName, filePath, this.state === 'host');
    } else {
        console.log(`[LiveSync] File ${gardenName}#${filePath} is NOT in a syncable garden. Disconnecting editor.`);
        editor.disconnectLiveSync();
    }
  }

  handlePeerLeft(peerId) {
    if (this.pendingPeers.has(peerId)) this.pendingPeers.delete(peerId);
    if (this.activePeers.has(peerId)) this.activePeers.delete(peerId);

    if (peerId === this.hostId) {
        console.log('[LiveSync] Host has disconnected. Triggering re-election.');
        this.sync.addMessage('Live Sync host disconnected. Please elect a new host.');
        this.triggerReElection();
    }

    if (this.state === 'pending' && this.hostSelectionModal) {
        this.hostSelectionModal.destroy();
        this.hostSelectionModal = null;
        this._showHostSelectionModalIfNeeded();
    }
  }

  handleMessage(payload) {
    const fromPeerId = payload.fromPeerId || this.sync.getPeerId();
    console.log(`[LiveSync] Handling message: ${payload.type} from peer ${fromPeerId ? fromPeerId.substring(0,4) : 'N/A'}`);

    switch(payload.type) {
        case 'MSG_LIVESYNC_REELECT': this._performReElectionReset(); return;
        case 'MSG_LIVESYNC_ANNOUNCE':
            if ((this.state === 'host' || this.state === 'follower') && payload.peerInfo) {
                this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_SESSION_INFO', hostId: this.hostId, syncableGardens: this.syncableGardens }, payload.peerInfo.id);
            } else if (this.state === 'pending' && payload.peerInfo) {
                this.pendingPeers.set(payload.peerInfo.id, payload.peerInfo);
                const myPeerId = this.sync.getPeerId();
                const myPeerName = localStorage.getItem('thoughtform_peer_prefix') || myPeerId.substring(0, 8);
                this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_ANNOUNCE_REPLY', peerInfo: { id: myPeerId, name: myPeerName } }, payload.peerInfo.id);
                this._showHostSelectionModalIfNeeded();
            }
            break;
        case 'MSG_LIVESYNC_ANNOUNCE_REPLY':
            if (this.state === 'pending' && payload.peerInfo) {
                this.pendingPeers.set(payload.peerInfo.id, payload.peerInfo);
                this._showHostSelectionModalIfNeeded();
            }
            break;
        case 'MSG_LIVESYNC_SESSION_INFO':
            if (this.state === 'pending') {
                this.sync.addMessage('Found an existing live session. Joining as follower...');
                this.syncableGardens = payload.syncableGardens || [];
                sessionStorage.setItem('thoughtform_live_sync_gardens', JSON.stringify(this.syncableGardens));
                this._processHostSelection(payload.hostId);
            }
            break;
        case 'MSG_LIVESYNC_HOST_CHOSEN':
            if (this.state === 'pending') this._processHostSelection(payload.chosenHostId);
            break;
        case 'MSG_LIVESYNC_SESSION_START':
            if (this.state === 'follower') {
                this.syncableGardens = payload.syncableGardens;
                sessionStorage.setItem('thoughtform_live_sync_gardens', JSON.stringify(this.syncableGardens));
                this.sync.addMessage(`Session started. Syncing gardens: ${this.syncableGardens.join(', ')}.`);
                this.sync.ui.showSyncProgressModal();
                this.sync.fileSync.requestSpecificGardens({ [this.hostId]: this.syncableGardens });
            }
            break;
        case 'MSG_LIVESYNC_REQUEST_DOC_STATE':
            if (this.state === 'host' && payload.file) {
                const yDocKey = `${payload.file.garden}#${payload.file.path}`;
                const yDoc = this.yDocs.get(yDocKey);
                if (yDoc) {
                    const fullState = Y.encodeStateAsUpdate(yDoc);
                    this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_DOC_STATE', file: payload.file, update: Array.from(fullState) }, fromPeerId);
                }
            }
            break;
        case 'MSG_LIVESYNC_DOC_STATE': {
            if (payload.file) {
                const yDocKey = `${payload.file.garden}#${payload.file.path}`;
                const yDoc = this.yDocs.get(yDocKey);
                if (yDoc) Y.applyUpdate(yDoc, new Uint8Array(payload.update), 'remote-sync');
            }
            break;
        }
        case 'MSG_LIVESYNC_YJS_UPDATE': {
            const yDocKey = `${payload.garden}#${payload.path}`;
            const yDoc = this.yDocs.get(yDocKey);
            if (yDoc) {
                console.log(`[LiveSync] Applying remote update for ${yDocKey}`);
                Y.applyUpdate(yDoc, new Uint8Array(payload.update), 'remote-sync');
            } else {
                console.warn(`[LiveSync] Received update for non-existent Y.Doc: ${yDocKey}`);
            }
            break;
        }
        case 'MSG_LIVESYNC_DISABLE':
            if (fromPeerId && this.pendingPeers.has(fromPeerId)) this.pendingPeers.delete(fromPeerId);
            if (fromPeerId && this.activePeers.has(fromPeerId)) this.activePeers.delete(fromPeerId);
            if (this.state === 'pending' && this.hostSelectionModal) { this.hostSelectionModal.destroy(); this.hostSelectionModal = null; this._showHostSelectionModalIfNeeded(); }
            this.sync.ui.updateLiveSyncUI();
            break;
    }
  }

  // --- Private Methods ---

  _performReElectionReset() {
      this.sync.addMessage('Resetting session for re-election...');
      this.disable();
      setTimeout(() => this.enable(), 500);
  }

  _showHostSelectionModalIfNeeded() {
    if (this.state !== 'pending' || this.hostSelectionModal || this.pendingPeers.size < 2) return;
    
    console.log('[LiveSync] Showing host selection modal.');
    this.hostSelectionModal = new Modal({ title: 'Select Live Sync Host' });
    const choices = Array.from(this.pendingPeers.values()).map(peer => ({ id: peer.id, text: peer.name, class: peer.id === this.sync.getPeerId() ? 'is-self' : '' }));
    choices.push({ id: 'cancel', text: 'Cancel', class: 'destructive' });
    this.hostSelectionModal.updateContent('<p>Which device has the most up-to-date work? That device will become the host for this session.</p>');
    
    choices.forEach(choice => {
        const button = this.hostSelectionModal.addFooterButton(choice.text, () => {
            if (choice.id && choice.id !== 'cancel') {
                this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_HOST_CHOSEN', chosenHostId: choice.id });
                this._processHostSelection(choice.id); 
            } else {
                this.disable();
            }
        });
        if (choice.class) button.classList.add(choice.class);
    });
    this.hostSelectionModal.show();
  }

  _processHostSelection(chosenHostId) {
    if (this.state !== 'pending') return;
    console.log('[LiveSync] Processing host selection. Chosen host:', chosenHostId.substring(0,4));
    if (this.electionTimeout) clearTimeout(this.electionTimeout);
    if (this.hostSelectionModal) { this.hostSelectionModal.destroy(); this.hostSelectionModal = null; }

    this.hostId = chosenHostId;
    sessionStorage.setItem('thoughtform_live_sync_host_id', this.hostId);
    this.activePeers = new Map(this.pendingPeers);
    this.pendingPeers.clear();

    if (this.hostId === this.sync.getPeerId()) {
        this.state = 'host';
        this.sync.addMessage('You are the new Live Sync host.');
        this._showGardenSelectionModal();
    } else {
        this.state = 'follower';
        this.sync.addMessage(`Live Sync host is ${this.activePeers.get(this.hostId)?.name}. Awaiting session details...`);
    }
    this.sync.ui.updateLiveSyncUI();
  }

  async _showGardenSelectionModal() {
    console.log('[LiveSync] Host showing garden selection modal.');
    const gardensRaw = localStorage.getItem('thoughtform_gardens');
    const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
    
    const selectedGardens = await Modal.gardenSelection({
        title: 'Select Gardens for Live Sync',
        gardenData: gardens,
    });

    if (selectedGardens && selectedGardens.length > 0) {
        this.syncableGardens = selectedGardens;
        sessionStorage.setItem('thoughtform_live_sync_gardens', JSON.stringify(this.syncableGardens));
        this.sync.addMessage(`Session started. Syncing gardens: ${this.syncableGardens.join(', ')}.`);
        this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_SESSION_START', syncableGardens: this.syncableGardens });
        
        // --- THIS IS THE FIX ---
        // Only activate the sync for the current file AFTER the gardens have been selected.
        this.sync.workspace.activateLiveSyncForCurrentFile();
    } else {
        this.sync.addMessage('No gardens selected. Live sync cancelled.');
        this.disable();
    }
  }
  
  _setupYDoc(garden, path, isHost) {
      const yDocKey = `${garden}#${path}`;
      const isNewDocLocally = !this.yDocs.has(yDocKey);

      if (isNewDocLocally) {
        console.log(`[LiveSync] Creating new Y.Doc for ${yDocKey}`);
        const yDoc = new Y.Doc();
        this.yDocs.set(yDocKey, yDoc);

        yDoc.on('update', (update, origin) => {
            if (origin !== 'remote-sync') {
                console.log(`[LiveSync] Broadcasting local update for ${yDocKey}`);
                this.sync.sendSyncMessage({
                    type: 'MSG_LIVESYNC_YJS_UPDATE',
                    garden: garden, path: path, update: Array.from(update)
                });
            }
        });
      }
      
      const yDoc = this.yDocs.get(yDocKey);
      const editor = this.sync.workspace.getActiveEditor();
      if (editor && editor.gitClient.gardenName === garden && editor.filePath === path) {
          editor.connectLiveSync(yDoc, isHost);
      }

      if (isNewDocLocally && this.state === 'follower') {
          console.log(`[LiveSync] Follower requesting initial state for ${yDocKey} from host.`);
          this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_REQUEST_DOC_STATE', file: { garden, path } }, this.hostId);
      }
  }
}