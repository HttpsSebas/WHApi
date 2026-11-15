import { isUserBlocked } from "../../services/user.service.js";
import { userUpdateSchema } from "../schema/user.schema.js";

export async function validateUsersNotBlocked({ userId, participantIds }) {
  const participants = participantIds.filter(
    (participantId) => participantId !== userId,
  );

  const blockedRelation = await isUserBlocked({
    userId,
    participantIds: participants,
  });

  if (blockedRelation) {
    throw new Error(`${blockedRelation.blockedUser.name} is blocked`);
  }

  return true;
}

export async function validateUserUpdate(data) {
  await userUpdateSchema.parseAsync(data);
  return true;
}
