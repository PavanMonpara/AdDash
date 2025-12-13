import { Session } from "../models/model.session.js";
import { User } from "../models/model.login.js";
import Listener from "../models/model.listener.js";

export const resolveListener = async ({ listenerId, listenerUserId }) => {
  if (listenerId) {
    const listener = await Listener.findById(listenerId).select("_id userId");
    if (!listener) throw new Error("Listener not found");
    return { listenerId: String(listener._id), listenerUserId: String(listener.userId) };
  }

  if (listenerUserId) {
    const listener = await Listener.findOne({ userId: listenerUserId }).select("_id userId");
    if (!listener) throw new Error("Listener not found");
    return { listenerId: String(listener._id), listenerUserId: String(listener.userId) };
  }

  throw new Error("listenerId or listenerUserId is required");
};

export const getOrCreateSession = async ({ userId, listenerId, type }) => {
  if (!userId) throw new Error("userId is required");
  if (!listenerId) throw new Error("listenerId is required");
  if (!type || !["chat", "audio", "video"].includes(type)) {
    throw new Error("type must be chat/audio/video");
  }

  // Prefer reusing an active session so history remains continuous.
  const existing = await Session.findOne({
    user: userId,
    listener: listenerId,
    type,
    status: { $in: ["ongoing", "pending"] },
    isDeleted: { $ne: true },
  }).sort({ startTime: -1 });

  if (existing) return existing;

  // Validate user exists (keeps behaviour consistent with createSession controller)
  const dbUser = await User.findById(userId).select("_id");
  if (!dbUser) throw new Error("User not found");

  const session = await Session.create({
    user: userId,
    listener: listenerId,
    type,
    startTime: new Date(),
    amount: 0,
    durationInMinutes: 0,
    status: "ongoing",
    paymentStatus: "pending",
  });

  await User.findByIdAndUpdate(userId, { $push: { sessions: session._id } });

  return session;
};

export const ensureParticipantCanAccessSession = async ({ sessionId, requesterUserId }) => {
  const session = await Session.findById(sessionId).select("user listener type startTime status");
  if (!session) throw new Error("Session not found");

  // listener is a Listener document id; map it to listener's User id
  const listenerDoc = await Listener.findById(session.listener).select("userId");
  if (!listenerDoc) throw new Error("Listener not found for this session");

  const userId = String(session.user);
  const listenerUserId = String(listenerDoc.userId);

  if (String(requesterUserId) !== userId && String(requesterUserId) !== listenerUserId) {
    throw new Error("You are not a participant of this session");
  }

  return { session, userId, listenerUserId };
};

export const endSession = async ({ sessionId, endedByUserId, reason = "ended" }) => {
  const { session, userId, listenerUserId } = await ensureParticipantCanAccessSession({
    sessionId,
    requesterUserId: endedByUserId,
  });

  const endTime = new Date();
  const startTime = session.startTime ? new Date(session.startTime) : endTime;
  const durationMinutes = Math.max(0, Math.ceil((endTime - startTime) / 60000));

  session.status = "completed";
  session.durationInMinutes = durationMinutes;
  session.endTime = endTime;
  session.endedReason = reason;
  session.endedBy = {
    userType: String(endedByUserId) === userId ? "user" : "listener",
    userId: endedByUserId,
  };

  await session.save();

  return session;
};
