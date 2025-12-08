import { Router } from "express";
import {
  getAllListeners,
  getListenerById,
  promoteToListener,
  removeListener,
  updateListener
} from "../controllers/listener.control.js";

import { verifyToken } from "../middlewares/verifyToken.js";
import { isSuperAdmin } from "../middlewares/isSuperAdmin.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const listener = Router();


listener.post("/promote", verifyToken, isSuperAdmin, promoteToListener);
listener.put("/:id", verifyToken, isSuperAdmin, updateListener);
listener.delete("/:id", verifyToken, isSuperAdmin, removeListener);

listener.get("/", verifyToken, isAuthenticated, getAllListeners);        
listener.get("/:id", verifyToken, isAuthenticated, getListenerById);     



export default listener;