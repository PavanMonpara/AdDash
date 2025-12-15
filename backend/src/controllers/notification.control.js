import { Notification } from "../models/model.notification.js";
import { getIO } from "../socket/socketManager.js";

// Get all notifications for a user
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'sender', select: 'username profilePic' },
        { path: 'recipient', select: 'username' }
      ]
    };

    const notifications = await Notification.paginate(
      { recipient: userId },
      options
    );

    res.json({
      success: true,
      data: notifications.docs,
      total: notifications.totalDocs,
      totalPages: notifications.totalPages,
      currentPage: notifications.page
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get unread notifications count
export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    // Emit event to update the UI in real-time
    const io = getIO();
    io.to(notification.recipient.toString()).emit('notification_updated', {
      notificationId: notification._id,
      isRead: true
    });

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    // Emit event to update the UI in real-time
    const io = getIO();
    io.to(userId).emit('all_notifications_read');

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Create a new notification (for admin or system use)
export const createNotification = async (req, res) => {
  try {
    const { recipient, sender, type, title, message, data } = req.body;
    
    const notification = new Notification({
      recipient,
      sender,
      type,
      title,
      message,
      data,
      isRead: false
    });

    await notification.save();

    // Populate sender info
    await notification.populate('sender', 'username profilePic');

    // Emit the notification in real-time
    const io = getIO();
    io.to(recipient.toString()).emit('new_notification', notification);

    // Update unread count
    const count = await Notification.countDocuments({
      recipient,
      isRead: false
    });
    io.to(recipient.toString()).emit('unread_count', { count });

    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    // Emit event to update the UI in real-time
    const io = getIO();
    io.to(notification.recipient.toString()).emit('notification_deleted', {
      notificationId: notification._id
    });

    // Update unread count
    const count = await Notification.countDocuments({
      recipient: notification.recipient,
      isRead: false
    });
    io.to(notification.recipient.toString()).emit('unread_count', { count });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
