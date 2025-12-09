// models/model.suspendedListener.js

import mongoose, { Schema } from "mongoose";

const suspendedListenerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    listenerId: {
      type: Schema.Types.ObjectId,
      ref: "Listener",
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
    suspendedAt: {
      type: Date,
      default: Date.now,
    },
  }
);

const SuspendedListener = mongoose.model("SuspendedListener", suspendedListenerSchema);

export { SuspendedListener };
