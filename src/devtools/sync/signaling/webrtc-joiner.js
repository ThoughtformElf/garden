// src/devtools/sync/signaling/webrtc-joiner.js
import debug from '../../../util/debug.js';

export class WebRtcJoiner {
    constructor(signalingInstance) {
        this.signaling = signalingInstance;
    }

    async joinSession(syncName) {
        const syncInstance = this.signaling.sync;
        try {
            syncInstance.isInitiator = false;
            syncInstance.syncName = syncName;

            if (this.signaling.ws && this.signaling.ws.readyState === WebSocket.OPEN) {
                 console.log(`[SYNC-JOINER] Step 4: Sending 'join_session' message to server for session '${syncName}'.`);
                 this.signaling.ws.send(JSON.stringify({
                    type: 'join_session',
                    sessionId: syncName
                 }));
            } else {
                 console.error("[SYNC-JOINER-ERROR] Cannot join session, WebSocket is not connected.");
                 syncInstance.updateConnectionState('error', 'Error: WebSocket not connected.');
                 return;
            }

            syncInstance.peerConnection = new RTCPeerConnection({
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            syncInstance.peerConnection.onconnectionstatechange = () => {
                debug.log("P2P Connection state:", syncInstance.peerConnection.connectionState);
                 if (syncInstance.peerConnection.connectionState === 'failed') {
                    syncInstance.updateConnectionState('connected-signal', 'P2P connection failed. Using fallback.');
                }
            };

            syncInstance.peerConnection.ondatachannel = (event) => {
                debug.log("Data channel received");
                syncInstance.dataChannel = event.channel;

                syncInstance.dataChannel.onopen = () => {
                    syncInstance.updateConnectionState('connected-p2p', 'P2P connection established.');
                    if (syncInstance.fileSync) {
                        syncInstance.fileSync.setupDataChannel(syncInstance.dataChannel);
                    }
                };
                
                syncInstance.dataChannel.onclose = () => {
                    if (syncInstance.connectionState === 'connected-p2p') {
                        syncInstance.updateConnectionState('connected-signal', 'P2P channel closed. Using fallback.');
                    }
                };
                
                syncInstance.dataChannel.onerror = (error) => {
                    debug.error("Data channel error:", error);
                    syncInstance.addMessage(`Data channel error: ${error.message}`);
                    syncInstance.updateConnectionState('connected-signal', 'P2P channel error. Using fallback.');
                };
            };

            syncInstance.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.signaling.sendSignal({ type: 'candidate', candidate: event.candidate });
                }
            };

            syncInstance.updateConnectionState('connected-signal', 'Joining session, waiting for offer...');

        } catch (error) {
            debug.error('Error joining session:', error);
            syncInstance.updateConnectionState('error', `Error joining session: ${error.message}`);
        }
    }
}