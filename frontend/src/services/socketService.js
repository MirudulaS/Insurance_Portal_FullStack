import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

/**
 * Real-time service - backed by an actual Socket.IO connection.
 * Pages and contexts subscribe with on()/off(); the events are emitted by the backend.
 */
let socket = null;

function connect() {
  if (socket) return socket;
  const token = localStorage.getItem('authToken');
  socket = io(SOCKET_URL, { auth: { token }, autoConnect: true });
  return socket;
}

function on(event, handler) {
  const s = connect();
  s.on(event, handler);
  return () => s.off(event, handler);
}

function off(event, handler) {
  socket?.off(event, handler);
}

function emit(event, payload) {
  connect().emit(event, payload);
}

function disconnect() {
  socket?.disconnect();
  socket = null;
}

const socketService = { on, off, emit, connect, disconnect };
export default socketService;
