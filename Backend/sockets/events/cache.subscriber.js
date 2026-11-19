import { deleteUserChats } from "../../schema/redis/keys/chat.keys.js";
import {
  deleteContactsCacheForUsers,
  updateContactInCache,
} from "../../schema/redis/keys/contact.keys.js";
import {
  createChatCache,
  updateChatCache,
  editChatParticipant,
  deleteChatCache,
  createChatParticipantsCache,
  setUnreadCountInCache,
  cacheUserChat,
  addChatToUser,
  deleteUserChat,
  deleteChatParticipantsCache,
} from "../schema/redis/keys/chat.keys.js";

import {
  deleteMessageCache,
  createMessageCache,
  createMessagesCache,
  editMessageCache,
} from "../schema/redis/keys/message.keys.js";

import { on } from "./eventBus.js";

/* ------------------------------------------------------------------ */
/* CHAT                                                               */
/* ------------------------------------------------------------------ */

on("chat.created", async ({ chat, participants }) => {
  await createChatCache(chat, participants);

  await Promise.all(
    participants.map((p) =>
      Promise.all([
        cacheUserChat(p.userId, chat.id, { unreadCount: p.unreadCount ?? 0 }),
        addChatToUser(
          p.userId,
          chat.id,
          new Date(chat.lastMessage?.createdAt ?? chat.createdAt).getTime(),
        ),
      ]),
    ),
  );
});

on("chat.updated", async ({ chatId, data }) => {
  await updateChatCache(chatId, data);
});

on("chat.deleted", async ({ chatId, participantIds }) => {
  await deleteChatCache(chatId);
  await deleteChatParticipantsCache(chatId);
  await Promise.all(
    participantIds.map((userId) => deleteUserChat([userId], chatId)),
  );
});

/* ------------------------------------------------------------------ */
/* CHAT PARTICIPANTS                                                  */
/* ------------------------------------------------------------------ */

on("chat.participants.created", async ({ chatId, participants }) => {
  await createChatParticipantsCache(chatId, participants);
});

on(
  "chat.participant.added",
  async ({ chatId, participants, lastMessageAt }) => {
    const score = new Date(lastMessageAt ?? Date.now()).getTime();

    await Promise.all(
      participants.map((p) =>
        Promise.all([
          editChatParticipant(chatId, p.userId, p),
          cacheUserChat(p.userId, chatId, { unreadCount: p.unreadCount ?? 0 }),
          addChatToUser(p.userId, chatId, score),
        ]),
      ),
    );
  },
);

on("chat.participant.removed", async ({ chatId, userId }) => {
  await editChatParticipant(chatId, userId, null);
  await deleteUserChat([userId], chatId);
});

on("chat.participant.roleChanged", async ({ chatId, userId, role }) => {
  await editChatParticipant(chatId, userId, { role });
});

/* ------------------------------------------------------------------ */
/* UNREAD COUNTS                                                      */
/* ------------------------------------------------------------------ */

on("chat.unreadCount.updated", async ({ chatId, userId, unreadCount }) => {
  await setUnreadCountInCache({
    chatId,
    userId,
    unreadCount,
  });
});

on("chat.unreadCounts.synced", async ({ chatId, participants }) => {
  await Promise.all(
    participants.map((participant) =>
      emit("chat.unreadCount.updated", {
        chatId,
        userId: participant.userId,
        unreadCount: participant.unreadCount,
      }),
    ),
  );
});

/* ------------------------------------------------------------------ */
/* MESSAGES                                                           */
/* ------------------------------------------------------------------ */

on("message.created", async ({ chatId, message }) => {
  await updateChatCache(chatId, { lastMessageId: message.id });
  await createMessageCache(chatId, message);
});

on("messages.created", async ({ chatId, messages }) => {
  await createMessagesCache(chatId, messages);
});

on("message.deleted", async ({ chatId, data }) => {
  await deleteMessageCache(chatId, data.messageId);
  await updateChatCache(chatId, {
    lastMessageId: data.lastMessage?.id ?? null,
    lastMessage: data.lastMessage?.content ?? null,
  });
});

on(
  "message.globalStatus.updated",
  async ({ chatId, messageId, globalStatus }) => {
    await editMessageCache(chatId, messageId, {
      globalStatus,
    });
  },
);

on("messages.globalStatus.updated", async ({ messages }) => {
  await Promise.all(
    messages.map((message) =>
      emit("message.globalStatus.updated", {
        chatId: message.chatId,
        messageId: message.id,
        globalStatus: message.globalStatus,
      }),
    ),
  );
});

/* ------------------------------------------------------------------ */
/* USERS                                                         */
/* ------------------------------------------------------------------ */

on("user.loggedOut", async ({ userId }) => {
  await deleteUserChats([userId]);
});

on("user.updated", async ({ userIds }) => {
  await deleteContactsCacheForUsers(userIds);
});

/* ------------------------------------------------------------------ */
/* CONTACTS                                                         */
/* ------------------------------------------------------------------ */

on("contact.create", async ({ userId, contact }) => {
  await cacheContact(userId, JSON.stringify(contact));
});

on("contacts.create", async ({ userId, contacts }) => {
  await Promise.all(
    contacts.map((contact) => cacheContact(userId, JSON.stringify(contact))),
  );
});

on("contact.update", async ({ userId, contact }) => {
  await updateContactInCache(userId, contact);
});

on("contact.delete", async ({ userId, contactId }) => {
  await deleteContactFromCache(userId, contactId);
});
