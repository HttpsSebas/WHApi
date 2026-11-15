import { getContacts, createContacts } from "../services/contact.service.js";

export async function getContactsController(req, res) {
  const contacts = await getContacts({ userId: req.user.id });

  res.json({
    message: "Contacts fetched successfully",
    data: contacts,
  });
}

export async function createContactsController(req, res) {
  try {
    const contact = await createContacts({
      userId: req.user.id,
      userPhone: req.user.phone,
      contact: req.body,
    });

    res.json({
      message: "Contact created successfully",
      data: contact,
    });
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}
