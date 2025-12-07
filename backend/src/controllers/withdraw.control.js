import { User } from "../models/model.login.js";
import WithdrawRequest from "../models/model.withdrawRequest.js";

export const createWithdrawRequest = async (req, res) => {
  try {
    const { user, amount, method, accountDetails } = req.body;

    const existingUser = await User.findById(user);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const withdraw = await WithdrawRequest.create({
      user,
      amount,
      method,
      accountDetails,
    });

    res.status(201).json({ success: true, data: withdraw });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getWithdrawQueue = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const queue = await WithdrawRequest.find(filter)
      .populate("user", "username email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WithdrawRequest.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages,
      count: queue.length,
      data: queue,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateWithdrawStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const validStatuses = ["requested", "processing", "approved", "rejected", "paid"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const updated = await WithdrawRequest.findByIdAndUpdate(
      id,
      { status, remarks, processedAt: Date.now() },
      { new: true }
    ).populate("user", "username email");

    if (!updated) {
      return res.status(404).json({ success: false, error: "Withdraw request not found" });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteWithdrawRequest = async (req, res) => {
  try {
    const deleted = await WithdrawRequest.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Withdraw request not found" });
    }
    res.status(200).json({ success: true, message: "Withdraw request deleted" });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
