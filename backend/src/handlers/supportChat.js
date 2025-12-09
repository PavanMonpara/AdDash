import ChatMessage from "../models/model.chatMessage.js";
import SupportTicket from "../models/model.supportTicket.js";
import { User } from "../models/model.login.js";
import { BlockedUser } from "../models/model.blockedUser.js";
import { SuspendedListener } from "../models/model.suspendedListener.js";
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default function supportChatHandler(io) {
    const onlineAgents = new Set();
    const userRooms = new Map();
    const socketToUser = new Map();

    // Authentication middleware for WebSocket
    const authenticateSocket = async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token?.split(' ')[1];
            if (!token) {
                throw new Error('No token provided');
            }
            const decoded = jwt.verify(token, JWT_SECRET);

            const dbUser = await User.findById(decoded.id).select("email username cCode phoneNumber role");
            if (!dbUser) {
                throw new Error('User not found');
            }

            const blocked = await BlockedUser.findOne({
                $or: [
                    { email: dbUser.email },
                    { username: dbUser.username },
                    { cCode: dbUser.cCode, phoneNumber: dbUser.phoneNumber },
                ],
            });
            if (blocked) {
                throw new Error('Blocked user cannot use support chat');
            }

            const suspended = await SuspendedListener.findOne({
                cCode: dbUser.cCode,
                phoneNumber: dbUser.phoneNumber,
            });
            if (suspended) {
                throw new Error('Suspended listener cannot use support chat');
            }

            socket.user = decoded;
            next();
        } catch (error) {
            console.error('Socket auth error:', error.message);
            next(new Error('Authentication failed'));
        }
    };

    io.use(authenticateSocket).on("connection", (socket) => {
        console.log('Client connected:', socket.user.id);
        socketToUser.set(socket.user.id, socket.id);

        socket.on("userJoin", async ({ userId }) => {
            try {
                if (socket.user.id !== userId && !['admin', 'support'].includes(socket.user.role)) {
                    throw new Error('Unauthorized access');
                }

                const roomId = `support_${userId}`;
                await socket.join(roomId);
                userRooms.set(userId, roomId);
                
                io.to(roomId).emit("systemMessage", {
                    text: "Support will join shortly.",
                    sender: "system",
                    timestamp: new Date()
                });
            } catch (error) {
                console.error('User join error:', error);
                socket.emit('error', { message: error.message || 'Failed to join chat' });
            }
        });

        socket.on("agentJoin", async ({ agentId, userId }) => {
            try {
                if (!['admin', 'support'].includes(socket.user.role)) {
                    throw new Error('Admin/support role required');
                }

                const roomId = userRooms.get(userId);
                if (!roomId) {
                    throw new Error('User room not found');
                }

                await socket.join(roomId);
                onlineAgents.add(agentId);
                
                io.to(roomId).emit("systemMessage", {
                    text: `Agent ${socket.user.username || agentId} joined the chat.`,
                    sender: "system",
                    timestamp: new Date()
                });
            } catch (error) {
                console.error('Agent join error:', error);
                socket.emit('error', { message: error.message || 'Failed to join as agent' });
            }
        });

        socket.on("sendMessage", async ({ sessionId, sender, receiver, message }) => {
            try {
                if (socket.user.id !== sender && socket.user.id !== receiver && 
                    !['admin', 'support'].includes(socket.user.role)) {
                    throw new Error('Unauthorized to send message');
                }

                const msgData = {
                    session: sessionId,
                    sender,
                    receiver,
                    message,
                    timestamp: new Date()
                };

                const savedMessage = await ChatMessage.create(msgData);
                const roomId = userRooms.get(receiver) || userRooms.get(sender);
                
                if (roomId) {
                    io.to(roomId).emit("receiveMessage", {
                        id: savedMessage._id,
                        sender,
                        message,
                        timestamp: savedMessage.timestamp
                    });
                }
            } catch (error) {
                console.error('Message send error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        socket.on("typing", ({ userId, sender }) => {
            try {
                const roomId = userRooms.get(userId);
                if (roomId) {
                    socket.to(roomId).emit("typing", { 
                        sender,
                        timestamp: new Date()
                    });
                }
            } catch (error) {
                console.error('Typing indicator error:', error);
            }
        });

        socket.on("agentOnline", (agentId) => {
            if (['admin', 'support'].includes(socket.user.role)) {
                onlineAgents.add(agentId);
                io.emit("agentStatus", { 
                    agentId, 
                    status: "online",
                    timestamp: new Date()
                });
            }
        });

        socket.on("agentOffline", (agentId) => {
            if (['admin', 'support'].includes(socket.user.role)) {
                onlineAgents.delete(agentId);
                io.emit("agentStatus", { 
                    agentId, 
                    status: "offline",
                    timestamp: new Date()
                });
            }
        });

        socket.on("adminJoinGlobal", ({ adminId }) => {
            if (['admin', 'support'].includes(socket.user.role)) {
                socket.join("admin_global");
            }
        });

        socket.on("adminMessage", (msg) => {
            if (['admin', 'support'].includes(socket.user.role)) {
                io.to("admin_global").emit("adminMessage", {
                    ...msg,
                    sender: socket.user.id,
                    timestamp: new Date()
                });
            }
        });

        socket.on("leaveChat", ({ userId, sender }) => {
            const roomId = userRooms.get(userId);
            if (roomId) {
                io.to(roomId).emit("chatEnded", {
                    sender,
                    reason: "left",
                    timestamp: new Date()
                });
                socket.leave(roomId);
                userRooms.delete(userId);
            }
        });

        socket.on("endChat", async ({ sessionId, userId, adminId }) => {
            try {
                if (!['admin', 'support'].includes(socket.user.role)) {
                    throw new Error('Unauthorized');
                }

                const roomId = userRooms.get(userId);
                if (!roomId) return;

                await SupportTicket.create({
                    user: userId,
                    subject: "Chat Session Closed",
                    category: "General",
                    description: `Chat closed by admin ${adminId}`,
                    status: "closed",
                    priority: "low",
                    assignedTo: adminId,
                    closedAt: new Date()
                });

                io.to(roomId).emit("chatEnded", {
                    reason: "ended",
                    timestamp: new Date()
                });

                socket.leave(roomId);
                userRooms.delete(userId);

            } catch (error) {
                console.error('Error ending chat:', error);
                socket.emit('error', { message: 'Failed to end chat' });
            }
        });

        socket.on("disconnect", () => {
            console.log('Client disconnected:', socket.user?.id);
            if (socket.user?.id) {
                socketToUser.delete(socket.user.id);
            }
            
            // Clean up any rooms this socket was in
            userRooms.forEach((roomId, userId) => {
                if (socket.rooms.has(roomId)) {
                    io.to(roomId).emit("systemMessage", {
                        text: "A user has left the chat.",
                        sender: "system",
                        timestamp: new Date()
                    });
                    socket.leave(roomId);
                }
            });
        });
    });
}