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

        this.isFullSyncInProgress = false;
        this.deletionPromise = null;
        this.fileBuffer = [];
        this.syncCompletionTimeout = null; // Timer to detect end of stream
    }
    
    resetFullSyncState() {
        this.isFullSyncInProgress = false;
        this.deletionPromise = null;
        this.fileBuffer = [];
        clearTimeout(this.syncCompletionTimeout);
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

    async handleRequestAllFiles() {
        await MessageHandler.handleRequestAllFiles(this);
    }

    async syncAllFiles() {
        await SyncActions.syncAllFiles(this);
    }

    requestAllFiles() {
        SyncActions.requestAllFiles(this);
    }

    sendFileUpdate(path, content, timestamp) {
        SyncActions.sendFileUpdate(this, path, content, timestamp);
    }

    destroy() {
        super.destroy();
    }
    
    async getAllFiles(gitClientToUse) {
        return FileOperations._listAllFiles(gitClientToUse, '/');
    }
}