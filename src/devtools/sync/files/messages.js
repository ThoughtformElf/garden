// src/devtools/sync/files/message-handler.js
import debug from '../../../util/debug.js';
import { FileOperations } from './operations.js';

export class MessageHandler {
    static async handleSyncMessage(instance, data) {
        switch (data.type) {
            case 'file_update':
                await FileOperations.handleFileUpdate(instance, data);
                break;
            case 'request_all_files':
                await this.handleRequestAllFiles(instance);
                break;
            // --- THIS IS THE NEW, RELIABLE COMPLETION HANDLER ---
            case 'full_sync_complete':
                // This message can only be received by the client that requested the files.
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Sync complete. Reloading application...', type: 'complete' } }));
                // Use a short timeout to ensure the final message renders before the page reloads.
                setTimeout(() => window.location.reload(), 1500);
                break;
            default:
                debug.log('Unknown sync message type:', data.type);
        }
    }

    // This is the SENDER's logic
    static async handleRequestAllFiles(instance) {
        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Received request, streaming all files...', type: 'info' } }));

        const gitClientToUse = instance._getGitClient();
        if (!gitClientToUse) {
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Error: Git client not available.', type: 'error' } }));
            return;
        }

        try {
            const files = await gitClientToUse.listAllFilesForClone('/');
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Found ${files.length} files to stream.`, type: 'info' } }));

            let sentCount = 0;
            for (const file of files) {
                try {
                    const content = await gitClientToUse.readFileAsBuffer(file);
                    instance.sync.signaling.sendSyncMessage({
                        type: 'file_update',
                        path: file,
                        content: Buffer.from(content).toString('base64'),
                        isBase64: true,
                        isFullSync: true
                    });

                    sentCount++;
                    if (sentCount % 100 === 0 || sentCount === files.length) {
                        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Streaming files... (${sentCount}/${files.length})`, type: 'info' } }));
                    }

                } catch (e) {
                    debug.warn(`Could not send file ${file} for sync:`, e);
                }
            }
            
            // --- AFTER ALL FILES ARE SENT, SEND THE COMPLETION SIGNAL ---
            instance.sync.signaling.sendSyncMessage({ type: 'full_sync_complete' });
            
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Finished sending ${sentCount} files.`, type: 'info' } }));
        } catch (error) {
            console.error('Error sending all files:', error);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error sending all files: ${error.message}`, type: 'error' } }));
        }
    }
}