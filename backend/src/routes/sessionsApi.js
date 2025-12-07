import { Router } from "express";
import { createSession, deleteSession, getAllSessions, getSessionById, updateSession } from "../controllers/session.control.js";

const session = Router();

session.post('/', createSession);
session.get('/', getAllSessions);
session.get('/:id', getSessionById);
session.put('/:id', updateSession);
session.delete('/:id', deleteSession);

export default session;