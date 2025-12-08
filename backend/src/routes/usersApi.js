// src/routes/user.routes.js
import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/users.control.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { isSuperAdmin } from "../middlewares/isSuperAdmin.js";

const user = Router();

// SABHI ROUTES SIRF SUPERADMIN KE LIYE
user.get("/", verifyToken, isSuperAdmin, getAllUsers);
user.get("/:id", verifyToken, isSuperAdmin, getUserById);
user.put("/:id", verifyToken, isSuperAdmin, updateUser);
user.delete("/:id", verifyToken, isSuperAdmin, deleteUser);

export default user;