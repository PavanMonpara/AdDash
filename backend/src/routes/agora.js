import express from 'express';
import { 
  getRtcToken, 
  getRtmToken, 
  getAgoraCredentials,
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  saveChatMessage,
  getChatMessages
} from '../controllers/agora.controller.js';

const router = express.Router();

// Token generation routes
router.get('/rtc/:channel', getRtcToken);
router.get('/rtm/:uid', getRtmToken);
router.get('/credentials/:channel', getAgoraCredentials);

// Call management routes
router.post('/calls/initiate', initiateCall);
router.post('/calls/:callId/accept', acceptCall);
router.post('/calls/:callId/reject', rejectCall);
router.post('/calls/:callId/end', endCall);

// Chat messages (separate from calls)
router.post('/sessions/:sessionId/messages', saveChatMessage);
router.get('/sessions/:sessionId/messages', getChatMessages);

export default router;
