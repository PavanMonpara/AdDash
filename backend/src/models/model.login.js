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
 username: { type: String, unique: true, sparse: true },
 about: { type: String },
 cCode: { type: String, required: true },
 phoneNumber: { type: String, unique: true },
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

 // NEW FIELD: Profile Picture URL
 profilePic: {
   type: String,
   default: "https://your-default-avatar-url.com/default-avatar.png" // optional default
 }
});

const User = mongoose.model("User", userScheme);
export { User };