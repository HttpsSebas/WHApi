import {
  registerUser,
  loginUser,
  logoutUser,
} from "../services/auth.service.js";
import { newAccessToken } from "../services/token.service.js";

async function registerController(req, res) {
  try {
    const payload = await registerUser(req.body);

    res.cookie("refreshToken", payload.data.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.header("Authorization", payload.data.token);

    res.status(201).send({
      payload,
    });
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}

async function loginController(req, res) {
  try {
    const payload = await loginUser(req.body);
    // check if user exists

    res.cookie("refreshToken", payload.data.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.header("Authorization", payload.data.token);

    res.status(200).send({
      payload,
    });
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}

async function logoutController(req, res) {
  try {
    const payload = await logoutUser({ userId: req.user.id });
    res.user = null;
    res.clearCookie("refreshToken");

    res.header("Authorization", "");

    return res.status(200).json({
      ok: true,
      message: "Logout successful",
    });
  } catch (e) {
    return res.status(e.status || 500).json({
      ok: false,
      message: e.message,
    });
  }
}

async function refreshController(req, res) {
  try {
    const payload = await newAccessToken({
      refreshToken: req.cookies.refreshToken,
    });

    const { newRefreshToken } = payload.data;

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.status(200).send({
      payload,
    });
  } catch (e) {
    console.log(e);
    res.status(401).send({ message: e.message });
  }
}

export {
  registerController,
  loginController,
  logoutController,
  refreshController,
};
