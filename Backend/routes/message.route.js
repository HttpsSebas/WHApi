import { Router } from "express";
import {
  getMessagesController,
} from "../controllers/message.controller.js";

const messageRouter = Router();

messageRouter.get("/:chatId", getMessagesController);

export default messageRouter;