import mongoose, { Schema } from "mongoose";

const chatMessageSchema = new Schema(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    readStatus: {
      type: Boolean,
      default: false,
    },

    isFlagged: { type: Boolean, default: false },
    flaggedBy: { type: Schema.Types.ObjectId, ref: "User" },
    flaggedReason: { type: String },
    flaggedAt: { type: Date },
  },
  { timestamps: true }
);

chatMessageSchema.pre(/^find/, function (next) {
  this.populate("sender", "username email role")
      .populate("receiver", "username email role");
  next();
});

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;