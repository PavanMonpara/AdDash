import Notification from "../models/model.notification.js";
import { sendPushNotification } from "../services/notification.service.js";
import User from "../models/model.user.js";

/**
 * Send a notification to a user
 * @param {string} userId - ID of the user to send the notification to
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} options - Additional options
 * @param {string} [options.type='info'] - Notification type (info, success, warning, error, system)
 * @param {string} [options.category='system'] - Notification category (system, user, session, payment, support, admin)
 * @param {string} [options.actionUrl=''] - URL to navigate to when the notification is clicked
 * @param {Object} [options.metadata={}] - Additional metadata to store with the notification
 * @param {boolean} [options.sendPush=true] - Whether to send a push notification
 * @param {boolean} [options.sendEmail=false] - Whether to send an email notification
 * @returns {Promise<Object>} - Created notification object
 */
export const sendNotification = async (userId, title, message, options = {}) => {
  const {
    type = 'info',
    category = 'system',
    actionUrl = '',
    metadata = {},
    sendPush = true,
    sendEmail = false
  } = options;

  try {
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      category,
      actionUrl,
      metadata
    });

    await notification.save();

    // Send push notification if enabled and user has a push token
    if (sendPush) {
      const user = await User.findById(userId).select('pushToken email');
      
      if (user && user.pushToken) {
        try {
          await sendPushNotification(user.pushToken, {
            title,
            body: message,
            data: { actionUrl }
          });
        } catch (error) {
          console.error('Error sending push notification:', error);
          // Don't fail the whole operation if push notification fails
        }
      }

      // Send email notification if enabled and user has an email
      if (sendEmail && user && user.email) {
        // You'll need to implement your email service here
        // await sendEmailNotification(user.email, title, message, actionUrl);
      }
    }

    return notification;
  } catch (error) {
    console.error('Error in sendNotification:', error);
    throw error;
  }
};

/**
 * Send a notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs to send the notification to
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} options - Additional options (same as sendNotification)
 * @returns {Promise<Array>} - Array of created notification objects
 */
export const sendBulkNotifications = async (userIds, title, message, options = {}) => {
  try {
    const notifications = [];
    
    // Process each user in parallel
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const notification = await sendNotification(userId, title, message, options);
          notifications.push(notification);
        } catch (error) {
          console.error(`Error sending notification to user ${userId}:`, error);
          // Continue with other users even if one fails
        }
      })
    );

    return notifications;
  } catch (error) {
    console.error('Error in sendBulkNotifications:', error);
    throw error;
  }
};

/**
 * Get unread notifications count for a user
 * @param {string} userId - ID of the user
 * @returns {Promise<number>} - Number of unread notifications
 */
export const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({
      user: userId,
      isRead: false
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} - Result of the update operation
 */
export const markAllAsRead = async (userId) => {
  try {
    return await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

/**
 * Get notifications for a user with pagination
 * @param {string} userId - ID of the user
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=20] - Number of items per page
 * @param {boolean} [options.unreadOnly=false] - Whether to return only unread notifications
 * @returns {Promise<Object>} - Paginated notifications
 */
export const getUserNotifications = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false
  } = options;

  try {
    const query = { user: userId };
    
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(query);

    return {
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

// Predefined notification templates
export const notificationTemplates = {
  // User related
  WELCOME: (userName) => ({
    title: 'Welcome to AdDash!',
    message: `Hi ${userName}, welcome to AdDash! We're excited to have you on board.`,
    category: 'user',
    type: 'success'
  }),
  
  PROFILE_UPDATED: {
    title: 'Profile Updated',
    message: 'Your profile has been updated successfully.',
    category: 'user',
    type: 'success'
  },
  
  // Session related
  SESSION_BOOKED: (listenerName, sessionTime) => ({
    title: 'Session Booked',
    message: `Your session with ${listenerName} has been booked for ${sessionTime}.`,
    category: 'session',
    type: 'success'
  }),
  
  SESSION_REMINDER: (listenerName, timeLeft) => ({
    title: 'Upcoming Session',
    message: `Your session with ${listenerName} starts in ${timeLeft}.`,
    category: 'session',
    type: 'info'
  }),
  
  // Payment related
  PAYMENT_RECEIVED: (amount) => ({
    title: 'Payment Received',
    message: `Your payment of ₹${amount} has been received. Thank you!`,
    category: 'payment',
    type: 'success'
  }),
  
  WALLET_TOPUP: (amount) => ({
    title: 'Wallet Top-up Successful',
    message: `Your wallet has been credited with ₹${amount}.`,
    category: 'payment',
    type: 'success'
  }),
  
  // Admin notifications
  NEW_USER_SIGNUP: (userName) => ({
    title: 'New User Signup',
    message: `New user ${userName} has signed up.`,
    category: 'admin',
    type: 'info'
  }),
  
  // Support related
  TICKET_CREATED: (ticketId) => ({
    title: 'Support Ticket Created',
    message: `Your support ticket #${ticketId} has been created. We'll get back to you soon.`,
    category: 'support',
    type: 'info'
  }),
  
  TICKET_UPDATED: (ticketId) => ({
    title: 'Ticket Update',
    message: `There's an update on your support ticket #${ticketId}.`,
    category: 'support',
    type: 'info'
  })
};

// Example usage:
// await sendNotification(
//   'user123',
//   'Welcome!',
//   'Thank you for signing up!',
//   {
//     type: 'success',
//     category: 'user',
//     actionUrl: '/dashboard',
//     sendPush: true,
//     sendEmail: true
//   }
// );

// Using a template:
// const template = notificationTemplates.WELCOME('John');
// await sendNotification('user123', template.title, template.message, {
//   type: template.type,
//   category: template.category
// });
