import { Chat } from "../models/chat.model.js";
import { ChatParticipant } from "../models/chatParticipant.model.js";
import {
  findManyUsersById,
  isUserBlocked,
  getPresences,
} from "./user.service.js";
import { applyContactAliases } from "./contact.service.js";
import { getChatSelect } from "./selects/chat.select.js";
import { emit } from "../sockets/events/eventBus.js";
import {
  getCachedChat,
  getCachedChats,
  getChatParticipantsCache,
} from "../schema/redis/keys/chat.keys.js";

function normalizeChatLastMessage(chat) {
  if (!chat) return chat;

  const lastMessage = chat.lastMessage;

  if (!lastMessage) return chat;

  return {
    ...chat,
    lastMessage: {
      id: lastMessage.id,
      content: lastMessage.content,
      createdAt: lastMessage.createdAt,
      senderId: lastMessage.senderId,
    },
  };
}

function normalizeChatsLastMessage(chats) {
  return chats.map(normalizeChatLastMessage);
}

export async function getChatsFromDatabase({ userId, chatIds }) {
  const where = {
    participants: {
      some: {
        userId,
      },
    },
  };

  if (chatIds?.length > 0) {
    where.id = {
      in: chatIds,
    };
  }

  const result = await Chat.findMany({
    where,
    select: getChatSelect(userId),
  });

  const chats = await applyContactAliases(result, userId);

  return normalizeChatsLastMessage(chats);
}

export async function getChats({ userId }) {
  const userChatsDB = await getChatIds({ userId });
  const dbChatIds = userChatsDB.map((chat) => String(chat.chatId));

  if (dbChatIds.length === 0) return [];

  const cachedChats = await getCachedChats(userId, dbChatIds);

  const missingChatIds = dbChatIds
    .filter((_, index) => cachedChats[index] === null)
    .map((id) => Number(id));

  let missingChatsById = new Map();

  if (missingChatIds.length > 0) {
    const missingChats = await getChatsFromDatabase({
      userId,
      chatIds: missingChatIds,
    });
    missingChatsById = new Map(
      missingChats.map((chat) => [Number(chat.id), chat]),
    );
  }

  const chats = cachedChats.map((chat, index) => {
    if (chat !== null) return chat;

    return missingChatsById.get(Number(dbChatIds[index])) ?? null;
  });

  const chatsWithAliases = await applyContactAliases(
    chats.filter(Boolean),
    userId,
  );

  return normalizeChatsLastMessage(chatsWithAliases);
}

export async function getChatFromDB({ chatId, userId }) {
  const chat = await Chat.findById({
    where: {
      id: chatId,
    },
    select: getChatSelect(userId),
  });

  return chat;
}

