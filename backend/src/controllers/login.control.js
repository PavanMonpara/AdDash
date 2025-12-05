import { User } from "../models/model.login.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "crypto";

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

        user.lastActive = Date.now();
        await user.save();

        const userResponse = createSafeUserResponse(user);

        const count = await User.countDocuments({ role: "user" });

        return res.status(httpStatus.OK).json({
            message: "Login Successful",
            user: userResponse,
            count,
        });
    } catch (error) {
        console.error("Login error:", error);
        return res
            .status(httpStatus.INTERNAL_SERVER_ERROR)
            .json({ message: `Something went wrong: ${error.message}` });
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

const FIXED_OTP = "123456";

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

const appLogin = async (req, res) => {
    const { phoneNumber, otp, cCode = "", lang, gender } = req.body;

    if (!phoneNumber || !otp) {
        return res
            .status(httpStatus.BAD_REQUEST)
            .json({ message: "Please provide phoneNumber and otp" });
    }

    if (otp !== FIXED_OTP) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid OTP" });
    }

    try {
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
        const token = crypto.randomBytes(20).toString("hex");
        if (user) {
            user.token = token;
            user.verified = true;
            user.lastActive = now;
            await user.save();

            const userResponse = createSafeUserResponse(user);

            return res.status(httpStatus.OK).json({
                message: "App login successful",
                token,
                user: userResponse,
            });
        }
        if (!lang || !gender) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "New users must provide lang and gender",
            });
        }

        const langLower = String(lang).toLowerCase();
        const genderLower = String(gender).toLowerCase();

        if (!ALLOWED_LANGS.includes(langLower)) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: `Invalid lang. Allowed: ${ALLOWED_LANGS.join(", ")}`,
            });
        }

        if (!ALLOWED_GENDERS.includes(genderLower)) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: `Invalid gender. Allowed: ${ALLOWED_GENDERS.join(", ")}`,
            });
        }

        const newUser = new User({
            username: phoneNumber,
            cCode,
            phoneNumber,
            token,
            verified: true,
            lastActive: now,
            registered: now,
            lang: langLower,
            gender: genderLower,
        });

        await newUser.save();

        const userResponse = createSafeUserResponse(newUser);

        return res.status(httpStatus.CREATED).json({
            message: "New user created & logged in",
            token,
            user: userResponse,
        });
    } catch (e) {
        console.error("appLogin error:", e);
        return res
            .status(httpStatus.INTERNAL_SERVER_ERROR)
            .json({ message: `Something went wrong: ${e.message}` });
    }
};
export { login, register, appLogin };
