const WebSocket = require('ws');
const { processSensorPacket } = require('./iotProcessor');
const simulator = require('./simulator');

class NodeRedWebSocketClient {
  constructor() {
    this.ws = null;
    this.io = null;
    this.url = process.env.NODERED_WS_URL || 'ws://172.20.10.2:1880/ws/sensors';
    this.isConnected = false;
    this.reconnectTimer = null;
    this.reconnectInterval = 3000; // 3 seconds retry
    this.lastPacketTime = null;
    this.lastData = null;
  }

  init(io) {
    this.io = io;
    console.log(`[Node-RED Client] Initializing client bridge to Node-RED WebSocket at: ${this.url}`);
    this.connect();
  }

  connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        this.isConnected = true;
        console.log(`[Node-RED Client] ✓ CONNECTED successfully to Node-RED WebSocket (${this.url})`);
        this.broadcastStatus();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        this.isConnected = false;
        console.warn(`[Node-RED Client] Disconnected from Node-RED (Code: ${code}). Reconnecting in ${this.reconnectInterval / 1000}s...`);
        this.broadcastStatus();
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        this.isConnected = false;
        console.error(`[Node-RED Client] Socket Error: ${err.message}`);
        this.broadcastStatus();
      });
    } catch (err) {
      console.error(`[Node-RED Client] Connection exception: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, this.reconnectInterval);
    }
  }

  broadcastStatus() {
    if (this.io) {
      this.io.emit('NODERED_STATUS', {
        connected: this.isConnected,
        url: this.url,
        lastPacketTime: this.lastPacketTime ? this.lastPacketTime.toISOString() : null,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleMessage(rawMessage) {
    try {
      const text = rawMessage.toString();
      const parsed = JSON.parse(text);

      if (!parsed || typeof parsed !== 'object') {
        console.warn('[Node-RED Client] Invalid JSON payload received:', text);
        return;
      }

      this.lastPacketTime = new Date();

      // Extract esp32_1 and esp32_2
      const esp32_1 = parsed.esp32_1 || {};
      const esp32_2 = parsed.esp32_2 || {};

      const combinedUpdate = {
        esp32_1: {
          temperature: esp32_1.temperature !== undefined && esp32_1.temperature !== null ? parseFloat(esp32_1.temperature) : null,
          humidity: esp32_1.humidity !== undefined && esp32_1.humidity !== null ? parseFloat(esp32_1.humidity) : null,
          distance: esp32_1.distance !== undefined && esp32_1.distance !== null ? parseFloat(esp32_1.distance) : null,
          fsr: esp32_1.fsr !== undefined && esp32_1.fsr !== null ? parseFloat(esp32_1.fsr) : null
        },
        esp32_2: {
          temperature: esp32_2.temperature !== undefined && esp32_2.temperature !== null ? parseFloat(esp32_2.temperature) : null,
          humidity: esp32_2.humidity !== undefined && esp32_2.humidity !== null ? parseFloat(esp32_2.humidity) : null,
          distance: esp32_2.distance !== undefined && esp32_2.distance !== null ? parseFloat(esp32_2.distance) : null,
          fsr: esp32_2.fsr !== undefined && esp32_2.fsr !== null ? parseFloat(esp32_2.fsr) : null
        },
        timestamp: this.lastPacketTime.toISOString(),
        source: 'HARDWARE',
        isLiveHardware: true,
        transport: 'Node-RED WebSocket'
      };

      this.lastData = combinedUpdate;

      // 1. Requirement 2: Broadcast via Socket.IO using event SENSOR_DATA_UPDATE
      if (this.io) {
        this.io.emit('SENSOR_DATA_UPDATE', combinedUpdate);
      }

      // 2. Process Bed 1 (ESP32_1) in backend database & risk engine
      if (esp32_1.temperature !== null || esp32_1.distance !== null || esp32_1.fsr !== null) {
        await processSensorPacket({
          bedNumber: 1,
          deviceId: 'ESP32_DEVICE_1',
          temperature: esp32_1.temperature,
          ultrasonicDistance: esp32_1.distance,
          force: esp32_1.fsr,
          humidity: esp32_1.humidity,
          source: 'HARDWARE',
          timestamp: this.lastPacketTime
        }, this.io, 'Node-RED WS');
      } else {
        // Yield simulator for bed 1 even if all readings are currently idle
        simulator.recordHardwareReading(1, combinedUpdate.esp32_1);
      }

      // 3. Process Bed 2 (ESP32_2) in backend database & risk engine
      if (esp32_2.temperature !== null || esp32_2.distance !== null || esp32_2.fsr !== null) {
        await processSensorPacket({
          bedNumber: 2,
          deviceId: 'ESP32_DEVICE_2',
          temperature: esp32_2.temperature,
          ultrasonicDistance: esp32_2.distance,
          force: esp32_2.fsr,
          humidity: esp32_2.humidity,
          source: 'HARDWARE',
          timestamp: this.lastPacketTime
        }, this.io, 'Node-RED WS');
      } else {
        simulator.recordHardwareReading(2, combinedUpdate.esp32_2);
      }

    } catch (err) {
      console.error('[Node-RED Client] Message handling error:', err.message);
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      url: this.url,
      lastPacketTime: this.lastPacketTime ? this.lastPacketTime.toISOString() : null,
      lastData: this.lastData
    };
  }
}

const nodeRedClient = new NodeRedWebSocketClient();

module.exports = {
  nodeRedClient,
  initNodeRedClient: (io) => nodeRedClient.init(io)
};

