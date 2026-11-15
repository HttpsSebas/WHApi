import { Router } from "express";
import { deleteUserController, getUserController, updateUserController } from "../controllers/user.controller.js";

const userRouter = Router()

userRouter.get("/", getUserController)

userRouter.delete("/", deleteUserController)

userRouter.patch("/", updateUserController)

export default userRouter