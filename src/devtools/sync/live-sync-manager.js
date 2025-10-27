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
        
        this.state = 'active'; 
        this.sync.addMessage('Initial sync complete. Live collaboration is active.');
        
        this.sync.workspace.activateLiveSyncForCurrentFile();
      }
    });

    // --- THIS IS THE DEFINITIVE FIX (Part 1) ---
    // Listen for file system changes and broadcast them with their full payload.
    window.thoughtform.events.subscribe('file:create', (data) => {
      if (this.state !== 'disabled' && this.syncableGardens.includes(data.gardenName)) {
        this.sync.sendSyncMessage({ 
            type: 'MSG_LIVESYNC_FILE_CREATE', 
            payload: data // data includes { gardenName, path, content }
        });
      }
    });
    window.thoughtform.events.subscribe('file:delete', (data) => {
      if (this.state !== 'disabled' && this.syncableGardens.includes(data.gardenName)) {
        this.sync.sendSyncMessage({ 
            type: 'MSG_LIVESYNC_FILE_DELETE', 
            payload: data // data includes { gardenName, path, isDirectory }
        });
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
    
    if (editor.editorView.state.doc.toString().startsWith('// "')) {
        console.log(`[LiveSync] Activation blocked for new, unsaved file: ${editor.filePath}`);
        editor.disconnectLiveSync();
        return;
    }

    const validStates = ['host', 'follower', 'bootstrapping', 'active'];
    if (this.state === 'disabled') {
        editor.disconnectLiveSync();
        return;
    }
    if (!validStates.includes(this.state)) {
        console.log('[LiveSync] State is pending, activation will wait.');
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