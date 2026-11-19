import { Router } from "express";
import {
  getUserController,
  updateUserController
} from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/:userId", getUserController);
userRouter.patch("/", updateUserController);

export default userRouter;
