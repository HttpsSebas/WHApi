import chatSchema from "../schema/chat.schema.js";

const validateChat = async (req, res, next) => {
    try {
        await chatSchema.parseAsync(req.body);
        if (req.body.type === "private" && req.body.participantIds.includes(req.user.id)) {
            throw new Error("You cannot create a private chat with yourself");
        }
        next();
    } catch (e) {
        res.status(400).send({ message: e.message });
    }
};

export const validateQueryParams = async (req, res, next) => {
    try {
        await chatSchema.partial().parseAsync(req.query);
        next();
    } catch (e) {
        res.status(400).send({ message: e.message });
    }
};


export default validateChat;