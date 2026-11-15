import { findUserById } from "../services/user.service.js";

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
