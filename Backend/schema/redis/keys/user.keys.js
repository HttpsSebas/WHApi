import redisClient from "../redis-client.js";

export async function cacheUserPresence({ userId, data = {} }) {
  try {
    const key = `user:${String(userId)}:presence`;

    const result = await redisClient.set(key, JSON.stringify(data), "EX", 600);

    return result;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function getUserPresence(userId) {
  try {
    const key = `user:${String(userId)}:presence`;

    const data = await redisClient.get(key);

    if (!data) {
      return {
        isOnline: false,
        lastSeenAt: null,
      };
    }

    const parsed = JSON.parse(data);

    return {
      isOnline: parsed.isOnline === true || parsed.isOnline === "true",
      lastSeenAt: parsed.lastSeenAt || null,
    };
  } catch (e) {
    return null;
  }
}

export async function getUserPresences(userIds) {
  try {

    if (!userIds || userIds.length === 0) return {};

    const keys = userIds.map((userId) => `user:${String(userId)}:presence`);

    const values = await redisClient.mGet(keys);

    const result = {};

    userIds.forEach((userId, index) => {
      const presence = values[index];

      if (presence) {
        const parsed = JSON.parse(presence);
        result[userId] = {
          isOnline: parsed.isOnline === true || parsed.isOnline === "true",
          lastSeenAt: parsed.lastSeenAt || null,
        };
      } else {
        result[userId] = {
          isOnline: false,
          lastSeenAt: null,
        };
      }
    });

    return result;
  } catch (e) {
    console.log(e);
    return {};
  }
}

export async function removeUserPresence(userId) {
  const key = `user:${String(userId)}:presence`;

  return await redisClient.del(key);
}
