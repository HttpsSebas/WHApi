import { BaseModel } from "./base.js";

export class User extends BaseModel {
  static async create({ tx, user }) {
    return await User.client(tx).user.create({
      data: user,
      select: {
        id: true,
        phone: true,
        name: true,
        description: true,
      },
    });
  }

  static async findFirst({ tx, where, include, omit }) {
    return await User.client(tx).user.findFirst({
      where,
      ...(include && { include }),
      ...(omit && { omit }),
    });
  }

  static async findMany({ tx, where, include, omit }) {
    return await User.client(tx).user.findMany({
      where,
      ...(include && { include }),
      ...(omit && { omit }),
    });
  }

  static async update({ tx, where, data }) {
    return await User.client(tx).user.update({
      where,
      data,
    });
  }

  static async createBlock({ tx, data }) {
    return await User.client(tx).blockedUser.create({ data });
  }

  static async findFirstBlocked({ tx, where, include }) {
    return await User.client(tx).blockedUser.findFirst({
      where,
      include,
    });
  }

  static async deleteBlock({ tx, where }) {
    return await User.client(tx).blockedUser.deleteMany({ where });
  }
}
