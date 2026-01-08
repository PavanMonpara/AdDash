import ChatList from "../models/model.chatList.js";
import ChatMessage from "../models/model.chatMessage.js";
import { getIO } from "../socket/socketManager.js";

// Get or create a chat list item
const getOrCreateChatList = async (userId, participantId) => {
  // Check if a chat list item already exists between these users
  let chatList = await ChatList.findOne({
    user: userId,
    participants: participantId,
  });

  // If no chat list item exists, create one
  if (!chatList) {
    chatList = await ChatList.create({
      user: userId,
      participants: [participantId],
    });
  }

  return chatList;
};

// Update chat list when a new message is sent or received
export const updateChatListOnNewMessage = async (message) => {
  const { sender, receiver, _id: messageId } = message;

  // Update chat list for the sender
  await ChatList.findOneAndUpdate(
    { user: sender, participants: receiver },
    {
      lastMessage: messageId,
      $inc: { unreadCount: 0 }, // Don't increment unread count for sender
      $setOnInsert: { participants: [receiver] },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Update chat list for the receiver
  await ChatList.findOneAndUpdate(
    { user: receiver, participants: sender },
    {
      lastMessage: messageId,
      $inc: { unreadCount: 1 }, // Increment unread count for receiver
      $setOnInsert: { participants: [sender] },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Emit events to both users to update their chat lists
  const io = getIO();
  io.to(`user_${sender}`).emit("chatList:updated");
  io.to(`user_${receiver}`).emit("chatList:updated");
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { chatListId } = req.params;
    const userId = req.user.id;

    // Find the chat list item
    const chatList = await ChatList.findById(chatListId);
    if (!chatList) {
      return res.status(404).json({ message: "Chat list item not found" });
    }

    // Verify the user has access to this chat list
    if (chatList.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update unread count to 0
    chatList.unreadCount = 0;
    await chatList.save();

    // Emit event to update the UI
    const io = getIO();
    io.to(`user_${userId}`).emit("chatList:updated");

    res.status(200).json({ success: true, chatList });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user's chat list
const getUserChatList = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all chat list items for the user, sorted by last message date
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

    res.status(200).json({ success: true, chatLists });
  } catch (error) {
    console.error("Error getting chat list:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export { markMessagesAsRead, getUserChatList };
