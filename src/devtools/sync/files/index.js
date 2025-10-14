import { EventEmitterMixin } from './event-emitter.js';
import { GitClientHelper } from './git-client.js';
import { DataChannelHandler } from './data-channel.js';
import { MessageHandler } from './messages.js';
import { SyncActions } from './syncing.js';
import { FileOperations } from './operations.js';

export class SyncFiles extends EventEmitterMixin {
    constructor(syncInstance) {
        super();
        this.sync = syncInstance;
        this.gitClient = null;

        this.pendingWriteCount = 0;
        this.isSyncCompleteMessageReceived = false;
        this.deletedGitDirs = new Set();
        this.isSyncFailed = false;
        this.isSyncCancelled = false;
        
        this.activeTransfers = new Map();
        this.currentTransferId = null;
        this.targetPeers = [];
    }
    
    resetFullSyncState() {
        this.pendingWriteCount = 0;
        this.isSyncCompleteMessageReceived = false;
        this.deletedGitDirs.clear();
        this.activeTransfers.clear();
        this.isSyncFailed = false;
        this.isSyncCancelled = false;
        this.currentTransferId = null;
        this.targetPeers = [];
    }

    _getGitClient() {
        return GitClientHelper.getGitClient(this);
    }

    setGitClient(gitClient) {
        this.gitClient = gitClient;
    }

    setupDataChannel(channel) {
        DataChannelHandler.setupDataChannel(this, channel);
    }

    async handleSyncMessage(data) {
        if (this.isSyncCancelled && data.type !== 'sync_cancel') return;

        try {
            await MessageHandler.handleSyncMessage(this, data);
        } catch (error) {
            console.error('[SyncFiles] Critical error handling sync message:', error);
            this.isSyncFailed = true;
            this.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { message: `A critical error occurred: ${error.message}. Aborting sync.`, type: 'error' } 
            }));
        }
    }

    async sendGardensToPeers(selection) {
        this.resetFullSyncState();
        await SyncActions.sendGardensToPeers(this, selection);
    }
    
    requestSpecificGardens(selection) {
        this.resetFullSyncState();
        SyncActions.requestSpecificGardens(this, selection);
    }

    cancelSync(broadcast = true) {
        if (this.isSyncCancelled) return;
        this.isSyncCancelled = true;
        this.activeTransfers.clear();

        if (broadcast && this.currentTransferId) {
            this.sync.sendSyncMessage({
                type: 'sync_cancel',
                transferId: this.currentTransferId
            });
        }
        
        this.dispatchEvent(new CustomEvent('syncProgress', {
            detail: { message: 'Sync cancelled by user.', type: 'cancelled' }
        }));
    }

    incrementPendingWrites() {
        this.pendingWriteCount++;
    }

    decrementPendingWrites() {
        this.pendingWriteCount--;
        this.checkForReload();
    }

    markSyncStreamAsComplete() {
        this.isSyncCompleteMessageReceived = true;
        this.checkForReload();
    }

    checkForReload() {
        if (this.isSyncFailed || this.isSyncCancelled) {
            return;
        }

        if (this.isSyncCompleteMessageReceived && this.pendingWriteCount === 0 && this.activeTransfers.size === 0) {
            this.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'All files received and written. Reloading...', type: 'complete', action: 'receive' } }));
            setTimeout(() => window.location.reload(), 1500);
        }
    }

    destroy() {
        super.destroy();
        this.activeTransfers.clear();
    }
    
    async getAllFiles(gitClientToUse) {
        return FileOperations._listAllFiles(gitClientToUse, '/');
    }
}