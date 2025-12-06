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
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "session payment", "refund", "commission"],
      required: true,
    },
    method: {
      type: String,
      enum: ["razorpay", "wallet", "bank transfer", "auto"],
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
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
