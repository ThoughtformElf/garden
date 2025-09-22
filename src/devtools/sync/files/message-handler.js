// src/devtools/sync/files/message-handler.js
import debug from '../../../util/debug.js';
import { FileOperations } from './file-operations.js'; // Import for handleFileUpdate logic

// Helper class/module for handling incoming messages
export class MessageHandler {
    static async handleSyncMessage(instance, data) { // Pass the SyncFiles instance and data
        switch (data.type) {
            case 'file_update':
                // Delegate to file operations helper
                await FileOperations.handleFileUpdate(instance, data);
                break;
            case 'request_all_files':
                // Delegate to sync actions helper (handleRequestAllFiles logic can be moved there if preferred)
                await instance.handleRequestAllFiles(); // Keep this in main class for now
                break;
            case 'all_files':
                // Delegate to sync actions helper (handleAllFiles logic can be moved there if preferred)
                await instance.handleAllFiles(data); // Keep this in main class for now
                break;
            default:
                console.log('Unknown sync message type:', data.type);
                debug.log('Unknown sync message type:', data.type);
        }
    }

    // --- Keep these in the main class for now as they are simpler ---
    static async handleRequestAllFiles(instance) { // Pass the SyncFiles instance
        // --- ADDITION: Dispatch progress event ---
        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Received request for all files.', type: 'info' } }));
        // --- END ADDITION ---

        const gitClientToUse = instance._getGitClient(); // Use helper method on instance
        if (!gitClientToUse) {
            console.warn('Git client not set, cannot send all files');
            instance.sync.addMessage('Error: Git client not available, cannot send all files');
            debug.warn('Git client not set, cannot send all files');
            // --- ADDITION: Dispatch error event ---
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Error: Git client not available, cannot send all files', type: 'error' } }));
            // --- END ADDITION ---
            return;
        }

        try {
            // Use the robust getAllFiles helper
            const files = await FileOperations.getAllFiles(gitClientToUse); // Import if not already
            // --- ADDITION: Dispatch progress event ---
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Found ${files.length} files to send.`, type: 'info' } }));
            // --- END ADDITION ---

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

                    // Use signaling's send method which has the fallback logic
                    // --- ADDITION: Dispatch progress event ---
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Sending file: ${file}`, type: 'info' } }));
                    // --- END ADDITION ---
                    instance.sync.signaling.sendSyncMessage({
                        type: 'file_update',
                        path: file,
                        content: content,
                        timestamp: timestamp
                    });
                } catch (e) {
                    console.warn(`Could not read file ${file} for sync:`, e);
                    debug.warn(`Could not read file ${file} for sync:`, e);
                    // --- ADDITION: Dispatch error event ---
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Warning: Could not read file ${file} for sync: ${e.message}`, type: 'error' } }));
                    // --- END ADDITION ---
                }
            }
            instance.sync.addMessage('Sent all files to peer');
            // --- ADDITION: Dispatch completion event ---
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Finished sending all files to peer.', type: 'complete' } }));
            // --- END ADDITION ---
        } catch (error) {
            console.error('Error sending all files:', error);
            instance.sync.addMessage(`Error sending all files: ${error.message}`);
            debug.error('Error sending all files:', error);
            // --- ADDITION: Dispatch error event ---
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error sending all files: ${error.message}`, type: 'error' } }));
            // --- END ADDITION ---
        }
    }

    static async handleAllFiles(instance, data) { // Pass the SyncFiles instance and data
        instance.sync.addMessage('Received all files from peer');
        debug.log('Received all files from peer');
        // --- ADDITION: Dispatch progress event ---
        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Received all files from peer.', type: 'info' } }));
        // --- END ADDITION ---
    }
    // --- End Keep ---
}