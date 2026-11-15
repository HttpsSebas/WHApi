import { validateUsersNotBlocked, validateUserUpdateSchema } from "../../validations/user.validations.js";

export const areUsersNotBlocked = async (req, res, next) => {
    try {
        await validateUsersNotBlocked({ participantIds: req.body.participantIds, userId: req.user.id });
        next();
    } catch (e) {
        res.status(403).send({ message: e.message });
    }
}


export const validateUserUpdate = async (req, res, next) => {
    try {
        await validateUserUpdateSchema(req.body);
        next();
    } catch (e) {
        res.status(400).send({ message: e.message });
    }
}