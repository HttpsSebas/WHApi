import { Router } from "express";
import authRouter from "./auth.route.js";
import userRouter from "./user.route.js";
import contactRouter from "./contact.route.js";
import chatRouter from "./chat.route.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", (req, res) => {
  res.send({ message: "Hello World!" });
});

router.use("/auth", authRouter);
router.use("/user", authMiddleware, userRouter);
router.use("/contacts", authMiddleware, contactRouter)
router.use("/chats", authMiddleware, chatRouter)

export default router;
