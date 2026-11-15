import redisClient from "../redis-client.js";

export async function getUserContacts(userId) {
  try {
    const data = await redisClient.hGetAll(`user:${String(userId)}:contacts`);
    return Object.fromEntries(
      Object.entries(data).map(([contactId, contact]) => [
        contactId,
        JSON.parse(contact),
      ]),
    );
  } catch (e) {
    return {};
  }
}

export async function getUserContact(userId, contactId) {
  try {
    const data = await redisClient.hGet(
      `user:${String(userId)}:contacts`,
      String(contactId),
    );
    return JSON.parse(data) ?? null;
  } catch (e) {
    return null;
  }
}

export async function cacheContact(userId, data) {
  try {
    const parsedData = JSON.stringify(data);
    const key = `user:${String(userId)}:contacts`;
    return await redisClient.hSet(key, data.contactId, parsedData);
  } catch (e) {
    return null;
  }
}

export async function deleteContactsCache(userId) {
  return await redisClient.del(`user:${String(userId)}:contacts`);
}

export async function deleteContactFromCache(userId, contactId) {
  return await redisClient.hDel(
    `user:${String(userId)}:contacts`,
    String(contactId),
  );
}

export async function updateContactInCache(userId, contact) {
  const key = `user:${String(userId)}:contacts`;
  return await redisClient.hSet(key, contact.contactId, JSON.stringify(contact));
}
