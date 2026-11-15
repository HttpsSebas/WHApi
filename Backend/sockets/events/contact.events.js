import {
  createContact,
  updateContact,
  deleteContact,
} from "../../services/contact.service.js";
import {
  validateContact,
  validateContactUpdate,
} from "../../middlewares/socket/contact.middleware.js";

export function createContactEvent(socket, io) {
  socket.on("contact:create", async (data) => {
    try {
      // Using validatedContact from middleware for security
      const validatedContact = await validateContact(data.contact);

      const payload = await createContact({
        userId: socket.data.user.id,
        contact: validatedContact,
      });

      // Returning data to client
      io.to(`user:${socket.data.user.id}`).emit("contact:created", payload);
    } catch (e) {
      socket.emit("contact:error", {
        message: e.message,
        code: e.code || "CONTACT_ERROR",
      });
      
    }
  });
}

export function updateContactEvent(socket, io) {
  socket.on("contact:update", async (data, callback) => {
    try {
      // Using validatedContact from middleware for security
      const validatedContact = await validateContactUpdate(data.contact);

      const payload = await updateContact({
        userId: socket.data.user.id,
        contactId: data.id,
        contact: validatedContact,
      });

      // Returning data to client
      io.to(`user:${socket.data.user.id}`).emit("contact:updated", payload);
      callback({ ok: true, data: payload.data });
    } catch (e) {
      console.log(e);
      socket.emit("contact:error", {
        message: e.message,
        code: e.code || "CONTACT_ERROR",
      });
      callback({ ok: false, error: e.message });
    }
  });
}

export function deleteContactEvent(socket, io) {
  socket.on("contact:delete", async (data, callback) => {
    try {
      const payload = await deleteContact({
        userId: Number(socket.data.user.id),
        contactId: data.contactId,
      });
      io.to(`user:${socket.data.user.id}`).emit("contact:deleted", payload);
      callback({ ok: true, payload });
    } catch (e) {
      socket.emit("contact:error", {
        message: e.message,
        code: e.code || "CONTACT_ERROR",
      });
      callback({ ok: false, error: e.message });
    }
  });
}
