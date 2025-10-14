import { SyncSignaling } from './signaling/index.js';
import { SyncFiles } from './files/index.js';
import { SyncUI } from './ui.js';
import debug from '../../util/debug.js';

const MAX_PEER_CONNECTIONS = 5;

export class Sync {
  constructor() {
    this.name = 'sync';
    this._container = null;
    this.peerConnections = new Map();
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
    const savedPeerPrefix = localStorage.getItem('thoughtform_peer_prefix') || '';
    if (autoConnect && savedSyncName) {
        this.connect(savedSyncName, savedPeerPrefix);
    }
    // Expose this instance on the global thoughtform object
    if (window.thoughtform) window.thoughtform.sync = this;
  }

  async connect(syncName, peerNamePrefix) {
      if (this.connectionState !== 'disconnected' && this.connectionState !== 'error') return;
      this.syncName = syncName;
      this.updateConnectionState('connecting', 'Connecting...');
      await this.signaling.joinSession(this.syncName, peerNamePrefix);
  }

  disconnect() {
      this.signaling.destroy();
      this.peerConnections.forEach(pc => pc.close());
      this.peerConnections.clear();
      this.isConnected = false;
      this.syncName = null;
      this.connectedPeers.clear();
      this.updateConnectionState('disconnected', 'Disconnected');
  }

  createPeerConnection(peerId, isInitiator = false) {
    if (this.peerConnections.has(peerId)) {
        return this.peerConnections.get(peerId);
    }
    if (this.peerConnections.size >= MAX_PEER_CONNECTIONS) {
        console.warn(`[SYNC-PC] Max connections (${MAX_PEER_CONNECTIONS}) reached. Not connecting to ${peerId.substring(0,8)}...`);
        return null;
    }
    
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.peerConnections.set(peerId, pc);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            this.signaling.sendSignal({ type: 'candidate', candidate: event.candidate }, peerId);
        }
    };

    pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
            this.updateConnectionState('connected-p2p', `P2P Connected (${this.peerConnections.size} peers)`);
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            this.handlePeerLeft(peerId);
        }
    };
    
    if (!isInitiator) {
        pc.ondatachannel = (event) => {
            this.setupDataChannel(peerId, event.channel);
        };
    }

    return pc;
  }
  
  setupDataChannel(peerId, channel) {
      const pc = this.peerConnections.get(peerId);
      if (!pc) return;
      pc.dataChannel = channel;
      channel.onopen = () => {
          this._announcePresence(peerId);
      };
      channel.onmessage = async (e) => {
          try {
              const msgData = JSON.parse(e.data);
              await this._handleIncomingSyncMessage(msgData, `P2P-${peerId.substring(0,4)}`);
          } catch (error) {
              console.error('Error parsing sync message from DataChannel:', error);
          }
      };
      channel.onclose = () => this.handlePeerLeft(peerId);
      channel.onerror = (event) => {
          const error = event.error;
          if (error && error.name === 'OperationError' && error.message.includes('User-Initiated Abort')) {
              debug.log(`Data channel for peer ${peerId.substring(0,8)} closed intentionally.`);
          } else {
              console.error(`Data channel error with ${peerId.substring(0,8)}...:`, event);
          }
      };
  }

  updatePeerIdDisplay() {
    const peerIdEl = this._container?.querySelector('#sync-peer-id-display');
    if (peerIdEl) {
        const peerId = this.getPeerId();
        if (peerId) {
            peerIdEl.textContent = peerId;
        } else if (this.connectionState === 'disconnected' || this.connectionState === 'error') {
            peerIdEl.textContent = 'Not Connected';
        } else {
            peerIdEl.textContent = 'Connecting...';
        }
    }
  }

  updateConnectionState(newState, statusMessage) {
      this.connectionState = newState;
      this.isConnected = (newState === 'connected-p2p' || newState === 'connected-signal');
      
      this.updatePeerIdDisplay();
      
      if (this.ui) {
          if (statusMessage) this.ui.updateStatus(statusMessage);
          this.ui.updateConnectionIndicator(newState);
          this.ui.updateControls(newState);
      }
  }

  _handleIncomingSyncMessage(data, transport) {
      this.signaling.handleIncomingMessage(data, transport);
  }
  
  _announcePresence(targetPeerId = null) {
      if (!this.signaling.peerId) return;
      const gardensRaw = localStorage.getItem('thoughtform_gardens');
      const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
      this.sendSyncMessage({
          type: 'peer_introduction',
          peerId: this.signaling.peerId,
          gardens: gardens
      }, targetPeerId);
  }

  handlePeerIntroduction(payload) {
      if (!payload.peerId || payload.peerId === this.signaling.peerId) return;
      const isNewPeer = !this.connectedPeers.has(payload.peerId);
      this.connectedPeers.set(payload.peerId, { id: payload.peerId, gardens: payload.gardens });
      if (isNewPeer) {
        this.addMessage(`Peer ${payload.peerId} discovered.`);
      }
      if (this.ui) this.ui.updateStatus(`P2P Connected (${this.connectedPeers.size} peer${this.connectedPeers.size === 1 ? '' : 's'})`);
  }
  
  handlePeerLeft(peerId) {
      if (this.connectedPeers.has(peerId)) {
          const peerInfo = this.connectedPeers.get(peerId);
          this.connectedPeers.delete(peerId);
          this.addMessage(`Peer ${peerInfo.id} disconnected.`);
      }
      
      const pc = this.peerConnections.get(peerId);
      if (pc && pc.signalingState !== 'closed') {
          pc.close();
          this.peerConnections.delete(peerId);
      } else if (this.peerConnections.has(peerId)) {
          this.peerConnections.delete(peerId);
      }
      
      if (this.peerConnections.size === 0 && this.connectionState === 'connected-p2p') {
          this.updateConnectionState('connected-signal', 'Connected to tracker, waiting for peers...');
      } else {
          if (this.ui) this.ui.updateStatus(`P2P Connected (${this.connectedPeers.size} total)`);
      }
  }
  
  getPeerId() {
    return this.signaling.peerId;
  }

  setGitClient(gitClient) { this.gitClient = gitClient; this.fileSync.setGitClient(gitClient); }
  addMessage(text) { if(this.ui) this.ui.addMessage(text); }
  sendSyncMessage(data, targetPeerId = null, messageId = null) { this.signaling.sendSyncMessage(data, targetPeerId, messageId); }
  show() { if(this._container) this._container.style.display = 'block'; }
  hide() { if(this._container) this._container.style.display = 'none'; }
  destroy() { this.disconnect(); if (this.fileSync) this.fileSync.destroy(); }
}