import redisClient from "../redis-client.js";
import { getUserPresences } from "./user.keys.js";

const USER_KEY = "user:";

export async function cacheChat(chatId, data) {
  const key = `chat:${String(chatId)}`;

  return await redisClient.hSet(key, data);
}

export async function cacheUserChat(userId, chatId, data) {
  const key = `${USER_KEY}${String(userId)}:chat:${String(chatId)}`;
  return await redisClient.hSet(key, data);
}

export async function addChatToUser(userId, chatId, score) {
  const chatKey = `${USER_KEY}${String(userId)}:chats`;
  return await redisClient.zAdd(chatKey, {
    score,
    value: String(chatId),
  });
}

export async function getUserChatIds(userId) {
  return await redisClient.zRange(`${USER_KEY}${String(userId)}:chats`, 0, -1, {
    REV: true,
  });
}

export async function getChat(chatId) {
  return await redisClient.hGetAll(`chat:${String(chatId)}`);
}

export async function getUserChat(userId, chatId) {
  return await redisClient.hGetAll(
    `${USER_KEY}${String(userId)}:chat:${String(chatId)}`,
  );
}

export async function getParticipantsWithUnreadCounts(chatId, participants) {
  return await Promise.all(
    participants.map(async (participant) => {
      const userChat = await getUserChat(participant.userId, chatId);

      const unreadCount = Number(userChat?.unreadCount ?? 0);

      return {
        ...participant,
        unreadCount,
      };
    }),
  );
}

export async function deleteChatCache(chatId) {
  return await redisClient.del(`chat:${String(chatId)}`);
}

export async function deleteChatsCache(chatIds) {
  return await redisClient.del(
    chatIds.map((chatId) => `chat:${String(chatId)}`),
  );
}

export async function deleteUserChat(userIds, chatId) {
  await Promise.all([
    userIds.map(async (id) => {
      const userId = typeof id === "object" && id !== null ? id.userId : id;
      const userChatKey = `${USER_KEY}${String(userId)}:chat:${String(chatId)}`;
      const chatsKey = `${USER_KEY}${String(userId)}:chats`;

      await Promise.all([
        redisClient.del(userChatKey),
        redisClient.zRem(chatsKey, String(chatId)),
      ]);
    }),
  ]);
}

export async function deleteUserChats(userId) {
  const chatsKey = `${USER_KEY}${String(userId)}:chats`;
  const chatIds = await getUserChatIds(userId);

  const keys = [
    chatsKey,
    ...chatIds.map(
      (chatId) => `${USER_KEY}${String(userId)}:chat:${String(chatId)}`,
    ),
  ];

  if (keys.length === 0) return 0;

  return await redisClient.del(keys);
}

export async function createChatCache(chat, participants) {
  const lastMessageAt = chat.lastMessage?.createdAt ?? chat.createdAt;

  if (!lastMessageAt) {
    throw new Error(`Chat ${chat.id} has no valid lastMessageAt`);
  }

  const score = new Date(lastMessageAt).getTime();

  if (Number.isNaN(score)) {
    throw new Error(
      `Invalid lastMessageAt for chat ${chat.id}: ${lastMessageAt}`,
    );
  }

  await cacheChat(chat.id, {
    id: chat.id,
    type: chat.type,
    name: chat.name ?? "",
    description: chat.description ?? "",
    createdAt: new Date(chat.createdAt).toISOString(),
    lastMessage: chat.lastMessage?.content ?? "",
    lastMessageId: chat.lastMessage?.id ? chat.lastMessage.id : "",
    lastMessageAt: new Date(lastMessageAt).toISOString(),
  });

  await createChatParticipantsCache(chat.id, participants);

  await Promise.all(
    participants.map(async (participant) => {
      await cacheUserChat(participant.userId, chat.id, {
        unreadCount: participant.unreadCount,
      });

      await addChatToUser(participant.userId, chat.id, score);
    }),
  );
}

