import {
  validateQueryParams,
  validateChatData,
  validateIsInChat,
  validateGroupInfo,
} from "../../validations/chat.validations.js";

export const validateChat = async (req, res, next) => {
  try {
    const participantIds = [
      ...new Set([...req.body.participantIds, req.user.id]),
    ];
    await validateChatData({ ...req.body, participantIds });
    next();
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
};

export const isUserInChat = async (req, res, next) => {
  try {
    await validateIsInChat({userId: req.user.id, chatId: req.params.id});
    next();
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
};

export const validateChatQuery = async (req, res, next) => {
  try {
    await validateQueryParams(req.query);
    next();
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
};

export const validateGroupData = async (req, res, next) => {
  try {
    await validateGroupInfo(req.body);
    next();
  } catch (e) {
    res.status(400).send({ message: e.message });
  }
};
