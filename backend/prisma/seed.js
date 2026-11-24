const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding LNMIIT Smart Healthcare System database...');

  // Clean existing records in reverse dependency order
  await prisma.notification.deleteMany();
  await prisma.reportSummary.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.clinicalNote.deleteMany();
  await prisma.riskEvent.deleteMany();
  await prisma.vitalsReading.deleteMany();
  await prisma.monitoringSession.deleteMany();
  await prisma.healthBaseline.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.doctorSpecialization.deleteMany();
  await prisma.device.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const doctorPassword = await bcrypt.hash('doctor123', salt);
  const studentPassword = await bcrypt.hash('student123', salt);

  // 1. Create Specializations
  const specializations = [
    { name: 'General Medicine', description: 'Primary diagnosis, viral fevers, general campus health' },
    { name: 'Cardiology', description: 'Heart rhythm analysis, tachycardia, blood pressure evaluation' },
    { name: 'Orthopedics', description: 'Sports injuries, sprains, musculoskeletal complaints' },
    { name: 'Neurology', description: 'Headaches, migraines, dizziness, neural assessments' },
    { name: 'Dermatology', description: 'Skin allergies, rashes, contact dermatitis' },
    { name: 'Pediatrics', description: 'Adolescent and youth health guidance' },
    { name: 'Emergency Medicine', description: 'Acute trauma, severe anaphylaxis, critical vitals stabilization' },
    { name: 'Sports Medicine', description: 'Athletic injury rehabilitation and sports conditioning' }
  ];

  for (const s of specializations) {
    await prisma.doctorSpecialization.create({ data: s });
  }

  // 2. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@lnmiit.ac.in',
      password: adminPassword,
      role: 'ADMIN',
      firstName: 'Prof. R.S.',
      lastName: 'Rathore',
      phone: '+91 94140 00001',
      status: 'ACTIVE'
    }
  });

  // 3. Create Doctors
  const doctorUsers = [
    {
      email: 'dr.sharma@lnmiit.ac.in',
      firstName: 'Alok',
      lastName: 'Sharma',
      phone: '+91 98290 12345',
      doctorId: 'DOC-MED-01',
      specialization: 'General Medicine',
      qualification: 'MBBS, MD (Internal Medicine - SMS Medical College)',
      experience: 12,
      department: 'Campus Medical Centre',
      availableDays: 'Mon - Fri (09:00 - 17:00)',
      bio: 'Senior Consultant in General & Preventive Medicine at LNMIIT campus clinic with over a decade of clinical care.'
    },
    {
      email: 'dr.verma@lnmiit.ac.in',
      firstName: 'Sunita',
      lastName: 'Verma',
      phone: '+91 98290 67890',
      doctorId: 'DOC-CARD-02',
      specialization: 'Cardiology',
      qualification: 'MBBS, MD, DM (Cardiology - AIIMS Delhi)',
      experience: 15,
      department: 'Cardiology & Intensive Care',
      availableDays: 'Tue, Thu, Sat (10:00 - 16:00)',
      bio: 'Cardiologist specializing in autonomic regulation, ambulatory ECG interpretation, and sports cardiology.'
    },
    {
      email: 'dr.mehta@lnmiit.ac.in',
      firstName: 'Rajesh',
      lastName: 'Mehta',
      phone: '+91 98290 54321',
      doctorId: 'DOC-ORTH-03',
      specialization: 'Orthopedics',
      qualification: 'MBBS, MS (Orthopedics - PGIMER)',
      experience: 8,
      department: 'Sports & Musculoskeletal Care',
      availableDays: 'Mon, Wed, Fri (11:00 - 18:00)',
      bio: 'Orthopedic specialist managing sports injuries, acute joint trauma, and campus athletic care.'
    },
    {
      email: 'dr.kapoor@lnmiit.ac.in',
      firstName: 'Priya',
      lastName: 'Kapoor',
      phone: '+91 98290 99887',
      doctorId: 'DOC-NEUR-04',
      specialization: 'Neurology',
      qualification: 'MBBS, MD (Medicine), DM (Neurology - NIMHANS)',
      experience: 9,
      department: 'Neurological Sciences',
      availableDays: 'Mon - Thu (14:00 - 19:00)',
      bio: 'Specialist in student neurological health, chronic stress headaches, migraine management, and sleep disorders.'
    }
  ];

  const createdDoctors = [];
  for (const doc of doctorUsers) {
    const user = await prisma.user.create({
      data: {
        email: doc.email,
        password: doctorPassword,
        role: 'DOCTOR',
        firstName: doc.firstName,
        lastName: doc.lastName,
        phone: doc.phone,
        status: 'ACTIVE'
      }
    });

    const profile = await prisma.doctorProfile.create({
      data: {
        userId: user.id,
        doctorId: doc.doctorId,
        specialization: doc.specialization,
        qualification: doc.qualification,
        experience: doc.experience,
        department: doc.department,
        availableDays: doc.availableDays,
        bio: doc.bio
      }
    });
    createdDoctors.push({ user, profile });
  }

  // 4. Create Students
  const studentData = [
    {
      email: 'student.aarav@lnmiit.ac.in',
      firstName: 'Aarav',
      lastName: 'Patel',
      rollNumber: '21UEC045',
      branch: 'Electronics and Communication Engineering',
      yearOfStudy: 4,
      age: 21,
      gender: 'Male',
      bloodGroup: 'B+',
      allergies: 'Penicillin, Dust Mites',
      chronicConditions: 'Mild seasonal asthma',
      hostelRoom: 'BH-1, Room 214',
      emergencyContactName: 'Ramesh Patel (Father)',
      emergencyContactPhone: '+91 94140 11223',
      assignedDoctorIdx: 0
    },
    {
      email: 'student.ananya@lnmiit.ac.in',
      firstName: 'Ananya',
      lastName: 'Gupta',
      rollNumber: '22UCS102',
      branch: 'Computer Science and Engineering',
      yearOfStudy: 3,
      age: 20,
      gender: 'Female',
      bloodGroup: 'O+',
      allergies: 'Sulfa Drugs',
      chronicConditions: 'None reported',
      hostelRoom: 'GH-2, Room 108',
      emergencyContactName: 'Meenakshi Gupta (Mother)',
      emergencyContactPhone: '+91 94140 33445',
      assignedDoctorIdx: 1
    },
    {
      email: 'student.rohan@lnmiit.ac.in',
      firstName: 'Rohan',
      lastName: 'Verma',
      rollNumber: '23UME015',
      branch: 'Mechanical Engineering',
      yearOfStudy: 2,
      age: 19,
      gender: 'Male',
      bloodGroup: 'A+',
      allergies: 'None reported',
      chronicConditions: 'None reported',
      hostelRoom: 'BH-3, Room 304',
      emergencyContactName: 'Vikram Verma (Brother)',
      emergencyContactPhone: '+91 94140 55667',
      assignedDoctorIdx: 2
    },
    {
      email: 'student.ishita@lnmiit.ac.in',
      firstName: 'Ishita',
      lastName: 'Sen',
      rollNumber: '24UCC028',
      branch: 'Communication and Computer Engineering',
      yearOfStudy: 1,
      age: 18,
      gender: 'Female',
      bloodGroup: 'AB+',
      allergies: 'Peanuts',
      chronicConditions: 'Occasional vestibular migraine',
      hostelRoom: 'GH-1, Room 112',
      emergencyContactName: 'Debashis Sen (Father)',
      emergencyContactPhone: '+91 94140 77889',
      assignedDoctorIdx: 3
    }
  ];

  const createdStudents = [];
  for (const s of studentData) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        password: studentPassword,
        role: 'STUDENT',
        firstName: s.firstName,
        lastName: s.lastName,
        phone: '+91 98765 ' + Math.floor(10000 + Math.random() * 90000),
        status: 'ACTIVE'
      }
    });

    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        rollNumber: s.rollNumber,
        branch: s.branch,
        yearOfStudy: s.yearOfStudy,
        age: s.age,
        gender: s.gender,
        bloodGroup: s.bloodGroup,
        allergies: s.allergies,
        chronicConditions: s.chronicConditions,
        hostelRoom: s.hostelRoom,
        emergencyContactName: s.emergencyContactName,
        emergencyContactPhone: s.emergencyContactPhone,
        assignedDoctorId: createdDoctors[s.assignedDoctorIdx].profile.id
      }
    });

    // Create Baseline
    await prisma.healthBaseline.create({
      data: {
        studentId: profile.id,
        baselineHeartRate: 72 + Math.floor(Math.random() * 6),
        baselineSpo2: 98.2,
        baselineTemperature: 36.8,
        totalSessionsRecorded: 3
      }
    });

    createdStudents.push({ user, profile });
  }

  // 5. Create Sensor Devices
  const devices = [
    {
      deviceId: 'ESP32_BED_1',
      name: 'Bed 1 ESP32 Sensor Unit',
      type: 'ESP32_SENSOR',
      bedNumber: 1,
      macAddress: '24:6F:28:B4:E1:01',
      ipAddress: '192.168.1.101',
      status: 'ONLINE',
      isRealHardware: false, // Clearly labeled Demo Simulator
      firmwareVersion: 'v1.2.4-lnmiit-esp32'
    },
    {
      deviceId: 'ESP32_BED_2',
      name: 'Bed 2 ESP32 Sensor Unit',
      type: 'ESP32_SENSOR',
      bedNumber: 2,
      macAddress: '24:6F:28:B4:E1:02',
      ipAddress: '192.168.1.102',
      status: 'ONLINE',
      isRealHardware: false, // Clearly labeled Demo Simulator
      firmwareVersion: 'v1.2.4-lnmiit-esp32'
    },
    {
      deviceId: 'RPI_EDGE_01',
      name: 'Raspberry Pi 4 Edge Gateway',
      type: 'EDGE_GATEWAY',
      bedNumber: null,
      macAddress: 'B8:27:EB:D3:44:A1',
      ipAddress: '192.168.1.50',
      status: 'ONLINE',
      isRealHardware: false,
      firmwareVersion: 'v2.1.0-rpi-edge'
    },
    {
      deviceId: 'NLP_SERVICE',
      name: 'LNMIIT Bio-NLP Microservice',
      type: 'AI_SERVICE',
      bedNumber: null,
      macAddress: '00:00:00:00:00:00',
      ipAddress: '127.0.0.1:8000',
      status: 'ONLINE',
      isRealHardware: false,
      firmwareVersion: 'v1.0.0-fastapi'
    }
  ];

  const createdDevices = {};
  for (const dev of devices) {
    const d = await prisma.device.create({ data: dev });
    createdDevices[d.deviceId] = d;
  }

  // 6. Create Historical Completed Sessions for Aarav, Ananya, and Rohan
  const pastSessions = [
    {
      studentIdx: 0, // Aarav
      doctorIdx: 0, // Dr. Sharma
      bedNumber: 1,
      deviceId: createdDevices['ESP32_BED_1'].id,
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 48 + 1000 * 60 * 25), // 25 mins
      durationMinutes: 25,
      status: 'COMPLETED',
      chiefComplaint: 'Viral fever, generalized body fatigue, mild headache after late lab work.',
      initialRiskLevel: 'MONITOR',
      peakRiskLevel: 'ATTENTION',
      finalRiskLevel: 'NORMAL',
      avgHeartRate: 86.4,
      avgSpo2: 97.5,
      avgTemperature: 38.1,
      summary: 'Patient responded well to hydration and paracetamol in campus clinic. Temperature stabilized from 38.4C to 37.2C.',
      notes: {
        complaint: 'Viral fever, body aches for 2 days',
        observations: 'Mild pharyngeal erythema. Bilateral chest clear to auscultation. Pulse regular at 88 bpm. Mild dehydration noticed.',
        diagnosis: 'Acute Viral Pharyngitis with Mild Dehydration',
        instructions: 'Rest in hostel room. Consume minimum 3L fluids/ORS daily. Light diet. Isolate if fever crosses 38.5C.',
        followUp: 'Review in 48 hours if fever persists beyond 3 days.'
      },
      prescriptions: [
        { name: 'Paracetamol', dosage: '650 mg', frequency: 'Thrice daily', duration: '3 days', instructions: 'Take after meals' },
        { name: 'Oral Rehydration Salts (ORS)', dosage: '1 sachet in 1L water', frequency: 'Throughout the day', duration: '2 days', instructions: 'Sip gradually' },
        { name: 'Cetirizine', dosage: '10 mg', frequency: 'Once daily at bedtime', duration: '3 days', instructions: 'For runny nose and mild allergic irritation' }
      ]
    },
    {
      studentIdx: 1, // Ananya
      doctorIdx: 1, // Dr. Verma (Cardiologist)
      bedNumber: 2,
      deviceId: createdDevices['ESP32_BED_2'].id,
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 96), // 4 days ago
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 96 + 1000 * 60 * 30), // 30 mins
      durationMinutes: 30,
      status: 'COMPLETED',
      chiefComplaint: 'Intermittent palpitations during semester end exams, high caffeine intake.',
      initialRiskLevel: 'ATTENTION',
      peakRiskLevel: 'ATTENTION',
      finalRiskLevel: 'NORMAL',
      avgHeartRate: 104.2,
      avgSpo2: 98.8,
      avgTemperature: 36.9,
      summary: 'Sinus tachycardia secondary to caffeine excess and sleep deprivation. Normal rhythm returned after 20 mins rest.',
      notes: {
        complaint: 'Palpitations, anxiety, lack of sleep (3 hours/night)',
        observations: 'Resting pulse 108 bpm, regular. Blood pressure 124/80 mmHg. SpO2 99%. Normal heart sounds (S1 S2 normal, no murmurs).',
        diagnosis: 'Stress-induced Sinus Tachycardia (Caffeine-associated)',
        instructions: 'Strictly limit coffee/energy drinks to zero for 1 week. Ensure at least 7 hours sleep. Practice deep breathing.',
        followUp: 'Follow up after 1 week or report immediately if chest pain or syncope occurs.'
      },
      prescriptions: [
        { name: 'Propranolol', dosage: '10 mg', frequency: 'As needed (SOS) for acute palpitations', duration: '5 days', instructions: 'Take only if pulse exceeds 110 bpm at rest' },
        { name: 'Magnesium Glycinate', dosage: '200 mg', frequency: 'Once daily at bedtime', duration: '10 days', instructions: 'Take with food to assist relaxation and sleep' }
      ]
    },
    {
      studentIdx: 2, // Rohan
      doctorIdx: 2, // Dr. Mehta (Ortho)
      bedNumber: 1,
      deviceId: createdDevices['ESP32_BED_1'].id,
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 120), // 5 days ago
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 120 + 1000 * 60 * 20),
      durationMinutes: 20,
      status: 'COMPLETED',
      chiefComplaint: 'Right ankle twist during LNMIIT inter-hostel football tournament.',
      initialRiskLevel: 'NORMAL',
      peakRiskLevel: 'NORMAL',
      finalRiskLevel: 'NORMAL',
      avgHeartRate: 78.5,
      avgSpo2: 98.4,
      avgTemperature: 36.7,
      summary: 'Grade 1 lateral ankle sprain. Vitals stable throughout. Compression wrap applied.',
      notes: {
        complaint: 'Ankle inversion injury, swelling over lateral malleolus',
        observations: 'No bony crepitus. Tenderness at anterior talofibular ligament. Weight bearing with assistance possible.',
        diagnosis: 'Acute Inversion Sprain Right Ankle (Grade I)',
        instructions: 'Follow R.I.C.E. protocol (Rest, Ice for 15 mins every 3 hours, Compression crepe bandage, Elevation).',
        followUp: 'Check in 5 days for physiotherapy assessment.'
      },
      prescriptions: [
        { name: 'Aceclofenac + Paracetamol', dosage: '100 mg / 325 mg', frequency: 'Twice daily after meals', duration: '4 days', instructions: 'Anti-inflammatory pain relief' },
        { name: 'Pantoprazole', dosage: '40 mg', frequency: 'Once daily before breakfast', duration: '4 days', instructions: 'Gastric protection' },
        { name: 'Diclofenac Gel', dosage: 'Topical application', frequency: '3 times daily', duration: '7 days', instructions: 'Gently apply over affected area, do not massage aggressively' }
      ]
    }
  ];

  for (const ps of pastSessions) {
    const student = createdStudents[ps.studentIdx].profile;
    const doctor = createdDoctors[ps.doctorIdx].profile;

    const session = await prisma.monitoringSession.create({
      data: {
        bedNumber: ps.bedNumber,
        studentId: student.id,
        doctorId: doctor.id,
        deviceId: ps.deviceId,
        startTime: ps.startTime,
        endTime: ps.endTime,
        durationMinutes: ps.durationMinutes,
        status: ps.status,
        chiefComplaint: ps.chiefComplaint,
        initialRiskLevel: ps.initialRiskLevel,
        peakRiskLevel: ps.peakRiskLevel,
        finalRiskLevel: ps.finalRiskLevel,
        summary: ps.summary,
        avgHeartRate: ps.avgHeartRate,
        avgSpo2: ps.avgSpo2,
        avgTemperature: ps.avgTemperature
      }
    });

    // Add Vitals readings for past session
    for (let i = 0; i < 15; i++) {
      const readTime = new Date(ps.startTime.getTime() + i * 1000 * 60 * 1.5);
      await prisma.vitalsReading.create({
        data: {
          sessionId: session.id,
          studentId: student.id,
          bedNumber: ps.bedNumber,
          deviceId: ps.deviceId,
          heartRate: ps.avgHeartRate + (Math.random() * 4 - 2),
          spo2: ps.avgSpo2 + (Math.random() * 1 - 0.5),
          temperature: ps.avgTemperature + (Math.random() * 0.4 - 0.2),
          riskLevel: ps.initialRiskLevel,
          riskScore: ps.initialRiskLevel === 'ATTENTION' ? 45 : 15,
          riskExplanation: 'Session baseline historical reading',
          source: 'SIMULATOR',
          timestamp: readTime
        }
      });
    }

    // Add Clinical Note
    await prisma.clinicalNote.create({
      data: {
        studentId: student.id,
        doctorId: doctor.id,
        sessionId: session.id,
        chiefComplaint: ps.notes.complaint,
        clinicalObservations: ps.notes.observations,
        diagnosis: ps.notes.diagnosis,
        instructions: ps.notes.instructions,
        followUpRecommendation: ps.notes.followUp,
        isSharedWithStudent: true,
        createdAt: ps.endTime
      }
    });

    // Add Prescription
    const presc = await prisma.prescription.create({
      data: {
        studentId: student.id,
        doctorId: doctor.id,
        sessionId: session.id,
        diagnosis: ps.notes.diagnosis,
        notes: 'Follow prescribed dosages and report adverse effects if any.',
        status: 'ACTIVE',
        createdAt: ps.endTime
      }
    });

    for (const item of ps.prescriptions) {
      await prisma.prescriptionItem.create({
        data: {
          prescriptionId: presc.id,
          medicineName: item.name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions
        }
      });
    }
  }

  // 7. Create ACTIVE Monitoring Session on Bed 1 for Aarav Patel
  const activeStudent = createdStudents[0].profile; // Aarav
  const activeDoctor = createdDoctors[0].profile; // Dr. Sharma
  const activeSessionStartTime = new Date(Date.now() - 1000 * 60 * 18); // Started 18 mins ago

  const activeSession = await prisma.monitoringSession.create({
    data: {
      bedNumber: 1,
      studentId: activeStudent.id,
      doctorId: activeDoctor.id,
      deviceId: createdDevices['ESP32_BED_1'].id,
      startTime: activeSessionStartTime,
      status: 'ACTIVE',
      chiefComplaint: 'Post-prandial dizziness, sweating and mild palpitation after gym session.',
      initialRiskLevel: 'MONITOR',
      peakRiskLevel: 'ATTENTION',
      finalRiskLevel: 'MONITOR',
      avgHeartRate: 88.5,
      avgSpo2: 97.8,
      avgTemperature: 37.1
    }
  });

  // Populate active session readings (last 18 minutes, every 1 min)
  for (let i = 0; i < 18; i++) {
    const t = new Date(activeSessionStartTime.getTime() + i * 1000 * 60);
    const hr = 84 + Math.sin(i / 2) * 6;
    const sp = 97.6 + (i % 2 === 0 ? 0.4 : -0.2);
    const temp = 37.0 + (i * 0.02);
    await prisma.vitalsReading.create({
      data: {
        sessionId: activeSession.id,
        studentId: activeStudent.id,
        bedNumber: 1,
        deviceId: createdDevices['ESP32_BED_1'].id,
        heartRate: parseFloat(hr.toFixed(1)),
        spo2: parseFloat(sp.toFixed(1)),
        temperature: parseFloat(temp.toFixed(1)),
        riskLevel: hr > 88 ? 'MONITOR' : 'NORMAL',
        riskScore: hr > 88 ? 32 : 12,
        riskExplanation: hr > 88 ? 'Heart rate slightly elevated above resting baseline.' : 'Vitals within normal limits.',
        source: 'SIMULATOR',
        timestamp: t
      }
    });
  }

  // 8. Create Realistic Medical Reports and AI Summaries
  const report1 = await prisma.medicalReport.create({
    data: {
      studentId: createdStudents[0].profile.id, // Aarav
      title: 'Complete Blood Count & Electrolyte Profile (LNMIIT Medical Camp)',
      fileName: 'LNMIIT_CBC_Electrolyte_21UEC045.pdf',
      filePath: '/uploads/LNMIIT_CBC_Electrolyte_21UEC045.pdf',
      fileSize: 245800,
      mimeType: 'application/pdf',
      extractedText: 'LNMIIT HEALTH CENTRE - LABORATORY SERVICES\nPatient: Aarav Patel | Roll: 21UEC045 | Age: 21 | Sex: M\nTEST: Complete Blood Count\nHaemoglobin: 13.8 g/dL (Normal: 13.0 - 17.0)\nWBC Count: 11,800 /mcL (HIGH, Normal: 4,000 - 11,000)\nPlatelet Count: 240,000 /mcL (Normal: 150,000 - 450,000)\nESR: 24 mm/hr (ELEVATED, Normal: 0 - 15)\nSerum Sodium: 139 mEq/L (Normal: 135 - 145)\nSerum Potassium: 4.1 mEq/L (Normal: 3.5 - 5.0)\nImpression: Mild leukocytosis with elevated ESR consistent with recent viral or resolving bacterial inflammatory response.'
    }
  });

  await prisma.reportSummary.create({
    data: {
      reportId: report1.id,
      keyFindings: '• Haemoglobin (13.8 g/dL), Platelet count (240k), and Serum electrolytes (Na 139, K 4.1) are all in healthy standard physiological ranges.\n• White Blood Cell count is mildly high at 11,800 /mcL.\n• Erythrocyte Sedimentation Rate (ESR) is elevated at 24 mm/hr.',
      abnormalValues: '• WBC Count: 11,800 /mcL (Elevated above reference ceiling 11,000 /mcL)\n• ESR: 24 mm/hr (Moderately elevated above standard reference 0-15 mm/hr)',
      possibleConcerns: 'The combination of mildly elevated WBC count and ESR typically indicates an active or resolving inflammatory response, which aligns with recent febrile illness or throat irritation. No signs of severe systemic infection or electrolyte depletion.',
      questionsToAskDoctor: '1. Does the elevated WBC count require a follow-up test after my fever has completely resolved?\n2. Should I continue with supportive hydration or is a specific antibiotic warranted?\n3. When can I safely resume competitive sports and physical gym training?',
      serviceStatus: 'FALLBACK_ENGINE',
      disclaimer: 'AI-generated summary. This is not a medical diagnosis. Please consult a qualified doctor for interpretation.'
    }
  });

  const report2 = await prisma.medicalReport.create({
    data: {
      studentId: createdStudents[1].profile.id, // Ananya
      title: 'Resting 12-Lead Electrocardiogram (ECG) Analysis',
      fileName: 'LNMIIT_ECG_Analysis_22UCS102.pdf',
      filePath: '/uploads/LNMIIT_ECG_Analysis_22UCS102.pdf',
      fileSize: 312400,
      mimeType: 'application/pdf',
      extractedText: 'LNMIIT HEALTH CENTRE - CARDIAC DIAGNOSTICS\nPatient: Ananya Gupta | Roll: 22UCS102 | Age: 20 | Sex: F\n12-Lead ECG Analysis Report\nVentricular Rate: 102 bpm (Sinus Tachycardia)\nPR Interval: 142 ms (Normal)\nQRS Duration: 84 ms (Normal)\nQT/QTcB: 348 / 454 ms (Borderline)\nP-R-T Axes: 56 62 48 degrees\nInterpretation: Normal sinus rhythm with sinus tachycardia. No pathological Q waves or acute ST-T segment deviations detected. Structurally normal conductive axis.'
    }
  });

  await prisma.reportSummary.create({
    data: {
      reportId: report2.id,
      keyFindings: '• Resting heart rhythm demonstrates standard sinus morphology with regular conduction intervals.\n• PR interval (142 ms) and QRS duration (84 ms) are normal.\n• Resting ventricular rate is elevated at 102 bpm.',
      abnormalValues: '• Ventricular Rate: 102 bpm (Sinus Tachycardia, above resting baseline of 60-100 bpm)\n• QTc Interval: 454 ms (Borderline elevation, typically influenced by rapid heart rates)',
      possibleConcerns: 'Elevated resting rate without ST elevation or conduction block is common during acute psychological stress, sleep deficits, or elevated caffeine ingestion. No signs of structural ischemic heart changes.',
      questionsToAskDoctor: '1. Does my borderline QTc interval warrant repeat testing when my heart rate is lower?\n2. Are there lifestyle adjustments to stabilize palpitations during exam weeks?\n3. Would an ambulatory Holter monitor be beneficial if palpitations recur?',
      serviceStatus: 'FALLBACK_ENGINE',
      disclaimer: 'AI-generated summary. This is not a medical diagnosis. Please consult a qualified doctor for interpretation.'
    }
  });

  // 9. Create Notifications
  const notifications = [
    {
      userId: createdDoctors[0].user.id, // Dr. Sharma
      title: 'Active Session Ongoing: Bed 1',
      message: 'Student Aarav Patel (21UEC045) is actively connected to Bed 1 sensor unit.',
      type: 'SESSION',
      link: '/doctor/monitoring'
    },
    {
      userId: createdDoctors[0].user.id,
      title: 'Attention Risk Acknowledged',
      message: 'Bed 1 transient tachycardia (94 bpm) was logged during physical adjustment.',
      type: 'ATTENTION',
      link: '/doctor/monitoring'
    },
    {
      userId: createdStudents[0].user.id, // Aarav
      title: 'Prescription Issued',
      message: 'Dr. Alok Sharma has issued a digital prescription for your viral recovery.',
      type: 'PRESCRIPTION',
      link: '/student/prescriptions'
    },
    {
      userId: createdStudents[0].user.id,
      title: 'AI Report Summary Ready',
      message: 'Your Complete Blood Count & Electrolyte report has been analyzed by the health assistant.',
      type: 'REPORT',
      link: '/student/reports'
    },
    {
      userId: createdStudents[1].user.id, // Ananya
      title: 'Follow-up Recommendation',
      message: 'Dr. Sunita Verma logged clinical advice regarding caffeine reduction and rest.',
      type: 'NOTE',
      link: '/student/history'
    },
    {
      userId: adminUser.id,
      title: 'Device Online: Bed 1 & 2 ESP32',
      message: 'Hardware sensor simulators and edge heartbeat services are active and transmitting.',
      type: 'DEVICE',
      link: '/admin/devices'
    }
  ];

  for (const notif of notifications) {
    await prisma.notification.create({ data: notif });
  }

  console.log('Seed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('DEMO ACCOUNTS READY:');
  console.log('Admin:   admin@lnmiit.ac.in      / admin123');
  console.log('Doctor:  dr.sharma@lnmiit.ac.in   / doctor123');
  console.log('Doctor:  dr.verma@lnmiit.ac.in    / doctor123');
  console.log('Student: student.aarav@lnmiit.ac.in / student123');
  console.log('Student: student.ananya@lnmiit.ac.in / student123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
