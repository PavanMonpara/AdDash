// models/model.listener.js
import mongoose from "mongoose";

const listenerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  expertise: [{ type: String }],
  experience: { type: String, required: true },
  aboutMe: { type: String, default: "" },
  myStory: { type: String, default: "" },
  chargesPerMinute: { type: Number, required: true, min: 0, default: 10 },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["approved", "pending", "suspended"],
    default: "pending",
  },
  earnings: { type: Number, default: 0 },
  commission: { type: String, default: "20%" },
  sessions: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

listenerSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});


const Listener = mongoose.model("Listener", listenerSchema);
export default Listener;