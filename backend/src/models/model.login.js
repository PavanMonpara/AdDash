// models/model.login.js

import mongoose, { Schema } from "mongoose";

const userScheme = new Schema({
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  alias: { type: String, trim: true, default: "" },
  role: {
    type: String,
    enum: ["superAdmin", "support", "finance", "compliance", "user", "user", "listener"],
    default: "user"
  },
  token: { type: String },
  fcmToken: { type: String },
  username: { type: String, unique: true, sparse: true },
  about: { type: String },
  cCode: { type: String, required: true },
  phoneNumber: { type: String, unique: true, sparse: true },
  status: {
    type: String,
    enum: ["active", "inactive", "blocked", "pending"],
    default: "active"
  },
  registered: { type: Date, default: Date.now },
  lastActive: { type: Date },
  sessions: [{ type: Schema.Types.ObjectId, ref: "Session" }],
  tickets: [{ type: Schema.Types.ObjectId, ref: "SupportTicket" }],
  lang: { type: String },
  gender: { type: String, enum: ["male", "female", "other"] },
  age: { type: Number, min: 18, max: 100 },
  myReferralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  referredUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  profilePic: {
    type: String,
    default: "https://your-default-avatar-url.com/default-avatar.png"
  },
  // Soft delete fields
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
});

const User = mongoose.model("User", userScheme);
export { User };