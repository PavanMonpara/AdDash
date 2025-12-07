import { Router } from "express";
import { flagCall, getCallLogs, getFlaggedCalls, logCall, unflagCall } from "../controllers/call.control.js";

const call = Router();

call.post("/", logCall);
call.get("/", getCallLogs);
call.put("/:id/flag", flagCall);
call.put("/:id/unflag", unflagCall);
call.get("/flagged/all", getFlaggedCalls);

export default call;