const prisma = require('./prisma');
const simulator = require('./simulator');

/**
 * Normalizes hardware sensor payload.
 * Supports:
 *  - Temperature: temperature, temp, tempC, temperatureC, bodyTemp, temp_c
 *  - Ultrasonic Distance: ultrasonicDistance, distance, ultrasonic, dist, proximity, usDistance
 *  - Force: force, forceValue, pressure, weight, fsr, load
 */
function normalizeSensorPayload(body) {
  const source = body.sensors || body.vitals || body.data || body.payload || body;

  // 1. Temperature (°C)
  let temperature = source.temperature ?? source.temp ?? source.tempC ?? source.temperatureC ?? source.bodyTemp ?? source.temp_c;
  const tempF = source.temperatureF ?? source.temp_f;

  if (temperature === undefined && tempF !== undefined) {
    temperature = (parseFloat(tempF) - 32) * (5 / 9);
  } else if (temperature !== undefined && parseFloat(temperature) > 60) {
    temperature = (parseFloat(temperature) - 32) * (5 / 9);
  }

  // 2. Ultrasonic Sensor (Distance in cm)
  let ultrasonicDistance = source.ultrasonicDistance ?? source.distance ?? source.ultrasonic ?? source.dist ?? source.proximity ?? source.usDistance;

  // 3. Force Sensor (N)
  let force = source.force ?? source.forceValue ?? source.pressure ?? source.weight ?? source.fsr ?? source.load;

  // 4. Humidity (%)
  let humidity = source.humidity ?? source.hum ?? source.relativeHumidity;

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
    humidity: humidity !== undefined && humidity !== null ? parseFloat(parseFloat(humidity).toFixed(1)) : null,
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
    if (temperature > 39.5) {
      triggers.push(`High Temperature Alert: ${temperature}°C (>39.5°C threshold)`);
      sensorStatus.temperature = 'CRITICAL';
      riskLevel = 'ATTENTION';
      riskScore = Math.max(riskScore, 75);
    } else if (temperature > 38.0) {
      triggers.push(`Elevated Temperature: ${temperature}°C (>38.0°C threshold)`);
      sensorStatus.temperature = 'WARNING';
      if (riskLevel !== 'EMERGENCY') riskLevel = 'ATTENTION';
      riskScore = Math.max(riskScore, 45);
    } else {
      sensorStatus.temperature = 'NORMAL';
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
 * Universal Sensor Processor:
 * Processes sensor reading received via WebSocket, Socket.IO, or HTTP POST.
 * 1. Normalizes fields
 * 2. Updates device in MongoDB
 * 3. Associates active session
 * 4. Saves to MongoDB vitalsReading
 * 5. Signals simulator to yield
 * 6. Broadcasts via Socket.IO to React frontend
 */
async function processSensorPacket(rawPayload, io, transportName = 'WebSocket') {
  const {
    temperature,
    ultrasonicDistance,
    force,
    humidity,
    heartRate,
    spo2,
    bedNumber,
    deviceId,
    macAddress,
    timestamp
  } = normalizeSensorPayload(rawPayload);

  // Fallback defaults if values are missing
  const finalTemp = temperature !== null ? temperature : 36.8;
  const finalDistance = ultrasonicDistance !== null ? ultrasonicDistance : null;
  const finalForce = force !== null ? force : null;

  // 1. Update/Upsert Device in MongoDB
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
      name: `Node-RED / Pi Bed ${bedNumber} Unit (${transportName})`,
      type: 'EDGE_GATEWAY',
      bedNumber: bedNumber,
      macAddress: macAddress,
      status: 'ONLINE',
      isRealHardware: true,
      firmwareVersion: `Node-RED-${transportName}`
    }
  });

  // 2. Find Active Session on Bed
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

  // 3. Evaluate Thresholds
  const evaluation = evaluateHardwareSensors({
    temperature: finalTemp,
    ultrasonicDistance: finalDistance,
    force: finalForce
  });

  // 4. Construct Uniform Broadcast Payload
  const broadcastPayload = {
    bedNumber,
    deviceId,
    temperature: finalTemp,
    ultrasonicDistance: finalDistance,
    force: finalForce,
    heartRate: heartRate !== null ? heartRate : null,
    spo2: spo2 !== null ? spo2 : null,
    sensorStatus: evaluation.sensorStatus,
    riskLevel: evaluation.riskLevel,
    riskScore: evaluation.riskScore,
    riskExplanation: evaluation.riskExplanation,
    isEmergency: evaluation.isEmergency,
    triggers: evaluation.triggers,
    source: 'HARDWARE',
    transport: transportName,
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

  // 5. Save to MongoDB
  try {
    await prisma.vitalsReading.create({
      data: {
        sessionId: activeSession ? activeSession.id : null,
        studentId: activeSession ? activeSession.studentId : null,
        bedNumber: bedNumber,
        deviceId: deviceRecord.id,
        temperature: finalTemp,
        ultrasonicDistance: finalDistance,
        force: finalForce,
        heartRate: heartRate,
        spo2: spo2,
        riskLevel: evaluation.riskLevel,
        riskScore: evaluation.riskScore,
        riskExplanation: evaluation.riskExplanation,
        isEmergency: evaluation.isEmergency,
        source: 'HARDWARE',
        timestamp: timestamp
      }
    });

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
    console.error(`[IoT ${transportName}] DB Write Error:`, dbErr.message);
  }

  // 6. Signal Simulator to Yield to Live Hardware
  simulator.recordHardwareReading(bedNumber, broadcastPayload);

  // 7. Emit via Socket.IO to React Frontend
  if (io) {
    io.emit('VITALS_UPDATE', broadcastPayload);
    io.emit('DEVICE_STATUS', {
      deviceId,
      bedNumber,
      status: 'ONLINE',
      isRealHardware: true,
      lastSeen: timestamp.toISOString()
    });

    // Emergency modal triggers disabled per user request to prevent popup spam
  }

  console.log(
    `[Node-RED / ${transportName}] Bed ${bedNumber} [${deviceId}] -> Temp: ${finalTemp}°C | Dist: ${finalDistance ?? 'N/A'} cm | Force: ${finalForce ?? 'N/A'} N | Status: ${evaluation.riskLevel}`
  );

  return broadcastPayload;
}

module.exports = {
  normalizeSensorPayload,
  evaluateHardwareSensors,
  processSensorPacket
};
