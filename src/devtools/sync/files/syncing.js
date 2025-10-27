import { Modal } from '../../../util/modal.js';
import { FileOperations } from './operations.js';
import { MessageHandler } from './messages.js';

export class SyncActions {
    /**
     * Initiates sending selected gardens to selected peers.
     * @param {SyncFiles} instance The SyncFiles instance.
     * @param {object} selection - The selection from the modal, e.g., { gardens: ['gardenA'], peers: ['peerId1'] }
     */
    static async sendGardensToPeers(instance, selection) {
        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Initiating send process...', type: 'info' } }));
        await MessageHandler.sendGardens(instance, selection.gardens, selection.peers);
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