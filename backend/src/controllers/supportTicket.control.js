import { User } from "../models/model.login.js";
import SupportTicket from "../models/model.supportTicket.js";

export const createTicket = async (req, res) => {
  try {
    const { user, subject, category, description, priority } = req.body;

    const existingUser = await User.findById(user);
    if (!existingUser)
      return res.status(404).json({ success: false, error: "User not found" });

    const ticket = await SupportTicket.create({
      user,
      subject,
      category,
      description,
      priority,
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.priority) filter.priority = req.query.priority;

    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SupportTicket.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages,
      tickets,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket)
      return res.status(404).json({ success: false, error: "Ticket not found" });

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const addMessageToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { sender, message } = req.body;

    const ticket = await SupportTicket.findById(id);
    if (!ticket)
      return res.status(404).json({ success: false, error: "Ticket not found" });

    ticket.messages.push({ sender, message });
    await ticket.save();

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (assignedTo) updateData.assignedTo = assignedTo;

    const updated = await SupportTicket.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updated)
      return res.status(404).json({ success: false, error: "Ticket not found" });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const deleted = await SupportTicket.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ success: false, error: "Ticket not found" });
    res.status(200).json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
