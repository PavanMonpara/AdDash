import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import ChatMessage from "../models/model.chatMessage.js";
import { ensureParticipantCanAccessSession, getOrCreateSession, resolveListener } from "../services/sessionService.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const roomForSession = (sessionId) => `session_chat_${sessionId}`;

const normalizeBearerToken = (authHeader) => {
  if (!authHeader) return null;
  if (typeof authHeader !== "string") return null;
  if (authHeader.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return authHeader;
};

export default function sessionChatHandler(io) {
  // Socket auth for chat namespace/handlers
  io.use((socket, next) => {
    try {
      const token =
        normalizeBearerToken(socket.handshake.auth?.token) ||
        normalizeBearerToken(socket.handshake.headers?.authorization);

      if (!token) return next(new Error("Authentication failed"));
      if (!JWT_SECRET) return next(new Error("Server misconfigured: JWT_SECRET missing"));

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded; // {id, role, ...}
      next();
    } catch (e) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    // join a chat room for a session
    socket.on("chat:join", async ({ sessionId, listenerId, listenerUserId, type = "chat" }) => {
      try {
        let resolvedSessionId = sessionId;

        // Auto-create session if not provided
        if (!resolvedSessionId) {
          const resolvedListener = await resolveListener({ listenerId, listenerUserId });
          const session = await getOrCreateSession({
            userId: String(socket.user?.id),
            listenerId: resolvedListener.listenerId,
            type,
          });
          resolvedSessionId = String(session._id);
        }

        const { userId, listenerUserId: participantListenerUserId } =
          await ensureParticipantCanAccessSession({
            sessionId: resolvedSessionId,
            requesterUserId: String(socket.user?.id),
          });

        const requesterId = String(socket.user?.id);
        if (requesterId !== userId && requesterId !== participantListenerUserId) {
          throw new Error("You are not a participant of this session");
        }

        const roomId = roomForSession(resolvedSessionId);
        await socket.join(roomId);

        console.log(
          `[socket] chat activated | sessionId=${resolvedSessionId} | userId=${requesterId} | socketId=${socket.id}`
        );

        socket.emit("chat:joined", { sessionId: resolvedSessionId, roomId });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to join chat" });
      }
    });

    // send a chat message (server decides receiver based on session participants)
    socket.on("chat:message", async ({ sessionId, message, messageType = "text" }) => {
      try {
        if (!sessionId) throw new Error("sessionId is required");
        if (!message) throw new Error("message is required");

        const { userId, listenerUserId } = await ensureParticipantCanAccessSession({
          sessionId,
          requesterUserId: String(socket.user?.id),
        });

        const senderId = String(socket.user?.id);
        const receiverId = senderId === userId ? listenerUserId : userId;

        const saved = await ChatMessage.create({
          session: sessionId,
          sender: senderId,
          receiver: receiverId,
          message,
          messageType,
        });

        const roomId = roomForSession(sessionId);

        io.to(roomId).emit("chat:message", {
          id: saved._id,
          sessionId,
          sender: saved.sender,
          receiver: saved.receiver,
          message: saved.message,
          messageType: saved.messageType,
          createdAt: saved.createdAt,
        });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to send message" });
      }
    });

    socket.on("chat:typing", async ({ sessionId, isTyping = true }) => {
      try {
        if (!sessionId) return;

        const { userId, listenerUserId } = await ensureParticipantCanAccessSession({
          sessionId,
          requesterUserId: String(socket.user?.id),
        });

        const senderId = String(socket.user?.id);

        if (senderId !== userId && senderId !== listenerUserId) return;

        const roomId = roomForSession(sessionId);
        socket.to(roomId).emit("chat:typing", {
          sessionId,
          sender: senderId,
          isTyping: !!isTyping,
        });
      } catch {
        // ignore typing errors
      }
    });

    socket.on("chat:leave", async ({ sessionId }) => {
      if (!sessionId) return;
      const roomId = roomForSession(sessionId);
      socket.leave(roomId);
    });
  });
}
