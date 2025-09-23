// server/index.js
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

/**
 * Gets the real client IP address from a request object.
 * It checks a chain of common headers used by proxies and load balancers,
 * making the IP detection hosting-provider-agnostic.
 * @param {http.IncomingMessage} req The request object.
 * @returns {string} The client's IP address.
 */
function getRealClientIp(req) {
  // 'x-forwarded-for' is the de-facto standard header. It can contain a comma-separated
  // list of IPs, e.g., "client, proxy1, proxy2". The original client is always the first one.
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0].trim();
  }

  // Check other common headers used by various platforms like Fly.io, Cloudflare, etc.
  return req.headers['fly-client-ip'] ||
         req.headers['cf-connecting-ip'] ||
         req.headers['x-real-ip'] ||
         req.headers['true-client-ip'] ||
         req.socket.remoteAddress; // Fallback to the direct connection IP
}

// --- Rate Limiting Configuration ---
const connectionTracker = new Map();
const MAX_CONNECTIONS_PER_MINUTE = 20; // Allow 20 new connections per minute per IP
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

// Periodically clean up old connection timestamps to prevent memory leaks
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
}, RATE_LIMIT_WINDOW_MS * 2); // Cleanup every 2 minutes


// --- HTTP and WebSocket Server Setup ---

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
const sessions = new Map();
const peers = new Map();

wss.on('connection', (ws, req) => {
    // --- Apply Rate Limiting ---
    const ip = getRealClientIp(req);
    const now = Date.now();
    const timestamps = connectionTracker.get(ip) || [];
    const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

    if (recentTimestamps.length >= MAX_CONNECTIONS_PER_MINUTE) {
        console.warn(`Rate limit exceeded for IP: ${ip}. Terminating connection.`);
        ws.terminate(); // Forcefully close the connection
        return; // Stop processing this connection
    }

    // Record the new connection attempt
    recentTimestamps.push(now);
    connectionTracker.set(ip, recentTimestamps);


    // --- Connection Handling ---

    const peerId = crypto.randomUUID();
    ws.peerId = peerId;
    peers.set(peerId, ws);

    console.log(`New connection established from ${ip}: ${peerId}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'create_session':
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

                    sessions.set(sessionId, { initiator: ws, peers: [ws] });
                    ws.sessionId = sessionId;
                    ws.send(JSON.stringify({ type: 'session_created', sessionId: sessionId }));
                    console.log(`Session created: ${sessionId} by peer ${peerId}`);
                    break;

                case 'join_session':
                    if (!data.sessionId) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Missing sessionId in join request.' }));
                        return;
                    }

                    const sessionIdToJoin = data.sessionId;
                    const sessionToJoin = sessions.get(sessionIdToJoin);

                    if (sessionToJoin) {
                        sessionToJoin.peers.push(ws);
                        ws.sessionId = sessionIdToJoin;
                        if (sessionToJoin.initiator && sessionToJoin.initiator.readyState === WebSocket.OPEN) {
                            sessionToJoin.initiator.send(JSON.stringify({ type: 'peer_joined', peerId: ws.peerId }));
                        }
                        console.log(`Peer ${peerId} joined session ${sessionIdToJoin}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: `Session ${sessionIdToJoin} not found.` }));
                    }
                    break;

                case 'signal':
                    const sessionForSignal = sessions.get(ws.sessionId);
                    if (sessionForSignal) {
                        const targetPeers = sessionForSignal.peers.filter(peer => peer !== ws);
                        targetPeers.forEach(targetPeer => {
                            if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
                                targetPeer.send(JSON.stringify({ type: 'signal', data: data.data }));
                            }
                        });
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
        peers.delete(peerId);

        if (ws.sessionId) {
            const session = sessions.get(ws.sessionId);
            if (session) {
                const peerIndex = session.peers.indexOf(ws);
                if (peerIndex > -1) {
                    session.peers.splice(peerIndex, 1);
                }

                if (session.initiator === ws || session.peers.length === 0) {
                    sessions.delete(ws.sessionId);
                    console.log(`Session ${ws.sessionId} deleted.`);
                } else {
                    session.peers.forEach(peer => {
                         if (peer.readyState === WebSocket.OPEN) {
                             peer.send(JSON.stringify({ type: 'peer_left', peerId: ws.peerId }));
                         }
                    });
                    console.log(`Peer ${ws.peerId} left session ${ws.sessionId}.`);
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