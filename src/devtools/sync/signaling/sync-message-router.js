// src/devtools/sync/signaling/sync-message-router.js
import debug from '../../../util/debug.js';

export class SyncMessageRouter {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    sendSyncMessage(data) {
        const syncInstance = this.signaling.sync;
        const dataChannel = syncInstance.dataChannel;

        if (dataChannel && dataChannel.readyState === 'open') {
            debug.log("Sent sync message via data channel");
            dataChannel.send(JSON.stringify(data));
        } else {
            debug.log("Data channel not open, falling back to signaling for sync message");
            this.sendSyncMessageViaSignaling(data);
        }
    }

    sendSyncMessageViaSignaling(data) {
        const ws = this.signaling.ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
            debug.log("Sent sync message via signaling (broadcast)");
            ws.send(JSON.stringify({
                type: 'direct_sync_message',
                message: data
            }));
        } else {
            debug.warn('Signaling WebSocket not open, could not send sync message.');
            if (this.signaling.sync) {
                 this.signaling.sync.addMessage('Error: Not connected to signaling server for message send.');
            }
        }
    }
}