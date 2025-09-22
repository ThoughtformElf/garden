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
const sessions = new Map(); // sessionId -> { initiator, peers: [WebSocket] }

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  // Extract session ID from URL query parameters (if joining)
  const queryParams = url.parse(req.url, true).query;
  const joinSessionId = queryParams.sessionId;
  
  // Assign a temporary ID to the peer until they create/join a session
  const peerId = crypto.randomBytes(16).toString('hex');
  ws.peerId = peerId;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'create_session':
          // Generate a random 6-character session ID
          const sessionId = crypto.randomBytes(3).toString('hex').toUpperCase();
          
          // Store session info
          sessions.set(sessionId, {
            initiator: ws,
            peers: [ws]
          });
          
          ws.sessionId = sessionId;
          
          // Send session created confirmation to initiator
          ws.send(JSON.stringify({
            type: 'session_created',
            sessionId: sessionId
          }));
          
          console.log(`Session ${sessionId} created by peer ${peerId}`);
          break;
          
        case 'join_session':
          const sessionIdToJoin = data.sessionId;
          
          if (!sessionIdToJoin) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Session ID is required to join'
            }));
            return;
          }
          
          const session = sessions.get(sessionIdToJoin);
          
          if (!session) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Session not found'
            }));
            return;
          }
          
          // Add peer to session
          session.peers.push(ws);
          ws.sessionId = sessionIdToJoin;
          
          // Notify initiator that peer joined
          if (session.initiator && session.initiator.readyState === WebSocket.OPEN) {
            session.initiator.send(JSON.stringify({
              type: 'peer_joined',
              peerId: ws.peerId // Send the joining peer's ID
            }));
          }
          
          console.log(`Peer ${peerId} joined session ${sessionIdToJoin}`);
          break;
          
        case 'signal':
          // Forward signaling data to the other peer in the session
          const sessionForSignal = sessions.get(ws.sessionId);
          
          if (sessionForSignal) {
            // Find the *other* peer (not the sender)
            const targetPeer = sessionForSignal.peers.find(peer => peer !== ws);
            
            if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
              targetPeer.send(JSON.stringify({
                type: 'signal',
                data: data.data
              }));
            }
          }
          break;

        // --- NEW: Handle direct sync messages ---
        case 'direct_sync_message':
          console.log(`Received direct_sync_message from peer ${peerId}`);
          const sessionForSync = sessions.get(ws.sessionId);
          
          if (sessionForSync) {
            if (data.targetPeerId) {
              // Send to specific target peer
              const targetPeer = sessionForSync.peers.find(peer => peer.peerId === data.targetPeerId);
              if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
                targetPeer.send(JSON.stringify({
                  type: 'direct_sync_message',
                  message: data.message
                }));
                console.log(`Forwarded direct_sync_message to specific peer ${data.targetPeerId}`);
              } else {
                console.warn(`Target peer ${data.targetPeerId} not found or not open for direct_sync_message`);
              }
            } else {
              // Broadcast to all other peers in the session
              sessionForSync.peers.forEach(peer => {
                if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                  peer.send(JSON.stringify({
                    type: 'direct_sync_message',
                    message: data.message
                  }));
                  console.log(`Broadcast direct_sync_message to peer ${peer.peerId}`);
                }
              });
            }
          } else {
            console.warn(`No session found for peer ${peerId} sending direct_sync_message`);
          }
          break;
        // --- END NEW ---
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`WebSocket connection closed for peer ${peerId}`);
    
    // Remove peer from session
    if (ws.sessionId) {
      const session = sessions.get(ws.sessionId);
      
      if (session) {
        // Remove peer from peers array
        session.peers = session.peers.filter(peer => peer !== ws);
        
        // Notify other peer if session initiator left
        if (session.initiator === ws) {
          session.peers.forEach(peer => {
            if (peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'peer_left'
              }));
            }
          });
          
          // Delete session if initiator leaves
          sessions.delete(ws.sessionId);
          console.log(`Session ${ws.sessionId} deleted because initiator left`);
        } else {
          // Notify initiator that peer left
          if (session.initiator && session.initiator.readyState === WebSocket.OPEN) {
            session.initiator.send(JSON.stringify({
              type: 'peer_left'
            }));
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});