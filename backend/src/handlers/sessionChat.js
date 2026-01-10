import ChatMessage from "../models/model.chatMessage.js";
import { Notification } from "../models/model.notification.js";
import { User } from "../models/model.login.js";
import { ensureParticipantCanAccessSession, getOrCreateSession, resolveListener } from "../services/sessionService.js";
import { getIO } from "../socket/socketManager.js";
import { sendPushNotification } from "../services/firebaseService.js";
import mongoose from "mongoose";

const roomForSession = (sessionId) => `session_chat_${sessionId}`;

// Helper to resolve session ID from potentially composite ID (userId_otherId)
const resolveSessionFromId = async (inputSessionId, socketUserId, type = "chat") => {
  if (!inputSessionId) return null;

  // 1. Check for composite ID format (id1_id2) FIRST
  // This prevents strings with underscores from reaching ObjectId validation or falling through to be treated as ID.
  if (typeof inputSessionId === 'string' && inputSessionId.includes('_')) {
    const parts = inputSessionId.split('_');
    if (parts.length === 2 && mongoose.Types.ObjectId.isValid(parts[0]) && mongoose.Types.ObjectId.isValid(parts[1])) {

      const otherUserId = parts[0] === socketUserId ? parts[1] : (parts[1] === socketUserId ? parts[0] : null);

      if (!otherUserId) {
        console.warn(`[resolveSessionFromId] Requester ${socketUserId} not in composite ID ${inputSessionId}`);
        return null;
      }

      // We need to resolve who is the listener. 
      // Strategy: Try resolving "otherUserId" as listener first (User -> Listener case)
      // Then try resolving "socketUserId" as listener (Listener -> User case)

      try {
        // Case A: I am User, Other is Listener
        const { listenerId } = await resolveListener({ listenerUserId: otherUserId });
        const session = await getOrCreateSession({ userId: socketUserId, listenerId, type });
        return String(session._id);
      } catch (e1) {
        try {
          // Case B: I am Listener, Other is User
          const { listenerId } = await resolveListener({ listenerUserId: socketUserId });
          const session = await getOrCreateSession({ userId: otherUserId, listenerId, type });
          return String(session._id);
        } catch (e2) {
          console.warn(`[resolveSessionFromId] Could not resolve listener from participants: ${parts.join(', ')}`);
        }
      }
    }
    // If it has an underscore but fails any check above, it is NOT a valid ID. Return null.
    return null;
  }

  // 2. If valid ObjectId, assume it's a real Session ID
  if (mongoose.Types.ObjectId.isValid(inputSessionId)) {
    return inputSessionId;
  }

  // Return null if resolution failed
  return null;
};

