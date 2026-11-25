const express = require('express');
const { z } = require('zod');
const prisma = require('../services/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/prescriptions - List all issued prescriptions (Doctors & Admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: { include: { user: true } },
        doctor: { include: { user: true } },
        session: true
      }
    });

    return res.json(prescriptions);
  } catch (err) {
    console.error('Fetch all prescriptions error:', err);
    return res.status(500).json({ message: 'Failed to fetch prescriptions' });
  }
});

// GET /api/prescriptions/student/:studentId
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Student privacy check
    if (req.user.role === 'STUDENT' && req.user.studentProfile?.id !== studentId) {
      return res.status(403).json({ message: 'Forbidden: Access denied to other students’ prescriptions.' });
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: { include: { user: true } },
        session: true,
        items: true
      }
    });

    return res.json(prescriptions);
  } catch (err) {
    console.error('Fetch prescriptions error:', err);
    return res.status(500).json({ message: 'Failed to fetch prescriptions' });
  }
});

// GET /api/prescriptions/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        doctor: { include: { user: true } },
        student: { include: { user: true } },
        session: true,
        items: true
      }
    });

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (req.user.role === 'STUDENT' && req.user.studentProfile?.id !== prescription.studentId) {
      return res.status(403).json({ message: 'Forbidden: Access denied.' });
    }

    return res.json(prescription);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch prescription' });
  }
});

// DELETE /api/prescriptions/:id (Doctors & Admin)
router.delete('/:id', requireAuth, requireRole('DOCTOR', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.prescription.delete({ where: { id } });
    return res.json({ message: 'Prescription deleted successfully' });
  } catch (err) {
    console.error('Delete prescription error:', err);
    return res.status(500).json({ message: 'Failed to delete prescription' });
  }
});

// POST /api/prescriptions (Doctors & Admin)
router.post('/', requireAuth, requireRole('DOCTOR', 'ADMIN'), async (req, res) => {
  try {
    const itemSchema = z.object({
      medicineName: z.string().min(1, 'Medicine name is required'),
      dosage: z.string().min(1, 'Dosage is required'),
      frequency: z.string().min(1, 'Frequency is required'),
      duration: z.string().min(1, 'Duration is required'),
      instructions: z.string().optional().default('Take after meals')
    });

    const prescriptionSchema = z.object({
      studentId: z.string().min(1, 'Student ID is required'),
      sessionId: z.string().optional().nullable(),
      diagnosis: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      items: z.array(itemSchema).min(1, 'At least one medication item is required')
    });

    const parsed = prescriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    }

    const d = parsed.data;
    let doctorProfileId = req.user.doctorProfile?.id;
    if (!doctorProfileId) {
      const doc = await prisma.doctorProfile.findFirst();
      doctorProfileId = doc?.id;
    }

    const prescription = await prisma.prescription.create({
      data: {
        studentId: d.studentId,
        doctorId: doctorProfileId,
        sessionId: d.sessionId || null,
        diagnosis: d.diagnosis || null,
        notes: d.notes || null,
        status: 'ACTIVE',
        items: d.items.map(item => ({
          medicineName: item.medicineName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || 'As advised'
        }))
      },
      include: {
        doctor: { include: { user: true } },
        student: { include: { user: true } },
        items: true
      }
    });

    // Notify student
    if (prescription.student?.userId) {
      await prisma.notification.create({
        data: {
          userId: prescription.student.userId,
          title: 'Digital Prescription Issued',
          message: `Dr. ${prescription.doctor.user.lastName} has created a new prescription (${d.items.length} medicines).`,
          type: 'PRESCRIPTION',
          link: '/student/prescriptions'
        }
      });
    }

    return res.status(201).json({
      message: 'Prescription created successfully',
      prescription
    });
  } catch (err) {
    console.error('Create prescription error:', err);
    return res.status(500).json({ message: 'Failed to create prescription' });
  }
});

module.exports = router;
