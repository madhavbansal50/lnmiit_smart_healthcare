const express = require('express');
const prisma = require('../services/prisma');
const simulator = require('../services/simulator');

const router = express.Router();

const IOT_API_KEY = process.env.IOT_API_KEY || 'lnmiit_nodered_secure_key_2026';

/**
 * Security Middleware for Node-RED / IoT Device Authentication
 * Checks x-api-key header, Authorization header (Bearer or Raw), or apiKey query parameter.
 */
const verifyIoTAuth = (req, res, next) => {
  const headerKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  const queryKey = req.query.apiKey || req.query.api_key;

  let providedKey = headerKey || queryKey;
  if (!providedKey && authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7).trim();
    } else {
      providedKey = authHeader.trim();
    }
  }

  if (!providedKey || providedKey !== IOT_API_KEY) {
    console.warn(`[IoT Ingest] Unauthorized request attempt from IP: ${req.ip}. Invalid or missing API key.`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or missing IoT API Key. Please provide x-api-key header or Authorization: Bearer <key>.'
    });
  }

  next();
};

/**
 * Normalizes payload from various Node-RED / Hardware output formats.
 * Supports:
 *  - Temperature: temperature, temp, tempC, temperatureC, bodyTemp, temp_c
 *  - Ultrasonic Distance: ultrasonicDistance, distance, ultrasonic, dist, proximity, usDistance
 *  - Force: force, forceValue, pressure, weight, fsr, load
 *  - (Optional legacy vitals: heartRate/bpm, spo2/oxygen)
 */
function normalizeSensorPayload(body) {
  const source = body.sensors || body.vitals || body.data || body.payload || body;

  // 1. Temperature (°C)
  let temperature = source.temperature ?? source.temp ?? source.tempC ?? source.temperatureC ?? source.bodyTemp ?? source.temp_c;
  const tempF = source.temperatureF ?? source.temp_f;

  if (temperature === undefined && tempF !== undefined) {
    temperature = (parseFloat(tempF) - 32) * (5 / 9);
  } else if (temperature !== undefined && parseFloat(temperature) > 60) {
    // If temp is above 60, it was sent in Fahrenheit (e.g. 98.6°F)
    temperature = (parseFloat(temperature) - 32) * (5 / 9);
  }

  // 2. Ultrasonic Sensor (Distance in cm)
  let ultrasonicDistance = source.ultrasonicDistance ?? source.distance ?? source.ultrasonic ?? source.dist ?? source.proximity ?? source.usDistance;

  // 3. Force Sensor (N / Newtons or calibrated unit)
  let force = source.force ?? source.forceValue ?? source.pressure ?? source.weight ?? source.fsr ?? source.load;

  // Optional legacy fallbacks
  let heartRate = source.heartRate ?? source.heart_rate ?? source.bpm ?? source.pulse;
  let spo2 = source.spo2 ?? source.spO2 ?? source.oxygen ?? source.bloodOxygen;

  // Bed Number (1 or 2)
  let bedNumber = source.bedNumber ?? source.bed_number ?? source.bed ?? source.bedId ?? 1;

  // Device ID & MAC Address
  let deviceId = source.deviceId ?? source.device_id ?? source.device ?? source.nodeId ?? `RPI_NODERED_BED_${bedNumber}`;
  let macAddress = source.macAddress ?? source.mac_address ?? source.mac ?? 'B8:27:EB:D3:44:A1';

  // Timestamp
  let timestamp = source.timestamp ?? source.time ?? source.ts ?? Date.now();
  if (typeof timestamp === 'number' && timestamp < 1e11) {
    timestamp = timestamp * 1000;
  }

  return {
    temperature: temperature !== undefined && temperature !== null ? parseFloat(parseFloat(temperature).toFixed(2)) : null,
    ultrasonicDistance: ultrasonicDistance !== undefined && ultrasonicDistance !== null ? parseFloat(parseFloat(ultrasonicDistance).toFixed(1)) : null,
    force: force !== undefined && force !== null ? parseFloat(parseFloat(force).toFixed(2)) : null,
    heartRate: heartRate !== undefined && heartRate !== null ? parseFloat(heartRate) : null,
    spo2: spo2 !== undefined && spo2 !== null ? parseFloat(spo2) : null,
    bedNumber: parseInt(bedNumber, 10) || 1,
    deviceId: String(deviceId).trim(),
    macAddress: String(macAddress).trim(),
    timestamp: new Date(timestamp)
  };
}

