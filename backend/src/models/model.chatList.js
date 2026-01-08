import mongoose, { Schema } from "mongoose";

const chatListSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Index for faster querying
chatListSchema.index({ user: 1 });
chatListSchema.index({ participants: 1 });
chatListSchema.index({ updatedAt: -1 });

// Virtual for getting the other participant in the chat
chatListSchema.virtual("participant", {
  ref: "User",
  localField: "participants",
  foreignField: "_id",
  justOne: true,
});

// Virtual for getting the last message details
chatListSchema.virtual("lastMessageDetails", {
  ref: "ChatMessage",
  localField: "lastMessage",
  foreignField: "_id",
  justOne: true,
});

// Pre-find middleware to populate the participant and lastMessageDetails
chatListSchema.pre(/^find/, function (next) {
  this.populate({
    path: "participant",
    select: "username email profileImage status",
  }).populate({
    path: "lastMessageDetails",
    select: "message messageType sender createdAt",
  });
  next();
});

const ChatList = mongoose.model("ChatList", chatListSchema);

export default ChatList;
