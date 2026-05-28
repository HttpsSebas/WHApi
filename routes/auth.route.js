import { Router } from "express";
import { registerController, loginController, logoutController, refreshController } from "../controllers/auth.controller.js";
import { validateUser } from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register", validateUser, registerController);
authRouter.post("/login", validateUser, loginController);
authRouter.post("/logout", logoutController);
authRouter.post("/refresh", refreshController)

export default authRouter;