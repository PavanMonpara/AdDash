import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import ChatMessage from "../models/model.chatMessage.js";
import SupportTicket from "../models/model.supportTicket.js";
import { User } from "../models/model.login.js";
import { BlockedUser } from "../models/model.blockedUser.js";
import { SuspendedListener } from "../models/model.suspendedListener.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const isSupportStaff = (user) => {
  const role = user?.role;
  const roles = Array.isArray(user?.roles) ? user.roles : [];

  return (
    role === "support" ||
    role === "superAdmin" ||
    roles.includes("support") ||
    roles.includes("superAdmin")
  );
};

export default function supportChatHandler(io) {
  const onlineAgents = new Set();
  const userRooms = new Map(); // userId -> roomId
  const socketToUser = new Map(); // userId -> socketId

  const authenticateSocket = async (socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

      if (!token) {
        throw new Error("No token provided");
      }

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is missing in .env");
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      const dbUser = await User.findById(decoded.id).select(
        "email username cCode phoneNumber role roles"
      );

      if (!dbUser) {
        throw new Error("User not found");
      }

      const blocked = await BlockedUser.findOne({
        $or: [
          { userId: dbUser._id },
          { email: dbUser.email },
          { username: dbUser.username },
          { cCode: dbUser.cCode, phoneNumber: dbUser.phoneNumber },
        ],
      });

      if (blocked) {
        throw new Error("Blocked user cannot use support chat");
      }

      const suspended = await SuspendedListener.findOne({
        $or: [
          { userId: dbUser._id },
          { cCode: dbUser.cCode, phoneNumber: dbUser.phoneNumber },
        ],
      });

      if (suspended) {
        throw new Error("Suspended listener cannot use support chat");
      }

      // Keep decoded + DB role info available on socket
      socket.user = {
        ...decoded,
        role: dbUser.role,
        roles: dbUser.roles || [],
        username: dbUser.username,
      };

      next();
    } catch (error) {
      console.error("Socket auth error:", error?.message || error);
      next(new Error("Authentication failed"));
    }
  };

  io.use(authenticateSocket).on("connection", (socket) => {
    const userId = socket.user?.id;

    console.log("Client connected:", userId);

    if (userId) {
      socketToUser.set(userId, socket.id);

      if (isSupportStaff(socket.user)) {
        onlineAgents.add(userId);
        io.emit("agentStatus", {
          agentId: userId,
          status: "online",
          timestamp: new Date(),
        });
      }
    }

    socket.on("userJoin", async ({ userId: joinUserId }) => {
      try {
        if (!joinUserId) throw new Error("userId is required");

        // A normal user can only join their own room. Support staff can join any.
        if (socket.user.id !== joinUserId && !isSupportStaff(socket.user)) {
          throw new Error("Unauthorized access");
        }

        const roomId = `support_${joinUserId}`;
        await socket.join(roomId);

        userRooms.set(joinUserId, roomId);

        io.to(roomId).emit("systemMessage", {
          text: "Support will join shortly.",
          sender: "system",
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("User join error:", error);
        socket.emit("error", { message: error?.message || "Failed to join chat" });
      }
    });

    socket.on("agentJoin", async ({ userId: targetUserId }) => {
      try {
        if (!isSupportStaff(socket.user)) {
          throw new Error("Support/superAdmin role required");
        }

        if (!targetUserId) throw new Error("userId is required");

        const roomId = userRooms.get(targetUserId);
        if (!roomId) {
          throw new Error("User room not found (user must join first)");
        }

        await socket.join(roomId);
        onlineAgents.add(socket.user.id);

        io.to(roomId).emit("systemMessage", {
          text: `Agent ${socket.user.username || socket.user.id} joined the chat.`,
          sender: "system",
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Agent join error:", error);
        socket.emit("error", { message: error?.message || "Failed to join as agent" });
      }
    });

    socket.on("sendMessage", async ({ sessionId, sender, receiver, message }) => {
      try {
        if (!sessionId || !sender || !receiver || !message) {
          throw new Error("sessionId, sender, receiver, and message are required");
        }

        // Only allow participants or support staff
        const isParticipant = socket.user.id === sender || socket.user.id === receiver;
        if (!isParticipant && !isSupportStaff(socket.user)) {
          throw new Error("Unauthorized to send message");
        }

        const msgData = {
          session: sessionId,
          sender,
          receiver,
          message,
          timestamp: new Date(),
        };

        const savedMessage = await ChatMessage.create(msgData);

        const roomId = userRooms.get(receiver) || userRooms.get(sender);
        if (!roomId) return;

        io.to(roomId).emit("receiveMessage", {
          id: savedMessage._id,
          sender,
          receiver,
          message,
          timestamp: savedMessage.timestamp,
        });
      } catch (error) {
        console.error("Message send error:", error);
        socket.emit("error", { message: error?.message || "Failed to send message" });
      }
    });

    socket.on("typing", ({ userId: targetUserId, sender }) => {
      try {
        const roomId = userRooms.get(targetUserId);
        if (!roomId) return;

        socket.to(roomId).emit("typing", {
          sender,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Typing indicator error:", error);
      }
    });

    socket.on("adminJoinGlobal", () => {
      if (isSupportStaff(socket.user)) {
        socket.join("admin_global");
      }
    });

    socket.on("adminMessage", (msg) => {
      if (isSupportStaff(socket.user)) {
        io.to("admin_global").emit("adminMessage", {
          ...(msg || {}),
          sender: socket.user.id,
          timestamp: new Date(),
        });
      }
    });

    socket.on("leaveChat", ({ userId: targetUserId, sender }) => {
      const roomId = userRooms.get(targetUserId);
      if (!roomId) return;

      io.to(roomId).emit("chatEnded", {
        sender,
        reason: "left",
        timestamp: new Date(),
      });

      socket.leave(roomId);
      userRooms.delete(targetUserId);
    });

    socket.on("endChat", async ({ sessionId, userId: targetUserId }) => {
      try {
        if (!isSupportStaff(socket.user)) {
          throw new Error("Unauthorized");
        }

        if (!targetUserId) throw new Error("userId is required");

        const roomId = userRooms.get(targetUserId);
        if (!roomId) return;

        // Create a ticket record for audit/history
        await SupportTicket.create({
          user: targetUserId,
          subject: "Chat Session Closed",
          category: "General",
          description: `Chat session ${sessionId || ""} closed by ${socket.user.id}`.trim(),
          status: "closed",
          priority: "low",
          assignedTo: socket.user.id,
          messages: [
            {
              sender: socket.user.id,
              message: "Chat closed by support staff",
              sentAt: new Date(),
            },
          ],
        });

        io.to(roomId).emit("chatEnded", {
          reason: "ended",
          timestamp: new Date(),
        });

        socket.leave(roomId);
        userRooms.delete(targetUserId);
      } catch (error) {
        console.error("Error ending chat:", error);
        socket.emit("error", { message: error?.message || "Failed to end chat" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.user?.id);

      if (socket.user?.id) {
        socketToUser.delete(socket.user.id);

        if (isSupportStaff(socket.user)) {
          onlineAgents.delete(socket.user.id);
          io.emit("agentStatus", {
            agentId: socket.user.id,
            status: "offline",
            timestamp: new Date(),
          });
        }
      }

      // If the socket was in any active user room, notify & cleanup
      userRooms.forEach((roomId, mappedUserId) => {
        if (socket.rooms.has(roomId)) {
          io.to(roomId).emit("systemMessage", {
            text: "A user has left the chat.",
            sender: "system",
            timestamp: new Date(),
          });

          socket.leave(roomId);
          userRooms.delete(mappedUserId);
        }
      });
    });
  });
}
