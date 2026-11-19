import { BaseModel } from "./base.js";

export class Contact extends BaseModel {
  static async findMany({ tx, userId }) {
    return await Contact.client(tx).contact.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        contactUser: {
          select: {
            id: true,
            name: true,
            phone: true,
            description: true,
            blockedBy: {
              where: {
                userId,
              },
              select: {
                id: true,
                userId: true,
                blockedUserId: true,
              },
            },
          },
        },
      },
    });
  }

  static async findFirst({tx, userId, contactId}){
    return await Contact.client(tx).contact.findFirst({
    where: {
      contactId,
      userId,
    },
    include: {
      contactUser: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });
  }

  static async create({tx, userId, contact}){
    return await Contact.client(tx).contact.create({
      data: {
        userId,
        contactId: contact.contactId,
        ...contact,
      },
    });
  }

  static async update({tx, userId, contactId, data}){
    return await Contact.client(tx).contact.updateMany({
      where: {
        userId,
        contactId,
      },
      data,
    });
  }

  static async delete({tx, userId, contactId}){
    return await Contact.client(tx).contact.deleteMany({
      where: {
        userId,
        contactId,
      },
    });
  }
}
