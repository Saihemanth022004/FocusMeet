import { io, Socket } from 'socket.io-client';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Socket.io client connected to the FastAPI AI service.
 *
 * The socket is created lazily — it only connects when the first component
 * calls `socket.connect()`. This avoids an open connection on public pages
 * like login/register.
 */
const socket: Socket = io(AI_SERVICE_URL, {
  autoConnect: false,  // connect manually after authentication
  transports: ['websocket', 'polling'],
  withCredentials: true,
});

// ── Debug listeners (stripped in production builds) ───────────────────────
if (import.meta.env.DEV) {
  socket.on('connect', () => {
    console.log('[Socket] Connected to AI service:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });
}

export default socket;
