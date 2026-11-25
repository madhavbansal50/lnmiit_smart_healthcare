const WebSocket = require('../backend/node_modules/ws');

const url = 'ws://172.20.10.2:1880/ws/sensors';
console.log(`[Probe] Connecting to Node-RED WebSocket at ${url}...`);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('[Probe] ✓ CONNECTED to ws://172.20.10.2:1880/ws/sensors successfully!');
});

ws.on('message', (data) => {
  console.log('[Probe] ✓ RECEIVED SENSOR DATA FRAME:');
  console.log(data.toString());
  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 1000);
});

ws.on('error', (err) => {
  console.error('[Probe] Error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('[Probe] Waiting for next sensor tick (10s timeout)...');
}, 3000);
