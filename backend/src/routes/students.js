const express = require('express');
const { z } = require('zod');
const prisma = require('../services/prisma');
const { requireAuth } = require('../middleware/auth');
const { generatePersonalizedInsights } = require('../services/aiService');
const simulator = require('../services/simulator');

const router = express.Router();

// GET /api/students/me - Current student's own health overview
router.get('/me', requireAuth, async (req, res) => {
  try {
    const studentProfile = req.user.studentProfile;
    if (!studentProfile) {
      return res.status(404).json({ message: 'Student profile not associated with this account.' });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfile.id },
      include: {
        user: true,
        assignedDoctor: { include: { user: true } },
        healthBaselines: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: {
            doctor: { include: { user: true } },
            vitals: { orderBy: { timestamp: 'desc' }, take: 15 },
            clinicalNotes: true,
            prescriptions: { include: { items: true } }
          }
        },
        clinicalNotes: {
          where: { isSharedWithStudent: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { doctor: { include: { user: true } } }
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            doctor: { include: { user: true } },
            items: true
          }
        },
        medicalReports: {
          orderBy: { uploadDate: 'desc' },
          take: 5,
          include: { summary: true }
        }
      }
    });

    // Check if student currently has an active monitoring session
    const activeSession = await prisma.monitoringSession.findFirst({
      where: { studentId: studentProfile.id, status: 'ACTIVE' },
      include: {
        doctor: { include: { user: true } },
        device: true
      }
    });

    // Live vitals from simulator if active on Bed 1 or Bed 2
    let liveVitals = null;
    if (activeSession) {
      const bedState = simulator.getState(activeSession.bedNumber);
      liveVitals = bedState?.lastReading || null;
    }

    // Generate personalized insights
    const insights = await generatePersonalizedInsights(studentProfile.id);

    return res.json({
      profile: student,
      activeSession,
      liveVitals,
      insights
    });
  } catch (err) {
    console.error('Fetch student me error:', err);
    return res.status(500).json({ message: 'Failed to fetch student dashboard data' });
  }
});

// PUT /api/students/profile - Update personal profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    let studentProfileId = req.user.studentProfile?.id;

    // Admin or Doctor can pass studentId in body to edit
    if (req.body.studentId && (req.user.role === 'ADMIN' || req.user.role === 'DOCTOR')) {
      studentProfileId = req.body.studentId;
    }

    if (!studentProfileId) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const profileSchema = z.object({
      phone: z.string().optional(),
      bloodGroup: z.string().optional(),
      hostelRoom: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      allergies: z.string().optional(),
      chronicConditions: z.string().optional(),
      branch: z.string().optional(),
      yearOfStudy: z.coerce.number().optional()
    });

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    }

    const d = parsed.data;

    const updated = await prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: {
        bloodGroup: d.bloodGroup,
        hostelRoom: d.hostelRoom,
        emergencyContactName: d.emergencyContactName,
        emergencyContactPhone: d.emergencyContactPhone,
        allergies: d.allergies,
        chronicConditions: d.chronicConditions,
        branch: d.branch,
        yearOfStudy: d.yearOfStudy,
        user: d.phone ? { update: { phone: d.phone } } : undefined
      },
      include: {
        user: true,
        assignedDoctor: { include: { user: true } }
      }
    });

    return res.json({
      message: 'Profile updated successfully',
      student: updated
    });
  } catch (err) {
    console.error('Update student profile error:', err);
    return res.status(500).json({ message: 'Failed to update student profile' });
  }
});

// GET /api/students/:id/vitals/history - Historical vitals with time range filter
router.get('/:id/vitals/history', requireAuth, async (req, res) => {
  try {
    const { id } = req.params; // studentProfile id
    const { range = 'entire' } = req.query; // '5m', '15m', '30m', 'entire'

    // Isolation check
    if (req.user.role === 'STUDENT' && req.user.studentProfile?.id !== id) {
      return res.status(403).json({ message: 'Forbidden: Access denied to other students’ vitals.' });
    }

    let timeFilter = undefined;
    const now = Date.now();

    if (range === '5m') {
      timeFilter = { gte: new Date(now - 5 * 60 * 1000) };
    } else if (range === '15m') {
      timeFilter = { gte: new Date(now - 15 * 60 * 1000) };
    } else if (range === '30m') {
      timeFilter = { gte: new Date(now - 30 * 60 * 1000) };
    }

    const vitals = await prisma.vitalsReading.findMany({
      where: {
        studentId: id,
        ...(timeFilter ? { timestamp: timeFilter } : {})
      },
      orderBy: { timestamp: 'asc' },
      take: 200
    });

    return res.json(vitals);
  } catch (err) {
    console.error('Fetch vitals history error:', err);
    return res.status(500).json({ message: 'Failed to fetch vitals history' });
  }
});

module.exports = router;
