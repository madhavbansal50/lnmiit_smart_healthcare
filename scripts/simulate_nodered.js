/**
 * simulate_nodered.js
 * Simulates a continuous live hardware telemetry stream from Node-RED on Raspberry Pi
 * to the LNMIIT Smart Healthcare System backend (POST /api/iot/vitals).
 * 
 * Hardware Sensors Simulated:
 *  1. Temperature Sensor (LM35 / Analog, in °C)
 *  2. Ultrasonic Sensor (HC-SR04 Proximity, in cm)
 *  3. Force / Pressure Sensor (FSR Bed Mat, in N)
 * 
 * Usage:
 *   node scripts/simulate_nodered.js [bedNumber] [intervalMs] [mode]
 * Examples:
 *   node scripts/simulate_nodered.js 1 2000 normal
 *   node scripts/simulate_nodered.js 1 2000 vacant   (Tests Out-of-Bed alert: dist > 90cm, force < 5N)
 *   node scripts/simulate_nodered.js 1 2000 fever    (Tests Temp Critical alert: temp > 38.5°C)
 */

const http = require('http');

const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || 5000;
const API_KEY = process.env.IOT_API_KEY || 'lnmiit_nodered_secure_key_2026';
const BED_NUMBER = parseInt(process.argv[2] || '1', 10);
const INTERVAL_MS = parseInt(process.argv[3] || '2000', 10);
const MODE = (process.argv[4] || 'normal').toLowerCase();

console.log('================================================================');
console.log('  LNMIIT Healthcare: Raspberry Pi / Node-RED Hardware Streamer');
console.log(`  Target Endpoint: http://${BACKEND_HOST}:${BACKEND_PORT}/api/iot/vitals`);
console.log(`  Active Bed:      Bed ${BED_NUMBER}`);
console.log(`  Stream Interval: Every ${INTERVAL_MS} ms`);
console.log(`  Telemetry Mode:  ${MODE.toUpperCase()}`);
console.log(`  API Key:         ${API_KEY.slice(0, 8)}...`);
console.log('  Sensors:         Temperature (°C), Ultrasonic (cm), Force (N)');
console.log('  Press Ctrl+C to terminate the stream');
console.log('================================================================\n');

let packetCounter = 0;

function generateHardwareReading() {
  packetCounter++;
  const jitter = (Math.random() - 0.5);

  let temp, distance, force;

  if (MODE === 'fever') {
    // High temperature alert
    temp = Number((39.2 + jitter * 0.3).toFixed(1));
    distance = Number((34.0 + jitter * 1.5).toFixed(1));
    force = Number((44.0 + jitter * 2.0).toFixed(1));
  } else if (MODE === 'vacant' || MODE === 'outofbed') {
    // Patient has exited bed / zero pressure
    temp = Number((36.5 + jitter * 0.2).toFixed(1));
    distance = Number((98.5 + jitter * 2.0).toFixed(1)); // > 90 cm
    force = Number((1.8 + Math.random() * 1.5).toFixed(1)); // < 5 N
  } else if (MODE === 'edge') {
    // Patient sitting at edge of bed
    temp = Number((37.0 + jitter * 0.2).toFixed(1));
    distance = Number((72.0 + jitter * 3.0).toFixed(1));
    force = Number((16.0 + jitter * 2.5).toFixed(1));
  } else {
    // Normal in-bed stable telemetry
    temp = Number((36.8 + jitter * 0.15).toFixed(1));
    distance = Number((32.5 + Math.sin(Date.now() / 4000) * 1.5 + jitter).toFixed(1));
    force = Number((46.0 + Math.sin(Date.now() / 5000) * 2.0 + jitter).toFixed(1));
  }

  return {
    bedNumber: BED_NUMBER,
    deviceId: `RPI_NODE_RED_BED_${BED_NUMBER}`,
    temperature: temp,
    ultrasonicDistance: distance,
    force: force,
    timestamp: Date.now()
  };
}

function sendPacket() {
  const payload = JSON.stringify(generateHardwareReading());

  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: '/api/iot/vitals',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'x-api-key': API_KEY
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const time = new Date().toLocaleTimeString();
        if (res.statusCode === 200) {
          const d = parsed.data;
          console.log(
            `[${time}] Packet #${packetCounter} ACK | Bed ${BED_NUMBER} -> Temp: ${d.temperature}°C, Distance: ${d.ultrasonicDistance} cm, Force: ${d.force} N | Risk: ${d.riskLevel} (${d.isRealHardware ? 'HARDWARE' : 'SIM'})`
          );
        } else {
          console.error(`[${time}] Packet #${packetCounter} ERROR ${res.statusCode}:`, parsed.message || data);
        }
      } catch (e) {
        console.error(`[${new Date().toLocaleTimeString()}] Non-JSON Response:`, data);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] Connection error:`, err.message);
  });

  req.write(payload);
  req.end();
}

sendPacket();
setInterval(sendPacket, INTERVAL_MS);
