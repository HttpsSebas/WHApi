import { isUserInChat } from "../../services/chat.service.js";
import { chatInfoSchema } from "../../schema/chat.schema.js";


export async function validateIsInChat({ userId, chatId }) {
  const isInChat = await isUserInChat({ userId, chatId });
  if (!isInChat) throw new Error("Unauthorized");
}

export async function validateGroupInfo(data) {
  if (!data.name && !data.description) {
    throw new Error("Group name or description is required");
  }

  await chatInfoSchema.parseAsync(data);

  return data;
}
