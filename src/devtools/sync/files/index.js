// src/devtools/sync/files/index.js
import { EventEmitterMixin } from './event-emitter.js';
import { GitClientHelper } from './git-client.js';
import { DataChannelHandler } from './data-channel.js';
import { MessageHandler } from './messages.js';
// Import actions for delegation
import { SyncActions } from './syncing.js';
// Import operations for delegation (if needed directly, though MessageHandler/FileOperations might use them)
import { FileOperations } from './operations.js';

// Import external dependencies if still needed at this level
// import { Modal } from '../../util/modal.js'; // Might be needed if used directly here
// import debug from '../../util/debug.js'; // Might be needed if used directly here

export class SyncFiles extends EventEmitterMixin { // Inherit event emitter
    constructor(syncInstance) {
        super(); // Initialize EventEmitterMixin
        this.sync = syncInstance;
        this.gitClient = null;
        // _listeners is now initialized by EventEmitterMixin
    }

    // Delegate gitClient logic to helper
    _getGitClient() {
        return GitClientHelper.getGitClient(this);
    }

    setGitClient(gitClient) {
        this.gitClient = gitClient;
    }

    // Delegate data channel setup to helper
    setupDataChannel(channel) {
        DataChannelHandler.setupDataChannel(this, channel);
    }

    // Delegate message handling to helper
    async handleSyncMessage(data) {
        await MessageHandler.handleSyncMessage(this, data);
    }

    // Delegate simpler message handlers if moved
    // async handleRequestAllFiles() { await MessageHandler.handleRequestAllFiles(this); }
    // async handleAllFiles(data) { await MessageHandler.handleAllFiles(this, data); }

    // Keep these in the main class for now as they delegate
    async handleRequestAllFiles() {
        await MessageHandler.handleRequestAllFiles(this);
    }

    async handleAllFiles(data) {
        await MessageHandler.handleAllFiles(this, data);
    }

    // Delegate sync actions to helper
    async syncAllFiles() {
        await SyncActions.syncAllFiles(this);
    }

    requestAllFiles() {
        SyncActions.requestAllFiles(this);
    }

    sendFileUpdate(path, content, timestamp) {
        SyncActions.sendFileUpdate(this, path, content, timestamp);
    }

    // Override destroy to also call parent destroy
    destroy() {
        super.destroy(); // Call EventEmitterMixin destroy
        // Any other cleanup specific to SyncFiles?
    }

    // --- Keep the file operation helpers that are used internally ---
    // These might be better placed in FileOperations and imported where needed
    async getAllFiles(gitClientToUse) {
        return FileOperations.getAllFiles(gitClientToUse);
    }

    async _listAllFiles(gitClientToUse, dir) {
        return FileOperations._listAllFiles(gitClientToUse, dir);
    }
    // --- End Keep ---
}