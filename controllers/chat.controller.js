import {
  getChats,
  createChats,
  deleteChats,
} from "../services/chat.service.js";

export async function getChatController(req, res) {
  try {
    const chats = await getChats({ userId: req.user.id, query: req.query });

    res.json({
      message: "Chats fetched successfully",
      data: chats,
    });
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}

export async function createChatController(req, res) {
  const { type, name, participantIds } = req.body;

  try {
    const participants = [...new Set([...participantIds, req.user.id])];

    const chat = await createChats({
      userId: req.user.id,
      chat: { type, name },
      participants,
    });

    res.status(201).json({
      message: "Chat created successfully",
      data: chat,
    });
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}

export async function deleteChatController(req, res) {
  try {
    const chat = await deleteChats({ id: req.params.id, userId: req.user.id });

    res.json({
      message: "Chat deleted successfully",
      data: chat,
    });
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}
