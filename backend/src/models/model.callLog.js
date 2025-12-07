import mongoose, { Schema } from "mongoose";

const callLogSchema = new Schema(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    caller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["completed", "missed", "rejected", "failed"],
      default: "completed",
    },

    isFlagged: { type: Boolean, default: false },
    flaggedBy: { type: Schema.Types.ObjectId, ref: "User" },
    flaggedReason: { type: String },
    flaggedAt: { type: Date },
  },
  
);

callLogSchema.pre(/^find/, function (next) {
  this.populate("caller", "username email role")
      .populate("receiver", "username email role");
  next();
});

const CallLog = mongoose.model("CallLog", callLogSchema);
export default CallLog;