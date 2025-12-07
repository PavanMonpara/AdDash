
import { User } from "../models/model.login.js";
import httpStatus from "http-status";
import mongoose from "mongoose";
import { Session } from "../models/model.session.js";
import Listener from "../models/model.listener.js";

const createSession = async (req, res) => {
  const {
    user,
    listener,
    type,
    startTime,
    amount,
    durationInMinutes,
    status,
    paymentStatus,
  } = req.body;

  if (!user || !listener || !type || !startTime || amount == null) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message:
        "Missing required fields: user, listener, type, startTime, amount",
    });
  }

  try {
    // optional: validate user & listener exist
    const existingUser = await User.findById(user);
    if (!existingUser) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User not found", result: false });
    }

    const existingListener = await Listener.findById(listener);
    if (!existingListener) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Listener not found", result: false });
    }

    const newSession = new Session({
      user,
      listener,
      type,
      startTime,
      amount,
      durationInMinutes,
      status,
      paymentStatus,
    });

    const savedSession = await newSession.save();

    // keep sessions list on User (as before)
    await User.findByIdAndUpdate(user, {
      $push: { sessions: savedSession._id },
    });
    return res.status(httpStatus.CREATED).json({
      message: "Session created successfully",
      data: savedSession,
      result: true,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    if (error.code === 11000) {
      return res
        .status(httpStatus.CONFLICT)
        .json({ message: "A session already exists." });
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: `Something went wrong: ${error.message}`,
    });
  }
};

const getSessionById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "Invalid session ID" });
  }

  try {
    const session = await Session.findById(id)
      .populate({ path: "user", select: "username email" })
      // listener -> Listener -> userId (User)
      .populate({
        path: "listener",
        populate: { path: "userId", select: "username email" },
      })
      .lean();

    if (!session) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Session not found" });
    }

    const transformedSession = {
      user: session.user?.username || "N/A",
      listener:
        session.listener?.userId?.username ||
        session.listener?._id?.toString() ||
        "N/A",
      type: session.type,
      startTime: session.startTime,
      duration: `${session.durationInMinutes} min`,
      status: session.status,
      payment: session.paymentStatus,
      amount: session.amount,
      _id: session._id,
    };

    return res
      .status(httpStatus.OK)
      .json({ data: transformedSession, result: true });
  } catch (error) {
    console.error("Error fetching session:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: `Something went wrong: ${error.message}`,
    });
  }
};

const updateSession = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "Invalid session ID" });
  }

  try {
    const updatedSession = await Session.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedSession) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Session not found, update failed" });
    }

    return res.status(httpStatus.OK).json({
      message: "Session updated successfully",
      data: updatedSession,
      result: true,
    });
  } catch (error) {
    console.error("Error updating session:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: `Something went wrong: ${error.message}`,
    });
  }
};

const deleteSession = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "Invalid session ID" });
  }

  try {
    const deletedSession = await Session.findByIdAndDelete(id);

    if (!deletedSession) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Session not found, delete failed" });
    }

    await User.findByIdAndUpdate(deletedSession.user, {
      $pull: { sessions: deletedSession._id },
    });
    return res.status(httpStatus.OK).json({
      message: "Session deleted successfully and removed from user",
      result: true,
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: `Something went wrong: ${error.message}`,
    });
  }
};

const getAllSessions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const type = req.query.type;
    const paymentStatus = req.query.paymentStatus;
    const sortBy = req.query.sortBy || "startTime";
    const order = req.query.order === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    let query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const sort = { [sortBy]: order };

    const sessions = await Session.find(query)
      .populate({ path: "user", select: "username" })
      .populate({
        path: "listener",
        populate: { path: "userId", select: "username" },
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalSessions = await Session.countDocuments(query);

    const transformedSessions = sessions.map((session) => ({
      user: session.user?.username || "N/A",
      listener:
        session.listener?.userId?.username ||
        session.listener?._id?.toString() ||
        "N/A",
      type: session.type,
      startTime: session.startTime,
      duration: `${session.durationInMinutes} min`,
      status: session.status,
      payment: session.paymentStatus,
      amount: session.amount,
      _id: session._id,
    }));

    return res.status(httpStatus.OK).json({
      message: "All sessions fetched successfully",
      data: transformedSessions,
      pagination: {
        totalSessions,
        totalPages: Math.ceil(totalSessions / limit),
        currentPage: page,
      },
      result: true,
    });
  } catch (error) {
    console.error("Error fetching all sessions:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: `Something went wrong: ${error.message}`,
    });
  }
};
export { 
    getAllSessions,
    createSession,
    getSessionById,
    updateSession,
    deleteSession
};