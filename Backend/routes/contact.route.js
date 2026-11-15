import { Router } from "express";
import {
  getContactsController,
  getContactController,
} from "../controllers/contact.controller.js";

const contactRouter = Router();

contactRouter.get("/", getContactsController);

contactRouter.get("/:contactId", getContactController);

export default contactRouter;
