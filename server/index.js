// server/index.js
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

function getRealClientIp(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0].trim();
  }
  return req.headers['fly-client-ip'] ||
         req.headers['cf-connecting-ip'] ||
         req.headers['x-real-ip'] ||
         req.headers['true-client-ip'] ||
         req.socket.remoteAddress;
}

const connectionTracker = new Map();
const MAX_CONNECTIONS_PER_MINUTE = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of connectionTracker.entries()) {
        const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
        if (recentTimestamps.length === 0) {
            connectionTracker.delete(ip);
        } else {
            connectionTracker.set(ip, recentTimestamps);
        }
    }
}, RATE_LIMIT_WINDOW_MS * 2);

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', timestamp: Date.now() }));
        return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

const wss = new WebSocket.Server({ server });
const sessions = new Map();
const peers = new Map();

// --- HEARTBEAT MECHANISM (PART 1) ---
// This function will be called periodically to check for dead connections.
function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws, req) => {
    // --- HEARTBEAT MECHANISM (PART 2) ---
    // A client is considered alive when it first connects.
    ws.isAlive = true;
    // The server listens for 'pong' messages, which are the client's response to its 'ping'.
    ws.on('pong', heartbeat);

    const ip = getRealClientIp(req);
    const now = Date.now();
    const timestamps = connectionTracker.get(ip) || [];
    const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

    if (recentTimestamps.length >= MAX_CONNECTIONS_PER_MINUTE) {
        ws.terminate();
        return;
    }
    recentTimestamps.push(now);
    connectionTracker.set(ip, recentTimestamps);

    const peerId = crypto.randomUUID();
    ws.peerId = peerId;
    peers.set(peerId, ws);
    
    ws.send(JSON.stringify({ type: 'welcome', peerId: peerId }));
    console.log(`New connection established from ${ip}: ${peerId}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'create_session':
                    const requestedSessionId = data.sessionId ? String(data.sessionId).toUpperCase() : null;
                    if (!requestedSessionId) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Session ID is required.' }));
                        return;
                    }
                    if (sessions.has(requestedSessionId)) {
                         ws.send(JSON.stringify({ type: 'error', message: `Session '${requestedSessionId}' already exists.` }));
                         return;
                    }
                    sessions.set(requestedSessionId, { initiator: ws, peers: [ws] });
                    ws.sessionId = requestedSessionId;
                    ws.send(JSON.stringify({ type: 'session_created', sessionId: requestedSessionId }));
                    console.log(`Session created: ${requestedSessionId} by peer ${peerId}`);
                    break;
                case 'join_session':
                    if (!data.sessionId) return;
                    const sessionIdToJoin = data.sessionId.toUpperCase();
                    const sessionToJoin = sessions.get(sessionIdToJoin);
                    if (sessionToJoin) {
                        sessionToJoin.peers.push(ws);
                        ws.sessionId = sessionIdToJoin;
                        sessionToJoin.peers.forEach(peer => {
                            if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                                peer.send(JSON.stringify({ type: 'peer_joined', peerId: ws.peerId }));
                            }
                        });
                        console.log(`Peer ${peerId} joined session ${sessionIdToJoin}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: `Session ${sessionIdToJoin} not found.` }));
                    }
                    break;
                case 'signal': // Simplified signal forwarding
                    const sessionForSignal = sessions.get(ws.sessionId);
                    if (sessionForSignal) {
                        sessionForSignal.peers.forEach(peer => {
                            if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                                peer.send(JSON.stringify({ type: 'signal', data: data.data }));
                            }
                        });
                    }
                    break;
                case 'direct_sync_message':
                    const sessionForSync = sessions.get(ws.sessionId);
                    if (sessionForSync) {
                        const targetPeers = data.targetPeerId
                            ? sessionForSync.peers.filter(p => p.peerId === data.targetPeerId)
                            : sessionForSync.peers.filter(peer => peer !== ws);
                        
                        targetPeers.forEach(targetPeer => {
                            if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
                                targetPeer.send(JSON.stringify(data));
                            }
                        });
                    }
                    break;
            }
        } catch (err) {
            console.error(`Error processing message from peer ${peerId}:`, err);
        }
    });

    ws.on('close', () => {
        console.log(`Connection closed: ${peerId}`);
        peers.delete(peerId);

        if (ws.sessionId) {
            const session = sessions.get(ws.sessionId);
            if (!session) return;
            session.peers = session.peers.filter(peer => peer !== ws);
            if (session.peers.length === 0) {
                sessions.delete(ws.sessionId);
            } else if (session.initiator === ws) {
                session.initiator = session.peers[0]; // Elect new initiator
                session.peers.forEach(peer => {
                    peer.send(JSON.stringify({ type: 'host_changed', newInitiatorPeerId: session.initiator.peerId }));
                });
            } else {
                session.peers.forEach(peer => {
                    peer.send(JSON.stringify({ type: 'peer_left', peerId: ws.peerId }));
                });
            }
        }
    });

    ws.on('error', (err) => console.error(`WebSocket error for peer ${peerId}:`, err));
});

// --- HEARTBEAT MECHANISM (PART 3) ---
// Set an interval to run every 30 seconds.
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    // If the client did not respond to the last ping, its connection is terminated.
    if (ws.isAlive === false) return ws.terminate();

    // Reset the status and send a new ping.
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));