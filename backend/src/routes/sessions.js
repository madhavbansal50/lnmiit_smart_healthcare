const express = require('express');
const { z } = require('zod');
const prisma = require('../services/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const simulator = require('../services/simulator');

const router = express.Router();

// GET /api/sessions - Get all monitoring sessions (archive & active)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, bedNumber, limit } = req.query;
    const where = {};
    if (status) where.status = status;
    if (bedNumber) where.bedNumber = parseInt(bedNumber, 10);

    // Role-based security: Students can ONLY query their own monitoring sessions
    if (req.user.role === 'STUDENT') {
      const studentProfile = req.user.studentProfile || await prisma.studentProfile.findFirst({ where: { userId: req.user.id } });
      if (!studentProfile) return res.json([]);
      where.studentId = studentProfile.id;
    }

    const sessions = await prisma.monitoringSession.findMany({
      where,
      include: {
        student: { include: { user: true } },
        doctor: { include: { user: true } },
        device: true
      },
      orderBy: { startTime: 'desc' },
      take: limit ? parseInt(limit, 10) : 100
    });

    return res.json(sessions);
  } catch (err) {
    console.error('Fetch monitoring sessions archive error:', err);
    return res.status(500).json({ message: 'Failed to fetch monitoring sessions' });
  }
});

// GET /api/sessions/my-active - Get logged-in student's active monitoring session
router.get('/my-active', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(400).json({ message: 'Endpoint dedicated to students' });
    }
    const studentProfile = req.user.studentProfile || await prisma.studentProfile.findFirst({ where: { userId: req.user.id } });
    if (!studentProfile) {
      return res.json(null);
    }
    const activeSession = await prisma.monitoringSession.findFirst({
      where: { studentId: studentProfile.id, status: 'ACTIVE' },
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
    return res.json(activeSession || null);
  } catch (err) {
    console.error('Fetch my-active session error:', err);
    return res.status(500).json({ message: 'Failed to fetch student active session' });
  }
});

// GET /api/sessions/active - Get all active sessions (Doctors: all beds; Students: only their own)
router.get('/active', requireAuth, async (req, res) => {
  try {
    const where = { status: 'ACTIVE' };

    // Role-based security: Students can NEVER see other beds or other patients' sessions
    if (req.user.role === 'STUDENT') {
      const studentProfile = req.user.studentProfile || await prisma.studentProfile.findFirst({ where: { userId: req.user.id } });
      if (!studentProfile) return res.json([]);
      where.studentId = studentProfile.id;
    }

    const activeSessions = await prisma.monitoringSession.findMany({
      where,
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
      chiefComplaint: z.string().optional(),
      forceEndExisting: z.boolean().optional()
    });

    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    }

    const { studentId, bedNumber, chiefComplaint, forceEndExisting } = parsed.data;

    // Check 1: Ensure bed is not already active
    const activeBedSession = await prisma.monitoringSession.findFirst({
      where: { bedNumber, status: 'ACTIVE' },
      include: { student: { include: { user: true } } }
    });

    if (activeBedSession) {
      if (forceEndExisting) {
        // Automatically close existing session on this bed
        const now = new Date();
        const durationMins = Math.max(1, Math.round((now.getTime() - new Date(activeBedSession.startTime).getTime()) / 60000));
        await prisma.monitoringSession.update({
          where: { id: activeBedSession.id },
          data: {
            status: 'COMPLETED',
            endTime: now,
            durationMinutes: durationMins,
            summary: 'Concluded to admit new patient.'
          }
        });

        const io = req.app.get('io');
        if (io) {
          io.emit('SESSION_ENDED', {
            sessionId: activeBedSession.id,
            bedNumber,
            studentName: `${activeBedSession.student?.user?.firstName || ''} ${activeBedSession.student?.user?.lastName || ''}`,
            durationMinutes: durationMins,
            endTime: now
          });
        }
      } else {
        const studentName = activeBedSession.student?.user
          ? `${activeBedSession.student.user.firstName} ${activeBedSession.student.user.lastName}`
          : 'another patient';
        return res.status(409).json({
          message: `Bed ${bedNumber} is already occupied with an active monitoring session for ${studentName}. Please end that session first.`,
          occupiedSession: {
            id: activeBedSession.id,
            bedNumber: activeBedSession.bedNumber,
            studentName
          },
          canForceEnd: true
        });
      }
    }

    // Check 2: Ensure student is not already in an active session on another bed
    const studentActiveSession = await prisma.monitoringSession.findFirst({
      where: { studentId, status: 'ACTIVE' }
    });

    if (studentActiveSession) {
      if (forceEndExisting) {
        const now = new Date();
        const durationMins = Math.max(1, Math.round((now.getTime() - new Date(studentActiveSession.startTime).getTime()) / 60000));
        await prisma.monitoringSession.update({
          where: { id: studentActiveSession.id },
          data: {
            status: 'COMPLETED',
            endTime: now,
            durationMinutes: durationMins,
            summary: `Transferred to Bed ${bedNumber}.`
          }
        });
      } else {
        return res.status(409).json({
          message: `This student already has an active monitoring session on Bed ${studentActiveSession.bedNumber}.`,
          occupiedSession: {
            id: studentActiveSession.id,
            bedNumber: studentActiveSession.bedNumber
          },
          canForceEnd: true
        });
      }
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

    const doctorLastName = session.doctor?.user?.lastName || 'Medical Staff';
    const doctorFullName = session.doctor?.user ? `Dr. ${session.doctor.user.firstName} ${session.doctor.user.lastName}` : 'Attending Physician';
    const studentFullName = session.student?.user ? `${session.student.user.firstName} ${session.student.user.lastName}` : 'Patient';

    // Notify student
    if (session.student?.userId) {
      await prisma.notification.create({
        data: {
          userId: session.student.userId,
          title: `Monitoring Session Started on Bed ${bedNumber}`,
          message: `Your campus vital monitoring session has begun under ${doctorFullName}.`,
          type: 'SESSION',
          link: '/student/live'
        }
      });
    }

    // Broadcast Socket.IO event if io instance is attached to app
    const io = req.app.get('io');
    if (io) {
      io.emit('SESSION_STARTED', {
        sessionId: session.id,
        bedNumber,
        studentName: studentFullName,
        rollNumber: session.student?.rollNumber || 'N/A',
        doctorName: doctorFullName,
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

// POST /api/sessions/reset-bed/:bedNumber - Force clear any active session on a specific bed
router.post('/reset-bed/:bedNumber', requireAuth, requireRole('DOCTOR', 'ADMIN'), async (req, res) => {
  try {
    const bedNumber = parseInt(req.params.bedNumber, 10);
    const activeSessions = await prisma.monitoringSession.findMany({
      where: { bedNumber, status: 'ACTIVE' }
    });

    const now = new Date();
    for (const session of activeSessions) {
      await prisma.monitoringSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          endTime: now,
          summary: 'Force-cleared by clinic doctor.'
        }
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('SESSION_ENDED', {
        bedNumber,
        status: 'CLEARED'
      });
    }

    return res.json({
      message: `Bed ${bedNumber} reset successfully`,
      clearedCount: activeSessions.length
    });
  } catch (err) {
    console.error('Reset bed error:', err);
    return res.status(500).json({ message: 'Failed to reset bed' });
  }
});

module.exports = router;
