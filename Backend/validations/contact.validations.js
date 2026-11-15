import contactSchema from "../schema/contact.schema.js";

export const validateContactSchema = async (data) => {
    return await contactSchema.parseAsync(data);
};

export const validateContactUpdateSchema = async (data) => {
    return await contactSchema.partial().parseAsync(data);
};