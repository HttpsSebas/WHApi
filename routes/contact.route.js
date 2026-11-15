import { Router } from "express";
import {
  getContactsController,
  createContactsController,
} from "../controllers/contact.controller.js";

const contactRouter = Router();

contactRouter.get("/", getContactsController);

contactRouter.post("/", createContactsController);

export default contactRouter;
