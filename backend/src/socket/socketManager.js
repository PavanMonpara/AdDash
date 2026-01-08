import { Server } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { User } from "../models/model.login.js";
import { BlockedUser } from "../models/model.blockedUser.js";
import { SuspendedListener } from "../models/model.suspendedListener.js";
import supportChatHandler from "../handlers/supportChat.js";
import sessionChatHandler from "../handlers/sessionChat.js";
import sessionCallHandler from "../handlers/sessionCall.js";
import sessionLifecycleHandler from "../handlers/sessionLifecycle.js";
import { notificationHandler } from "../handlers/notificationHandler.js";
import chatListHandler from "../handlers/chatListHandler.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const normalizeBearerToken = (authHeader) => {
  if (!authHeader) return null;
  if (typeof authHeader !== "string") return null;
  if (authHeader.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return authHeader;
};

let ioInstance = null;

export const initSocket = (httpServer, options = {}) => {
  const {
    corsOrigin = process.env.SOCKET_CORS_ORIGIN || "*",
    path = process.env.SOCKET_IO_PATH || "/socket.io",
  } = options;

  ioInstance = new Server(httpServer, {
    path,
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 25000
  });

  // Centralized Authentication Middleware
  ioInstance.use(async (socket, next) => {
    try {
      const token =
        normalizeBearerToken(socket.handshake.auth?.token) ||
        normalizeBearerToken(socket.handshake.headers?.authorization);

      if (!token) {
        return next(new Error("Authentication failed: No token provided"));
      }

      if (!JWT_SECRET) return next(new Error("Server misconfigured: JWT_SECRET missing"));

      const decoded = jwt.verify(token, JWT_SECRET);

      // Fetch full user details for roles and status checks
      const dbUser = await User.findById(decoded.id).select("email username cCode phoneNumber role roles status");

      if (!dbUser) {
        return next(new Error("User not found"));
      }

      // Check if user is blocked
      const blocked = await BlockedUser.findOne({
        $or: [
          { userId: dbUser._id },
          { email: dbUser.email },
          { username: dbUser.username },
          { cCode: dbUser.cCode, phoneNumber: dbUser.phoneNumber },
        ],
      });

      if (blocked) {
        return next(new Error("Blocked user cannot access socket services"));
      }

      // Check if listener is suspended
      const suspended = await SuspendedListener.findOne({
        $or: [
          { userId: dbUser._id },
          { cCode: dbUser.cCode, phoneNumber: dbUser.phoneNumber },
        ],
      });

      if (suspended) {
        return next(new Error("Suspended listener cannot access socket services"));
      }

      // Attach user info to socket
      socket.user = {
        ...decoded,
        role: dbUser.role,
        roles: dbUser.roles || [],
        username: dbUser.username,
        id: dbUser._id.toString()
      };

      // Legacy support for handlers expecting socket.userId
      socket.userId = dbUser._id.toString();

      next();
    } catch (error) {
      console.error("Socket auth error:", error.message);
      next(new Error("Authentication failed"));
    }
  });

  // Register your socket handlers here
  supportChatHandler(ioInstance);
  sessionChatHandler(ioInstance);
  sessionCallHandler(ioInstance);
  sessionLifecycleHandler(ioInstance);
  chatListHandler(ioInstance);

  // Initialize notification handler and export its methods
  const { sendNotification, broadcastNotification } = notificationHandler(ioInstance);
  ioInstance.sendNotification = sendNotification;
  ioInstance.broadcastNotification = broadcastNotification;

  return ioInstance;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.IO is not initialized yet. Call initSocket(server) first.");
  }
  return ioInstance;
};
