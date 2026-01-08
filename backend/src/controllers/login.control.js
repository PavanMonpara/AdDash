import { User } from "../models/model.login.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "crypto";
import Otp from "../models/model.otp.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { BlockedUser } from "../models/model.blockedUser.js";
import { SuspendedListener } from "../models/model.suspendedListener.js";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRE = process.env.ACCESS_TOKEN_EXPIRE || "15m";
const REFRESH_TOKEN_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || "7d";

// Agar .env mein secret nahi mila toh warning + crash (production safe)
if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file!");
  process.exit(1);
}

const createSafeUserResponse = (userDoc) => {
  return {
    userid: userDoc._id,
    username: userDoc.username,
    role: userDoc.role,
    cCode: userDoc.cCode,
    phoneNumber: userDoc.phoneNumber,
    status: userDoc.status,
    lastActive: userDoc.lastActive,
    registered: userDoc.registered,
    sessions: userDoc.sessions || [],
    tickets: userDoc.tickets || [],
    verified: !!userDoc.verified,
    lang: userDoc.lang,
    gender: userDoc.gender,
  };
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // YEHI SABSE IMPORTANT CHANGE HAI
    const accessToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,                    // ← singular role (DB se aaya)
        roles: user.roles || [],            // ← optional array (future ke liye)
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRE }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName || "",
          role: user.role,                    // ← yahan bhi bhej do (frontend ke liye)
          roles: user.roles || [],
          profilePicture: user.profilePicture || "",
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error, try again later",
    });
  }
};


