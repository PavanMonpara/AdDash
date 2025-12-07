import { Router } from "express";
import { createWithdrawRequest, deleteWithdrawRequest, getWithdrawQueue, updateWithdrawStatus } from "../controllers/withdraw.control.js";

const withdraw = Router();

withdraw.post("/request", createWithdrawRequest);
withdraw.get("/", getWithdrawQueue);
withdraw.put("/:id/status", updateWithdrawStatus);
withdraw.delete("/:id", deleteWithdrawRequest);

export default withdraw;