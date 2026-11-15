import { BaseModel } from "./base";

export class MessageStatus extends BaseModel {

  static async createMany({ tx, data }) {
    return await MessageStatus.client(tx).messageStatus.createMany({ data });
  }

  static async findMany({ tx, where }) {
    return await MessageStatus.client(tx).messageStatus.findMany({ where });
  }

  static async updateMany({ tx, where, data }) {
    return await MessageStatus.client(tx).messageStatus.updateMany({ where, data });
  }

  static async deleteMany({tx, where }) {
    return await MessageStatus.client(tx).messageStatus.deleteMany({ where });
  }

  static async delete({tx, where }) {
    return await MessageStatus.client(tx).messageStatus.delete({ where });
  }

  static async unreadCounts({ tx, chatId, userIds }) {
    return await MessageStatus.client(tx).messageStatus.groupBy({
      by: ["userId"],
      where: {
        message: {
          chatId,
        },
        userId: {
          in: userIds,
        },
        status: {
          not: "READ",
        },
      },
      _count: {
        messageId: true,
      },
    });
  }
}
