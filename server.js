const WebSocket = require('ws');
const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    let msgObj;
    try {
      msgObj = JSON.parse(message);
    } catch (err) {
      msgObj = { user:'unknown', text: String(message) };
    }

    // Add server timestamp
    msgObj.ts = Date.now();

    // If this is a join event, broadcast as system join
    if (msgObj.type === 'join') {
      const joinMsg = JSON.stringify({ type:'join', user: msgObj.user, ts: msgObj.ts });
      wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(joinMsg));
      return;
    }

    // Broadcast message to all clients
    const out = JSON.stringify(msgObj);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(out);
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

wss.on('listening', () => console.log(`✅ WebSocket server running at ws://localhost:${PORT}`));
wss.on('error', (err) => console.error('WS error', err && err.message));
