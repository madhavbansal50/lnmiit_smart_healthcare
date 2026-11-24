const express = require('express');
const { z } = require('zod');
const prisma = require('../services/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const simulator = require('../services/simulator');

const router = express.Router();

// GET /api/sessions/active - Get all active sessions
router.get('/active', requireAuth, async (req, res) => {
  try {
    const activeSessions = await prisma.monitoringSession.findMany({
      where: { status: 'ACTIVE' },
      include: {
        student: { include: { user: true } },
        doctor: { include: { user: true } },
        device: true,
        vitals: {
          orderBy: { timestamp: 'desc' },
          take: 30
        }
      }
    });

    return res.json(activeSessions);
  } catch (err) {
    console.error('Fetch active sessions error:', err);
    return res.status(500).json({ message: 'Failed to fetch active sessions' });
  }
});

// GET /api/sessions/:id - Get specific session details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.monitoringSession.findUnique({
      where: { id },
      include: {
        student: { include: { user: true } },
        doctor: { include: { user: true } },
        device: true,
        clinicalNotes: true,
        prescriptions: { include: { items: true } },
        riskEvents: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Monitoring session not found' });
    }

    // Role check: If STUDENT, verify this session belongs to them!
    if (req.user.role === 'STUDENT' && req.user.studentProfile?.id !== session.studentId) {
      return res.status(403).json({ message: 'Forbidden: You cannot access another student’s session data.' });
    }

    return res.json(session);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch session' });
  }
});

// GET /api/sessions/:id/vitals - Get session historical vitals readings
router.get('/:id/vitals', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    const session = await prisma.monitoringSession.findUnique({
      where: { id },
      select: { studentId: true }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Role check for students
    if (req.user.role === 'STUDENT' && req.user.studentProfile?.id !== session.studentId) {
      return res.status(403).json({ message: 'Forbidden: Access denied to other students’ vitals.' });
    }

    const vitals = await prisma.vitalsReading.findMany({
      where: { sessionId: id },
      orderBy: { timestamp: 'asc' },
      take: parseInt(limit)
    });

    return res.json(vitals);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch session vitals' });
  }
});

// POST /api/sessions/start - Start a monitoring session (Doctors & Admin)
router.post('/start', requireAuth, requireRole('DOCTOR', 'ADMIN'), async (req, res) => {
  try {
    const startSchema = z.object({
      studentId: z.string().min(1, 'Student ID is required'),
      bedNumber: z.coerce.number().min(1).max(2, 'Bed number must be 1 or 2'),
      chiefComplaint: z.string().optional()
    });

    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    }

    const { studentId, bedNumber, chiefComplaint } = parsed.data;

    // Check 1: Ensure bed is not already active
    const activeBedSession = await prisma.monitoringSession.findFirst({
      where: { bedNumber, status: 'ACTIVE' },
      include: { student: { include: { user: true } } }
    });

    if (activeBedSession) {
      return res.status(409).json({
        message: `Bed ${bedNumber} is already occupied with an active monitoring session for ${activeBedSession.student.user.firstName} ${activeBedSession.student.user.lastName}. Please end that session first.`
      });
    }

    // Check 2: Ensure student is not already in an active session on another bed
    const studentActiveSession = await prisma.monitoringSession.findFirst({
      where: { studentId, status: 'ACTIVE' }
    });

    if (studentActiveSession) {
      return res.status(409).json({
        message: `This student already has an active monitoring session on Bed ${studentActiveSession.bedNumber}.`
      });
    }

    // Find Doctor Profile
    let doctorProfileId = req.user.doctorProfile?.id;
    if (!doctorProfileId) {
      // If admin, assign to first active doctor
      const firstDoctor = await prisma.doctorProfile.findFirst();
      doctorProfileId = firstDoctor?.id;
    }

    // Find Device for Bed
    const device = await prisma.device.findFirst({
      where: { bedNumber }
    });

    // Create Session
    const session = await prisma.monitoringSession.create({
      data: {
        bedNumber,
        studentId,
        doctorId: doctorProfileId,
        deviceId: device?.id || null,
        startTime: new Date(),
        status: 'ACTIVE',
        chiefComplaint: chiefComplaint || 'Routine campus clinic vitals assessment',
        initialRiskLevel: 'NORMAL',
        peakRiskLevel: 'NORMAL',
        finalRiskLevel: 'NORMAL'
      },
      include: {
        student: { include: { user: true } },
        doctor: { include: { user: true } },
        device: true
      }
    });

    // Reset simulator scenario for this bed to NORMAL
    simulator.setScenario(bedNumber, 'NORMAL');

    // Notify student
    await prisma.notification.create({
      data: {
        userId: session.student.userId,
        title: `Monitoring Session Started on Bed ${bedNumber}`,
        message: `Your campus vital monitoring session has begun under Dr. ${session.doctor.user.lastName}.`,
        type: 'SESSION',
        link: '/student/live'
      }
    });

    // Broadcast Socket.IO event if io instance is attached to app
    const io = req.app.get('io');
    if (io) {
      io.emit('SESSION_STARTED', {
        sessionId: session.id,
        bedNumber,
        studentName: `${session.student.user.firstName} ${session.student.user.lastName}`,
        rollNumber: session.student.rollNumber,
        doctorName: `Dr. ${session.doctor.user.firstName} ${session.doctor.user.lastName}`,
        startTime: session.startTime
      });
    }

    return res.status(201).json({
      message: `Monitoring session started successfully on Bed ${bedNumber}`,
      session
    });
  } catch (err) {
    console.error('Start session error:', err);
    return res.status(500).json({ message: 'Failed to start monitoring session' });
  }
});

