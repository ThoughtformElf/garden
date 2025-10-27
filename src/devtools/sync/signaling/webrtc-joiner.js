export class WebRtcJoiner {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    async joinSession(syncName, hostPeerId) {
        const syncInstance = this.signaling.sync;
        try {
            syncInstance.isInitiator = false;
            syncInstance.syncName = syncName;

            // This is primarily for re-joining after a host change.
            if (hostPeerId) {
                syncInstance.hostPeerId = hostPeerId;
            }

            if (this.signaling.ws && this.signaling.ws.readyState === WebSocket.OPEN) {
                 this.signaling.ws.send(JSON.stringify({
                    type: 'join_session',
                    sessionId: syncName
                 }));
            } else {
                 console.error("[SYNC-JOINER-ERROR] Cannot join session, WebSocket is not connected.");
                 syncInstance.updateConnectionState('error', 'Error: WebSocket not connected.');
                 return;
            }

            // A joiner now simply waits for an 'offer' signal from the host.
            // All PeerConnection and DataChannel setup is handled dynamically in the
            // main `handleSignal` function when the offer arrives.
            syncInstance.updateConnectionState('connected-signal', 'Joined session. Waiting for host offer...');

        } catch (error) {
            console.error('Error joining session:', error);
            syncInstance.updateConnectionState('error', `Error joining session: ${error.message}`);
        }
    }
}