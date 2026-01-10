import { Router } from "express";
import { flagMessage, getChatHistory, getFlaggedMessages, sendMessage, unflagMessage, getChatHistoryByUser } from "../controllers/chat.control.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const chat = Router();

chat.post("/send", sendMessage);
chat.get("/history/:userId", verifyToken, isAuthenticated, getChatHistoryByUser);
chat.get("/:sessionId", getChatHistory);
chat.put("/:id/flag", flagMessage);
chat.put("/:id/unflag", unflagMessage);
chat.get("/flagged/all", getFlaggedMessages);

export default chat;