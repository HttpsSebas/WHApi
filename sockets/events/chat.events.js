import {
  createChatService,
  leaveChatGroupService,
  addUserToGroupService,
  deleteUserFromGroupService,
  upgradeUserToAdmin,
  downgradeUserToMember,
  editGroupInfo,
} from "../../services/chat.service.js";
import { validateIsInChat } from "../middlewares/chat.middleware.js";
import { validateUsersNotBlocked } from "../middlewares/user.middleware.js";

export function createChatEvent(socket, io) {
  socket.on("chat:create", async (data) => {
    try {
      const participants = [
        ...new Set([...data.participants, socket.data.user.id]),
      ];

      await validateUsersNotBlocked({ userId: socket.data.user.id, blockedUserIds: participants });

      const result = await createChatService({
        userId: socket.data.user.id,
        chat: data.chat,
        participants: participants,
      });

      participants.forEach((participantId) => {
        io.to(`user:${participantId}`).socketsJoin(`chat:${result.id}`);
      });

      io.to(`chat:${result.id}`).emit("chat:create", result);
    } catch (e) {
      socket.emit("error", e.message);
    }
  });
}

export function editGroupEvent(socket, io) {
  socket.on("chat:group:edit", async (data) => {
    try {
      await validateIsInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });
      const payload = await editGroupInfo({
        chatId: data.chatId,
        data: data.chat,
      });

      io.to(`chat:${data.id}`).emit("chat:group:edit", payload);
    } catch (e) {
      socket.emit("error", e.message);
    }
  });
}

export function leaveChatGroupEvent(socket, io) {
  socket.on("chat:group:leave", async (data) => {
    try {
      const payload = await leaveChatGroupService({
        userId: socket.data.user.id,
        chatId: data.chatId,
        user: socket.data.user,
      });

      io.to(`chat:${data.id}`).emit("chat:group:leave", payload);
      io.to(`user:${socket.data.user.id}`).socketsLeave(`chat:${data.id}`);
    } catch (e) {
      socket.emit("error", e.message);
    }
  });
}

export function addUserToGroup(socket, io) {
  socket.on("chat:group:add", async (data) => {
    try {

      await validateUsersNotBlocked({ userId: socket.data.user.id, blockedUserIds: [data.userId] });
      
      await validateIsInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });
      const payload = await addUserToGroupService({
        userId: data.userId,
        chatId: data.chatId,
        memberId: socket.data.user.id,
      });

      io.to(`user:${data.userId}`).socketsJoin(`chat:${data.chatId}`);
      io.to(`chat:${data.chatId}`).emit("chat:group:add", payload);
    } catch (e) {
      socket.emit("error", e.message);
    }
  });
}

export function deleteUserFromGroup(socket, io) {
  socket.on("chat:group:kick", async (data) => {
    try {
      await validateIsInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });
      const payload = await deleteUserFromGroupService({
        userId: data.userId,
        chatId: data.chatId,
        memberId: socket.data.user.id,
      });
      io.to(`chat:${data.chatId}`).emit("chat:group:kick", payload);
      io.to(`user:${data.userId}`).socketsLeave(`chat:${data.chatId}`);
    } catch (e) {
      socket.emit("error", e.message);
    }
  });
}

export function upgradeMemberToAdmin(socket, io) {
  socket.on("chat:group:admin", async (data) => {
    try {
      await validateIsInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });
      const payload = await upgradeUserToAdmin({
        userId: data.userId,
        chatId: data.chatId,
        memberId: socket.data.user.id,
      });

      io.to(`chat:${data.chatId}`).emit("chat:group:admin", payload);
    } catch (e) {
      socket.emit("error", e.message);
    }
  });
}

export function downgradeMemberToMember(socket, io) {
  socket.on("chat:group:demote", async (data) => {
    try {
      await validateIsInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });
      const payload = await downgradeUserToMember({
        userId: data.userId,
        chatId: data.chatId,
        memberId: socket.data.user.id,
      });
      io.to(`chat:${data.chatId}`).emit("chat:group:demote", payload);
    } catch (e) {
      socket.emit("error", e.message);
    }
  });
}
