import { ChatParticipant } from "../models/chatParticipant.model.js";
import { Message } from "../models/message.model.js";
import { MessageStatus } from "../models/messageStatus.model.js";
import {
  getMessagesCache,
} from "../schema/redis/keys/message.keys.js";
import { emit } from "../sockets/events/eventBus.js";
import {
  getChatById,
  updateChat,
  getChatParticipantIds,
  increaseUnreadMessages,
  syncUnreadCountsInCache,
} from "./chat.service.js";

export async function getMessages({ chatId }) {
  // Get messages from cache first
  const messages = await getMessagesCache(chatId);

  if (Object.keys(messages).length > 0) {
    return messages;
  }

  const filters = {
    where: {
      chatId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  };

  // Get messages from DB with queries
  const result = await Message.findMany(filters);

  // Set messages in cache
  await emit("messages.created", {
    chatId,
    messages: result,
  });

  return result;
}

export async function getMessageById({ tx = prisma, messageId }) {
  return await Message.findUnique({ tx, messageId });
}

export async function getUsersUnreadCountByChatId({
  tx = prisma,
  chatId,
  userIds,
}) {
  const unreadCounts = await MessageStatus.unreadCounts({
    tx,
    chatId,
    userIds,
  });

  return unreadCounts.map((item) => ({
    userId: item.userId,
    unreadCount: item._count.messageId,
  }));
}

export async function syncMessages({ tx = prisma, userId }) {
  // Sync messages of the user
  // This function gets all the messages with status SENT

  let where = {};

  where.statuses = {
    some: {
      userId,
      status: "SENT",
    },
  };

  return await Message.findMany({ tx, where });
}

export async function createMessage({
  userId,
  chatId,
  message,
  onlineParticipants,
}) {
  try {
    let lastMessageId;
    const payload = await Message.transaction(async (tx) => {
      // Create message

      const createdMessage = await Message.create({
        tx,
        userId,
        chatId,
        message,
      });

      const participantIds = await getChatParticipantIds({ tx, chatId });

      const userIds = participantIds
        .map((p) => p.userId)
        .filter((id) => id !== userId);

      // Create message status for each chat participant

      await MessageStatus.createMany({
        tx,
        data: userIds.map((id) => ({
          messageId: createdMessage.id,
          userId: id,
        })),
      });

      // Update chat last message
      lastMessageId = createdMessage.id;

      const where = {
        messageId: createdMessage.id,
        status: {
          not: "READ",
        },
      };

      const usersToUpdateUnreadCount = await MessageStatus.findMany({
        tx,
        where,
      });

      await increaseUnreadMessages({
        tx,
        userIds: usersToUpdateUnreadCount.map((user) => user.userId),
        chatId,
      });

      // Mark message as delivered & get global message status
      const { globalStatus: globalMessageStatus, updatedMessages } =
        await markMessageAsDelivered({
          tx,
          messageId: createdMessage.id,
          userIds: onlineParticipants,
        });

      const unreadCounts = await getUsersUnreadCountByChatId({
        tx,
        chatId,
        userIds: usersToUpdateUnreadCount.map((user) => user.userId),
      });

      // Update chat last message
      await updateChat({
        tx,
        chatId,
        lastMessageId,
      });

      // Return data
      const msgData = {
        ...createdMessage,
        globalStatus: globalMessageStatus,
      };

      return {
        data: msgData,
        message: "Message sent successfully",
        participantIds,
        unreadCounts,
        updatedMessages,
      };
    });

    await emit("message.created", {
      chatId,
      message: payload.data,
    });

    await syncUnreadCountsInCache({
      chatId,
    });

    // Actualizar TODOS los mensajes en caché desde lastReadMessageId hasta messageId
    await emit("messages.globalStatus.updated", {
      messages: payload.updatedMessages,
    });

    return payload;
  } catch (err) {
    throw err;
  }
}

export async function deleteMessage({ userId, messageId, chatId }) {
  try {
    const payload = await Message.transaction(async (tx) => {
      const chatBeforeDelete = await getChatById({
        tx,
        chatId,
        userId,
      });

      const isLastMessage = chatBeforeDelete?.lastMessageId === messageId;

      // Delete message status
      await MessageStatus.deleteMany({
        tx,
        where: {
          messageId,
        },
      });

      // Delete message
      await Message.delete({
        tx,
        messageId,
        chatId,
      });

      // Get last chat message
      const lastMessage = await Message.lastMessage({
        tx,
        chatId,
      });

      if (isLastMessage) {
        // Update chat last message
        await updateChat({
          tx,
          chatId,
          data: {
            lastMessage: lastMessage ?? null,
            lastMessageId: lastMessage?.id ?? null,
          },
        });
      }

      await ChatParticipant.decreaseUnreadCount({
        where: {
          chatId,
          userId: {
            not: userId,
          },
          unreadCount: {
            gt: 0,
          },
          OR: [
            {
              lastReadMessageId: {
                lt: messageId,
              },
            },
            {
              lastReadMessageId: null,
            },
          ],
        },
        data: {
          unreadCount: {
            decrement: 1,
          },
        },
      });
      // If user hasn't read the message yet, decrement unread count

      // Update chat participants last read message to previous message
      await ChatParticipant.decreaseUnreadCount({
        tx,
        where: {
          chatId,
          userId: {
            not: userId,
          },
          lastReadMessageId: {
            gte: messageId,
          },
        },
        data: {
          lastReadMessageId: lastMessage?.id ?? null,
        },
      });

      return {
        lastMessage: lastMessage ?? null,
        chatBeforeDelete,
      };
    });

    const participants = await syncUnreadCountsInCache({
      chatId,
    });

    await emit("message.deleted", {
      chatId,
      data: {
        messageId,
        lastMessage: payload.lastMessage,
      },
    });

    return {
      lastMessage: payload.lastMessage,
      unreadCounts: participants.map((p) => ({
        userId: p.userId,
        unreadCount: p.unreadCount,
      })),
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function readUntilMessage({
  tx = prisma,
  userId,
  messageId,
  lastReadMessageId,
  chatId,
}) {
  try {
    const readMessages = await MessageStatus.updateMany({
      tx,
      where: {
        userId,
        message: {
          chatId,
          id: {
            gt: lastReadMessageId ?? 0,
            lte: messageId,
          },
          senderId: {
            not: userId,
          },
        },
      },
      data: {
        status: "READ",
      },
    });

    if (readMessages.count === 0) {
      return {
        unreadChanged: false,
        readCount: 0,
      };
    }

    const unreadCounts = await getUsersUnreadCountByChatId({
      tx,
      chatId,
      userIds: [userId],
    });

    const realUnreadCount =
      unreadCounts.find((item) => item.userId === userId)?.unreadCount ?? 0;

    await ChatParticipant.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        lastReadMessageId: messageId,
        unreadCount: realUnreadCount,
      },
    });

    return {
      unreadChanged: true,
      readCount: readMessages.count,
    };
  } catch (e) {
    console.log("[readUntilMessage]", e);
    throw e;
  }
}

export async function deliverMessage({ tx = prisma, userIds, messageId }) {
  if (!messageId) return;

  const deliverMessage = await MessageStatus.updateMany({
    tx,
    where: {
      messageId,
      userId: {
        in: userIds,
      },
      status: "SENT",
    },
    data: {
      status: "DELIVERED",
    },
  });

  return deliverMessage;
}

export async function getGlobalMessageStatus({ tx = prisma, messageId }) {
  const messageStatus = await Message.findUnique({
    tx,
    messageId,
  });
  return messageStatus.globalStatus;
}

export async function updateGlobalMessageStatus({
  tx = prisma,
  messageId,
  globalStatus,
}) {
  try {
    const message = await Message.update({
      tx,
      messageId,
      data: {
        globalStatus,
      },
    });

    return message;
  } catch (e) {
    console.log(e);
  }
}

export async function markMessageAsRead({ userId, messageId, chatId }) {
  try {
    const result = await Message.transaction(async (tx) => {
      const lastReadMessageId = await ChatParticipant.findFirst({
        tx,
        userId,
        chatId,
      });

      if (!lastReadMessageId) {
        throw new Error("Chat participant not found");
      }

      const previousReadMessageId = lastReadMessageId.lastReadMessageId;

      // Mark messages as read until messageId for user
      const readMessagesCount = await readUntilMessage({
        tx,
        userId,
        messageId,
        lastReadMessageId: previousReadMessageId,
        chatId,
      });

      // If messages are already read
      // refresh global message status. It could be outdated
      if (!readMessagesCount.unreadChanged) {
        const refreshed = await refreshGlobalMessageStatus({
          tx,
          messageId,
        });
        return {
          globalStatus: refreshed.globalStatus,
          unreadCountChanged: 0,
          previousReadMessageId,
          lastReadMessageId: previousReadMessageId,
          updatedMessages: refreshed.messages,
        };
      }

      const { globalStatus, messages: updatedMessages } =
        await refreshGlobalMessageStatus({
          tx,
          messageId,
          lastReadMessageId: previousReadMessageId,
        });

      // Return updated unread count & last read message id
      const updatedParticipant = await ChatParticipant.findFirst({
        tx,
        userId,
        chatId,
      });

      return {
        globalStatus: globalStatus.globalStatus,
        unreadCount: updatedParticipant.unreadCount,
        previousReadMessageId,
        lastReadMessageId: updatedParticipant.lastReadMessageId,
        updatedMessages,
      };
    });

    await syncUnreadCountsInCache({ chatId });

    // Update message cache
    await emit("messages.globalStatus.updated", {
      messages: result.updatedMessages,
    });

    return result;
  } catch (e) {
    console.error("[markMessageAsRead] error:", e);
    throw e;
  }
}

export async function markMessageAsDelivered({
  tx = prisma,
  messageId,
  userIds,
}) {
  // Mark message as delivered for each user
  await deliverMessage({
    tx,
    userIds,
    messageId,
  });

  // Refresh global message status & return
  const payload = await refreshGlobalMessageStatus({ tx, messageId });

  return {
    globalStatus: payload.globalStatus,
    messages: payload.messages,
  };
}

export async function refreshGlobalMessageStatus({
  tx = prisma,
  messageId,
  lastReadMessageId = null,
}) {
  try {
    const message = await getMessageById({ tx, messageId });

    if (!message) {
      throw new Error("Message not found");
    }

    const { chatId } = message;

    const where = {
      chatId,
      id: lastReadMessageId
        ? {
            gt: lastReadMessageId,
            lte: messageId,
          }
        : {
            equals: messageId,
          },
    };

    // Get messages between lastReadMessageId & messageId
    const messagesToUpdate = await Message.findMany({
      where,
      select: {
        id: true,
        senderId: true,
        statuses: {
          select: { status: true },
        },
      },
    });

    const updatedMessages = [];

    // Calculate and update globalStatus for each message
    for (const msg of messagesToUpdate) {
      const statuses = msg.statuses.map((status) => status.status);

      let globalStatus = "SENT";
      if (statuses.length > 0 && statuses.every((s) => s === "READ")) {
        globalStatus = "READ";
      } else if (statuses.some((s) => s === "DELIVERED" || s === "READ")) {
        globalStatus = "DELIVERED";
      }

      const updatedMessage = await Message.update({
        tx,
        messageId: msg.id ,
        data: {
          globalStatus,
        },
      });

      updatedMessages.push(updatedMessage);
    }

    const targetMessage = updatedMessages.find(
      (message) => message.id === messageId,
    );

    return {
      globalStatus: targetMessage?.globalStatus ?? "SENT",
      messages: updatedMessages,
    };
  } catch (e) {
    console.log(e);
    throw e;
  }
}

export async function markMessagesAsDelivered({ userId }) {
  try {
    let messageIds = [];
    const result = await Message.transaction(async (tx) => {
      // Get all pending messages
      const messages = await syncMessages({ tx, userId });
      messageIds = messages.map((message) => message.id);

      if (messageIds.length === 0) return [];

      // Mark pending messages as delivered
      await MessageStatus.updateMany({
        tx,
        where: {
          userId,
          messageId: {
            in: messageIds,
          },
          status: "SENT",
        },
        data: {
          status: "DELIVERED",
        },
      });

      return messageIds;
    });

    if (result.length === 0) return [];

    const refreshedMessages = await Promise.all(
      result.map((messageId) => refreshGlobalMessageStatus({ messageId })),
    );

    const updatedMessages = refreshedMessages.flatMap(
      (refreshed) => refreshed.messages,
    );

    const uniqueMessages = Array.from(
      new Map(updatedMessages.map((message) => [message.id, message])).values(),
    );

    await emit("messages.globalStatus.updated", { messages: uniqueMessages });

    return uniqueMessages;
  } catch (e) {
    console.log(e);
    throw e;
  }
}
