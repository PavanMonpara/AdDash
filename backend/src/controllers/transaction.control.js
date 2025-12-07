import { User } from "../models/model.login.js";
import Transaction from "../models/model.transaction.js";

export const createTransaction = async (req, res) => {
  try {
    const { user, type, method, amount, status, razorpayId } = req.body;

    const existingUser = await User.findById(user);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const newTxn = await Transaction.create({
      transactionId: `txn-${Date.now()}`,
      user,
      type,
      method,
      amount,
      status,
      razorpayId,
    });

    res.status(201).json({ success: true, data: newTxn });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getAllTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const transactions = await Transaction.find(filter)
      .populate("user", "username email role")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id).populate("user", "username email");
    if (!txn) {
      return res.status(404).json({ success: false, error: "Transaction not found" });
    }
    res.status(200).json({ success: true, data: txn });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const updatedTxn = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedTxn) {
      return res.status(404).json({ success: false, error: "Transaction not found" });
    }
    res.status(200).json({ success: true, data: updatedTxn });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const deletedTxn = await Transaction.findByIdAndDelete(req.params.id);
    if (!deletedTxn) {
      return res.status(404).json({ success: false, error: "Transaction not found" });
    }
    res.status(200).json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
