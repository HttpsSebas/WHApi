import {z} from "zod";

const userSchema = z.object({
    phone: z.string(),
    password: z.string().min(6),
    name: z.string(),
    description: z.string().nullish(),
})

export const userUpdateSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    description: z.string().nullish(),
})

export default userSchema