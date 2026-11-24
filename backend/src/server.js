require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const simulator = require('./services/simulator');
const { processSensorPacket } = require('./services/iotProcessor');

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
  // Direct sensor packet receiver if Node-RED sends via Socket.IO
  socket.on('IOT_SENSOR_DATA', async (data) => {
    try {
      const result = await processSensorPacket(data, io, 'Socket.IO');
      socket.emit('ACK', { success: true, timestamp: result.timestamp });
    } catch (err) {
      socket.emit('ERROR', { error: err.message });
    }
  });

  socket.on('AUTHENTICATE', (token) => {
    try {
      if (!token) return;
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.role = decoded.role;

      if (decoded.role === 'ADMIN') socket.join('role:admin');
      if (decoded.role === 'DOCTOR') socket.join('role:doctor');
      if (decoded.role === 'STUDENT') socket.join(`student:${decoded.userId}`);

      socket.emit('AUTHENTICATED', { status: 'OK', role: decoded.role });
    } catch (err) {
      socket.emit('AUTH_ERROR', { message: 'Invalid socket auth token' });
    }
  });

  socket.on('JOIN_BED', (bedNumber) => {
    socket.join(`bed:${bedNumber}`);
  });

  socket.on('LEAVE_BED', (bedNumber) => {
    socket.leave(`bed:${bedNumber}`);
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Start Sensor Simulator loop
simulator.start();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` LNMIIT Smart Healthcare System Backend Running`);
  console.log(` Server Port:      http://localhost:${PORT}`);
  console.log(` WebSocket Ingest: ws://localhost:${PORT}/ws/iot`);
  console.log(` Socket.IO:        Enabled on port ${PORT}`);
  console.log(` Database:         MongoDB (lnmiit_healthcare @ 127.0.0.1:27017)`);
  console.log(` Mode:             WebSocket Ingest & MongoDB ODM`);
  console.log(`====================================================`);
});
