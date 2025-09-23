// src/devtools/sync/index.js
import { SyncSignaling } from './signaling/index.js';
import { SyncFiles } from './files/index.js';
import { SyncUI } from './ui.js';
import debug from '../../util/debug.js';

// ***** THIS IS THE FIX *****
// The Emitter class and "extends Emitter" have been removed as they are obsolete.
export class Sync {
// ***** END OF FIX *****
  constructor() {
    this.name = 'sync';
    this._container = null;
    this.peerConnection = null;
    this.dataChannel = null;
    this.isInitiator = false;
    this.isConnected = false;
    this.gitClient = null;
    
    // Central state management
    this.connectionState = 'disconnected'; // 'disconnected', 'connecting', 'connected-signal', 'connected-p2p', 'error'
    this.syncName = null;
    
    // Initialize components
    this.signaling = new SyncSignaling(this);
    this.fileSync = new SyncFiles(this);
    this.ui = new SyncUI(this);
  }

  init(dom) {
    this._container = dom;
    this._container.style.padding = '1rem';
    this._container.style.overflowY = 'auto';
    this.ui.render();
    this.ui.bindEvents();
    this.ui.updateControls(this.connectionState);
    this.ui.updateConnectionIndicator(this.connectionState);

    if (this.fileSync && this.ui && typeof this.ui.updateSyncProgress === 'function') {
        this.fileSync.addEventListener('syncProgress', this.ui.updateSyncProgress.bind(this.ui));
        debug.log("DEBUG: Connected SyncFiles syncProgress event to SyncUI handler");
    }

    // Auto-connect logic
    const autoConnect = localStorage.getItem('thoughtform_sync_auto_connect') === 'true';
    const savedSyncName = localStorage.getItem('thoughtform_sync_name');

    if (autoConnect && savedSyncName) {
        debug.log(`Auto-connecting with sync name: ${savedSyncName}`);
        this.connect(savedSyncName);
    }
  }

  async connect(syncName) {
      if (this.connectionState !== 'disconnected' && this.connectionState !== 'error') {
          debug.warn(`Connect called while not in a disconnected state (${this.connectionState}). Ignoring.`);
          return;
      }
      this.syncName = syncName;
      this.updateConnectionState('connecting', 'Connecting...');
      
      await this.signaling.negotiateSession(this.syncName);
  }

  disconnect() {
      debug.log("Disconnecting...");
      this.signaling.destroy();
      if (this.peerConnection) {
          this.peerConnection.close();
          this.peerConnection = null;
      }
      if (this.dataChannel) {
          this.dataChannel.close();
          this.dataChannel = null;
      }
      this.isConnected = false;
      this.isInitiator = false;
      this.syncName = null;
      this.updateConnectionState('disconnected', 'Disconnected');
  }

  updateConnectionState(newState, statusMessage) {
      if (this.connectionState === newState) return;

      debug.log(`Connection state changed: ${this.connectionState} -> ${newState}`);
      this.connectionState = newState;
      
      this.isConnected = (newState === 'connected-p2p' || newState === 'connected-signal');

      if (this.ui) {
          if (statusMessage) {
              this.ui.updateStatus(statusMessage);
          }
          this.ui.updateConnectionIndicator(newState);
          this.ui.updateControls(newState);
      }
  }

  setGitClient(gitClient) {
    this.gitClient = gitClient;
    this.fileSync.setGitClient(gitClient);
  }

  addMessage(text) {
    this.ui.addMessage(text);
  }

  sendSyncMessage(data) {
    this.signaling.sendSyncMessage(data);
  }

  sendFileUpdate(path, content, timestamp) {
    this.fileSync.sendFileUpdate(path, content, timestamp);
  }

  show() {
    this._container.style.display = 'block';
  }

  hide() {
    this._container.style.display = 'none';
  }

  destroy() {
    this.disconnect();
    if (this.fileSync) {
        this.fileSync.destroy();
    }
  }
}