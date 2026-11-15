import { validateContactSchema, validateContactUpdateSchema } from "../../validations/contact.validations.js";

export const validateContact = async (req, res, next) => {
  try {
    await validateContactSchema(req.body);
    next();
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
};

export const validateContactUpdate = async (req, res, next) => {
  try {
    await validateContactUpdateSchema(req.body);
    next();
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
};
