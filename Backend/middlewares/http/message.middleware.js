import { validateMessage } from "../../validations/message.validations.js";

export const validateMessageData = async (req, res, next) => {
    try {
        await validateMessage(req.body);
        next();
    } catch (e) {
        res.status(400).send({ message: e.message });
    }
};