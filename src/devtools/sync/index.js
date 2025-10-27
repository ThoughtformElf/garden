import { SyncSignaling } from './signaling/index.js';
import { SyncFiles } from './files/index.js';
import { SyncUI } from './ui.js';
import { LiveSyncManager } from './live-sync-manager.js';
import { SyncMessageRouter } from './sync-message-router.js';

const MAX_PEER_CONNECTIONS = 5;

export class Sync {
  constructor(workspaceManager) {
    this.name = 'sync';
    this.workspace = workspaceManager;
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
    this.liveSync = new LiveSyncManager(this);
    this.messageRouter = new SyncMessageRouter(this);
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
        this.fileSync.addEventListener('syncProgress', (event) => {
          this.ui.updateSyncProgress(event);
          if (event.detail.type === 'complete' && event.detail.action === 'receive' && event.detail.gardenName) {
            
            if (this.liveSync.state === 'bootstrapping') {
                console.log('[Sync] Bootstrap file sync complete. Preserving editor state and finalizing live session.');
                // --- THIS IS THE DEFINITIVE FIX ---
                // The crash was caused by calling `this.workspace.events.publish`.
                // The event bus is on the global `window.thoughtform` object.
                // This correction prevents the crash and allows the logic to complete,
                // which in turn prevents the destructive hotReloadGarden from running.
                window.thoughtform.events.publish('workspace:garden:reloaded', { gardenName: event.detail.gardenName });
                return;
            }
            // --- END OF FIX ---

            this.workspace.hotReloadGarden(event.detail.gardenName);
          }
        });
    }

