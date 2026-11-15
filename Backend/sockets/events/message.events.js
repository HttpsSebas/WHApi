import messageSchema from "../../schema/message.schema.js";
import {
  createMessage,
  markMessageAsRead,
  markMessagesAsDelivered,
  deleteMessage,
} from "../../services/message.service.js";
import {
  getChatParticipants,
} from "../../services/chat.service.js";
import { validateIsSocketInChat } from "../../middlewares/socket/chat.middleware.js";
import { areUsersNotBlocked } from "../../middlewares/socket/user.middleware.js";

export function newMessageEvent(socket, io) {
  socket.on("message:new", async (data, callback) => {
    try {
      await messageSchema.parseAsync({
        message: data.message,
        chatId: data.chat.id,
        senderId: socket.data.user.id,
      });

      // Execute middleware and get chat participants
      const [, participants] = await Promise.all([
        validateIsSocketInChat({
          userId: socket.data.user.id,
          chatId: data.chat.id,
        }),
        getChatParticipants({
          chatId: data.chat.id,
        }),
      ]);

      const participantIds = participants.map((p) => p.userId);

      // Validate blocks for private chats
      if (data.chat?.type === "PRIVATE") {
        await areUsersNotBlocked({
          userId: socket.data.user.id,
          participantIds,
        });
      }

      const onlineParticipants = participants
        .filter(
          (p) =>
            p.isOnline === true &&
            Number(p.userId) !== Number(socket.data.user.id),
        )
        .map((p) => p.userId);

      const result = await createMessage({
        userId: socket.data.user.id,
        chatId: Number(data.chat.id),
        message: data.message,
        onlineParticipants,
      });

      // Send new message to chat
      io.to(`chat:${data.chat.id}`).emit("message:new", {
        msg: result.data,
        unreadCounts: result.unreadCounts,
      });

      callback({
        ok: true,
        data: {
          msg: result.data,
          unreadCounts: result.unreadCounts,
        },
      });
    } catch (e) {
      console.log(e);
      socket.emit("message:send:error", e.message);
      callback({
        ok: false,
        error: e.message,
      });
    }
  });
}

export function readMessageEvent(socket, io) {
  socket.on("message:readUntil", async (data) => {
    try {
      if (
        data.messageId === null ||
        data.messageId === undefined ||
        Number(data.readerId) === Number(data.senderId)
      ) {
        return;
      }

      // Validate if sender is in chat
      await validateIsSocketInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });

      // Update message's status and return its global status
      const globalMessageStatus = await markMessageAsRead({
        userId: socket.data.user.id,
        messageId: data.messageId,
        chatId: Number(data.chatId),
      });

      // Return data to chat
      io.to(`chat:${data.chatId}`).emit("message:read", {
        chatId: data.chatId,
        messageId: data.messageId,
        readerId: socket.data.user.id,
        globalStatus: globalMessageStatus.globalStatus,
        previousReadMessageId: globalMessageStatus.previousReadMessageId,
        lastReadMessageId: globalMessageStatus.lastReadMessageId,
      });
    } catch (e) {
      console.log(e);
      socket.emit("message:read:error", e.message);
    }
  });
}

export function messageSyncEvent(socket, io) {
  socket.on("message:sync", async (data) => {
    try {
      // Update pending messages (SENT => DELIVERED)
      const messages = await markMessagesAsDelivered({
        userId: socket.data.user.id,
      });

      if (!messages?.length) return;

      const messagesByChat = new Map();

      for (const message of messages) {
        const chatId = Number(message.chatId);
        if (!messagesByChat.has(chatId)) {
          messagesByChat.set(chatId, []);
        }

        messagesByChat.get(chatId).push(message);
      }

      for (const [chatId, messages] of messagesByChat) {
        io.to(`chat:${chatId}`).emit("message:sync", messages);
      }
    } catch (e) {
      console.log(e);
      socket.emit("message:sync:error", e.message);
    }
  });
}

export function deleteMessageEvent(socket, io) {
  socket.on("message:delete", async (data) => {
    try {
      console.log("message:delete");
      // Validate if sender is in chat
      await validateIsSocketInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });

      // Delete the requested message
      // And return the lastMessage of the chat
      const result = await deleteMessage({
        userId: socket.data.user.id,
        messageId: data.messageId,
        chatId: data.chatId,
      });

      // Emit event to chat
      io.to(`chat:${data.chatId}`).emit("message:deleted", {
        chatId: data.chatId,
        messageId: data.messageId,
        lastMessage: result.lastMessage,
        unreadCounts: result.unreadCounts,
      });
    } catch (e) {
      socket.emit("message:delete:error", e.message);
    }
  });
}
