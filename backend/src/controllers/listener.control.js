// controllers/listener.control.js
import mongoose from "mongoose";
import Listener from "../models/model.listener.js";
import { User } from "../models/model.login.js";
import { SuspendedListener } from "../models/model.suspendedListener.js";

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
      .populate("userId")
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
    const listener = await Listener.findById(req.params.id).populate("userId");
    if (!listener) return res.status(404).json({ message: "Listener not found" });
    res.status(200).json(listener);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// FIXED: getAvailableListeners – now age & profilePic are coming correctly
export const getAvailableListeners = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    // Get current user's gender & language
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

    const listeners = await Listener.find({ status: "approved" })
      .populate({
        path: "userId",
        match: {
          gender: { $in: allowedGenders },
          lang: seekerLang,
          status: "active",
        },
        // AGE & PROFILEPIC ADDED HERE - Now fetching ALL fields as requested
        // select: "" // Empty string or removing select to get everything
      })
      .sort({ isOnline: -1, rating: -1, chargesPerMinute: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Remove listeners where userId became null due to match failure
    const validListeners = listeners
      .filter((l) => l.userId !== null)
      .map((listener) => ({
        ...listener,
        user: {
          ...listener.userId, // Spread ALL user data
          // Explicit overrides/defaults if needed, but spreading ensures we get everything
          username: listener.userId.username || "Listener",
          alias: listener.userId.alias || listener.userId.username,
        },
        userId: undefined, // hide for security if preferred, but user asked for "all data"
        // If they want the raw object structure, they might want userId to stay. 
        // But for consistency with existing frontend processing, we kept 'user' key.
        // I will keep userId as undefined to avoid duplication if 'user' has everything.
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

    // 1. Update Listener fields
    const allowedListenerFields = [
      "expertise",
      "experience",
      "aboutMe",
      "myStory",
      "chargesPerMinute",
      "commission",
      "status",
    ];

    allowedListenerFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        listener[field] = updateData[field];
      }
    });

    // 2. Update User fields
    const allowedUserFields = {
      username: String,
      alias: String,
      about: String,
      age: Number,
      gender: (val) => ["male", "female", "other"].includes(val),
      lang: String,
      profilePic: String // Allow profilePic update from body if provided
    };

    const userUpdate = {};
    Object.keys(allowedUserFields).forEach((field) => {
      if (updateData[field] !== undefined) {
        if (typeof allowedUserFields[field] === "function") {
          // If it's a validation function
          if (allowedUserFields[field](updateData[field])) {
            userUpdate[field] = updateData[field];
          }
        } else {
          // If it's just a type constructor (String, Number) - optional: cast or just assign
          userUpdate[field] = updateData[field];
        }
      }
    });

    if (Object.keys(userUpdate).length > 0) {
      await User.findByIdAndUpdate(listener.userId, userUpdate);
    }

    // 3. Handle profile picture (File upload takes precedence if both provided)
    if (req.file) {
      const profilePicUrl = `/uploads/profiles/${req.file.filename}`;
      await User.findByIdAndUpdate(listener.userId, { profilePic: profilePicUrl });
    }

    // 4. Update role if status changed
    if (updateData.status) {
      const newRole = updateData.status === "approved" ? "listener" : "user";
      await User.findByIdAndUpdate(listener.userId, { role: newRole });
    }

    await listener.save();

    //  // Final fresh data
    const updatedListener = await Listener.findById(id).populate({
      path: "userId",
      // select: "username alias phoneNumber gender lang about profilePic age", // Removed select to return ALL
    });

    const user = updatedListener.userId;

    res.status(200).json({
      success: true,
      message: "Listener profile updated successfully",
      listener: {
        ...updatedListener.toObject(),
        user: {
          ...user.toObject(), // Spread full user object
          // These fallbacks are good but if we spread ...user.toObject(), we get everything.
          // We can keep them to ensure specific formatting if needed, 
          // or just rely on the spread. 
          // I will keep the spread and just overlay important defaults if missing.
          username: user.username,
          alias: user.alias || user.username,
        },
        userId: undefined,
      },
    });
  } catch (error) {
    console.error("updateListener error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
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

export const suspendListener = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listener ID" });
    }

    const listener = await Listener.findById(id).populate(
      "userId",
      "email username cCode phoneNumber"
    );

    if (!listener) {
      return res.status(404).json({ success: false, message: "Listener not found" });
    }

    const user = listener.userId;

    // Save to suspended collection
    await SuspendedListener.findOneAndUpdate(
      { listenerId: listener._id },
      {
        userId: user._id,
        listenerId: listener._id,
        email: user.email,
        username: user.username,
        cCode: user.cCode,
        phoneNumber: user.phoneNumber,
      },
      { upsert: true, new: true }
    );

    listener.status = "suspended";
    await listener.save();

    return res.status(200).json({
      success: true,
      message: "Listener suspended successfully",
    });
  } catch (error) {
    console.error("suspendListener error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const toggleOnlineStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const listener = await Listener.findOne({ userId });
    if (!listener) return res.status(404).json({ message: "Listener not found" });

    listener.isOnline = !listener.isOnline;
    await listener.save();

    res.status(200).json({
      success: true,
      isOnline: listener.isOnline,
      message: `You are now ${listener.isOnline ? "Online" : "Offline"}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};