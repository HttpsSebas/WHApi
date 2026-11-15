import { z } from "zod";

const participant = z.object({
  userId: z.number().or(z.string()).transform(Number),
  role: z.enum(["ADMIN", "MEMBER"]),
  unreadCount: z.number().or(z.string()).transform(Number),
  user: z.object({
    id: z.number().or(z.string()).transform(Number),
    name: z.string(),
    displayName: z.string(),
  }),
});

const lastMessageSchema = z.object({
  id: z.coerce.number().nullish(),
  chatId: z.coerce.number().nullish(),
  content: z.string().nullish(),
  createdAt: z.string().nullish(),
  senderId: z.coerce.number().nullish(),
});

const chatSchema = z.object({
  id: z.number().or(z.string()).transform(Number),
  type: z.enum(["PRIVATE", "GROUP"]),
  name: z.string().nullish(),
  description: z.string().nullish(),
  createdAt: z.string(),
  lastMessage: z
    .preprocess((val) => {
      if (val === null || val === undefined || val === "") {
        return null;
      }

      // Redis puede guardar sólo el contenido
      if (typeof val === "string") {
        return { content: val };
      }

      return val;
    }, lastMessageSchema.nullish())
    .transform((val) => val ?? null),

  lastMessageId: z.coerce.number().nullish(),
  participants: z.array(participant),
});

export default chatSchema;
