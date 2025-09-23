// src/devtools/sync/signaling/sync-message-router.js
import debug from '../../../util/debug.js';

/**
 * Handles routing of sync messages, preferring WebRTC DataChannel
 * with a fallback to the signaling WebSocket.
 */
export class SyncMessageRouter {
    constructor(signalingInstance) {
        this.signaling = signalingInstance; // Reference to the main SyncSignaling instance
    }

    /**
     * Sends a sync message, preferring the DataChannel if open,
     * otherwise falling back to the signaling WebSocket.
     * @param {Object} data The sync message data to send.
     */
    sendSyncMessage(data) {
        const syncInstance = this.signaling.sync; // Get the main Sync instance
        const dataChannel = syncInstance.dataChannel; // Get data channel reference
        if (dataChannel && dataChannel.readyState === 'open') {
            debug.log("DEBUG: Sent sync message via data channel");
            dataChannel.send(JSON.stringify(data));
            // Sending via data channel confirms it's active, state should already reflect this
            // but let's ensure it's set correctly
            this.signaling._updateCurrentSyncMethodState('webrtc_active');
        } else {
            debug.log("DEBUG: Data channel not open, falling back to signaling for sync message");
            // Delegate to the signaling-specific send method
            this.sendSyncMessageViaSignaling(data);
            // sendSyncMessageViaSignaling will update state to 'websocket' if needed
        }
    }

    /**
     * Sends a sync message specifically via the signaling WebSocket.
     * @param {Object} data The sync message data to send.
     */
    sendSyncMessageViaSignaling(data) {
        const ws = this.signaling.ws; // Get ws reference from main instance
        const targetPeerId = this.signaling.targetPeerId; // Get target peer ID
        if (ws && ws.readyState === WebSocket.OPEN && targetPeerId) {
            debug.log("DEBUG: Sent sync message via signaling to peer", targetPeerId);
            ws.send(JSON.stringify({
                type: 'direct_sync_message',
                targetPeerId: targetPeerId,
                message: data
            }));
            // This confirms WebSocket is usable for sending, but state should already reflect this
            // unless it was 'none' or 'webrtc_inactive'
            if (this.signaling.currentSyncMethod !== 'webrtc_active') {
                this.signaling._updateCurrentSyncMethodState('websocket');
            }
        } else if (ws && ws.readyState === WebSocket.OPEN) {
            debug.log("DEBUG: Sent sync message via signaling (broadcast)");
            ws.send(JSON.stringify({
                type: 'direct_sync_message',
                message: data
            }));
            if (this.signaling.currentSyncMethod !== 'webrtc_active') {
                this.signaling._updateCurrentSyncMethodState('websocket');
            }
        } else {
            debug.warn('Signaling WebSocket not open or target peer unknown, could not send sync message via signaling.');
            if (this.signaling.sync && typeof this.signaling.sync.addMessage === 'function') {
                 this.signaling.sync.addMessage('Error: Not connected to signaling server for message send.');
            }
        }
    }
}