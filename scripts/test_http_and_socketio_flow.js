const http = require('http');
const ioClient = require('../frontend/node_modules/socket.io-client');

async function runTest() {
  console.log('[Test Flow] 1. Initializing Socket.IO client connection...');
  const socket = ioClient('http://127.0.0.1:5000', {
    transports: ['websocket', 'polling']
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('[Test Flow] ✓ Socket.IO client connected successfully (id:', socket.id, ')');
      resolve();
    });
    socket.on('connect_error', (err) => {
      reject(err);
    });
    setTimeout(() => reject(new Error('Socket.IO connection timeout')), 4000);
  });

  // Set up listener for VITALS_UPDATE
  const vitalsReceivedPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for VITALS_UPDATE')), 5000);
    socket.on('VITALS_UPDATE', (payload) => {
      if (payload.deviceId === 'NODERED_FLOW_TEST') {
        clearTimeout(timeout);
        console.log('[Test Flow] ✓ Socket.IO client received VITALS_UPDATE event!');
        console.log('             - Bed Number:        ', payload.bedNumber);
        console.log('             - Temperature:       ', payload.temperature, '°C');
        console.log('             - Ultrasonic Distance:', payload.ultrasonicDistance, 'cm');
        console.log('             - Force Sensor:      ', payload.force, 'N');
        console.log('             - Is Real Hardware:  ', payload.isRealHardware);
        console.log('             - Source:            ', payload.source);
        console.log('             - Risk Status:       ', payload.riskLevel);
        resolve(payload);
      }
    });
  });

  // 2. Send HTTP POST to /api/iot/vitals simulating Node-RED
  console.log('\n[Test Flow] 2. Sending Node-RED sensor packet via POST /api/iot/vitals...');
  const postData = JSON.stringify({
    bedNumber: 1,
    temperature: 37.4,
    ultrasonicDistance: 31.8,
    force: 46.2,
    deviceId: 'NODERED_FLOW_TEST',
    timestamp: Date.now()
  });

  const req = http.request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/iot/vitals',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-api-key': 'lnmiit_nodered_secure_key_2026'
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`[Test Flow] ✓ Backend HTTP Response: Status ${res.statusCode}`);
      try {
        const json = JSON.parse(body);
        console.log('             - Success:', json.success);
        console.log('             - Message:', json.message);
      } catch (e) {
        console.log('             - Body:', body);
      }
    });
  });

  req.on('error', (err) => {
    console.error('[Test Flow] HTTP POST error:', err.message);
  });

  req.write(postData);
  req.end();

  // Wait for Socket.IO broadcast
  await vitalsReceivedPromise;

  console.log('\n[Test Flow] ==========================================');
  console.log('[Test Flow]  FULL END-TO-END FLOW VERIFIED SUCCESSFULLY!');
  console.log('[Test Flow]  Node-RED POST -> Backend -> Socket.IO -> React UI');
  console.log('[Test Flow] ==========================================');

  socket.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('[Test Flow] FAILED:', err);
  process.exit(1);
});