export async function createChatParticipantsCache(chatId, participants) {
  const key = `chat:${String(chatId)}:participants`;

  if (!participants || participants.length === 0) {
    console.log("no participants");
    return;
  }

  const fields = {};

  for (const participant of participants) {
    fields[String(participant.userId)] = JSON.stringify(participant);
  }

  return await redisClient.hSet(key, fields);
}
export async function deleteChatParticipantsCache(chatId, participants) {
  try {
    const key = `chat:${String(chatId)}:participants`;

    if (!participants || participants.length === 0) {
      console.log("no participants");
      return;
    }

    const participantIds = participants.map((participant) =>
      typeof participant === "object" && participant !== null
        ? String(participant.userId)
        : String(participant),
    );

    return await redisClient.hDel(key, participantIds);
  } catch (e) {
    console.log(e);
  }
}

export async function getChatParticipantsCache(chatId) {
  const key = `chat:${String(chatId)}:participants`;
  const data = await redisClient.hGetAll(key);

  const participants = Object.entries(data).map(([id, participant]) => ({
    ...JSON.parse(participant),
  }));

  const userIds = participants.map((participant) => participant.userId);

  const presences = await getUserPresences(userIds);

  return Object.entries(data).map(([id, participant]) => ({
    ...JSON.parse(participant),
    ...presences[JSON.parse(participant).userId],
  }));
}

export async function editChatParticipant(chatId, participantId, data) {
  const key = `chat:${String(chatId)}:participants`;
  const participant = await redisClient.hGet(key, String(participantId));

  if (!participant) {
    return null;
  }

  let participantData = JSON.parse(participant);

  participantData = { ...participantData, ...data };

  return await redisClient.hSet(
    key,
    String(participantId),
    JSON.stringify(participantData),
  );
}

export async function getCachedChat({ userId, chatId }) {
  try {
    const [chat, userChat, participants] = await Promise.all([
      getChat(chatId),
      getUserChat(userId, chatId),
      getChatParticipantsCache(chatId),
    ]);
    if (
      Object.keys(chat).length === 0 ||
      Object.keys(userChat).length === 0 ||
      Object.keys(participants).length === 0
    ) {
      return null;
    }

    const participantsWithUnreadCounts = await getParticipantsWithUnreadCounts(
      chatId,
      participants,
    );

    const chatData = {
      ...chat,
      ...userChat,
      participants: participantsWithUnreadCounts,
    };

    return chatData;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function getCachedChats(userId, chatIds) {
  const chats = await Promise.all(
    chatIds.map((chatId) => getCachedChat({ userId, chatId })),
  );
  return chats;
}

export async function setUnreadCountInCache({ chatId, userId, unreadCount }) {
  const userChatKey = `${USER_KEY}${String(userId)}:chat:${String(chatId)}`;
  console.log("setUnreadCountInCache", userChatKey, unreadCount);
  return await redisClient.hSet(userChatKey, {
    unreadCount: String(unreadCount ?? 0),
  });
}

export async function updateChatCache(chatId, changes) {
  try {
    const fields = {};

    if (changes.name) {
      fields.name = changes.name;
    }

    if (changes.description) {
      fields.description = changes.description;
    }

    if (changes.participantsToAdd) {
      await createChatParticipantsCache(chatId, changes.participantsToAdd);
    }

    if (changes.participantsToDelete) {
      await deleteChatParticipantsCache(chatId, changes.participantsToDelete);
      await deleteUserChat(changes.participantsToDelete, chatId);
    }

    if (changes.lastMessage !== undefined) {
      fields.lastMessage = String(changes.lastMessageId ?? "");
    }

    if (changes.lastMessageId !== undefined) {
      fields.lastMessageId = String(changes.lastMessageId ?? "");
    }

    if (Object.keys(fields).length === 0) {
      return;
    }

    return await cacheChat(chatId, fields);
  } catch (error) {
    throw error;
  }
}
