import { User } from "../models/model.login.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "crypto";

const createSafeUserResponse = (userDoc) => {
    return {
        username: userDoc.username,
        email: userDoc.email,
        role: userDoc.role,
        cCode: userDoc.cCode,
        phoneNumber: userDoc.phoneNumber,
        status: userDoc.status,
        lastActive: userDoc.lastActive,
        registered: userDoc.registered,
        sessions: userDoc.sessions || [],
        tickets: userDoc.tickets || []
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

export { login, register };
