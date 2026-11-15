import {
  createChatService,
  leaveChatGroupService,
  addUserToGroupService,
  deleteUserFromGroupService,
  upgradeUserToAdmin,
  downgradeUserToMember,
  editGroupInfo,
  getChatParticipants,
  getChatById,
  getChatParticipantIds,
} from "../../services/chat.service.js";
import {
  validateIsSocketInChat,
  validateGroupData,
  validateChat,
} from "../../middlewares/socket/chat.middleware.js";
import { areUsersNotBlocked } from "../../middlewares/socket/user.middleware.js";

export function createChatEvent(socket, io) {
  socket.on("chat:create", async (data, callback) => {
    try {
      const { type, name, participantIds } = data;
      const participants = [
        ...new Set([...participantIds, socket.data.user.id]),
      ];

      await validateChat({ type, name, participantIds: participants });

      await areUsersNotBlocked({
        userId: socket.data.user.id,
        participantIds: participants,
      });

      const result = await createChatService({
        userId: socket.data.user.id,
        chat: {
          type,
          name,
        },
        participants,
      });

      const rooms = participants.map((p) => `user:${String(p)}`);

      io.to(rooms).emit("chat:created", result.chat);

      callback({
        ok: true,
        message: result.message,
        data: result.chat,
      });
    } catch (e) {
      socket.emit("chat:create:error", e.message);
      callback({
        ok: false,
        error: e.message,
      });
    }
  });
}

export function editGroupEvent(socket, io) {
  socket.on("chat:group:edit", async (data, callback) => {
    try {
      await validateIsSocketInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });

      await validateGroupData({ data: data.chat });

      await editGroupInfo({
        chatId: data.chatId,
        data: data.chat,
        userId: socket.data.user.id,
      });

      const [participants, updatedChat] = await Promise.all([
        getChatParticipants({ chatId: data.chatId }),
        getChatById({ chatId: data.chatId }),
      ]);

      const userRooms = participants.map((p) => `user:${p.userId}`);

      if (userRooms.length > 0) {
        io.to(userRooms).emit("chat:updated", updatedChat);
      }

      callback({
        ok: true,
        message: "Chat updated successfully",
      });
    } catch (e) {
      callback({
        ok: false,
        error: e.message,
      });
      socket.emit("chat:group:edit:error", e.message);
    }
  });
}

export function leaveChatGroupEvent(socket, io) {
  socket.on("chat:group:leave", async (data, callback) => {
    try {
      const payload = await leaveChatGroupService({
        userId: socket.data.user.id,
        chatId: data.chatId,
        user: socket.data.user,
      });

      io.to(`chat:${data.chatId}`).emit("chat:group:leaved", payload);
      io.to(`user:${socket.data.user.id}`).socketsLeave(`chat:${data.chatId}`);
      callback({
        ok: true,
        message: payload.message,
      });
    } catch (e) {
      callback({
        ok: false,
        error: e.message,
      });
      socket.emit("chat:group:leave:error", e.message);
    }
  });
}

export function addUserToGroup(socket, io) {
  socket.on("chat:group:add", async (data, callback) => {
    try {
      await areUsersNotBlocked({
        userId: socket.data.user.id,
        participantIds: data.userIds,
      });

      await validateIsSocketInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });
      const payload = await addUserToGroupService({
        userIds: data.userIds,
        chatId: data.chatId,
        memberId: socket.data.user.id,
      });

      const participants = await getChatParticipantIds({ chatId: data.chatId });

      const rooms = participants.map((p) => 
        `user:${String(p.userId)}`
      );

      io.to(rooms).emit("chat:group:added", payload);

      callback({
        ok: true,
        message: payload.message,
      });
    } catch (e) {
      callback({
        ok: false,
        error: e.message,
      });
      socket.emit("chat:group:add:error", e.message);
    }
  });
}

export function deleteUserFromGroup(socket, io) {
  socket.on("chat:group:kick", async (data, callback) => {
    try {
      await validateIsSocketInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });
      const payload = await deleteUserFromGroupService({
        userToBeDeletedId: data.userId,
        chatId: data.chatId,
        adminId: socket.data.user.id,
      });
      io.to(`user:${data.userId}`).emit("chat:group:kicked", payload);
      io.to(`user:${data.userId}`).socketsLeave(`chat:${data.chatId}`);

      callback({
        ok: true,
        message: payload.message,
      });
    } catch (e) {
      callback({
        ok: false,
        error: e.message,
      });
      socket.emit("chat:group:kick:error", e.message);
    }
  });
}

export function promoteMemberToAdmin(socket, io) {
  socket.on("chat:group:admin", async (data, callback) => {
    try {
      await validateIsSocketInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });
      const payload = await upgradeUserToAdmin({
        userToBeUpgradedId: data.userId,
        chatId: data.chatId,
        adminId: socket.data.user.id,
      });

      io.to(`chat:${data.chatId}`).emit("chat:group:upgraded", payload);

      callback({
        ok: true,
        payload,
      });
    } catch (e) {
      callback({
        ok: false,
        error: e.message,
      });
      socket.emit("chat:group:admin:error", e.message);
    }
  });
}

export function demoteMember(socket, io) {
  socket.on("chat:group:demote", async (data, callback) => {
    try {
      await validateIsSocketInChat({
        userId: socket.data.user.id,
        chatId: data.chatId,
      });
      const payload = await downgradeUserToMember({
        userToBeDemotedId: data.userId,
        chatId: data.chatId,
        adminId: socket.data.user.id,
      });
      io.to(`chat:${data.chatId}`).emit("chat:group:demoted", payload);

      callback({
        ok: true,
        payload,
      });
    } catch (e) {
      socket.emit("chat:group:demote:error", e.message);
      callback({
        ok: false,
        error: e.message,
      });
    }
  });
}
