import { getUserFromToken, isTokenValid } from "../services/token.service.js"
import userSchema, { userLoginSchema } from "../schema/user.schema.js";

export const validateUserSchema = async (data) => {
  await userSchema.parseAsync(data);
};

export const validateUserLoginSchema = async (data) => {
  await userLoginSchema.parseAsync(data);
};

export const validateIsAuthenticated = async (token) => {
  if (!isTokenValid(token)) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
  const user = await getUserFromToken(token);

  if (!user) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  return user;
};
