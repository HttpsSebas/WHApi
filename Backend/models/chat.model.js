import { BaseModel } from "./base"
export class Chat extends BaseModel {

  static async findById({ tx, where, select }) {
    return await Chat.client(tx).chat.findUnique({
      where,
      select,
    });
  }

  static async findMany({tx, where, select}) {
    return await Chat.client(tx).chat.findMany({
      where,
      orderBy: { lastMessage: { createdAt: "desc" } },
      select,
    });
  }

  static async getIds({ tx, userId }) {
    return await Chat.client(tx).chat.findMany({
      where: { participants: { some: { userId } } },
      select: { id: true },
    });
  }

  static async update({ tx, chatId, data }) {
    return await Chat.client(tx).chat.update({
      where: { id: chatId },
      data,
      include: {
        participants: {
          include: {
            user: { omit: { password: true } },
          },
        },
      },
    });
  }

  static async delete({ tx, chatId }) {
    return await Chat.client(tx).chat.delete({
      where: { id: chatId },
      include: {
        participants: { select: { userId: true } },
      },
    });
  }

  static async create({ tx, data }) {
    return await Chat.client(tx).chat.create({
      data,
    });
  }

  static async findPrivateChat({ tx, userId, otherUserId }) {
    return await Chat.client(tx).chat.findFirst({
      where: {
        type: "PRIVATE",
        participants: {
          every: { userId: { in: [userId, otherUserId] } },
          some: { userId },
        },
        AND: {
          participants: { some: { userId: otherUserId } },
        },
      },
      include: {
        participants: {
          include: { user: { omit: { password: true } } },
        },
      },
    });
  }

}
