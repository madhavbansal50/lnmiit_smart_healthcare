require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const simulator = require('./services/simulator');
const prisma = require('./services/prisma');
const { processSensorPacket } = require('./services/iotProcessor');
const { initNodeRedClient, nodeRedClient } = require('./services/nodeRedClient');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const doctorsRoutes = require('./routes/doctors');
const studentsRoutes = require('./routes/students');
const sessionsRoutes = require('./routes/sessions');
const clinicalNotesRoutes = require('./routes/clinicalNotes');
const prescriptionsRoutes = require('./routes/prescriptions');
const reportsRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const notificationsRoutes = require('./routes/notifications');
const devicesRoutes = require('./routes/devices');
const iotRoutes = require('./routes/iot');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'lnmiit_smart_healthcare_super_secret_jwt_key_2026';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Attach Socket.IO for React Frontend
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);
simulator.setSocketIO(io);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/clinical-notes', clinicalNotesRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/edge', devicesRoutes);
app.use('/api/iot', iotRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'LNMIIT Smart Healthcare Backend',
    database: 'MongoDB (lnmiit_healthcare)',
    webSocketServer: 'ws://<HOST>:5000/ws/iot',
    socketIO: 'http://<HOST>:5000',
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// RAW WEBSOCKET SERVER FOR NODE-RED (Built-in Node-RED 'websocket out' node)
// Target URL: ws://<HOST>:5000/ws/iot or ws://<HOST>:5000/ws
// =============================================================================
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, req) => {
  const remoteIp = req.socket.remoteAddress;
  console.log(`[WebSocket Server] Node-RED client connected from ${remoteIp} (URL: ${req.url})`);

  ws.send(JSON.stringify({
    type: 'CONNECTION_ACK',
    status: 'CONNECTED',
    message: 'LNMIIT Smart Healthcare WebSocket Server Active. Stream JSON sensor packets now.',
    endpoint: req.url,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', async (message) => {
    try {
      const text = message.toString();
      const parsed = JSON.parse(text);
      const result = await processSensorPacket(parsed, io, 'WebSocket');

      // Send ACK back to Node-RED
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          status: 'ACK',
          success: true,
          bedNumber: result.bedNumber,
          riskLevel: result.riskLevel,
          timestamp: result.timestamp
        }));
      }
    } catch (err) {
      console.error('[WebSocket Server] Error processing packet:', err.message);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ status: 'ERROR', error: err.message }));
      }
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket Server] Node-RED client disconnected (${remoteIp})`);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket Server] Socket error:', err.message);
  });
});

// Handle HTTP upgrade to WebSocket for /ws paths (without conflicting with Socket.IO)
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url.split('?')[0];
  if (pathname.startsWith('/ws') || pathname.startsWith('/iot') || pathname === '/vitals') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
  // Socket.IO handles its own upgrades for /socket.io/
});

// =============================================================================
// SOCKET.IO EVENT HANDLERS (For React Frontend & Socket.IO Clients)
// =============================================================================
io.on('connection', (socket) => {
  // Send current Node-RED connection status indicator
  socket.emit('NODERED_STATUS', nodeRedClient.getStatus());

  // Direct sensor packet receiver if Node-RED sends via Socket.IO
  socket.on('IOT_SENSOR_DATA', async (data) => {
    try {
      const result = await processSensorPacket(data, io, 'Socket.IO');
      socket.emit('ACK', { success: true, timestamp: result.timestamp });
    } catch (err) {
      socket.emit('ERROR', { error: err.message });
    }
  });

  // Strict Role-Based Socket Authentication & Room Allocation
  socket.on('AUTHENTICATE', async (token) => {
    try {
      if (!token) return;
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.role = decoded.role;

      if (decoded.role === 'ADMIN' || decoded.role === 'DOCTOR') {
        socket.join('role:admin');
        socket.join('role:doctor');
        // Doctors and Admins can observe all bed streams
        socket.join('bed:1');
        socket.join('bed:2');

        socket.emit('AUTHENTICATED', { status: 'OK', role: decoded.role });

        // Provide immediate latest dual sensor state to doctor
        if (nodeRedClient.lastData) {
          socket.emit('SENSOR_DATA_UPDATE', nodeRedClient.lastData);
        }
      } else if (decoded.role === 'STUDENT') {
        socket.join(`student:${decoded.userId}`);

        // Lookup student profile and currently active monitoring session
        const studentProfile = await prisma.studentProfile.findFirst({
          where: { userId: decoded.userId }
        });

        if (studentProfile) {
          socket.studentProfileId = studentProfile.id;
          const activeSession = await prisma.monitoringSession.findFirst({
            where: { studentId: studentProfile.id, status: 'ACTIVE' }
          });

          if (activeSession) {
            socket.assignedBed = activeSession.bedNumber;
            // Student ONLY joins their assigned bed room; strictly forbidden from other beds
            socket.leave('bed:1');
            socket.leave('bed:2');
            socket.join(`bed:${activeSession.bedNumber}`);

            socket.emit('ASSIGNED_BED', {
              bedNumber: activeSession.bedNumber,
              sessionId: activeSession.id
            });

            // Emit initial hardware sensor reading strictly for their assigned bed
            if (nodeRedClient.lastData) {
              if (activeSession.bedNumber === 1 && nodeRedClient.lastData.esp32_1) {
                socket.emit('SENSOR_DATA_UPDATE', {
                  esp32_1: nodeRedClient.lastData.esp32_1,
                  timestamp: nodeRedClient.lastData.timestamp,
                  source: nodeRedClient.lastData.source,
                  isLiveHardware: nodeRedClient.lastData.isLiveHardware,
                  transport: nodeRedClient.lastData.transport,
                  bedNumber: 1
                });
              } else if (activeSession.bedNumber === 2 && nodeRedClient.lastData.esp32_2) {
                socket.emit('SENSOR_DATA_UPDATE', {
                  esp32_2: nodeRedClient.lastData.esp32_2,
                  timestamp: nodeRedClient.lastData.timestamp,
                  source: nodeRedClient.lastData.source,
                  isLiveHardware: nodeRedClient.lastData.isLiveHardware,
                  transport: nodeRedClient.lastData.transport,
                  bedNumber: 2
                });
              }
            }
          } else {
            socket.assignedBed = null;
            socket.leave('bed:1');
            socket.leave('bed:2');
            socket.emit('NO_ACTIVE_BED', {
              message: 'No active clinical monitoring session currently assigned.'
            });
          }
        }

        socket.emit('AUTHENTICATED', {
          status: 'OK',
          role: 'STUDENT',
          assignedBed: socket.assignedBed || null
        });
      }
    } catch (err) {
      socket.emit('AUTH_ERROR', { message: 'Invalid socket auth token' });
    }
  });

  // Secure Bed Stream Subscription: verifies backend authorization before allowing room join
  socket.on('JOIN_BED', async (requestedBed) => {
    const bed = parseInt(requestedBed, 10);
    if (!bed || (bed !== 1 && bed !== 2)) {
      return socket.emit('ERROR', { code: 'INVALID_BED', message: 'Bed must be 1 or 2' });
    }

    // Doctors & Admins are authorized to view all beds
    if (socket.role === 'DOCTOR' || socket.role === 'ADMIN') {
      socket.join(`bed:${bed}`);
      return socket.emit('JOINED_BED', { bedNumber: bed });
    }

    // Students are strictly restricted to their assigned bed
    if (socket.role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findFirst({
        where: { userId: socket.userId }
      });
      if (!studentProfile) {
        return socket.emit('ERROR', { code: 'FORBIDDEN', message: 'Student profile not found.' });
      }

      const activeSession = await prisma.monitoringSession.findFirst({
        where: { studentId: studentProfile.id, status: 'ACTIVE' }
      });

      if (!activeSession || activeSession.bedNumber !== bed) {
        return socket.emit('ERROR', {
          code: 'FORBIDDEN',
          message: `Security Access Denied: You are not authorized to subscribe to Bed ${bed} telemetry.`
        });
      }

      socket.leave('bed:1');
      socket.leave('bed:2');
      socket.join(`bed:${bed}`);
      return socket.emit('JOINED_BED', { bedNumber: bed });
    }

    return socket.emit('ERROR', { code: 'UNAUTHORIZED', message: 'Authentication required before subscribing to a bed stream.' });
  });

  socket.on('LEAVE_BED', (bedNumber) => {
    socket.leave(`bed:${bedNumber}`);
  });

  socket.on('disconnect', () => {
    // client disconnected
  });
});

// Sensor Simulator: only run if explicitly enabled via ENABLE_SIMULATOR=true
if (process.env.ENABLE_SIMULATOR === 'true') {
  simulator.start();
} else {
  console.log('[Simulator] Auto-simulation is DISABLED. Live monitoring is strictly in REAL HARDWARE mode.');
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` LNMIIT Smart Healthcare System Backend Running`);
  console.log(` Server Port:      http://localhost:${PORT}`);
  console.log(` Node-RED Bridge:  Connecting to ws://172.20.10.2:1880/ws/sensors`);
  console.log(` WebSocket Ingest: ws://localhost:${PORT}/ws/iot`);
  console.log(` Socket.IO:        Enabled on port ${PORT}`);
  console.log(` Database:         MongoDB (lnmiit_healthcare @ 127.0.0.1:27017)`);
  console.log(` Mode:             Node-RED Bridge & MongoDB ODM`);
  console.log(`====================================================`);

  // Start Node-RED WebSocket Client bridge
  initNodeRedClient(io);
});
