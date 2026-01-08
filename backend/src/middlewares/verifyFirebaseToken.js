import { initFirebase } from "../services/firebaseService.js";
import { User } from "../models/model.login.js";
import admin from "firebase-admin";

export const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied: No token provided",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        // Ensure Firebase is initialized
        initFirebase();

        // Verify ID token
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Get user identifier (phone or email)
        const phoneNumber = decodedToken.phone_number;
        const email = decodedToken.email;

        if (!phoneNumber && !email) {
            return res.status(401).json({
                success: false,
                message: "Invalid token: No identifier found",
            });
        }

        // Find user in DB
        const user = await User.findOne({
            $or: [
                { phoneNumber: phoneNumber },
                { cCode: phoneNumber ? phoneNumber.substring(0, 3) : null, phoneNumber: phoneNumber ? phoneNumber.substring(3) : null }, // Handle formats
                { email: email }
            ]
        }).select("_id email verified cCode phoneNumber");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found in database",
            });
        }

        // Attach to request
        req.user = {
            id: user._id,
            firebaseUid: decodedToken.uid,
            email: user.email,
            verified: user.verified,
            phoneNumber: user.phoneNumber
        };

        next();
    } catch (error) {
        console.error("Firebase token verification failed:", error);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
