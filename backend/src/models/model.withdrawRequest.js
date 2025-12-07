import mongoose, { Schema } from "mongoose";

const withdrawRequestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    method: {
      type: String,
      enum: ["Bank Transfer", "UPI", "PayPal", "Crypto"],
      required: true,
    },
    accountDetails: {
      accountNumber: { type: String },
      ifscCode: { type: String },
      upiId: { type: String },
      paypalEmail: { type: String },
      walletAddress: { type: String },
    },
    status: {
      type: String,
      enum: ["requested", "processing", "approved", "rejected", "paid"],
      default: "requested",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    remarks: {
      type: String,
    },
  },
  
);

const WithdrawRequest = mongoose.model("WithdrawRequest", withdrawRequestSchema);
export default WithdrawRequest;