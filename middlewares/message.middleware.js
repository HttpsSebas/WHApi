import messageSchema from "../schema/message.schema.js";

export const validateMessage = async (req, res, next) => {
    try {
        await messageSchema.parseAsync(req.body);
        next();
    } catch (e) {
        res.status(400).send({ message: e.message });
    }
};