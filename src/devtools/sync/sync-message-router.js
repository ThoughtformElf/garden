// PATH: src/devtools/sync/sync-message-router.js

const MESSAGE_CACHE_MAX_SIZE = 500;

export class SyncMessageRouter {
    constructor(syncInstance) {
        this.sync = syncInstance;
        this.seenMessages = new Set();
    }

    handleIncomingMessage(data, transport) {
        console.log(`[SyncRouter/handleIncoming] Received message via ${transport}. ID: ${data.messageId}, Type: ${data.payload.type}`);

        if (!data.payload || !data.messageId) {
            console.warn("[SyncRouter/handleIncoming] Received a message without a payload or messageId, cannot process.", data);
            return;
        }
        
        if (this.seenMessages.has(data.messageId)) {
            console.log(`[SyncRouter/handleIncoming] Ignoring already seen message ID: ${data.messageId}`);
            return;
        }
        this.seenMessages.add(data.messageId);
        if (this.seenMessages.size > MESSAGE_CACHE_MAX_SIZE) {
            const oldestMessage = this.seenMessages.values().next().value;
            this.seenMessages.delete(oldestMessage);
        }
        
        if (data.useGossip) {
            console.log(`[SyncRouter/handleIncoming] Gossiping message ID ${data.messageId} to other peers.`);
            // THIS IS THE FIX: Forward the message with its ORIGINAL ID to prevent loops.
            this.sendSyncMessage(data.payload, null, data.messageId, true);
        }

        const payload = data.payload;
        if (data.fromPeerId) {
            payload.fromPeerId = data.fromPeerId;
        }

        if (payload.type && payload.type.startsWith('MSG_LIVESYNC_')) {
            this.sync.liveSync.handleMessage(payload);
        } else if (payload.type === 'peer_introduction') {
            this.sync.handlePeerIntroduction(payload);
        } else {
            this.sync.fileSync.handleSyncMessage(payload);
        }
    }

    sendSyncMessage(payload, targetPeerId = null, messageId = null, useGossip = false) {
        // THIS IS THE FIX: Use the passed-in messageId if it exists (for forwarding).
        const id = messageId || crypto.randomUUID();
        
        const wrapper = { 
            messageId: id, 
            payload: payload,
            useGossip: useGossip,
            fromPeerId: this.sync.getPeerId(),
        };
        const message = JSON.stringify(wrapper);
        
        this.seenMessages.add(id);

        if (targetPeerId) {
            const pc = this.sync.peerConnections.get(targetPeerId);
            if (pc && pc.dataChannel && pc.dataChannel.readyState === 'open') {
                console.log(`[SyncRouter/sendSyncMessage] Sending DIRECT message ${id} to ${targetPeerId.substring(0,4)}`);
                try { pc.dataChannel.send(message); } catch (e) { console.error(`[SyncRouter/sendSyncMessage] Error sending direct message:`, e); }
            } else {
                console.warn(`[SyncRouter/sendSyncMessage] Cannot send direct message to ${targetPeerId.substring(0,4)}: no open data channel.`);
            }
        } else {
            console.log(`[SyncRouter/sendSyncMessage] Broadcasting message ${id} to all ${this.sync.peerConnections.size} peers.`);
            this.sync.peerConnections.forEach((pc, peerId) => {
                if (pc.dataChannel && pc.dataChannel.readyState === 'open') {
                    try { pc.dataChannel.send(message); } catch (e) { console.error(`[SyncRouter/sendSyncMessage] Error broadcasting message to ${peerId.substring(0,8)}...:`, e); }
                }
            });
        }
    }

    destroy() {
        this.seenMessages.clear();
    }
}