// controllers/category.control.js
import Category from "../models/model.category.js";

// CREATE Category
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const existing = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const category = new Category({ name, description });
    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET All Categories (with FAQs)
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select("name description faqs createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET Single Category by ID
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category || !category.isActive) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE Category
export const updateCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated",
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE Category (Soft Delete)
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADD FAQ to Category
export const addFaqToCategory = async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ success: false, message: "Question and answer required" });
    }

    const category = await Category.findById(req.params.id);
    if (!category || !category.isActive) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    category.faqs.push({ question, answer });
    await category.save();

    res.status(201).json({
      success: true,
      message: "FAQ added",
      faq: category.faqs[category.faqs.length - 1],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE FAQ
export const updateFaq = async (req, res) => {
  try {
    const { question, answer } = req.body;
    const { categoryId, faqId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category || !category.isActive) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const faq = category.faqs.id(faqId);
    if (!faq) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }

    if (question) faq.question = question;
    if (answer) faq.answer = answer;

    await category.save();

    res.status(200).json({ success: true, message: "FAQ updated", faq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE FAQ
export const deleteFaq = async (req, res) => {
  try {
    const { categoryId, faqId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    category.faqs.id(faqId)?.remove();
    await category.save();

    res.status(200).json({ success: true, message: "FAQ deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};