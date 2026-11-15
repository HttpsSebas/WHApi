import chatSchema, { chatInfoSchema, chatQuerySchema } from "../schema/chat.schema.js";
import { isUserInChat } from "../services/chat.service.js";
import z from "zod";

export const validateChatData = async (data) => {
  try{
    await chatSchema.parseAsync(data);
    if (data.type === "PRIVATE" && data.participantIds.includes(data.userId)) {
      throw new Error("You cannot create a private chat with yourself");
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new Error(e.issues[0].message);
    }
  }
};

export const validateQueryParams = async (params) => {
  await chatQuerySchema.partial().parseAsync(params);
};

export const validateIsInChat = async ({ userId, chatId }) => {
  const isInChat = await isUserInChat({ userId, chatId: Number(chatId) });
  if (!isInChat) throw new Error("Unauthorized");
};

export const validateGroupInfo = async (data) => {
  if (!data.name && !data.description) {
    throw new Error("Group name or description is required");
  }

  await chatInfoSchema.parseAsync(data);
};
