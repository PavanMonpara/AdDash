import express from 'express';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification
} from '../controllers/notification.control.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// Get all notifications for a user
router.get('/user/:userId', verifyToken, getUserNotifications);

// Get unread notifications count
router.get('/unread/:userId', verifyToken, getUnreadCount);

// Mark notification as read
router.patch('/:notificationId/read', verifyToken, markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read/:userId', verifyToken, markAllAsRead);

// Create a new notification (admin only)
router.post('/', verifyToken, createNotification);

// Delete a notification
router.delete('/:notificationId', verifyToken, deleteNotification);

export default router;
