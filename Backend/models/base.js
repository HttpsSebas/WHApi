
import prisma from "../schema/prisma/client.js";

export class BaseModel {
  static client(tx) {
    return tx ?? prisma;
  }

  static async transaction(callback) {
    return prisma.$transaction(async (tx) => callback(tx));
  }
}