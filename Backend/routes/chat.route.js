import { Router } from "express";
import {
  getChatsController,
  getChatByIdController,
  deleteChatController,
} from "../controllers/chat.controller.js";

import {
  validateChatQuery,
  isUserInChat,
} from "../middlewares/http/chat.middleware.js";

const chatRouter = Router();

chatRouter.get("/", validateChatQuery, getChatsController);
chatRouter.get("/:id", isUserInChat, getChatByIdController);

chatRouter.delete("/:id", isUserInChat, deleteChatController);

export default chatRouter;
