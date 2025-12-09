// controllers/complaint.control.js
import Complaint from "../models/model.complaint.js";
import Category from "../models/model.category.js";

// CREATE – User submits complaint
export const createComplaint = async (req, res) => {
  try {
    const { title, categoryId } = req.body;
    const userId = req.user.id;

    if (!title || !categoryId) {
      return res.status(400).json({ success: false, message: "Title & category required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Screenshot/Image is required" });
    }

    const category = await Category.findById(categoryId);
    if (!category || !category.isActive) {
      return res.status(404).json({ success: false, message: "Invalid category" });
    }

    const imageUrl = `/uploads/complaints/${req.file.filename}`;

    const complaint = new Complaint({
      userId,
      categoryId,
      title,
      image: imageUrl,
    });

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate("userId", "username phoneNumber alias")
      .populate("categoryId", "name");

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      complaint: populated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET MY COMPLAINTS – User
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user.id })
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL COMPLAINTS – Admin Only
export const getAllComplaints = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const status = req.query.status;

    const filter = status ? { status } : {};

    const complaints = await Complaint.find(filter)
      .populate("userId", "username phoneNumber alias")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Complaint.countDocuments(filter);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      complaints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE STATUS – Admin Only
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemark } = req.body;

    if (!["in-progress", "resolved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });

    complaint.status = status;
    if (adminRemark) complaint.adminRemark = adminRemark;
    if (status === "resolved") complaint.resolvedAt = Date.now();

    await complaint.save();

    const updated = await Complaint.findById(id)
      .populate("userId", "username")
      .populate("categoryId", "name");

    res.status(200).json({
      success: true,
      message: "Status updated",
      complaint: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE COMPLAINT – Admin Only
export const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: "Not found" });

    res.status(200).json({ success: true, message: "Complaint deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};