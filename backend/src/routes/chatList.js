import express from 'express';
import { getUserChatList, markMessagesAsRead } from '../controllers/chatList.controller.js';
import { isAuthenticated } from '../middlewares/isAuthenticated.js';

const router = express.Router();

// Get user's chat list
router.get('/', isAuthenticated, getUserChatList);

// Mark messages as read for a specific chat
router.put('/:chatListId/read', isAuthenticated, markMessagesAsRead);

export default router;
