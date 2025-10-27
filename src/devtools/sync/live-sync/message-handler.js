import * as Y from 'yjs';

export class LiveSyncMessageHandler {
  constructor(manager) {
    this.manager = manager;
    this.sync = manager.sync;
  }

  async handle(payload) {
    const fromPeerId = payload.fromPeerId;
    console.log(`[LiveSync] Handling message: ${payload.type} from peer ${fromPeerId ? fromPeerId.substring(0, 4) : 'N/A'}`);

    switch (payload.type) {
      case 'MSG_LIVESYNC_REELECT':
        this.manager.session.triggerReElection();
        break;

      case 'MSG_LIVESYNC_ANNOUNCE':
        if ((this.manager.state === 'host' || this.manager.state === 'active') && payload.peerInfo) {
          this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_SESSION_INFO', hostId: this.manager.hostId, syncableGardens: this.manager.syncableGardens }, payload.peerInfo.id, false);
        } else if (this.manager.state === 'pending' && payload.peerInfo) {
          this.manager.pendingPeers.set(payload.peerInfo.id, payload.peerInfo);
          const myPeerId = this.sync.getPeerId();
          const myPeerName = localStorage.getItem('thoughtform_peer_prefix') || myPeerId.substring(0, 8);
          this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_ANNOUNCE_REPLY', peerInfo: { id: myPeerId, name: myPeerName } }, payload.peerInfo.id, false);
          this.manager.session.showHostSelectionModalIfNeeded();
        }
        break;

      case 'MSG_LIVESYNC_ANNOUNCE_REPLY':
        if (this.manager.state === 'pending' && payload.peerInfo) {
          this.manager.pendingPeers.set(payload.peerInfo.id, payload.peerInfo);
          this.manager.session.showHostSelectionModalIfNeeded();
        }
        break;

      case 'MSG_LIVESYNC_SESSION_INFO':
        if (this.manager.state === 'pending') {
          this.sync.addMessage('Found an existing live session. Joining as follower...');
          this.manager.syncableGardens = payload.syncableGardens || [];
          sessionStorage.setItem('thoughtform_live_sync_gardens', JSON.stringify(this.manager.syncableGardens));
          this.manager.session.processHostSelection(payload.hostId);
        }
        break;

      case 'MSG_LIVESYNC_HOST_CHOSEN':
        if (this.manager.state === 'pending') this.manager.session.processHostSelection(payload.chosenHostId);
        break;

      case 'MSG_LIVESYNC_SESSION_START':
        if (this.manager.state === 'bootstrapping') {
          this.manager.syncableGardens = payload.syncableGardens;
          sessionStorage.setItem('thoughtform_live_sync_gardens', JSON.stringify(this.manager.syncableGardens));
          this.sync.addMessage(`Session started. Syncing gardens: ${this.manager.syncableGardens.join(', ')}.`);
          this.sync.ui.showSyncProgressModal();
          this.sync.fileSync.requestSpecificGardens({ [this.manager.hostId]: this.manager.syncableGardens });
        }
        break;

      case 'MSG_LIVESYNC_REQUEST_DOC_STATE':
        if (this.manager.state === 'host' && payload.file) {
          const yDoc = await this.manager.yDocManager.getYDoc(payload.file.garden, payload.file.path);
          if (yDoc) {
            const fullState = Y.encodeStateAsUpdate(yDoc);
            this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_DOC_STATE', file: payload.file, update: Array.from(fullState) }, fromPeerId, false);
          }
        }
        break;

      case 'MSG_LIVESYNC_DOC_STATE':
        if (payload.file) {
          const yDoc = await this.manager.yDocManager.getYDoc(payload.file.garden, payload.file.path);
          if (yDoc) Y.applyUpdate(yDoc, new Uint8Array(payload.update), 'remote-sync');
        }
        break;

      case 'MSG_LIVESYNC_YJS_UPDATE':
        if (payload.garden && payload.path) {
          // --- THIS IS THE FIX (Part 3) ---
          // Call the corrected function without the `isHost` parameter.
          const yDoc = await this.manager.yDocManager.getYDoc(payload.garden, payload.path);
          if (yDoc) {
            Y.applyUpdate(yDoc, new Uint8Array(payload.update), 'remote-sync');
          }
        }
        break;

      case 'MSG_LIVESYNC_DISABLE':
        if (fromPeerId) {
          this.manager.pendingPeers.delete(fromPeerId);
          this.manager.activePeers.delete(fromPeerId);
        }
        if (this.manager.state === 'pending' && this.manager.session.hostSelectionModal) {
          this.manager.session.hostSelectionModal.destroy();
          this.manager.session.hostSelectionModal = null;
          this.manager.session.showHostSelectionModalIfNeeded();
        }
        this.sync.ui.updateLiveSyncUI();
        break;
    }
  }
}