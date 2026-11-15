import {
  validateContactSchema,
  validateContactUpdateSchema,
} from "../../validations/contact.validations.js";

export const validateContact = async (contact) => {
  try {
    const validatedContact = await validateContactSchema(contact);
    return validatedContact;
  } catch (e) {
    throw new Error(e.message);
  }
};

export const validateContactUpdate = async (contact) => {
  try {
    const validatedContact = await validateContactUpdateSchema(contact);
    return validatedContact;
  } catch (e) {
    throw new Error(e.message);
  }
};
