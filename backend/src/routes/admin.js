const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../services/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { nodeRedClient } = require('../services/nodeRedClient');

const router = express.Router();

function getDevicesWithLiveStatus(devices) {
  const isGatewayOnline = nodeRedClient.isConnected;
  const now = Date.now();
  const lastPacketDiff = nodeRedClient.lastPacketTime
    ? (now - new Date(nodeRedClient.lastPacketTime).getTime())
    : Infinity;
  const isHardwareStreaming = isGatewayOnline && lastPacketDiff < 20000;

  return devices.map(d => {
    let isOnline = false;
    if (d.type === 'EDGE_GATEWAY' || d.deviceId?.includes('RPI') || d.deviceId?.includes('GATEWAY')) {
      isOnline = isGatewayOnline;
    } else {
      isOnline = isHardwareStreaming;
    }

    return {
      ...d,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      isRealHardware: true
    };
  });
}

// Admin-only middleware applied to all routes in this file
router.use(requireAuth, requireRole('ADMIN'));

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [totalDoctors, totalStudents, activeSessions, rawDevices, recentSessions] = await Promise.all([
      prisma.doctorProfile.count(),
      prisma.studentProfile.count(),
      prisma.monitoringSession.count({ where: { status: 'ACTIVE' } }),
      prisma.device.findMany({ orderBy: { bedNumber: 'asc' } }),
      prisma.monitoringSession.findMany({
        take: 5,
        orderBy: { startTime: 'desc' },
        include: {
          student: { include: { user: true } },
          doctor: { include: { user: true } }
        }
      })
    ]);

    const devices = getDevicesWithLiveStatus(rawDevices);

    const activeBed1 = await prisma.monitoringSession.findFirst({
      where: { bedNumber: 1, status: 'ACTIVE' },
      include: { student: { include: { user: true } }, doctor: { include: { user: true } } }
    });

    const activeBed2 = await prisma.monitoringSession.findFirst({
      where: { bedNumber: 2, status: 'ACTIVE' },
      include: { student: { include: { user: true } }, doctor: { include: { user: true } } }
    });

    return res.json({
      stats: {
        totalDoctors,
        totalStudents,
        activeSessions,
        connectedDevices: devices.filter(d => d.status === 'ONLINE').length,
        totalDevices: devices.length
      },
      beds: {
        bed1: activeBed1,
        bed2: activeBed2
      },
      devices,
      recentSessions
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return res.status(500).json({ message: 'Failed to fetch admin dashboard statistics' });
  }
});

// GET /api/admin/doctors
router.get('/doctors', async (req, res) => {
  try {
    const { search, specialization, status } = req.query;

    const where = {};
    if (specialization && specialization !== 'ALL') {
      where.specialization = specialization;
    }

    const doctors = await prisma.doctorProfile.findMany({
      where,
      include: {
        user: true,
        assignedStudents: {
          include: { user: true }
        },
        _count: {
          select: { sessions: true, prescriptions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Normalize to guarantee user presence
    const normalizedDoctors = doctors.map(doc => ({
      ...doc,
      user: doc.user || {
        firstName: 'Medical',
        lastName: 'Officer',
        email: 'doctor@lnmiit.ac.in',
        phone: '',
        status: 'ACTIVE'
      }
    }));

    // Apply search filter in-memory if search param provided
    let filtered = normalizedDoctors;
    if (search) {
      const q = search.toLowerCase();
      filtered = normalizedDoctors.filter(doc =>
        (doc.user.firstName || '').toLowerCase().includes(q) ||
        (doc.user.lastName || '').toLowerCase().includes(q) ||
        (doc.doctorId || '').toLowerCase().includes(q) ||
        (doc.specialization || '').toLowerCase().includes(q) ||
        (doc.user.email || '').toLowerCase().includes(q)
      );
    }

    if (status && status !== 'ALL') {
      filtered = filtered.filter(doc => doc.user.status === status);
    }

    return res.json(filtered);
  } catch (err) {
    console.error('Fetch doctors error:', err);
    return res.status(500).json({ message: 'Failed to fetch doctors list' });
  }
});

// POST /api/admin/doctors
router.post('/doctors', async (req, res) => {
  try {
    const doctorSchema = z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email('Invalid email address'),
      phone: z.string().optional(),
      doctorId: z.string().min(1, 'Doctor ID is required'),
      specialization: z.string().min(1, 'Specialization is required'),
      qualification: z.string().min(1, 'Qualification is required'),
      experience: z.coerce.number().min(0, 'Experience must be positive'),
      department: z.string().default('Campus Medical Centre'),
      availableDays: z.string().default('Mon - Sat'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
    });

    const parsed = doctorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    }

    const data = parsed.data;

    // Check if doctorId exists
    const existingDoctorId = await prisma.doctorProfile.findFirst({
      where: { doctorId: data.doctorId }
    });

    if (existingDoctorId) {
      return res.status(409).json({ message: `Doctor ID "${data.doctorId}" is already assigned to another doctor.` });
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase() }
    });

    let newUser;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    if (existingUser) {
      const existingDocProfile = await prisma.doctorProfile.findFirst({
        where: { userId: existingUser.id }
      });
      if (existingDocProfile) {
        return res.status(409).json({ message: `A doctor with email "${data.email}" already exists.` });
      }

      // Existing user without doctor profile: update role and create profile
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          role: 'DOCTOR',
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || existingUser.phone,
          status: data.status
        }
      });

      const docProfile = await prisma.doctorProfile.create({
        data: {
          userId: existingUser.id,
          doctorId: data.doctorId,
          specialization: data.specialization,
          qualification: data.qualification,
          experience: data.experience,
          department: data.department,
          availableDays: data.availableDays
        }
      });

      newUser = { ...existingUser, doctorProfile: docProfile };
    } else {
      newUser = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          password: hashedPassword,
          role: 'DOCTOR',
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          status: data.status,
          doctorProfile: {
            create: {
              doctorId: data.doctorId,
              specialization: data.specialization,
              qualification: data.qualification,
              experience: data.experience,
              department: data.department,
              availableDays: data.availableDays
            }
          }
        },
        include: { doctorProfile: true }
      });
    }

    // Ensure specialization is stored in specialization directory
    await prisma.doctorSpecialization.upsert({
      where: { name: data.specialization },
      update: {},
      create: { name: data.specialization }
    });

    return res.status(201).json({
      message: 'Doctor created successfully',
      doctor: newUser
    });
  } catch (err) {
    console.error('Create doctor error:', err);
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return res.status(409).json({ message: `A user or doctor with email "${req.body?.email}" already exists.` });
    }
    return res.status(500).json({ message: 'Server error creating doctor profile' });
  }
});

