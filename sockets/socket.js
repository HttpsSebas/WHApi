import { getUserFromToken } from "../services/auth.service.js";
import { getChatIds } from "../services/chat.service.js";
import {
  createChatEvent,
  editGroupEvent,
  addUserToGroup,
  deleteUserFromGroup,
  upgradeMemberToAdmin,
  downgradeMemberToMember,
  leaveChatGroupEvent,
} from "./events/chat.events.js";
import { newMessageEvent, readMessageEvent } from "./events/message.events.js";
import {
  blockUserEvent,
  unblockUserEvent,
  updateUserEvent,
  disconnectUserEvent
} from "./events/user.events.js";
import {
  createContactEvent,
  deleteContactEvent,
  updateContactEvent,
} from "./events/contact.events.js";

import { updateUser } from "../services/user.service.js";

async function registerSockets(io) {
  // Socket middleware
  io.use(async (socket, next) => {
    // If user is authenticated, carry on
    try {
      const token = socket.handshake.auth.token;
      const user = getUserFromToken(token);

      if (!token || !user) {
        throw new Error("Unauthorized");
      }

      const onlineUser = await updateUser(user.id, { isOnline: true });
      socket.data.user = onlineUser;
      next();
    } catch (e) {
      next(new Error("Unauthorized"));
    }
  });

  // Socket events
  io.on("connection", async (socket) => {
    console.log(`User ${socket.data.user.name} connected`);
    const { id } = socket.data.user;

    // Multi-device support
    socket.join(`user:${id}`);

    // Join socket to rooms (chats)
    const chatIds = await getChatIds({ userId: id });
    chatIds.forEach((chat) => {
      socket.join(`chat:${chat.id}`);
    });

    // Listen chat event
    createChatEvent(socket, io);
    leaveChatGroupEvent(socket, io);
    editGroupEvent(socket, io);
    addUserToGroup(socket, io);
    deleteUserFromGroup(socket, io);
    upgradeMemberToAdmin(socket, io);
    downgradeMemberToMember(socket, io);

    // Listen message event
    newMessageEvent(socket, io);
    readMessageEvent(socket, io);

    // Listen user event
    blockUserEvent(socket, io);
    unblockUserEvent(socket, io);
    updateUserEvent(socket, io);
    disconnectUserEvent(socket, io);

    // Listen contact event
    createContactEvent(socket, io);
    deleteContactEvent(socket, io);
    updateContactEvent(socket, io);

  });
}

export default registerSockets;
