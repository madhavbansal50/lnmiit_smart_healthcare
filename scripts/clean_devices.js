const mongo = require('../backend/src/services/mongoService');

async function cleanDevices() {
  const db = await mongo.getNativeDb();
  const col = db.collection('device');

  // Remove all test / duplicate devices
  await col.deleteMany({});

  const now = new Date();
  const cleanDevicesList = [
    {
      id: 'dev_esp32_bed_1',
      deviceId: 'ESP32_DEVICE_1',
      name: 'Bed 1 ESP32 Sensor Unit',
      type: 'ESP32_SENSOR',
      bedNumber: 1,
      macAddress: '24:6F:28:B4:E1:01',
      ipAddress: '172.20.10.11',
      status: 'OFFLINE',
      isRealHardware: true,
      lastSeen: now,
      firmwareVersion: 'v2.1.0-lnmiit-esp32',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'dev_esp32_bed_2',
      deviceId: 'ESP32_DEVICE_2',
      name: 'Bed 2 ESP32 Sensor Unit',
      type: 'ESP32_SENSOR',
      bedNumber: 2,
      macAddress: '24:6F:28:B4:E1:02',
      ipAddress: '172.20.10.12',
      status: 'OFFLINE',
      isRealHardware: true,
      lastSeen: now,
      firmwareVersion: 'v2.1.0-lnmiit-esp32',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'dev_rpi_gateway',
      deviceId: 'RPI_NODE_RED',
      name: 'Raspberry Pi Node-RED Gateway',
      type: 'EDGE_GATEWAY',
      bedNumber: null,
      macAddress: 'B8:27:EB:4A:88:99',
      ipAddress: '172.20.10.2:1880',
      status: 'OFFLINE',
      isRealHardware: true,
      lastSeen: now,
      firmwareVersion: 'v3.1.9-nodered',
      createdAt: now,
      updatedAt: now
    }
  ];

  await col.insertMany(cleanDevicesList);
  console.log('Cleaned devices collection. Count:', cleanDevicesList.length);
  process.exit(0);
}

cleanDevices().catch(console.error);