export async function getChat({ chatId, userId }) {
  try {
    const chatCache = await getCachedChat({ userId, chatId });

    if (chatCache) {
      return chatCache;
    }

    const result = await getChatFromDB({ chatId, userId });

    if (result) {
      await emit("chat.created", {
        chat: result,
        participants: result.participants,
      });
    }

    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getChatById({ tx = prisma, chatId, userId }) {
  try {
    const chat = await getChat({ chatId, userId });

    if (!chat) return null;

    const participantIds = chat.participants.map((p) => p.userId);

    const [presences, chatWithAliases, blocked] = await Promise.all([
      getPresences({ userIds: participantIds }),

      applyContactAliases([chat], userId),

      chat.type === "PRIVATE"
        ? isUserBlocked({
            tx,
            userId,
            otherUserId: chat.participants.find(
              (participant) => participant.userId !== userId,
            ).userId,
          })
        : Promise.resolve(false),
    ]);

    const chatData = {
      ...chatWithAliases[0],
      presences,
      blocked,
    };

    return normalizeChatLastMessage(chatData);
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getChatIds({ tx = prisma, userId }) {
  return await Chat.getIds({ tx, userId });
}

export async function updateChat({ tx = prisma, chatId, data }) {
  const result = await Chat.update({
    tx,
    chatId,
    data,
  });

  return result;
}

export async function countGroupAdmin({ tx = prisma, chatId }) {
  return await ChatParticipant.countAdmins({ tx, chatId });
}

export async function getUnreadMessages({ tx = prisma, userId, chatId }) {
  return await ChatParticipant.getUnreadCount({ tx, userId, chatId });
}

export async function increaseUnreadMessages({ tx = prisma, userIds, chatId }) {
  const participant = await ChatParticipant.increaseUnreadCount({
    tx,
    userIds,
    chatId,
  });

  return participant.count;
}

export async function decreaseUnreadMessages({
  tx = prisma,
  userId,
  chatId,
  lastReadMessageId,
  amount = 1,
}) {
  const participant = await ChatParticipant.decreaseUnreadCount({
    tx,
    where: {
      userId,
      chatId,
      lastReadMessageId: {
        lt: lastReadMessageId,
      },
    },
    data: {
      unreadCount: {
        decrement: amount,
      },
    },
  });

  return participant.count;
}

export async function syncUnreadCountsInCache({ chatId }) {
  const participants = await getChatParticipantsFromDB({ chatId });

  await emit("chat.unreadCounts.synced", {
    chatId,
    participants,
  });

  return participants;
}

export async function hasAlreadyPrivateChat({
  tx = prisma,
  userId,
  otherUserId,
}) {
  return await Chat.findPrivateChat({ tx, userId, otherUserId });
}

export async function findPrivateChat({ tx = prisma, userId, otherUserId }) {
  return await Chat.findPrivateChat({ tx, userId, otherUserId });
}

export async function isUserInChat({ tx = prisma, userId, chatId }) {
  return await ChatParticipant.findFirst({ tx, userId, chatId });
}

export async function isUserAdmin({ tx = prisma, userId, chatId }) {
  return await ChatParticipant.isAdmin({ tx, userId, chatId });
}

export async function editGroup({ tx = prisma, chatId, data }) {
  const editedGroup = await updateChat({ tx, chatId, data });

  if (!editedGroup) {
    const error = new Error("Group not found");
    error.status = 404;
    throw error;
  }

  return editedGroup;
}

export async function createChats({ userId, chat, participants }) {
  // Verify that the users exist
  const result = await Chat.transaction(async (tx) => {
    const users = await findManyUsersById({ tx, userIds: participants });

    if (users.length !== participants.length) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    // Verify that the chat doesn't already exist (PRIVATE)
    if (chat.type === "PRIVATE") {
      const privateChat = await hasAlreadyPrivateChat({
        tx,
        userId,
        otherUserId: participants.find((p) => p !== userId),
      });
      if (privateChat) {
        return privateChat;
      }
    }

    const createdChat = await Chat.create({ tx, data: chat });

    // Create chat participants
    const participantData = participants.map((participant) => ({
      chatId: createdChat.id,
      userId: participant,
      role: participant === userId ? "ADMIN" : "MEMBER",
    }));

    await ChatParticipant.createMany({ tx, data: participantData });

    // Get chat data
    const chatData = await getChatById({ chatId: createdChat.id, userId });

    return chatData;
  });

  return result.chatData;
}

export async function joinGroupChat({ userId, chatId, newMemberIds }) {
  if (newMemberIds.includes(userId)) {
    const error = new Error("You are already in this group");
    error.status = 400;
    throw error;
  }

  const areAlreadyInGroup = await ChatParticipant.findMany({
    chatId,
    memberIds: newMemberIds,
  });

  if (areAlreadyInGroup.length > 0) {
    const error = new Error(
      "You are adding users that are already in this group",
    );
    error.status = 400;
    throw error;
  }

  const data = newMemberIds.map((memberId) => ({
    chatId,
    userId: memberId,
    role: "MEMBER",
  }));

  await ChatParticipant.createMany({
    data,
  });

  const participants = await getChatParticipants({ chatId });

  return participants;
}

export async function leaveChat({ userId, chatId }) {
  const where = {
    chatId_userId: {
      chatId,
      userId,
    },
  };

  const chat = await ChatParticipant.delete({ where });

  return chat;
}

export async function getChatParticipantsFromDB({ tx = prisma, chatId }) {
  return await ChatParticipant.findMany({ tx, chatId });
}

export async function getChatParticipants({ chatId }) {
  const participantsFromCache = await getChatParticipantsCache(chatId);

  if (participantsFromCache && participantsFromCache.length > 0) {
    const presences = await getPresences({
      userIds: participantsFromCache.map((p) => p.userId),
    });

    return participantsFromCache.map((participant) => ({
      ...participant,
      ...presences[participant.userId],
    }));
  }

  const participants = await getChatParticipantsFromDB({ chatId });

  await emit("chat.participants.created", {
    chatId,
    participants,
  });

  return participants;
}

export async function getChatParticipantIds({ tx = prisma, chatId }) {
  return await ChatParticipant.getIds({ tx, chatId });
}

export async function upgradeToAdmin({ tx = prisma, userId, chatId }) {
  return await ChatParticipant.upgrade({ tx, userId, chatId });
}

export async function downgradeToMember({ tx = prisma, userId, chatId }) {
  return await ChatParticipant.downgrade({ tx, userId, chatId });
}

export async function createChatService({ userId, chat, participants }) {
  const result = await createChats({
    userId,
    chat,
    participants,
  });

  await emit("chat.created", {
    chat: result,
    participants: result.participants,
  });

  return {
    chat: result,
    message: "Chat created successfully",
  };
}

export async function leaveChatGroupService({ userId, chatId, userName }) {
  const payload = await ChatParticipant.transaction(async (tx) => {
    const { type } = await getChatById({ chatId, userId });
    if (!chatId || chatId === "") {
      const error = new Error("Chat not found");
      error.status = 404;
      throw error;
    }

    if (type !== "GROUP") {
      const error = new Error("Chat is not a group");
      error.status = 400;
      throw error;
    }

    const isAdmin = await isUserAdmin({ tx, userId, chatId });
    const adminCount = await countGroupAdmin({ tx, chatId });

    if (isAdmin && adminCount === 1) {
      const error = new Error("You are the last admin of this group");
      error.status = 400;
      throw error;
    }

    const result = await leaveChat({
      tx,
      userId,
      chatId,
    });

    return result;
  });

  payload.name = userName;
  payload.message = `${userName} has left the group`;

  await emit("chat.participant.removed", {
    chatId,
    userId,
  })

  return payload;
}

export async function addUserToGroupService({ userIds, chatId, memberId }) {
  try {
    const { type, lastMessage } = await getChatById({ chatId, userId: memberId });

    if (!type) {
      const error = new Error("Chat not found");
      error.status = 404;
      throw error;
    }

    if (type !== "GROUP") {
      const error = new Error("Chat is not a group");
      error.status = 400;
      throw error;
    }

    const participants = await joinGroupChat({
      userId: memberId,
      chatId,
      newMemberIds: userIds,
    });

    await emit("chat.participant.added", {
      chatId,
      participants,
      lastMessageAt: lastMessage.createdAt ?? Date.now(),
    });

    const payload = {
      message: `Users have been added to the group`,
      userIds,
      chatId,
    };
    return payload;
  } catch (err) {
    throw err;
  }
}

export async function deleteUserFromGroupService({
  userToBeDeletedId,
  chatId,
  adminId,
}) {
  const payload = await ChatParticipant.transaction(async (tx) => {
    const isAdmin = await isUserAdmin({ tx, userId: adminId, chatId });

    if (!isAdmin) {
      const error = new Error("You are not an admin of this chat");
      error.status = 400;
      throw error;
    }

    const chat = await leaveChat({ tx, userId: userToBeDeletedId, chatId });

    return {
      userId: userToBeDeletedId,
      name: chat.user.name,
      chatId,
      message: `${chat.user.name} has been removed from the group`,
    };
  });

  await emit("chat.participant.removed", {
    chatId,
    userId: userToBeDeletedId,
  });

  return payload;
}

export async function upgradeUserToAdmin({
  userToBeUpgradedId,
  chatId,
  adminId,
}) {
  const payload = await ChatParticipant.transaction(async (tx) => {
    const isAdmin = await isUserAdmin({ tx, userId: adminId, chatId });

    if (!isAdmin) {
      const error = new Error("You are not an admin of this chat");
      error.status = 400;
      throw error;
    }

    await upgradeToAdmin({ tx, userId: userToBeUpgradedId, chatId });
    const payload = {
      userId: userToBeUpgradedId,
      chatId,
    };

    await emit("chat.participant.roleChanged", {
      chatId,
      userId: userToBeUpgradedId,
      role: "ADMIN",
    });

    return payload;
  });

  return payload;
}

export async function downgradeUserToMember({
  userToBeDemotedId,
  chatId,
  adminId,
}) {
  const isAdmin = await isUserAdmin({ userId: adminId, chatId });

  if (!isAdmin) {
    const error = new Error("You are not an admin of this chat");
    error.status = 400;
    throw error;
  }

  if (userToBeDemotedId === adminId) {
    const error = new Error("You cannot downgrade yourself to member");
    error.status = 400;
    throw error;
  }

  await downgradeToMember({ userId: userToBeDemotedId, chatId });
  const payload = {
    userId: userToBeDemotedId,
    chatId,
  };

  await emit("chat.participant.roleChanged", {
    chatId,
    userId: userToBeDemotedId,
    role: "MEMBER",
  });

  return payload;
}

export async function editGroupInfo({ chatId, data, userId }) {
  const chat = await editGroup({ chatId, data, userId });

  const payload = {
    id: chat.id,
    name: chat.name,
    description: chat.description,
    message: `The group info has been edited`,
  };

  return payload;
}

export async function deleteChat({ chatId, userId }) {
  const payload = await Chat.transaction(async (tx) => {
    const chat = await getChatById({ tx, chatId, userId });
    if (!chat) {
      const error = new Error("Chat not found");
      error.status = 404;
      throw error;
    }

    const isAdmin = await isUserAdmin({ tx, userId, chatId });
    if (!isAdmin) {
      const error = new Error("You are not an admin of this chat");
      error.status = 400;
      throw error;
    }

    if (chat.type !== "GROUP") {
      const error = new Error("Chat is not a group");
      error.status = 400;
      throw error;
    }

    const isMember = await isUserInChat({ tx, userId, chatId });
    if (!isMember) {
      const error = new Error("You are not a member of this chat");
      error.status = 400;
      throw error;
    }

    const deletedChat = await Chat.delete({ tx, chatId });

    return {
      id: deletedChat.id,
      name: deletedChat.name,
      message: `${deletedChat.name} has been deleted`,
      participants: deletedChat.participants,
    };
  });

  await emit("chat.deleted", {
    chatId,
    participantIds: payload.participants.map((p) => p.user.id),
  });

  return payload;
}
