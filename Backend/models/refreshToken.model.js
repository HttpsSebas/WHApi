import { BaseModel } from "./base.js";

export class RefreshToken extends BaseModel {
  static async create({ tx, userId, token, expiresAt }) {
    return await RefreshToken.client(tx).refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  static async findUnique({ tx, refreshToken }) {
    return await RefreshToken.client(tx).refreshToken.findUnique({
      where: {
        token: refreshToken,
      },
    });
  }

  static async delete({ tx, refreshToken }) {
    return await RefreshToken.client(tx).refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }
}
