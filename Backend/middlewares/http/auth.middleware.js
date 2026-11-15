import {
  validateUserSchema,
  validateIsAuthenticated,
  validateUserLoginSchema,
} from "../../validations/auth.validations.js";

const authMiddleware = async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization;
    if (!accessToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = accessToken.split(" ")[1];
    const user = await validateIsAuthenticated(token);

    req.user = user;
    next();
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
};

export const validateUser = async (req, res, next) => {
  // validate user
  try {
    await validateUserSchema(req.body);
    next();
  } catch (e) {
    return res.status(400).json({
      error: e,
    });
  }
};

export const validateLoginUser = async (req, res, next) => {
  // validate user
  try {
    await validateUserLoginSchema(req.body);
    next();
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
};

export default authMiddleware;
