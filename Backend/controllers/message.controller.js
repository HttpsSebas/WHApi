import {
  getMessages,
} from "../services/message.service.js";

export async function getMessagesController(req, res) {
  try {
    const chatId = Number(req.params.chatId);
    const messages = await getMessages({
      userId: req.user.id,
      chatId,
      query: req.query,
    });

    res.status(200).json({
      message: "Messages fetched successfully",
      data: messages,
    });
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}