import {
  getContact,
  getContacts,
} from "../services/contact.service.js";

export async function getContactsController(req, res) {
  const contacts = await getContacts({ userId: req.user.id });

  res.status(200).json({
    message: "Contacts fetched successfully",
    data: contacts,
  });
}

export async function getContactController(req, res) {
  const contact = await getContact({userId: Number(req.user.id), contactId: Number(req.params.contactId) });

  res.status(200).json({
    message: "Contact fetched successfully",
    data: contact,
  });
}


