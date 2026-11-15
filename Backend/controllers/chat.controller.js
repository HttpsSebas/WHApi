import {
  getChats,
  getChatById,
  deleteChat,
} from "../services/chat.service.js";

export async function getChatsController(req, res) {
  try {
    const chats = await getChats({ userId: req.user.id });


    res.json({
      message: "Chats fetched successfully",
      data: chats,
    });
  } catch (e) {
    console.log(e);
    res.status(e.status || 500).send({ message: e.message });
  }
}

export async function getChatByIdController(req, res) {
  try{
    const chatId = Number(req.params.id);
    const chat = await getChatById({ chatId, userId: req.user.id });
    res.json({
      message: "Chat fetched successfully",
      data: chat,
    });
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}

export async function deleteChatController(req, res) {
  try {
    const { chatId } = req.params;
    const payload = await deleteChat({
      chatId,
      userId: req.user.id,
    });

    res.status(200).json({
      payload,
    });
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}
