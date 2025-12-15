import { Server } from "socket.io";
import dotenv from "dotenv";
import supportChatHandler from "../handlers/supportChat.js";
import sessionChatHandler from "../handlers/sessionChat.js";
import sessionCallHandler from "../handlers/sessionCall.js";
import sessionLifecycleHandler from "../handlers/sessionLifecycle.js";
import { notificationHandler } from "../handlers/notificationHandler.js";

dotenv.config();

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

  // Register your socket handlers here
  supportChatHandler(ioInstance);
  sessionChatHandler(ioInstance);
  sessionCallHandler(ioInstance);
  sessionLifecycleHandler(ioInstance);
  
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
