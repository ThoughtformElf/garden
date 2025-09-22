// src/devtools/sync/files/sync-actions.js
import { Modal } from '../../../util/modal.js';
import debug from '../../../util/debug.js';
import { FileOperations } from './operations.js'; // Import for getAllFiles

// Helper class/module for high-level sync actions
export class SyncActions {
    static async syncAllFiles(instance) { // Pass the SyncFiles instance
        // --- ADDITION: Dispatch start event ---
        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Starting to send all files...', type: 'info' } }));
        // --- END ADDITION ---

        // --- KEY CHANGE 2: Use helper to get gitClient ---
        const gitClientToUse = instance._getGitClient(); // Use helper method on instance
        if (!gitClientToUse) {
            instance.sync.addMessage('Git client not available. Please make sure a garden is loaded.');
            console.error('syncAllFiles: Git client not available from any source.');
            debug.error('syncAllFiles: Git client not available from any source.');
            // --- ADDITION: Dispatch error event ---
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Error: Git client not available. Please make sure a garden is loaded.', type: 'error' } }));
            // --- END ADDITION ---
            // Log what we *do* have for debugging
            debug.log("DEBUG: this.gitClient:", instance.gitClient);
            debug.log("DEBUG: this.sync.gitClient:", instance.sync?.gitClient);
            debug.log("DEBUG: window.thoughtform keys:", Object.keys(window.thoughtform || {}));
            if (window.thoughtform) {
                for (const key in window.thoughtform) {
                    if (typeof window.thoughtform[key] === 'object' && window.thoughtform[key] !== null) {
                        debug.log(`DEBUG: window.thoughtform.${key} keys:`, Object.keys(window.thoughtform[key]));
                    }
                }
            }
            return;
        }
        debug.log("DEBUG: syncAllFiles: Got gitClient to use");
        // --- END KEY CHANGES ---

        try {
            // --- KEY CHANGE 3: Add Confirmation ---
            // Try to get garden name, fallback to 'unknown'
            let gardenName = 'unknown';
            if (typeof gitClientToUse.gardenName === 'string') {
                gardenName = gitClientToUse.gardenName;
            } else if (gitClientToUse.dir) { // Guess from dir property if it exists
                gardenName = gitClientToUse.dir.replace(/^\//, ''); // Remove leading slash
            }

            const confirmed = await Modal.confirm({
                title: 'Send All Files',
                message: `Are you sure you want to send all files from your garden '${gardenName}' to the connected peer? This will update their files if yours are newer.`,
                okText: 'Send Files',
                cancelText: 'Cancel'
            });

            if (!confirmed) {
                instance.sync.addMessage('Send all files cancelled.');
                // --- ADDITION: Dispatch cancellation event ---
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Send all files cancelled by user.', type: 'cancelled' } }));
                // --- END ADDITION ---
                return;
            }
            // --- END KEY CHANGE 3 ---

            instance.sync.addMessage('Syncing all files...');
            const files = await FileOperations.getAllFiles(gitClientToUse); // Use robust helper
            // --- ADDITION: Dispatch progress event ---
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Found ${files.length} files to sync.`, type: 'info' } }));
            // --- END ADDITION ---

            let sentCount = 0;
            for (const file of files) {
                try {
                    // --- ADDITION: Dispatch progress event ---
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Reading file: ${file}`, type: 'info' } }));
                    // --- END ADDITION ---
                    const content = await gitClientToUse.readFile(file);
                    let timestamp = 0;

                    try {
                        const parsed = JSON.parse(content);
                        timestamp = parsed.lastupdated || 0;
                    } catch (e) {
                        timestamp = 0;
                    }

                    // --- KEY CHANGE 4: Use signaling's send method (has fallback) ---
                    // --- ADDITION: Dispatch progress event ---
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Sending file: ${file} (${sentCount + 1}/${files.length})`, type: 'info' } }));
                    // --- END ADDITION ---
                    instance.sync.signaling.sendSyncMessage({
                        type: 'file_update',
                        path: file,
                        content: content,
                        timestamp: timestamp
                    });
                    // --- END KEY CHANGE 4 ---
                    sentCount++;
                } catch (e) {
                    console.warn(`Could not read/send file ${file} for sync:`, e);
                    instance.sync.addMessage(`Warning: Could not process file ${file}`);
                    debug.warn(`Could not read/send file ${file} for sync:`, e);
                    // --- ADDITION: Dispatch error event ---
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Warning: Could not process file ${file}: ${e.message}`, type: 'error' } }));
                    // --- END ADDITION ---
                }
            }

            instance.sync.addMessage(`Synced all files with peer. Sent ${sentCount}/${files.length} files.`);
            debug.log(`DEBUG: syncAllFiles completed. Sent ${sentCount}/${files.length} files.`);
            // --- ADDITION: Dispatch completion event ---
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Sync completed successfully. Sent ${sentCount}/${files.length} files.`, type: 'complete' } }));
            // --- END ADDITION ---
        } catch (error) {
            console.error('Error syncing all files:', error);
            instance.sync.addMessage(`Error syncing all files: ${error.message}`);
            debug.error('Error syncing all files:', error);
            // --- ADDITION: Dispatch error event ---
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error syncing all files: ${error.message}`, type: 'error' } }));
            // --- END ADDITION ---
        }
    }

    static requestAllFiles(instance) { // Pass the SyncFiles instance
        // --- ADDITION: Dispatch start event ---
        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Requesting all files from peer...', type: 'info' } }));
        // --- END ADDITION ---

        // --- KEY CHANGE 6: Use signaling's send method (has fallback) ---
        instance.sync.signaling.sendSyncMessage({
            type: 'request_all_files'
        });
        // --- END KEY CHANGE 6 ---

        instance.sync.addMessage('Requested all files from peer');
    }


    static sendFileUpdate(instance, path, content, timestamp) { // Pass the SyncFiles instance
        // --- KEY CHANGE 7: Use signaling's send method (has fallback) ---
        instance.sync.signaling.sendSyncMessage({
            type: 'file_update',
            path: path,
            content: content,
            timestamp: timestamp
        });
        // --- END KEY CHANGE 7 ---
    }
}