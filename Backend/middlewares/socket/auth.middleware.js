import {
  validateUserSchema,
  validateIsAuthenticated,
} from "../../validations/auth.validations.js";
import { updateUser } from "../../services/user.service.js";

export const authMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    const userDecoded = await validateIsAuthenticated(token);
    if (!userDecoded) {
      return next(new Error("Unauthorized"));
    }

    const onlineUser = await updateUser({
      userId: userDecoded.id,
      user: { isOnline: true },
    });
    socket.data.user = onlineUser.data;

    next();
  } catch (e) {
    next(new Error("Authentication error"));
  }
};

export const validateUser = async (req, res, next) => {
  // validate user
  try {
    await validateUserSchema(req.body);
    next();
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
};
