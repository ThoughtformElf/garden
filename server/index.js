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

// Store active sessions
const sessions = new Map();

// Generate a random session ID
function generateSessionId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Handle new WebSocket connections
wss.on('connection', (ws, req) => {
  // Parse URL to get session ID from query parameters
  const parsedUrl = url.parse(req.url, true);
  const sessionId = parsedUrl.query.session;
  const peerId = crypto.randomBytes(8).toString('hex'); // Unique ID for this peer
  
  console.log(`New connection: ${peerId} for session: ${sessionId || 'new'}`);
  
  // Store connection info
  ws.peerId = peerId;
  ws.sessionId = sessionId;
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'create_session':
          // Create a new session
          const newSessionId = generateSessionId();
          ws.sessionId = newSessionId;
          
          // Store session info
          sessions.set(newSessionId, {
            id: newSessionId,
            initiator: ws,
            peers: [ws]
          });
          
          // Send session created confirmation
          ws.send(JSON.stringify({
            type: 'session_created',
            sessionId: newSessionId
          }));
          
          console.log(`Session created: ${newSessionId} by ${peerId}`);
          break;
          
        case 'join_session':
          // Join an existing session
          const joinSessionId = data.sessionId;
          const session = sessions.get(joinSessionId);
          
          if (!session) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Session not found'
            }));
            return;
          }
          
          // Add peer to session
          session.peers.push(ws);
          ws.sessionId = joinSessionId;
          
          // Notify initiator that peer has joined
          if (session.initiator && session.initiator.readyState === WebSocket.OPEN) {
            session.initiator.send(JSON.stringify({
              type: 'peer_joined',
              peerId: ws.peerId
            }));
          }
          
          console.log(`Peer ${peerId} joined session: ${joinSessionId}`);
          break;
          
        case 'signal':
          // Forward signaling data to the other peer
          const targetSession = sessions.get(ws.sessionId);
          if (!targetSession) return;
          
          // Find the other peer (not the sender)
          const otherPeer = targetSession.peers.find(peer => 
            peer !== ws && peer.readyState === WebSocket.OPEN
          );
          
          if (otherPeer) {
            otherPeer.send(JSON.stringify({
              type: 'signal',
              peerId: ws.peerId,
              data: data.data
            }));
          }
          break;
          
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });
  
  // Handle connection close
  ws.on('close', () => {
    console.log(`Connection closed: ${peerId}`);
    
    // If this was part of a session, clean up
    if (ws.sessionId) {
      const session = sessions.get(ws.sessionId);
      if (session) {
        // Remove peer from session
        session.peers = session.peers.filter(peer => peer !== ws);
        
        // If no peers left, delete the session
        if (session.peers.length === 0) {
          sessions.delete(ws.sessionId);
          console.log(`Session deleted: ${ws.sessionId}`);
        } else {
          // Notify other peers that this peer left
          session.peers.forEach(peer => {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'peer_left',
                peerId: ws.peerId
              }));
            }
          });
        }
      }
    }
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${peerId}:`, error);
  });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket signaling server running on port ${PORT}`);
});