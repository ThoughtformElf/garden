// src/devtools/sync/files/message-handler.js
import debug from '../../../util/debug.js';
import { FileOperations } from './operations.js';
import { Git } from '../../../util/git-integration.js';

export class MessageHandler {
    static async handleSyncMessage(instance, data) {
        switch (data.type) {
            case 'file_update':
                await FileOperations.handleFileUpdate(instance, data);
                break;
            case 'request_gardens':
                await this.handleRequestGardens(instance, data.gardens);
                break;
            
            case 'full_sync_complete':
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'File stream complete. Waiting for writes to finish...', type: 'info' } }));
                instance.markSyncStreamAsComplete();
                break;

            default:
                debug.log('Unknown sync message type:', data.type);
        }
    }

    static async handleRequestGardens(instance, gardens = []) {
        if (!gardens || gardens.length === 0) return;
        
        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Received request for gardens: ${gardens.join(', ')}.`, type: 'info' } }));

        try {
            for (const gardenName of gardens) {
                const tempGitClient = new Git(gardenName);
                const files = await tempGitClient.listAllFilesForClone('/');
                
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Found ${files.length} files in ${gardenName}. Starting stream...`, type: 'info' } }));

                // --- THIS IS THE PERFORMANCE FIX (Part 2) ---
                // We process the file list in manageable chunks to avoid memory overload.
                const CHUNK_SIZE = 200; 
                let sentCount = 0;

                for (let i = 0; i < files.length; i += CHUNK_SIZE) {
                    const chunk = files.slice(i, i + CHUNK_SIZE);
                    
                    // Read the small batch of files in parallel.
                    const fileContents = await Promise.all(
                        chunk.map(file => tempGitClient.readFileAsBuffer(file).then(content => ({ file, content })))
                    );

                    // Send the in-memory batch in a tight, non-blocking loop.
                    for (const { file, content } of fileContents) {
                        if (content) {
                            instance.sync.sendSyncMessage({
                                type: 'file_update',
                                gardenName: gardenName,
                                path: file,
                                content: Buffer.from(content).toString('base64'),
                                isBase64: true,
                                isFullSync: true
                            });
                        }
                    }
                    sentCount += chunk.length;
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Sent ${sentCount} of ${files.length} files for ${gardenName}...`, type: 'info' } }));
                }
            }
            
            instance.sync.sendSyncMessage({ type: 'full_sync_complete' });
            
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `All file data sent.`, type: 'info' } }));
        } catch (error) {
            console.error('Error handling garden request:', error);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error handling garden request: ${error.message}`, type: 'error' } }));
        }
    }
}