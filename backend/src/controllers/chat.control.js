import ChatMessage from "../models/model.chatMessage.js";
import { updateChatListOnNewMessage } from "./chatList.controller.js";

export const sendMessage = async (req, res) => {
  try {
    const { session, sender, receiver, message, messageType } = req.body;

    // Create the message
    const msg = await ChatMessage.create({
      session,
      sender,
      receiver,
      message,
      messageType,
    });

    // Populate sender and receiver for socket emission
    const populatedMessage = await ChatMessage.findById(msg._id)
      .populate('sender', 'username email profileImage')
      .populate('receiver', 'username email profileImage');

    // Update chat lists for both sender and receiver
    await updateChatListOnNewMessage(populatedMessage);

    // Emit the new message to both users
    const io = req.app.get('io');
    io.to(`user_${sender}`).emit('message:new', { message: populatedMessage });
    io.to(`user_${receiver}`).emit('message:new', { message: populatedMessage });

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await ChatMessage.find({ session: sessionId }).sort({
      createdAt: 1,
    });

    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const flagMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { flaggedBy, reason } = req.body;

    const message = await ChatMessage.findById(id);
    if (!message) return res.status(404).json({ success: false, error: "Message not found" });

    message.isFlagged = true;
    message.flaggedBy = flaggedBy;
    message.flaggedReason = reason;
    message.flaggedAt = new Date();

    await message.save();

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getFlaggedMessages = async (req, res) => {
  try {
    const flagged = await ChatMessage.find({ isFlagged: true }).sort({ flaggedAt: -1 });
    res.status(200).json({ success: true, count: flagged.length, data: flagged });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const unflagMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await ChatMessage.findById(id);
    if (!message) return res.status(404).json({ success: false, error: "Message not found" });

    message.isFlagged = false;
    message.flaggedBy = null;
    message.flaggedReason = null;
    message.flaggedAt = null;

    await message.save();

    res.status(200).json({ success: true, message: "Message unflagged successfully", data: message });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};