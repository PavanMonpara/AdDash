import { Router } from "express";
import { flagMessage, getChatHistory, getFlaggedMessages, sendMessage, unflagMessage } from "../controllers/chat.control.js";

const chat = Router();

chat.post("/send", sendMessage);
chat.get("/:sessionId", getChatHistory);
chat.put("/:id/flag", flagMessage);
chat.put("/:id/unflag", unflagMessage);
chat.get("/flagged/all", getFlaggedMessages);

export default chat;