import { Router } from "express";
import {
  registerController,
  loginController,
  logoutController,
  refreshController,
} from "../controllers/auth.controller.js";
import {
  validateUser,
  validateLoginUser,
} from "../middlewares/http/auth.middleware.js";

import authMiddleware from "../middlewares/http/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register", validateUser, registerController);
authRouter.post("/login", validateLoginUser, loginController);
authRouter.post("/logout", authMiddleware, logoutController);
authRouter.post("/refresh", refreshController);

export default authRouter;