// PUT /api/sessions/:id/end - End a monitoring session
router.put('/:id/end', requireAuth, requireRole('DOCTOR', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { summary, finalRiskLevel } = req.body;

    const session = await prisma.monitoringSession.findUnique({
      where: { id },
      include: {
        student: { include: { user: true } },
        doctor: { include: { user: true } },
        vitals: true
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Monitoring session not found' });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Session is already completed or terminated.' });
    }

    const endTime = new Date();
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 60000));

    // Compute averages from recorded vitals
    let avgHeartRate = session.avgHeartRate;
    let avgSpo2 = session.avgSpo2;
    let avgTemperature = session.avgTemperature;

    if (session.vitals.length > 0) {
      const sumHr = session.vitals.reduce((acc, v) => acc + v.heartRate, 0);
      const sumSp = session.vitals.reduce((acc, v) => acc + v.spo2, 0);
      const sumTemp = session.vitals.reduce((acc, v) => acc + v.temperature, 0);

      avgHeartRate = parseFloat((sumHr / session.vitals.length).toFixed(1));
      avgSpo2 = parseFloat((sumSp / session.vitals.length).toFixed(1));
      avgTemperature = parseFloat((sumTemp / session.vitals.length).toFixed(1));
    }

    const updatedSession = await prisma.monitoringSession.update({
      where: { id },
      data: {
        endTime,
        durationMinutes,
        status: 'COMPLETED',
        summary: summary || `Session completed after ${durationMinutes} minutes. Average vitals: HR ${avgHeartRate || '--'} BPM, SpO2 ${avgSpo2 || '--'}%, Temp ${avgTemperature || '--'}°C.`,
        finalRiskLevel: finalRiskLevel || session.finalRiskLevel,
        avgHeartRate,
        avgSpo2,
        avgTemperature
      },
      include: {
        student: { include: { user: true } },
        doctor: { include: { user: true } }
      }
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: session.student.userId,
        title: 'Monitoring Session Completed',
        message: `Your monitoring session on Bed ${session.bedNumber} has concluded. Duration: ${durationMinutes} mins.`,
        type: 'SESSION',
        link: '/student/history'
      }
    });

    // Broadcast Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.emit('SESSION_ENDED', {
        sessionId: session.id,
        bedNumber: session.bedNumber,
        studentName: `${session.student.user.firstName} ${session.student.user.lastName}`,
        durationMinutes,
        endTime
      });
    }

    return res.json({
      message: 'Monitoring session ended successfully',
      session: updatedSession
    });
  } catch (err) {
    console.error('End session error:', err);
    return res.status(500).json({ message: 'Failed to end monitoring session' });
  }
});

module.exports = router;
