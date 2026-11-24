const express = require('express');
const { z } = require('zod');
const prisma = require('../services/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/clinical-notes/student/:studentId
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Student privacy check: A student can only view their own notes!
    if (req.user.role === 'STUDENT' && req.user.studentProfile?.id !== studentId) {
      return res.status(403).json({ message: 'Forbidden: Access denied to other students’ clinical notes.' });
    }

    const notes = await prisma.clinicalNote.findMany({
      where: {
        studentId,
        ...(req.user.role === 'STUDENT' ? { isSharedWithStudent: true } : {})
      },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: { include: { user: true } },
        session: true
      }
    });

    return res.json(notes);
  } catch (err) {
    console.error('Fetch notes error:', err);
    return res.status(500).json({ message: 'Failed to fetch clinical notes' });
  }
});

// POST /api/clinical-notes (Doctors & Admin)
router.post('/', requireAuth, requireRole('DOCTOR', 'ADMIN'), async (req, res) => {
  try {
    const noteSchema = z.object({
      studentId: z.string().min(1, 'Student ID is required'),
      sessionId: z.string().optional().nullable(),
      chiefComplaint: z.string().min(1, 'Chief complaint is required'),
      clinicalObservations: z.string().min(1, 'Clinical observations are required'),
      diagnosis: z.string().optional().nullable(),
      instructions: z.string().min(1, 'Instructions are required'),
      followUpRecommendation: z.string().optional().nullable(),
      isSharedWithStudent: z.boolean().default(true)
    });

    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    }

    const d = parsed.data;
    let doctorProfileId = req.user.doctorProfile?.id;
    if (!doctorProfileId) {
      const doc = await prisma.doctorProfile.findFirst();
      doctorProfileId = doc?.id;
    }

    const note = await prisma.clinicalNote.create({
      data: {
        studentId: d.studentId,
        doctorId: doctorProfileId,
        sessionId: d.sessionId || null,
        chiefComplaint: d.chiefComplaint,
        clinicalObservations: d.clinicalObservations,
        diagnosis: d.diagnosis || null,
        instructions: d.instructions,
        followUpRecommendation: d.followUpRecommendation || null,
        isSharedWithStudent: d.isSharedWithStudent
      },
      include: {
        doctor: { include: { user: true } },
        student: { include: { user: true } }
      }
    });

    // Notify student if shared
    if (d.isSharedWithStudent && note.student?.userId) {
      await prisma.notification.create({
        data: {
          userId: note.student.userId,
          title: 'New Clinical Note Added',
          message: `Dr. ${note.doctor.user.lastName} has documented clinical advice and diagnosis for your record.`,
          type: 'NOTE',
          link: '/student/history'
        }
      });
    }

    return res.status(201).json({
      message: 'Clinical note saved successfully',
      note
    });
  } catch (err) {
    console.error('Create clinical note error:', err);
    return res.status(500).json({ message: 'Failed to create clinical note' });
  }
});

module.exports = router;
