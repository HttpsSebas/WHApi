import z from "zod";

const chatSchema = z
  .object({
    name: z.string().nullish(),
    type: ChatType,
    participantIds: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    // GROUP
    if (data.type === "group") {
      if (!data.name) {
        ctx.addIssue({ message: "Group name is required" });
      }
      if (data.participantIds.length < 2) {
        ctx.addIssue({ message: "Group must have at least 2 participants" });
      }
    }

    // PRIVATE
    if (data.type === "private") {
      if (data.participantIds.length !== 2) {
        ctx.addIssue({
          message: "Private chat must have exactly 2 participants",
        });
      }
    }
  });

export const chatQuerySchema = z.object({
  id: z.string(),
  limit: z.number().nullish(),
  cursor: z.string().nullish(),
  search: z.string().nullish(),
  unread: z.boolean().nullish(),
});

export const chatInfoSchema = z.object({
  name: z.string().nullish(),
  description: z.string().nullish(),
});

const ChatType = z.enum(["group", "private"]);

export default chatSchema;
