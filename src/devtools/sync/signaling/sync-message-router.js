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
        // All messages must have a payload and a messageId
        if (!data.payload || !data.messageId) {
            debug.warn("Received a message without a payload or messageId, cannot process.", data);
            return;
        }
        
        // --- Loop Prevention ---
        if (this.seenMessages.has(data.messageId)) {
            return; // We have already processed this message.
        }
        this.seenMessages.add(data.messageId);
        // Prune the cache to prevent memory leaks over long sessions
        if (this.seenMessages.size > MESSAGE_CACHE_MAX_SIZE) {
            const oldestMessage = this.seenMessages.values().next().value;
            this.seenMessages.delete(oldestMessage);
        }
        
        // --- THIS IS THE FIX (Part 1): Check if this message should be gossiped ---
        // If the `noGossip` flag is true, we skip the forwarding block entirely.
        if (!data.noGossip) {
            // --- Forward the message to all other peers (GOSSIP) ---
            this.sendSyncMessage(data.payload, null, data.messageId);
        }

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
        
        // --- THIS IS THE FIX (Part 2): Add the `noGossip` flag for direct messages ---
        const wrapper = { 
            messageId: id, 
            payload: payload,
            noGossip: !!targetPeerId // Set `noGossip: true` if it's a direct message
        };
        const message = JSON.stringify(wrapper);
        
        // Add to seen cache immediately to prevent receiving our own gossip.
        this.seenMessages.add(id);

        if (targetPeerId) {
            // Direct message to a single peer
            const pc = this.sync.peerConnections.get(targetPeerId);
            if (pc && pc.dataChannel && pc.dataChannel.readyState === 'open') {
                try {
                    pc.dataChannel.send(message);
                } catch (error) {
                    console.error(`Error sending direct message to ${targetPeerId.substring(0,8)}...:`, error);
                    // This is where the original 'send queue is full' error could still happen,
                    // but it's now much less likely because the receiver isn't also trying to send.
                }
            }
        } else {
            // Broadcast to all connected peers
            this.sync.peerConnections.forEach((pc, peerId) => {
                if (pc.dataChannel && pc.dataChannel.readyState === 'open') {
                    try {
                        pc.dataChannel.send(message);
                    } catch (error) {
                        console.error(`Error gossiping message to ${peerId.substring(0,8)}...:`, error);
                    }
                }
            });
        }
    }

    destroy() {
        this.seenMessages.clear();
    }
}