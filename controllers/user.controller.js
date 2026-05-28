import { deleteUser, updateUser } from "../services/user.service.js";

export async function getUserController(req, res) {
  try {
    const user = req.user;
    res.json({
      data: user,
    });
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
}

export async function deleteUserController(req, res) {
  try {
    // delete user
    const user = await deleteUser(req.user.id);
    // logout

    res.clearCookie("refreshToken");
    res.json({
      message: "User deleted successfully",
      data: user,
    });
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
}

export async function updateUserController(req, res) {
  try {
    // update user
    const user = await updateUser(req.user.id, req.body);
    res.json({
      message: "User updated successfully",
      data: user,
    });
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
}
