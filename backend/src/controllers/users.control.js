// src/controllers/users.control.js

import { User } from "../models/model.login.js";
import { Session } from "../models/model.session.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

// Safe response banao taaki password, token kabhi na jaaye
const createSafeUserResponse = (userDoc, sessions = [], tickets = []) => {
  return {
    _id: userDoc._id,
    userId: userDoc.username,
    alias: userDoc.alias || "",
    contact: {
      email: userDoc.email,
      phone: `${userDoc.cCode || ""} ${userDoc.phoneNumber || ""}`.trim(),
    },
    role: userDoc.role,
    status: userDoc.status,
    wallet: 0.0,
    sessions: sessions.length || 0,
    tickets: tickets.length || 0,
    registered: userDoc.registered,
    lastActive: userDoc.lastActive,
    sessionDetails: sessions,
    ticketDetails: tickets,
  };
};

// GET ALL USERS (with pagination & filters)
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    else filter.role = "user"; // default sirf normal users dikhao
    if (req.query.status) filter.status = req.query.status;

    const users = await User.find(filter)
      .select("-password -token -__v")
      .populate({
        path: "sessions",
        select: "type status startTime endTime duration listener user",
      })
      .populate({
        path: "tickets",
        select: "subject category status priority createdAt updatedAt",
      })
      .skip(skip)
      .limit(limit)
      .sort({ registered: -1 })
      .lean();

    const totalUsers = await User.countDocuments(filter);

    const transformedUsers = users.map((u) =>
      createSafeUserResponse(u, u.sessions || [], u.tickets || [])
    );

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Users fetched successfully",
      data: transformedUsers,
      pagination: {
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};


export const getNormalUsersOnly = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();

    // Sirf normal users
    const filter = { role: "user" };

    // Search by username, phone, alias
    if (search) {
      const phoneSearch = search.replace(/\D/g, ""); // only digits
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { alias: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: phoneSearch, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password -token -__v -sessions -tickets") // sensitive + heavy fields hata diye
      .sort({ registered: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(filter);

    // Direct DB se aaya data — no manual mapping!
    // Saare fields as-it-is: email, cCode, phoneNumber, gender, lang, profilePic, etc.
    res.status(200).json({
      success: true,
      message: "Normal users fetched successfully",
      count: users.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      users, // pura user object — no change, no extra logic
    });

  } catch (error) {
    console.error("getNormalUsersOnly error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// GET SINGLE USER BY ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  try {
    const user = await User.findById(id)
      .select("-password -token -__v")
      .populate({
        path: "sessions",
        select: "type status startTime endTime duration listener user",
      })
      .populate({
        path: "tickets",
        select: "subject category status priority createdAt updatedAt",
      })
      .lean();

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    const userResponse = createSafeUserResponse(
      user,
      user.sessions || [],
      user.tickets || []
    );

    return res.status(httpStatus.OK).json({
      success: true,
      message: "User fetched successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  const updateData = { ...req.body };

  try {
    // Password hash karo agar diya gaya ho
    if (updateData.password) {
      if (updateData.password.trim() === "") {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Password cannot be empty",
        });
      }
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Email ya username duplicate check
    if (updateData.email || updateData.username) {
      const existingUser = await User.findOne({
        $or: [
          { email: updateData.email },
          { username: updateData.username },
        ],
        _id: { $ne: id },
      });

      if (existingUser) {
        const field = existingUser.email === updateData.email ? "Email" : "Username";
        return res.status(httpStatus.CONFLICT).json({
          success: false,
          message: `${field} already exists`,
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password -token -__v")
      .populate("sessions tickets")
      .lean();

    if (!updatedUser) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    const userResponse = createSafeUserResponse(
      updatedUser,
      updatedUser.sessions || [],
      updatedUser.tickets || []
    );

    return res.status(httpStatus.OK).json({
      success: true,
      message: "User updated successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    if (error.code === 11000) {
      return res.status(httpStatus.CONFLICT).json({
        success: false,
        message: "Email or username already taken",
      });
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Update failed",
      error: error.message,
    });
  }
};

// DELETE USER + ALL SESSIONS
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  try {
    // Pehle saari sessions dhundo jisme ye user involved hai
    const sessionsToDelete = await Session.find({
      $or: [{ user: id }, { listener: id }],
    }).lean();

    if (sessionsToDelete.length > 0) {
      const sessionIds = sessionsToDelete.map((s) => s._id);

      // Dusre users se in sessions ko hatao
      const otherUserIds = new Set();
      sessionsToDelete.forEach((session) => {
        const userIdStr = id.toString();
        const other = session.user.toString() !== userIdStr ? session.user : session.listener;
        if (other) otherUserIds.add(other.toString());
      });

      await User.updateMany(
        { _id: { $in: Array.from(otherUserIds) } },
        { $pull: { sessions: { $in: sessionIds } } }
      );

      await Session.deleteMany({ _id: { $in: sessionIds } });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(httpStatus.OK).json({
      success: true,
      message: "User and all related sessions deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Delete failed",
      error: error.message,
    });
  }
};