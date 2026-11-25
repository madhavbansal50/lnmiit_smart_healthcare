const express = require('express');
const { z } = require('zod');
const prisma = require('../services/prisma');
const { requireAuth } = require('../middleware/auth');
const simulator = require('../services/simulator');
const { evaluateRisk } = require('../services/riskEngine');

const router = express.Router();

// GET /api/devices - Get all devices status
router.get('/', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { bedNumber: 'asc' }
    });

    // Check device freshness (mark OFFLINE if lastSeen > 60s ago)
    const now = Date.now();
    const updatedDevices = devices.map(d => {
      const diffMs = now - new Date(d.lastSeen).getTime();
      return {
        ...d,
        status: diffMs < 60000 ? d.status : 'OFFLINE'
      };
    });

    return res.json(updatedDevices);
  } catch (err) {
    console.error('Fetch devices error:', err);
    return res.status(500).json({ message: 'Failed to fetch devices list' });
  }
});

// POST /api/devices/simulator/scenario - Switch simulator scenario for demo
router.post('/simulator/scenario', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      bedNumber: z.coerce.number().min(1).max(2),
      scenario: z.enum(['NORMAL', 'MONITOR', 'ATTENTION', 'EMERGENCY'])
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    }

    const { bedNumber, scenario } = parsed.data;
    const ok = simulator.setScenario(bedNumber, scenario);

    if (!ok) {
      return res.status(400).json({ message: 'Failed to switch scenario' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('SCENARIO_CHANGED', { bedNumber, scenario });
    }

    return res.json({
      message: `Bed ${bedNumber} scenario set to ${scenario}`,
      bedNumber,
      scenario
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update simulator scenario' });
  }
});

// POST /api/edge/vitals - IoT Edge Endpoint for processed readings from Raspberry Pi / ESP32
router.post('/edge/vitals', async (req, res) => {
  try {
    const vitalsSchema = z.object({
      bedNumber: z.coerce.number().min(1).max(2),
      heartRate: z.coerce.number().min(20).max(250),
      spo2: z.coerce.number().min(50).max(100),
      temperature: z.coerce.number().min(30).max(45),
      macAddress: z.string().optional(),
      timestamp: z.coerce.number().optional()
    });

    const parsed = vitalsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid sensor payload', errors: parsed.error.flatten().fieldErrors });
    }

    const { bedNumber, heartRate, spo2, temperature, macAddress } = parsed.data;

    // Update device heartbeat
    await prisma.device.updateMany({
      where: { bedNumber },
      data: {
        lastSeen: new Date(),
        status: 'ONLINE',
        isRealHardware: true,
        macAddress: macAddress || undefined
      }
    });

    // Check active session on this bed
    const activeSession = await prisma.monitoringSession.findFirst({
      where: { bedNumber, status: 'ACTIVE' },
      include: {
        student: { include: { user: true, healthBaselines: true } },
        doctor: { include: { user: true } }
      }
    });

    const baseline = activeSession?.student?.healthBaselines?.[0] || null;
    const evaluation = evaluateRisk({ heartRate, spo2, temperature }, baseline);

    const payload = {
      bedNumber,
      heartRate,
      spo2,
      temperature,
      riskLevel: evaluation.riskLevel,
      riskScore: evaluation.riskScore,
      riskExplanation: evaluation.riskExplanation,
      isEmergency: evaluation.isEmergency,
      triggers: evaluation.triggers,
      source: 'HARDWARE',
      isRealHardware: true,
      timestamp: new Date().toISOString(),
      activeSession: activeSession
        ? {
            id: activeSession.id,
            studentId: activeSession.studentId,
            studentName: `${activeSession.student.user.firstName} ${activeSession.student.user.lastName}`,
            rollNumber: activeSession.student.rollNumber,
            doctorName: `Dr. ${activeSession.doctor.user.firstName} ${activeSession.doctor.user.lastName}`
          }
        : null
    };

    if (activeSession) {
      await simulator.saveReadingToDB(activeSession, payload, evaluation);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('VITALS_UPDATE', payload);
      // Emergency alert modal dispatch disabled to prevent continuous popups
    }

    return res.status(200).json({ message: 'Vitals processed', evaluation });
  } catch (err) {
    console.error('Edge vitals ingestion error:', err);
    return res.status(500).json({ message: 'Server error processing vitals' });
  }
});

// POST /api/edge/heartbeat - Heartbeat ping
router.post('/edge/heartbeat', async (req, res) => {
  try {
    const { deviceId, bedNumber, ipAddress, status } = req.body;
    if (deviceId) {
      await prisma.device.upsert({
        where: { deviceId },
        update: {
          lastSeen: new Date(),
          status: status || 'ONLINE',
          ipAddress: ipAddress || undefined
        },
        create: {
          deviceId,
          name: deviceId,
          type: 'ESP32_SENSOR',
          bedNumber: bedNumber ? parseInt(bedNumber) : null,
          status: 'ONLINE',
          isRealHardware: true
        }
      });
    }
    return res.json({ status: 'ACK', serverTime: Date.now() });
  } catch (err) {
    return res.status(500).json({ message: 'Heartbeat error' });
  }
});

// GET /api/edge/session/active - Sync active session for a bed
router.get('/edge/session/active', async (req, res) => {
  try {
    const { bedNumber } = req.query;
    const session = await prisma.monitoringSession.findFirst({
      where: {
        status: 'ACTIVE',
        ...(bedNumber ? { bedNumber: parseInt(bedNumber) } : {})
      },
      include: {
        student: { include: { user: true } },
        doctor: { include: { user: true } }
      }
    });

    return res.json({ session });
  } catch (err) {
    return res.status(500).json({ message: 'Active session query error' });
  }
});

module.exports = router;
