// src/devtools/sync/index.js
import { SyncSignaling } from './signaling/index.js';
import { SyncFiles } from './files/index.js';
import { SyncUI } from './ui.js';
import debug from '../../util/debug.js';

export class Sync {
  constructor() {
    this.name = 'sync';
    this._container = null;
    this.peerConnection = null;
    this.dataChannel = null;
    this.isInitiator = false;
    this.isConnected = false;
    this.gitClient = null;
    this.connectionState = 'disconnected';
    this.syncName = null;
    this.connectedPeers = new Map();
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

    if (this.fileSync && this.ui) {
        this.fileSync.addEventListener('syncProgress', this.ui.updateSyncProgress.bind(this.ui));
    }

    const autoConnect = localStorage.getItem('thoughtform_sync_auto_connect') === 'true';
    const savedSyncName = localStorage.getItem('thoughtform_sync_name');

    if (autoConnect && savedSyncName) {
        this.connect(savedSyncName);
    }
  }

  async connect(syncName) {
      if (this.connectionState !== 'disconnected' && this.connectionState !== 'error') return;
      this.syncName = syncName;
      this.updateConnectionState('connecting', 'Connecting...');
      await this.signaling.negotiateSession(this.syncName);
  }

  disconnect() {
      this.signaling.destroy();
      if (this.peerConnection) this.peerConnection.close();
      this.isConnected = false;
      this.isInitiator = false;
      this.syncName = null;
      this.connectedPeers.clear();
      this.updateConnectionState('disconnected', 'Disconnected');
  }

  updateConnectionState(newState, statusMessage) {
      if (this.connectionState === newState) return;
      const oldState = this.connectionState;
      this.connectionState = newState;
      this.isConnected = (newState === 'connected-p2p' || newState === 'connected-signal');
      const wasConnected = oldState === 'connected-p2p' || oldState === 'connected-signal';
      if (this.isConnected && !wasConnected) {
          this._announcePresence();
      }
      if (this.ui) {
          if (statusMessage) this.ui.updateStatus(statusMessage);
          this.ui.updateConnectionIndicator(newState);
          this.ui.updateControls(newState);
      }
  }

  // --- NEW: CENTRAL MESSAGE HANDLER ---
  _handleIncomingSyncMessage(data, transport) {
      console.log(`[SYNC-RECV ◄ ${transport}] Type: ${data.type}`, data);
      switch (data.type) {
          case 'peer_introduction':
              this.handlePeerIntroduction(data);
              break;
          // All other message types are assumed to be for file sync.
          default:
              if (this.fileSync) {
                  this.fileSync.handleSyncMessage(data);
              }
              break;
      }
  }

  _announcePresence() {
      setTimeout(() => {
          if (!this.signaling.peerId) {
              console.error("[SYNC-ERROR] Cannot announce presence, peerId is not known.");
              return;
          }
          const gardensRaw = localStorage.getItem('thoughtform_gardens');
          const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
          this.sendSyncMessage({
              type: 'peer_introduction',
              peerId: this.signaling.peerId,
              gardens: gardens
          });
      }, 1000);
  }

  handlePeerIntroduction(payload) {
      if (!payload.peerId || payload.peerId === this.signaling.peerId) return;
      const isNewPeer = !this.connectedPeers.has(payload.peerId);
      this.connectedPeers.set(payload.peerId, { gardens: payload.gardens });
      if (isNewPeer) {
        this.addMessage(`Peer ${payload.peerId.substring(0, 8)}... connected.`);
        // Reply directly to ensure mutual discovery
        const gardensRaw = localStorage.getItem('thoughtform_gardens');
        const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
        this.sendSyncMessage({
            type: 'peer_introduction',
            peerId: this.signaling.peerId,
            gardens: gardens
        }, payload.peerId);
      }
      if (this.ui) this.ui.updateStatus(`P2P Connected (${this.connectedPeers.size} peer${this.connectedPeers.size === 1 ? '' : 's'})`);
  }
  
  handlePeerLeft(peerId) {
      if (this.connectedPeers.has(peerId)) {
          this.connectedPeers.delete(peerId);
          this.addMessage(`Peer ${peerId.substring(0, 8)}... disconnected.`);
          if (this.ui) this.ui.updateStatus(`Peer disconnected. (${this.connectedPeers.size} total)`);
      }
  }

  handleHostChange(newInitiatorPeerId) {
    this.addMessage(`Network host changed. New host: ${newInitiatorPeerId.substring(0,8)}...`);
    if (this.peerConnection) this.peerConnection.close();
    if (this.signaling.peerId === newInitiatorPeerId) {
        this.isInitiator = true;
        this.signaling._webrtcInitiator.setupPeerConnection();
        this.updateConnectionState('connected-signal', 'Waiting for peers to rejoin...');
    } else {
        this.isInitiator = false;
        this.signaling._webrtcJoiner.joinSession(this.syncName);
    }
  }

  setGitClient(gitClient) { this.gitClient = gitClient; this.fileSync.setGitClient(gitClient); }
  addMessage(text) { if(this.ui) this.ui.addMessage(text); }
  sendSyncMessage(data, targetPeerId = null) { this.signaling.sendSyncMessage(data, targetPeerId); }
  show() { if(this._container) this._container.style.display = 'block'; }
  hide() { if(this._container) this._container.style.display = 'none'; }
  destroy() { this.disconnect(); if (this.fileSync) this.fileSync.destroy(); }
}