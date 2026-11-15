import {
  blockUserService,
  unblockUserService,
  updateUser,
  findPrivateChat,
} from "../../services/user.service.js";

import { validateUserUpdate } from "../../middlewares/http/user.middleware.js";
import { getChatIds } from "../../services/chat.service.js";

export function blockUserEvent(socket, io) {
  socket.on("user:block", async (data, callback) => {
    try {
      // Validate userID is not the actual user
      if (socket.data.user.id === data.userId || !data.userId) {
        callback({ ok: false, error: "User ID is invalid" });
      }

      // Block user
      const payload = await blockUserService({
        userId: socket.data.user.id,
        blockedUserId: data.userId,
      });

      // Verify if both users have a private chat
      const privateChat = await findPrivateChat({
        userId: socket.data.user.id,
        otherUserId: data.userId,
      });

      // Leave private chat so client can't receive messages
      if (privateChat) {
        io.in(`user:${socket.data.user.id}`).socketsLeave(
          `chat:${privateChat.chatId}`,
        );
      }
      io.to(`user:${socket.data.user.id}`).emit("user:blocked", payload);
      callback({ ok: true, payload });
    } catch (e) {
      socket.emit("user:block:error", e.message);
      callback({ ok: false, error: e.message });
    }
  });
}

export function unblockUserEvent(socket, io) {
  socket.on("user:unblock", async (data, callback) => {
    try {
      // Validate userID is not the actual user
      if (socket.data.user.id === data.userId || !data.userId) {
        callback({ ok: false, error: "User ID is invalid" });
      }

      // Unblock user
      const payload = await unblockUserService({
        userId: socket.data.user.id,
        blockedUserId: data.userId,
      });

      io.to(`user:${socket.data.user.id}`).emit("user:unblocked", payload);
      callback({ ok: true, payload });
    } catch (e) {
      socket.emit("user:error", e.message);
      callback({ ok: false, error: e.message });
    }
  });
}

export function updateUserEvent(socket, io) {
  socket.on("user:update", async (data) => {
    try {
      // Validate updated user data
      await validateUserUpdate({ data: data.user });

      // Update user
      const payload = await updateUser({
        userId: socket.data.user.id,
        user: data.user,
      });

      // Update user in socket
      socket.data.user = payload;

      // Emit updated user
      io.to(`user:${socket.data.user.id}`).emit("user:updated", payload);
    } catch (e) {
      socket.emit("user:error", e.message);
    }
  });
}

export function disconnectUserEvent(socket, io) {
  socket.on("disconnect", async () => {
    const { id } = socket.data.user;

    // Get all sockets in user room
    const sockets = await io.in(`user:${id}`).fetchSockets();

    // Clear socket user
    socket.data.user = null;

    // If there's only one socket in user room, user is offline
    if (sockets.length < 1) {
      await updateUser({
        userId: id,
        user: { isOnline: false, lastSeenAt: new Date() },
      });
      const chats = await getChatIds({ userId: id });
      for (const chat of chats) {
        io.to(`chat:${chat.chatId}`).emit("user:offline", {
          userId: id,
          lastSeenAt: new Date(),
        });
      }
      io.emit("user:offline", { userId: id, lastSeenAt: new Date() });

      socket.leave(`user:${id}`);

      for (const chat of chats) {
        socket.leave(`chat:${chat.chatId}`);
      }
    }
  });
}

export async function connectUserEvent(socket, io) {
  const { id } = socket.data.user;
  // Join user room

  socket.join(`user:${id}`);

  const chats = await getChatIds({ userId: id });

  for (const chat of chats) {
    socket.join(`chat:${chat.chatId}`);
  }

  for (const chat of chats) {
    io.to(`chat:${chat.chatId}`).emit("user:online", { userId: id });
  }

  io.emit("user:online", { userId: id });
}
