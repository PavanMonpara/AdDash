import ChatList from "../models/model.chatList.js";
import { getIO } from "../socket/socketManager.js";

export default function chatListHandler(io) {
  io.on("connection", (socket) => {
    const userId = socket.user?.id;
    if (!userId) return;

    // Join the user's personal room for targeted messages
    socket.join(`user_${userId}`);

    // Handle chat list updates
    socket.on("chatList:subscribe", async (callback) => {
      try {
        // Get the user's chat list
        const chatLists = await ChatList.find({ user: userId })
          .sort({ updatedAt: -1 })
          .populate({
            path: "participant",
            select: "username email profileImage status",
          })
          .populate({
            path: "lastMessageDetails",
            select: "message messageType sender createdAt",
          });

        // Send the initial chat list
        if (typeof callback === 'function') {
          callback({ success: true, chatLists });
        }
      } catch (error) {
        console.error("Error getting chat list:", error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle marking messages as read
    socket.on("chatList:markAsRead", async ({ chatListId }, callback) => {
      try {
        const chatList = await ChatList.findById(chatListId);
        
        if (!chatList) {
          throw new Error("Chat list item not found");
        }

        // Verify the user has access to this chat list
        if (chatList.user.toString() !== userId) {
          throw new Error("Unauthorized access");
        }

        // Update unread count to 0
        chatList.unreadCount = 0;
        await chatList.save();

        // Emit the updated chat list to the user
        io.to(`user_${userId}`).emit("chatList:updated");

        if (typeof callback === 'function') {
          callback({ success: true, chatList });
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected from chat list`);
    });
  });
}
