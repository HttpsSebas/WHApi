import bcrypt from "bcrypt";

import createUser, { findUser } from "./user.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  createRefreshToken,
  deleteRefreshToken,
} from "./token.service.js";

import { emit } from "../sockets/events/eventBus.js";

export function comparePassword({ password, hashedPassword }) {
  return bcrypt.compare(password, hashedPassword);
}

export async function registerUser(data) {
  const { phone, password, name, description = "" } = data;

  // check if user already exists
  const userExists = await findUser({ phone });
  if (userExists) {
    const error = new Error("User already exists");
    error.status = 409;
    throw error;
  }

  // save user to db
  const user = await createUser({
    user: { phone, password, name, description },
  });

  const token = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // create refresh token expires in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await createRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt,
  });

  return {
    message: "User registered successfully",
    data: {
      token,
      refreshToken,
      user,
      expiresAt,
    },
  };
}

export async function loginUser(data) {
  const { phone, password } = data;
  const user = await findUser({ phone });

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  // check if password is correct
  const isPasswordCorrect = await comparePassword({
    password,
    hashedPassword: user.password,
  });

  if (!isPasswordCorrect) {
    const error = new Error("Invalid password");
    error.status = 401;
    throw error;
  }

  // generate token
  const token = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // create refresh token expires in 7 days
  const expiresAt = new Date(Date.now());
  expiresAt.setDate(expiresAt.getDate() + 7);

  await createRefreshToken({ userId: user.id, token: refreshToken, expiresAt });

  return {
    message: "User logged in successfully",
    data: {
      token,
      refreshToken,
      user,
      expiresAt,
    },
  };
}

export async function logoutUser({ userId }) {
  await deleteRefreshToken({ userId });

  await emit("user.loggedOut", { userId });

  return {
    message: "User logged out successfully",
  };
}
