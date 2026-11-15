import z from "zod";
import { ChatType } from "@prisma/client";

const chatSchema = z
  .object({
    name: z.string().nullish(),
    type: z.nativeEnum(ChatType),
    participantIds: z.array(z.number()),
  })
  .superRefine((data, ctx) => {
    if (data.type === "GROUP") {
      if (!data.name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["name"],
          message: "Group name is required",
        });
      }

      if (data.participantIds.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["participantIds"],
          message: "Group must have at least 2 participants",
        });
      }
    }
  });

export const chatQuerySchema = z.object({
  id: z.string(),
  limit: z.number().nullish(),
  search: z.string().nullish(),
  unread: z.boolean().nullish(),
});

export const chatInfoSchema = z.object({
  name: z.string().nullish(),
  description: z.string().nullish(),
});

export default chatSchema;