/**
 * Evaluates hardware telemetry against operational thresholds.
 * Thresholds:
 * - Temperature (°C): Normal (35.5 - 37.5), Warning (37.6 - 38.5), Critical (>38.5 or <35.0)
 * - Ultrasonic Distance (cm): In Bed (15 - 60), Edge / Moving (60 - 90), Out of Bed / Empty (>90), Blocked (<10)
 * - Force (N): Full Contact (>25), Partial Weight (5 - 25), Vacant / No Pressure (<5)
 */
function evaluateHardwareSensors({ temperature, ultrasonicDistance, force }) {
  const triggers = [];
  let riskLevel = 'NORMAL';
  let riskScore = 0;
  let isEmergency = false;

  const sensorStatus = {
    temperature: 'NORMAL',
    ultrasonic: 'NORMAL',
    force: 'NORMAL'
  };

  // 1. Temperature Evaluation (°C)
  if (temperature !== null && !isNaN(temperature)) {
    if (temperature > 38.5) {
      triggers.push(`High Temperature Alert: ${temperature}°C (>38.5°C threshold)`);
      sensorStatus.temperature = 'CRITICAL';
      riskLevel = 'EMERGENCY';
      riskScore = Math.max(riskScore, 85);
      isEmergency = true;
    } else if (temperature > 37.5) {
      triggers.push(`Elevated Temperature: ${temperature}°C (>37.5°C threshold)`);
      sensorStatus.temperature = 'WARNING';
      if (riskLevel !== 'EMERGENCY') riskLevel = 'ATTENTION';
      riskScore = Math.max(riskScore, 50);
    } else if (temperature < 35.0) {
      triggers.push(`Low Temperature Alert: ${temperature}°C (<35.0°C threshold)`);
      sensorStatus.temperature = 'CRITICAL';
      riskLevel = 'EMERGENCY';
      riskScore = Math.max(riskScore, 80);
      isEmergency = true;
    } else if (temperature < 36.0) {
      triggers.push(`Mildly Low Temperature: ${temperature}°C`);
      sensorStatus.temperature = 'WARNING';
      if (riskLevel !== 'EMERGENCY') riskLevel = 'ATTENTION';
      riskScore = Math.max(riskScore, 40);
    }
  }

  // 2. Ultrasonic Sensor (Distance in cm)
  if (ultrasonicDistance !== null && !isNaN(ultrasonicDistance)) {
    if (ultrasonicDistance > 90) {
      triggers.push(`Proximity Alert: Patient Out of Bed or Away (${ultrasonicDistance} cm)`);
      sensorStatus.ultrasonic = 'WARNING';
      if (riskLevel !== 'EMERGENCY') riskLevel = 'ATTENTION';
      riskScore = Math.max(riskScore, 65);
    } else if (ultrasonicDistance < 10) {
      triggers.push(`Sensor Proximity Warning: <10 cm proximity (${ultrasonicDistance} cm)`);
      sensorStatus.ultrasonic = 'WARNING';
      if (riskLevel !== 'EMERGENCY') riskLevel = 'ATTENTION';
      riskScore = Math.max(riskScore, 40);
    } else if (ultrasonicDistance > 60) {
      sensorStatus.ultrasonic = 'MONITOR'; // Edge of bed / sitting up
      riskScore = Math.max(riskScore, 25);
    }
  }

  // 3. Force Sensor (N)
  if (force !== null && !isNaN(force)) {
    if (force < 5) {
      triggers.push(`Force Sensor Alert: Zero/Minimal Pressure detected (${force} N) - Bed Vacant`);
      sensorStatus.force = 'WARNING';
      if (riskLevel !== 'EMERGENCY') riskLevel = 'ATTENTION';
      riskScore = Math.max(riskScore, 60);
    } else if (force > 150) {
      triggers.push(`Force Sensor High Threshold: High Force detected (${force} N)`);
      sensorStatus.force = 'WARNING';
      if (riskLevel !== 'EMERGENCY') riskLevel = 'ATTENTION';
      riskScore = Math.max(riskScore, 50);
    } else if (force < 20) {
      sensorStatus.force = 'MONITOR';
      riskScore = Math.max(riskScore, 30);
    }
  }

  // Correlation: If Ultrasonic indicates > 80cm AND Force < 8N -> Confirmed Out of Bed
  if (ultrasonicDistance > 80 && force !== null && force < 8) {
    triggers.push('Confirmed Bed Vacancy (Distance > 80cm + Force < 8N)');
    if (riskLevel !== 'EMERGENCY') riskLevel = 'ATTENTION';
    riskScore = Math.max(riskScore, 75);
  }

  const riskExplanation = triggers.length > 0 
    ? triggers.join('; ') 
    : 'All hardware sensor readings (Temperature, Ultrasonic Proximity, Force) are within standard operational limits.';

  return {
    riskLevel,
    riskScore,
    riskExplanation,
    isEmergency,
    triggers,
    sensorStatus
  };
}

