export function getChatSelect(userId) {
  return {
    id: true,
    type: true,
    name: true,
    description: true,
    createdAt: true,

    participants: {
      select: {
        id: true,
        userId: true,
        role: true,
        unreadCount: true,
        lastReadMessageId: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            blockedBy: {
              where: { userId },
              select: {
                id: true,
                userId: true,
                blockedUserId: true,
              },
            },
            blockedUsers: {
              where: { userId },
              select: {
                id: true,
                userId: true,
                blockedUserId: true,
              },
            },
          },
        },
      },
    },

    lastMessage: {
      select: {
        id: true,
        chatId: true,
        content: true,
        createdAt: true,
        globalStatus: true,
        senderId: true,
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
  };
}
