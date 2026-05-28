import { Router } from "express";
import {
  createChatController,
  getChatController,
} from "../controllers/chat.controller.js";
import validateChat, { validateQueryParams } from "../middlewares/chat.middleware.js"

const chatRouter = Router();

chatRouter.get("/", validateQueryParams, getChatController);
chatRouter.get("/:id/messages")

chatRouter.post("/", validateChat, createChatController);

export default chatRouter;
