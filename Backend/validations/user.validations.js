import { userBlockedRelation } from "../services/user.service.js";
import { userUpdateSchema } from "../schema/user.schema.js";

export const validateUsersNotBlocked = async ({ userId, participantIds }) => {
  const blockedRelation = await userBlockedRelation({
    userId,
    participantIds
  });
  if (blockedRelation) {
    throw new Error(`${blockedRelation.blockedUser.name} is blocked`);
  }
  return true;
};

export const validateUserUpdateSchema = async (data) => {
    await userUpdateSchema.parseAsync(data);
}