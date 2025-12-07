import mongoose, { Schema } from "mongoose";

const supportTicketSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["General", "Payment", "Technical", "Account", "Other"],
      default: "General",
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    messages: [
      {
        sender: { type: Schema.Types.ObjectId, ref: "User" },
        message: { type: String },
        sentAt: { type: Date, default: Date.now },
      },
    ],
  }
);

supportTicketSchema.pre(/^find/, function (next) {
  this.populate("user", "username email role phoneNumber")
    .populate("assignedTo", "username email role");
  next();
});

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
export default SupportTicket;