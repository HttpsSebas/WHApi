import { prisma } from "../prisma";
import redisClient from "../schema/redis/redis-client.js";

export async function getMessages({ userId, chatId, query }) {
  const cacheKey = `messages-${userId}:${chatId}:${JSON.stringify(query)}`;
  try {
    const messages = await redisClient.get(cacheKey);

    if (messages) {
      return JSON.parse(messages);
    }

    const { id, limit = 10, cursor, search } = query;

    const result = await prisma.message.findMany({
      where: {
        id: id || undefined,
        chatId,
        content: search || undefined,
        deleted: false,
      },
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: {
        createdAt: "desc",
      },
    });

    await redisClient.set(cacheKey, JSON.stringify(result), {
      EX: 60 * 60,
    });

    return result;
  } catch (e) {
    throw e;
  }
}

export async function getMessagesAfterId({ chatId, lastMessageId }) {
  try {
    return await prisma.message.findMany({
      where: {
        chatId,
        id: {
          gt: lastMessageId,
        },
        deleted: false,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  } catch (e) {
    throw e;
  }
}

export async function createMessages({ userId, chatId, message }) {
  const cacheKey = `messages-${userId}`;
  await redisClient.del(cacheKey);

  try {
    await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          chatId,
          senderId: userId,
          content: message,
        },
      });
      const participants = await tx.chatParticipant.findMany({
        where: {
          chatId,
          userId: {
            not: userId,
          },
        },
      });

      await tx.messageStatus.createMany({
        data: participants.map((participant) => ({
          messageId: createdMessage.id,
          userId: participant.userId,
        })),
      });
      return createdMessage;
    });
  } catch (e) {
    throw e;
  }
}

export async function deleteMessage({ userId, messageId }) {
  const cacheKey = `messages-${userId}`;

  try {
    const deletedMessage = await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        deleted: true,
      },
    });
    await redisClient.del(cacheKey);
    return deletedMessage;
  } catch (e) {
    throw e;
  }
}

export async function readMessage({ tx = prisma, userId, messageId }) {
  try {
    // check if message is already read
    const alreadyRead = await tx.messageStatus.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    if (alreadyRead?.status === "READ") {
      return alreadyRead;
    }

    // update the user's message status to read

    const readMessage = await tx.messagestatus.update({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      data: {
        status: "READ",
      },
    });
    return readMessage;
  } catch (e) {
    throw e;
  }
}

export async function deliverMessage({ tx = prisma, userIds, messageId }) {
  try {
    const deliverMessage = await tx.messagestatus.updateMany({
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
  } catch (e) {
    throw e;
  }
}

export async function checkMessageStatus({ tx = prisma, messageId, status }) {
  // check users message status
  try {
    const participants = await tx.messageStatus.findMany({
      where: {
        messageId,
      },
    });

    return participants.every((participant) => participant.status === status);
  } catch (e) {
    throw e;
  }
}

export async function getGlobalMessageStatus({ messageId }) {
  const messageStatus = prisma.message.findUnique({
    where: {
      id: messageId,
    },
    select: {
      globalStatus: true,
    },
  });
  return messageStatus.globalStatus;
}

export async function updateGlobalMessageStatus({
  tx = prisma,
  messageId,
  globalStatus,
}) {
  return tx.message.update({
    where: {
      id: messageId,
    },
    data: {
      globalStatus,
    },
  });
}

export async function markMessageAsRead({ userId, messageId }) {
  try {
    const globalMessageStatus = await prisma.$transaction(async (tx) => {
      await readMessage({
        tx,
        userId,
        messageId,
      });

      const allReadMessages = await checkMessageStatus({
        tx,
        messageId,
        status: "READ",
      });

      if (allReadMessages) {
        await updateGlobalMessageStatus({
          tx,
          messageId,
          status: "READ",
        });

        return "READ";
      }
      return await getGlobalMessageStatus({ messageId });
    });

    return globalMessageStatus;
  } catch (e) {
    throw e;
  }
}

export async function markMessageAsDelivered({ messageId, userIds }) {
  try {
    const globalMessageStatus = await prisma.$transaction(async (tx) => {
      await deliverMessage({
        tx,
        userIds,
        messageId,
      });

      const allDeliveredMessages = await checkMessageStatus({
        tx,
        messageId,
        status: "DELIVERED",
      });

      if (allDeliveredMessages) {
        await updateGlobalMessageStatus({
          tx,
          messageId,
          globalStatus: "DELIVERED",
        });

        return "DELIVERED";
      }
      return await getGlobalMessageStatus({ messageId });
    });
    return globalMessageStatus;
  } catch (e) {
    throw e;
  }
}
