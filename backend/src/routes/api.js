import { Router } from "express";
import { login, register } from "../controllers/login.control.js";
import session from "./sessionsApi.js";
import user from "./usersApi.js";
import listener from "./listenerApi.js";
import transaction from "./transactionApi.js";
import withdraw from "./withdrawApi.js";
import ticket from "./ticketApi.js";
import chat from "./chatApi.js";
import call from "./callApi.js";
import roles from "./rolesApi.js";
import faqsApi from "./faqsApi.js";
import category from "./category.js";
import complaint from "./complaint.js";
import softDelete from "./softDeleteApi.js";
import reviewRoutes from "./reviewApi.js";

const router = Router();

router.route("/register").post(register);
router.route("/login").post(login);

router.use("/sessions", session);

router.use("/users", user);

router.use("/listener", listener);

router.use("/transactions", transaction);

router.use("/withdrawls", withdraw);

router.use("/tickets", ticket);

router.use("/chats", chat);

router.use("/calls", call);

router.use("/roles", roles);

router.use("/faqs", faqsApi);

router.use("/categories", category);

router.use("/complaints", complaint);

// Soft delete management routes
router.use("/manage", softDelete);

// Review routes
router.use("/reviews", reviewRoutes);

export default router;