import z from "zod";

const contactSchema = z.object({
    id: z.number().optional(),
    alias: z.string(),
    phone: z.string(),
})

const contactQuerySchema = z.object({
    userId: z.string(),
    alias: z.string().nullish(),
    phone: z.string().nullish(),
    skip: z.number().default(0),
    take: z.number().default(10),
})

export default contactSchema