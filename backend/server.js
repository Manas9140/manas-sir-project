import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import serviceRequestRoutes from './routes/serviceRequestRoutes.js';
import offerRoutes from './routes/offerRoutes.js';

dotenv.config();

// Ensure uploads folder exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

const app = express();
const server = http.createServer(app);

// Socket.IO Server Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Attach socketio instance to express app
app.set('socketio', io);

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.IO] New client connected: ${socket.id}`);

  // Vendor joins their target pincode room
  socket.on('joinPincodeRoom', (pincode) => {
    if (pincode) {
      const roomName = String(pincode).startsWith('pincode_') ? pincode : `pincode_${pincode}`;
      socket.join(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} joined room: ${roomName}`);
    }
  });

  // Generic room join handler (supports room names like pincode_XXXXXX or city_XXXX)
  socket.on('joinRoom', (room) => {
    if (room) {
      socket.join(room);
      console.log(`[Socket.IO] Socket ${socket.id} joined room: ${room}`);
    }
  });

  // Service Request room join handler (request_${serviceRequestId})
  socket.on('joinRequestRoom', (serviceRequestId) => {
    if (serviceRequestId) {
      const roomName = String(serviceRequestId).startsWith('request_')
        ? serviceRequestId
        : `request_${serviceRequestId}`;
      socket.join(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} joined room: ${roomName}`);
    }
  });

  socket.on('leaveRequestRoom', (serviceRequestId) => {
    if (serviceRequestId) {
      const roomName = String(serviceRequestId).startsWith('request_')
        ? serviceRequestId
        : `request_${serviceRequestId}`;
      socket.leave(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} left room: ${roomName}`);
    }
  });

  // Leave room
  socket.on('leavePincodeRoom', (pincode) => {
    if (pincode) {
      const roomName = String(pincode).startsWith('pincode_') ? pincode : `pincode_${pincode}`;
      socket.leave(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} left room: ${roomName}`);
    }
  });

  socket.on('leaveRoom', (room) => {
    if (room) {
      socket.leave(room);
      console.log(`[Socket.IO] Socket ${socket.id} left room: ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

import vendorAuthRoutes from './routes/vendorAuthRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { setupChatSocket } from './socket/chatSocket.js';

// Setup Chat Socket.IO handlers
setupChatSocket(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendor/auth', vendorAuthRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is active and running with Socket.IO' });
});

// Connect DB and Start HTTP & WebSocket Server
const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Express & Socket.IO server running on http://0.0.0.0:${PORT}`);
  });
}).catch((err) => {
  console.error('[Server Error] Failed to connect DB', err);
});
