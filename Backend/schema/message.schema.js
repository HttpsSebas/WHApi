import z from "zod";

const messageSchema = z.object({
    message: z.string(),
    chatId: z.string().transform(Number),
    senderId: z.number().int()
})

export default messageSchema