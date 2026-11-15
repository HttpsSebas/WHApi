import { contactSchema } from "../schema/contact.schema.js";

export async function validateContact(contact) {
  const validatedContact = await contactSchema.parseAsync(contact);
  return validatedContact;
}

export async function validateContactUpdate(contact) {
  const validatedContact = await contactSchema.partial().parseAsync(contact);
  return validatedContact;
}