const register = async (req, res) => {
  const { email, password, username, cCode, phoneNumber } = req.body;

  if (!email || !password || !username || !cCode || !phoneNumber) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Please provide all required fields: email, password, username, cCode, and phoneNumber"
    });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const message = existingUser.email === email
        ? "User with this email already exists"
        : "Username is already taken";
      return res.status(httpStatus.CONFLICT).json({ message });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(20).toString("hex");
    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      cCode,
      phoneNumber,
      token,
      lastActive: Date.now()
    });

    await newUser.save();
    const userResponse = createSafeUserResponse(newUser);

    return res.status(httpStatus.CREATED).json({
      message: "User Registered Successfully",
      token,
      user: userResponse
    });
  } catch (e) {
    console.error("Register error:", e);
    if (e.code === 11000) {
      return res.status(httpStatus.CONFLICT).json({ message: "Email or username already exists." });
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message}` });
  }
}

// const FIXED_OTP = "123456";

const ALLOWED_LANGS = [
  "hindi",
  "english",
  "tamil",
  "malyalam",
  "telugu",
  "punjabi",
  "gujarati",
  "marathi",
];

const ALLOWED_GENDERS = ["male", "female", "other"];

const generateReferralCode = () => {
  return "USR" + Math.floor(10000 + Math.random() * 90000);
};

const appLogin = async (req, res) => {
  const { phoneNumber, cCode = "", lang, gender, referralCode, fcmToken } = req.body;

  if (!phoneNumber || !cCode) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "Please provide phoneNumber and cCode", result: false });
  }

  try {
    const blockedByPhone = await BlockedUser.findOne({ cCode, phoneNumber });
    if (blockedByPhone) {
      return res.status(httpStatus.FORBIDDEN).json({
        message: "Blocked user cannot login",
        result: false,
      });
    }

    const suspendedListener = await SuspendedListener.findOne({ cCode, phoneNumber });
    if (suspendedListener) {
      return res.status(httpStatus.FORBIDDEN).json({
        message: "Suspended listener cannot login",
        result: false,
      });
    }

    const otpRecord = await Otp.findOne({ phoneNumber, cCode });

    if (!otpRecord || !otpRecord.isVerified || otpRecord.expiresAt < Date.now()) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid or expired OTP", result: false });
    }

    let user = await User.findOne({ phoneNumber })
      .populate({
        path: "sessions",
        select: "type status startTime endTime duration listenerId",
      })
      .populate({
        path: "tickets",
        select: "subject category status priority createdAt updatedAt",
      });

    const now = Date.now();
    const sessionToken = crypto.randomBytes(20).toString("hex"); // legacy app token

    if (!user) {
      // New user
      if (!lang || !gender) {
        return res.status(httpStatus.BAD_REQUEST).json({
          result: false,
          message: "lang and gender are required for new users",
        });
      }

      const langLower = String(lang).toLowerCase();
      const genderLower = String(gender).toLowerCase();

      if (!ALLOWED_LANGS.includes(langLower)) {
        return res.status(httpStatus.BAD_REQUEST).json({
          message: `Invalid lang. Allowed: ${ALLOWED_LANGS.join(", ")}`,
          result: false,
        });
      }
      if (!ALLOWED_GENDERS.includes(genderLower)) {
        return res.status(httpStatus.BAD_REQUEST).json({
          message: `Invalid gender. Allowed: ${ALLOWED_GENDERS.join(", ")}`,
          result: false,
        });
      }

      let referredByUser = null;
      if (referralCode) {
        referredByUser = await User.findOne({ myReferralCode: referralCode });
        if (!referredByUser) {
          return res.status(httpStatus.BAD_REQUEST).json({
            message: "Invalid referral code",
            result: false,
          });
        }
      }

      const myReferralCode = generateReferralCode();

      user = new User({
        username: `user_${phoneNumber}`,
        cCode,
        phoneNumber,
        token: sessionToken,
        verified: true,
        lastActive: now,
        registered: now,
        lang: langLower,
        gender: genderLower,
        myReferralCode,
        referredBy: referredByUser?._id || null,
        role: "user",
        fcmToken // Added here
      });

      await user.save();

      if (referredByUser) {
        referredByUser.referredUsers = referredByUser.referredUsers || [];
        referredByUser.referredUsers.push(user._id);
        await referredByUser.save();
      }
    } else {
      // Existing user
      user.token = sessionToken;
      user.verified = true;
      user.lastActive = now;
      if (fcmToken) user.fcmToken = fcmToken; // Update fcmToken if provided
      await user.save();
    }

    // OTP delete kar do
    await Otp.deleteMany({ phoneNumber });

    // JWT TOKEN BHI BHEJO (Yeh wahi hai jo email login deta hai)
    const accessToken = jwt.sign(
      {
        id: user._id,
        phoneNumber: user.phoneNumber,
        role: user.role || "user",
        roles: user.roles || []
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRE }
    );

    const userResponse = createSafeUserResponse(user);

    return res.status(user.registered ? httpStatus.OK : httpStatus.CREATED).json({
      success: true,
      message: user.registered ? "Login successful" : "New user created & logged in",
      result: true,
      token: sessionToken,        // purana app token (jo pehle se use ho raha tha)
      accessToken,                // NAYA: JWT Token (web/admin panel ke liye)
      refreshToken,               // NAYA: Refresh Token
      user: userResponse
    });

  } catch (e) {
    console.error("appLogin error:", e);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: `Something went wrong: ${e.message}`,
      result: false,
    });
  }
};



const sendOtp = async (req, res) => {
  const { phoneNumber, cCode = "" } = req.body;

  if (!phoneNumber || !cCode) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "phoneNumber and cCode required",
    });
  }

  try {
    const otp = "123456"; // dev mode
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await Otp.findOneAndUpdate(
      { phoneNumber, cCode },
      { otp, expiresAt, isVerified: false },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: "OTP sent successfully (DEV: 123456)",
    });
  } catch (err) {
    console.error("sendOtp error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// verifyOtp – sirf verify karega + batayega registered hai ya nahi
// verifyOtp – AB DIRECT LOGIN BHI KAREGA JAB USER PURANA HAI
const verifyOtp = async (req, res) => {
  const { phoneNumber, otp, cCode = "", fcmToken } = req.body;

  if (!phoneNumber || !otp || !cCode) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "phoneNumber, cCode and otp are required",
      result: false,
    });
  }

  try {
    const otpRecord = await Otp.findOne({ phoneNumber, cCode });

    if (!otpRecord) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: "OTP not found",
        result: false,
      });
    }

    if (otpRecord.expiresAt < Date.now()) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: "OTP expired",
        result: false,
      });
    }

    if (otpRecord.otp !== otp && otp !== "123456") {
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Invalid OTP",
        result: false,
      });
    }

    // OTP verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    let user = await User.findOne({ phoneNumber, cCode });

    const now = Date.now();
    const sessionToken = crypto.randomBytes(20).toString("hex");

    // Agar user already exist → direct login
    if (user) {
      user.token = sessionToken;
      user.lastActive = now;
      user.verified = true;
      if (fcmToken) user.fcmToken = fcmToken; // Update fcmToken
      await user.save();

      const accessToken = jwt.sign(
        { id: user._id, phoneNumber: user.phoneNumber, role: user.role || "user" },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRE }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRE }
      );

      // OTP delete
      await Otp.deleteMany({ phoneNumber, cCode });

      const userResponse = createSafeUserResponse(user);

      return res.status(httpStatus.OK).json({
        success: true,
        message: "Login successful",
        result: true,
        isRegistered: true,
        token: sessionToken,
        accessToken,
        refreshToken,
        user: userResponse,
      });
    }

    // Naya user hai → sirf verify kiya, ab appLogin se aayega
    return res.status(httpStatus.OK).json({
      success: true,
      message: "OTP verified. Complete profile to login",
      result: true,
      isRegistered: false,
      token: null,           // same fields
      accessToken: null,     // same fields
      refreshToken: null,    // same fields
      user: null,            // same fields
    });

  } catch (error) {
    console.error("verifyOtp error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error: " + error.message,
      result: false,
    });
  }
};

export { login, register, appLogin, sendOtp, verifyOtp };
