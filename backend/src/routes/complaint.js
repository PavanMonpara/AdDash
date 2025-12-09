// routes/complaint.js
import { Router } from "express";
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  deleteComplaint,
} from "../controllers/complaint.control.js";

import { verifyToken } from "../middlewares/verifyToken.js";
import { isSuperAdmin } from "../middlewares/isSuperAdmin.js";
import { uploadComplaintImage } from "../middlewares/upload.js";

const router = Router();

// User Routes
router.post("/", verifyToken, uploadComplaintImage, createComplaint);
router.get("/my", verifyToken, getMyComplaints);

// Admin Routes
router.get("/", verifyToken, isSuperAdmin, getAllComplaints);
router.put("/:id/status", verifyToken, isSuperAdmin, updateComplaintStatus);
router.delete("/:id", verifyToken, isSuperAdmin, deleteComplaint);

export default router;