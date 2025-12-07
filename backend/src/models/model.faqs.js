import mongoose from "mongoose";

const { Schema, model } = mongoose;

const faqSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "general",
    },
  }
);

const FAQ = model("FAQ", faqSchema);

export default FAQ;
