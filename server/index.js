// server/index.js
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

// --- Constants ---
const MAX_PEERS_TO_INTRODUCE = 10;

function getRealClientIp(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0].trim();
  }
  return req.headers['fly-client-ip'] || req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.headers['true-client-ip'] || req.socket.remoteAddress;
}

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
const sessions = new Map(); // Maps sessionId to a Set of peer WebSockets

function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    const ip = getRealClientIp(req);
    const peerId = crypto.randomUUID();
    ws.peerId = peerId;
    
    console.log(`New connection established from ${ip}: ${peerId}`);
    ws.send(JSON.stringify({ type: 'welcome', peerId: peerId }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const sessionId = data.sessionId ? String(data.sessionId).toUpperCase() : ws.sessionId;
            if (!sessionId) return;

            switch (data.type) {
                case 'join_session':
                    console.log(`Received 'join_session' from ${peerId} for session ${sessionId}`);
                    if (!sessions.has(sessionId)) {
                        sessions.set(sessionId, new Set());
                    }
                    const peerSet = sessions.get(sessionId);

                    // --- THIS IS THE FIX (Part 1) ---
                    // Add the new peer to the set FIRST.
                    peerSet.add(ws);
                    ws.sessionId = sessionId;
                    
                    // Now, get the list of OTHER peers.
                    const otherPeers = Array.from(peerSet).filter(p => p !== ws);
                    // --- END OF FIX (Part 1) ---
                    
                    // Introduce the new peer to a subset of existing peers.
                    const peersToIntroduce = otherPeers
                        .sort(() => 0.5 - Math.random())
                        .slice(0, MAX_PEERS_TO_INTRODUCE);
                    
                    if (peersToIntroduce.length > 0) {
                        ws.send(JSON.stringify({
                            type: 'peer_list',
                            peers: peersToIntroduce.map(p => p.peerId)
                        }));
                    }
                    
                    // --- THIS IS THE FIX (Part 2) ---
                    // Announce the new peer to EVERYONE who was already there.
                    console.log(`Announcing new peer ${peerId} to ${otherPeers.length} existing peers.`);
                    otherPeers.forEach(peer => {
                        if (peer.readyState === WebSocket.OPEN) {
                            peer.send(JSON.stringify({ type: 'peer_joined', peerId: ws.peerId }));
                        }
                    });
                    // --- END OF FIX (Part 2) ---

                    console.log(`Peer ${peerId} has successfully joined session ${sessionId}. Total peers: ${peerSet.size}`);
                    break;
                
                case 'signal':
                    const recipientSet = sessions.get(sessionId);
                    if (recipientSet && data.target) {
                        const targetPeer = Array.from(recipientSet).find(p => p.peerId === data.target);
                        if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
                            targetPeer.send(JSON.stringify({
                                type: 'signal',
                                from: ws.peerId,
                                data: data.data
                            }));
                        }
                    }
                    break;
            }
        } catch (err) {
            console.error(`Error processing message from peer ${peerId}:`, err);
        }
    });

    ws.on('close', () => {
        console.log(`Connection closed: ${peerId}`);
        if (ws.sessionId) {
            const session = sessions.get(ws.sessionId);
            if (!session) return;
            session.delete(ws);
            if (session.size === 0) {
                sessions.delete(ws.sessionId);
                console.log(`Session ${ws.sessionId} closed.`);
            } else {
                session.forEach(peer => {
                    if (peer.readyState === WebSocket.OPEN) {
                        peer.send(JSON.stringify({ type: 'peer_left', peerId: ws.peerId }));
                    }
                });
            }
        }
    });

    ws.on('error', (err) => console.error(`WebSocket error for peer ${peerId}:`, err));
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));