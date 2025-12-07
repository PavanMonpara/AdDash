import express from "express";
import FAQ from "../models/model.faqs.js";

const faqsApi = express.Router();

faqsApi.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } },
      ];
    }

    const faqs = await FAQ.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: faqs,
    });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs",
    });
  }
});

faqsApi.get("/:id", async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error("Error fetching FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQ",
    });
  }
});

faqsApi.post("/", async (req, res) => {
  try {
    const { question, answer, category } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "question and answer are required",
      });
    }

    const faq = await FAQ.create({
      question,
      answer,
      category,
    });

    res.status(201).json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create FAQ",
    });
  }
});

faqsApi.put("/:id", async (req, res) => {
  try {
    const updates = req.body;

    const faq = await FAQ.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update FAQ",
    });
  }
});

faqsApi.delete("/:id", async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete FAQ",
    });
  }
});

export default faqsApi;
