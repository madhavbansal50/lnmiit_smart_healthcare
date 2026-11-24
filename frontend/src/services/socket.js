import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (!socket) {
    socket = io({
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to backend server:', socket.id);
      const token = localStorage.getItem('lnmiit_health_token');
      if (token) {
        socket.emit('AUTHENTICATE', token);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected from server');
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};
