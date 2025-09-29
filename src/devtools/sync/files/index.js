// src/devtools/sync/files/index.js
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
        // --- THIS IS THE FIX (Part 1) ---
        // This Set will track which gardens have had their .git dirs wiped in this session.
        this.deletedGitDirs = new Set();
    }
    
    resetFullSyncState() {
        this.pendingWriteCount = 0;
        this.isSyncCompleteMessageReceived = false;
        // --- THIS IS THE FIX (Part 2) ---
        // Clear the tracking set for every new full sync request.
        this.deletedGitDirs.clear();
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
        await MessageHandler.handleSyncMessage(this, data);
    }

    async syncAllFiles() {
        this.resetFullSyncState();
        await SyncActions.syncAllFiles(this);
    }
    
    requestSpecificGardens(selection) {
        this.resetFullSyncState();
        SyncActions.requestSpecificGardens(this, selection);
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
        if (this.isSyncCompleteMessageReceived && this.pendingWriteCount === 0) {
            this.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'All files received and written. Reloading...', type: 'complete' } }));
            setTimeout(() => window.location.reload(), 1500);
        }
    }

    destroy() {
        super.destroy();
    }
    
    async getAllFiles(gitClientToUse) {
        return FileOperations._listAllFiles(gitClientToUse, '/');
    }
}