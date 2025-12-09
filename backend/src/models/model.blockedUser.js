// models/model.blockedUser.js

import mongoose, { Schema } from "mongoose";

const blockedUserSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    email: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    cCode: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    blockedAt: {
      type: Date,
      default: Date.now,
    },
  }
);

const BlockedUser = mongoose.model("BlockedUser", blockedUserSchema);

export { BlockedUser };
