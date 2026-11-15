import { BaseModel } from "./base";

export class Message extends BaseModel {
  static async create({ tx, userId, chatId, message }) {
    return await Message.client(tx).message.create({
      data: {
        chatId,
        senderId: userId,
        content: message,
      },
      include: {
        chat: true,
      },
    });
  }

  static async findMany({ tx, where, select, include, orderBy = { createdAt: "asc" } }) {
    return await Message.client(tx).message.findMany({
      where,
      ...(select && { select }),
      ...(include && { include }),
      orderBy,
    });
  }

  static async findUnique({ tx, messageId }) {
    return await Message.client(tx).message.findUnique({
      where: {
        id: messageId,
      },
    });
  }

  static async lastMessage({ tx, chatId }) {
    return await Message.client(tx).message.findFirst({
      where: {
        chatId,
      },
      orderBy: {
        id: "desc",
      },
    });
  }

  static async update({ tx, messageId, data }) {
    return await Message.client(tx).message.update({
      where: {
        id: messageId,
      },
      data,
      
    });
  }

  static async delete({ tx, messageId, chatId }) {
    return await Message.client(tx).message.delete({
      where: {
        id: messageId,
        chatId,
      },
    });
  }
}
