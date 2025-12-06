import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true },
    cCode: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Number, required: true },
  },
);

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;