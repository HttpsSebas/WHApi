import messageSchema from "../../schema/message.schema.js";
import {
  createMessages,
  markMessageAsRead,
  markMessageAsDelivered,
  getMessagesAfterId,
} from "../../services/message.service.js";
import { getChatParticipants } from "../../services/chat.service.js";
import { validateIsInChat } from "../middlewares/chat.middleware.js";

export function newMessageEvent(socket, io) {
  socket.on("message:new", async (data) => {
    try {
      await messageSchema.parseAsync({
        message: data.message,
        chatId: data.chatId,
        senderId: socket.data.user.id,
      });
      
      await validateIsInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });

      const participants = await getChatParticipants({ chatId: data.chatId });

      const result = await createMessages({
        userId: socket.data.user.id,
        chatId: data.chatId,
        message: data.message,
      });

      const onlineParticipants = (
        await Promise.all(
          participants.map(async (participant) => {
            if (participant.id === socket.data.user.id) return null;

            const sockets = await io
              .in(`user:${participant.id}`)
              .fetchSockets();

            return sockets.length > 0 ? participant.id : null;
          }),
        )
      ).filter(Boolean);

      const globalMessageStatus = await markMessageAsDelivered({
        messageId: result.id,
        userIds: onlineParticipants,
      });

      io.to(`chat:${data.chatId}`).emit("message:new", {
        messageId: result.id,
        message: result.content,
        senderId: socket.data.user.id,
        globalStatus: globalMessageStatus,
      });
    } catch (e) {
      socket.emit("message:error", e.message);
    }
  });
}

export function readMessageEvent(socket, io) {
  socket.on("message:read", async (data) => {
    try {
      if (data.messageId === null) return;

      await validateIsInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });

      const globalMessageStatus = await markMessageAsRead({
        userId: socket.data.user.id,
        messageId: data.messageId,
      });

      io.to(`chat:${data.chatId}`).emit("message:read", {
        messageId: data.messageId,
        userId: socket.data.user.id,
        globalStatus: globalMessageStatus,
      });
    } catch (e) {
      socket.emit("message:error", e.message);
    }
  });
}

export function messageSyncEvent(socket, io) {
  socket.on("message:sync", async (data) => {
    try {
      if (data.lastMessageId === null) return;

      await validateIsInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });

      const messages = await getMessagesAfterId({
        chatId: data.chatId,
        lastMessageId: data.lastMessageId,
      });

      io.to(`chat:${data.chatId}`).emit("message:sync:response", messages);
    } catch (e) {
      socket.emit("message:error", e.message);
    }
  });
}
