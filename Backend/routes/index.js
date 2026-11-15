import { Router } from "express";
import authRouter from "./auth.route.js";
import userRouter from "./user.route.js";
import contactRouter from "./contact.route.js";
import chatRouter from "./chat.route.js";
import messageRouter from "./message.route.js";
import authMiddleware from "../middlewares/http/auth.middleware.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", authMiddleware, userRouter);
router.use("/contacts", authMiddleware, contactRouter)
router.use("/chats", authMiddleware, chatRouter);
router.use("/messages", authMiddleware, messageRouter);

export default router;
