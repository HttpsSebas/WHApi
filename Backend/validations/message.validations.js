import messageSchema from "../schema/message.schema.js";

export const validateMessage = async (data) => {
  await messageSchema.parseAsync(data);
};
