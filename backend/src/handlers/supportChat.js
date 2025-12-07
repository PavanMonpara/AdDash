import ChatMessage from "../models/model.chatMessage.js";
import SupportTicket from "../models/model.supportTicket.js";

export default function supportChatHandler(io) {

    const onlineAgents = new Set();
    const userRooms = new Map();

    io.on("connection", (socket) => {

        socket.on("userJoin", ({ userId }) => {
            const roomId = `support_${userId}`;
            socket.join(roomId);
            userRooms.set(userId, roomId);
            io.to(roomId).emit("systemMessage", {
                text: "Support will join shortly.",
                sender: "system"
            });
        });

        socket.on("agentJoin", ({ agentId, userId }) => {
            const roomId = userRooms.get(userId);
            if (!roomId) return;
            socket.join(roomId);
            onlineAgents.add(agentId);
            io.to(roomId).emit("systemMessage", {
                text: `Agent ${agentId} joined the chat.`,
                sender: "system"
            });
        });

        socket.on("sendMessage", async ({ sessionId, sender, receiver, message }) => {
            const msgData = {
                session: sessionId,
                sender,
                receiver,
                message
            };

            await ChatMessage.create(msgData);

            const roomId = userRooms.get(receiver) || userRooms.get(sender);
            if (!roomId) return;

            io.to(roomId).emit("receiveMessage", {
                sender,
                message,
                time: new Date()
            });
        });

        socket.on("typing", ({ userId, sender }) => {
            const roomId = userRooms.get(userId);
            socket.to(roomId).emit("typing", { sender });
        });

        socket.on("agentOnline", (agentId) => {
            onlineAgents.add(agentId);
            io.emit("agentStatus", { agentId, status: "online" });
        });

        socket.on("agentOffline", (agentId) => {
            onlineAgents.delete(agentId);
            io.emit("agentStatus", { agentId, status: "offline" });
        });

        socket.on("adminJoinGlobal", ({ adminId }) => {
            socket.join("admin_global");
        });

        socket.on("adminMessage", (msg) => {
            io.to("admin_global").emit("adminMessage", msg);
        });

        socket.on("leaveChat", ({ userId, sender }) => {
            const roomId = userRooms.get(userId);
            if (!roomId) return;
            io.to(roomId).emit("chatEnded", {
                sender,
                reason: "left"
            });
            socket.leave(roomId);
            userRooms.delete(userId);
        });

        socket.on("endChat", async ({ sessionId, userId, adminId }) => {
            const roomId = userRooms.get(userId);
            if (!roomId) return;

            await SupportTicket.create({
                user: userId,
                subject: "Chat Session Closed",
                category: "General",
                description: `Chat closed by ${adminId}`,
                status: "closed",
                priority: "low",
                assignedTo: adminId
            });

            io.to(roomId).emit("chatEnded", {
                sender: adminId,
                reason: "closed"
            });

            io.socketsLeave(roomId);
            userRooms.delete(userId);
        });

        socket.on("disconnect", () => {});
    });
}