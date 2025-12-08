import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// EK HI SECRET — bilkul same jo login mein use ho raha hai
const JWT_SECRET = process.env.JWT_SECRET;

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied: No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  // Agar secret nahi mila (galti se .env miss ho gaya)
  if (!JWT_SECRET) {
    console.error("JWT_SECRET is missing!");
    return res.status(500).json({
      success: false,
      message: "Server configuration error",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Token verified successfully for user:", decoded.id);
    req.user = decoded; // ← yeh req.user protected routes mein milega
    next();
  } catch (error) {
    console.log("Token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};