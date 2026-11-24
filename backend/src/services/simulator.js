const prisma = require('./prisma');
const { evaluateRisk } = require('./riskEngine');

class SensorSimulator {
  constructor() {
    this.io = null;
    this.intervalId = null;

    // Bed simulation states
    this.beds = {
      1: {
        bedNumber: 1,
        scenario: 'NORMAL', // NORMAL, MONITOR, ATTENTION, EMERGENCY
        baseHr: 76,
        baseSpo2: 98.2,
        baseTemp: 36.8,
        baseDistance: 32.0,
        baseForce: 45.0,
        isHardwareConnected: false,
        lastReading: null,
        lastEmergencyAlertTime: 0
      },
      2: {
        bedNumber: 2,
        scenario: 'NORMAL',
        baseHr: 72,
        baseSpo2: 98.6,
        baseTemp: 36.7,
        baseDistance: 35.0,
        baseForce: 42.0,
        isHardwareConnected: false,
        lastReading: null,
        lastEmergencyAlertTime: 0
      }
    };
  }

  setSocketIO(io) {
    this.io = io;
  }

  start() {
    if (this.intervalId) return;
    console.log('[Simulator] Starting vital sensor simulator loop (2s interval)...');
    this.intervalId = setInterval(() => this.tick(), 2000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Simulator] Stopped vital sensor simulator loop.');
    }
  }

  recordHardwareReading(bedNumber, payload) {
    if (this.beds[bedNumber]) {
      this.beds[bedNumber].isHardwareConnected = true;
      this.beds[bedNumber].lastHardwareTime = Date.now();
      this.beds[bedNumber].lastReading = payload;
    }
  }

  setScenario(bedNumber, scenario) {
    if (!this.beds[bedNumber]) return false;
    const s = scenario.toUpperCase();
    if (!['NORMAL', 'MONITOR', 'ATTENTION', 'EMERGENCY'].includes(s)) return false;

    this.beds[bedNumber].scenario = s;
    this.beds[bedNumber].lastHardwareTime = 0; // manual scenario resets hardware override
    console.log(`[Simulator] Bed ${bedNumber} scenario switched to: ${s}`);
    return true;
  }

  getState(bedNumber) {
    return this.beds[bedNumber] || null;
  }

  async tick() {
    try {
      // Find active sessions for Bed 1 and Bed 2
      const activeSessions = await prisma.monitoringSession.findMany({
        where: { status: 'ACTIVE' },
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

      const activeByBed = {};
      for (const s of activeSessions) {
        activeByBed[s.bedNumber] = s;
      }

      // Generate readings for Bed 1 and Bed 2
      for (const bedNumber of [1, 2]) {
        const bedState = this.beds[bedNumber];
        const activeSession = activeByBed[bedNumber] || null;

        // If real hardware has streamed data within the last 15 seconds, skip simulation for this bed!
        if (bedState.lastHardwareTime && (Date.now() - bedState.lastHardwareTime < 15000)) {
          bedState.isHardwareConnected = true;
          continue; // Yield to live Node-RED hardware data!
        } else {
          bedState.isHardwareConnected = false;
        }

        // Compute simulated hardware sensors based on scenario + small organic jitter
        let hr, spo2, temp, ultrasonicDistance, force;
        const jitter = (Math.random() - 0.5);

        switch (bedState.scenario) {
          case 'EMERGENCY':
            // High pyrexia fever + patient has exited/fallen from bed (ultrasonic > 95cm, force ~ 0N)
            hr = 154 + Math.sin(Date.now() / 3000) * 8 + jitter * 2;
            spo2 = 87.5 + Math.cos(Date.now() / 4000) * 1.5 + jitter * 0.5;
            temp = 39.8 + jitter * 0.3;
            ultrasonicDistance = 98.0 + jitter * 2.0; // Bed vacant / out of bed
            force = Math.max(0, 1.2 + Math.random() * 2); // Zero weight
            break;

          case 'ATTENTION':
            // Mild fever + patient sitting at edge of bed (distance 65-75cm, force 12-18N)
            hr = 118 + Math.sin(Date.now() / 3000) * 6 + jitter * 2;
            spo2 = 92.8 + jitter * 0.8;
            temp = 38.4 + jitter * 0.2;
            ultrasonicDistance = 72.0 + jitter * 3.0; // Near edge of bed
            force = 15.5 + jitter * 3.0; // Partial weight
            break;

          case 'MONITOR':
            // Minor elevation + resting
            hr = 94 + Math.sin(Date.now() / 3000) * 4 + jitter * 1.5;
            spo2 = 95.8 + jitter * 0.5;
            temp = 37.6 + jitter * 0.2;
            ultrasonicDistance = 45.0 + jitter * 2.0;
            force = 38.0 + jitter * 2.0;
            break;

          case 'NORMAL':
          default:
            hr = 74 + Math.sin(Date.now() / 5000) * 3 + jitter * 1.5;
            spo2 = 98.4 + jitter * 0.4;
            temp = 36.8 + jitter * 0.15;
            ultrasonicDistance = 32.5 + Math.sin(Date.now() / 5000) * 1.5 + jitter;
            force = 46.0 + Math.sin(Date.now() / 6000) * 2.0 + jitter;
            break;
        }

        // Clamp to sensible physical bounds
        hr = Math.max(30, Math.min(220, parseFloat(hr.toFixed(1))));
        spo2 = Math.max(70, Math.min(100, parseFloat(spo2.toFixed(1))));
        temp = Math.max(34, Math.min(42, parseFloat(temp.toFixed(2))));
        ultrasonicDistance = Math.max(2, Math.min(250, parseFloat(ultrasonicDistance.toFixed(1))));
        force = Math.max(0, Math.min(200, parseFloat(force.toFixed(1))));

        // Retrieve baseline if student session is active
        const baseline = activeSession?.student?.healthBaselines?.[0] || null;
        const evaluation = evaluateRisk({ heartRate: hr, spo2, temperature: temp }, baseline);

        // Hardware sensor triggers & statuses
        const sensorStatus = {
          temperature: temp > 38.5 ? 'CRITICAL' : temp > 37.5 ? 'WARNING' : 'NORMAL',
          ultrasonic: ultrasonicDistance > 90 ? 'WARNING' : ultrasonicDistance > 60 ? 'MONITOR' : 'NORMAL',
          force: force < 5 ? 'WARNING' : force < 20 ? 'MONITOR' : 'NORMAL'
        };

        const payload = {
          bedNumber,
          temperature: temp,
          ultrasonicDistance,
          force,
          heartRate: hr,
          spo2,
          sensorStatus,
          riskLevel: evaluation.riskLevel,
          riskScore: evaluation.riskScore,
          riskExplanation: evaluation.riskExplanation,
          isEmergency: evaluation.isEmergency,
          triggers: evaluation.triggers,
          scenario: bedState.scenario,
          source: bedState.isHardwareConnected ? 'HARDWARE' : 'DEMO SIMULATION',
          isRealHardware: bedState.isHardwareConnected,
          timestamp: new Date().toISOString(),
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

        bedState.lastReading = payload;

        // If session is active, store in database periodically (every 4 seconds)
        if (activeSession && Math.floor(Date.now() / 1000) % 2 === 0) {
          await this.saveReadingToDB(activeSession, payload, evaluation);
        }

        // Broadcast live vitals update over Socket.IO
        if (this.io) {
          this.io.emit('VITALS_UPDATE', payload);

          // Handle Emergency / Attention alert dispatch
          if (evaluation.isEmergency && activeSession) {
            const now = Date.now();
            // Debounce emergency alert event every 15 seconds to avoid spamming
            if (now - bedState.lastEmergencyAlertTime > 15000) {
              bedState.lastEmergencyAlertTime = now;
              await this.triggerEmergencyAlert(activeSession, payload, evaluation);
            }
          }
        }
      }
    } catch (err) {
      console.error('[Simulator] Tick error:', err.message);
    }
  }

  async saveReadingToDB(session, payload, evaluation) {
    try {
      await prisma.vitalsReading.create({
        data: {
          sessionId: session.id,
          studentId: session.studentId,
          bedNumber: session.bedNumber,
          heartRate: payload.heartRate,
          spo2: payload.spo2,
          temperature: payload.temperature,
          ultrasonicDistance: payload.ultrasonicDistance,
          force: payload.force,
          riskLevel: evaluation.riskLevel,
          riskScore: evaluation.riskScore,
          riskExplanation: evaluation.riskExplanation,
          isEmergency: evaluation.isEmergency,
          source: payload.source,
          timestamp: new Date(payload.timestamp)
        }
      });

      // Update session running averages and peak risk
      const riskWeight = { NORMAL: 1, MONITOR: 2, ATTENTION: 3, EMERGENCY: 4 };
      const currentPeakWeight = riskWeight[session.peakRiskLevel] || 1;
      const newWeight = riskWeight[evaluation.riskLevel] || 1;

      const updatedPeak = newWeight > currentPeakWeight ? evaluation.riskLevel : session.peakRiskLevel;

      await prisma.monitoringSession.update({
        where: { id: session.id },
        data: {
          peakRiskLevel: updatedPeak,
          finalRiskLevel: evaluation.riskLevel
        }
      });
    } catch (err) {
      console.error('[Simulator] Failed to save reading:', err.message);
    }
  }

  async triggerEmergencyAlert(session, payload, evaluation) {
    try {
      const title = `CRITICAL ALERT: Bed ${session.bedNumber} - ${session.student.user.firstName} ${session.student.user.lastName}`;
      const explanation = evaluation.riskExplanation;

      const event = await prisma.riskEvent.create({
        data: {
          sessionId: session.id,
          studentId: session.studentId,
          bedNumber: session.bedNumber,
          riskLevel: 'EMERGENCY',
          riskScore: evaluation.riskScore,
          title,
          explanation,
          vitalsSnapshot: JSON.stringify({
            heartRate: payload.heartRate,
            spo2: payload.spo2,
            temperature: payload.temperature,
            timestamp: payload.timestamp
          })
        }
      });

      // Create notifications for doctor and admin
      await prisma.notification.create({
        data: {
          userId: session.doctor.userId,
          title: `EMERGENCY: Patient on Bed ${session.bedNumber}`,
          message: `${session.student.user.firstName} ${session.student.user.lastName}: ${explanation}`,
          type: 'EMERGENCY',
          link: '/doctor/monitoring'
        }
      });

      const alertPayload = {
        id: event.id,
        bedNumber: session.bedNumber,
        sessionId: session.id,
        studentName: `${session.student.user.firstName} ${session.student.user.lastName}`,
        rollNumber: session.student.rollNumber,
        vitals: {
          heartRate: payload.heartRate,
          spo2: payload.spo2,
          temperature: payload.temperature
        },
        riskLevel: 'EMERGENCY',
        riskScore: evaluation.riskScore,
        explanation,
        timestamp: payload.timestamp
      };

      if (this.io) {
        this.io.emit('EMERGENCY_ALERT', alertPayload);
        this.io.emit('NOTIFICATION', {
          title: alertPayload.title,
          message: explanation,
          type: 'EMERGENCY',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('[Simulator] Alert trigger error:', err.message);
    }
  }
}

const simulator = new SensorSimulator();
module.exports = simulator;
