import redisClient from "../redis-client.js";

export async function getMessagesCache(chatId) {
  try {
    const key = `chat:${Number(chatId)}:messages`;
    const messages = await redisClient.hGetAll(key);
    return Object.entries(messages).map(([_, message]) => ({
      ...JSON.parse(message),
    }));
  } catch (e) {
    return [];
  }
}

export async function deleteMessageCache(chatId, messageId) {
  const key = `chat:${Number(chatId)}:messages`;
  return await redisClient.hDel(key, String(messageId));
}

export async function deleteMessagesCache(chatId) {
  const key = `chat:${Number(chatId)}:messages`;
  return await redisClient.del(key);
}

export async function createMessageCache(chatId, message) {
  const key = `chat:${Number(chatId)}:messages`;
  await redisClient.hSet(key, String(message.id), JSON.stringify(message));
}

export async function createMessagesCache(chatId, messages) {
  const key = `chat:${Number(chatId)}:messages`;
  messages.forEach((message) =>
    redisClient.hSet(key, String(message.id), JSON.stringify(message)),
  );
}

export async function editMessageCache(
  chatId,
  messageId,
  data,
  lastReadMessageId = null,
) {
  try {
    const key = `chat:${Number(chatId)}:messages`;

    // If not lastReadMessageId, update specific message only
    if (lastReadMessageId === null) {
      const message = await redisClient.hGet(key, String(messageId));

      if (!message) {
        return null;
      }

      let messageData = JSON.parse(message);
      messageData = { ...messageData, ...data };

      return await redisClient.hSet(
        key,
        String(messageId),
        JSON.stringify(messageData),
      );
    }

    // Get all the chat messages
    const allMessages = await redisClient.hGetAll(key);

    if (!allMessages || Object.keys(allMessages).length === 0) {
      return null;
    }

    // Filter messages between lastReadMessageId and messageId
    const messagesToUpdate = [];

    for (const [id, messageStr] of Object.entries(allMessages)) {
      const idNum = Number(id);
      const messageIdNum = Number(messageId);
      const lastReadIdNum = Number(lastReadMessageId);

      // Update messages with id > lastReadMessageId and <= messageId
      if (idNum >= lastReadIdNum && idNum <= messageIdNum) {
        const messageData = JSON.parse(messageStr);
        const updatedMessage = { ...messageData, ...data };
        messagesToUpdate.push([id, JSON.stringify(updatedMessage)]);
      }
    }

    if (messagesToUpdate.length === 0) {
      return null;
    }

    // Update messages at the same time
    const updates = messagesToUpdate.map(([id, updatedMessage]) =>
      redisClient.hSet(key, id, updatedMessage),
    );

    await Promise.all(updates);

    return { updatedCount: messagesToUpdate.length };
  } catch (e) {
    console.log(e);
    return null;
  }
}
