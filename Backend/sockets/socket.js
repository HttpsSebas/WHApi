import { authMiddleware } from "../middlewares/socket/auth.middleware.js";
import {
  createChatEvent,
  editGroupEvent,
  addUserToGroup,
  deleteUserFromGroup,
  promoteMemberToAdmin,
  leaveChatGroupEvent,
  demoteMember,
} from "./events/chat.events.js";
import {
  newMessageEvent,
  readMessageEvent,
  messageSyncEvent,
  deleteMessageEvent,
} from "./events/message.events.js";
import {
  blockUserEvent,
  unblockUserEvent,
  updateUserEvent,
  disconnectUserEvent,
  connectUserEvent,
} from "./events/user.events.js";
import {
  createContactEvent,
  deleteContactEvent,
  updateContactEvent,
} from "./events/contact.events.js";

async function registerSockets(io) {
  // Socket middleware
  io.use(authMiddleware);

  // Socket events
  io.on("connection", async (socket) => {
    connectUserEvent(socket, io);

    // Listen chat event
    createChatEvent(socket, io);
    leaveChatGroupEvent(socket, io);
    editGroupEvent(socket, io);
    addUserToGroup(socket, io);
    deleteUserFromGroup(socket, io);
    promoteMemberToAdmin(socket, io);
    demoteMember(socket, io);

    // Listen message event
    newMessageEvent(socket, io);
    readMessageEvent(socket, io);
    messageSyncEvent(socket, io);
    deleteMessageEvent(socket, io);

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