/**
 * POST /api/iot/vitals
 * Primary endpoint for Node-RED / Raspberry Pi to stream live sensor readings.
 */
router.post('/vitals', verifyIoTAuth, async (req, res) => {
  try {
    const raw = req.body;
    if (!raw || Object.keys(raw).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Empty sensor payload received. JSON body is required.'
      });
    }

    const {
      temperature,
      ultrasonicDistance,
      force,
      heartRate,
      spo2,
      bedNumber,
      deviceId,
      macAddress,
      timestamp
    } = normalizeSensorPayload(raw);

    // Validate sensor values
    const errors = [];
    if (temperature === null && ultrasonicDistance === null && force === null) {
      errors.push('At least one sensor reading is required: temperature (°C), ultrasonicDistance (cm), or force (N)');
    }

    if (temperature !== null && (isNaN(temperature) || temperature < -20 || temperature > 120)) {
      errors.push(`Temperature ${temperature}°C is outside plausible bounds (-20 to 120°C)`);
    }

    if (ultrasonicDistance !== null && (isNaN(ultrasonicDistance) || ultrasonicDistance < 0 || ultrasonicDistance > 500)) {
      errors.push(`Ultrasonic distance ${ultrasonicDistance} cm is outside plausible HC-SR04 bounds (0 to 500 cm)`);
    }

    if (force !== null && (isNaN(force) || force < 0 || force > 1000)) {
      errors.push(`Force reading ${force} is outside valid sensor range (0 to 1000 N)`);
    }

    if (![1, 2].includes(bedNumber)) {
      errors.push(`bedNumber must be 1 or 2 (received: ${bedNumber})`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors
      });
    }

    // 1. Update/Upsert Device in Database
    const deviceRecord = await prisma.device.upsert({
      where: { deviceId },
      update: {
        lastSeen: new Date(),
        status: 'ONLINE',
        isRealHardware: true,
        macAddress: macAddress || undefined,
        bedNumber: bedNumber
      },
      create: {
        deviceId,
        name: `Node-RED / Pi Bed ${bedNumber} Sensor Unit`,
        type: 'EDGE_GATEWAY',
        bedNumber: bedNumber,
        macAddress: macAddress,
        status: 'ONLINE',
        isRealHardware: true,
        firmwareVersion: 'Node-RED-v3.1-RaspberryPi'
      }
    });

    // 2. Check if Bed has an Active Monitoring Session
    const activeSession = await prisma.monitoringSession.findFirst({
      where: { bedNumber, status: 'ACTIVE' },
      include: {
        student: {
          include: {
            user: true,
            healthBaselines: true
          }
        },
        doctor: {
          include: {
            user: true
          }
        }
      }
    });

    // 3. Hardware Sensor Evaluation
    const evaluation = evaluateHardwareSensors({
      temperature: temperature !== null ? temperature : 36.8,
      ultrasonicDistance,
      force
    });

    // 4. Construct Uniform Broadcast Payload
    const broadcastPayload = {
      bedNumber,
      deviceId,
      temperature: temperature !== null ? temperature : 36.8,
      ultrasonicDistance: ultrasonicDistance !== null ? ultrasonicDistance : null,
      force: force !== null ? force : null,
      heartRate: heartRate !== null ? heartRate : null,
      spo2: spo2 !== null ? spo2 : null,
      sensorStatus: evaluation.sensorStatus,
      riskLevel: evaluation.riskLevel,
      riskScore: evaluation.riskScore,
      riskExplanation: evaluation.riskExplanation,
      isEmergency: evaluation.isEmergency,
      triggers: evaluation.triggers,
      source: 'HARDWARE',
      isRealHardware: true,
      timestamp: timestamp.toISOString(),
      activeSession: activeSession
        ? {
            id: activeSession.id,
            studentId: activeSession.studentId,
            studentName: `${activeSession.student.user.firstName} ${activeSession.student.user.lastName}`,
            rollNumber: activeSession.student.rollNumber,
            branch: activeSession.student.branch,
            doctorName: `Dr. ${activeSession.doctor.user.firstName} ${activeSession.doctor.user.lastName}`,
            startTime: activeSession.startTime,
            chiefComplaint: activeSession.chiefComplaint
          }
        : null
    };

    // 5. Save Reading in Database
    try {
      await prisma.vitalsReading.create({
        data: {
          sessionId: activeSession ? activeSession.id : null,
          studentId: activeSession ? activeSession.studentId : null,
          bedNumber: bedNumber,
          deviceId: deviceRecord.id,
          temperature: temperature !== null ? temperature : 36.8,
          ultrasonicDistance: ultrasonicDistance !== null ? ultrasonicDistance : null,
          force: force !== null ? force : null,
          heartRate: heartRate !== null ? heartRate : null,
          spo2: spo2 !== null ? spo2 : null,
          riskLevel: evaluation.riskLevel,
          riskScore: evaluation.riskScore,
          riskExplanation: evaluation.riskExplanation,
          isEmergency: evaluation.isEmergency,
          source: 'HARDWARE',
          timestamp: timestamp
        }
      });

      // If active session, update running metrics
      if (activeSession) {
        const riskWeight = { NORMAL: 1, MONITOR: 2, ATTENTION: 3, EMERGENCY: 4 };
        const currentPeakWeight = riskWeight[activeSession.peakRiskLevel] || 1;
        const newWeight = riskWeight[evaluation.riskLevel] || 1;
        const updatedPeak = newWeight > currentPeakWeight ? evaluation.riskLevel : activeSession.peakRiskLevel;

        await prisma.monitoringSession.update({
          where: { id: activeSession.id },
          data: {
            peakRiskLevel: updatedPeak,
            finalRiskLevel: evaluation.riskLevel
          }
        });
      }
    } catch (dbErr) {
      console.error('[IoT Ingest] DB write warning:', dbErr.message);
    }

    // 6. Signal the Simulator to YIELD to Real Hardware Data
    simulator.recordHardwareReading(bedNumber, broadcastPayload);

    // 7. Real-Time Socket.IO Broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('VITALS_UPDATE', broadcastPayload);
      io.emit('DEVICE_STATUS', {
        deviceId,
        bedNumber,
        status: 'ONLINE',
        isRealHardware: true,
        lastSeen: timestamp.toISOString()
      });

      // Handle Emergency Alert Dispatch
      if (evaluation.isEmergency && activeSession) {
        await simulator.triggerEmergencyAlert(activeSession, broadcastPayload, evaluation);
      }
    }

    console.log(
      `[Node-RED / IoT Ingest] Bed ${bedNumber} [${deviceId}] -> Temp: ${broadcastPayload.temperature}°C | Distance: ${broadcastPayload.ultrasonicDistance ?? 'N/A'} cm | Force: ${broadcastPayload.force ?? 'N/A'} N | Risk: ${evaluation.riskLevel}`
    );

    return res.status(200).json({
      success: true,
      message: 'Live hardware sensor readings processed and broadcasted successfully',
      data: {
        bedNumber,
        deviceId,
        temperature: broadcastPayload.temperature,
        ultrasonicDistance: broadcastPayload.ultrasonicDistance,
        force: broadcastPayload.force,
        source: 'HARDWARE',
        isRealHardware: true,
        riskLevel: evaluation.riskLevel,
        riskScore: evaluation.riskScore,
        sensorStatus: evaluation.sensorStatus,
        isEmergency: evaluation.isEmergency,
        hasActiveSession: !!activeSession,
        timestamp: timestamp.toISOString()
      }
    });
  } catch (err) {
    console.error('[IoT Ingest] Internal server error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

/**
 * POST /api/iot/heartbeat
 * Node-RED / Raspberry Pi heartbeat ping to report device health.
 */
router.post('/heartbeat', verifyIoTAuth, async (req, res) => {
  try {
    const { deviceId, bedNumber, ipAddress, status } = req.body;
    const targetBed = bedNumber ? parseInt(bedNumber, 10) : 1;
    const targetDevice = deviceId || `RPI_NODERED_BED_${targetBed}`;

    await prisma.device.upsert({
      where: { deviceId: targetDevice },
      update: {
        lastSeen: new Date(),
        status: status || 'ONLINE',
        isRealHardware: true,
        ipAddress: ipAddress || req.ip
      },
      create: {
        deviceId: targetDevice,
        name: `Node-RED / Pi Bed ${targetBed}`,
        type: 'EDGE_GATEWAY',
        bedNumber: targetBed,
        status: 'ONLINE',
        isRealHardware: true,
        ipAddress: ipAddress || req.ip
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('DEVICE_STATUS', {
        deviceId: targetDevice,
        bedNumber: targetBed,
        status: 'ONLINE',
        isRealHardware: true,
        lastSeen: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Heartbeat acknowledged',
      device: targetDevice,
      status: 'ONLINE',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/iot/status
 * Telemetry and device overview for Node-RED integration.
 */
router.get('/status', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    const bed1State = simulator.getState(1);
    const bed2State = simulator.getState(2);

    return res.status(200).json({
      success: true,
      serverTime: new Date().toISOString(),
      devices: devices.map((d) => ({
        ...d,
        isOnline: Date.now() - new Date(d.lastSeen).getTime() < 30000
      })),
      telemetry: {
        bed1: bed1State?.lastReading || {
          bedNumber: 1,
          temperature: 36.8,
          ultrasonicDistance: 32.5,
          force: 48.0,
          source: 'DEMO SIMULATION',
          isRealHardware: false
        },
        bed2: bed2State?.lastReading || {
          bedNumber: 2,
          temperature: 36.7,
          ultrasonicDistance: 35.0,
          force: 42.0,
          source: 'DEMO SIMULATION',
          isRealHardware: false
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/iot/sample-payload
 * Returns sample JSON schemas accepted by POST /api/iot/vitals
 */
router.get('/sample-payload', (req, res) => {
  res.json({
    description: 'Hardware sensor payloads accepted by POST /api/iot/vitals',
    supportedSensors: [
      'Temperature Sensor (LM35 / DHT11 / DS18B20 in °C)',
      'Ultrasonic Distance Sensor (HC-SR04 in cm)',
      'Force / Pressure Sensor (FSR in Newtons N)'
    ],
    standardFormat: {
      bedNumber: 1,
      deviceId: 'RPI_NODERED_BED_1',
      temperature: 36.8,
      ultrasonicDistance: 32.4,
      force: 45.2,
      timestamp: Date.now()
    },
    alternativeFormat: {
      bed: 1,
      device_id: 'RPI_NODE_01',
      temp: 37.1,
      distance: 28.5,
      pressure: 50.0
    },
    authentication: {
      header: 'x-api-key: lnmiit_nodered_secure_key_2026',
      orBearer: 'Authorization: Bearer lnmiit_nodered_secure_key_2026',
      orQueryParam: 'http://<IP>:5000/api/iot/vitals?apiKey=lnmiit_nodered_secure_key_2026'
    }
  });
});

module.exports = router;
