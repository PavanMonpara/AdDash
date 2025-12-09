// routes/category.js
import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  addFaqToCategory,
  updateFaq,
  deleteFaq,
} from "../controllers/category.control.js";

import { verifyToken } from "../middlewares/verifyToken.js";
import { isSuperAdmin } from "../middlewares/isSuperAdmin.js";

const router = Router();

// Admin Routes
router.post("/", verifyToken, isSuperAdmin, createCategory);
router.get("/", getAllCategories); // public bhi de sakta hai
router.get("/:id", getCategoryById);
router.put("/:id", verifyToken, isSuperAdmin, updateCategory);
router.delete("/:id", verifyToken, isSuperAdmin, deleteCategory);

// FAQ Routes
router.post("/:id/faqs", verifyToken, isSuperAdmin, addFaqToCategory);
router.put("/:categoryId/faqs/:faqId", verifyToken, isSuperAdmin, updateFaq);
router.delete("/:categoryId/faqs/:faqId", verifyToken, isSuperAdmin, deleteFaq);

export default router;