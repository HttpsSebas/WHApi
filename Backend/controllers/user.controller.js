import { findUserById, updateUser } from "../services/user.service.js";

export async function getUserController(req, res) {
  try {
    let user;
    if (req.params.userId === "me") {
      user = req.user;
    } else {
      user = await findUserById({ userId: req.params.userId });
    }
    res.json(user);
  } catch (e) {
    res.status(e.status || 500).send({ message: e.message });
  }
}

export async function updateUserController(req, res) {
  try {
    const payload = await updateUser({userId: req.user.id, user: req.body});
    res.json(payload);
  } catch (e) {
    console.log(e);
    res.status(e.status || 500).send({ message: e.message });
  }
}
