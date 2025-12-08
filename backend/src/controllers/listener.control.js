// controllers/listener.control.js
import mongoose from "mongoose";
import Listener from "../models/model.listener.js";
import { User } from "../models/model.login.js";
import path from "path";
import fs from "fs";

export const promoteToListener = async (req, res) => {
  try {
    const {
      userId,
      expertise,
      experience,
      aboutMe,
      myStory,
      chargesPerMinute,
      commission,
    } = req.body;

    if (!userId || !experience || !chargesPerMinute) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const existing = await Listener.findOne({ userId });
    if (existing) {
      return res.status(400).json({ message: "User is already a listener" });
    }

    const listener = new Listener({
      userId,
      expertise: expertise || [],
      experience,
      aboutMe: aboutMe || "",
      myStory: myStory || "",
      chargesPerMinute,
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
      .populate("userId", "username email cCode phoneNumber role status alias gender lang")
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
    const listener = await Listener.findById(req.params.id).populate(
      "userId",
      "username email alias gender lang about"
    );
    if (!listener) return res.status(404).json({ message: "Listener not found" });
    res.status(200).json(listener);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// NEW: For normal users - shows only opposite gender + same language approved listeners
export const getAvailableListeners = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    // Current user ki gender & lang
    const currentUser = await User.findById(userId).select("gender lang");
    if (!currentUser || !currentUser.gender || !currentUser.lang) {
      return res.status(400).json({
        success: false,
        message: "Please complete your profile (gender & language required)",
      });
    }

    const { gender: seekerGender, lang: seekerLang } = currentUser;

    // Opposite gender logic
    let allowedGenders = [];
    if (seekerGender === "male") allowedGenders = ["female", "other"];
    else if (seekerGender === "female") allowedGenders = ["male", "other"];
    else allowedGenders = ["male", "female", "other"];

    // Query: Only approved listeners + matching user gender & lang
    const listeners = await Listener.find({ status: "approved" })
      .populate({
        path: "userId",
        match: {
          gender: { $in: allowedGenders },
          lang: seekerLang,
          status: { $in: ["active"] }, // optional
        },
        select: "username alias gender lang about phoneNumber",
      })
      .sort({ rating: -1, chargesPerMinute: 1 })
      .skip(skip)
      .limit(limit)
      .lean(); // important for modification

    // Filter out non-matching (userId null ho gaya match fail hone pe)
    const validListeners = listeners
      .filter((listener) => listener.userId !== null)
      .map((listener) => ({
        // SAB KUCH Listener se direct spread kar do – no manual field writing!
        ...listener,

        // Sirf user object ko overwrite karo with clean data
        user: {
          username: listener.userId.username || "Listener",
          alias: listener.userId.alias || listener.userId.username,
          gender: listener.userId.gender,
          lang: listener.userId.lang,
          about: listener.userId.about || "",
          phoneNumber: listener.userId.phoneNumber,
        },

        // userId field hata do (security + clean response)
        userId: undefined,
      }));

    // Accurate total count
    const totalCount = await Listener.countDocuments({
      status: "approved",
      userId: {
        $in: await User.find({
          gender: { $in: allowedGenders },
          lang: seekerLang,
          status: "active",
        }).distinct("_id"),
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total: totalCount,
      totalPages,
      count: validListeners.length,
      listeners: validListeners,
    });

  } catch (error) {
    console.error("getAvailableListeners error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateListener = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listener ID" });
    }

    const listener = await Listener.findById(id);
    if (!listener) {
      return res.status(404).json({ success: false, message: "Listener not found" });
    }

    const updateData = req.body;

    // Allowed fields for Listener
    const allowedListenerFields = [
      "expertise",
      "experience",
      "aboutMe",
      "myStory",
      "chargesPerMinute",
      "commission",
      "status",
    ];

    // Update Listener fields
    allowedListenerFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        listener[field] = updateData[field];
      }
    });

    
    if (req.file) {
      const profilePicUrl = `/uploads/profiles/${req.file.filename}`;
      // Ya agar Cloudinary use kar raha hai toh: req.file.path (cloudinary URL)

      // Save photo URL in User model
      await User.findByIdAndUpdate(listener.userId, {
        profilePic: profilePicUrl
      });
    }

    // Update status → change user role
    if (updateData.status) {
      await User.findByIdAndUpdate(listener.userId, {
        role: updateData.status === "approved" ? "listener" : "user"
      });
    }

    await listener.save();

    // Populate user with latest profilePic
    const updatedListener = await Listener.findById(id).populate({
      path: "userId",
      select: "username alias phoneNumber gender lang about profilePic"
    });

    res.status(200).json({
      success: true,
      message: "Listener profile updated successfully",
      listener: {
        ...updatedListener.toObject(),
        user: {
          ...updatedListener.userId.toObject(),
          profilePic: updatedListener.userId.profilePic || null
        }
      }
    });

  } catch (error) {
    console.error("updateListener error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
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

    res.status(200).json({
      success: true,
      message: "Listener removed and role reverted to user",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};