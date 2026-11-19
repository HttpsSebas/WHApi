import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";

import {
  cacheUserPresence,
  getUserPresences,
} from "../schema/redis/keys/user.keys.js";
import { emit } from "../sockets/events/eventBus.js";

export default async function createUser({ user }) {
  // Crypt password and replace the plain password in socket
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;

  const createdUser = await User.create({
    user,
  });

  return createdUser;
}

export async function findUser({ tx, phone }) {
  try {
    const user = await User.findFirst({
      tx,
      where: {
        phone,
      },
    });
    return user;
  } catch (e) {
    return null;
  }
}

export async function findUserById({ tx, userId }) {
  try {
    return await User.findFirst({
      tx,
      where: {
        id: userId,
      },
      omit: {
        password: true,
      },
    });
  } catch (e) {
    return null;
  }
}

export async function getPresences({ userIds }) {
  try {
    const userPresenceCache = await getUserPresences(userIds);

    if (userPresenceCache && Object.keys(userPresenceCache).length > 0) {
      return userPresenceCache;
    }

    const users = await findManyUsersById({ userIds });

    if (!users || users.length === 0) {
      return null;
    }

    await Promise.all(
      users.map(async (user) => {
        await cacheUserPresence({
          userId: user.id,
          data: {
            isOnline: String(user.isOnline),
            lastSeenAt: user.lastSeenAt?.toISOString() || null,
          },
        });
      }),
    );

    return await getUserPresences(userIds);
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function findManyUsersById({ tx, userIds }) {
  try {
    return await User.findMany({
      tx,
      where: {
        id: {
          in: userIds,
        },
      },
    });
  } catch (e) {
    return null;
  }
}

export async function updateUser({ userId, user }) {
  try {
    // Check if phone number already exists
    const result = await User.transaction(async (tx) => {
      if (user.phone) {
        const userExists = await findUser({ tx, phone: user.phone });
        if (userExists && userExists.id !== userId) {
          throw new Error("Phone number already exists");
        }
      }

      // Update user in db
      const updatedUser = await User.update({
        tx,
        where: {
          id: userId,
        },
        data: user,
      });

      // Get contacts of updated user
      const contactOf = await User.findMany({
        tx,
        where: {
          contacts: {
            some: {
              contactId: userId,
            },
          },
        },
      });

      return { updatedUser, contactOf };
    });

    if (user.isOnline !== undefined || user.lastSeenAt !== undefined) {
      const presenceData = {};

      if (user.isOnline !== undefined) {
        presenceData.isOnline = String(user.isOnline);
      }

      if (user.lastSeenAt !== undefined) {
        presenceData.lastSeenAt =
          user.lastSeenAt instanceof Date
            ? user.lastSeenAt.toISOString()
            : user.lastSeenAt;
      }

      await cacheUserPresence({
        userId: userId,
        data: presenceData,
      });
    }

    await emit("user.updated", {
      userIds: result.contactOf.map((user) => user.id),
    });

    return {
      message: "User updated successfully",
      data: result.updatedUser,
    };
  } catch (e) {
    console.log(e);
    if (e.code === "P2025") {
      throw new Error("User not found");
    }
    throw e;
  }
}

export async function userBlockedRelation({ tx, userId, participantIds }) {
  return await User.findFirstBlocked({
    tx,
    where: {
      OR: [
        // Check if user has a blocked participant
        {
          userId,
          blockedUserId: {
            in: participantIds,
          },
        },
        // Check if user is blocked by a participant
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

export async function isUserBlocked({ tx, userId, otherUserId }) {
  return await User.findFirstBlocked({
    tx,
    userId,
    blockedUserId: otherUserId,
  });
}

export async function blockUser({ tx, userId, blockedUserId }) {
  // Check if both users exist
  const user = await findUserById({ tx, userId });
  const blockedUser = await findUserById({ tx, userId: blockedUserId });

  // if one of the users does not exist
  // throw error
  if (!user || !blockedUser) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  // if the user is trying to block themselves
  // throw error
  if (user.id === blockedUser.id) {
    const error = new Error("You cannot block yourself");
    error.status = 400;
    throw error;
  }

  // if the user is already blocked
  // throw error
  if (await isUserBlocked({ tx, userId, otherUserId: blockedUserId })) {
    const error = new Error("User already blocked");
    error.status = 400;
    throw error;
  }

  return await User.createBlock({
    tx,
    data: {
      userId,
      blockedUserId,
    },
  });
}

export async function unblockUser({ tx, userId, blockedUserId }) {
  const user = await findUserById({ tx, userId });
  const blockedUser = await findUserById({ tx, userId: blockedUserId });

  if (!user || !blockedUser) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (user.id === blockedUser.id) {
    const error = new Error("You cannot unblock yourself");
    error.status = 400;
    throw error;
  }

  // if the user is not blocked
  // throw error
  if (!(await isUserBlocked({ tx, userId, otherUserId: blockedUserId }))) {
    const error = new Error("User not blocked");
    error.status = 400;
    throw error;
  }

  return await User.deleteBlock({
    tx,
    where: {
      userId,
      blockedUserId,
    },
  });
}

export async function blockUserService({ userId, blockedUserId }) {
  const payload = await User.transaction(async (tx) => {
    const result = await blockUser({ tx, userId, blockedUserId });
    return {
      userId: result.userId,
      blockedUserId: result.blockedUserId,
      message: "User blocked successfully",
    };
  });

  return payload;
}

export async function unblockUserService({ userId, blockedUserId }) {
  const payload = await User.transaction(async (tx) => {
    const result = await unblockUser({ tx, userId, blockedUserId });
    return {
      userId: result.userId,
      unblockedUserId: result.blockedUserId,
      message: "User unblocked successfully",
    };
  });

  return payload;
}
