import { Contact } from "../models/contact.model.js";
import { findUser } from "./user.service.js";
import {
  getUserContacts,
} from "../schema/redis/keys/contact.keys.js";

export async function getContacts({ userId }) {
  try {
    const contacts = await getUserContacts(userId);

    // Get contacts from cache
    if (Object.keys(contacts).length > 0) {
      return Object.values(contacts);
    }

    const result = await Contact.findMany({
      userId,
    });

    // Set contacts in cache
    await emit("contacts.create", {
      userId,
      contacts: result,
    });

    return result;
  } catch (e) {
    console.log(e);
  }
}

export async function applyContactAliases(chats, userId) {
  try {
    const contacts = await getUserContacts(userId);

    const updatedChats = chats.map((chat) => ({
      ...chat,
      participants: chat.participants.map((participant) => {
        const contact = contacts[String(participant.userId)];

        return {
          ...participant,
          user: {
            ...participant.user,
            displayName: contact?.alias ?? participant.user.name,
            contact: contact ?? null,
          },
        };
      }),
    }));

    return updatedChats;
  } catch (e) {
    return chats;
  }
}

export async function verifyContactPhone({ tx = prisma, contactPhone }) {
  const user = await findUser({ tx, phone: contactPhone });

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  if (user.phone === contactPhone) {
    const error = new Error("You cannot add yourself as a contact");
    error.status = 400;
    throw error;
  }

  return true;
}

export async function getContact({ tx = prisma, userId, contactId }) {
  const contact = await Contact.findFirst({
    tx,
    userId,
    contactId,
  });

  return contact;
}

export async function validateUserContact({ tx = prisma, userId, contactId }) {
  const contact = await getContact({ tx, userId, contactId });
  if (contact.userId !== userId) {
    const error = new Error("Contact not found");
    error.status = 404;
    throw error;
  }

  return;
}

export async function createContact({ userId, contact }) {
  try {
    const payload = await Contact.transaction(async (tx) => {
      await verifyContactPhone({ tx, userId, contactPhone: contact.phone });
      const isAlreadyContact = await getContact({
        tx,
        userId,
        contactId: contact.contactId,
      });

      if (isAlreadyContact) {
        const error = new Error("Contact already exists");
        error.status = 400;
        throw error;
      }

      const user = await findUser({ tx, phone: contact.phone });
      if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      const newContact = await Contact.create({
        tx,
        userId,
        contactId: user.id,
        contact,
      });

      return {
        message: "Contact created successfully",
        data: newContact,
      };
    });

    await emit("contact.create", { userId, contact: payload.data });

    return payload;
  } catch (err) {
    throw err;
  }
}

export async function updateContact({ userId, contactId, contact }) {
  const payload = await Contact.transaction(async (tx) => {
    const updated = await Contact.update({
      tx,
      userId,
      contactId,
      data: contact,
    });

    if (updated.count === 0) {
      const error = new Error("Contact not found");
      error.status = 404;
      throw error;
    }

    const updatedContact = await getContact({ tx, userId, contactId });

    return {
      message: "Contact updated successfully",
      data: updatedContact,
    };
  });

  await emit("contact.update", { userId, contact: payload.data });

  return payload;
}

export async function deleteContact({ userId, contactId }) {
  const payload = await Contact.transaction(async (tx) => {
    const deletedContact = await Contact.delete({
      tx,
      userId,
      contactId,
    });

    if (deletedContact.count === 0) {
      const error = new Error("Contact not found");
      error.status = 404;
      throw error;
    }

    return {
      message: "Contact deleted successfully",
      data: deletedContact,
    };
  });

  await emit("contact.delete", { userId, contactId });

  return payload;
}
