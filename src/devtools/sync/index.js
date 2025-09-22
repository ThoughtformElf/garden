// src/devtools/sync-core.js
import { SyncSignaling } from './signaling.js';
import { SyncFiles } from './files.js';
import { SyncUI } from './ui.js';

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