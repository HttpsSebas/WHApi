import jwt from "jsonwebtoken";
import { RefreshToken } from "../models/refreshToken.model.js";
import { findUserById } from "./user.service.js";

export function generateAccessToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
}

export function generateRefreshToken(id) {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

export function isTokenValid(token) {
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}

export function isRefreshTokenValid(token) {
  try {
    jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}

export async function findRefreshToken({ tx, refreshToken }) {
  return await RefreshToken.findUnique({ tx, refreshToken });
}

export async function createRefreshToken({
  tx,
  userId,
  token,
  expiresAt,
}) {
  try {
    return await RefreshToken.create({ tx, userId, token, expiresAt });
  } catch (e) {
    const error = new Error("Refresh token already exists");
    error.status = 409;
    throw error;
  }
}

export async function deleteRefreshToken({ tx, refreshToken }) {
  return await RefreshToken.delete({ tx, refreshToken });
}

export async function getUserFromToken(token) {
  const isValid = isTokenValid(token);
  if (!isValid) return null;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return await findUserById({ userId: decoded.id });
}

export function getUserFromRefreshToken(refreshToken) {
  const isValid = isRefreshTokenValid(refreshToken);
  if (!isValid) return null;
  return jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
}

export async function newAccessToken({ refreshToken }) {
  const user = getUserFromRefreshToken(refreshToken);

  if (!user) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  const token = generateAccessToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);

  const expiresAt = new Date(Date.now());
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    await RefreshToken.transaction(async (tx) => {
      const oldToken = await findRefreshToken({
        tx,
        refreshToken,
      });

      if (!oldToken || oldToken.userId !== user.id) {
        const error = new Error("Unauthorized");
        error.status = 401;
        throw error;
      }

      await deleteRefreshToken({ tx, refreshToken });
      await createRefreshToken({
        tx,
        userId: user.id,
        token: newRefreshToken,
        expiresAt,
      });
    });
  } catch (e) {
    console.log(e);
    throw e;
  }

  return {
    message: "Token refreshed successfully",
    data: {
      token,
      newRefreshToken,
      user,
    },
  };
}
