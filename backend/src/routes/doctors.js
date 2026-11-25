const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../services/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const simulator = require('../services/simulator');

const router = express.Router();

// Allow DOCTOR and ADMIN to access doctor endpoints
router.use(requireAuth, requireRole('DOCTOR', 'ADMIN'));

// GET /api/doctors/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const doctorProfile = req.user.doctorProfile;
    const doctorProfileId = doctorProfile ? doctorProfile.id : null;

    // Doctor stats
    const [totalPatients, activeSessionsCount, attentionAlertsCount, emergencyAlertsCount] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.monitoringSession.count({ where: { status: 'ACTIVE' } }),
      prisma.riskEvent.count({ where: { riskLevel: 'ATTENTION', isAcknowledged: false } }),
      prisma.riskEvent.count({ where: { riskLevel: 'EMERGENCY', isAcknowledged: false } })
    ]);

    // Active Bed 1 & Bed 2 sessions
    const activeBed1 = await prisma.monitoringSession.findFirst({
      where: { bedNumber: 1, status: 'ACTIVE' },
      include: {
        student: { include: { user: true } },
        doctor: { include: { user: true } },
        vitals: { orderBy: { timestamp: 'desc' }, take: 1 }
      }
    });

    const activeBed2 = await prisma.monitoringSession.findFirst({
      where: { bedNumber: 2, status: 'ACTIVE' },
      include: {
        student: { include: { user: true } },
        doctor: { include: { user: true } },
        vitals: { orderBy: { timestamp: 'desc' }, take: 1 }
      }
    });

    // Recent patients
    const recentStudents = await prisma.studentProfile.findMany({
      take: 6,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 1
        }
      }
    });

    // Recent active alerts
    const recentAlerts = await prisma.riskEvent.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          include: {
            student: { include: { user: true } }
          }
        }
      }
    });

    // Devices status
    const devices = await prisma.device.findMany({
      orderBy: { bedNumber: 'asc' }
    });

    // Simulator states for live cards
    const simBed1 = simulator.getState(1);
    const simBed2 = simulator.getState(2);

    return res.json({
      doctor: doctorProfile ? {
        id: doctorProfile.id,
        doctorId: doctorProfile.doctorId,
        specialization: doctorProfile.specialization,
        name: `Dr. ${req.user.firstName} ${req.user.lastName}`,
        department: doctorProfile.department
      } : { name: 'Admin Doctor View', specialization: 'Administration' },
      stats: {
        totalPatients,
        activeSessions: activeSessionsCount,
        attentionAlerts: attentionAlertsCount,
        emergencyAlerts: emergencyAlertsCount,
        todayVisits: recentStudents.length
      },
      beds: {
        bed1: {
          session: activeBed1,
          liveData: simBed1?.lastReading || null
        },
        bed2: {
          session: activeBed2,
          liveData: simBed2?.lastReading || null
        }
      },
      recentPatients: recentStudents.map(s => ({
        id: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`,
        rollNumber: s.rollNumber,
        branch: s.branch,
        bloodGroup: s.bloodGroup,
        lastVisit: s.sessions[0]?.startTime || s.createdAt,
        lastRiskStatus: s.sessions[0]?.finalRiskLevel || 'NORMAL',
        activeBed: (activeBed1?.studentId === s.id ? 1 : (activeBed2?.studentId === s.id ? 2 : null))
      })),
      recentAlerts,
      devices
    });
  } catch (err) {
    console.error('Doctor dashboard error:', err);
    return res.status(500).json({ message: 'Failed to fetch doctor dashboard data' });
  }
});

// GET /api/doctors/patients
router.get('/patients', async (req, res) => {
  try {
    const { search } = req.query;

    const students = await prisma.studentProfile.findMany({
      include: {
        user: true,
        assignedDoctor: { include: { user: true } },
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 1
        },
        _count: {
          select: { sessions: true, prescriptions: true, medicalReports: true, clinicalNotes: true }
        }
      },
      orderBy: { rollNumber: 'asc' }
    });

    let filtered = students;
    if (search) {
      const q = search.toLowerCase();
      filtered = students.filter(s =>
        s.user.firstName.toLowerCase().includes(q) ||
        s.user.lastName.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q)
      );
    }

    return res.json(filtered);
  } catch (err) {
    console.error('Fetch patients error:', err);
    return res.status(500).json({ message: 'Failed to fetch patients list' });
  }
});

// POST /api/doctors/patients (Add new student/patient)
router.post('/patients', async (req, res) => {
  try {
    const studentSchema = z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email('Invalid email address'),
      rollNumber: z.string().min(1, 'Roll number is required'),
      branch: z.string().min(1, 'Branch is required'),
      yearOfStudy: z.coerce.number().min(1).max(5),
      age: z.coerce.number().min(15).max(40).default(20),
      gender: z.string().default('Not Specified'),
      bloodGroup: z.string().default('B+'),
      allergies: z.string().default('None reported'),
      chronicConditions: z.string().default('None reported'),
      hostelRoom: z.string().default('Campus Hostel'),
      emergencyContactName: z.string().min(1, 'Emergency contact name required'),
      emergencyContactPhone: z.string().min(1, 'Emergency contact phone required'),
      password: z.string().min(6).default('student123')
    });

    const parsed = studentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    }

    const d = parsed.data;

    // Check duplicate email in user collection
    const existingEmail = await prisma.user.findFirst({
      where: { email: d.email.toLowerCase() }
    });

    if (existingEmail) {
      return res.status(409).json({ message: `Student with email "${d.email}" already exists.` });
    }

    // Check duplicate roll number in studentProfile collection
    const existingRoll = await prisma.studentProfile.findFirst({
      where: { rollNumber: d.rollNumber.toUpperCase() }
    });

    if (existingRoll) {
      return res.status(409).json({ message: `Student with roll number "${d.rollNumber}" already exists.` });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(d.password, salt);

    const doctorProfileId = req.user.doctorProfile?.id || null;

    const newUser = await prisma.user.create({
      data: {
        email: d.email.toLowerCase(),
        password: hashedPassword,
        role: 'STUDENT',
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.emergencyContactPhone,
        status: 'ACTIVE',
        studentProfile: {
          create: {
            rollNumber: d.rollNumber.toUpperCase(),
            branch: d.branch,
            yearOfStudy: d.yearOfStudy,
            age: d.age,
            gender: d.gender,
            bloodGroup: d.bloodGroup,
            allergies: d.allergies,
            chronicConditions: d.chronicConditions,
            hostelRoom: d.hostelRoom,
            emergencyContactName: d.emergencyContactName,
            emergencyContactPhone: d.emergencyContactPhone,
            assignedDoctorId: doctorProfileId
          }
        }
      },
      include: {
        studentProfile: true
      }
    });

    // Create health baseline
    const studentProfileId = newUser.studentProfile?.id;
    if (studentProfileId) {
      await prisma.healthBaseline.create({
        data: {
          studentId: studentProfileId,
          baselineHeartRate: 72,
          baselineSpo2: 98.4,
          baselineTemperature: 36.8,
          totalSessionsRecorded: 0
        }
      });
    }

    return res.status(201).json({
      message: 'Student patient registered successfully',
      patient: newUser
    });
  } catch (err) {
    console.error('Create student error:', err);
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return res.status(409).json({ message: 'A student with this email or roll number already exists.' });
    }
    return res.status(500).json({ message: 'Failed to create student account' });
  }
});

// GET /api/doctors/patients/:id (Comprehensive patient profile with all tabs)
router.get('/patients/:id', async (req, res) => {
  try {
    const { id } = req.params; // studentProfile id

    const student = await prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: true,
        assignedDoctor: { include: { user: true } },
        healthBaselines: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          include: {
            doctor: { include: { user: true } },
            vitals: { orderBy: { timestamp: 'desc' }, take: 20 },
            clinicalNotes: true,
            prescriptions: { include: { items: true } }
          }
        },
        clinicalNotes: {
          orderBy: { createdAt: 'desc' },
          include: { doctor: { include: { user: true } } }
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: { include: { user: true } },
            items: true
          }
        },
        medicalReports: {
          orderBy: { uploadDate: 'desc' },
          include: { summary: true }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    // Check if patient is currently in an active session
    const activeSession = await prisma.monitoringSession.findFirst({
      where: { studentId: id, status: 'ACTIVE' },
      include: { doctor: { include: { user: true } } }
    });

    return res.json({
      ...student,
      activeSession
    });
  } catch (err) {
    console.error('Fetch patient profile error:', err);
    return res.status(500).json({ message: 'Failed to fetch patient profile' });
  }
});

// PUT /api/doctors/alerts/:id/acknowledge
router.put('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const doctorName = `Dr. ${req.user.firstName} ${req.user.lastName}`;

    const alert = await prisma.riskEvent.update({
      where: { id },
      data: {
        isAcknowledged: true,
        acknowledgedBy: doctorName,
        acknowledgedAt: new Date()
      }
    });

    return res.json({ message: 'Alert acknowledged', alert });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to acknowledge alert' });
  }
});

// DELETE /api/doctors/alerts/:id - Delete single alert
router.delete('/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.riskEvent.delete({ where: { id } });
    return res.json({ message: 'Alert deleted successfully' });
  } catch (err) {
    console.error('Delete alert error:', err);
    return res.status(500).json({ message: 'Failed to delete alert' });
  }
});

// DELETE /api/doctors/alerts - Delete / clear all alerts (or only acknowledged)
router.delete('/alerts', async (req, res) => {
  try {
    const { onlyAcknowledged } = req.query;
    const where = onlyAcknowledged === 'true' ? { isAcknowledged: true } : {};
    const result = await prisma.riskEvent.deleteMany({ where });
    return res.json({ message: 'Alerts cleared successfully', count: result.count });
  } catch (err) {
    console.error('Clear alerts error:', err);
    return res.status(500).json({ message: 'Failed to clear alerts' });
  }
});

module.exports = router;
