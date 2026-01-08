import express from 'express';
import { getUserChatList, markMessagesAsRead } from '../controllers/chatList.controller.js';
import { isAuthenticated } from '../middlewares/isAuthenticated.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// Get user's chat list
router.get('/', verifyToken,isAuthenticated, getUserChatList);

// Mark messages as read for a specific chat
router.put('/:chatListId/read', verifyToken,isAuthenticated, markMessagesAsRead);

export default router;
