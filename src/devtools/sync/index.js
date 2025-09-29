// src/devtools/sync/index.js
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
    if (autoConnect && savedSyncName) {
        this.connect(savedSyncName);
    }
  }

  async connect(syncName) {
      if (this.connectionState !== 'disconnected' && this.connectionState !== 'error') return;
      this.syncName = syncName;
      this.updateConnectionState('connecting', 'Connecting...');
      await this.signaling.joinSession(this.syncName);
  }

  disconnect() {
      this.signaling.destroy();
      console.log(`[SYNC-DISCONNECT] Closing ${this.peerConnections.size} peer connections.`);
      this.peerConnections.forEach(pc => pc.close());
      this.peerConnections.clear();
      this.isConnected = false;
      this.syncName = null;
      this.connectedPeers.clear();
      this.updateConnectionState('disconnected', 'Disconnected');
  }

  createPeerConnection(peerId, isInitiator = false) {
    if (this.peerConnections.has(peerId)) {
        console.log(`[SYNC-PC] Connection with ${peerId.substring(0,8)}... already exists or is in progress.`);
        return this.peerConnections.get(peerId);
    }
    if (this.peerConnections.size >= MAX_PEER_CONNECTIONS) {
        console.warn(`[SYNC-PC] Max connections (${MAX_PEER_CONNECTIONS}) reached. Not connecting to ${peerId.substring(0,8)}...`);
        return null;
    }
    console.log(`[SYNC-PC] Creating new RTCPeerConnection for peer: ${peerId.substring(0,8)}... (Initiator: ${isInitiator})`);
    
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.peerConnections.set(peerId, pc);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            this.signaling.sendSignal({ type: 'candidate', candidate: event.candidate }, peerId);
        }
    };

    pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`[SYNC-PC] Connection state for ${peerId.substring(0,8)}... changed to: ${state}`);
        if (state === 'connected') {
            this.updateConnectionState('connected-p2p', `P2P Connected (${this.peerConnections.size} peers)`);
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            this.handlePeerLeft(peerId);
        }
    };
    
    if (!isInitiator) {
        pc.ondatachannel = (event) => {
            console.log(`[SYNC-PC] Data channel received from ${peerId.substring(0,8)}...`);
            this.setupDataChannel(peerId, event.channel);
        };
    }

    return pc;
  }
  
  setupDataChannel(peerId, channel) {
      const pc = this.peerConnections.get(peerId);
      if (!pc) return;
      pc.dataChannel = channel;
      console.log(`[SYNC-DC] Setting up data channel for ${peerId.substring(0,8)}...`);
      channel.onopen = () => {
          console.log(`[SYNC-DC] Data channel is OPEN with ${peerId.substring(0,8)}...`);
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

      // --- THIS IS THE FIX ---
      // This handler now specifically checks for the expected "abort" error
      // and treats it as a normal part of the disconnect process.
      channel.onerror = (event) => {
          const error = event.error;
          if (error && error.name === 'OperationError' && error.message.includes('User-Initiated Abort')) {
              // This is an expected error during a clean shutdown. Log it gracefully for debugging.
              debug.log(`Data channel for peer ${peerId.substring(0,8)} closed intentionally.`);
          } else {
              // For any other unexpected error, log it as a real problem.
              console.error(`Data channel error with ${peerId.substring(0,8)}...:`, event);
          }
      };
      // --- END OF FIX ---
  }

  updateConnectionState(newState, statusMessage) {
      this.connectionState = newState;
      this.isConnected = (newState === 'connected-p2p' || newState === 'connected-signal');
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
      this.connectedPeers.set(payload.peerId, { gardens: payload.gardens });
      if (isNewPeer) {
        this.addMessage(`Peer ${payload.peerId.substring(0, 8)}... discovered.`);
      }
      if (this.ui) this.ui.updateStatus(`P2P Connected (${this.connectedPeers.size} peer${this.connectedPeers.size === 1 ? '' : 's'})`);
  }
  
  handlePeerLeft(peerId) {
      if (this.connectedPeers.has(peerId)) {
          this.connectedPeers.delete(peerId);
          this.addMessage(`Peer ${peerId.substring(0, 8)}... disconnected.`);
      }
      
      const pc = this.peerConnections.get(peerId);
      if (pc && pc.signalingState !== 'closed') {
          pc.close();
          this.peerConnections.delete(peerId);
          console.log(`[SYNC-PC] Cleaned up connection for peer ${peerId.substring(0,8)}...`);
      } else if (this.peerConnections.has(peerId)) {
          this.peerConnections.delete(peerId);
      }
      
      if (this.ui) this.ui.updateStatus(`P2P Connected (${this.connectedPeers.size} total)`);
  }

  setGitClient(gitClient) { this.gitClient = gitClient; this.fileSync.setGitClient(gitClient); }
  addMessage(text) { if(this.ui) this.ui.addMessage(text); }
  sendSyncMessage(data, targetPeerId = null, messageId = null) { this.signaling.sendSyncMessage(data, targetPeerId, messageId); }
  show() { if(this._container) this._container.style.display = 'block'; }
  hide() { if(this._container) this._container.style.display = 'none'; }
  destroy() { this.disconnect(); if (this.fileSync) this.fileSync.destroy(); }
}