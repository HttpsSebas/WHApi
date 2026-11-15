import createUser, { findUser } from "../services/user.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  comparePassword,
  getUserFromToken,
} from "../services/auth.service.js";

async function registerController(req, res) {
  const { phone, password, name, description = null } = req.body;

  if (!phone || !password || !name) {
    return res.status(400).send({ message: "Missing required fields" });
  }

  try {
    // check if user already exists
    const userExists = await findUser({ phone });
    if (userExists) {
      return res.status(409).send({ message: "User already exists" });
    }

    // save user to db
    const user = await createUser({ phone, password, name, description });

    const token = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const userWithoutPassword = {
      ...user,
      password: undefined,
      deleted: undefined,
    };

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.status(201).send({
      message: "User registered successfully",
      data: {
        userWithoutPassword,
        token,
      },
    });
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
}

async function loginController(req, res) {
  const { phone, password } = req.body;

  try {
    // check if user exists
    const user = await findUser({ phone });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // check if password is correct
    const isPasswordCorrect = await comparePassword({
      password,
      hashedPassword: user.password,
    });
    if (!isPasswordCorrect) {
      return res.status(401).send({ message: "Invalid password" });
    }

    // generate token
    const token = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    const userWithoutPassword = {
      ...user,
      password: undefined,
      deleted: undefined,
    };

    res.status(200).send({
      message: "User logged in successfully",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (e) {
    res.status(500).send({ e });
  }
}

async function logoutController(req, res) {
  res.user = null;
  res.clearCookie("refreshToken");
  res.status(200).send({ message: "User logged out successfully" });
}

async function refreshController(req, res) {
  const refreshToken = req.cookies.refreshToken;

  try {
    const user = getUserFromToken(refreshToken);
    const token = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.status(200).send({
      message: "Token refreshed successfully",
      data: {
        token,
      },
    });
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
}

export {
  registerController,
  loginController,
  logoutController,
  refreshController,
};
