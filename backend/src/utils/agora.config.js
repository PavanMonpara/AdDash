import dotenv from 'dotenv';
import agoraToken from 'agora-access-token';
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole } = agoraToken;


dotenv.config();

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

if (!APP_ID || !APP_CERTIFICATE) {
  throw new Error('Agora App ID and Certificate are required in .env file');
}

export const generateRTCToken = (channelName, uid, role = RtcRole.PUBLISHER, expireTime = 3600) => {
  // Calculate expiration time in seconds
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;

  // Build token with uid
  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpireTime
  );
};

export const generateRTMToken = (userId) => {
  const expireTime = 3600; // 1 hour
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;

  return RtmTokenBuilder.buildToken(
    APP_ID,
    APP_CERTIFICATE,
    userId,
    RtmRole.RTM_USER,
    privilegeExpireTime
  );
};

export const generateRandomUid = () => {
  return Math.floor(100000 + Math.random() * 900000);
};
