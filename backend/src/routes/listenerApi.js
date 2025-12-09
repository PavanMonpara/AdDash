// routes/listener.js
import { Router } from "express";
import {
  getAllListeners,
  getListenerById,
  promoteToListener,
  removeListener,
  updateListener,
  getAvailableListeners, // ye naya wala hai
  suspendListener,
} from "../controllers/listener.control.js";

import { verifyToken } from "../middlewares/verifyToken.js";
import { isSuperAdmin } from "../middlewares/isSuperAdmin.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { uploadProfilePic } from "../middlewares/upload.js"; // ye naya wala hai

const listener = Router();

// SuperAdmin only
listener.post("/promote", verifyToken, isSuperAdmin, promoteToListener);
listener.post("/suspend/:id", verifyToken, isSuperAdmin, suspendListener);

listener.put("/:id", 
  verifyToken,
  isAuthenticated,
  uploadProfilePic,           // ← YE NAYA HAI
  updateListener
);
listener.delete("/:id", verifyToken, isSuperAdmin, removeListener);

// Admin + Support etc can see all
listener.get("/", verifyToken, isAuthenticated, getAllListeners);
listener.get("/:id", verifyToken, isAuthenticated, getListenerById);

// Normal users ke liye - opposite gender + same language
listener.get("/available/listener", verifyToken, isAuthenticated, getAvailableListeners);

export default listener;