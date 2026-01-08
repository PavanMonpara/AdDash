import { generateRTCToken, generateRTMToken, generateRandomUid } from '../utils/agora.config.js';
import ChatMessage from '../models/model.chatMessage.js';
import { getIO } from '../socket/socketManager.js';
import { Session } from '../models/model.session.js';
import CallLog from '../models/model.callLog.js';
import { v4 as uuidv4 } from 'uuid';
import agoraToken from 'agora-access-token';
const { RtcRole } = agoraToken;

export const getRtcToken = (req, res) => {
  try {
    const channelName = req.params.channel;
    const uid = req.query.uid || generateRandomUid();
    const role = req.query.role || 'publisher';
    const expireTime = req.query.expireTime || 3600;

    const token = generateRTCToken(
      channelName,
      uid,
      role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
      expireTime
    );

    return res.status(200).json({
      token,
      uid,
      appId: process.env.AGORA_APP_ID,
      channelName
    });
  } catch (error) {
    console.error('Error generating RTC token:', error);
    return res.status(500).json({ error: 'Failed to generate RTC token' });
  }
};

export const getRtmToken = (req, res) => {
  try {
    const userId = req.params.uid || generateRandomUid().toString();
    const token = generateRTMToken(userId);

    return res.status(200).json({
      token,
      userId,
      appId: process.env.AGORA_APP_ID
    });
  } catch (error) {
    console.error('Error generating RTM token:', error);
    return res.status(500).json({ error: 'Failed to generate RTM token' });
  }
};

// WebRTC configuration for media constraints
const getMediaConstraints = (callType) => ({
  audio: true,
  video: callType === 'video' ? {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 }
  } : false
});

export const initiateCall = async (req, res) => {
  try {
    const { callerId, receiverId, type = 'audio' } = req.body;
    
    if (!callerId || !receiverId) {
      return res.status(400).json({
        success: false,
        error: 'callerId and receiverId are required'
      });
    }

    // Validate call type
    if (!['audio', 'video'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid call type. Must be either "audio" or "video"'
      });
    }

    const callId = uuidv4();
    const channelName = `call_${callId}`;
    const callTypeLabel = type === 'video' ? 'Video Call' : 'Voice Call';
    const startTime = new Date();

    const callLog = new CallLog({
      callId,
      channelName,
      caller: callerId,
      receiver: receiverId,
      callType: type,
      startTime,
      status: 'initiated',
    });
    await callLog.save();

    // Generate tokens with proper privileges
    const callerUid = generateRandomUid();
    const rtcToken = generateRTCToken(channelName, callerUid, RtcRole.PUBLISHER);
    
    // Media constraints for this call
    const mediaConstraints = getMediaConstraints(type);
    
    // ICE servers configuration for WebRTC
    const rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add your TURN/STUN servers here if needed
      ],
      iceCandidatePoolSize: 10,
    };

    // Prepare call data for real-time events
    const callData = {
      callId,
      channelName,
      callType: type,
      callTypeLabel,
      from: callerId,
      startedAt: startTime,
      callerName: req.body.callerName || 'Unknown',
      rtcToken,
      uid: callerUid,
      appId: process.env.AGORA_APP_ID,
      mediaConstraints,
      rtcConfig,
      // Add TURN/STUN server credentials if needed
      // turnServer: { ... }
    };

    // Notify receiver via WebSocket
    const io = getIO();
    io.to(`user_${receiverId}`).emit("call:incoming", callData);

    // Also emit to caller to confirm call initiation
    io.to(`user_${callerId}`).emit("call:initiated", {
      ...callData,
      to: receiverId
    });

    res.status(200).json({
      success: true,
      ...callData
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate call',
      details: error.message
    });
  }
};

export const acceptCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { userId } = req.body;

    if (!callId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'callId and userId are required'
      });
    }
    
    // Get the call details first to determine call type
    const existingCall = await CallLog.findOne({ callId });
    if (!existingCall) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    const callLog = await CallLog.findOneAndUpdate(
      {
        callId,
        receiver: userId,
        status: 'initiated'
      },
      {
        $set: {
          status: 'ongoing',
        }
      },
      { new: true }
    );

    if (!callLog) {
      return res.status(404).json({
        success: false,
        error: 'Call not found or already handled'
      });
    }

    // Generate tokens for both parties with proper roles
    const receiverUid = generateRandomUid();
    const receiverToken = generateRTCToken(callLog.channelName, receiverUid, RtcRole.PUBLISHER);
    const callerUid = generateRandomUid();
    const callerToken = generateRTCToken(callLog.channelName, callerUid, RtcRole.PUBLISHER);
    
    // Get media constraints based on call type
    const mediaConstraints = getMediaConstraints(callLog.callType);
    
    // ICE servers configuration for WebRTC
    const rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add your TURN/STUN servers here if needed
      ],
      iceCandidatePoolSize: 10,
    };

    const io = getIO();
    const responseData = {
      success: true,
      callId: callLog.callId,
      channelName: callLog.channelName,
      rtcToken: receiverToken,
      uid: receiverUid,
      appId: process.env.AGORA_APP_ID,
      mediaConstraints,
      rtcConfig,
      callType: callLog.callType,
      // Add TURN/STUN server credentials if needed
      // turnServer: { ... }
    };

    // Notify caller that the call was accepted
    io.to(`user_${callLog.caller}`).emit("call:accepted", {
      callId: callLog.callId,
      channelName: callLog.channelName,
      rtcToken: callerToken,
      uid: callerUid,
      appId: process.env.AGORA_APP_ID,
      acceptedBy: userId
    });

    // Return response to the receiver
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error accepting call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept call',
      details: error.message
    });
  }
};

