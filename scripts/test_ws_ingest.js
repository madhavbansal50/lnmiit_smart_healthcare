// Node 22+ has built-in WebSocket, or fallback to backend ws
const WSClient = typeof WebSocket !== 'undefined' ? WebSocket : require('../backend/node_modules/ws');

const ws = new WSClient('ws://127.0.0.1:5000/ws/iot');

ws.onopen = () => {
  console.log('[Test WS] Connected to backend WebSocket server!');
  const payload = {
    bedNumber: 1,
    temperature: 37.2,
    ultrasonicDistance: 28.5,
    force: 52.3,
    deviceId: 'RPI_NODERED_LAPTOP',
    timestamp: Date.now()
  };
  console.log('[Test WS] Sending sensor packet:', JSON.stringify(payload));
  ws.send(JSON.stringify(payload));
};

ws.onmessage = (event) => {
  console.log('[Test WS] Received from server:', event.data);
  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 1000);
};

ws.onerror = (err) => {
  console.error('[Test WS] Error:', err);
  process.exit(1);
};
