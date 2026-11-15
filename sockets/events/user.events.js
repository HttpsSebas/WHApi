import {
  blockUserService,
  unblockUserService,
  updateUser,
} from "../../services/user.service.js";

import { validateUserUpdate } from "../middlewares/user.middleware.js";

export function blockUserEvent(socket, io) {
  socket.on("user:block", async (data) => {
    try {
      if (socket.data.user.id === data.userId || !data.userId) {
        throw new Error("User ID is invalid");
      }
      const payload = await blockUserService({
        userId: socket.data.user.id,
        blockedUserId: data.userId,
      });

      io.to(`user:${socket.data.user.id}`).emit("user:blocked", payload);
    } catch (e) {
      socket.emit("user:error", e.message);
    }
  });
}

export function unblockUserEvent(socket, io) {
  socket.on("user:unblock", async (data) => {
    try {
      if (socket.data.user.id === data.userId || !data.userId) {
        throw new Error("User ID is invalid");
      }
      const payload = await unblockUserService({
        userId: socket.data.user.id,
        blockedUserId: data.userId,
      });

      io.to(`user:${socket.data.user.id}`).emit("user:unblocked", payload);
    } catch (e) {
      socket.emit("user:error", e.message);
    }
  });
}

export function updateUserEvent(socket, io) {
  socket.on("user:update", async (data) => {
    try {
      await validateUserUpdate({ data: data.user });
      const payload = await updateUser({
        userId: socket.data.user.id,
        user: data.user,
      });

      socket.data.user = payload;

      io.to(`user:${socket.data.user.id}`).emit("user:updated", payload);
    } catch (e) {
      socket.emit("user:error", e.message);
    }
  });
}

export function disconnectUserEvent(socket, io) {
  socket.on(
    "disconnect",
    async () => {
      setTimeout(async () => {
        const { id } = socket.data.user;
        const sockets = await io.in(`user:${id}`).fetchSockets();
        if (sockets.length <= 1) {
          await updateUser(id, { isOnline: false, lastSeenAt: new Date() });
          io.emit("user:offline", {userId: id});
        }
      });
    },
    5000,
  );
}
