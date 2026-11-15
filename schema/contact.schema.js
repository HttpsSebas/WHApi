import z from "zod";

const contactSchema = z.object({
    alias: z.string().nullish(),
    phone: z.string(),
})

export default contactSchema