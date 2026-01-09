import { Router } from "express";
import { flagCall, getCallLogs, getFlaggedCalls, logCall, unflagCall, getCallLogsByUser } from "../controllers/call.control.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const call = Router();

call.post("/", logCall);
call.get("/", getCallLogs);
call.get("/:userId", verifyToken, getCallLogsByUser);
call.put("/:id/flag", flagCall);
call.put("/:id/unflag", unflagCall);
call.get("/flagged/all", getFlaggedCalls);

export default call;