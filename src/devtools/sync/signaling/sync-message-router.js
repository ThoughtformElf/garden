import debug from '../../../util/debug.js';

const MESSAGE_CACHE_MAX_SIZE = 500; // Store the last 500 message IDs to prevent loops

export class SyncMessageRouter {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
        this.sync = signalingInstance.sync;
        this.seenMessages = new Set();
    }

    handleIncomingMessage(data, transport) {
        if (!data.payload || !data.messageId) {
            debug.warn("Received a message without a payload or messageId, cannot process.", data);
            return;
        }
        
        if (this.seenMessages.has(data.messageId)) {
            return; 
        }
        this.seenMessages.add(data.messageId);
        if (this.seenMessages.size > MESSAGE_CACHE_MAX_SIZE) {
            const oldestMessage = this.seenMessages.values().next().value;
            this.seenMessages.delete(oldestMessage);
        }
        
        // --- THIS IS THE FIX: Only forward if the message is flagged for gossip ---
        if (data.useGossip) {
            this.sendSyncMessage(data.payload, null, data.messageId, true);
        }

        const payload = data.payload;
        // Add fromPeerId if it's not already there for context
        if (data.fromPeerId) {
            payload.fromPeerId = data.fromPeerId;
        }

        switch (payload.type) {
            case 'peer_introduction':
                this.sync.handlePeerIntroduction(payload);
                break;
            // --- THIS IS THE FIX: Route live sync messages to the correct manager ---
            default:
                if (payload.type && payload.type.startsWith('MSG_LIVESYNC_')) {
                    this.sync.liveSync.handleMessage(payload);
                } else {
                    this.sync.fileSync.handleSyncMessage(payload);
                }
                break;
        }
    }

    sendSyncMessage(payload, targetPeerId = null, messageId = null, useGossip = false) {
        const id = messageId || crypto.randomUUID();
        
        const wrapper = { 
            messageId: id, 
            payload: payload,
            useGossip: useGossip, // Pass the flag
            fromPeerId: this.sync.getPeerId(), // Always stamp the origin
        };
        const message = JSON.stringify(wrapper);
        
        this.seenMessages.add(id);

        if (targetPeerId) {
            const pc = this.sync.peerConnections.get(targetPeerId);
            if (pc && pc.dataChannel && pc.dataChannel.readyState === 'open') {
                try { pc.dataChannel.send(message); } catch (e) { console.error(`Error sending direct message to ${targetPeerId.substring(0,8)}...:`, e); }
            }
        } else {
            this.sync.peerConnections.forEach((pc, peerId) => {
                if (pc.dataChannel && pc.dataChannel.readyState === 'open') {
                    try { pc.dataChannel.send(message); } catch (e) { console.error(`Error gossiping message to ${peerId.substring(0,8)}...:`, e); }
                }
            });
        }
    }

    destroy() {
        this.seenMessages.clear();
    }
}