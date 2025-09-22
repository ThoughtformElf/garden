// server/index.js
const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const crypto = require('crypto');

// Create an HTTP server
const server = http.createServer((req, res) => {
    // Handle health check endpoint
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', timestamp: Date.now() }));
        return;
    }

    // Default response for other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store active sessions and peers
// sessions Map: sessionId -> { initiator: WebSocket, peers: [WebSocket, ...] }
const sessions = new Map();
// peers Map: peerId (UUID) -> WebSocket
const peers = new Map();

wss.on('connection', (ws, req) => {
    // Assign a unique ID to each peer
    const peerId = crypto.randomUUID();
    ws.peerId = peerId;
    peers.set(peerId, ws);

    console.log(`New connection established: ${peerId}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'create_session':
                    // Generate a short, unique session ID (e.g., 6 characters)
                    let sessionId;
                    let attempts = 0;
                    const maxAttempts = 100;
                    do {
                        sessionId = crypto.randomBytes(3).toString('hex').toUpperCase();
                        attempts++;
                    } while (sessions.has(sessionId) && attempts < maxAttempts);

                    if (attempts >= maxAttempts) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Failed to create a unique session ID. Please try again.' }));
                        return;
                    }

                    // Store session info, associating the initiator
                    sessions.set(sessionId, {
                        initiator: ws,
                        peers: [ws] // Include the initiator in the peers list
                    });
                    ws.sessionId = sessionId; // Associate the WS with the session ID

                    // Send the session ID back to the initiator
                    ws.send(JSON.stringify({ type: 'session_created', sessionId: sessionId }));
                    console.log(`Session created: ${sessionId} by peer ${peerId}`);
                    break;

                case 'join_session':
                    // Validate input
                    if (!data.sessionId) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Missing sessionId in join request.' }));
                        return;
                    }

                    const sessionIdToJoin = data.sessionId;
                    const sessionToJoin = sessions.get(sessionIdToJoin);

                    if (sessionToJoin) {
                        // Add the joining peer to the session
                        sessionToJoin.peers.push(ws);
                        ws.sessionId = sessionIdToJoin; // Associate the WS with the session ID

                        // Notify the initiator that a peer joined
                        if (sessionToJoin.initiator && sessionToJoin.initiator.readyState === WebSocket.OPEN) {
                            sessionToJoin.initiator.send(JSON.stringify({ type: 'peer_joined', peerId: ws.peerId }));
                        }

                        console.log(`Peer ${peerId} joined session ${sessionIdToJoin}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: `Session ${sessionIdToJoin} not found.` }));
                    }
                    break;

                case 'signal':
                    // Forward signaling data to the other peer(s) in the session
                    const sessionForSignal = sessions.get(ws.sessionId);
                    if (sessionForSignal) {
                        // Find the *other* peer(s) (not the sender)
                        // Using filter to get all peers except the sender
                        const targetPeers = sessionForSignal.peers.filter(peer => peer !== ws);

                        targetPeers.forEach(targetPeer => {
                            if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
                                // Wrap the signal data for clarity on the client side
                                targetPeer.send(JSON.stringify({ type: 'signal', data: data.data }));
                            }
                        });

                        // --- DEBUG LOGGING ---
                        console.log("DEBUG SERVER: Signal received from peer", ws.peerId, "in session", ws.sessionId);
                        console.log("DEBUG SERVER: Session object for signal:", sessionForSignal);
                        console.log("DEBUG SERVER: Peers in session for signal:", sessionForSignal.peers.map(p => p.peerId));
                        const targetPeerDebug = sessionForSignal.peers.find(peer => peer !== ws);
                        console.log("DEBUG SERVER: Example Target peer found for signal forwarding:", targetPeerDebug ? targetPeerDebug.peerId : 'NONE');
                        // --- END DEBUG LOGGING ---
                    } else {
                        console.warn(`Signal received from peer ${peerId} not in a session.`);
                    }
                    break;

                default:
                    console.warn(`Unknown message type received from ${peerId}:`, data.type);
            }
        } catch (err) {
            console.error(`Error processing message from peer ${peerId}:`, err);
            ws.send(JSON.stringify({ type: 'error', 'message': 'Invalid message format or processing error.' }));
        }
    });

    ws.on('close', () => {
        console.log(`Connection closed: ${peerId}`);
        // Clean up peer
        peers.delete(peerId);

        // Clean up session if initiator leaves or if it's the last peer
        if (ws.sessionId) {
            const session = sessions.get(ws.sessionId);
            if (session) {
                // Remove the peer from the session's peer list
                const peerIndex = session.peers.indexOf(ws);
                if (peerIndex > -1) {
                    session.peers.splice(peerIndex, 1);
                }

                // If the session initiator leaves, or no peers left, delete the session
                if (session.initiator === ws || session.peers.length === 0) {
                    sessions.delete(ws.sessionId);
                    console.log(`Session ${ws.sessionId} deleted.`);
                } else {
                    // Optionally notify remaining peers if a non-initiator leaves
                    // (This part depends on your desired behavior)
                    session.peers.forEach(peer => {
                         if (peer.readyState === WebSocket.OPEN) {
                             peer.send(JSON.stringify({ type: 'peer_left', peerId: ws.peerId }));
                         }
                    });
                    console.log(`Non-initiator peer ${ws.peerId} left session ${ws.sessionId}.`);
                }
            }
        }
    });

    ws.on('error', (err) => {
        console.error(`WebSocket error for peer ${peerId}:`, err);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});