export default function sessionChatHandler(io) {
  // Auth handled globally in socketManager.js

  io.on("connection", (socket) => {
    // join a chat room for a session
    socket.on("chat:join", async ({ sessionId, listenerId, listenerUserId, type = "chat" }) => {
      try {
        const socketUserId = String(socket.user?.id);
        let resolvedSessionId = await resolveSessionFromId(sessionId, socketUserId, type);

        // Auto-create session if not provided or resolved
        if (!resolvedSessionId) {
          // Fallback to explicit listenerId/listenerUserId logic if sessionId wasn't resolved
          if (listenerId || listenerUserId) {
            const resolvedListener = await resolveListener({ listenerId, listenerUserId });
            const session = await getOrCreateSession({
              userId: socketUserId,
              listenerId: resolvedListener.listenerId,
              type,
            });
            resolvedSessionId = String(session._id);
          } else {
            // If we couldn't resolve from ID string AND no explicit listener details, we can't join.
            if (sessionId) console.warn(`[chat:join] Could not resolve session: ${sessionId}`);
            return;
          }
        }

        if (!resolvedSessionId || !mongoose.Types.ObjectId.isValid(resolvedSessionId)) {
          // Should not happen if logic above works, but safety check
          throw new Error("Invalid session identifier");
        }

        const { userId, listenerUserId: participantListenerUserId } =
          await ensureParticipantCanAccessSession({
            sessionId: resolvedSessionId,
            requesterUserId: socketUserId,
          });

        if (socketUserId !== userId && socketUserId !== participantListenerUserId) {
          throw new Error("You are not a participant of this session");
        }

        const roomId = roomForSession(resolvedSessionId);
        await socket.join(roomId);

        console.log(
          `[socket] chat activated | sessionId=${resolvedSessionId} | userId=${socketUserId} | socketId=${socket.id}`
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

        const socketUserId = String(socket.user?.id);
        const resolvedSessionId = await resolveSessionFromId(sessionId, socketUserId); // type defaults to chat

        if (!resolvedSessionId) throw new Error("Invalid sessionId or session not found");

        const { userId, listenerUserId } = await ensureParticipantCanAccessSession({
          sessionId: resolvedSessionId,
          requesterUserId: socketUserId,
        });

        const senderId = socketUserId;
        const receiverId = senderId === userId ? listenerUserId : userId;

        const saved = await ChatMessage.create({
          session: resolvedSessionId,
          sender: senderId,
          receiver: receiverId,
          message,
          messageType,
        });

        const roomId = roomForSession(resolvedSessionId);
        const ioInstance = getIO();

        // Emit message to all users in the room
        io.to(roomId).emit("chat:message", {
          id: saved._id,
          sessionId: resolvedSessionId, // Send back the REAL ObjectId
          sender: saved.sender,
          receiver: saved.receiver,
          message: saved.message,
          messageType: saved.messageType,
          createdAt: saved.createdAt,
        });

        // Create and send notification to receiver if they're not in the room
        const clientsInRoom = await io.in(roomId).fetchSockets();
        const isReceiverOnline = clientsInRoom.some(client => client.user?.id === receiverId);

        if (!isReceiverOnline) {
          try {
            const notification = new Notification({
              recipient: receiverId,
              sender: senderId,
              type: 'message',
              title: 'New Message',
              message: messageType === 'text' ? message : 'New media message received',
              data: {
                sessionId: resolvedSessionId,
                messageId: saved._id,
                messageType
              }
            });

            await notification.save();

            // Send push notification if user is connected from another device or completely offline
            if (ioInstance.sendNotification) {
              // Internal socket notification (legacy/web socket based)
              ioInstance.sendNotification(receiverId, {
                type: 'new_message',
                data: {
                  sessionId: resolvedSessionId,
                  messageId: saved._id,
                  sender: senderId,
                  message: messageType === 'text' ? message : 'New media message',
                  timestamp: new Date()
                }
              });
            }

            // Send FCM Push Notification
            try {
              // Verify User exists and get Token
              const receiverUser = await User.findById(receiverId).select("fcmToken username");
              const senderUser = await User.findById(senderId).select("username"); // Optimization: could be cached or passed in socket.user

              if (receiverUser?.fcmToken) {
                await sendPushNotification(
                  receiverUser.fcmToken,
                  `New Message from ${senderUser?.username || "User"}`,
                  messageType === 'text' ? message : 'Sent a media file',
                  {
                    type: 'message',
                    sessionId: String(resolvedSessionId),
                    messageId: String(saved._id),
                    senderId: String(senderId)
                  }
                );
              }
            } catch (pushError) {
              console.error("Failed to send chat push notification:", pushError);
            }
          } catch (error) {
            console.error('Error creating notification:', error);
          }
        }
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to send message" });
      }
    });

    socket.on("chat:typing", async ({ sessionId, isTyping = true }) => {
      try {
        if (!sessionId) return;

        const socketUserId = String(socket.user?.id);
        const resolvedSessionId = await resolveSessionFromId(sessionId, socketUserId);

        if (!resolvedSessionId) return; // Ignore if invalid

        const { userId, listenerUserId } = await ensureParticipantCanAccessSession({
          sessionId: resolvedSessionId,
          requesterUserId: socketUserId,
        });

        const senderId = socketUserId;

        if (senderId !== userId && senderId !== listenerUserId) return;

        const roomId = roomForSession(resolvedSessionId);
        socket.to(roomId).emit("chat:typing", {
          sessionId: resolvedSessionId, // Send back real ID
          sender: senderId,
          isTyping: !!isTyping,
        });
      } catch {
        // ignore typing errors
      }
    });

    socket.on("chat:leave", async ({ sessionId }) => {
      if (!sessionId) return;
      // We can't really resolve session from ID easily here without user context in payload or using socket.user. 
      // Assuming for 'leave' valid ObjectId is usually passed. 
      // If we really want to support composite ID for leave, we can call resolveSessionFromId.
      let resolvedSessionId = sessionId;
      if (sessionId.includes('_') && socket.user?.id) {
        resolvedSessionId = await resolveSessionFromId(sessionId, String(socket.user.id));
      }

      if (resolvedSessionId && mongoose.Types.ObjectId.isValid(resolvedSessionId)) {
        const roomId = roomForSession(resolvedSessionId);
        socket.leave(roomId);
      }
    });
  });
}
