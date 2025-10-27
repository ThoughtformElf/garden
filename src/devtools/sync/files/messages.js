import { FileOperations } from './operations.js';
import { Git } from '../../../util/git-integration.js';
import JSZip from 'jszip';

export class MessageHandler {
    static async handleSyncMessage(instance, data) {
        switch (data.type) {
            case 'send_initiation':
                this.handleSendInitiation(instance, data);
                break;
            case 'sync_cancel':
                this.handleSyncCancel(instance, data);
                break;
            case 'file_update':
                await FileOperations.handleFileUpdate(instance, data);
                break;
            case 'request_gardens':
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
                console.log('Unknown sync message type:', data.type);
        }
    }
    
    static handleSendInitiation(instance, data) {
        if (instance.isSyncCancelled) return;
        instance.currentTransferId = data.transferId;
        instance.dispatchEvent(new CustomEvent('syncProgress', {
            detail: {
                message: `Incoming transfer from peer for gardens: ${data.gardens.join(', ')}.`,
                type: 'info'
            }
        }));
    }

    static handleSyncCancel(instance, data) {
        if (instance.currentTransferId === data.transferId) {
            instance.cancelSync(false); // false = don't broadcast, we just received
        }
    }

    static async handleRequestGardens(instance, gardens = [], requesterId) {
        if (!requesterId) {
            const errorMsg = 'Error: Received garden request without a requesterId. Cannot send response.';
            console.error(errorMsg);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: errorMsg, type: 'error' } }));
            return;
        }

        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Received request for gardens: ${gardens.join(', ')} from ${requesterId.substring(0,8)}...`, type: 'info' } }));
        await this.sendGardens(instance, gardens, [requesterId]);
    }

    static async sendGardens(instance, gardens, targetPeerIds) {
        if (!gardens || gardens.length === 0 || !targetPeerIds || targetPeerIds.length === 0) return;
        
        const transferId = crypto.randomUUID();
        instance.currentTransferId = transferId;
        instance.targetPeers = targetPeerIds;

        // --- IMMEDIATE INITIATION MESSAGE ---
        instance.sync.sendSyncMessage({
            type: 'send_initiation',
            gardens: gardens,
            transferId: transferId,
        });
        
        const CHUNK_SIZE = 64 * 1024;
        const HIGH_WATER_MARK = 10 * 1024 * 1024;

        const waitForBuffer = (dataChannel) => {
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

        try {
            for (const gardenName of gardens) {
                if (instance.isSyncCancelled) throw new Error("Sync cancelled by user.");
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Preparing ${gardenName} for transfer...`, type: 'info' } }));
                
                const zip = new JSZip();
                const tempGitClient = new Git(gardenName);
                const allFiles = await this.getAllFilesIncludingGit(tempGitClient.pfs, '/');
                
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Zipping ${allFiles.length} files from ${gardenName}...`, type: 'info' } }));
                
                for (const filePath of allFiles) {
                    if (instance.isSyncCancelled) throw new Error("Sync cancelled by user.");
                    const content = await tempGitClient.pfs.readFile(filePath);
                    const zipPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
                    zip.file(zipPath, content);
                }
                
                if (instance.isSyncCancelled) throw new Error("Sync cancelled by user.");
                const zipData = await zip.generateAsync({ 
                    type: 'uint8array',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                });
                
                const zipSizeMB = (zipData.length / 1024 / 1024).toFixed(2);
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Zip created for ${gardenName} (${zipSizeMB} MB).`, type: 'info' } }));
                
                const totalChunks = Math.ceil(zipData.length / CHUNK_SIZE);
                
                for (const peerId of targetPeerIds) {
                    if (instance.isSyncCancelled) throw new Error("Sync cancelled by user.");
                    const peerConnection = instance.sync.peerConnections.get(peerId);
                    if (!peerConnection || !peerConnection.dataChannel || peerConnection.dataChannel.readyState !== 'open') {
                         const errorMsg = `Error: Cannot send files to ${peerId.substring(0,8)}... No open data channel.`;
                         console.error(errorMsg);
                         instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: errorMsg, type: 'error' } }));
                         continue;
                    }
                    const dataChannel = peerConnection.dataChannel;

                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Sending ${gardenName} to ${peerId.substring(0,8)}...`, type: 'info' } }));
                    
                    for (let i = 0; i < totalChunks; i++) {
                        if (instance.isSyncCancelled) throw new Error("Sync cancelled by user.");
                        await waitForBuffer(dataChannel);

                        const start = i * CHUNK_SIZE;
                        const end = Math.min(start + CHUNK_SIZE, zipData.length);
                        const chunk = zipData.slice(start, end);
                        
                        instance.sync.sendSyncMessage({
                            type: 'garden_zip_chunk',
                            gardenName: gardenName,
                            transferId: transferId,
                            chunkIndex: i,
                            totalChunks: totalChunks,
                            data: Buffer.from(chunk).toString('base64'),
                            zipSize: zipData.length
                        }, peerId);

                        if ((i + 1) % 10 === 0 || (i + 1) === totalChunks) {
                            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                                detail: { message: `Sent ${i + 1} of ${totalChunks} chunks for ${gardenName} to ${peerId.substring(0,8)}...`, type: 'info' } 
                            }));
                        }
                    }
                    
                    instance.sync.sendSyncMessage({ type: 'garden_zip_complete', gardenName: gardenName, transferId: transferId }, peerId);
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Finished sending ${gardenName} to ${peerId.substring(0,8)}.`, type: 'info' } }));
                }
            }
            
            for (const peerId of targetPeerIds) {
                instance.sync.sendSyncMessage({ type: 'full_sync_complete' }, peerId);
            }
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `All selected gardens sent successfully.`, type: 'complete', action: 'send' } }));
            
        } catch (error) {
            if (error.message.includes("cancelled")) {
                 instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Sync cancelled by user.', type: 'cancelled' } }));
            } else {
                console.error('Error handling garden send/request:', error);
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error: ${error.message}`, type: 'error' } }));
            }
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
                    console.warn(`Could not stat ${path}, skipping.`, e);
                }
            }
        } catch (e) {
            console.log(`Directory not readable: ${dir}`, e);
        }
        return fileList;
    }

    static async handleGardenZipChunk(instance, data) {
        if (instance.isSyncCancelled || instance.currentTransferId !== data.transferId) return;
        
        if (!instance.activeTransfers) instance.activeTransfers = new Map();
        
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
                detail: { message: `Receiving ${data.gardenName} (${(data.zipSize / 1024 / 1024).toFixed(2)} MB)...`, type: 'info' } 
            }));
        }
        
        const transfer = instance.activeTransfers.get(transferKey);
        transfer.chunks[data.chunkIndex] = Buffer.from(data.data, 'base64');
        transfer.receivedCount++;
        
        if (transfer.receivedCount % 10 === 0 || transfer.receivedCount === transfer.totalChunks) {
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { message: `Received ${transfer.receivedCount} of ${transfer.totalChunks} chunks for ${data.gardenName}...`, type: 'info' } 
            }));
        }
    }

    static async handleGardenZipComplete(instance, data) {
        if (instance.isSyncCancelled) return;
        const transferKey = `${data.gardenName}-${data.transferId}`;
        const transfer = instance.activeTransfers.get(transferKey);
        
        if (!transfer) return;
        
        if (transfer.receivedCount !== transfer.totalChunks) {
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { message: `Error: Missing chunks for ${data.gardenName}`, type: 'error' } 
            }));
            instance.activeTransfers.delete(transferKey);
            return;
        }
        
        try {
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Reassembling and extracting ${data.gardenName}...`, type: 'info' } }));
            
            const totalLength = transfer.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const zipData = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of transfer.chunks) {
                zipData.set(chunk, offset);
                offset += chunk.length;
            }
            
            const zip = await JSZip.loadAsync(zipData);
            const gitClient = new Git(data.gardenName);
            await gitClient.initRepo();
            
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Clearing existing data for ${data.gardenName}...`, type: 'info' } }));
            
            await gitClient.rmrf('/.git');
            await gitClient.clearWorkdir();
            
            const fileEntries = Object.entries(zip.files);
            let extractedCount = 0;
            
            for (const [path, zipEntry] of fileEntries) {
                if (!zipEntry.dir) {
                    const content = await zipEntry.async('uint8array');
                    const fullPath = `/${path}`;
                    
                    const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
                    if (dirPath && dirPath !== '/') await gitClient.ensureDir(dirPath);
                    
                    await gitClient.pfs.writeFile(fullPath, content);
                    extractedCount++;
                }
            }
            
            // --- THIS IS THE FIX ---
            // The 'complete' event now includes the name of the garden that was received.
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { 
                    message: `Successfully extracted ${data.gardenName} (${extractedCount} files).`, 
                    type: 'complete',
                    gardenName: data.gardenName // <-- ADDED
                } 
            }));
            
            instance.activeTransfers.delete(transferKey);
            if (instance.activeTransfers.size === 0) {
                instance.markSyncStreamAsComplete();
            }
            
        } catch (error) {
            console.error(`Error extracting garden ${data.gardenName}:`, error);
            instance.dispatchEvent(new CustomEvent('syncProgress', { 
                detail: { message: `Error extracting ${data.gardenName}: ${error.message}`, type: 'error' } 
            }));
            instance.activeTransfers.delete(transferKey);
        }
    }
}