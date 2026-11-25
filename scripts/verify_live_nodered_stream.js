const ioClient = require('../frontend/node_modules/socket.io-client');

const socket = ioClient('http://127.0.0.1:5000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('[Test Client] ✓ Connected to Socket.IO backend on port 5000');
});

socket.on('NODERED_STATUS', (status) => {
  console.log('[Test Client] ✓ NODERED_STATUS event received:');
  console.log('              - Connected: ', status.connected);
  console.log('              - Target URL:', status.url);
  console.log('              - Last Packet:', status.lastPacketTime);
});

socket.on('SENSOR_DATA_UPDATE', (data) => {
  console.log('\n[Test Client] ✓ SENSOR_DATA_UPDATE live frame received from Node-RED bridge:');
  console.log('              - ESP32_1:', JSON.stringify(data.esp32_1));
  console.log('              - ESP32_2:', JSON.stringify(data.esp32_2));
  console.log('              - Timestamp:', data.timestamp);
  console.log('              - Source:   ', data.source);
  console.log('              - Transport:', data.transport);
  console.log('\n[SUCCESS] Live Node-RED -> Backend WebSocket -> Socket.IO -> Frontend is 100% active!');
  socket.disconnect();
  process.exit(0);
});

setTimeout(() => {
  console.error('[Test Client] Timeout waiting for event');
  process.exit(1);
}, 6000);