// PUT /api/admin/doctors/:id
router.put('/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params; // DoctorProfile ID
    const { firstName, lastName, phone, specialization, qualification, experience, department, availableDays, status } = req.body;

    const docProfile = await prisma.doctorProfile.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!docProfile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    await prisma.user.update({
      where: { id: docProfile.userId },
      data: {
        firstName: firstName || docProfile.user.firstName,
        lastName: lastName || docProfile.user.lastName,
        phone: phone !== undefined ? phone : docProfile.user.phone,
        status: status || docProfile.user.status
      }
    });

    const updatedProfile = await prisma.doctorProfile.update({
      where: { id },
      data: {
        specialization: specialization || docProfile.specialization,
        qualification: qualification || docProfile.qualification,
        experience: experience !== undefined ? parseInt(experience) : docProfile.experience,
        department: department || docProfile.department,
        availableDays: availableDays || docProfile.availableDays
      },
      include: { user: true }
    });

    return res.json({ message: 'Doctor updated successfully', doctor: updatedProfile });
  } catch (err) {
    console.error('Update doctor error:', err);
    return res.status(500).json({ message: 'Failed to update doctor' });
  }
});

// DELETE /api/admin/doctors/:id
router.delete('/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const docProfile = await prisma.doctorProfile.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!docProfile) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Toggle status to INACTIVE or delete if no linked sessions
    const sessionCount = await prisma.monitoringSession.count({ where: { doctorId: id } });

    if (sessionCount > 0) {
      // Soft deactivate to preserve medical audit trail
      await prisma.user.update({
        where: { id: docProfile.userId },
        data: { status: 'INACTIVE' }
      });
      return res.json({ message: 'Doctor has historical monitoring sessions. Account has been deactivated.' });
    } else {
      await prisma.user.delete({ where: { id: docProfile.userId } });
      return res.json({ message: 'Doctor removed successfully.' });
    }
  } catch (err) {
    console.error('Delete doctor error:', err);
    return res.status(500).json({ message: 'Failed to remove doctor' });
  }
});

// GET /api/admin/students
router.get('/students', async (req, res) => {
  try {
    const { search } = req.query;
    const students = await prisma.studentProfile.findMany({
      include: {
        user: true,
        assignedDoctor: {
          include: { user: true }
        },
        _count: {
          select: { sessions: true, prescriptions: true, medicalReports: true }
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
    console.error('Fetch students error:', err);
    return res.status(500).json({ message: 'Failed to fetch students list' });
  }
});

// PUT /api/admin/students/:id/assign-doctor
router.put('/students/:id/assign-doctor', async (req, res) => {
  try {
    const { id } = req.params; // studentProfile id
    const { doctorId } = req.body; // doctorProfile id

    const student = await prisma.studentProfile.update({
      where: { id },
      data: { assignedDoctorId: doctorId || null },
      include: {
        user: true,
        assignedDoctor: { include: { user: true } }
      }
    });

    return res.json({ message: 'Assigned doctor updated successfully', student });
  } catch (err) {
    console.error('Assign doctor error:', err);
    return res.status(500).json({ message: 'Failed to assign doctor' });
  }
});

// GET /api/admin/devices
router.get('/devices', async (req, res) => {
  try {
    const rawDevices = await prisma.device.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return res.json(getDevicesWithLiveStatus(rawDevices));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch devices' });
  }
});

// GET /api/admin/specializations
router.get('/specializations', async (req, res) => {
  try {
    const specializations = await prisma.doctorSpecialization.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(specializations);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch specializations' });
  }
});

// POST /api/admin/specializations
router.post('/specializations', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Specialization name is required' });

    const spec = await prisma.doctorSpecialization.create({
      data: { name, description }
    });
    return res.status(201).json(spec);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to add specialization' });
  }
});

module.exports = router;
