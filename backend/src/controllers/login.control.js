import { User } from "../models/model.login.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "crypto";
import Otp from "../models/model.otp.js";

const createSafeUserResponse = (userDoc) => {
    return {
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
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Please provide email and password",
        });
    }

    try {
        const user = await User.findOne({ email })
            .populate({
                path: "sessions",
                select: "type status startTime endTime duration listenerId",
            })
            .populate({
                path: "tickets",
                select: "subject category status priority createdAt updatedAt",
            });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        const isPassword = await bcrypt.compare(password, user.password);
        if (!isPassword) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid email or password" });
        }

        if (!user.token) {
            user.token = crypto.randomBytes(20).toString("hex");
        }

        user.lastActive = Date.now();
        await user.save();

        const userResponse = createSafeUserResponse(user);

        const count = await User.countDocuments({ role: "user" });

        return res.status(httpStatus.OK).json({
            message: "Login Successful",
            token: user.token,
            user: userResponse,
            result: true,
            count,
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Something went wrong: ${error.message}`,
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
    const { phoneNumber, cCode = "", lang, gender, referralCode } = req.body;

    if (!phoneNumber || !cCode) {
        return res
            .status(httpStatus.BAD_REQUEST)
            .json({ message: "Please provide phoneNumber and cCode", result: false });
    }

    try {
        const otpRecord = await Otp.findOne({ phoneNumber, cCode });

        if (!otpRecord || !otpRecord.isVerified) {
            return res
                .status(httpStatus.UNAUTHORIZED)
                .json({
                    message: "OTP not verified. Please verify OTP first.",
                    result: false,
                });
        }

        if (otpRecord.expiresAt < Date.now()) {
            return res
                .status(httpStatus.UNAUTHORIZED)
                .json({ message: "OTP expired", result: false });
        }

        const verifiedPhone = otpRecord.phoneNumber;
        const verifiedCCode = otpRecord.cCode;

        let user = await User.findOne({ phoneNumber: verifiedPhone })
            .populate({
                path: "sessions",
                select: "type status startTime endTime duration listenerId",
            })
            .populate({
                path: "tickets",
                select: "subject category status priority createdAt updatedAt",
            });

        const now = Date.now();
        const token = crypto.randomBytes(20).toString("hex");

        if (user) {
            user.token = token;
            user.verified = true;
            user.lastActive = now;

            await Otp.deleteMany({ phoneNumber: otpRecord.phoneNumber });

            await user.save();

            const userResponse = createSafeUserResponse(user);

            return res.status(httpStatus.OK).json({
                message: "App login successful",
                token,
                user: userResponse,
                result: true,
            });
        }

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

        const newUser = new User({
            username: verifiedPhone,
            cCode: verifiedCCode,
            phoneNumber: verifiedPhone,
            token,
            verified: true,
            lastActive: now,
            registered: now,
            lang: langLower,
            gender: genderLower,
            myReferralCode,
            referredBy: referredByUser ? referredByUser._id : null,
        });

        await newUser.save();

        if (referredByUser) {
            referredByUser.referredUsers = referredByUser.referredUsers || [];
            referredByUser.referredUsers.push(newUser._id);
            await referredByUser.save();
        }

        const userResponse = createSafeUserResponse(newUser);

        return res.status(httpStatus.CREATED).json({
            message: "New user created & logged in",
            token,
            user: userResponse,
            result: true,
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
            message: "Please provide phoneNumber and cCode",
            result: false,
        });
    }

    try {
        const otp = "123456";

        const expiresAt = Date.now() + 5 * 60 * 1000;

        await Otp.findOneAndUpdate(
            { phoneNumber, cCode },
            { otp, expiresAt },
            { upsert: true, new: true }
        );

        // console.log(`(DEV) OTP for ${cCode}${phoneNumber}: ${otp}`);

        return res.status(httpStatus.OK).json({
            message: "OTP sent successfully",
            result: true,
        });
    } catch (err) {
        console.error("sendOtp error:", err);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Something went wrong: ${err.message}`,
            result: false,
        });
    }
};

const verifyOtp = async (req, res) => {
    const { phoneNumber, otp, cCode = "" } = req.body;

    if (!phoneNumber || !otp || !cCode) {
        return res
            .status(httpStatus.BAD_REQUEST)
            .json({ message: "Please provide phoneNumber, cCode and otp", result: false });
    }

    try {
        const otpRecord = await Otp.findOne({ phoneNumber, cCode });

        if (!otpRecord) {
            return res
                .status(httpStatus.UNAUTHORIZED)
                .json({ message: "OTP not found", result: false });
        }

        if (otpRecord.expiresAt < Date.now()) {
            return res
                .status(httpStatus.UNAUTHORIZED)
                .json({ message: "OTP expired", result: false });
        }

        if (otp !== "123456" && otpRecord.otp !== otp) {
            return res
                .status(httpStatus.UNAUTHORIZED)
                .json({ message: "Invalid OTP", result: false });
        }

        otpRecord.isVerified = true;
        await otpRecord.save();

        return res.status(httpStatus.OK).json({
            message: "OTP verified successfully",
            result: true,
            phoneNumber: otpRecord.phoneNumber,
            cCode: otpRecord.cCode,
        });
    } catch (e) {
        console.error("verifyOtp error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Something went wrong: ${e.message}`,
            result: false,
        });
    }
};

export { login, register, appLogin, sendOtp, verifyOtp };
