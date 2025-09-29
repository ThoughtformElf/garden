// src/devtools/sync/signaling/sync-message-router.js
import debug from '../../../util/debug.js';

const MESSAGE_CACHE_MAX_SIZE = 500; // Store the last 500 message IDs to prevent loops

export class SyncMessageRouter {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
        this.sync = signalingInstance.sync;
        this.seenMessages = new Set();
    }

    /**
     * Handles an incoming message from any transport (P2P or WebSocket).
     * This is the core of the gossip protocol.
     */
    handleIncomingMessage(data, transport) {
        // All gossiped messages must have a payload and a messageId
        if (!data.payload || !data.messageId) {
            debug.warn("Received a message without a payload or messageId, cannot process.", data);
            return;
        }
        
        // --- Loop Prevention ---
        if (this.seenMessages.has(data.messageId)) {
            return; // We have already processed and gossiped this message.
        }
        this.seenMessages.add(data.messageId);
        // Prune the cache to prevent memory leaks over long sessions
        if (this.seenMessages.size > MESSAGE_CACHE_MAX_SIZE) {
            const oldestMessage = this.seenMessages.values().next().value;
            this.seenMessages.delete(oldestMessage);
        }
        
        console.log(`[SYNC-GOSSIP-RECV ◄ ${transport}] Mid: ${data.messageId.substring(0,4)}... Type: ${data.payload.type}`);
        
        // --- Forward the message to all other peers (GOSSIP) ---
        this.sendSyncMessage(data.payload, null, data.messageId);

        // --- Process the message locally ---
        const payload = data.payload;
        switch (payload.type) {
            case 'peer_introduction':
                this.sync.handlePeerIntroduction(payload);
                break;
            default: // Assumed to be a file sync message
                if (this.sync.fileSync) {
                    this.sync.fileSync.handleSyncMessage(payload);
                }
                break;
        }
    }

    /**
     * Sends a message to the swarm.
     * @param {object} payload - The actual data to send (e.g., file_update).
     * @param {string|null} targetPeerId - If specified, sends only to this peer. Otherwise, broadcasts.
     * @param {string|null} messageId - If provided, re-uses an existing ID for forwarding. If null, creates a new one.
     */
    sendSyncMessage(payload, targetPeerId = null, messageId = null) {
        const id = messageId || crypto.randomUUID();
        const wrapper = { messageId: id, payload: payload };
        const message = JSON.stringify(wrapper);
        
        // Add to seen cache immediately to prevent receiving our own gossip.
        this.seenMessages.add(id);

        if (targetPeerId) {
            // Direct message to a single peer
            const pc = this.sync.peerConnections.get(targetPeerId);
            if (pc && pc.dataChannel && pc.dataChannel.readyState === 'open') {
                console.log(`[SYNC-GOSSIP-SEND ► P2P-TARGET] To: ${targetPeerId.substring(0,8)}... Mid: ${id.substring(0,4)}...`);
                pc.dataChannel.send(message);
            }
        } else {
            // Broadcast to all connected peers
            console.log(`[SYNC-GOSSIP-SEND ► P2P-BROADCAST] To: ${this.sync.peerConnections.size} peers. Mid: ${id.substring(0,4)}...`);
            this.sync.peerConnections.forEach((pc) => {
                if (pc.dataChannel && pc.dataChannel.readyState === 'open') {
                    pc.dataChannel.send(message);
                }
            });
        }
    }

    destroy() {
        this.seenMessages.clear();
    }
}