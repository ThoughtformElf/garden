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
        this.deletedGitDirs = new Set();
        this.isSyncFailed = false; // --- THIS IS THE FIX (Part 1) ---
        
        this.activeTransfers = new Map();
    }
    
    resetFullSyncState() {
        this.pendingWriteCount = 0;
        this.isSyncCompleteMessageReceived = false;
        this.deletedGitDirs.clear();
        this.activeTransfers.clear();
        this.isSyncFailed = false; // --- THIS IS THE FIX (Part 2) ---
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
        try {
            await MessageHandler.handleSyncMessage(this, data);
        } catch (error) {
            // --- THIS IS THE FIX (Part 3) ---
            console.error('[SyncFiles] Critical error handling sync message:', error);
            this.isSyncFailed = true;
            this.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { 
                    message: `A critical error occurred: ${error.message}. Aborting sync.`, 
                    type: 'error' 
                } 
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
        // --- THIS IS THE FIX (Part 4) ---
        if (this.isSyncFailed) {
            this.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Sync failed. Please close this dialog and check the console for errors.', type: 'error' } }));
            return;
        }

        if (this.isSyncCompleteMessageReceived && this.pendingWriteCount === 0 && this.activeTransfers.size === 0) {
            this.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'All files received and written. Reloading...', type: 'complete' } }));
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