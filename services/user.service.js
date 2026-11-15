import bcrypt from "bcrypt";
import prisma from "../schema/prisma/client.js";

export default async function createUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;
  return await prisma.user.create({
    data: user,
  });
}

export async function findUser({ tx = prisma, phone }) {
  return await tx.user.findFirst({
    where: {
      phone,
      deleted: false,
    },
  });
}

export async function findUserById({ tx = prisma, userId }) {
  return await tx.user.findFirst({
    where: {
      id: userId,
      deleted: false,
    },
  });
}

export async function findManyUsersById({ tx = prisma, userIds }) {
  return await tx.user.findMany({
    where: {
      id: {
        in: userIds,
      },
      deleted: false,
    },
  });
}

export async function deleteUser({ tx = prisma, userId }) {
  return await tx.user.update({
    where: {
      id: userId,
    },
    data: {
      deleted: true,
    },
  });
}

export async function updateUser({ tx = prisma, userId, user }) {
  try {
    const updatedUser = await tx.user.update({
      where: {
        id: userId,
      },
      data: user,
    });
    if (!updatedUser) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    return updatedUser;
  } catch (e) {
    const error = new Error(e.message);
    error.status = 500;
    throw error;
  }
}

export async function isUserBlocked({ tx = prisma, userId, participantIds }) {
  return await tx.blockedUser.findFirst({
    where: {
      OR: [
        {
          userId,
          blockedUserId: {
            in: participantIds,
          },
        },
        {
          userId: {
            in: participantIds,
          },
          blockedUserId: userId,
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      blockedUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function blockUser({ tx = prisma, userId, blockedUserId }) {
  const user = await findUserById({ tx, userId });
  const blockedUser = await findUserById({ tx, userId: blockedUserId });

  if (!user || !blockedUser) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return await tx.blockedUser.create({
    data: {
      userId,
      blockedUserId,
    },
  });
}

export async function unblockUser({ tx = prisma, userId, blockedUserId }) {
  const user = await findUserById({ tx, userId });
  const blockedUser = await findUserById({ tx, userId: blockedUserId });

  if (!user || !blockedUser) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return await tx.blockedUser.delete({
    where: {
      userId,
      blockedUserId,
    },
  });
}

export async function blockUserService({ userId, blockedUserId }) {
  try {
    const payload = await prisma.$transaction(async (tx) => {
      const result = await blockUser({ tx, userId, blockedUserId });
      return {
        userId: result.userId,
        blockedUserId: result.blockedUserId,
        message: "User blocked successfully",
      };
    });

    return payload;
  } catch (e) {
    const error = new Error(e.message);
    error.status = 500;
    throw error;
  }
}

export async function unblockUserService({ userId, blockedUserId }) {
  try {
    const payload = await prisma.$transaction(async (tx) => {
      const result = await unblockUser({ tx, userId, blockedUserId });
      return {
        userId: result.userId,
        unblockedUserId: result.blockedUserId,
        message: "User unblocked successfully",
      };
    });

    return payload;
  } catch (e) {
    const error = new Error(e.message);
    error.status = 500;
    throw error;
  }
}
