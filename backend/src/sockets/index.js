const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(); // allow anonymous connect; just won't join a user room
      const payload = jwt.verify(token, env.jwt.secret);
      socket.user = payload;
      next();
    } catch (err) {
      next(); // don't hard-fail the socket connection on a bad token
    }
  });

  io.on('connection', (socket) => {
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      socket.join(`role:${socket.user.role}`);
      if (socket.user.linkedId) socket.join(`org:${socket.user.linkedId}`);
      if (socket.user.role === 'PATIENT' && socket.user.linkedId) socket.join(`patient:${socket.user.linkedId}`);
    }
  });

  return io;
}

// Broadcasts to everyone connected - used for status changes that any open
// dashboard might care about (frontend filters client-side by its own scope).
// Patient logins are deliberately left out of the broadcast: they only receive
// events about their own record, via emitToPatient / emitToRooms below.
function emit(event, payload) {
  if (!io) return;
  io.except('role:PATIENT').emit(event, payload);
}

// Delivers an event to ONE patient's logged-in sessions only.
function emitToPatient(patientId, event, payload) {
  if (!io || !patientId) return;
  io.to(`patient:${patientId}`).emit(event, payload);
}

// Delivers an event only to the parties of a request: its patient, hospital
// and insurer (their `org:` rooms), plus admins.
function emitToParties({ patientId, hospitalId, insurerId }, event, payload) {
  if (!io) return;
  const rooms = ['role:ADMIN'];
  if (patientId) rooms.push(`patient:${patientId}`);
  if (hospitalId) rooms.push(`org:${hospitalId}`);
  if (insurerId) rooms.push(`org:${insurerId}`);
  io.to(rooms).emit(event, payload);
}

// Targeted delivery for a specific user - used for notifications.
function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { initSocket, emit, emitToUser, emitToPatient, emitToParties };
