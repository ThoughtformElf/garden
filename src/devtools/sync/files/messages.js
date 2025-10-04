// src/devtools/sync/files/message-handler.js
import debug from '../../../util/debug.js';
import { FileOperations } from './operations.js';
import { Git } from '../../../util/git-integration.js';
import JSZip from 'jszip';

export class MessageHandler {
    static async handleSyncMessage(instance, data) {
        switch (data.type) {
            case 'file_update':
                await FileOperations.handleFileUpdate(instance, data);
                break;
            case 'request_gardens':
                // --- THIS IS THE FIX (Part 1) ---
                await this.handleRequestGardens(instance, data.gardens, data.requesterId);
                break;
            case 'garden_zip_chunk':
                await this.handleGardenZipChunk(instance, data);
                break;
            case 'garden_zip_complete':
                await this.handleGardenZipComplete(instance, data);
                break;
            case 'full_sync_complete':
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'File stream complete. Waiting for writes to finish...', type: 'info' } }));
                instance.markSyncStreamAsComplete();
                break;
            default:
                debug.log('Unknown sync message type:', data.type);
        }
    }

    // --- THIS IS THE FIX (Part 2: Function signature updated) ---
    static async handleRequestGardens(instance, gardens = [], requesterId) {
        if (!gardens || gardens.length === 0) return;
        
        // --- THIS IS THE FIX (Part 3: Validate requesterId) ---
        if (!requesterId) {
            const errorMsg = 'Error: Received garden request without a requesterId. Cannot send response.';
            console.error(errorMsg);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: errorMsg, type: 'error' } }));
            return;
        }

        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Received request for gardens: ${gardens.join(', ')}.`, type: 'info' } }));

        const CHUNK_SIZE = 64 * 1024; // 64KB chunks
        
        // --- THIS IS THE FIX (Part 4: Backpressure handling) ---
        const HIGH_WATER_MARK = 10 * 1024 * 1024; // 10MB buffer limit
        
        const peerConnection = instance.sync.peerConnections.get(requesterId);
        if (!peerConnection || !peerConnection.dataChannel || peerConnection.dataChannel.readyState !== 'open') {
             const errorMsg = `Error: Cannot send files to ${requesterId.substring(0,8)}... because no open data channel was found.`;
             console.error(errorMsg);
             instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: errorMsg, type: 'error' } }));
             return;
        }
        const dataChannel = peerConnection.dataChannel;

        const waitForBuffer = () => {
            return new Promise(resolve => {
                if (dataChannel.bufferedAmount < HIGH_WATER_MARK) {
                    resolve();
                } else {
                    const check = () => {
                        if (dataChannel.bufferedAmount < HIGH_WATER_MARK) {
                            dataChannel.removeEventListener('bufferedamountlow', check);
                            resolve();
                        }
                    };
                    dataChannel.addEventListener('bufferedamountlow', check);
                }
            });
        };
        // --- END OF FIX (Part 4) ---

        try {
            for (const gardenName of gardens) {
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Preparing ${gardenName} for transfer...`, type: 'info' } }));
                
                const zip = new JSZip();
                const tempGitClient = new Git(gardenName);
                
                const allFiles = await this.getAllFilesIncludingGit(tempGitClient.pfs, '/');
                
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Zipping ${allFiles.length} files from ${gardenName}...`, type: 'info' } }));
                
                for (const filePath of allFiles) {
                    const content = await tempGitClient.pfs.readFile(filePath);
                    const zipPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
                    zip.file(zipPath, content);
                }
                
                const zipData = await zip.generateAsync({ 
                    type: 'uint8array',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                });
                
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Zip created (${(zipData.length / 1024 / 1024).toFixed(2)} MB). Sending in chunks...`, type: 'info' } }));
                
                const totalChunks = Math.ceil(zipData.length / CHUNK_SIZE);
                const transferId = crypto.randomUUID();
                
                for (let i = 0; i < totalChunks; i++) {
                    // --- THIS IS THE FIX (Part 5: Await the backpressure check) ---
                    await waitForBuffer();

                    const start = i * CHUNK_SIZE;
                    const end = Math.min(start + CHUNK_SIZE, zipData.length);
                    const chunk = zipData.slice(start, end);
                    
                    // --- THIS IS THE FIX (Part 6: Send chunk to the specific requester) ---
                    instance.sync.sendSyncMessage({
                        type: 'garden_zip_chunk',
                        gardenName: gardenName,
                        transferId: transferId,
                        chunkIndex: i,
                        totalChunks: totalChunks,
                        data: Buffer.from(chunk).toString('base64'),
                        zipSize: zipData.length
                    }, requesterId);
                    
                    if (i % 20 === 0 || i === totalChunks - 1) {
                        instance.dispatchEvent(new CustomEvent('syncProgress', { 
                            detail: { 
                                message: `Sent chunk ${i + 1} of ${totalChunks} for ${gardenName}...`, 
                                type: 'info' 
                            } 
                        }));
                    }
                }
                
                // --- THIS IS THE FIX (Part 7: Send completion to the specific requester) ---
                instance.sync.sendSyncMessage({
                    type: 'garden_zip_complete',
                    gardenName: gardenName,
                    transferId: transferId
                }, requesterId);
                
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Finished sending ${gardenName}.`, type: 'info' } }));
            }
            
            // --- THIS IS THE FIX (Part 8: Send final completion to the specific requester) ---
            instance.sync.sendSyncMessage({ type: 'full_sync_complete' }, requesterId);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `All gardens sent successfully.`, type: 'complete' } }));
            
        } catch (error) {
            console.error('Error handling garden request:', error);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error: ${error.message}`, type: 'error' } }));
        }
    }

    static async getAllFilesIncludingGit(pfs, dir) {
        let fileList = [];
        try {
            const items = await pfs.readdir(dir);
            for (const item of items) {
                const path = `${dir === '/' ? '' : dir}/${item}`;
                try {
                    const stat = await pfs.stat(path);
                    if (stat.isDirectory()) {
                        fileList = fileList.concat(await this.getAllFilesIncludingGit(pfs, path));
                    } else {
                        fileList.push(path);
                    }
                } catch (e) {
                    debug.warn(`Could not stat ${path}, skipping.`, e);
                }
            }
        } catch (e) {
            debug.log(`Directory not readable: ${dir}`, e);
        }
        return fileList;
    }

    static async handleGardenZipChunk(instance, data) {
        // Initialize transfer tracking if needed
        if (!instance.activeTransfers) {
            instance.activeTransfers = new Map();
        }
        
        const transferKey = `${data.gardenName}-${data.transferId}`;
        
        if (!instance.activeTransfers.has(transferKey)) {
            instance.activeTransfers.set(transferKey, {
                chunks: new Array(data.totalChunks),
                receivedCount: 0,
                totalChunks: data.totalChunks,
                gardenName: data.gardenName,
                zipSize: data.zipSize
            });
            
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { 
                    message: `Receiving ${data.gardenName} (${(data.zipSize / 1024 / 1024).toFixed(2)} MB in ${data.totalChunks} chunks)...`, 
                    type: 'info' 
                } 
            }));
        }
        
        const transfer = instance.activeTransfers.get(transferKey);
        
        // Store the chunk
        transfer.chunks[data.chunkIndex] = Buffer.from(data.data, 'base64');
        transfer.receivedCount++;
        
        // Update progress periodically
        if (transfer.receivedCount % 10 === 0 || transfer.receivedCount === transfer.totalChunks) {
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { 
                    message: `Received ${transfer.receivedCount} of ${transfer.totalChunks} chunks for ${data.gardenName}...`, 
                    type: 'info' 
                } 
            }));
        }
    }

    static async handleGardenZipComplete(instance, data) {
        const transferKey = `${data.gardenName}-${data.transferId}`;
        const transfer = instance.activeTransfers.get(transferKey);
        
        if (!transfer) {
            console.error(`No transfer found for ${transferKey}`);
            return;
        }
        
        if (transfer.receivedCount !== transfer.totalChunks) {
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { 
                    message: `Error: Only received ${transfer.receivedCount} of ${transfer.totalChunks} chunks for ${data.gardenName}`, 
                    type: 'error' 
                } 
            }));
            instance.activeTransfers.delete(transferKey);
            return;
        }
        
        try {
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { 
                    message: `Reassembling and extracting ${data.gardenName}...`, 
                    type: 'info' 
                } 
            }));
            
            // Reassemble the zip file
            const totalLength = transfer.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const zipData = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of transfer.chunks) {
                zipData.set(chunk, offset);
                offset += chunk.length;
            }
            
            // Load and extract the zip
            const zip = await JSZip.loadAsync(zipData);
            const gitClient = new Git(data.gardenName);
            await gitClient.initRepo();
            
            // Clear the garden completely including .git
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { 
                    message: `Clearing existing data for ${data.gardenName}...`, 
                    type: 'info' 
                } 
            }));
            
            // Clear everything including .git
            await gitClient.rmrf('/.git');
            await gitClient.clearWorkdir();
            
            // Extract all files
            const fileEntries = Object.entries(zip.files);
            let extractedCount = 0;
            
            for (const [path, zipEntry] of fileEntries) {
                if (!zipEntry.dir) {
                    const content = await zipEntry.async('uint8array');
                    const fullPath = `/${path}`;
                    
                    // Ensure parent directory exists
                    const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
                    if (dirPath && dirPath !== '/') {
                        await gitClient.ensureDir(dirPath);
                    }
                    
                    await gitClient.pfs.writeFile(fullPath, content);
                    extractedCount++;
                    
                    if (extractedCount % 50 === 0) {
                        instance.dispatchEvent(new CustomEvent('syncProgress', { 
                            detail: { 
                                message: `Extracted ${extractedCount} files for ${data.gardenName}...`, 
                                type: 'info' 
                            } 
                        }));
                    }
                }
            }
            
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { 
                    message: `Successfully received and extracted ${data.gardenName} (${extractedCount} files).`, 
                    type: 'complete' 
                } 
            }));
            
            // Cleanup transfer tracking
            instance.activeTransfers.delete(transferKey);
            
            // Check if this completes all transfers
            if (instance.activeTransfers.size === 0) {
                instance.markSyncStreamAsComplete();
            }
            
        } catch (error) {
            console.error(`Error extracting garden ${data.gardenName}:`, error);
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { 
                    message: `Error extracting ${data.gardenName}: ${error.message}`, 
                    type: 'error' 
                } 
            }));
            instance.activeTransfers.delete(transferKey);
        }
    }
}