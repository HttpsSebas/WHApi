import z from "zod";

const messageSchema = z.object({
    message: z.string(),
    chatId: z.string(),
    senderId: z.string()
})

export default messageSchema