import {
  createContact,
  updateContact,
  deleteContact,
} from "../../services/contact.service.js";
import {
  validateContact,
  validateContactUpdate,
} from "../middlewares/contact.middleware.js";

export function createContactEvent(socket, io) {
  socket.on("contact:create", async (data) => {
    try {
      const validatedContact = await validateContact(data.contact);

      const payload = await createContact({
        userId: socket.data.user.id,
        contact: validatedContact,
      });
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
  socket.on("contact:update", async (data) => {
    try {
      if (!data.id) {
        throw new Error("Contact ID is invalid");
      }
      const validatedContact = await validateContactUpdate(data.contact);

      const payload = await updateContact({
        userId: socket.data.user.id,
        contactId: data.id,
        contact: validatedContact,
      });
      io.to(`user:${socket.data.user.id}`).emit("contact:updated", payload);
    } catch (e) {
      socket.emit("contact:error", {
        message: e.message,
        code: e.code || "CONTACT_ERROR",
      });
    }
  });
}

export function deleteContactEvent(socket, io) {
  socket.on("contact:delete", async (data) => {
    try {
      if (!data.id) {
        throw new Error("Contact ID is invalid");
      }

      const payload = await deleteContact({
        userId: socket.data.user.id,
        contactId: data.id,
      });
      io.to(`user:${socket.data.user.id}`).emit("contact:deleted", payload);
    } catch (e) {
      socket.emit("contact:error", {
        message: e.message,
        code: e.code || "CONTACT_ERROR",
      });
    }
  });
}
