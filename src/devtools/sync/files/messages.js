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
                
                // --- THIS IS THE FIX ---
                // Use the listAllFilesForClone method which includes the .git directory.
                const files = await tempGitClient.listAllFilesForClone('/');
                
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Found ${files.length} total files (including history) in ${gardenName}. Streaming...`, type: 'info' } }));

                let sentCount = 0;
                for (const file of files) {
                    try {
                        const content = await tempGitClient.readFileAsBuffer(file);
                        instance.sync.sendSyncMessage({
                            type: 'file_update',
                            gardenName: gardenName,
                            path: file,
                            content: Buffer.from(content).toString('base64'),
                            isBase64: true,
                            isFullSync: true
                        });

                        sentCount++;
                        if (sentCount % 200 === 0 || sentCount === files.length) { // Log less frequently for large repos
                            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Streaming ${gardenName}... (${sentCount}/${files.length})`, type: 'info' } }));
                        }
                    } catch (e) {
                        debug.warn(`Could not send file ${file} from garden ${gardenName}:`, e);
                    }
                }
            }
            
            instance.sync.sendSyncMessage({ type: 'full_sync_complete' });
            
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Finished sending all requested gardens.`, type: 'info' } }));
        } catch (error) {
            console.error('Error handling garden request:', error);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error handling garden request: ${error.message}`, type: 'error' } }));
        }
    }
}