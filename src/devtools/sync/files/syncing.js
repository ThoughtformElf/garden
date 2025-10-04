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

            const files = await instance.getAllFiles(gitClientToUse);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Found ${files.length} content files to sync.`, type: 'info' } }));

            for (const file of files) {
                const content = await gitClientToUse.readFile(file);
                let timestamp = 0;
                try {
                    timestamp = JSON.parse(content).lastupdated || 0;
                } catch (e) { /* is raw file */ }

                instance.sync.sendSyncMessage({
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

    /**
     * Takes a selection object and sends targeted requests to the appropriate peers.
     * @param {SyncFiles} instance The SyncFiles instance.
     * @param {object} selection - The selection from the modal, e.g., { 'peerId-123': ['gardenA', 'gardenB'] }
     */
    static requestSpecificGardens(instance, selection) {
        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Requesting selected gardens from peers...', type: 'info' } }));
        
        // --- THIS IS THE FIX (Part 1) ---
        const selfPeerId = instance.sync.signaling.peerId;
        if (!selfPeerId) {
            const errorMsg = 'Cannot request gardens: own peer ID is not available.';
            instance.dispatchEvent(new CustomEvent('syncProgress', {
                detail: { message: errorMsg, type: 'error' }
            }));
            console.error(errorMsg);
            return;
        }
        // --- END OF FIX (Part 1) ---

        Object.entries(selection).forEach(([peerId, gardens]) => {
            const shortId = peerId.substring(0, 8);
            instance.dispatchEvent(new CustomEvent('syncProgress', {
                detail: {
                    message: `Sending request to peer ${shortId}... for gardens: ${gardens.join(', ')}`,
                    type: 'info'
                }
            }));
            
            // Send a targeted message to each selected peer
            instance.sync.sendSyncMessage(
                {
                    type: 'request_gardens',
                    gardens: gardens,
                    requesterId: selfPeerId // --- THIS IS THE FIX (Part 2) ---
                },
                peerId // The targetPeerId argument
            );
        });

        instance.sync.addMessage(`Sent requests for ${Object.keys(selection).length} peer(s).`);
    }

    static sendFileUpdate(instance, path, content, timestamp) {
        instance.sync.sendSyncMessage({
            type: 'file_update',
            path: path,
            content: content,
            timestamp: timestamp
        });
    }
}