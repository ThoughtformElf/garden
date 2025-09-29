// src/devtools/sync/files/sync-actions.js
import { Modal } from '../../../util/modal.js';
import debug from '../../../util/debug.js';
import { FileOperations } from './operations.js';

export class SyncActions {
    // This is for the "Send All Files" button, which is non-destructive.
    static async syncAllFiles(instance) {
        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Starting to send all files...', type: 'info' } }));
        const gitClientToUse = instance._getGitClient();
        if (!gitClientToUse) {
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Error: Git client not available.', type: 'error' } }));
            return;
        }
        try {
            const confirmed = await Modal.confirm({
                title: 'Send All Files',
                message: `This will send your working files to the peer. It will NOT send your git history. Are you sure?`,
                okText: 'Send Files'
            });

            if (!confirmed) {
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Send all files cancelled.', type: 'cancelled' } }));
                return;
            }

            // Use the lister that correctly skips the .git folder.
            const files = await instance.getAllFiles(gitClientToUse);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Found ${files.length} content files to sync.`, type: 'info' } }));

            for (const file of files) {
                const content = await gitClientToUse.readFile(file);
                let timestamp = 0;
                try {
                    timestamp = JSON.parse(content).lastupdated || 0;
                } catch (e) { /* is raw file */ }

                instance.sync.signaling.sendSyncMessage({
                    type: 'file_update',
                    path: file,
                    content: content,
                    timestamp: timestamp,
                    isFullSync: false
                });
            }
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Sync completed. Sent ${files.length} files.`, type: 'complete' } }));
        } catch (error) {
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error syncing all files: ${error.message}`, type: 'error' } }));
        }
    }

    // THIS IS THE ONE YOU CARE ABOUT
    static requestAllFiles(instance) {
        // This call will now succeed. It resets the state on the receiver's side.
        instance.resetFullSyncState();

        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Requesting a full clone from peer...', type: 'info' } }));
        
        // Send the request message to the other machine.
        instance.sync.signaling.sendSyncMessage({
            type: 'request_all_files'
        });
        
        instance.sync.addMessage('Requested all files from peer');
    }

    static sendFileUpdate(instance, path, content, timestamp) {
        instance.sync.signaling.sendSyncMessage({
            type: 'file_update',
            path: path,
            content: content,
            timestamp: timestamp
        });
    }
}