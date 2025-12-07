import { Router } from "express";
import { getAllListeners, getListenerById, promoteToListener, removeListener, updateListener } from "../controllers/listener.control.js";

const listener = Router();

listener.post("/promote", promoteToListener);
listener.get("/", getAllListeners);
listener.get("/:id", getListenerById);
listener.put("/:id", updateListener);
listener.delete("/:id", removeListener);

export default listener;