export const rejectCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { userId, reason } = req.body;

    if (!callId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'callId and userId are required'
      });
    }

    const endTime = new Date();
    const callLog = await CallLog.findOneAndUpdate(
      {
        callId,
        $or: [
          { receiver: userId, status: 'initiated' },
          { caller: userId, status: 'initiated' }
        ]
      },
      {
        $set: {
          status: 'rejected',
          endTime,
          endedBy: {
            userType: 'receiver',
            userId: userId
          },
          ...(reason && { 
            isFlagged: true,
            flaggedReason: reason,
            flaggedBy: userId,
            flaggedAt: endTime
          })
        }
      },
      { new: true }
    );

    if (!callLog) {
      return res.status(404).json({
        success: false,
        error: 'Call not found or already handled'
      });
    }

    const io = getIO();
    const otherUserId = String(callLog.caller) === userId 
      ? callLog.receiver 
      : callLog.caller;

    // Notify the other party
    io.to(`user_${otherUserId}`).emit("call:rejected", {
      callId,
      by: userId,
      reason,
      timestamp: endTime
    });

    res.status(200).json({
      success: true,
      message: 'Call rejected successfully',
      callId,
      timestamp: endTime
    });
  } catch (error) {
    console.error('Error rejecting call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject call',
      details: error.message
    });
  }
};

export const endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { userId, endedBy, reason } = req.body;

    if (!callId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'callId and userId are required'
      });
    }

    const callLog = await CallLog.findOne({
      callId,
      $or: [
        { caller: userId },
        { receiver: userId }
      ],
      status: { $in: ['initiated', 'ongoing'] }
    });

    if (!callLog) {
      return res.status(404).json({
        success: false,
        error: 'Call not found or already ended'
      });
    }

    const now = new Date();
    const startTime = callLog.startTime ? new Date(callLog.startTime) : now;
    const durationMs = Math.max(0, now - startTime);
    const durationSec = Math.floor(durationMs / 1000);
    
    const hours = Math.floor(durationSec / 3600);
    const minutes = Math.floor((durationSec % 3600) / 60);
    const seconds = durationSec % 60;
    const durationFormatted = `${hours}h ${minutes}m ${seconds}s`;

    // Determine if this was a missed call
    const isMissed = callLog.status === 'initiated' && 
                    callLog.receiver.toString() === userId &&
                    endedBy === 'caller';

    // Update call log
    callLog.status = isMissed ? 'missed' : 'completed';
    callLog.endTime = now;
    callLog.duration = durationFormatted;
    callLog.endedBy = {
      userType: endedBy,
      userId: userId
    };

    if (reason) {
      callLog.isFlagged = true;
      callLog.flaggedReason = reason;
      callLog.flaggedBy = userId;
      callLog.flaggedAt = now;
    }

    await callLog.save();

    // Notify the other party
    const io = getIO();
    const otherUserId = String(callLog.caller) === userId 
      ? callLog.receiver 
      : callLog.caller;

    const endEvent = isMissed ? 'call:missed' : 'call:ended';
    
    io.to(`user_${otherUserId}`).emit(endEvent, {
      callId,
      by: userId,
      reason,
      duration: durationSec,
      durationFormatted,
      timestamp: now,
      callType: callLog.callType,
      callTypeLabel: callLog.callType === 'video' ? 'Video Call' : 'Voice Call'
    });

    res.status(200).json({
      success: true,
      message: isMissed ? 'Call marked as missed' : 'Call ended successfully',
      callId,
      status: isMissed ? 'missed' : 'completed',
      duration: durationSec,
      durationFormatted,
      timestamp: now
    });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end call',
      details: error.message
    });
  }
};

export const saveChatMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { senderId, receiverId, message, messageType = 'text' } = req.body;

    // Verify the session exists and is active
    const session = await Session.findOne({
      _id: sessionId,
      status: 'ongoing'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or already ended'
      });
    }

    const chatMessage = new ChatMessage({
      session: sessionId,
      sender: senderId,
      receiver: receiverId,
      message,
      messageType,
      readStatus: false
    });

    await chatMessage.save();

    // Optionally emit the message via WebSocket
    // io.to(receiverId).emit('newMessage', chatMessage);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: chatMessage
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await ChatMessage.find({ session: sessionId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar');

    const count = await ChatMessage.countDocuments({ session: sessionId });

    res.status(200).json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      details: error.message
    });
  }
};

export const getAgoraCredentials = (req, res) => {
  try {
    const channelName = req.params.channel;
    const uid = req.query.uid || generateRandomUid();

    const rtcToken = generateRTCToken(channelName, uid, RtcRole.PUBLISHER);
    const rtmToken = generateRTMToken(uid.toString());

    return res.status(200).json({
      rtc: {
        token: rtcToken,
        uid,
        appId: process.env.AGORA_APP_ID,
        channelName
      },
      rtm: {
        token: rtmToken,
        userId: uid.toString(),
        appId: process.env.AGORA_APP_ID
      }
    });
  } catch (error) {
    console.error('Error generating Agora credentials:', error);
    return res.status(500).json({ error: 'Failed to generate Agora credentials' });
  }
};
