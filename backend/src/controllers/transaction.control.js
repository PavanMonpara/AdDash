import Listener from "../models/model.listener.js";
import { User } from "../models/model.login.js";
import Transaction from "../models/model.transaction.js";

/**
 * Create a new transaction
 * Required fields: user, type, method, amount
 * For session payments: recipient and session are required
 */
export const createTransaction = async (req, res) => {
  try {
    const {
      user,
      recipient,
      session,
      type,
      method,
      amount,
      status = 'pending',
      razorpayId,
      notes = ''
    } = req.body;

    // Validate required fields
    if (!user || !type || !method || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user, type, method, and amount are required"
      });
    }

    // Validate transaction type specific requirements
    if (['session payment', 'refund', 'commission'].includes(type)) {
      if (!recipient) {
        return res.status(400).json({
          success: false,
          error: `Recipient is required for transaction type: ${type}`
        });
      }

      if (type === 'session payment' && !session) {
        return res.status(400).json({
          success: false,
          error: "Session ID is required for session payment"
        });
      }
    }

    // Validate users exist
    const [sender, receiver] = await Promise.all([
      User.findById(user).select('_id username email role'),
      recipient ? Listener.findById(recipient).select('_id username email role') : null
    ]);

    if (!sender) {
      return res.status(404).json({ success: false, error: "Sender user not found" });
    }

    if (recipient && !receiver) {
      return res.status(404).json({ success: false, error: "Recipient user not found" });
    }

    // Create the transaction
    const transactionData = {
      transactionId: `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      user,
      type,
      method,
      amount: parseFloat(amount).toFixed(2),
      status,
      razorpayId: razorpayId || `rzp_${Date.now()}`,
      notes
    };

    // Add conditional fields
    if (recipient) transactionData.recipient = recipient;
    if (session) transactionData.session = session;

    const newTxn = await Transaction.create(transactionData);

    // Populate the response with user and recipient details
    const populatedTxn = await Transaction.findById(newTxn._id)
      .populate('userDetails recipientDetails sessionDetails');

    // TODO: Trigger notification to both parties
    // await notifyTransaction(populatedTxn);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: populatedTxn
    });
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create transaction'
    });
  }
};

/**
 * Impose a penalty on a user
 * Deducts amount from wallet and creates a transaction record
 */
export const imposePenalty = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || !amount || !reason) {
      return res.status(400).json({
        success: false,
        error: "userId, amount and reason are required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Create penalty transaction
    const transaction = await Transaction.create({
      transactionId: `txn_penalty_${Date.now()}`,
      user: userId,
      type: 'penalty',
      method: 'admin',
      amount: -Math.abs(amount), // Negative for deduction
      status: 'completed',
      notes: reason
    });

    // Deduct from user wallet
    user.walletBalance = (user.walletBalance || 0) - Math.abs(amount);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Penalty imposed successfully",
      data: {
        transaction,
        newBalance: user.walletBalance
      }
    });
  } catch (error) {
    console.error('Impose penalty error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Recharge user wallet
 */
export const rechargeWallet = async (req, res) => {
  try {
    const { userId, amount, paymentId, method = 'razorpay' } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        error: "userId and amount are required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Create recharge transaction
    const transaction = await Transaction.create({
      transactionId: `txn_recharge_${Date.now()}`,
      user: userId,
      type: 'recharge',
      method,
      amount: Math.abs(amount),
      status: 'completed',
      razorpayId: paymentId || '-',
      notes: 'Wallet recharge'
    });

    // Update user wallet
    user.walletBalance = (user.walletBalance || 0) + Math.abs(amount);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Wallet recharged successfully",
      data: {
        transaction,
        newBalance: user.walletBalance
      }
    });

  } catch (error) {
    console.error('Recharge wallet error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Wallet Balance
 */
export const getWalletBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.status(200).json({ success: true, balance: user.walletBalance || 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all transactions with filtering and pagination
 */
export const getAllTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.userId) filter.user = req.query.userId;
    if (req.query.recipientId) filter.recipient = req.query.recipientId;
    if (req.query.sessionId) filter.session = req.query.sessionId;

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Get transactions with pagination and sorting
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('userDetails recipientDetails')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
};

/**
 * Get transaction by ID with full details
 */
export const getTransactionById = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id)
      .populate('userDetails recipientDetails sessionDetails');

    if (!txn) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found"
      });
    }

    res.status(200).json({
      success: true,
      data: txn
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to fetch transaction'
    });
  }
};

/**
 * Update transaction status or details
 */
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    const allowedUpdates = [
      'status',
      'notes',
      'razorpayId',
      'method',
      'amount',
      'recipient',
      'session'
    ];

    // Validate status values
    if (updates.status && !['pending', 'completed', 'failed'].includes(updates.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value. Must be one of: pending, completed, failed'
      });
    }

    const updateData = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    const updatedTxn = await Transaction.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('userDetails recipientDetails sessionDetails');

    if (!updatedTxn) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found"
      });
    }

    // TODO: Trigger notification if status changed
    // if (updates.status) {
    //   await notifyTransactionStatus(updatedTxn);
    // }

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: updatedTxn
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update transaction'
    });
  }
};

/**
 * Delete a transaction (soft delete)
 */
export const deleteTransaction = async (req, res) => {
  try {
    const deletedTxn = await Transaction.findByIdAndUpdate(
      req.params.id,
      { status: 'failed', notes: 'Transaction cancelled by user' },
      { new: true }
    );

    if (!deletedTxn) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found"
      });
    }

    // TODO: Trigger notification about transaction cancellation

    res.status(200).json({
      success: true,
      message: 'Transaction cancelled successfully',
      data: deletedTxn
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete transaction'
    });
  }
};

/**
 * Get transactions for a specific user
 */
export const getUserTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find transactions where user is either sender or recipient
    const filter = {
      $or: [
        { user: userId },
        { recipient: userId }
      ]
    };

    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate({
          path: 'userDetails',
          select: 'username email profilePic role'
        })
        .populate({
          path: 'recipientDetails',
          select: 'username email profilePic role'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    // Calculate total spent and earned
    const [totalSpent, totalEarned] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(userId),
            status: 'completed',
            type: { $in: ['session payment', 'withdrawal'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        {
          $match: {
            recipient: mongoose.Types.ObjectId(userId),
            status: 'completed',
            type: { $in: ['session payment', 'commission'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        summary: {
          totalSpent: totalSpent[0]?.total || 0,
          totalEarned: totalEarned[0]?.total || 0
        },
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      }
    });
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user transactions'
    });
  }
};
