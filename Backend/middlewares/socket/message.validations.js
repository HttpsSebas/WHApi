import { validateMessage } from "../../validations/message.validations";

export const validateMessageData = async (data) => {
    try {
        await validateMessage(data);
        next();
    } catch (e) {
        res.status(400).send({ message: e.message });
    }
};