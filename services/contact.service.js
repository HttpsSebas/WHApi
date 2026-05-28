import prisma from "../schema/prisma/client.js";
import redisClient from "../schema/redis/redis-client.js";

export async function getContacts({ tx = prisma, userId }) {
  const cacheKey = `contacts-${userId}`;
  try {
    const contacts = await redisClient.get(cacheKey);

    if (contacts) {
      return JSON.parse(contacts);
    }

    const result = await tx.contact.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    await redisClient.set(cacheKey, JSON.stringify(result), {
      EX: 60 * 60,
    });

    return result;
  } catch (e) {
    const error = new Error(e.message);
    error.status = 500;
    throw error;
  }
}

export async function verifyContactPhone({
  tx = prisma,
  userId,
  contactPhone,
}) {
  const user = await tx.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      phone: true,
    },
  });
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  if (user.phone === contactPhone) {
    const error = new Error("You cannot add yourself as a contact");
    error.status = 400;
    throw error;
  }

  return true;
}

export async function validateUserContact({ tx = prisma, userId, contactId }) {
  const contact = await tx.contact.findUnique({
    where: {
      id: contactId,
    },
  });

  if (contact.userId !== userId) {
    const error = new Error("Contact not found");
    error.status = 404;
    throw error;
  }

  return;
}

export async function createContact({ userId, contact }) {
  try {
    const payload = await prisma.$transaction(async (tx) => {
      await verifyContactPhone({ tx, userId, contactPhone: contact.phone });

      const newContact = await tx.contact.create({
        data: {
          userId,
          ...contact,
        },
      });
      return {
        message: "Contact created successfully",
        data: newContact,
      };
    });

    await redisClient.del(`contacts-${userId}`);

    return payload;
  } catch (e) {
    if (e.code === "P2002") {
      throw new Error("Contact already exists");
    }
    throw e;
  }
}

export async function updateContact({ userId, contactId, contact }) {
  try {
    const payload = await prisma.$transaction(async (tx) => {
      const updatedContact = await tx.contact.updateMany({
        where: {
          id: contactId,
          userId,
        },
        data: contact,
      });

      if (updatedContact.count === 0) {
        throw new Error("Contact not found");
      }

      return {
        message: "Contact updated successfully",
        data: updatedContact,
      };
    });

    await redisClient.del(`contacts-${userId}`);

    return payload;
  } catch (e) {
    throw e;
  }
}

export async function deleteContact({ userId, contactId }) {
  try {
    const payload = await prisma.$transaction(async (tx) => {
      const deletedContact = await tx.contact.deleteMany({
        where: {
          id: contactId,
          userId,
        },
      });

      if (deletedContact.count === 0) {
        throw new Error("Contact not found");
      }

      return {
        message: "Contact deleted successfully",
        data: deletedContact,
      };
    });
    await redisClient.del(`contacts-${userId}`);

    return payload;
  } catch (e) {
    throw e;
  }
}
