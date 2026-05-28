import prisma from "../schema/prisma/client.js";
import redisClient from "../schema/redis/redis-client.js";
import { findManyUsersById } from "./user.service.js";
import chatSchema from "../schema/chat.schema.js";
import { validateGroupInfo } from "../sockets/middlewares/chat.middleware.js";

export async function getChats({ tx = prisma, userId, query = {} }) {
  const { id, limit = 10, cursor, search, unread } = query;
  const cacheKey = `chats-${userId}:cursor${cursor}:search:${search}:limit:${limit}`;

  const chats = await redisClient.get(cacheKey);

  if (chats) {
    return JSON.parse(chats);
  }

  try {
    const result = await tx.chat.findMany({
      where: {
        id: id || undefined,
        participants: {
          some: {
            userId,
            ...(unread && { unreadCount: { gt: 0 } }),
          },
        },
        // SEARCH filter for groups
        ...(search && {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              // SEARCH filter for private chats
              participants: {
                some: {
                  user: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  // Excludes current user
                  NOT: {
                    userId,
                  },
                },
              },
            },
          ],
        }),
      },
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        participants: {
          select: {
            userId: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        lastMessage: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await redisClient.set(cacheKey, JSON.stringify(result), {
      // Expira en 1 hora
      EX: 60 * 60,
    });

    return result;
  } catch (e) {
    throw e;
  }
}

export async function getChatById({ tx = prisma, chatId }) {
  return tx.chat.findUnique({
    where: {
      id: chatId,
    },
    select: {
      id: true,
      type: true,
      name: true,
    },
  });
}

export async function getChatIds({ tx = prisma, userId }) {
  return tx.chatParticipant.findMany({
    where: {
      userId,
    },
    select: {
      chatId: true,
    },
  });
}

export async function countGroupAdmin({ tx = prisma, chatId }) {
  return tx.chatParticipant.count({
    where: {
      chatId,
      role: "ADMIN",
    },
  });
}

export async function isUserInChat({ tx = prisma, userId, chatId }) {
  return tx.chatParticipant.findFirst({
    where: {
      chatId,
      userId,
    },
  });
}

export async function isUserAdmin({ tx = prisma, userId, chatId }) {
  return tx.chatParticipant.findFirst({
    where: {
      chatId,
      userId,
      role: "ADMIN",
    },
  });
}

export async function editGroup({ tx = prisma, chatId, data }) {
  const editedGroup = await tx.chat.updateMany({
    where: {
      id: chatId,
      type: "GROUP",
    },
    data,
  });

  if (!editedGroup) {
    throw new Error("Chat not found");
  }

  return editedGroup;
}

export async function createChats({ tx = prisma, userId, chat, participants }) {
  const keys = await redisClient.keys(`chats-${userId}:*`);

  try {
    await findManyUsersById({ tx, userIds: participants });

    const createdChat = await tx.chat.create({
      data: {
        ...chat,
      },
    });

    await tx.chatParticipant.createMany({
      data: participants.map((participant) => ({
        chatId: createdChat.id,
        userId: participant,
        role: participant === userId ? "ADMIN" : "MEMBER",
      })),
    });

    if (keys.length) {
      await redisClient.del(keys);
    }
    return createdChat;
  } catch (e) {
    if (e.code === "P2002") {
      throw new Error("User is already in chat");
    }
    throw e;
  }
}

export async function joinGroupChat({ tx = prisma, userId, chatId }) {
  try {
    const chat = await tx.chatParticipant.create({
      data: {
        chatId,
        userId,
        role: "MEMBER",
      },
    });
    return chat;
  } catch (e) {
    throw e;
  }
}

export async function leaveChat({ tx = prisma, userId, chatId }) {
  try {
    const chat = await tx.chatParticipant.delete({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return chat;
  } catch (e) {
    throw e;
  }
}

export async function getChatParticipants({ tx = prisma, chatId }) {
  return tx.chatParticipant.findMany({
    where: {
      chatId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function upgradeToAdmin({ tx = prisma, userId, chatId }) {
  return tx.chatParticipant.update({
    where: {
      chatId_userId: {
        chatId,
        userId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    data: {
      role: "ADMIN",
    },
  });
}

export async function downgradeToMember({ tx = prisma, userId, chatId }) {
  return tx.chatParticipant.update({
    where: {
      chatId_userId: {
        chatId,
        userId,
      },
    },
    data: {
      role: "MEMBER",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function createChatService({ userId, chat, participants }) {
  try {
    await chatSchema.validateAsync({
      name: chat.name,
      type: chat.type,
      participantIds: participants,
    });

    if (chat.type === "private" && participants.includes(userId)) {
      throw new Error("You cannot create a chat with yourself");
    }

    const payload = await prisma.$transaction(async (tx) => {
      const users = await findManyUsersById({ tx, userIds: participants });

      if (users.length !== participants.length) {
        throw new Error("User not found");
      }

      const result = await createChats({
        tx,
        userId,
        chat: chat,
        participants,
      });

      return result;
    });

    return payload;
  } catch (e) {
    throw e;
  }
}

export async function leaveChatGroupService({ userId, chatId, user }) {
  try {
    const payload = await prisma.$transaction(async (tx) => {
      const { type } = await getChatById({ tx, chatId });
      if (!chatId || chatId === "") {
        throw new Error("Chat id is required");
      }

      if (type !== "group") {
        throw new Error("You can only leave group chats");
      }

      const isAdmin = await isUserAdmin({ tx, userId, chatId });
      const adminCount = await countGroupAdmin({ tx, chatId });

      if (isAdmin && adminCount === 1) {
        throw new Error(
          "You need to transfer ownership before leaving the group",
        );
      }

      const result = await leaveChat({
        tx,
        userId,
        chatId,
      });

      return result;
    });

    payload.name = user.name;
    payload.message = `${user.name} has left the group`;

    return payload;
  } catch (e) {
    throw e;
  }
}

export async function addUserToGroupService({ userId, chatId }) {
  const { type } = await getChatById({ chatId });

  if (!type) {
    throw new Error("Chat not found");
  }

  if (type !== "group") {
    throw new Error("Chat is not a group");
  }

  await joinGroupChat({
    userId,
    chatId,
  });
  const payload = {
    userId,
    chatId,
  };
  return payload;
}

export async function deleteUserFromGroupService({ userId, chatId, memberId }) {
  const payload = await prisma.$transaction(async (tx) => {
    const isAdmin = await isUserAdmin({ tx, userId: memberId, chatId });
    if (!isAdmin) {
      throw new Error("You are not an admin of this chat");
    }

    const chat = await leaveChat({ tx, userId, chatId });

    return {
      userId,
      name: chat.user.name,
      chatId,
      message: `${chat.user.name} has been removed from the group`,
    };
  });

  return payload;
}

export async function upgradeUserToAdmin({ userId, chatId, memberId }) {
  const payload = await prisma.$transaction(async (tx) => {
    const isAdmin = await isUserAdmin({ tx, userId: memberId, chatId });

    if (!isAdmin) {
      throw new Error("You are not an admin of this chat");
    }

    const adminMember = await upgradeToAdmin({ tx, userId, chatId });
    const payload = {
      userId,
      name: adminMember.user.name,
      chatId,
      message: `${adminMember.user.name} has been upgraded to admin`,
    };

    return payload;
  });

  return payload;
}

export async function downgradeUserToMember({ userId, chatId, memberId }) {
  const isAdmin = await isUserAdmin({ userId: memberId, chatId });

  if (!isAdmin) {
    throw new Error("You are not an admin of this chat");
  }

  if (userId === memberId) {
    throw new Error("You cannot downgrade yourself");
  }

  const member = await downgradeToMember({ userId, chatId });
  const payload = {
    userId,
    name: member.user.name,
    chatId,
    message: `${member.user.name} has been downgraded to member`,
  };
  return payload;
}

export async function editGroupInfo({ chatId, data }) {
  const validateData = await validateGroupInfo(data);

  const chat = await editGroup({ chatId, data: validateData });

  const payload = {
    id: chat.id,
    name: chat.name,
    description: chat.description,
    message: `The group info has been edited`,
  };

  return payload;
}
