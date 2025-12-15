import { Notification } from "../models/model.notification.js";
import { User } from "../models/model.login.js";

const notificationHandler = (io) => {
  // Store active user connections
  const activeUsers = new Map();

  // Middleware to handle user authentication and connection
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    if (userId) {
      socket.userId = userId;
      return next();
    }
    return next(new Error('Authentication error'));
  });

  // Handle new connection
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Add user to active users
    activeUsers.set(socket.userId, socket.id);

    // Send unread notifications count on connection
    const sendUnreadCount = async () => {
      try {
        const count = await Notification.countDocuments({
          recipient: socket.userId,
          isRead: false
        });
        socket.emit('unread_count', { count });
      } catch (error) {
        console.error('Error getting unread count:', error);
      }
    };

    // Send initial unread count
    sendUnreadCount();

    // Mark notification as read
    socket.on('mark_as_read', async ({ notificationId }, callback) => {
      try {
        await Notification.findByIdAndUpdate(notificationId, { isRead: true });
        if (callback) callback({ success: true });
        sendUnreadCount(); // Update unread count
      } catch (error) {
        console.error('Error marking notification as read:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Mark all notifications as read
    socket.on('mark_all_read', async (callback) => {
      try {
        await Notification.updateMany(
          { recipient: socket.userId, isRead: false },
          { $set: { isRead: true } }
        );
        if (callback) callback({ success: true });
        sendUnreadCount(); // Update unread count
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      activeUsers.delete(socket.userId);
    });
  });

  // Function to send notification to a specific user
  const sendNotification = async (notificationData) => {
    try {
      // Save notification to database
      const notification = new Notification({
        ...notificationData,
        createdAt: new Date()
      });
      await notification.save();

      // If recipient is online, send the notification
      const recipientSocketId = activeUsers.get(notification.recipient.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_notification', notification);
        
        // Update unread count
        const count = await Notification.countDocuments({
          recipient: notification.recipient,
          isRead: false
        });
        io.to(recipientSocketId).emit('unread_count', { count });
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  };

  // Function to broadcast to all users (admin notifications)
  const broadcastNotification = async (notificationData) => {
    try {
      const users = Array.from(activeUsers.keys());
      const notifications = [];
      
      // Create a notification for each active user
      for (const userId of users) {
        const notification = new Notification({
          ...notificationData,
          recipient: userId,
          createdAt: new Date()
        });
        await notification.save();
        notifications.push(notification);

        // Send notification to user
        const socketId = activeUsers.get(userId);
        if (socketId) {
          io.to(socketId).emit('new_notification', notification);
          
          // Update unread count
          const count = await Notification.countDocuments({
            recipient: userId,
            isRead: false
          });
          io.to(socketId).emit('unread_count', { count });
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      throw error;
    }
  };

  // Helper function to get admin users
  const getAdminUsers = async () => {
    try {
      return await User.find({ 
        role: { $in: ['superAdmin', 'admin'] },
        status: 'active'
      }).select('_id');
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
  };

  // Helper function to update unread count for a user
  const updateUnreadCount = async (userId) => {
    try {
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false
      });
      const socketId = activeUsers.get(userId.toString());
      if (socketId) {
        io.to(socketId).emit('unread_count', { count });
      }
      return count;
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  };

  // Enhanced sendNotification function with admin notification support
  const enhancedSendNotification = async (notificationData, notifyAdmins = false) => {
    try {
      // Save the original notification
      const notification = new Notification({
        ...notificationData,
        createdAt: new Date()
      });
      await notification.save();

      // Send to recipient
      const recipientSocketId = activeUsers.get(notification.recipient.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_notification', notification);
        await updateUnreadCount(notification.recipient);
      }

      // If admin notification is requested
      if (notifyAdmins) {
        await sendAdminNotification({
          sender: notification.sender,
          type: notification.type,
          title: `[ADMIN] ${notification.title}`,
          message: notification.message,
          data: {
            ...notification.data,
            originalRecipient: notification.recipient
          }
        });
      }

      return notification;
    } catch (error) {
      console.error('Error in enhancedSendNotification:', error);
      throw error;
    }
  };

  // Function to send notifications to all admins
  const sendAdminNotification = async (notificationData) => {
    try {
      const admins = await getAdminUsers();
      const notifications = [];
      
      for (const admin of admins) {
        // Skip if sender is the same as admin
        if (notificationData.sender && admin._id.toString() === notificationData.sender.toString()) {
          continue;
        }

        const adminNotification = new Notification({
          ...notificationData,
          recipient: admin._id,
          type: 'admin_' + (notificationData.type || 'system'),
          createdAt: new Date()
        });
        
        await adminNotification.save();
        notifications.push(adminNotification);

        const adminSocketId = activeUsers.get(admin._id.toString());
        if (adminSocketId) {
          io.to(adminSocketId).emit('new_notification', adminNotification);
          await updateUnreadCount(admin._id);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error in sendAdminNotification:', error);
      throw error;
    }
  };

  return { 
    sendNotification: enhancedSendNotification, 
    broadcastNotification,
    sendAdminNotification
  };
};

export { notificationHandler };
