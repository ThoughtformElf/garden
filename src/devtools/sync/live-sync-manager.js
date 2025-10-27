import { LiveSyncSession } from './live-sync/session.js';
import { YDocManager } from './live-sync/ydoc-manager.js';
import { LiveSyncMessageHandler } from './live-sync/message-handler.js';

export class LiveSyncManager {
  constructor(syncInstance) {
    this.sync = syncInstance;

    // Core state
    this.state = 'disabled'; // 'disabled', 'pending', 'host', 'bootstrapping', 'active'
    this.hostId = null;
    this.syncableGardens = [];
    this.pendingPeers = new Map();
    this.activePeers = new Map();

    // Delegate responsibilities to helper classes
    this.session = new LiveSyncSession(this);
    this.yDocManager = new YDocManager(this);
    this.messageHandler = new LiveSyncMessageHandler(this);
    
    this.listenForWorkspaceEvents();
  }
  
  listenForWorkspaceEvents() {
    window.thoughtform.events.subscribe('workspace:garden:reloaded', (data) => {
      if (this.state === 'bootstrapping' && this.syncableGardens.includes(data.gardenName)) {
        console.log(`[LiveSync] Bootstrap for garden "${data.gardenName}" complete. Finalizing session.`);
        
        this.state = 'active'; // Transition from bootstrapping to fully active
        this.sync.addMessage('Initial sync complete. Live collaboration is active.');
      }
    });
  }

  // --- Public API ---

  enable() {
    this.session.enable();
  }

  disable() {
    this.session.disable();
  }

  triggerReElection() {
    this.session.triggerReElection();
  }

  async activateDocForEditor(editor) {
    if (!editor) return;

    console.log(`[LiveSync] Activating doc for editor. Current state: ${this.state}`);
    
    // --- THIS IS THE FIX (Part 1) ---
    // The previous check was too strict. A peer is in a valid 'follower' state
    // just before it begins bootstrapping. We must allow the connection to proceed.
    // This new check correctly prevents disconnects unless the session is truly disabled or pending.
    const validStates = ['host', 'follower', 'bootstrapping', 'active'];
    if (!validStates.includes(this.state)) {
        editor.disconnectLiveSync();
        return;
    }

    const { gitClient, filePath } = editor;
    const gardenName = gitClient.gardenName;

    if (this.syncableGardens.includes(gardenName)) {
      console.log(`[LiveSync] File ${gardenName}#${filePath} is in a syncable garden. Setting up Y.Doc.`);
      
      const yDoc = await this.yDocManager.getYDoc(gardenName, filePath);
      
      if (editor.isReady && yDoc) {
        editor.connectLiveSync(yDoc, this.state === 'host');
      }

    } else {
      console.log(`[LiveSync] File ${gardenName}#${filePath} is NOT in a syncable garden. Disconnecting editor.`);
      editor.disconnectLiveSync();
    }
  }

  handlePeerLeft(peerId) {
    this.pendingPeers.delete(peerId);
    this.activePeers.delete(peerId);

    if (peerId === this.hostId) {
      console.log('[LiveSync] Host has disconnected. Triggering re-election.');
      this.sync.addMessage('Live Sync host disconnected. Please elect a new host.');
      this.triggerReElection();
    }

    if (this.state === 'pending' && this.session.hostSelectionModal) {
      this.session.hostSelectionModal.destroy();
      this.session.hostSelectionModal = null;
      this.session.showHostSelectionModalIfNeeded();
    }
  }

  handleMessage(payload) {
    this.messageHandler.handle(payload);
  }
}