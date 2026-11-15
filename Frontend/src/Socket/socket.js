import { io } from "socket.io-client";

class SocketService {
  constructor(token) {
    this.socket = io("http://localhost:3000", {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: { token },
    });
  }

  connect() {
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  getSocket() {
    return this.socket;
  }
}

let socketService = null;

const pendingListeners = [];

export function initSocket(token) {
  if (socketService) {
    socketService.disconnect();
  }

  socketService = new SocketService(token);
  for (const { event, fn } of pendingListeners) {
    socketService.getSocket().on(event, fn);
  }
  socketService.connect();
  return socketService;
}

export function getSocketService() {
  return socketService;
}

export function reconnectSocket(token) {
  return initSocket(token);
}

export const socket = {
  on(event, fn) {
    const instance = socketService?.getSocket();

    if (!instance) {
      pendingListeners.push({ event, fn });
      return;
    }

    instance.on(event, fn);
  },

  off(event, fn) {
    const instance = socketService?.getSocket();

    if (!instance) {
      // Eliminar de pendientes si todavía no se registró
      const index = pendingListeners.findIndex(
        (listener) => listener.event === event && listener.fn === fn,
      );

      if (index !== -1) {
        pendingListeners.splice(index, 1);
      }

      return;
    }

    instance.off(event, fn);
  },

  emit(event, ...args) {
    const instance = socketService?.getSocket();

    if (!instance) {
      return;
    }

    instance.emit(event, ...args);
  },

  get connected() {
    return socketService?.getSocket()?.connected ?? false;
  },

  getSocket() {
    return socketService?.getSocket();
  },

  connect() {
    socketService?.connect();
  },

  disconnect() {
    socketService?.disconnect();
  },
};
