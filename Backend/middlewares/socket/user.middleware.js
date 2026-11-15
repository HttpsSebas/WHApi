import {
  validateUsersNotBlocked,
  validateUserUpdateSchema,
} from "../../validations/user.validations.js";

export const areUsersNotBlocked = async ({ userId, participantIds }) => {
  try {
    await validateUsersNotBlocked({ userId, participantIds });
  } catch (e) {
    throw new Error(e);
  }
};

export const validateUserUpdate = async (data) => {
  try {
    await validateUserUpdateSchema(data);
  } catch (e) {
    throw new Error(e.message);
  }
};
