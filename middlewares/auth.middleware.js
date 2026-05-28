import { getUserFromToken } from "../services/auth.service.js";
import userSchema from "../schema/user.schema.js";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const user = getUserFromToken(token);
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export async function validateUser(req, res, next) {
  // validate user
  try {
    const { phone, password, name, description } = req.body;
    const validatedUser = userSchema.safeParse({
      phone,
      password,
      name,
      description,
    });

    if (!validatedUser.success) {
      const error = new Error(validatedUser.error.message);
      error.status = 400;
      throw error;
    }
    next();
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}

export default authMiddleware;
