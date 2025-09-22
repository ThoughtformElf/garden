// src/devtools/sync/index.js
import { SyncSignaling } from './signaling.js';
import { SyncFiles } from './files/index.js';
import { SyncUI } from './ui.js';
import debug from '../../util/debug.js'; // Import debug utility

// A simple event emitter class to communicate with other parts of the app
class Emitter {
  constructor() {
    this._listeners = {};
  }

  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
  }

  emit(event, ...args) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(callback => callback(...args));
    }
  }
}

export class Sync extends Emitter {
  constructor() {
    super();
    this.name = 'sync';
    this._container = null;
    this.peerConnection = null;
    this.dataChannel = null;
    this.sessionCode = null;
    this.isInitiator = false;
    this.isConnected = false;
    this.gitClient = null;
    
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
    
    // --- ADDITION: Connect SyncFiles progress events to SyncUI handler ---
    // This must be done after ui.render() and ui.bindEvents() so the UI methods exist
    if (this.fileSync && this.ui && typeof this.ui.updateSyncProgress === 'function') {
        this.fileSync.addEventListener('syncProgress', this.ui.updateSyncProgress.bind(this.ui));
        debug.log("DEBUG: Connected SyncFiles syncProgress event to SyncUI handler");
    } else {
        debug.error("DEBUG: Failed to connect SyncFiles syncProgress event: components not ready");
        // Fallback console error if debug is disabled
        if (!(window.thoughtform && window.thoughtform.debug)) {
             console.error("Sync: Failed to connect file sync progress events. UI or FileSync components may not be initialized correctly.");
        }
    }
    // --- END ADDITION ---
  }

  setGitClient(gitClient) {
    this.gitClient = gitClient;
    this.fileSync.setGitClient(gitClient);
  }

  // Delegate methods to components
  updateStatus(message, code = null) {
    this.ui.updateStatus(message, code);
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
    this.signaling.destroy();
    this.fileSync.destroy();
  }
}