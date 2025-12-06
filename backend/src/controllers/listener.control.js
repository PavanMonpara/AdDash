
import mongoose from "mongoose";
import Listener from "../models/model.listener.js";
import { User } from "../models/model.login.js";

export const promoteToListener = async (req, res) => {
  try {
    const { userId, expertise, experience, commission } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const existing = await Listener.findOne({ userId });
    if (existing)
      return res.status(400).json({ message: "User is already a listener" });

    const listener = new Listener({
      userId,
      expertise,
      experience,
      commission: commission || "20%",
      status: "pending",
    });

    await listener.save();

    user.role = "listener";
    await user.save();

    res.status(201).json({
      message: "User promoted to listener successfully",
      listener,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllListeners = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const listeners = await Listener.find(filter)
      .populate("userId", "username email cCode phoneNumber role status")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Listener.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages,
      count: listeners.length,
      listeners,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getListenerById = async (req, res) => {
  try {
    const listener = await Listener.findById(req.params.id)
      .populate("userId", "name email role");
    if (!listener) return res.status(404).json({ message: "Listener not found" });
    res.status(200).json(listener);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateListener = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid listener ID" });
    }

    const listener = await Listener.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!listener) {
      return res.status(404).json({ message: "Listener not found" });
    }
    if (typeof updateData.status !== "undefined") {
      const user = await User.findById(listener.userId);

      if (user) {
        if (updateData.status === "approved") {
          user.role = "listener";
        } else {
          user.role = "user";
        }
        await user.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Listener updated",
      listener,
    });
  } catch (error) {
    console.error("updateListener error:", error);
    return res.status(400).json({ error: error.message });
  }
};

export const removeListener = async (req, res) => {
  try {
    const listener = await Listener.findById(req.params.id);
    if (!listener) return res.status(404).json({ message: "Listener not found" });

    const user = await User.findById(listener.userId);
    if (user) {
      user.role = "user";
      await user.save();
    }

    await Listener.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Listener removed and reverted to user" }, { success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
