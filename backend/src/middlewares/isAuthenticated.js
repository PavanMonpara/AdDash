// src/middlewares/isAuthenticated.js

export const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Please login first"
    });
  }

  // Sirf login check → koi bhi logged-in user allowed
  console.log("Authenticated User:", req.user.id, "| Role:", req.user.role || "user");
  next();
};