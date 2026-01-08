// src/routes/user.routes.js
import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  blockUser,
  getNormalUsersOnly,
  updateUserFcmToken,
  syncFcmFromFirebase
} from "../controllers/users.control.js";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { isSuperAdmin } from "../middlewares/isSuperAdmin.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const user = Router();

// SABHI ROUTES SIRF SUPERADMIN KE LIYE
user.get("/", verifyToken, isSuperAdmin, getAllUsers);
user.get("/:id", verifyToken, getUserById);
user.put("/:id", verifyToken, updateUser);
user.delete("/:id", verifyToken, isSuperAdmin, deleteUser);
user.post("/block/:id", verifyToken, isSuperAdmin, blockUser);
user.post("/sync-fcm", verifyFirebaseToken, syncFcmFromFirebase);
user.put("/fcm-token", verifyFirebaseToken, updateUserFcmToken);
user.get("/normal/all", verifyToken, isAuthenticated, getNormalUsersOnly);

export default user;