    const autoConnect = localStorage.getItem('thoughtform_sync_auto_connect') === 'true';
    if (autoConnect) {
        const savedSyncName = localStorage.getItem('thoughtform_sync_name');
        const savedPeerPrefix = localStorage.getItem('thoughtform_peer_prefix') || '';
        if (savedSyncName) {
            this.connect(savedSyncName, savedPeerPrefix);
        }
    }
  }

  async connect(syncName, peerNamePrefix) {
      if (this.connectionState !== 'disconnected' && this.connectionState !== 'error') return;
      this.syncName = syncName;
      this.updateConnectionState('connecting', 'Connecting...');
      await this.signaling.joinSession(this.syncName, peerNamePrefix);
  }

  disconnect() {
      this.disableLiveSync();
      this.signaling.destroy();
      this.peerConnections.forEach(pc => pc.close());
      this.peerConnections.clear();
      this.isConnected = false;
      this.syncName = null;
      this.connectedPeers.clear();
      this.updateConnectionState('disconnected', 'Disconnected');
  }

  enableLiveSync() { this.liveSync.enable(); }
  disableLiveSync() { this.liveSync.disable(); }
  triggerReElection() { this.liveSync.triggerReElection(); }

  createPeerConnection(peerId, isInitiator = false) {
    if (this.peerConnections.has(peerId)) return this.peerConnections.get(peerId);
    if (this.peerConnections.size >= MAX_PEER_CONNECTIONS) return null;
    
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.peerConnections.set(peerId, pc);

    pc.onicecandidate = (event) => {
        if (event.candidate) this.signaling.sendSignal({ type: 'candidate', candidate: event.candidate }, peerId);
    };

    pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
            this.updateConnectionState('connected-p2p', `P2P Connected (${this.connectedPeers.size + 1} total)`);
            if (localStorage.getItem('thoughtform_live_sync_enabled') === 'true' && this.liveSync.state === 'disabled') {
                this.enableLiveSync();
            }
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            this.handlePeerLeft(peerId);
        }
    };
    
    if (!isInitiator) {
        pc.ondatachannel = (event) => this.setupDataChannel(peerId, event.channel);
    }
    return pc;
  }
  
  setupDataChannel(peerId, channel) {
      const pc = this.peerConnections.get(peerId);
      if (!pc) return;
      pc.dataChannel = channel;
      channel.onopen = () => {
          this._announcePresence(peerId);
          if (localStorage.getItem('thoughtform_live_sync_enabled') === 'true' && this.liveSync.state === 'disabled') {
              this.enableLiveSync();
          } else if (this.liveSync.state !== 'disabled') {
              const myPeerId = this.getPeerId();
              const myPeerName = localStorage.getItem('thoughtform_peer_prefix') || myPeerId.substring(0, 8);
              this.sendSyncMessage({ type: 'MSG_LIVESYNC_ANNOUNCE', peerInfo: { id: myPeerId, name: myPeerName } }, peerId, false);
          }
      };
      
      channel.onmessage = async (e) => {
          try {
              console.log(`[Sync/onmessage] Raw message received from P2P channel with ${peerId.substring(0,4)}`);
              const data = JSON.parse(e.data);
              this.messageRouter.handleIncomingMessage(data, `P2P-${peerId.substring(0,4)}`);
          } catch (error) {
              console.error('[Sync/onmessage] Error parsing sync message from DataChannel:', error, 'Raw data:', e.data);
          }
      };
      
      channel.onclose = () => this.handlePeerLeft(peerId);
      channel.onerror = (e) => console.error(`[Sync/onerror] Data channel error with ${peerId.substring(0,8)}...:`, e);
  }

  updatePeerIdDisplay() {
    const peerIdEl = this._container?.querySelector('#sync-peer-id-display');
    if (peerIdEl) {
        const peerId = this.getPeerId();
        if (peerId) peerIdEl.textContent = peerId;
        else if (this.connectionState === 'disconnected' || this.connectionState === 'error') peerIdEl.textContent = 'Not Connected';
        else peerIdEl.textContent = 'Connecting...';
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
  
  _announcePresence(targetPeerId = null) {
      if (!this.signaling.peerId) return;
      console.log('[Sync/_announcePresence] Announcing presence.');
      const gardens = JSON.parse(localStorage.getItem('thoughtform_gardens') || '["home"]');
      const myPeerName = localStorage.getItem('thoughtform_peer_prefix') || this.signaling.peerId.substring(0, 8);
      this.sendSyncMessage({ type: 'peer_introduction', peerId: this.signaling.peerId, peerName: myPeerName, gardens }, targetPeerId, true);
  }

  handlePeerIntroduction(payload) {
      if (!payload.peerId || payload.peerId === this.signaling.peerId) return;
      const peerName = payload.peerName || payload.peerId.substring(0, 8);
      const isNewPeer = !this.connectedPeers.has(payload.peerId);
      this.connectedPeers.set(payload.peerId, { id: peerName, gardens: payload.gardens });
      if (isNewPeer) this.addMessage(`Peer ${peerName} discovered.`);
      if (this.ui) this.ui.updateStatus(`P2P Connected (${this.connectedPeers.size} peer${this.connectedPeers.size === 1 ? '' : 's'})`);
  }
  
  handlePeerLeft(peerId) {
      if (this.connectedPeers.has(peerId)) {
          const peerName = this.connectedPeers.get(peerId).id;
          this.connectedPeers.delete(peerId);
          this.addMessage(`Peer ${peerName} disconnected.`);
      }
      
      const pc = this.peerConnections.get(peerId);
      if (pc) { pc.close(); this.peerConnections.delete(peerId); }
      
      this.liveSync.handlePeerLeft(peerId);
      this.ui.updateLiveSyncUI();
      
      if (this.peerConnections.size === 0 && this.connectionState === 'connected-p2p') {
          this.updateConnectionState('connected-signal', 'Connected to tracker, waiting for peers...');
      } else if (this.ui) {
          this.ui.updateStatus(`P2P Connected (${this.connectedPeers.size} total)`);
      }
  }
  
  getPeerId() { return this.signaling.peerId; }
  setGitClient(gitClient) { this.gitClient = gitClient; this.fileSync.setGitClient(gitClient); }
  addMessage(text) { if(this.ui) this.ui.addMessage(text); }
  
  sendSyncMessage(data, targetPeerId = null, useGossip = false) {
    console.log(`[Sync/sendSyncMessage] Preparing to send message of type ${data.type}. Target: ${targetPeerId ? targetPeerId.substring(0,4) : 'Broadcast'}, Gossip: ${useGossip}`);
    this.messageRouter.sendSyncMessage(data, targetPeerId, null, useGossip);
  }

  show() { if(this._container) this._container.style.display = 'block'; }
  hide() { if(this._container) this._container.style.display = 'none'; }
  destroy() { this.disconnect(); this.fileSync.destroy(); this.messageRouter.destroy(); }
}