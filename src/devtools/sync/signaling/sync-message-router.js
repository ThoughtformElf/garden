// src/devtools/sync/signaling/sync-message-router.js
import debug from '../../../util/debug.js';

export class SyncMessageRouter {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    sendSyncMessage(data, targetPeerId = null) {
        const syncInstance = this.signaling.sync;
        const dataChannel = syncInstance.dataChannel;

        if (dataChannel && dataChannel.readyState === 'open') {
            const message = JSON.stringify(data);
            console.log(`[SYNC-SEND ► P2P] Type: ${data.type}`, data);
            dataChannel.send(message);
        } else {
            this.sendSyncMessageViaSignaling(data, targetPeerId);
        }
    }

    sendSyncMessageViaSignaling(data, targetPeerId) {
        const ws = this.signaling.ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
            const wrapper = {
                type: 'direct_sync_message',
                payload: data
            };

            if (targetPeerId) {
                wrapper.targetPeerId = targetPeerId;
                console.log(`[SYNC-SEND ► WS-TARGET] To: ${targetPeerId.substring(0,8)}... Type: ${data.type}`, data);
            } else {
                console.log(`[SYNC-SEND ► WS-BROADCAST] Type: ${data.type}`, data);
            }
            
            ws.send(JSON.stringify(wrapper));
        } else {
            debug.warn('Signaling WebSocket not open, could not send sync message.');
        }
    }
}