import { BaseModel } from "./base.js";

export class ChatParticipant extends BaseModel {
  static async create({ tx, data }) {
    return await ChatParticipant.client(tx).chatParticipant.create({
      data,
    });
  }

  static async createMany({ tx, data }) {
    return await ChatParticipant.client(tx).chatParticipant.createMany({
      data,
    });
  }

  static async delete({ tx, where }) {
    return await ChatParticipant.client(tx).chatParticipant.delete({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  static async findMany({ tx, chatId, memberIds }) {
    return await ChatParticipant.client(tx).chatParticipant.findMany({
      where: {
        chatId,
        ...(memberIds && { userId: { in: memberIds } }),
      },
      include: {
        user: {
          omit: {
            password: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
      },
    });
  }

  static async update({ tx, where, data }) {
    return await ChatParticipant.client(tx).chatParticipant.update({
      where,
      data,
    });
  }

  static async updateMany({ tx, where, data }) {
    return await ChatParticipant.client(tx).chatParticipant.updateMany({
      where,
      data,
    });
  }

  static async getIds({ tx, chatId }) {
    return await ChatParticipant.client(tx).chatParticipant.findMany({
      where: {
        chatId,
      },
      select: {
        userId: true,
      },
    });
  }

  static async getUnreadCount({ tx, userId, chatId }) {
    return await ChatParticipant.client(tx).chatParticipant.findMany({
      where: {
        userId,
        chatId,
      },
      select: {
        unreadCount: true,
      },
    });
  }

  static async countAdmins({ tx, chatId }) {
    return await ChatParticipant.client(tx).chatParticipant.count({
      where: {
        chatId,
        role: "ADMIN",
      },
    });
  }

  static async increaseUnreadCount({ tx, userIds, chatId }) {
    return await ChatParticipant.updateMany({
      tx,
      where: {
        userId: {
          in: userIds,
        },
        chatId,
      },
      data: {
        unreadCount: {
          increment: 1,
        },
      },
    });
  }

  static async decreaseUnreadCount({ tx, where, data }) {
    const result = await ChatParticipant.updateMany({
      tx,
      where,
      data,
    });

    return result.count;
  }

  static async findFirst({ tx, userId, chatId }) {
    return await ChatParticipant.client(tx).chatParticipant.findFirst({
      where: {
        chatId,
        userId,
      },
    });
  }

  static async isAdmin({ tx, userId, chatId }) {
    return await ChatParticipant.client(tx).chatParticipant.findFirst({
      where: {
        chatId,
        userId,
        role: "ADMIN",
      },
    });
  }

  static async upgrade({ tx, userId, chatId }) {
    return await ChatParticipant.client(tx).chatParticipant.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        role: "ADMIN",
      },
    });
  }

  static async downgrade({ tx, userId, chatId }) {
    return await ChatParticipant.client(tx).chatParticipant.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        role: "MEMBER",
      },
    });
  }
}
