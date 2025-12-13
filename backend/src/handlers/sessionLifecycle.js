import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import {
  endSession,
  ensureParticipantCanAccessSession,
  getOrCreateSession,
  resolveListener,
} from "../services/sessionService.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const normalizeBearerToken = (authHeader) => {
  if (!authHeader) return null;
  if (typeof authHeader !== "string") return null;
  if (authHeader.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return authHeader;
};

const userRoom = (userId) => `user_${userId}`;

export default function sessionLifecycleHandler(io) {
  io.use((socket, next) => {
    try {
      const token =
        normalizeBearerToken(socket.handshake.auth?.token) ||
        normalizeBearerToken(socket.handshake.headers?.authorization);

      if (!token) return next(new Error("Authentication failed"));
      if (!JWT_SECRET) return next(new Error("Server misconfigured: JWT_SECRET missing"));

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const selfId = String(socket.user?.id);
    if (selfId) socket.join(userRoom(selfId));

    // Create/reuse an active session so chat/call history continues.
    // Client can call this as soon as user selects chat/audio/video.
    socket.on("session:getOrCreate", async ({ listenerId, listenerUserId, type }) => {
      try {
        const resolved = await resolveListener({ listenerId, listenerUserId });

        const session = await getOrCreateSession({
          userId: selfId,
          listenerId: resolved.listenerId,
          type,
        });

        console.log(
          `[socket] session activated | sessionId=${String(session._id)} | type=${session.type} | userId=${selfId} | socketId=${socket.id}`
        );

        socket.emit("session:ready", {
          sessionId: String(session._id),
          type: session.type,
          listenerId: String(session.listener),
          startTime: session.startTime,
          status: session.status,
        });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to create session" });
      }
    });

    // End a session (user OR listener can end)
    socket.on("session:end", async ({ sessionId, reason }) => {
      try {
        if (!sessionId) throw new Error("sessionId is required");

        const ended = await endSession({
          sessionId,
          endedByUserId: selfId,
          reason: reason || "ended",
        });

        const { userId, listenerUserId } = await ensureParticipantCanAccessSession({
          sessionId,
          requesterUserId: selfId,
        });

        io.to(userRoom(userId)).emit("session:ended", {
          sessionId: String(ended._id),
          status: ended.status,
          endTime: ended.endTime,
          durationInMinutes: ended.durationInMinutes,
          endedBy: ended.endedBy,
          endedReason: ended.endedReason,
        });

        io.to(userRoom(listenerUserId)).emit("session:ended", {
          sessionId: String(ended._id),
          status: ended.status,
          endTime: ended.endTime,
          durationInMinutes: ended.durationInMinutes,
          endedBy: ended.endedBy,
          endedReason: ended.endedReason,
        });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to end session" });
      }
    });
  });
}
