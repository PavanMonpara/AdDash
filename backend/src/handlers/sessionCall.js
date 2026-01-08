import CallLog from "../models/model.callLog.js";
import { endSession, getOrCreateSession, resolveListener, ensureParticipantCanAccessSession } from "../services/sessionService.js";

const userRoom = (userId) => `user_${userId}`;

const otherParticipant = ({ userId, listenerUserId }, senderId) => {
  if (String(senderId) === String(userId)) return String(listenerUserId);
  if (String(senderId) === String(listenerUserId)) return String(userId);
  return null;
};

export default function sessionCallHandler(io) {
  // Auth handled globally in socketManager.js

  io.on("connection", (socket) => {
    const selfId = String(socket.user?.id);
    if (selfId) {
      // Personal room so we can target a specific user across tabs/devices
      socket.join(userRoom(selfId));
    }

    // 1) Start call => create CallLog + notify callee
    socket.on("call:start", async ({ sessionId, listenerId, listenerUserId, callType }) => {
      try {
        if (!callType || !["audio", "video"].includes(callType)) {
          throw new Error("callType must be 'audio' or 'video'");
        }

        let resolvedSessionId = sessionId;

        // Auto-create a session if not provided
        if (!resolvedSessionId) {
          const resolvedListener = await resolveListener({ listenerId, listenerUserId });
          const session = await getOrCreateSession({
            userId: selfId,
            listenerId: resolvedListener.listenerId,
            type: callType, // audio/video
          });
          resolvedSessionId = String(session._id);
        }

        const participants = await ensureParticipantCanAccessSession({
          sessionId: resolvedSessionId,
          requesterUserId: selfId,
        });

        const receiverId = otherParticipant(participants, selfId);
        if (!receiverId) throw new Error("You are not a participant of this session");

        const call = await CallLog.create({
          session: resolvedSessionId,
          caller: selfId,
          receiver: receiverId,
          callType,
          startTime: new Date(),
          status: "initiated",
        });

        console.log(
          `[socket] call activated | callId=${String(call._id)} | sessionId=${resolvedSessionId} | callType=${callType} | from=${selfId} | to=${receiverId}`
        );

        // Notify receiver
        io.to(userRoom(receiverId)).emit("call:incoming", {
          callId: call._id,
          sessionId: resolvedSessionId,
          callType,
          from: selfId,
          startedAt: call.startTime,
        });

        // Ack back to caller
        socket.emit("call:started", {
          callId: call._id,
          sessionId: resolvedSessionId,
          callType,
          to: receiverId,
          startedAt: call.startTime,
        });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to start call" });
      }
    });

    // 2) Accept call => mark ongoing + notify caller
    socket.on("call:accept", async ({ callId }) => {
      try {
        if (!callId) throw new Error("callId is required");

        const call = await CallLog.findById(callId).select("caller receiver status");
        if (!call) throw new Error("Call not found");

        const callerId = String(call.caller);
        const receiverId = String(call.receiver);
        if (selfId !== callerId && selfId !== receiverId) {
          throw new Error("Unauthorized");
        }

        call.status = "ongoing";
        await call.save();

        io.to(userRoom(callerId)).emit("call:accepted", { callId, by: selfId });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to accept call" });
      }
    });

    // 3) Reject call => status rejected + notify caller
    socket.on("call:reject", async ({ callId }) => {
      try {
        if (!callId) throw new Error("callId is required");

        const call = await CallLog.findById(callId).select("caller receiver startTime status");
        if (!call) throw new Error("Call not found");

        const callerId = String(call.caller);
        const receiverId = String(call.receiver);
        if (selfId !== callerId && selfId !== receiverId) {
          throw new Error("Unauthorized");
        }

        call.status = "rejected";
        call.endTime = new Date();
        call.duration = 0;
        await call.save();

        io.to(userRoom(callerId)).emit("call:rejected", { callId, by: selfId });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to reject call" });
      }
    });

    // 4) End/Hangup => mark completed/failed + notify other
    socket.on("call:end", async ({ callId, status = "completed" }) => {
      try {
        if (!callId) throw new Error("callId is required");
        if (!["completed", "failed", "missed"].includes(status)) {
          throw new Error("status must be completed/failed/missed");
        }

        const call = await CallLog.findById(callId).select("session caller receiver startTime status");
        if (!call) throw new Error("Call not found");

        const callerId = String(call.caller);
        const receiverId = String(call.receiver);
        if (selfId !== callerId && selfId !== receiverId) {
          throw new Error("Unauthorized");
        }

        const endTime = new Date();
        const startTime = call.startTime ? new Date(call.startTime) : endTime;
        const durationSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));

        call.status = status;
        call.endTime = endTime;
        call.duration = durationSeconds;
        await call.save();

        // End the session as well (so history stays grouped correctly)
        if (call.session) {
          await endSession({
            sessionId: String(call.session),
            endedByUserId: selfId,
            reason: `call_${status}`,
          });
        }

        const otherId = selfId === callerId ? receiverId : callerId;
        io.to(userRoom(otherId)).emit("call:ended", { callId, by: selfId, status, duration: durationSeconds });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to end call" });
      }
    });

    // 5) WebRTC signaling (offer/answer/ice) => forward to the other participant
    socket.on("call:offer", async ({ callId, sessionId, sdp }) => {
      try {
        if (!callId || !sessionId || !sdp) throw new Error("callId, sessionId and sdp are required");

        const participants = await ensureParticipantCanAccessSession({
          sessionId,
          requesterUserId: selfId,
        });

        const to = otherParticipant(participants, selfId);
        if (!to) throw new Error("Unauthorized");

        io.to(userRoom(to)).emit("call:offer", { callId, sessionId, from: selfId, sdp });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to send offer" });
      }
    });

    socket.on("call:answer", async ({ callId, sessionId, sdp }) => {
      try {
        if (!callId || !sessionId || !sdp) throw new Error("callId, sessionId and sdp are required");

        const participants = await ensureParticipantCanAccessSession({
          sessionId,
          requesterUserId: selfId,
        });

        const to = otherParticipant(participants, selfId);
        if (!to) throw new Error("Unauthorized");

        io.to(userRoom(to)).emit("call:answer", { callId, sessionId, from: selfId, sdp });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to send answer" });
      }
    });

    socket.on("call:ice", async ({ callId, sessionId, candidate }) => {
      try {
        if (!callId || !sessionId || !candidate) throw new Error("callId, sessionId and candidate are required");

        const participants = await ensureParticipantCanAccessSession({
          sessionId,
          requesterUserId: selfId,
        });

        const to = otherParticipant(participants, selfId);
        if (!to) throw new Error("Unauthorized");

        io.to(userRoom(to)).emit("call:ice", { callId, sessionId, from: selfId, candidate });
      } catch (error) {
        socket.emit("error", { message: error?.message || "Failed to send ICE" });
      }
    });
  });
}
