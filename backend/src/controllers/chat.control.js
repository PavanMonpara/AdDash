import ChatMessage from "../models/model.chatMessage.js";

export const sendMessage = async (req, res) => {
  try {
    const { session, sender, receiver, message, messageType } = req.body;

    const msg = await ChatMessage.create({
      session,
      sender,
      receiver,
      message,
      messageType,
    });

    res.status(201).json({ success: true, data: msg });
  } catch (error) {
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