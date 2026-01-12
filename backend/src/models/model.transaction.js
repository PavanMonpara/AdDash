import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "Listener",
      required: function () {
        return ['session payment', 'refund', 'commission'].includes(this.type);
      }
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: function () {
        return this.type === 'session payment';
      }
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "session payment", "refund", "commission", "penalty", "recharge", "referral_bonus"],
      required: true,
    },
    method: {
      type: String,
      enum: ["razorpay", "wallet", "bank transfer", "auto", "system", "admin"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    razorpayId: {
      type: String,
      default: "-",
    },
    notes: {
      type: String,
      default: ""
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add virtual populate for user and recipient details
transactionSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
  select: 'username email phoneNumber profilePic alias'
});

transactionSchema.virtual('recipientDetails', {
  ref: 'User',
  localField: 'recipient',
  foreignField: '_id',
  justOne: true,
  select: 'username email phoneNumber profilePic alias role'
});

transactionSchema.virtual('sessionDetails', {
  ref: 'Session',
  localField: 'session',
  foreignField: '_id',
  justOne: true
});

// Add indexes for better query performance
transactionSchema.index({ user: 1, status: 1, timestamp: -1 });
transactionSchema.index({ recipient: 1, status: 1, timestamp: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
