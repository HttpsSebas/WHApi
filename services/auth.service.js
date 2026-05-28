import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

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

export function comparePassword({password, hashedPassword}) {
  return bcrypt.compare(password, hashedPassword);
}

export function getUserFromToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}