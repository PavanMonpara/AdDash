import ChatMessage from "../models/model.chatMessage.js";
import { Notification } from "../models/model.notification.js";
import { ensureParticipantCanAccessSession, getOrCreateSession, resolveListener } from "../services/sessionService.js";
import { getIO } from "../socket/socketManager.js";

const roomForSession = (sessionId) => `session_chat_${sessionId}`;

export default function sessionChatHandler(io) {
  // Auth handled globally in socketManager.js

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
        const ioInstance = getIO();

        // Emit message to all users in the room
        io.to(roomId).emit("chat:message", {
          id: saved._id,
          sessionId,
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
                sessionId,
                messageId: saved._id,
                messageType
              }
            });

            await notification.save();

            // Send push notification if user is connected from another device
            if (ioInstance.sendNotification) {
              ioInstance.sendNotification(receiverId, {
                type: 'new_message',
                data: {
                  sessionId,
                  messageId: saved._id,
                  sender: senderId,
                  message: messageType === 'text' ? message : 'New media message',
                  timestamp: new Date()
                }
              });
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
